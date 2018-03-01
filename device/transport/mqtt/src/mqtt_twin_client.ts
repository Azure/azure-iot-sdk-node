// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { TwinProperties } from 'azure-iot-device';
import { MqttBase, translateError } from 'azure-iot-mqtt-base';
import * as querystring from 'querystring';
import * as url from 'url';
import * as uuid from 'uuid';
import * as machina from 'machina';
import * as dbg from 'debug';
const debug = dbg('azure-iot-device-mqtt:MqttTwinClient');

// $iothub/twin/PATCH/properties/reported/?$rid={request id}&$version={base version}

/* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_009: [** The subscribed topic for `response` events shall be '$iothub/twin/res/#' **]** */
const responseTopic = '$iothub/twin/res/#';

/* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_019: [** The subscribed topic for post events shall be $iothub/twin/PATCH/properties/desired/# **]** */
const desiredPropertiesUpdatesTopic = '$iothub/twin/PATCH/properties/desired/#';

interface TopicSubscription {
  mqttClient: MqttBase;
  topic: string;
}

/**
 * @private
 * @class        module:azure-iot-device-mqtt.MqttTwinReceiver
 * @classdesc    Acts as a receiver for device-twin traffic
 *
 * @param {Object} config   configuration object
 * @fires MqttTwinReceiver#subscribed   an MQTT topic has been successfully subscribed to
 * @fires MqttTwinReceiver#error    an error has occured while subscribing to an MQTT topic
 * @fires MqttTwinReceiver#response   a response message has been received from the service
 * @fires MqttTwinReceiver#post a post message has been received from the service
 * @throws {ReferenceError} If client parameter is falsy.
 *
 */
export class MqttTwinClient extends EventEmitter {
  static desiredPropertiesUpdateEvent: string = 'twinDesiredPropertiesUpdate';

  private _mqtt: MqttBase;
  private _pendingTwinRequests: { [key: string]: any } = {};
  private _topicFsm: machina.BehavioralFsm;
  private _responseTopic: TopicSubscription;
  private _desiredPropertiesUpdatesTopic: TopicSubscription;

  constructor(client: MqttBase) {
    super();
    /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_18_001: [The `MqttTwinClient` constructor shall accept a `client` object.]*/
    this._mqtt = client;

    const messageHandler = this._onMqttMessage.bind(this);

    /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_001: [The `MqttTwinClient` constructor shall immediately subscribe to the `message` event of the `client` object.]*/
    this._mqtt.on('message', messageHandler);

    this._topicFsm = new machina.BehavioralFsm({
      initialState: 'unsubscribed',
      states: {
        unsubscribed: {
          _onEnter: function (topicSubscription: TopicSubscription, err: Error, callback: (err?: Error) => void): void {
            if (callback) {
              callback(err);
            }
          },
          subscribe: function (topicSubscription: TopicSubscription, callback: (err?: Error) => void): void {
            this.transition(topicSubscription, 'subscribing', callback);
          },
          unsubscribe: function (topicSubscription: TopicSubscription, callback: (err?: Error) => void): void {
            // not entirely sure about that. if subscription are restored because cleanSession is false, it means technically a user may want to unsubscribe
            // even though subscribe hasn't been called yet.
            callback();
          }
        },
        subscribing: {
          _onEnter: function (topicSubscription: TopicSubscription, callback: (err?: Error) => void): void {
            topicSubscription.mqttClient.subscribe(topicSubscription.topic, { qos: 0 }, (err, result) => {
              if (err) {
                this.transition(topicSubscription, 'unsubscribed', err, callback);
              } else {
                debug('subscribed to response topic: ' + JSON.stringify(result));
                this.transition(topicSubscription, 'subscribed', callback);
              }
            });
          },
          '*': function (topicSubscription: TopicSubscription): void { this.deferUntilTransition(topicSubscription); }
        },
        subscribed: {
          _onEnter: function (topicSubscription: TopicSubscription, callback: (err?: Error) => void): void {
            callback();
          },
          subscribe: function (topicSubscription: TopicSubscription, callback: (err?: Error) => void): void {
            callback();
          },
          unsubscribe: function (topicSubscription: TopicSubscription, callback: (err?: Error) => void): void {
            this.transition(topicSubscription, 'unsubscribing', callback);
          }
        },
        unsubscribing: {
          _onEnter: function (topicSubscription: TopicSubscription, callback: (err?: Error) => void): void {
            topicSubscription.mqttClient.unsubscribe(topicSubscription.topic, (err, result) => {
              if (err) {
                debug('failed to unsubscribe: ' + err.toString());
              } else {
                debug('unsubscribed from: ' + topicSubscription.topic);
              }
              this.transition(topicSubscription, 'unsubscribed', err, callback);
            });
          },
          '*': function (topicSubscription: TopicSubscription): void { this.deferUntilTransition(topicSubscription); }
        }
      },
      subscribe: function (topicSubscription: TopicSubscription, callback: (err?: Error) => void): void {
        this.handle(topicSubscription, 'subscribe', callback);
      },
      unsubscribe: function (topicSubscription: TopicSubscription, callback: (err?: Error) => void): void {
        this.handle(topicSubscription, 'unsubscribe', callback);
      }
    });

    this._responseTopic = {
      mqttClient: this._mqtt,
      topic: responseTopic
    };

    this._desiredPropertiesUpdatesTopic = {
      mqttClient: this._mqtt,
      topic: desiredPropertiesUpdatesTopic
    };
  }

  getTwin(callback: (err?: Error, twin?: TwinProperties) => void): void {
    /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_002: [The `getTwin` method shall subscribe to the `$iothub/twin/res/#` topic if not already subscribed.]*/
    this._topicFsm.subscribe(this._responseTopic, (err) => {
      if (err) {
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_009: [If subscribing to the response topic fails, the callback shall be called with the translated version of the error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
        callback(translateError(err));
      } else {
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_003: [The `getTwin` method shall publish the request message on the `$iothub/twin/get/?rid=<requestId>` topic using the `MqttBase.publish` method.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_006: [The request message published by the `getTwin` method shall have an empty body.]*/
        this._sendTwinRequest('GET', '/', ' ', callback);
      }
    });
  }

  updateTwinReportedProperties(patch: any, callback: (err?: Error) => void): void {
    /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_011: [The `updateTwinReportedProperties` method shall subscribe to the `$iothub/twin/res/#` topic if not already subscribed.]*/
    this._topicFsm.subscribe(this._responseTopic, (err) => {
      if (err) {
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_012: [If subscribing to the response topic fails, the callback shall be called with the translated version of the error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
        callback(translateError(err));
      } else {
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_013: [The `updateTwinReportedProperties` method shall publish the request message on the `$iothub/twin/patch/properties/reported/?rid=<requestId>` topic using the `MqttBase.publish` method.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_016: [The body of the request message published by the `updateTwinReportedProperties` method shall be a JSON string of the reported properties patch.]*/
        this._sendTwinRequest('PATCH', '/properties/reported/', JSON.stringify(patch), callback);
      }
    });
  }

  enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void {
    /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_019: [The `enableTwinDesiredPropertiesUpdates` shall subscribe to the `$iothub/twin/PATCH/properties/desired/#` topic using the `MqttBase.subscribe` method if it hasn't been subscribed to already.]*/
    this._topicFsm.subscribe(this._desiredPropertiesUpdatesTopic, (err, suback) => {
      if (err) {
        debug('failed to subscribe to desired properties updates: ' + err.toString());
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_021: [if subscribing fails with an error the `enableTwinDesiredPropertiesUpdates` shall call its callback with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
        callback(translateError(err));
      } else {
        debug('suback: ' + JSON.stringify(suback));
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_020: [The `enableTwinDesiredPropertiesUpdates` shall call its callback with no arguments if the subscription is successful.]*/
        callback();
      }
    });
  }

  disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void {
    /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_022: [The `disableTwinDesiredPropertiesUpdates` shall unsubscribe from the `$iothub/twin/PATCH/properties/desired/#` topic using the `MqttBase.unsubscribe` method if it hasn't been unsubscribed from already.]*/
    this._topicFsm.unsubscribe(this._desiredPropertiesUpdatesTopic, (err, suback) => {
      if (err) {
        debug('failed to subscribe to desired properties updates: ' + err.toString());
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_024: [if unsubscribing fails with an error the `disableTwinDesiredPropertiesUpdates` shall call its callback with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
        callback(translateError(err));
      } else {
        debug('suback: ' + JSON.stringify(suback));
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_023: [The `disableTwinDesiredPropertiesUpdates` shall call its callback with no arguments if the unsubscription is successful.]*/
        callback();
      }
    });
  }

  private _sendTwinRequest(method: string, resource: string, body: any, callback?: (err?: Error, result?: any) => void): void {
    /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_005: [The `requestId` property in the topic querystring should be set to a unique identifier that will be used to identify the response later on.]*/
    /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_015: [The `requestId` property in the topic querystring should be set to a unique identifier that will be used to identify the response later on.]*/
    const requestId = uuid.v4();
    let propString = '?$rid=' + requestId;

    const topic = '$iothub/twin/' + method + resource + propString;

    this._pendingTwinRequests[requestId] = callback;

    /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_004: [The `getTwin` method shall publish the request message with QoS=0, DUP=0 and Retain=0.]*/
    /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_014: [The `updateTwinReportedProperties` method shall publish the request message with QoS=0, DUP=0 and Retain=0.]*/
    this._mqtt.publish(topic, body.toString(), { qos: 0, retain: false }, (err, puback) => {
      if (err) {
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_008: [If an error happen while publishing the request message, the `callback` shall be called with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_018: [If an error happen while publishing the request message, the `callback` shall be called with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
        delete this._pendingTwinRequests[requestId];
        callback(translateError(err));
      } else {
        debug('twin request sent: ' + puback);
      }
    });
  }

  private _onMqttMessage(topic: string, message: any): void {
    debug('mqtt message received');
    if (topic.indexOf('$iothub/twin/res') === 0) {
      debug('response message received');
      this._onResponseMessage(topic, message);
    } else if (topic.indexOf('$iothub/twin/PATCH/properties/desired') === 0) {
      /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_025: [Once the desired properties update topic has been subscribed to the `MqttTwinClient` shall emit a `twinDesiredPropertiesUpdate` event for messages received on that topic.]*/
      /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_026: [The argument of the `twinDesiredPropertiesUpdate` event emitted shall be the object parsed from the JSON string contained in the received message.]*/
      this.emit(MqttTwinClient.desiredPropertiesUpdateEvent, JSON.parse(message));
    } else {
      debug('Message received on a topic we can ignore: ' + topic);
    }
  }

  private _onResponseMessage(topic: string, message: any): void {
    let urlObject: url.Url;
    let path: string[];
    let query: any;

    try {
      urlObject = url.parse(topic);
      path = urlObject.path.split('/');
      query = querystring.parse(urlObject.query as string);
    } catch (err) {
      return;
    }

    if ((path[0] === '$iothub') &&
        (path[1] === 'twin') &&
        (path[2] === 'res') &&
        (path[3]) &&
        (path[3].toString().length > 0) &&
        (query.$rid) &&
        (query.$rid.toString().length > 0)) {
      if (this._pendingTwinRequests[query.$rid]) {
        const requestCallback = this._pendingTwinRequests[query.$rid];
        delete this._pendingTwinRequests[query.$rid];
        // should we really ignore the status code?
        const responseBody = message.toString();
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_007: [When a message is received on the response topic with an `$rid` property in the query string of the topic matching the one that was sent on the request topic, the `callback` shall be called with a `null` error object and the parsed content of the response message.]*/
        /*Codes_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_017: [When a message is received on the response topic with an `$rid` property in the query string of the topic matching the one that was sent on the request topic, the `callback` shall be called with a `null` error object.]*/
        requestCallback(null, responseBody ? JSON.parse(responseBody) : undefined);
      } else {
        debug('received a response for a request we do not know about: ' + query.$rid);
      }
    } else {
      debug('received a response with a malformed topic property: ' + topic);
    }
  }
}
