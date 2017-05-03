// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as querystring from 'querystring';
import { Client as MqttClient } from 'mqtt';
import { MqttReceiver } from './mqtt_receiver';
import * as dbg from 'debug';
const debug = dbg('mqtt-common');
import { errors, results, endpoint, Message } from 'azure-iot-common';
import { ClientConfig } from 'azure-iot-device';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

/**
 * @class           module:azure-iot-device-mqtt.MqttBase
 * @classdesc       Base MQTT transport implementation used by higher-level IoT Hub libraries.
 *                  You generally want to use these higher-level objects (such as [azure-iot-device-mqtt.Mqtt]{@link module:azure-iot-device-mqtt.Mqtt})
 *                  rather than this one.
 *
 * @param {Object}  config      The configuration object derived from the connection string.
 */
/*Codes_SRS_NODE_COMMON_MQTT_BASE_16_004: [The `MqttBase` constructor shall instanciate the default MQTT.JS library if no argument is passed to it.]*/
/*Codes_SRS_NODE_COMMON_MQTT_BASE_16_005: [The `MqttBase` constructor shall use the object passed as argument instead of the default MQTT.JS library if it's not falsy.]*/
export class MqttBase {
  // should be private but isn't because it's used in mqtt.ts
  client: MqttClient;

  private mqttprovider: any;
  private _options: any;
  private _receiver: any;
  private _topicTelemetryPublish: string;
  private _topicMessageSubscribe: string;

  constructor(mqttprovider?: any) {
    this.mqttprovider = mqttprovider ? mqttprovider : require('mqtt');
  }

  /**
   * @method            module:azure-iot-device-mqtt.MqttBase#connect
   * @description       Establishes a secure connection to the IoT Hub instance using the MQTT protocol.
   *
   * @param {Function}  done  Callback that shall be called when the connection is established.
   */
  connect(config: ClientConfig, done: (err?: Error, result?: any) => void): void {
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_006: [The `connect` method shall throw a ReferenceError if the config argument is falsy, or if one of the following properties of the config argument is falsy: deviceId, host, and one of sharedAccessSignature or x509.cert and x509.key.]*/
    if ((!config) ||
      (!config.host) ||
      (!config.deviceId) ||
      (!config.sharedAccessSignature && (!config.x509 || !config.x509.cert || !config.x509.key))) {
      throw new ReferenceError('Invalid transport configuration');
    }

    this._receiver = null;
    const uri = (<any>config).uri || 'mqtts://' + config.host;
    this._topicTelemetryPublish = 'devices/' + config.deviceId + '/messages/events/';
    this._topicMessageSubscribe = 'devices/' + config.deviceId + '/messages/devicebound/#';
    debug('topic publish: ' + this._topicTelemetryPublish);
    debug('topic subscribe: ' + this._topicMessageSubscribe);
    const versionString = encodeURIComponent('azure-iot-device/' + packageJson.version);

    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_002: [The `connect` method shall use the authentication parameters contained in the `config` argument to connect to the server.]*/
    this._options = {
      cmd: 'connect',
      protocolId: 'MQTT',
      protocolVersion: 4,
      clean: false,
      clientId: config.deviceId,
      rejectUnauthorized: true,
      username: config.host + '/' + config.deviceId +
                '/DeviceClientType=' + versionString +
                '&' + endpoint.versionQueryString().substr(1),
      reconnectPeriod: 0,  // Client will handle reconnection at the higher level.
      /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_016: [The `connect` method shall configure the `keepalive` ping interval to 3 minutes by default since the Azure Load Balancer TCP Idle timeout default is 4 minutes.]*/
      keepalive: 180,
      reschedulePings: false
    };

    if (config.sharedAccessSignature) {
      this._options.password = new Buffer(config.sharedAccessSignature.toString());
      debug('username: ' + this._options.username);
      debug('uri:      ' + uri);
    } else {
      this._options.cert = config.x509.cert;
      this._options.key = config.x509.key;
      this._options.passphrase = config.x509.passphrase;
    }

    this.client = this.mqttprovider.connect(uri, this._options);
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_007: [The `connect` method shall not throw if the `done` argument has not been passed.]*/
    if (done) {
      const self = this;

      const errCallback = (error) => {
        const err = error || new errors.NotConnectedError('Unable to establish a connection');
        self.client.removeListener('close', errCallback);
        self.client.removeListener('offline', errCallback);
        self.client.removeListener('disconnect', errCallback);
        self.client.removeListener('error', errCallback);
        done(err);
      };

      /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_003: [The `connect` method shall call the `done` callback with a standard javascript `Error` object if the connection failed.]*/
      self.client.on('error', errCallback);
      self.client.on('close', errCallback);
      self.client.on('offline', errCallback);
      self.client.on('disconnect', errCallback);

      self.client.on('connect', (connack) => {
        debug('Device is connected');
        debug('CONNACK: ' + JSON.stringify(connack));

        self.client.removeListener('close', errCallback);
        self.client.removeListener('offline', errCallback);
        self.client.removeListener('disconnect', errCallback);

        self.client.on('close', () => {
          debug('Device connection to the server has been closed');
          self._receiver = null;
        });

        /*Codes_SRS_NODE_COMMON_MQTT_BASE_12_005: [The `connect` method shall call connect on MQTT.JS  library and call the `done` callback with a `null` error object and the result as a second argument.]*/
        done(null, connack);
      });
    }
  }

  /**
   * @method            module:azure-iot-device-mqtt.MqttBase#disconnect
   * @description       Terminates the connection to the IoT Hub instance.
   *
   * @param {Function}  done      Callback that shall be called when the connection is terminated.
   */
  disconnect(done: (err?: Error, result?: any) => void): void {
    this.client.removeAllListeners();
    // The first parameter decides whether the connection should be forcibly closed without waiting for all sent messages to be ACKed.
    // This should be a transport-specific parameter.
    /* Codes_SRS_NODE_HTTP_16_001: [The disconnect method shall call the done callback when the connection to the server has been closed.] */
    this.client.end(false, done);
  }

  /**
   * @method            module:azure-iot-device-mqtt.MqttBase#publish
   * @description       Publishes a message to the IoT Hub instance using the MQTT protocol.
   *
   * @param {Object}    message   Message to send to the IoT Hub instance.
   * @param {Function}  done      Callback that shall be called when the connection is established.
   */
  /* Codes_SRS_NODE_HTTP_12_006: The PUBLISH method shall throw ReferenceError “Invalid message” if the message is falsy */
  /* Codes_SRS_NODE_HTTP_12_007: The PUBLISH method shall call publish on MQTT.JS library with the given message */
  publish(message: Message, done: (err?: Error, result?: any) => void): void {
    if (!message) {
      throw new ReferenceError('Invalid message');
    }

    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_008: [The `publish` method shall use a topic formatted using the following convention: `devices/<deviceId>/messages/events/`.]*/
    let topic = this._topicTelemetryPublish;

    let systemProperties: { [key: string]: string } = {};

    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_011: [The `publish` method shall serialize the `messageId` property of the message as a key-value pair on the topic with the key `$.mid`.]*/
    if (message.messageId) systemProperties['$.mid'] = message.messageId;
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_012: [The `publish` method shall serialize the `correlationId` property of the message as a key-value pair on the topic with the key `$.cid`.]*/
    if (message.correlationId) systemProperties['$.cid'] = message.correlationId;
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_013: [The `publish` method shall serialize the `userId` property of the message as a key-value pair on the topic with the key `$.uid`.]*/
    if (message.userId) systemProperties['$.uid'] = message.userId;
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_014: [The `publish` method shall serialize the `to` property of the message as a key-value pair on the topic with the key `$.to`.]*/
    if (message.to) systemProperties['$.to'] = message.to;
    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_015: [The `publish` method shall serialize the `expiryTimeUtc` property of the message as a key-value pair on the topic with the key `$.exp`.]*/
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

    /*Codes_SRS_NODE_COMMON_MQTT_BASE_16_010: [** The `publish` method shall use QoS level of 1.]*/
    this.client.publish(topic, message.data.toString(), { qos: 1, retain: false }, (err, puback) => {
      if (done) {
        if (err) {
          done(err);
        } else {
          debug('PUBACK: ' + JSON.stringify(puback));
          done(null, new results.MessageEnqueued(puback));
        }
      }
    });
  }

  /**
   * @method              module:azure-iot-device-mqtt.MqttBase#getReceiver
   * @description         Gets a receiver object that is used to receive and settle messages.
   *
   * @param {Function}    done   callback that shall be called with a receiver object instance.
   */
  /*Codes_SRS_NODE_DEVICE_MQTT_BASE_16_002: [If a receiver for this endpoint has already been created, the getReceiver method should call the done() method with the existing instance as an argument.] */
  /*Codes_SRS_NODE_DEVICE_MQTT_BASE_16_003: [If a receiver for this endpoint doesn’t exist, the getReceiver method should create a new MqttReceiver object and then call the done() method with the object that was just created as an argument.] */
  getReceiver(done: (err?: Error, receiver?: MqttReceiver) => void): void {
    if (!this._receiver) {
      this._receiver = new MqttReceiver(
        this.client,
        this._topicMessageSubscribe
      );
    }

    done(null, this._receiver);
  }
}
