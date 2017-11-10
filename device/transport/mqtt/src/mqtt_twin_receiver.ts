// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { MqttBase, translateError } from 'azure-iot-mqtt-base';
import * as querystring from 'querystring';
import * as url from 'url';
import * as machina from 'machina';
import * as dbg from 'debug';
const debug = dbg('azure-iot-device-mqtt:MqttTwinReceiver');

// $iothub/twin/PATCH/properties/reported/?$rid={request id}&$version={base version}

/* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_009: [** The subscribed topic for `response` events shall be '$iothub/twin/res/#' **]** */
const responseTopic = '$iothub/twin/res/#';

/* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_019: [** The subscribed topic for post events shall be $iothub/twin/PATCH/properties/desired/# **]** */
const postTopic = '$iothub/twin/PATCH/properties/desired/#';

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
export class MqttTwinReceiver extends EventEmitter {
  static errorEvent: string = 'error';
  static responseEvent: string = 'response';
  static postEvent: string = 'post';
  static subscribedEvent: string = 'subscribed';

  private _mqtt: MqttBase;
  private _fsm: machina.Fsm;

  constructor(client: MqttBase) {
    super();
    /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_001: [** The `MqttTwinReceiver` constructor shall accept a `client` object **]** */
    /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_002: [** The `MqttTwinReceiver` constructor shall throw `ReferenceError` if the `client` object is falsy **]** */
    if (!client) {
      throw new ReferenceError('required parameter is missing');
    }
    this._mqtt = client;

    this.on('newListener', (eventName) => {
      if (eventName === MqttTwinReceiver.responseEvent || eventName === MqttTwinReceiver.postEvent) {
        /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_003: [** When a listener is added for the `response` event, the appropriate topic shall be asynchronously subscribed to. **]** */
        this._fsm.handle('subscribe', (err) => {
          if (err) {
            debug('error while subscribing: ' + err.toString());
            /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_023: [** If the `error` event is subscribed to, an `error` event shall be emitted if any asynchronous subscribing operations fails. **]** */
            /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_024: [** When the `error` event is emitted, the first parameter shall be an error object obtained via the MQTT `translateError` module. **]** */
            this.emit(MqttTwinReceiver.errorEvent, translateError(err));
          }
        });
      }
    });

    this.on('removeListener', (eventName) => {
      if (eventName === MqttTwinReceiver.responseEvent || eventName === MqttTwinReceiver.postEvent) {
        if (this.listeners('response').length + this.listeners('post').length <= 0) {
          this._fsm.handle('unsubscribe', (err) => {
            if (err) {
              debug('error while unsubscribing: ' + err.toString());
              /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_024: [** When the `error` event is emitted, the first parameter shall be an error object obtained via the MQTT `translateError` module. **]** */
              this.emit(MqttTwinReceiver.errorEvent, translateError(err));
            }
          });
        }
      }
    });

    const messageHandler = this._onMqttMessage.bind(this);

    this._fsm = new machina.Fsm({
      namespace: 'device-mqtt',
      initialState: 'unsubscribed',
      states: {
        unsubscribed: {
          _onEnter: (callback, err) => {
            this._mqtt.removeListener('message', messageHandler);
            if (callback) {
              callback(err);
            } else if (err) {
              this.emit('error', translateError(err));
            }
          },
          subscribe: (callback) => this._fsm.transition('subscribingToResponseTopic', callback),
          unsubscribe: (callback) => callback()
        },
        subscribingToResponseTopic: {
          _onEnter: (callback) => {
            debug('subscribing to response topic');
            this._mqtt.on('message', messageHandler);
            this._mqtt.subscribe(responseTopic, { qos: 0 }, (err, responseTopicResult) => {
              if (err) {
                this._fsm.transition('unsubscribed', callback, err);
              } else {
                debug('subscribed to response topic');
                this._fsm.transition('subscribingToPostTopic', callback, responseTopicResult);
              }
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        subscribingToPostTopic: {
          _onEnter: (callback, responseTopicResult) => {
            debug('subscribed to post topic');
            this._mqtt.subscribe(postTopic, { qos: 0 }, (err, postTopicResult) => {
              if (err) {
                this._fsm.transition('unsubscribingFromResponseTopic', callback, err);
              } else {
                debug('subscribed to post topic');
                this._fsm.transition('subscribed', callback, responseTopicResult, postTopicResult);
              }
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        subscribed: {
          _onEnter: (callback, responseTopicResult, postTopicResult) => {
            /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_025: [** If the `subscribed` event is subscribed to, a `subscribed` event shall be emitted after an MQTT topic is subscribed to. **]** */
            /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_028: [** When the `subscribed` event is emitted, the parameter shall be an object which contains an `eventName` field and an `transportObject` field. **]** */
            /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_026: [** When the `subscribed` event is emitted because the response MQTT topic was subscribed, the parameter shall be the string 'response' **]**  */
            /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_029: [** When the subscribed event is emitted, the `transportObject` field shall contain the object returned by the library in the subscription response. **]** */
            this.emit(MqttTwinReceiver.subscribedEvent, { 'eventName' : MqttTwinReceiver.responseEvent, 'transportObject' : responseTopicResult });
            /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_025: [** If the `subscribed` event is subscribed to, a `subscribed` event shall be emitted after an MQTT topic is subscribed to. **]** */
            /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_028: [** When the `subscribed` event is emitted, the parameter shall be an object which contains an `eventName` field and an `transportObject` field. **]** */
            /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_027: [** When the `subscribed` event is emitted because the post MQTT topic was subscribed, the `eventName` field shall be the string 'post' **]** */
            /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_029: [** When the subscribed event is emitted, the `transportObject` field shall contain the object returned by the library in the subscription response. **]** */
            this.emit(MqttTwinReceiver.subscribedEvent, { 'eventName' : MqttTwinReceiver.postEvent, 'transportObject' : postTopicResult });
            callback();
          },
          subscribe: (callback) => callback(),
          unsubscribe: (callback) => this._fsm.transition('unsubscribingFromPostTopic', callback)
        },
        unsubscribingFromPostTopic: {
          _onEnter: (callback) => {
            /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_021: [** When there are no more listeners for the post event, the topic should be unsubscribed. **]** */
            this._mqtt.unsubscribe(postTopic, (err) => {
              this._fsm.transition('unsubscribingFromResponseTopic', callback, err);
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        unsubscribingFromResponseTopic: {
          _onEnter: (callback, forwardedError) => {
            /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_005: [** When there are no more listeners for the `response` event, the topic should be unsubscribed **]** */
            this._mqtt.unsubscribe(responseTopic, (err) => {
              let finalError = forwardedError || err;
              this._fsm.transition('unsubscribed', callback, finalError);
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        }
      }
    });
  }

  subscribe(callback: (err?: Error) => void): void {
    this._fsm.handle('subscribe', callback);
  }

  unsubscribe(callback: (err?: Error) => void): void {
    this._fsm.handle('unsubscribe', callback);
  }

  private _onMqttMessage(topic: string, message: any): void {
    debug('mqtt message received');
    if (topic.indexOf('$iothub/twin/res') === 0) {
      debug('response message received');
      this._onResponseMessage(topic, message);
    } else if (topic.indexOf('$iothub/twin/PATCH') === 0) {
      debug('post message received');
      this._onPostMessage(topic, message);
    }
    /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_014: [** Any messages received on topics which violate the topic name formatting shall be ignored. **]** */
  }

  private _onResponseMessage(topic: string, message: any): void {
    let urlObject: url.Url;
    let path: string[];
    let query: any;

    /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_014: [** Any messages received on topics which violate the topic name formatting shall be ignored. **]** */
    try {
      urlObject = url.parse(topic);
      path = urlObject.path.split('/');
      query = querystring.parse(urlObject.query);
    } catch (err) {
      return;
    }

    /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_006: [** When a `response` event is emitted, the parameter shall be an object which contains `status`, `requestId` and `body` members **]**  */
    /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_010: [** The topic which receives the response shall be formatted as '$iothub/twin/res/{status}/?$rid={request id}' **]** */
    /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_015: [** the {status} and {request id} fields in the topic name are required. **]** */
    /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_016: [** The {status} and {request id} fields in the topic name shall be strings **]** */
    /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_017: [** The {status} and {request id} fields in the topic name cannot be zero length. **]** */
    if ((path[0] === '$iothub') &&
        (path[1] === 'twin') &&
        (path[2] === 'res') &&
        (path[3]) &&
        (path[3].toString().length > 0) &&
        (query.$rid) &&
        (query.$rid.toString().length > 0)) {
      /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_011: [** The `status` parameter of the `response` event shall be parsed out of the topic name from the {status} field **]** */
      /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_012: [** The `requestId` parameter of the `response` event shall be parsed out of the topic name from the {request id} field **]** */
      /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_013: [** The `body` parameter of the `response` event shall be the body of the received MQTT message **]**  */
      /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_011: [** The `status` parameter of the `response` event shall be parsed out of the topic name from the {status} field **]** */
      /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_012: [** The `requestId` parameter of the `response` event shall be parsed out of the topic name from the {request id} field **]** */
      /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_013: [** The `body` parameter of the `response` event shall be the body of the received MQTT message **]**  */
      const response = {
        'topic' : topic,
        'status' : Number(path[3]),
        '$rid' : query.$rid,
        'body' : message
      };

      /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_004: [** If there is a listener for the `response` event, a `response` event shall be emitted for each response received. **]** */
      this.emit(MqttTwinReceiver.responseEvent, response);
    }
  }

  private _onPostMessage(topic: string, message: any): void {
    /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_020: [** If there is a listener for the post event, a post event shal be emitteded for each post message received **]** */
    if (topic.indexOf('$iothub/twin/PATCH/properties/desired') === 0) {
      /* Codes_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_022: [** When a post event it emitted, the parameter shall be the body of the message **]** */
      this.emit(MqttTwinReceiver.postEvent, message);
    }
  }
}
