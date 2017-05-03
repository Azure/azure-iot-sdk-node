// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { Http as Base } from 'azure-iot-http-base';
import { endpoint, results, Message } from 'azure-iot-common';
import { HttpReceiver } from './http_receiver.js';
import { translateError } from './http_errors.js';
import { IncomingMessage } from 'http';
import { Client, BatchingTransport, ClientConfig } from 'azure-iot-device';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

const MESSAGE_PROP_HEADER_PREFIX = 'iothub-app-';

/*Codes_SRS_NODE_DEVICE_HTTP_05_009: [When any Http method receives an HTTP response with a status code >= 300, it shall invoke the done callback function with the following arguments:
err - the standard JavaScript Error object, with the Node.js http.ServerResponse object attached as the property response]*/
/*Codes_SRS_NODE_DEVICE_HTTP_05_010: [When any Http method receives an HTTP response with a status code < 300, it shall invoke the done callback function with the following arguments:
err - null
body - the body of the HTTP response
response - the Node.js http.ServerResponse object returned by the transport]*/
function handleResponse(done: (err?: Error, result?: results.MessageEnqueued) => void): (err?: Error, body?: any, response?: IncomingMessage) => void {
  return (err?: Error, body?: any, response?: IncomingMessage): void => {
    if (!err) {
      done(null, new results.MessageEnqueued(response));
    } else {
      const error = response ? translateError('Could not send message: ' + err.message, body, response) : err;
      done(error);
    }
  };
}

/**
 * @class module:azure-iot-device-http.Http
 * @classdesc       Provide HTTP transport to the device [client]{@link module:azure-iot-device.Client}.
 *
 * @param   {Object}    config  Configuration object derived from the connection string by the client.
 */
/*Codes_SRS_NODE_DEVICE_HTTP_05_001: [The Http constructor shall accept an object with the following properties:
- `host` - (string) the fully-qualified DNS hostname of an IoT hub
- `deviceId` - (string) the name of the IoT hub, which is the first segment of hostname
and either:
- `sharedAccessSignature` - (string) a shared access signature generated from the credentials of a policy with the "device connect" permissions.
or:
- `x509` (object) an object with 3 properties: `cert`, `key` and `passphrase`, all strings, containing the necessary information to connect to the service.
]*/
export class Http extends EventEmitter implements Client.Transport, BatchingTransport {
  private _config: ClientConfig;
  private _http: Base;
  private _receiver: any;

  constructor(config: ClientConfig) {
    super();
    this._config = config;
    this._http = new Base();
  }

  /**
   * @method          module:azure-iot-device-http.Http#sendEvent
   * @description     This method sends an event to the IoT Hub as the device indicated in the
   *                  `config` parameter.
   *
   * @param {Message}  message    The [message]{@linkcode module:common/message.Message}
   *                              to be sent.
   * @param {Object}  config      This is a dictionary containing the following keys
   *                              and values:
   *
   * | Key     | Value                                                   |
   * |---------|---------------------------------------------------------|
   * | host    | The host URL of the Azure IoT Hub                       |
   * | hubName | The name of the Azure IoT Hub                           |
   * | keyName | The identifier of the device that is being connected to |
   * | key     | The shared access key auth                              |
   *
   * @param {Function} done       The callback to be invoked when `sendEvent`
   *                              completes execution.
   */
  sendEvent(message: Message, done: (err?: Error, result?: results.MessageEnqueued) => void): void {
    const config = this._config;
    /*Codes_SRS_NODE_DEVICE_HTTP_05_002: [The `sendEvent` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    POST <config.host>/devices/<config.deviceId>/messages/events?api-version=<version> HTTP/1.1
    iothub-to: /devices/<config.deviceId>/messages/events
    User-Agent: <version string>
    Host: <config.host>

    <message>
    ```]*/
    const path = endpoint.eventPath(config.deviceId);
    let httpHeaders = {
      'iothub-to': path,
      'User-Agent': 'azure-iot-device/' + packageJson.version,
    };

    this._insertAuthHeaderIfNecessary(httpHeaders);

    for (let i = 0; i < message.properties.count(); i++) {
      const propItem = message.properties.getItem(i);
      /*Codes_SRS_NODE_DEVICE_HTTP_13_001: [ sendEvent shall add message properties as HTTP headers and prefix the key name with the string iothub-app. ]*/
      httpHeaders[MESSAGE_PROP_HEADER_PREFIX + propItem.key] = propItem.value;
    }

    if (message.messageId) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_014: [If the `message` object has a `messageId` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-MessageId`.]*/
        httpHeaders['IoTHub-MessageId'] = message.messageId;
    }

    if (message.correlationId) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_015: [If the `message` object has a `correlationId` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-CorrelationId`.]*/
        httpHeaders['IoTHub-CorrelationId'] = message.correlationId;
    }

    if (message.userId) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_016: [If the `message` object has a `userId` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-UserId`.]*/
        httpHeaders['IoTHub-UserId'] = message.userId;
    }

    if (message.to) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_017: [If the `message` object has a `to` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-To`.]*/
        httpHeaders['IoTHub-To'] = message.to;
    }

    if (message.expiryTimeUtc) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_018: [If the `message` object has a `expiryTimeUtc` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-Expiry`.]*/
        httpHeaders['IoTHub-Expiry'] = message.expiryTimeUtc;
    }

    if (message.ack) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_019: [If the `message` object has a `ack` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-Ack`.]*/
        httpHeaders['IoTHub-Ack'] = message.ack;
    }

    /*Codes_SRS_NODE_DEVICE_HTTP_16_013: [If using x509 authentication the `Authorization` header shall not be set and the x509 parameters shall instead be passed to the underlying transpoort.]*/
    const request = this._http.buildRequest('POST', path + endpoint.versionQueryString(), httpHeaders, config.host, config.x509, handleResponse(done));

    request.write(message.getBytes());
    request.end();
  }

  /**
   * @method          module:azure-iot-device-http.Http#sendEventBatch
   * @description     The `sendEventBatch` method sends a list of event messages to the IoT Hub
   *                  as the device indicated in the `config` parameter.
   * @param {array<Message>} messages   Array of [Message]{@linkcode module:common/message.Message}
   *                                    objects to be sent as a batch.
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
   * @param {Function}      done      The callback to be invoked when
   *                                  `sendEventBatch` completes execution.
   */
  sendEventBatch(messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void {
    const config = this._config;

    function constructBatchBody(messages: Message[]): string {
      let body = '[';

      messages.forEach((message, index) => {
        const buffMsg = new Buffer(<any>message.getData());

        if (index > 0) body += ',';

        body += '{\"body\":\"' + buffMsg.toString('base64') + '\"';
        // Get the properties
        let propertyIdx = 0;
        let property = ',\"properties\":{';
        for (propertyIdx = 0; propertyIdx < message.properties.count(); propertyIdx++) {
          if (propertyIdx > 0)
            property += ',';
          const propItem = message.properties.getItem(propertyIdx);
          /*Codes_SRS_NODE_DEVICE_HTTP_13_002: [ sendEventBatch shall prefix the key name for all message properties with the string iothub-app. ]*/
          property += '\"' + MESSAGE_PROP_HEADER_PREFIX + propItem.key + '\":\"' + propItem.value + '\"';
        }
        if (propertyIdx > 0) {
          property += '}';
          body += property;
        }
        body += '}';
      });
      body += ']';
      return body;
    }

    /*Codes_SRS_NODE_DEVICE_HTTP_05_003: [The `sendEventBatch` method shall construct an HTTP request using information supplied by the caller, as follows:
    ```
    POST <config.host>/devices/<config.deviceId>/messages/events?api-version=<version> HTTP/1.1
    iothub-to: /devices/<config.deviceId>/messages/events
    User-Agent: <version string>
    Content-Type: application/vnd.microsoft.iothub.json
    Host: <config.host>

    {"body":"<Base64 Message1>","properties":{"<key>":"<value>"}},
    {"body":"<Base64 Message1>"}...
    ```]*/
    const path = endpoint.eventPath(config.deviceId);
    let httpHeaders = {
      'iothub-to': path,
      'Content-Type': 'application/vnd.microsoft.iothub.json',
      'User-Agent': 'azure-iot-device/' + packageJson.version
    };

    this._insertAuthHeaderIfNecessary(httpHeaders);

    /*Codes_SRS_NODE_DEVICE_HTTP_16_013: [If using x509 authentication the `Authorization` header shall not be set and the x509 parameters shall instead be passed to the underlying transpoort.]*/
    const request = this._http.buildRequest('POST', path + endpoint.versionQueryString(), httpHeaders, config.host, config.x509, handleResponse(done));
    const body = constructBatchBody(messages);
    request.write(body);
    request.end();
  }

  /**
   * @method          module:azure-iot-device-http.Http#getReceiver
   * @description     This methods gets the unique instance of the receiver that is used to asynchronously retrieve messages from the IoT Hub service.
   *
   * @param {Function}      done      The callback to be invoked when `getReceiver` completes execution, passing the receiver object as an argument.
   */
  getReceiver(done: (err?: Error, result?: HttpReceiver) => void): void {
    if (!this._receiver) {
      this._receiver = new HttpReceiver(this._config, this._http);
    }

    done(null, this._receiver);
  }

  /**
   * @method          module:azure-iot-device-http.Http#setOptions
   * @description     This methods sets the HTTP specific options of the transport.
   *
   * @param {Function}      done      The callback to be invoked when `setOptions` completes.
   */
  setOptions(options: any, done: (err?: Error, result?: any) => void): void {
    /*Codes_SRS_NODE_DEVICE_HTTP_16_011: [The HTTP transport should use the x509 settings passed in the `options` object to connect to the service if present.]*/
    if (options.hasOwnProperty('cert')) {
      this._config.x509 = {
        cert: options.cert,
        key: options.key,
        passphrase: options.passphrase
      };
    }

    const calldoneifspecified = function(err?: Error): void {
      /*Codes_SRS_NODE_DEVICE_HTTP_16_010: [`setOptions` should not throw if `done` has not been specified.]*/
      if (done) {
        /*Codes_SRS_NODE_DEVICE_HTTP_16_005: [If `done` has been specified the `setOptions` method shall call the `done` callback with no arguments when successful.]*/
        /*Codes_SRS_NODE_DEVICE_HTTP_16_009: [If `done` has been specified the `setOptions` method shall call the `done` callback with a standard javascript `Error` object when unsuccessful.]*/
        done(err);
      }
    };

    if (options.hasOwnProperty('http') && options.http.hasOwnProperty('receivePolicy')) {
      /*Codes_SRS_NODE_DEVICE_HTTP_16_004: [The `setOptions` method shall call the `setOptions` method of the HTTP Receiver with the content of the `http.receivePolicy` property of the `options` parameter.]*/
      this.getReceiver((err, receiver) => {
        if (!err) {
          receiver.setOptions(options.http.receivePolicy);
        }
        calldoneifspecified(err);
      });
    } else {
      calldoneifspecified();
    }
  }

  /**
   * @method              module:azure-iot-device-http.Http#complete
   * @description         Settles the message as complete and calls the done callback with the result.
   *
   * @param {Message}     message     The message to settle as complete.
   * @param {Function}    done        The callback that shall be called with the error or result object.
   */
  /*Codes_SRS_NODE_DEVICE_HTTP_16_002: [The ‘complete’ method shall call the ‘complete’ method of the receiver object and pass it the message and the callback given as parameters.] */
  complete(message: Message, done: (err?: Error, result?: results.MessageCompleted) => void): void {
    this.getReceiver((err, receiver) => {
      receiver.complete(message, done);
    });
  }

  /**
   * @method              module:azure-iot-device-http.Http#reject
   * @description         Settles the message as rejected and calls the done callback with the result.
   *
   * @param {Message}     message     The message to settle as rejected.
   * @param {Function}    done        The callback that shall be called with the error or result object.
   */
  /*Codes_SRS_NODE_DEVICE_HTTP_16_003: [The ‘reject’ method shall call the ‘reject’ method of the receiver object and pass it the message and the callback given as parameters.] */
  reject(message: Message, done: (err?: Error, result?: results.MessageRejected) => void): void {
    this.getReceiver((err, receiver) => {
      receiver.reject(message, done);
    });
  }

  /**
   * @method              module:azure-iot-device-http.Http#abandon
   * @description         Settles the message as abandoned and calls the done callback with the result.
   *
   * @param {Message}     message     The message to settle as abandoned.
   * @param {Function}    done        The callback that shall be called with the error or result object.
   */
  /*Codes_SRS_NODE_DEVICE_HTTP_16_001: [The ‘abandon’ method shall call the ‘abandon’ method of the receiver object and pass it the message and the callback given as parameters.] */
  abandon(message: Message, done: (err?: Error, result?: results.MessageAbandoned) => void): void {
    this.getReceiver((err, receiver) => {
      receiver.abandon(message, done);
    });
  }

  /**
   * @method          module:azure-iot-device-http.Http#updateSharedAccessSignature
   * @description     This methods sets the SAS token used to authenticate with the IoT Hub service.
   *
   * @param {String}        sharedAccessSignature  The new SAS token.
   * @param {Function}      done      The callback to be invoked when `updateSharedAccessSignature` completes.
   */
  updateSharedAccessSignature(sharedAccessSignature: string, done: (err?: Error, result?: results.SharedAccessSignatureUpdated) => void): void {
    /*Codes_SRS_NODE_DEVICE_HTTP_16_006: [The updateSharedAccessSignature method shall save the new shared access signature given as a parameter to its configuration.] */
    this._config.sharedAccessSignature = sharedAccessSignature;

    /*Codes_SRS_NODE_DEVICE_HTTP_16_008: [The updateSharedAccessSignature method shall call the `updateSharedAccessSignature` method of the current receiver object if it exists.] */
    if (this._receiver) {
      this._receiver.updateSharedAccessSignature(sharedAccessSignature);
    }

    /*Codes_SRS_NODE_DEVICE_HTTP_16_007: [The updateSharedAccessSignature method shall call the `done` callback with a null error object and a SharedAccessSignatureUpdated object as a result, indicating that the client does not need to reestablish the transport connection.] */
    done(null, new results.SharedAccessSignatureUpdated(false));
  }

  private _insertAuthHeaderIfNecessary(headers: { [key: string]: string }): void {
    if (!this._config.x509) {
      /*Codes_SRS_NODE_DEVICE_HTTP_16_012: [If using a shared access signature for authentication, the following additional header should be used in the HTTP request:
      ```
      Authorization: <config.sharedAccessSignature>
      ```]*/
      headers.Authorization = this._config.sharedAccessSignature.toString();
    }
  }
}
