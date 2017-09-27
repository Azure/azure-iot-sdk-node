// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import * as querystring from 'querystring';
import * as machina from 'machina';

import { MqttBase } from './mqtt_base';
import { results, errors, Message, X509 } from 'azure-iot-common';
import { ClientConfig, DeviceMethodResponse, Client, StableConnectionTransport, TwinTransport } from 'azure-iot-device';
import { EventEmitter } from 'events';
import * as util from 'util';
import * as dbg from 'debug';
const debug = dbg('device:mqtt');
import { translateError } from './mqtt_translate_error';
import { MqttTwinReceiver } from './mqtt_twin_receiver';
import { MqttReceiver } from './mqtt_receiver';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

const TOPIC_RESPONSE_PUBLISH_FORMAT = '$iothub/%s/res/%d/?$rid=%s';

/**
 * @class        module:azure-iot-device-mqtt.Mqtt
 * @classdesc    Provides MQTT transport for the device [client]{@link module:azure-iot-device.Client} class.
 *
 * This class is not meant to be used directly, instead it should just be passed to the [client]{@link module:azure-iot-device.Client} object.
 *
 * @param   {Object}    config  Configuration object derived from the connection string by the client.
 */
/*
 Codes_SRS_NODE_DEVICE_MQTT_12_001: [The `Mqtt` constructor shall accept the transport configuration structure
 Codes_SRS_NODE_DEVICE_MQTT_12_002: [The `Mqtt` constructor shall store the configuration structure in a member variable
 Codes_SRS_NODE_DEVICE_MQTT_12_003: [The Mqtt constructor shall create an base transport object and store it in a member variable.]
*/
export class Mqtt extends EventEmitter implements Client.Transport, StableConnectionTransport, TwinTransport {
  /**
   * @private
   */
  protected _config: ClientConfig;
  private _mqtt: MqttBase;
  private _twinReceiver: MqttTwinReceiver;
  private _topicTelemetryPublish: string;
  private _topicMessageSubscribe: string;
  private _receiver: MqttReceiver;
  private _fsm: machina.Fsm;
  /**
   * @private
   */
  constructor(config: ClientConfig, provider?: any) {
    super();
    this._config = config;
    this._topicTelemetryPublish = 'devices/' + this._config.deviceId + '/messages/events/';
    this._topicMessageSubscribe = 'devices/' + this._config.deviceId + '/messages/devicebound/#';
    debug('topic publish: ' + this._topicTelemetryPublish);
    debug('topic subscribe: ' + this._topicMessageSubscribe);
    const sdkVersionString = encodeURIComponent('azure-iot-device/' + packageJson.version);

    /*Codes_SRS_NODE_DEVICE_MQTT_16_016: [The Mqtt constructor shall initialize the `uri` property of the `config` object to `mqtts://<host>`.]*/
    (this._config as any).uri = 'mqtts://' + config.host;
    /* Codes_SRS_NODE_DEVICE_MQTT_18_025: [ If the Mqtt constructor receives a second parameter, it shall be used as a provider in place of mqtt.js ]*/
    if (provider) {
      this._mqtt = provider;
    } else {
      this._mqtt = new MqttBase(sdkVersionString);
    }

    /* Codes_SRS_NODE_DEVICE_MQTT_18_026: When MqttTransport fires the close event, the Mqtt object shall emit a disconnect event */
    this._mqtt.on('error', (err) => {
      debug('on close');
      this.emit('disconnect', err);
    });

    this._fsm = new machina.Fsm({
      initialState: 'disconnected',
      states: {
        disconnected: {
          _onEnter: (disconnectedCallback, err, result) => {
            this._twinReceiver = null;
            if (disconnectedCallback) {
              if (err) {
                /*Codes_SRS_NODE_DEVICE_MQTT_16_019: [The `connect` method shall calls its callback with an `Error` that has been translated from the `MqttBase` error using the `translateError` method if it fails to establish a connection.]*/
                disconnectedCallback(translateError(err));
              } else {
                disconnectedCallback(undefined, result);
              }
            } else {
              /* Codes_SRS_NODE_DEVICE_MQTT_18_026: When MqttTransport fires the close event, the Mqtt object shall emit a disconnect event */
              this.emit('disconnect', err);
            }
          },
          /*Codes_SRS_NODE_DEVICE_MQTT_16_021: [The `disconnect` method shall call its callback immediately with a `null` argument and a `results.Disconnected` second argument if `MqttBase` is already disconnected.]*/
          disconnect: (callback) => callback(null, new results.Disconnected()),
          connect: (callback) => {
            this._fsm.transition('connecting', callback);
          },
          sendEvent: (topic, payload, options, sendEventCallback) => {
            /*Codes_SRS_NODE_DEVICE_MQTT_16_023: [The `sendEvent` method shall connect the Mqtt connection if it is disconnected.]*/
            this._fsm.handle('connect', (err) => {
              if (err) {
                /*Codes_SRS_NODE_DEVICE_MQTT_16_024: [The `sendEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to establish a connection.]*/
                sendEventCallback(translateError(err));
              } else {
                this._fsm.handle('sendEvent', topic, payload, options, sendEventCallback);
              }
            });
          },
          sendTwinRequest: (topic, body, sendTwinRequestCallback) => {
            /*Codes_SRS_NODE_DEVICE_MQTT_16_029: [The `sendTwinRequest` method shall connect the Mqtt connection if it is disconnected.]*/
            this._fsm.handle('connect', (err) => {
              if (err) {
                /*Tests_SRS_NODE_DEVICE_MQTT_16_033: [The `sendTwinRequest` method shall call its callback with an error translated using `translateError` if `MqttBase` fails to connect.]*/
                sendTwinRequestCallback(err);
              } else {
                this._fsm.handle('sendTwinRequest', topic, body, sendTwinRequestCallback);
              }
            });
          },
          updateSharedAccessSignature: (sharedAccessSignature, callback) => { callback(null, new results.SharedAccessSignatureUpdated(false)); },
          sendMethodResponse: (response, callback) => {
            /*Codes_SRS_NODE_DEVICE_MQTT_16_034: [The `sendMethodResponse` method shall fail with a `NotConnectedError` if the `MqttBase` object is not connected.]*/
            callback(new errors.NotConnectedError('device disconnected: the service already considers the method has failed'));
          },
          getTwinReceiver: (callback) => {
            this._fsm.handle('connect', (err) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('getTwinReceiver', callback);
              }
            });
          }
          },
        connecting: {
          _onEnter: (connectCallback) => {
            this._mqtt.connect(this._config, (err, result) => {
              debug('connect');
              if (err) {
                this._fsm.transition('disconnected', connectCallback, err);
              } else {
                /* Codes_SRS_NODE_DEVICE_MQTT_18_026: When MqttTransport fires the close event, the Mqtt object shall emit a disconnect event */
                this._mqtt.on('close', (err) => {
                  this._fsm.transition('disconnected', null, err);
                });
                this._fsm.transition('connected', connectCallback, result);
              }
            });
          },
          disconnect: (disconnectCallback) => {
            this._fsm.transition('disconnecting', disconnectCallback);
          },
          /*Codes_SRS_NODE_DEVICE_MQTT_16_025: [The `sendEvent` method shall be deferred until either disconnected or connected if it is called while `MqttBase` is establishing the connection.]*/
          /*Codes_SRS_NODE_DEVICE_MQTT_16_031: [The `sendTwinRequest` method shall be deferred until either disconnected or connected if it is called while `MqttBase` is establishing the connection.]*/
          '*': () => this._fsm.deferUntilTransition()
        },
        connected: {
          _onEnter: (connectedCallback, connectResult) => {
            /*Codes_SRS_NODE_DEVICE_MQTT_16_020: [The `connect` method shall call its callback with a `null` error parameter and a `results.Connected` response if `MqttBase` successfully connects.]*/
            if (connectedCallback) connectedCallback(null, new results.Connected(connectResult));
          },
          /*Codes_SRS_NODE_DEVICE_MQTT_16_018: [The `connect` method shall call its callback immediately if `MqttBase` is already connected.]*/
          connect: (connectCallback) => connectCallback(null, new results.Connected()),
          disconnect: (disconnectCallback) => {
            this._fsm.transition('disconnecting', disconnectCallback);
          },
          sendEvent: (topic, payload, options, sendEventCallback) => {
            this._mqtt.publish(topic, payload, options, (err, result) => {
              if (err) {
                /*Codes_SRS_NODE_DEVICE_MQTT_16_027: [The `sendEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to publish the message.]*/
                sendEventCallback(translateError(err));
              } else {
                sendEventCallback(null, new results.MessageEnqueued(result));
              }
            });
          },
          sendTwinRequest: (topic, body, callback) => {
            /* Codes_SRS_NODE_DEVICE_MQTT_18_001: [** The `sendTwinRequest` method shall call the publish method on `MqttTransport`. **]** */
            /* Codes_SRS_NODE_DEVICE_MQTT_18_015: [** The `sendTwinRequest` shall publish the request with QOS=0, DUP=0, and Retain=0 **]** */
            this._mqtt.publish(topic, body.toString(), { qos: 0, retain: false }, (err, puback) => {
              if (err) {
                /* Codes_SRS_NODE_DEVICE_MQTT_18_016: [** If an error occurs in the `sendTwinRequest` method, the `done` callback shall be called with the error as the first parameter. **]** */
                /* Codes_SRS_NODE_DEVICE_MQTT_18_024: [** If an error occurs, the `sendTwinRequest` shall use the MQTT `translateError` module to convert the mqtt-specific error to a transport agnostic error before passing it into the `done` callback. **]** */
                callback(translateError(err));
              } else {
                /* Codes_SRS_NODE_DEVICE_MQTT_18_004: [** If a `done` callback is passed as an argument, The `sendTwinRequest` method shall call `done` after the body has been published. **]** */
                /* Codes_SRS_NODE_DEVICE_MQTT_18_017: [** If the `sendTwinRequest` method is successful, the first parameter to the `done` callback shall be null and the second parameter shall be a MessageEnqueued object. **]** */
                callback(null, new results.MessageEnqueued(puback));
              }
            });
          },
          updateSharedAccessSignature: (sharedAccessSignature, callback) => {
            /*Codes_SRS_NODE_DEVICE_MQTT_16_028: [The `updateSharedAccessSignature` method shall call the `updateSharedAccessSignature` method on the `MqttBase` object if it is connected.]*/
            this._mqtt.updateSharedAccessSignature(sharedAccessSignature, (err) => {
              if (err) {
                /*Codes_SRS_NODE_DEVICE_MQTT_16_009: [The `updateSharedAccessSignature` method shall call the `done` method with an `Error` object if `MqttBase.updateSharedAccessSignature` fails.]*/
                this._fsm.transition('disconnected', callback, err);
              } else {
                /*Codes_SRS_NODE_DEVICE_MQTT_16_010: [The `updateSharedAccessSignature` method shall call the `done` callback with a `null` error object and a `SharedAccessSignatureUpdated` object with its `needToReconnect` property set to `false`, if `MqttBase.updateSharedAccessSignature` succeeds.]*/
                callback(null, new results.SharedAccessSignatureUpdated(false));
              }
            });
          },
          sendMethodResponse: (response, callback) => {
            // Codes_SRS_NODE_DEVICE_MQTT_13_002: [ sendMethodResponse shall build an MQTT topic name in the format: $iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES> where <STATUS> is response.status. ]
            // Codes_SRS_NODE_DEVICE_MQTT_13_003: [ sendMethodResponse shall build an MQTT topic name in the format: $iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES> where <REQUEST ID> is response.requestId. ]
            // Codes_SRS_NODE_DEVICE_MQTT_13_004: [ sendMethodResponse shall build an MQTT topic name in the format: $iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES> where <PROPERTIES> is URL encoded. ]
            const topicName = util.format(
              TOPIC_RESPONSE_PUBLISH_FORMAT,
              'methods',
              response.status,
              response.requestId
            );

            debug('sending response using topic: ' + topicName);
            debug(JSON.stringify(response.payload));
            // publish the response message
            this._mqtt.publish(topicName, JSON.stringify(response.payload), { qos: 0, retain: false }, (err) => {
              // Codes_SRS_NODE_DEVICE_MQTT_13_006: [ If the MQTT publish fails then an error shall be returned via the done callback's first parameter. ]
              // Codes_SRS_NODE_DEVICE_MQTT_13_007: [ If the MQTT publish is successful then the done callback shall be invoked passing null for the first parameter. ]
              callback(!!err ? translateError(err) : null);
            });
          },
          getTwinReceiver: (callback) => {
            /* Codes_SRS_NODE_DEVICE_MQTT_18_003: [** If a twin receiver for this endpoint doesn't exist, the `getTwinReceiver` method should create a new `MqttTwinReceiver` object. **]** */
            /* Codes_SRS_NODE_DEVICE_MQTT_18_002: [** If a twin receiver for this endpoint has already been created, the `getTwinReceiver` method should not create a new `MqttTwinReceiver` object. **]** */
            if (!this._twinReceiver) {
              this._twinReceiver = new MqttTwinReceiver(this._mqtt);
            }

            /* Codes_SRS_NODE_DEVICE_MQTT_18_005: [** The `getTwinReceiver` method shall call the `done` method after it completes **]** */
            /* Codes_SRS_NODE_DEVICE_MQTT_18_006: [** If a twin receiver for this endpoint did not previously exist, the `getTwinReceiver` method should return the a new `MqttTwinReceiver` object as the second parameter of the `done` function with null as the first parameter. **]** */
            /* Codes_SRS_NODE_DEVICE_MQTT_18_007: [** If a twin receiver for this endpoint previously existed, the `getTwinReceiver` method should return the preexisting `MqttTwinReceiver` object as the second parameter of the `done` function with null as the first parameter. **]** */
            callback(null, this._twinReceiver);
          }
        },
        disconnecting: {
          _onEnter: (disconnectCallback, err) => {
            /*Codes_SRS_NODE_DEVICE_MQTT_16_001: [The `disconnect` method should call the `disconnect` method on `MqttBase`.]*/
            /*Codes_SRS_NODE_DEVICE_MQTT_16_022: [The `disconnect` method shall call its callback with a `null` error parameter and a `results.Disconnected` response if `MqttBase` successfully disconnects if not disconnected already.]*/
            this._mqtt.disconnect((err, result) => {
              this._fsm.transition('disconnected', disconnectCallback, err, new results.Disconnected(result));
            });
          },
          /*Codes_SRS_NODE_DEVICE_MQTT_16_026: [The `sendEvent` method shall be deferred until disconnected if it is called while `MqttBase` is disconnecting.]*/
          /*Codes_SRS_NODE_DEVICE_MQTT_16_032: [The `sendTwinRequest` method shall be deferred until disconnected if it is called while `MqttBase` is disconnecting.]*/
          '*': () => this._fsm.deferUntilTransition()
        }
      }
    });
  }

  /**
   * @private
   * @method              module:azure-iot-device-mqtt.Mqtt#connect
   * @description         Establishes the connection to the Azure IoT Hub instance using the MQTT protocol.
   *
   * @param {Function}    done   callback that shall be called when the connection is established.
   */
  /* Codes_SRS_NODE_DEVICE_MQTT_12_004: [The connect method shall call the connect method on MqttTransport */
    connect(done?: (err?: Error, result?: any) => void): void {
      this._fsm.handle('connect', done);
    }

  /**
   * @private
   * @method              module:azure-iot-device-mqtt.Mqtt#disconnect
   * @description         Terminates the connection to the IoT Hub instance.
   *
   * @param {Function}    done      Callback that shall be called when the connection is terminated.
   */
  /* Codes_SRS_NODE_DEVICE_MQTT_16_001: [The disconnect method should call the disconnect method on MqttTransport.] */
  disconnect(done?: (err?: Error, result?: any) => void): void {
    this._fsm.handle('disconnect', done);
  }

  /**
   * @private
   * @method              module:azure-iot-device-mqtt.Mqtt#sendEvent
   * @description         Sends an event to the server.
   *
   * @param {Message}     message   Message used for the content of the event sent to the server.
   */
  /* Codes_SRS_NODE_DEVICE_MQTT_12_005: [The sendEvent method shall call the publish method on MqttTransport */
  sendEvent(message: Message, done?: (err?: Error, result?: any) => void): void {
    debug('sendEvent ' + JSON.stringify(message));

    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_008: [The `sendEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/messages/events/`.]*/
    let topic = this._topicTelemetryPublish;
    let systemProperties: { [key: string]: string } = {};
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_011: [The `sendEvent` method shall serialize the `messageId` property of the message as a key-value pair on the topic with the key `$.mid`.]*/
    if (message.messageId) systemProperties['$.mid'] = message.messageId;
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_012: [The `sendEvent` method shall serialize the `correlationId` property of the message as a key-value pair on the topic with the key `$.cid`.]*/
    if (message.correlationId) systemProperties['$.cid'] = message.correlationId;
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_013: [The `sendEvent` method shall serialize the `userId` property of the message as a key-value pair on the topic with the key `$.uid`.]*/
    if (message.userId) systemProperties['$.uid'] = message.userId;
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_014: [The `sendEvent` method shall serialize the `to` property of the message as a key-value pair on the topic with the key `$.to`.]*/
    if (message.to) systemProperties['$.to'] = message.to;
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_015: [The `sendEvent` method shall serialize the `expiryTimeUtc` property of the message as a key-value pair on the topic with the key `$.exp`.]*/
    if (message.expiryTimeUtc) {
      const expiryString = message.expiryTimeUtc instanceof Date ? message.expiryTimeUtc.toISOString() : message.expiryTimeUtc;
      systemProperties['$.exp'] = (expiryString || undefined);
    }

    const sysPropString = querystring.stringify(systemProperties);
    topic += sysPropString;

    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_009: [If the message has properties, the property keys and values shall be uri-encoded, then serialized and appended at the end of the topic with the following convention: `<key>=<value>&<key2>=<value2>&<key3>=<value3>(...)`.]*/
    if (message.properties.count() > 0) {
      for (let i = 0; i < message.properties.count(); i++) {
        if (i > 0 || sysPropString) topic += '&';
        topic += encodeURIComponent(message.properties.propertyList[i].key) + '=' + encodeURIComponent(message.properties.propertyList[i].value);
      }
    }

    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_010: [** The `sendEvent` method shall use QoS level of 1.]*/
    this._fsm.handle('sendEvent', topic, message.data, { qos: 1, retain: false }, (err, puback) => {
      debug('PUBACK: ' + JSON.stringify(puback));
      if (done) {
        if (err) {
          done(err);
        } else {
          done(null, new results.MessageEnqueued(puback));
        }
      }
    });
  }

  /**
   * @deprecated          The receiver pattern is being deprecated
   * @private
   * @method              module:azure-iot-device-mqtt.Mqtt#getReceiver
   * @description         Gets a receiver object that is used to receive and settle messages.
   *
   * @param {Function}    done   callback that shall be called with a receiver object instance.
   */
  getReceiver(done?: (err?: Error, receiver?: MqttReceiver) => void): void {
    /*Codes_SRS_NODE_DEVICE_MQTT_16_003: [If a receiver for this endpoint doesn’t exist, the getReceiver method should create a new MqttReceiver object and then call the done() method with the object that was just created as an argument.] */
    if (!this._receiver) {
      this._receiver = new MqttReceiver(
        this._mqtt,
        this._topicMessageSubscribe
      );
    }

    /*Codes_SRS_NODE_DEVICE_MQTT_16_002: [If a receiver for this endpoint has already been created, the getReceiver method should call the done() method with the existing instance as an argument.] */
    done(null, this._receiver);
  }

  /**
   * @private
   * @deprecated          // Implementation test belongs in the client.
   * @method              module:azure-iot-device-mqtt.Mqtt#complete
   * @description         Settles the message as complete and calls the done callback with the result.
   *
   * @param {Message}     message     The message to settle as complete.
   * @param {Function}    done        The callback that shall be called with the error or result object.
   */
  complete(message: Message, done?: (err?: Error, result?: any) => void): void {
    /*Codes_SRS_NODE_DEVICE_MQTT_16_005: [The ‘complete’ method shall call the callback given as argument immediately since all messages are automatically completed.]*/
    done(null, new results.MessageCompleted());
  }

  /**
   * @private
   * @deprecated          // Implementation test belongs in the client.
   * @method              module:azure-iot-device-mqtt.Mqtt#reject
   * @description         Settles the message as rejected and calls the done callback with the result.
   *
   * @throws {Error}      The MQTT transport does not support rejecting messages.
   */
  reject(): void {
    /*Codes_SRS_NODE_DEVICE_MQTT_16_006: [The ‘reject’ method shall throw because MQTT doesn’t support rejecting messages.] */
    throw new errors.NotImplementedError('the MQTT transport does not support rejecting messages.');
  }

  /**
   * @private
   * @deprecated          // Implementation test belongs in the client.
   * @method              module:azure-iot-device-mqtt.Mqtt#abandon
   * @description         Settles the message as abandoned and calls the done callback with the result.
   *
   * @throws {Error}      The MQTT transport does not support abandoning messages.
   */
  abandon(): void {
    /*Codes_SRS_NODE_DEVICE_MQTT_16_004: [The ‘abandon’ method shall throw because MQTT doesn’t support abandoning messages.] */
    throw new errors.NotImplementedError('The MQTT transport does not support abandoning messages.');
  }

  /**
   * @private
   * @method          module:azure-iot-device-mqtt.Mqtt#updateSharedAccessSignature
   * @description     This methods sets the SAS token used to authenticate with the IoT Hub service.
   *
   * @param {String}        sharedAccessSignature  The new SAS token.
   * @param {Function}      done      The callback to be invoked when `updateSharedAccessSignature` completes.
   */
  updateSharedAccessSignature (sharedAccessSignature: string, done?: (err?: Error, result?: any) => void): void {
    debug('updateSharedAccessSignature');
    /*Codes_SRS_NODE_DEVICE_MQTT_16_007: [The `updateSharedAccessSignature` method shall save the new shared access signature given as a parameter to its configuration.]*/
    this._config.sharedAccessSignature = sharedAccessSignature;
    this._fsm.handle('updateSharedAccessSignature', sharedAccessSignature, (err, result) => {
      if (done) done(err, result);
    });
  }

  /**
   * @private
   * @method          module:azure-iot-device-mqtt.Mqtt#setOptions
   * @description     This methods sets the MQTT specific options of the transport.
   *
   * @param {object}        options   Options to set.  Currently for MQTT these are the x509 cert, key, and optional passphrase properties. (All strings)
   * @param {Function}      done      The callback to be invoked when `setOptions` completes.
   */
  setOptions(options: X509, done?: (err?: Error, result?: any) => void): void {
    /*Codes_SRS_NODE_DEVICE_MQTT_16_011: [The `setOptions` method shall throw a `ReferenceError` if the `options` argument is falsy]*/
    if (!options) throw new ReferenceError('The options parameter can not be \'' + options + '\'');
    /*Codes_SRS_NODE_DEVICE_MQTT_16_015: [The `setOptions` method shall throw an `ArgumentError` if the `cert` property is populated but the device uses symmetric key authentication.]*/
    if (this._config.sharedAccessSignature && options.cert) throw new errors.ArgumentError('Cannot set x509 options on a device that uses symmetric key authentication.');

    /*Codes_SRS_NODE_DEVICE_MQTT_16_012: [The `setOptions` method shall update the existing configuration of the MQTT transport with the content of the `options` object.]*/
    this._config.x509 = {
      cert: options.cert,
      key: options.key,
      passphrase: options.passphrase
    };

    /*Codes_SRS_NODE_DEVICE_MQTT_16_013: [If a `done` callback function is passed as a argument, the `setOptions` method shall call it when finished with no arguments.]*/
    /*Codes_SRS_NODE_DEVICE_MQTT_16_014: [The `setOptions` method shall not throw if the `done` argument is not passed.]*/
    if (done) done(null);
  }

  /**
   * @private
   * @method          module:azure-iot-device-mqtt.Mqtt#sendTwinRequest
   * @description     Send a device-twin specific messager to the IoT Hub instance
   *
   * @param {String}        method    name of the method to invoke ('PUSH', 'PATCH', etc)
   * @param {String}        resource  name of the resource to act on (e.g. '/properties/reported/') with beginning and ending slashes
   * @param {Object}        properties  object containing name value pairs for request properties (e.g. { 'rid' : 10, 'index' : 17 })
   * @param {String}        body  body of request
   * @param {Function}      done  the callback to be invoked when this function completes.
   *
   * @throws {ReferenceError}   One of the required parameters is falsy
   * @throws {ArgumentError}  One of the parameters is an incorrect type
   */
  sendTwinRequest(method: string, resource: string, properties: { [key: string]: string }, body: any, done?: (err?: Error, result?: any) => void): void {

    /* Codes_SRS_NODE_DEVICE_MQTT_18_008: [** The `sendTwinRequest` method shall not throw `ReferenceError` if the `done` callback is falsy. **]** */

    /* Codes_SRS_NODE_DEVICE_MQTT_18_009: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `method` argument is falsy. **]** */
    /* Codes_SRS_NODE_DEVICE_MQTT_18_019: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `resource` argument is falsy. **]** */
    /* Codes_SRS_NODE_DEVICE_MQTT_18_011: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `properties` argument is falsy. **]** */
    /* Codes_SRS_NODE_DEVICE_MQTT_18_013: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `body` argument is falsy. **]** */
    if (!method || !resource || !properties ||  !body) {
      throw new ReferenceError('required parameter is missing');
    }

    /* Codes_SRS_NODE_DEVICE_MQTT_18_010: [** The `sendTwinRequest` method shall throw an `ArgumentError` if the `method` argument is not a string. **]** */
    /* Codes_SRS_NODE_DEVICE_MQTT_18_020: [** The `sendTwinRequest` method shall throw an `ArgumentError` if the `resource` argument is not a string. **]** */
    if (!util.isString(method) || !util.isString(resource)) {
      throw new errors.ArgumentError('required string parameter is not a string');
    }

    /* Codes_SRS_NODE_DEVICE_MQTT_18_012: [** The `sendTwinRequest` method shall throw an `ArgumentError` if the `properties` argument is not a an object. **]** */
    if (!util.isObject(properties)) {
      throw new errors.ArgumentError('required properties parameter is not an object');
    }

    /* Codes_SRS_NODE_DEVICE_MQTT_18_022: [** The `propertyQuery` string shall be construced from the `properties` object. **]**   */
    let propString = '';
    Object.keys(properties).forEach((key) => {
      /* Codes_SRS_NODE_DEVICE_MQTT_18_018: [** The `sendTwinRequest` method shall throw an `ArgumentError` if any members of the `properties` object fails to serialize to a string **]** */
      if (!util.isString(properties[key]) && !util.isNumber(properties[key]) && !util.isBoolean(properties[key])) {
        throw new errors.ArgumentError('required properties object has non-string properties');
      }

      /* Codes_SRS_NODE_DEVICE_MQTT_18_023: [** Each member of the `properties` object shall add another 'name=value&' pair to the `propertyQuery` string. **]**   */
      propString += (propString === '') ? '?' : '&';
      propString += key + '=' + properties[key];
    });

    /* Codes_SRS_NODE_DEVICE_MQTT_18_021: [** The topic name passed to the publish method shall be $iothub/twin/`method`/`resource`/?`propertyQuery` **]** */
    const topic = '$iothub/twin/' + method + resource + propString;

    this._fsm.handle('sendTwinRequest', topic, body, (err, result) => {
      if (done) done(err, result);
    });
  }

  /**
   * @private
   * @method            module:azure-iot-device-mqtt.Mqtt.Mqtt#sendMethodResponse
   * @description       Sends the response for a device method call to the service.
   *
   * @param {Object}   response     This is the `response` object that was
   *                                produced by the device client object when a
   *                                C2D device method call was received.
   * @param {Function} done         The callback to be invoked when the response
   *                                has been sent to the service.
   *
   * @throws {Error}                If the `response` parameter is falsy or does
   *                                not have the expected shape.
   */
  sendMethodResponse(response: DeviceMethodResponse, done?: (err?: Error, result?: any) => void): void {
    // Codes_SRS_NODE_DEVICE_MQTT_13_001: [ sendMethodResponse shall throw an Error if response is falsy or does not conform to the shape defined by DeviceMethodResponse. ]
    if (!response) {
      throw new Error('Parameter \'response\' is falsy');
    }
    if (!response.requestId) {
      throw new Error('Parameter \'response.requestId\' is falsy');
    }
    if (typeof(response.requestId) !== 'string') {
      throw new Error('Parameter \'response.requestId\' is not a string.');
    }
    if (!response.status) {
      throw new Error('Parameter \'response.status\' is falsy');
    }
    if (typeof(response.status) !== 'number') {
      throw new Error('Parameter \'response.status\' is not a number');
    }

    this._fsm.handle('sendMethodResponse', response, (err) => {
      if (done) {
        done(err);
      }
    });
  }

  /**
   * @private
   * @method          module:azure-iot-device-mqtt.Mqtt#getTwinReceiver
   * @description     Get a receiver object that handles C2D device-twin traffic
   *
   * @param {Function}  done      the callback to be invoked when this function completes.
   *
   * @throws {ReferenceError}   One of the required parameters is falsy
   */
  getTwinReceiver(done?: (err?: Error, receiver?: MqttTwinReceiver) => void): void {
    /* Codes_SRS_NODE_DEVICE_MQTT_18_014: [** The `getTwinReceiver` method shall throw an `ReferenceError` if done is falsy **]**  */
    if (!done) {
      throw new ReferenceError('required parameter is missing');
    }

    this._fsm.handle('getTwinReceiver', done);
  }
}
