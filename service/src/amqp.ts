// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import * as dbg from 'debug';

import { anHourFromNow, endpoint, errors, SharedAccessSignature, Message } from 'azure-iot-common';
import { Amqp as Base } from 'azure-iot-amqp-base';
import { translateError } from './amqp_service_errors.js';
import { Callback } from './interfaces';
import { Client } from './client';

const UnauthorizedError = errors.UnauthorizedError;
const DeviceNotFoundError = errors.DeviceNotFoundError;
const NotConnectedError = errors.NotConnectedError;
const debug = dbg('azure-iothub');
// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

function handleResult(errorMessage: string, done: Callback<any>): Callback<any> {
  return (err, result) => {
    /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_021: [** All asynchronous instance methods shall not throw if `done` is not specified or falsy]*/
    if (done) {
      if (err) {
        /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_018: [All asynchronous instance methods shall call the `done` callback with either no arguments or a first null argument and a second argument that is the result of the operation if the operation succeeded.]*/
        done(translateError(errorMessage, err));
      } else {
        /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_017: [All asynchronous instance methods shall call the `done` callback with a single parameter that is derived from the standard Javascript `Error` object if the operation failed.]*/
        done(null, result);
      }
    }
  };
}

function getTranslatedError(err: Error, message: string): Error {
  if (err instanceof UnauthorizedError || err instanceof NotConnectedError || err instanceof DeviceNotFoundError) {
    return err;
  }
  return translateError(message, err);
}


/**
 * Transport class used by the [service client]{@link azure-iothub.Client} to connect to the Azure IoT hub using the AMQP protocol over a secure (TLS) socket.
 * This class should not be used directly and instead be passed to one of the {@link azure-iothub.Client} factory methods: {@link azure-iothub.Client.fromConnectionString|fromConnectionString} or {@link azure-iothub.Client.fromSharedAccessSignature|fromSharedAccessSignature}.
 */
/*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_001: [The Amqp constructor shall accept a config object with those 4 properties:
host – (string) the fully-qualified DNS hostname of an IoT Hub
hubName - (string) the name of the IoT Hub instance (without suffix such as .azure-devices.net).
keyName – (string) the name of a key that can be used to communicate with the IoT Hub instance
sharedAccessSignature – (string) the key associated with the key name.] */
export class Amqp extends EventEmitter implements Client.Transport {
  /**
   * @private
   */
  protected _config: Client.TransportConfigOptions;
  private _amqp: Base;
  private _renewalTimeout: number;
  private _renewalNumberOfMilliseconds: number = 2700000;

  /**
   * @private
   */
  constructor(config: Client.TransportConfigOptions, amqpBase?: Base) {
    super();
    this._amqp = amqpBase ? amqpBase : new Base(true, packageJson.name + '/' + packageJson.version);
    this._config = config;
    this._renewalTimeout = null;
    this._amqp.setDisconnectHandler((err) => {
      this.emit('disconnect', err);
    });
  }

  /**
   * @private
   * @method             module:azure-iothub.Amqp#connect
   * @description        Establishes a connection with the IoT Hub instance.
   * @param {Function}   done   Called when the connection is established of if an error happened.
   */
  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_019: [The `connect` method shall call the `connect` method of the base AMQP transport and translate its result to the caller into a transport-agnostic object.]*/
  connect(done: Callback<any>): void {
    const uri = this._getConnectionUri();

    this._amqp.connect(uri, undefined, (err, connectResult) => {
      if (err) {
        if (done) done(translateError('AMQP Transport: Could not connect', err));
      } else {
        /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_06_001: [`initializeCBS` shall be invoked.]*/
        this._amqp.initializeCBS((err) => {
          if (err) {
            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_06_002: [If `initializeCBS` is not successful then the client will remain disconnected and the callback, if provided, will be invoked with an error object.]*/
            this._amqp.disconnect(() => {
              if (done) done(getTranslatedError(err, 'AMQP Transport: Could not initialize CBS'));
            });
          } else {
            /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_06_003: [If `initializeCBS` is successful, `putToken` shall be invoked with the first parameter audience, created from the sr of the sas signature, the next parameter of the actual sas, and a callback.]*/
            const audience = SharedAccessSignature.parse(this._config.sharedAccessSignature.toString(), ['sr', 'sig', 'se']).sr;
            const applicationSuppliedSas = typeof(this._config.sharedAccessSignature) === 'string';
            const sasToken = applicationSuppliedSas ? this._config.sharedAccessSignature as string : (this._config.sharedAccessSignature as SharedAccessSignature).extend(anHourFromNow());
            this._amqp.putToken(audience, sasToken, (err) => {
              if (err) {
                /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_06_004: [** If `putToken` is not successful then the client will remain disconnected and the callback, if provided, will be invoked with an error object.]*/
                this._amqp.disconnect(() => {
                  if (done) done(getTranslatedError(err, 'AMQP Transport: Could not authorize with puttoken'));
                });
              } else {
                if (!applicationSuppliedSas) {
                  this._renewalTimeout = setTimeout(this._handleSASRenewal.bind(this), this._renewalNumberOfMilliseconds);
                }
                if (done) done(null, connectResult);
              }
            });
          }
        });
      }
    });
  }

  /**
   * @private
   * @method             module:azure-iothub.Amqp#disconnect
   * @description        Disconnects the link to the IoT Hub instance.
   * @param {Function}   done   Called when disconnected of if an error happened.
   */
  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_020: [** The `disconnect` method shall call the `disconnect` method of the base AMQP transport and translate its result to the caller into a transport-agnostic object.]*/
  disconnect(done: Callback<any>): void {
    if (this._renewalTimeout) {
      clearTimeout(this._renewalTimeout);
    }
    this._amqp.disconnect(handleResult('AMQP Transport: Could not disconnect', done));
  }

  /**
   * @private
   * @method             module:azure-iothub.Amqp#send
   * @description        Sends a message to the IoT Hub.
   * @param {Message}  message    The [message]{@linkcode module:common/message.Message}
   *                              to be sent.
   * @param {Function} done       The callback to be invoked when `send`
   *                              completes execution.
   */
  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_002: [The send method shall construct an AMQP request using the message passed in argument as the body of the message.]*/
  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_003: [The message generated by the send method should have its “to” field set to the device ID passed as an argument.]*/
  send(deviceId: string, message: Message, done: Callback<any>): void {
    const serviceEndpoint = '/messages/devicebound';
    const deviceEndpoint = endpoint.messagePath(encodeURIComponent(deviceId));
    this._amqp.send(message, serviceEndpoint, deviceEndpoint, handleResult('AMQP Transport: Could not send message', done));
  }

  /**
   * @deprecated
   * @private
   * @method             module:azure-iothub.Amqp#getReceiver
   * @description        Gets the {@linkcode AmqpReceiver} object that can be used to receive messages from the IoT Hub instance and accept/reject/release them.
   * @param {Function}   done      Callback used to return the {@linkcode AmqpReceiver} object.
   */
  getReceiver(done: Callback<any>): void {
    const feedbackEndpoint = '/messages/serviceBound/feedback';
    this._amqp.getReceiver(feedbackEndpoint, handleResult('AMQP Transport: Could not get receiver', done));
  }

  /**
   * @private
   * @method             module:azure-iothub.Amqp#getFeedbackReceiver
   * @description        Gets the {@linkcode AmqpReceiver} object that can be used to receive messages from the IoT Hub instance and accept/reject/release them.
   * @param {Function}   done      Callback used to return the {@linkcode AmqpReceiver} object.
   */
  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_013: [The `getFeedbackReceiver` method shall request an `AmqpReceiver` object from the base AMQP transport for the `/messages/serviceBound/feedback` endpoint.]*/
  getFeedbackReceiver(done: Callback<any>): void {
    const feedbackEndpoint = '/messages/serviceBound/feedback';
    this._amqp.getReceiver(feedbackEndpoint, handleResult('AMQP Transport: Could not get receiver', done));
  }

  /**
   * @private
   * @method             module:azure-iothub.Amqp#getFileNotificationReceiver
   * @description        Gets the {@linkcode AmqpReceiver} object that can be used to receive messages from the IoT Hub instance and accept/reject/release them.
   * @param {Function}   done      Callback used to return the {@linkcode AmqpReceiver} object.
   */
  /*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_16_016: [The `getFeedbackReceiver` method shall request an `AmqpReceiver` object from the base AMQP transport for the `/messages/serviceBound/filenotifications` endpoint.]*/
  getFileNotificationReceiver(done: Callback<any>): void {
    const fileNotificationEndpoint = '/messages/serviceBound/filenotifications';
    this._amqp.getReceiver(fileNotificationEndpoint, handleResult('AMQP Transport: Could not get file notification receiver', done));
  }

  protected _getConnectionUri(): string {
    return 'amqps://' + this._config.host;
  }

  private _handleSASRenewal(): void {
    this._amqp.putToken(SharedAccessSignature.parse(this._config.sharedAccessSignature.toString(), ['sr', 'sig', 'se']).sr, (this._config.sharedAccessSignature as SharedAccessSignature).extend(anHourFromNow()), (err) => {
      if (err) {
        debug('error from the put token' + err);
        this._amqp.disconnect((disconnectError) => {
          if (disconnectError) {
            debug('error from disconnect following failed put token' + err);
          }
        });
      } else {
        this._renewalTimeout = setTimeout(this._handleSASRenewal.bind(this), this._renewalNumberOfMilliseconds);
      }
    });
  }
}
