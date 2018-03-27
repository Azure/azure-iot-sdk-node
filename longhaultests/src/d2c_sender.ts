// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as async from 'async';
import * as uuid from 'uuid';
import * as dbg from 'debug';
const debug = dbg('longhaul:d2c_sender');

import { Message } from 'azure-iot-common';
import { Client, SharedAccessKeyAuthenticationProvider } from 'azure-iot-device';
import { EventEmitter } from 'events';

export class D2CSender extends EventEmitter {
  private _timer: number;
  private _client: Client;
  private _sendInterval: number;
  private _sendTimeout: number;

  constructor(connStr: string, protocol: any, sendInterval: number, sendTimeout: number) {
    super();
    this._sendInterval = sendInterval;
    this._sendTimeout = sendTimeout;
    const authProvider = SharedAccessKeyAuthenticationProvider.fromConnectionString(connStr);
    this._client = Client.fromAuthenticationProvider(authProvider, protocol);
    this._client.on('error', (err) => {
      debug('error emitted by client: ' + err.toString());
      this.stop((stopErr) => {
        debug('error stopping: ' + stopErr.toString());
      });
    });

    this._client.on('disconnect', (err) => {
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
        this._startSending();
      }
      callback(err);
    });
  }

  stop(callback: (err?: Error) => void): void {
    debug('stopping');
    if (this._timer) {
      debug('clearing timeout');
      clearTimeout(this._timer);
      this._timer = null;
    }

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

  private _startSending(): void {
    debug('starting send timer: 1 message every ' + this._sendInterval + ' milliseconds');
    this._timer = setTimeout(this._send.bind(this), this._sendInterval);
  }

  private _send(): void {
    const id = uuid.v4();
    let msg = new Message(id);
    msg.messageId = id;
    debug('sending message with id: ' + id);
    async.timeout(this._client.sendEvent.bind(this._client), this._sendTimeout)(msg, (err) => {
      if (err) {
        debug('error sending message: ' + id + ': ' + err.message);
        this.emit('error', err);
      } else {
        debug('sent message with id: ' + id);
        this._timer = setTimeout(this._send.bind(this), this._sendInterval);
        this.emit('sent', id);
      }
    });
  }
}
