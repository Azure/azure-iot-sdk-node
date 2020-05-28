// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import * as machina from 'machina';
import { Client as MqttClient, IClientOptions, IClientPublishOptions, IClientSubscribeOptions } from 'mqtt';
import * as uuid from 'uuid';
import * as dbg from 'debug';
const debug = dbg('azure-iot-mqtt-base:MqttBase');
import { errors, results, SharedAccessSignature, X509 } from 'azure-iot-common';


class OnTheWirePublish {
  enqueuedTimeSecondsSinceEpoch: Number;
  publishCallback: (err?: Error, result?: any) => void;
  identifier: string;
  constructor(enqueuedTimeSecondsSinceEpoch: Number, publishCallback: (err?: Error, result?: any) => void, identifier: string) {
    this.enqueuedTimeSecondsSinceEpoch = enqueuedTimeSecondsSinceEpoch;
    this.publishCallback = publishCallback;
    this.identifier = identifier;
  }
}


/*Codes_SRS_NODE_COMMON_MQTT_BASE_16_004: [The `MqttBase` constructor shall instantiate the default MQTT.JS library if no argument is passed to it.]*/
/*Codes_SRS_NODE_COMMON_MQTT_BASE_16_005: [The `MqttBase` constructor shall use the object passed as argument instead of the default MQTT.JS library if it's not falsy.]*/
/**
 * @private
 */
export class MqttBase extends EventEmitter {
  private mqttProvider: any;
  private _config: MqttBaseTransportConfig;
  private _mqttClient: MqttClient;
  private _fsm: any;
  private _options: any;
  private _publishesOnTheWire: { [uuidKey: string]: OnTheWirePublish };

  constructor(mqttProvider?: any) {
    super();
    this.mqttProvider = mqttProvider ? mqttProvider : require('mqtt');
    this._publishesOnTheWire = {};

    this._fsm = new machina.Fsm({
      namespace: 'mqtt-base',
      initialState: 'disconnected',
      states: {
        disconnected: {
          _onEnter: (callback, err) => {
            debug('In MQTT base FSM - entered onEnter for disconnect');
            //
            // The semantics of this _onEnter for the disconnected state (which is the initial state)
            // is that we got here from another one of the states of this FSM.
            //
            // So there was a disconnection.
            //
            // If there are any outstanding publishes, fail them.  We will never see
            // their acknowledgements (PUBACK).  It is important to acknowledge that
            // the publishes that were "on the wire", might indeed make it to the peer.  We'll
            // never know.  If the code further up the stack retries, we could indeed get
            // duplication of published data.  Nothing we can really do about it.
            //
            this._purgePublishesOnTheWire(err);
            //
            // One of the other states was able to pass along a callback.  Use it to finish up whatever
            // operation the state machine was working on.
            //
            // If there is no callback present, the clear implication is that something pretty major occurred,
            // NOT in the context of any particular operation.  There is NO operation that this error can be reported
            // as a result for.  Hence we emit the 'error' event.
            //
            if (callback) {
              callback(err);
            } else {
              if (err) {
                debug('In mqtt base - no callback for error - emitting \'error\': ' + this._errorDescription(err));
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
                this._fsm.transition('disconnecting', connectCallback, err);
              } else {
                this._mqttClient.on('error', this._errorCallback.bind(this));
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
          _onEnter: (connectCallback, connack) => {
            this._mqttClient.on('close', this._closeCallback.bind(this));
            connectCallback(null, new results.Connected(connack));
          },
          connect: (callback) => callback(null, new results.Connected()),
          disconnect: (callback) => this._fsm.transition('disconnecting', callback),
          publish: (topic, payload, options, callback) => {
            const thisPublishIdentifier = uuid.v4();
            this._publishesOnTheWire[thisPublishIdentifier] = new OnTheWirePublish(Math.floor( Date.now() / 1000 ), callback, thisPublishIdentifier);
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_017: [The `publish` method publishes a `payload` on a `topic` using `options`.]*/
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_021: [The  `publish` method shall call `publish` on the mqtt client object and call the `callback` argument with `null` and the `puback` object if it succeeds.]*/
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_022: [The `publish` method shall call the `callback` argument with an Error if the operation fails.]*/
            this._mqttClient.publish(topic, payload, options, (err, result) => {
              //
              // The publish may have timed out or had an error, we would have already invoked the callback in the timeout code and
              // removed it from the dictionary.
              //
              // No need to try to do that again.
              //
              let current = this._publishesOnTheWire[thisPublishIdentifier];
              if (current) {
                delete this._publishesOnTheWire[thisPublishIdentifier];
                current.publishCallback(err, result);
              }
            });
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
            let switched = false;
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_41_002: [The `updateSharedAccessSignature` method shall trigger a forced disconnect if after 30 seconds the mqtt client has failed to complete a non-forced disconnect.]*/
            /*Codes_SRS_NODE_COMMON_MQTT_BASE_41_003: [The `updateSharedAccessSignature` method shall call the `callback` argument with an `Error` if the operation fails after timing out.]*/
            const disconnectTimeout = setTimeout(() => {
              debug('disconnecting mqtt client timed out. Force disconnecting.');
              switched = true;
              this._fsm.handle('forceDisconnect', callback);
            }, 30000);

            debug('disconnecting mqtt client');
            this._disconnectClient(false, () => {
              clearTimeout(disconnectTimeout);
              if (!switched) {
                debug('mqtt client disconnected - reconnecting');
                this._connectClient((err, connack) => {
                  if (err) {
                    debug('failed to reconnect the client: ' + err.toString());
                    this._fsm.transition('disconnected', callback, err);
                  } else {
                    debug('mqtt client reconnected successfully');
                    this._mqttClient.on('error', this._errorCallback.bind(this));
                    this._fsm.transition('connected', callback, connack);
                  }
                });
              }
            });
          },
          forceDisconnect: (callback) => {
            debug('force disconnecting mqtt client');
            this._disconnectClient(true, () => {
              debug('mqtt client disconnected - reconnecting');
              this._connectClient((err, connack) => {
                if (err) {
                  debug('failed to reconnect the client: ' + err.toString());
                  this._fsm.transition('disconnected', callback, err);
                } else {
                  debug('mqtt client reconnected successfully');
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

      /*Codes_SRS_NODE_COMMON_MQTT_BASE_41_001: [The `connect` method shall set the `keepalive` option based on the `keepalive` numeric value passed in the `options` structure via the `setOptions` function.]*/
      if (this._options.keepalive) {
        options.keepalive = this._options.keepalive;
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
        debug(' error supplied is: ' + this._errorDescription(error));
        const err = error || new errors.NotConnectedError('Unable to establish a connection');
        callback(err);
      };
    };
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_003: [The `connect` method shall call the `done` callback with a standard javascript `Error` object if the connection failed.]*/
    const errorCallback = createErrorCallback('error');
    const closeCallback = createErrorCallback('close');
    const offlineCallback = createErrorCallback('offline');
    const disconnectCallback = createErrorCallback('disconnect');

    this._mqttClient = this.mqttProvider.connect(this._config.uri, options);
    this._mqttClient.on('message', this._messageCallback.bind(this));
    this._mqttClient.on('error', errorCallback);
    this._mqttClient.on('close', closeCallback);
    this._mqttClient.on('offline', offlineCallback);
    this._mqttClient.on('disconnect', disconnectCallback);

    this._mqttClient.on('connect', (connack) => {
      debug('Device is connected');
      debug('CONNACK: ' + JSON.stringify(connack));

      this._mqttClient.removeListener('error', errorCallback);
      this._mqttClient.removeListener('close', closeCallback);
      this._mqttClient.removeListener('offline', offlineCallback);
      this._mqttClient.removeListener('disconnect', disconnectCallback);

      callback(null, connack);
    });
  }

  private _disconnectClient(forceDisconnect: boolean, callback: () => void): void {
    debug('removing all listeners');
    this._mqttClient.removeAllListeners();
    debug('adding null error listener');
    this._mqttClient.on('error', this._nullErrorCallback);
    /* Codes_SRS_NODE_COMMON_MQTT_BASE_16_001: [The disconnect method shall call the done callback when the connection to the server has been closed.] */
    this._mqttClient.end(forceDisconnect, callback);
  }

  private _purgePublishesOnTheWire(err?: Error): void {
    const errorForPurgedPublish = err || new errors.NotConnectedError('Connect was lost');
    const existingPublishes = this._publishesOnTheWire;
    this._publishesOnTheWire = {};
    Object.keys(existingPublishes).forEach((messageIdentifier: string): void => {
      existingPublishes[messageIdentifier].publishCallback(errorForPurgedPublish);
    });
  }

  private _errorCallback(err: Error): void {
    debug('In base mqtt - error event received from mqtt.js client - error is: ' + this._errorDescription(err));
    this._fsm.transition('disconnecting', null, err);
  }

  private _closeCallback(): void {
    debug('In base mqtt - close event received from mqtt.js client - no error');
    this._fsm.handle('closeEvent');
  }

  private _nullErrorCallback(): void {
    return;
  }

  private _errorDescription(err?: Error): string {
    return (
      (err) ?
        (
          ((err as any).code) ||
          ((err as any).name) ||
          ((err as any).message) ||
          ('An error with no description')
        ) :
        ('no error supplied')
    );
  }

  private _messageCallback(topic: string, payload: any): void {
    process.nextTick(() => {
      this.emit('message', topic, payload);
    });
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
