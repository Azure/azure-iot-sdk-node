// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { endpoint, errors, results, Message, Receiver } from 'azure-iot-common';
const ArgumentError = errors.ArgumentError;

import cron = require('node-crontab');

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

let defaultOptions: HttpReceiverOptions = {
  // 'interval' is a number, expressed in seconds. Default will poll for messages once per second.
  interval: 1,
  // 'at' is a Date object. Message(s) will be received at this time.
  at: null,
  // 'cron' is a cron string. Message(s) will be received according to the interval defined by the cron string.
  cron: null,
  // 'manualPolling' is a boolean indicating whether to receive only when the receive method is called.
  manualPolling: false,
  // 'drain' is a boolean indicating whether all messages should be received at the same time (as opposed to one at a time, if set to 'false')
  drain: true
};

export interface HttpReceiverOptions {
  interval?: number;
  at?: Date;
  cron?: string;
  manualPolling?: boolean;
  drain?: boolean;
}

/**
 * @class module:azure-iot-device-http.HttpReceiver
 * @classdesc Provides a receiver link that can pull messages from the IoT Hub service and settle them.
 *
 * @param {Object}  config            This is a dictionary containing the
 *                                    following keys and values:
 *
 * | Key     | Value                                                   |
 * |---------|---------------------------------------------------------|
 * | host    | The host URL of the Azure IoT Hub                       |
 * | hubName | The name of the Azure IoT Hub                           |
 * | keyName | The identifier of the device that is being connected to |
 * | key     | The shared access key auth                              |
 *
 * @emits message When a message is received
 * @emits errorReceived When there was an error trying to receive messages
 */
/**
 * @event module:azure-iot-device-http.HttpReceiver#errorReceived
 * @type {Error}
 */
/**
 * @event module:azure-iot-device-http.HttpReceiver#message
 * @type {Message}
 */
export class HttpReceiver extends EventEmitter implements Receiver {
  private _config: any;
  private _http: any;
  private _opts: HttpReceiverOptions;
  private _cronObj: any;
  private _intervalObj: number;
  private _timeoutObj: number;
  private _receiverStarted: boolean;

  constructor(config: any, httpHelper: any) {
    super();
    this._config = config;
    this._http = httpHelper;

    this._opts = defaultOptions;
    this._receiverStarted = false;

    this.on('removeListener', () => {
      if (this._receiverStarted && this.listeners('message').length === 0) {
        this._stopReceiver();
      }
    });

    this.on('newListener', () => {
      if (!this._receiverStarted) {
        this._startReceiver();
      }
    });
  }

  /**
   * @method          module:azure-iot-device-http.HttpReceiver#receive
   * @description     The receive method queries the IoT Hub immediately (as the device indicated in the
   *                  `config` constructor parameter) for the next message in the queue.
   */
  /*Codes_SRS_NODE_DEVICE_HTTP_05_004: [The receive method shall construct an HTTP request using information supplied by the caller, as follows:
  GET <config.host>/devices/<config.deviceId>/messages/devicebound?api-version=<version> HTTP/1.1
  Authorization: <config.sharedAccessSignature>
  iothub-to: /devices/<config.deviceId>/messages/devicebound
  User-Agent: <version string>
  Host: <config.host>
  ]*/
  receive(): void {
    const path = endpoint.messagePath(this._config.deviceId);
    let httpHeaders = {
      'iothub-to': path,
      'User-Agent': 'azure-iot-device/' + packageJson.version
    };

    this._insertAuthHeaderIfNecessary(httpHeaders);

    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_017: [If opts.drain is true all messages in the queue should be pulled at once.]*/
    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_018: [If opts.drain is false, only one message shall be received at a time]*/
    const drainRequester = new EventEmitter();
    drainRequester.on('nextRequest', () => {
      const request = this._http.buildRequest('GET', path + endpoint.versionQueryString(), httpHeaders, this._config.host, this._config.x509, (err, body, res) => {
        if (!err) {
          if (body) {
            const msg = this._http.toMessage(res, body);
            if (this._opts.drain) {
              drainRequester.emit('nextRequest');
            }
            this.emit('message', msg);
          }
        } else {
          err.response = res;
          err.responseBody = body;
          this.emit('errorReceived', err);
        }
      });
      request.end();
    });

    drainRequester.emit('nextRequest');
  }

  /**
   * @method          module:azure-iot-device-http.HttpReceiver#setOptions
   * @description     This method sets the options defining how the receiver object should poll the IoT Hub service to get messages.
   *                  There is only one instance of the receiver object. If the receiver has already been created, calling setOptions will
   *                  change the options of the existing instance and restart it.
   *
   * @param {Object} opts Receiver options formatted as: { interval: (Number), at: (Date), cron: (string), drain: (Boolean) }
   */
  /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_001: [The setOptions method shall accept an argument formatted as such:
  {
      interval: (Number),
      at: (Date)
      cron: (string)
      drain: (Boolean)
  }]*/
  setOptions(opts?: HttpReceiverOptions): void {
    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_019: [If the receiver is already running with a previous configuration, the existing receiver should be restarted with the new configuration]*/
    const restartReceiver = this._receiverStarted;
    if (this._receiverStarted) {
      this._stopReceiver();
    }

    if (!opts) {
      this._opts = defaultOptions;
    }

    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_008: [Only one of the interval, at, and cron fields should be populated: if more than one is populated, an ArgumentError shall be thrown.]*/
    if (opts.interval && opts.cron ||
        opts.interval && opts.at ||
        opts.interval && opts.manualPolling ||
        opts.at && opts.cron ||
        opts.at && opts.manualPolling ||
        opts.cron && opts.manualPolling) {
      throw new ArgumentError('Only one of the (interval|at|cron) fields should be set.');
    }

    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_002: [opts.interval is not a number, an ArgumentError should be thrown.]*/
    if (opts.interval && typeof (opts.interval) !== 'number') {
      throw new ArgumentError('The \'interval\' parameter must be a number');
    }

    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_005: [If opts.interval is a negative number, an ArgumentError should be thrown.]*/
    if (opts.interval && opts.interval <= 0) {
      throw new ArgumentError('the \'interval\' parameter must be strictly greater than 0 (zero)');
    }

    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_022: [If opts.at is not a Date object, an ArgumentError should be thrown]*/
    if (opts.at && !(opts.at instanceof Date)) {
      throw new ArgumentError('The \'at\' parameter must be a Date');
    }

    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_004: [if opts.cron is set it shall be a string that can be interpreted as a cron expression]*/
    if (opts.cron && typeof (opts.cron) !== 'string') {
      throw new ArgumentError('The \'at\' parameter must be a String and use the cron syntax (see https://www.npmjs.com/package/node-crontab)');
    }

    this._opts = opts;

    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_019: [If the receiver is already running with a previous configuration, the existing receiver should be restarted with the new configuration]*/
    if (restartReceiver) {
      this._startReceiver();
    }
  }

  /**
   * @method          module:azure-iot-device-http.HttpReceiver#updateSharedAccessSignature
   * @description     Sets the SAS Token used for authentication with the IoT Hub service when receiving messages.
   */

  updateSharedAccessSignature(sharedAccessSignature: string): void {
    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_032: [`updateSharedAccessSignature` shall throw a `ReferenceError` if the `sharedAccessSignature` argument is falsy.]*/
    if (!sharedAccessSignature) throw new ReferenceError('sharedAccessSignature cannot be \'' + sharedAccessSignature + '\'');

    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_033: [All subsequent HTTP requests shall use the value of the `sharedAccessSignature` argument in their headers.]*/
    this._config.sharedAccessSignature = sharedAccessSignature;
  }

  /**
   * @method          module:azure-iot-device-http.HttpReceiver#complete
   * @description     Sends a completion message to the IoT Hub service, effectively removing the message from the queue and flagging it as succesfully delivered.
   */
  complete(message: Message, done?: (err?: Error, result?: results.MessageCompleted) => void): void {
    if (!message) throw new ReferenceError('Invalid message object.');
    this._sendFeedback('complete', message, done);
  }

  /**
   * @method          module:azure-iot-device-http.HttpReceiver#abandon
   * @description     Sends an abandon message to the IoT Hub service. The message remains in the queue and the service will retry delivering it.
   */
  abandon(message: Message, done?: (err?: Error, result?: results.MessageAbandoned) => void): void {
    if (!message) throw new ReferenceError('Invalid message object.');
    this._sendFeedback('abandon', message, done);
  }

  /**
   * @method          module:azure-iot-device-http.HttpReceiver#reject
   * @description     Sends a rejection message to the IoT Hub service, effectively removing the message from the queue and flagging it as rejected.
   */
  reject(message: Message, done?: (err?: Error, result?: results.MessageRejected) => void): void {
    if (!message) throw new ReferenceError('Invalid message object.');
    this._sendFeedback('reject', message, done);
  }

  /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_031: [If using a shared access signature for authentication, the following additional header should be used in the HTTP request:
  ```
  Authorization: <config.sharedAccessSignature>
  ``` ]*/

  /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_030: [If using x509 authentication the `Authorization` header shall not be set and the x509 parameters shall instead be passed to the underlying transpoort.]*/
  private _insertAuthHeaderIfNecessary(headers: { [key: string]: string }): void {
    if (!this._config.x509) {
      headers.Authorization = this._config.sharedAccessSignature.toString();
    }
  }

  private _startReceiver(): void {
    if (!this._cronObj && !this._intervalObj && !this._timeoutObj) {
      if (this._opts.interval) {
        /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_021: [If opts.interval is set, messages should be received repeatedly at that interval]*/
        this._intervalObj = setInterval(this.receive.bind(this), this._opts.interval * 1000); // this._opts.interval is in seconds but setInterval takes milliseconds.
        this._receiverStarted = true;
      } else if (this._opts.at) {
        /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_003: [if opts.at is set, messages shall be received at the Date and time specified.]*/
        const at = new Date(this._opts.at).getTime();
        const diff = Math.max(at - Date.now(), 0);
        this._timeoutObj = setTimeout(this.receive.bind(this), diff);
        this._receiverStarted = true;
      } else if (this._opts.cron) {
        /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_020: [If opts.cron is set messages shall be received according to the schedule described by the expression.]*/
        this._cronObj = cron.scheduleJob(this._opts.cron, this.receive.bind(this));
        this._receiverStarted = true;
      } else if (this._opts.manualPolling) {
        /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_023: [If opts.manualPolling is true, messages shall be received only when receive() is called] */
        this._receiverStarted = true;
      }
    }
  }

  private _stopReceiver(): void {
    if (this._cronObj) {
      cron.cancelJob(this._cronObj);
      this._cronObj = null;
      this._receiverStarted = false;
    }

    if (this._intervalObj) {
      clearInterval(this._intervalObj);
      this._intervalObj = null;
      this._receiverStarted = false;
    }

    if (this._timeoutObj) {
      clearTimeout(this._timeoutObj);
      this._timeoutObj = null;
      this._receiverStarted = false;
    }

    if (this._opts.manualPolling) {
      this._receiverStarted = false;
    }
  }

  /**
   * This method sends the feedback action to the IoT Hub.
   *
   * @param {String}  action    This parameter must be equal to one of the
   *                            following possible values:
   *
   * | Value    | Action                                                                                  |
   * |----------|-----------------------------------------------------------------------------------------|
   * | abandon  | Directs the IoT Hub to re-enqueue a message so it may be received again later.          |
   * | reject   | Directs the IoT Hub to delete a message from the queue and record that it was rejected. |
   * | complete | Directs the IoT Hub to delete a message from the queue and record that it was accepted. |
   *
   * @param {String}        message   The message for which feedback is being sent.
   * @param {Function}      done      The callback to be invoked when
   *                                  `sendFeedback` completes execution.
   */
  private _sendFeedback(action: 'abandon' | 'reject' | 'complete', message: Message, done: (err?: Error, result?: any) => void): void {
    const config = this._config;
    let method;
    let resultConstructor = null;
    let path = endpoint.feedbackPath(config.deviceId, message.lockToken);
    let httpHeaders = {
      'If-Match': message.lockToken,
      'User-Agent': 'azure-iot-device/' + packageJson.version
    };

    this._insertAuthHeaderIfNecessary(httpHeaders);

    /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_009: [abandon shall construct an HTTP request using information supplied by the caller, as follows:
    POST <config.host>/devices/<config.deviceId>/messages/devicebound/<lockToken>/abandon?api-version=<version> HTTP/1.1
    Authorization: <config.sharedAccessSignature>
    If-Match: <lockToken>
    Host: <config.host>]
    */
    if (action === 'abandon') {
      path += '/abandon' + endpoint.versionQueryString();
      method = 'POST';
      resultConstructor = results.MessageAbandoned;
    } else if (action === 'reject') {
      /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_010: [reject shall construct an HTTP request using information supplied by the caller, as follows:
      DELETE <config.host>/devices/<config.deviceId>/messages/devicebound/<lockToken>?api-version=<version>&reject HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      If-Match: <lockToken>
      Host: <config.host>]*/
      path += endpoint.versionQueryString() + '&reject';
      method = 'DELETE';
      resultConstructor = results.MessageRejected;
    } else {
      /*Codes_SRS_NODE_DEVICE_HTTP_RECEIVER_16_011: [complete shall construct an HTTP request using information supplied by the caller, as follows:
      DELETE <config.host>/devices/<config.deviceId>/messages/devicebound/<lockToken>?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      If-Match: <lockToken>
      Host: <config.host>]*/
      path += endpoint.versionQueryString();
      method = 'DELETE';
      resultConstructor = results.MessageCompleted;
    }

    /*Codes_SRS_NODE_DEVICE_HTTP_05_008: [If any Http method encounters an error before it can send the request, it shall invoke the done callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
    const request = this._http.buildRequest(method, path, httpHeaders, config.host, this._config.x509, (err, body, response) => {
      if (done) {
        if (!err && response.statusCode === 204) {
          const result = new resultConstructor(response);
          done(null, result);
        } else {
          err.response = response;
          err.responseBody = body;
          done(err);
        }
      }
    });

    request.end();
  }
}
