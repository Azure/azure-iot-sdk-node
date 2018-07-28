// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import * as machina from 'machina';
import { Client as MqttClient, IClientOptions, IClientPublishOptions, IClientSubscribeOptions } from 'mqtt';
import * as dbg from 'debug';
const debug = dbg('azure-iot-mqtt-base:MqttBase');
import { errors, results, SharedAccessSignature, X509 } from 'azure-iot-common';

/*Codes_SRS_NODE_COMMON_MQTT_BASE_16_004: [The `MqttBase` constructor shall instanciate the default MQTT.JS library if no argument is passed to it.]*/
/*Codes_SRS_NODE_COMMON_MQTT_BASE_16_005: [The `MqttBase` constructor shall use the object passed as argument instead of the default MQTT.JS library if it's not falsy.]*/
/**
 * @private
 */
export class MqttBase extends EventEmitter {
  private mqttprovider: any;
  private _config: MqttBaseTransportConfig;
  private _mqttClient: MqttClient;
  private _fsm: any;
  private _options: any;
  private _closeEventFsmHandler: () => void;
  private _errorEventFsmHandler: (err?: Error) => void;
  private _messageEventFsmHandler: (topic: string, payload: any) => void;

  constructor(mqttprovider?: any) {
    super();
    this.mqttprovider = mqttprovider ? mqttprovider : require('mqtt');
    this._messageEventFsmHandler = (topic, payload) => {
      process.nextTick(() => {
        this.emit('message', topic, payload);
      });
    };

    this._closeEventFsmHandler = () => {
      this._fsm.handle('closeEvent');
    };

    this._errorEventFsmHandler = (err) => {
      this._fsm.handle('errorEvent', err);
    };

    this._fsm = new machina.Fsm({
      namespace: 'mqtt-base',
      initialState: 'disconnected',
      states: {
        disconnected: {
          _onEnter: (callback, err) => {
            if (this._mqttClient) {
              this._mqttClient.removeAllListeners();
              this._mqttClient = undefined;
            }

            if (callback) {
              callback(err);
            } else {
              if (err) {
                this.emit('error', err);
              }
            }
          },
          connect: (callback) => this._fsm.transition('connecting', callback),
          disconnect: (callback) => callback(),
          /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_020: [The `publish` method shall call the callback with a `NotConnectedError` if the connection hasn't been established prior to calling `publish`.]*/
          publish: (topic, payload, options, callback) => callback(new errors.NotConnectedError()),
          /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_026: [The `subscribe` method shall call the callback with a `NotConnectedError` if the connection hasn't been established prior to calling `publish`.]*/
          subscribe: (topic, options, callback) => callback(new errors.NotConnectedError()),
          /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_027: [The `unsubscribe` method shall call the callback with a `NotConnectedError` if the connection hasn't been established prior to calling `publish`.]*/
          unsubscribe: (topic, callback) => callback(new errors.NotConnectedError()),
          updateSharedAccessSignature: (callback) => {
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_034: [The `updateSharedAccessSignature` method shall not trigger any network activity if the mqtt client is not connected.]*/
            debug('updating shared access signature while disconnected');
            callback();
          }
        },
        connecting: {
          _onEnter: (connectCallback) => {
            this._connectClient((err, connack) => {
              if (err) {
                this._fsm.transition('disconnected', connectCallback, err);
              } else {
                this._fsm.transition('connected', connectCallback, connack);
              }
            });
          },
          disconnect: (callback) => {
            this._fsm.transition('disconnecting', callback);
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        connected: {
          _onEnter: (connectCallback, conack) => {
            connectCallback(null, new results.Connected(conack));
          },
          connect: (callback) => callback(null, new results.Connected()),
          disconnect: (callback) => this._fsm.transition('disconnecting', callback),
          publish: (topic, payload, options, callback) => {
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_017: [The `publish` method publishes a `payload` on a `topic` using `options`.]*/
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_021: [The  `publish` method shall call `publish` on the mqtt client object and call the `callback` argument with `null` and the `puback` object if it succeeds.]*/
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_022: [The `publish` method shall call the `callback` argument with an Error if the operation fails.]*/
            this._mqttClient.publish(topic, payload, options, callback);
          },
          subscribe: (topic, options, callback) => {
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_12_008: [The `subscribe` method shall call `subscribe`  on MQTT.JS  library and pass it the `topic` and `options` arguments.]*/
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_024: [The `subscribe` method shall call the callback with `null` and the `suback` object if the mqtt library successfully subscribes to the `topic`.]*/
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_025: [The `subscribe` method shall call the callback with an `Error` if the mqtt library fails to subscribe to the `topic`.]*/
            this._mqttClient.subscribe(topic, options, callback);
          },
          unsubscribe: (topic, callback) => {
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_028: [The `unsubscribe` method shall call `unsubscribe` on the mqtt library and pass it the `topic`.]*/
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_029: [The `unsubscribe` method shall call the `callback` argument with no arguments if the operation succeeds.]*/
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_030: [The `unsubscribe` method shall call the `callback` argument with an `Error` if the operation fails.]*/
            this._mqttClient.unsubscribe(topic, callback);
          },
          updateSharedAccessSignature: (callback) => {
            this._fsm.transition('reconnecting', callback);
          },
          closeEvent: () => {
            this._fsm.transition('disconnected', undefined, new errors.NotConnectedError('Connection to the server has been closed.'));
          },
          errorEvent: (err) => {
            this._fsm.transition('disconnected', undefined, err);
          }
        },
        disconnecting: {
          _onEnter: (disconnectCallback, err) => {
            this._disconnectClient(!!err, () => {
              this._fsm.transition('disconnected', disconnectCallback, err);
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        reconnecting: {
          _onEnter: (callback) => {
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_033: [The `updateSharedAccessSignature` method shall disconnect and reconnect the mqtt client with the new `sharedAccessSignature`.]*/
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_035: [The `updateSharedAccessSignature` method shall call the `callback` argument with no parameters if the operation succeeds.]*/
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_036: [The `updateSharedAccessSignature` method shall call the `callback` argument with an `Error` if the operation fails.]*/
            debug('disconnecting MQTT client');
            this._disconnectClient(false, () => {
              debug('reconnecting MQTT client');
              this._connectClient((err, connack) => {
                if (err) {
                  debug('Could not reconnect MQTT client');
                  this._fsm.transition('disconnected', callback, err);
                } else {
                  debug('MQTT client reconnected');
                  this._fsm.transition('connected', callback, connack);
                }
              });
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        }
      }
    });

    this._fsm.on('transition', (data) => {
      debug(data.fromState + ' -> ' + data.toState + ' (' + data.action + ')');
    });
  }

  connect(config: MqttBaseTransportConfig, done: (err?: Error, result?: any) => void): void {
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_006: [The `connect` method shall throw a ReferenceError if the config argument is falsy, or if one of the following properties of the config argument is falsy: uri, clientId, username, and one of sharedAccessSignature or x509.cert and x509.key.]*/
    if ((!config) ||
      (!config.uri) ||
      (!config.clientId) ||
      (!config.username) ||
      (!config.sharedAccessSignature && (!config.x509 || !config.x509.cert || !config.x509.key))) {
      throw new ReferenceError('Invalid transport configuration');
    }

    this._config = config;
    this._fsm.handle('connect', done);
  }

  disconnect(done: (err?: Error, result?: any) => void): void {
    this._fsm.handle('disconnect', done);
  }

  publish(topic: string, payload: any, options: IClientPublishOptions, done: (err?: Error, result?: any) => void): void {
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_018: [The `publish` method shall throw a `ReferenceError` if the topic is falsy.]*/
    if (!topic) {
      throw new ReferenceError('Invalid topic');
    }

    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_019: [The `publish` method shall throw a `ReferenceError` if the payload is falsy.]*/
    if (!payload) {
      throw new ReferenceError('Invalid payload');
    }

    this._fsm.handle('publish', topic, payload, options, done);
  }

  subscribe(topic: string, options: IClientSubscribeOptions, callback: (err?: Error, result?: any) => void): void {
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_023: [The `subscribe` method shall throw a `ReferenceError` if the topic is falsy.]*/
    if (!topic) {
      throw new ReferenceError('Topic cannot be \'' + topic + '\'');
    }

    this._fsm.handle('subscribe', topic, options, callback);
  }

  unsubscribe(topic: string, callback: (err?: Error, result?: any) => void): void {
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_031: [The `unsubscribe` method shall throw a `ReferenceError` if the `topic` argument is falsy.]*/
    if (!topic) {
      throw new ReferenceError('Topic cannot be \'' + topic + '\'');
    }

    this._fsm.handle('unsubscribe', topic, callback);
  }

  updateSharedAccessSignature(sharedAccessSignature: string, callback: (err?: Error) => void): void {
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_032: [The `updateSharedAccessSignature` method shall throw a `ReferenceError` if the `sharedAccessSignature` argument is falsy.]*/
    if (!sharedAccessSignature) {
      throw new ReferenceError('sharedAccessSignature cannot be \'' + sharedAccessSignature + '\'');
    }
    this._config.sharedAccessSignature = sharedAccessSignature;
    this._fsm.handle('updateSharedAccessSignature', callback);
  }

  /**
   * @private
   */
  setOptions(options: any): void {
    this._options = options;
  }

  private _connectClient(callback: (err?: Error, connack?: any) => void): void {
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_002: [The `connect` method shall use the authentication parameters contained in the `config` argument to connect to the server.]*/
    let options: IClientOptions = {
      protocolId: 'MQTT',
      protocolVersion: 4,
      clean: this._config.clean || false,
      clientId: this._config.clientId,
      rejectUnauthorized: true,
      username: this._config.username,
      reconnectPeriod: 0,  // Client will handle reconnection at the higher level.
      /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_016: [The `connect` method shall configure the `keepalive` ping interval to 3 minutes by default since the Azure Load Balancer TCP Idle timeout default is 4 minutes.]*/
      keepalive: 180,
      reschedulePings: false
    };

    /*Codes_SRS_NODE_COMMON_MQTT_BASE_18_001: [The `connect` method shall set the `ca` option based on the `ca` string passed in the `options` structure via the `setOptions` function.]*/
    if (this._options) {
      if (this._options.ca) {
        options.ca = this._options.ca;
      }
      /*Codes_SRS_NODE_COMMON_MQTT_BASE_18_002: [The `connect` method shall set the `wsOptions.agent` option based on the `mqtt.webSocketAgent` object passed in the `options` structure via the `setOptions` function.]*/
      if (this._options.mqtt && this._options.mqtt.webSocketAgent) {
        options.wsOptions = {
          agent: this._options.mqtt.webSocketAgent
        };
      }
    }
    if (this._config.sharedAccessSignature) {
      options.password = this._config.sharedAccessSignature.toString();
      debug('username: ' + options.username);
      debug('uri:      ' + this._config.uri);
    } else {
      options.cert = this._config.x509.cert;
      options.key = this._config.x509.key;
      (<any>options).passphrase = this._config.x509.passphrase; // forced to cast to any because passphrase is used by tls options but not surfaced by the types definition.
    }

    const createErrorCallback = (eventName) => {
      return (error) => {
        debug('received \'' + eventName + '\' from mqtt client');
        const err = error || new errors.NotConnectedError('Unable to establish a connection: ' + eventName + ' event received.');
        callback(err);
      };
    };
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_003: [The `connect` method shall call the `done` callback with a standard javascript `Error` object if the connection failed.]*/
    const connectingErrorCallback = createErrorCallback('error');
    const connectingCloseCallback = createErrorCallback('close');
    const connectingOfflineCallback = createErrorCallback('offline');
    const connectingDisconnectCallback = createErrorCallback('disconnect');

    this._mqttClient = this.mqttprovider.connect(this._config.uri, options);
    this._mqttClient.on('message', this._messageEventFsmHandler);
    this._mqttClient.on('error', connectingErrorCallback);
    this._mqttClient.on('close', connectingCloseCallback);
    this._mqttClient.on('offline', connectingOfflineCallback);
    this._mqttClient.on('disconnect', connectingDisconnectCallback);

    this._mqttClient.once('connect', (connack) => {
      debug('Device is connected');
      debug('CONNACK: ' + JSON.stringify(connack));

      this._mqttClient.on('error', this._errorEventFsmHandler);
      this._mqttClient.on('close', this._closeEventFsmHandler);
      this._mqttClient.on('offline', this._closeEventFsmHandler);
      this._mqttClient.on('disconnect', this._closeEventFsmHandler);
      this._mqttClient.removeListener('close', connectingCloseCallback);
      this._mqttClient.removeListener('offline', connectingOfflineCallback);
      this._mqttClient.removeListener('disconnect', connectingDisconnectCallback);
      this._mqttClient.removeListener('error', connectingErrorCallback);

      callback(null, connack);
    });
  }

  private _disconnectClient(forceDisconnect: boolean, callback: () => void): void {
    /* Codes_SRS_NODE_COMMON_MQTT_BASE_16_001: [The disconnect method shall call the done callback when the connection to the server has been closed.] */
    let oldMqttClient = this._mqttClient;
    this._mqttClient = undefined;

    const oldMqttClientErrorHandler = (err) => debug('BUG? received an error on an MQTT client that is already being closed, ignoring it: ' + err.toString());

      // close is the event that indicates the end of the TCP connection, no chance to get a packet or an error after that.
      // if forceDisconnect is set to true, we already received an error, so the socket is already closed and we won't receive a close event.
    if (!forceDisconnect) {
      oldMqttClient.on('error', oldMqttClientErrorHandler);
      oldMqttClient.once('close', () => {
        debug('old MQTT client closed - removing the last error handler');
        oldMqttClient.removeListener('error', oldMqttClientErrorHandler);
        oldMqttClient = undefined;
      });
    }

    oldMqttClient.removeListener('disconnect', this._closeEventFsmHandler);
    oldMqttClient.removeListener('offline', this._closeEventFsmHandler);
    oldMqttClient.removeListener('close', this._closeEventFsmHandler);
    oldMqttClient.removeListener('message', this._messageEventFsmHandler);
    oldMqttClient.removeListener('error', this._errorEventFsmHandler);

    oldMqttClient.end(forceDisconnect, callback);
  }
}

  /**
   * @private
   */
export interface MqttBaseTransportConfig {
  sharedAccessSignature?: string | SharedAccessSignature;
  clientId: string;
  x509?: X509;
  username: string;
  clean?: boolean;
  uri: string;
}
