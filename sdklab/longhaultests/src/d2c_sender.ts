// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { timeout } from 'async';
import * as dbg from 'debug';
const debug = dbg('longhaul:d2c_sender');

import { Message } from 'azure-iot-common';
import { Client, SharedAccessKeyAuthenticationProvider } from 'azure-iot-device';
import { EventEmitter } from 'events';

var fault = [
  {
    operationType: 'KillTcp',
    closeReason: ' severs the TCP connection ',
    delayInSeconds: 2
  },
  {
    operationType: 'KillAmqpConnection',
    closeReason: ' severs the AMQP connection ',
    delayInSeconds: 2
  },
  {
    operationType: 'KillAmqpSession',
    closeReason: ' severs the AMQP session ',
    delayInSeconds: 1
  },
  {
    operationType: 'KillAmqpCBSLinkReq',
    closeReason: ' severs AMQP CBS request link ',
    delayInSeconds: 2
  },
  {
    operationType: 'KillAmqpCBSLinkResp',
    closeReason: ' severs AMQP CBS response link ',
    delayInSeconds: 2
  },
  {
    operationType: 'KillAmqpD2CLink',
    closeReason: ' severs AMQP D2C link ',
    delayInSeconds: 2
  },
  {
    operationType: 'ShutDownAmqp',
    closeReason: ' cleanly shutdowns AMQP connection ',
    delayInSeconds: 2
  },
];

export class D2CSender extends EventEmitter {
  private _client: Client;
  private _sendTimeout: number;
  private _stopped: boolean  = false;

  constructor(connStr: string, protocol: any, sendTimeout: number) {
    super();
    this._sendTimeout = sendTimeout;
    const authProvider = SharedAccessKeyAuthenticationProvider.fromConnectionString(connStr);
    this._client = Client.fromAuthenticationProvider(authProvider, protocol);
    this._client.on('error', (err) => {
      debug('error emitted by client: ' + err.toString());
      this.stop((stopErr) => {
        debug('error stopping: ' + stopErr.toString());
      });
    });

    this._client.on('disconnect', (_err) => {
      this.stop((stopErr) => {
        debug('error stopping: ' + stopErr.toString());
      });
    });
  }

  start(callback: (err?: Error) => void): void {
    debug('starting...');
    this._client.open((err) => {
      if (err) {
        debug('failed to start: ' + err.toString());
      } else {
        debug('connected!');
      }
      callback(err);
    });
  }

  stop(callback: (err?: Error) => void): void {
    debug('stopping');
    this._stopped = true;

    this._client.close((err) => {
      if (err) {
        debug('error while closing: ', err.toString());
      } else {
        debug('closed');
      }
      this._client.removeAllListeners();
      this._client = null;
      callback(err);
    });
  }

  startSendingD2c(d2cSendInterval: number): void {
    let send;
    let sendIndex = 0;
    send = () => {
      if (!this._stopped) {
        const id = JSON.stringify({ 'msg' : `message index ${sendIndex}` });
        let msg = new Message(id);
        msg.messageId = sendIndex.toString();
        sendIndex += 1;
        debug('sending message with id: ' + id);
        // @ts-ignore
        timeout(this._client.sendEvent.bind(this._client), this._sendTimeout)(msg, (err) => {
          if (err) {
            debug('error sending message: ' + id + ': ' + err.message);
            this.emit('error', err);
          } else {
            debug('sent message with id: ' + id);
            setTimeout(send, d2cSendInterval);
            this.emit('sent', id);
          }
        });
      }
    };

    debug('starting send timer: 1 message every ' + d2cSendInterval + ' milliseconds');
    setTimeout(send, d2cSendInterval);
  }

  startRandomDropping(dropIntervalInSeconds: number, operationType: string, closeReason: string, delayInSeconds:number): void {
    let faultIndex = 0;
    let send;
    send = () => {
      if (!this._stopped) {
        var terminateMessage = new Message('');

        operationType = fault[faultIndex % fault.length].operationType;
        closeReason = fault[faultIndex % fault.length].closeReason;
        faultIndex += 1;

        terminateMessage.properties.add('AzIoTHub_FaultOperationType', operationType);
        terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', closeReason);
        terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', delayInSeconds.toString());

        // @ts-ignore
        timeout(this._client.sendEvent.bind(this._client), this._sendTimeout)(terminateMessage, (err) => {
          if (err) {
            debug('error sending terminate message: ' + err.message);
            this.emit('error', err);
          } else {
            console.log(`---------------------------------------------- ${faultIndex}: sent terminate message of type ${operationType}`);
            setTimeout(send, dropIntervalInSeconds * 1000);
          }
        });
      }
    };

    debug('starting drop timer: 1 message every ' + dropIntervalInSeconds + ' seconds');
    setTimeout(send, dropIntervalInSeconds * 1000);
  }

}
