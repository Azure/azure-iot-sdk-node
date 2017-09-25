// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { Message, Receiver } from 'azure-iot-common';
import { DeviceMethodRequest, DeviceMethodResponse } from 'azure-iot-device';
import * as QueryString from 'querystring';
import * as URL from 'url';
import * as dbg from  'debug';
const debug = dbg('device:mqtt-receiver');
import { MqttBase } from './mqtt_base';

const TOPIC_METHODS_SUBSCRIBE = '$iothub/methods/POST/#';

/**
 * @private
 */
interface TopicDescription {
  name: string;
  listenersCount: number;
  subscribeInProgress: boolean;
  subscribed: boolean;
  topicMatchRegex: RegExp;
  handler: Function;
}

/**
 * @private
 */
class MethodDescription {
  methodName: string;
  verb: string;
}

/**
 * @private
 */
class MethodMessage {
  methods: MethodDescription;
  requestId: string;
  properties: { [key: string]: string };
  body: Buffer;
}

function _parseMessage(topic: string, body: any): MethodMessage {
  let url: URL.Url;
  let path: string[];
  let query: any;
  try {
    url = URL.parse(topic);
    path = url.path.split('/');
    query = QueryString.parse(url.query);
  } catch (err) {
    return undefined;
  }

  // if the topic has a querystring then 'path' will include it; so
  // we strip it out
  const lastPathComponent = path[path.length - 1];
  if (lastPathComponent.indexOf('?') !== -1) {
    path[path.length - 1] = lastPathComponent.substr(
      0, lastPathComponent.indexOf('?')
    );
  }

  if (path.length > 0 && path[0] === '$iothub') {
    let message = new MethodMessage();
    if (path.length > 1 && path[1].length > 0) {
      // create an object for the module; for example, $iothub/twin/...
      // would result in there being a message.twin object
      let mod = message[path[1]] = new MethodDescription();

      // parse the request ID if there is one
      if (!!(query.$rid)) {
        message.requestId = query.$rid;
      }

      // parse the other properties properties (excluding $rid)
      message.properties = query;
      delete message.properties.$rid;

      // save the body
      message.body = body;

      // parse the verb
      if (path.length > 2 && path[2].length > 0) {
        mod.verb = path[2];

        // This is a topic that looks like this:
        //  $iothub/methods/POST/{method name}?$rid={request id}&{serialized properties}
        // We parse the method name out.
        if (path.length > 3 && path[3].length > 0) {
          mod.methodName = path[3];
        } else {
          // The service published a message on a strange topic name. This is
          // probably a service bug. At any rate we don't know what to do with
          // this strange topic so we throw.
          throw new Error('Device method call\'s MQTT topic name does not include the method name.');
        }
      }
    }

    return message;
  }

  return undefined;
}

/**
 * @private
 * @class           module:azure-iot-device-mqtt.MqttReceiver
 * @classdesc       Object that is used to receive and settle messages from the server.
 *
 * @param  {Object}  mqttClient    MQTT Client object.
 * @param  {string}  topicMessage  MQTT topic name for receiving C2D messages
 * @throws {ReferenceError}        If either mqttClient or topicMessage is falsy
 * @emits  message                 When a message is received
 */
/**
 * @event module:azure-iot-device-mqtt.MqttReceiver#message
 * @type {Message}
 */
export class MqttReceiver extends EventEmitter implements Receiver {
  private _mqtt: MqttBase;
  private _topics: { [key: string]: TopicDescription };

  constructor(mqttClient: MqttBase, topicMessage: string) {
    super();
    /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_001: [If the topicMessage parameter is falsy, a ReferenceError shall be thrown.]*/
    /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_002: [If the mqttClient parameter is falsy, a ReferenceError shall be thrown.]*/
    if (!mqttClient) { throw new ReferenceError('mqttClient cannot be falsy'); }
    if (!topicMessage) { throw new ReferenceError('topicMessage cannot be falsy'); }

    this._mqtt = mqttClient;
    this._mqtt.on('message', this._dispatchMqttMessage.bind(this));

    // MQTT topics to subscribe to
    this._topics = {
      'message': {
        name: topicMessage,
        listenersCount: 0,
        subscribeInProgress: false,
        subscribed: false,
        topicMatchRegex: /^devices\/.*\/messages\/devicebound\/.*$/g,
        handler: this._onC2DMessage.bind(this)
      },
      'method': {
        name: TOPIC_METHODS_SUBSCRIBE,
        listenersCount: 0,
        subscribeInProgress: false,
        subscribed: false,
        topicMatchRegex: /^\$iothub\/methods\/POST\/.*$/g,
        handler: this._onDeviceMethod.bind(this)
      }
    };

    const self = this;

    this.on('newListener', (eventName) => {
      // if the event is a 'method' event then eventName is in the format
      // 'method_{method name}'
      const topic = eventName.indexOf('method_') === 0 ?
                      self._topics.method :
                      eventName === 'message' ?
                        self._topics.message :
                        null;
      if (!!topic) {
        // increment listeners count for this topic
        ++(topic.listenersCount);

        // lazy-init MQTT subscription
        if (topic.subscribed === false && topic.subscribeInProgress === false) {
          // Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_003: [ When a listener is added for the message event, the topic should be subscribed to. ]
          // Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_13_002: [ When a listener is added for the method event, the topic should be subscribed to. ]
          self._setupSubscription(topic);
        }
      }
    });

    this.on('removeListener', (eventName) => {
      // if the event is a 'method' event then eventName is in the format
      // 'method_{method name}'
      const topic = eventName.indexOf('method_') === 0 ?
                      self._topics.method :
                      eventName === 'message' ?
                        self._topics.message :
                        null;
      if (!!topic) {
        debug('removing listener for topic: ' + JSON.stringify(topic));
        // decrement listeners count for this topic
        --(topic.listenersCount);

        // stop listening for MQTT events if our consumers stop listening for our events
        if (topic.listenersCount === 0 && topic.subscribed === true) {
          // Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_006: [ When there are no more listeners for the message event, the topic should be unsubscribed. ]
          // Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_13_004: [ When there are no more listeners for the method event, the topic should be unsubscribed. ]
          self._removeSubscription(topic);
        }
      }
    });
  }

  onDeviceMethod(methodName: string, callback: (methodRequest: DeviceMethodRequest, methodResponse: DeviceMethodResponse) => void): void {
    this.on('method_' + methodName, callback);
  }

  private _setupSubscription(topic: TopicDescription): void {
    debug('subscribe: ' + JSON.stringify(topic));
    topic.subscribeInProgress = true;
    this._mqtt.subscribe(topic.name, { qos: 0 }, (err) => {
      topic.subscribeInProgress = false;
      if (!err) {
        topic.subscribed = true;
      }

      // TODO: There doesn't seem to be a way in the current design to surface
      //       the error if the MQTT topic subscription fails. Fix this.
    });
  }

  private _removeSubscription(topic: TopicDescription): void {
    debug('unsubscribe ' + JSON.stringify(topic));
    this._mqtt.unsubscribe(topic.name, (err) => {
      if (!err) {
        topic.subscribed = false;

        // TODO: There doesn't seem to be a way in the current design to surface
        //       the error if the MQTT topic unsubscription fails. Fix this.
      }
    });
  }

  private _dispatchMqttMessage(topic: string, payload: any): void {
    debug('message received on ' + topic);
    debug(JSON.stringify(payload ? payload.toString() : null));
    // dispatch the message to the appropriate handler
    const self = this;
    let targetTopic = null;
    Object.keys(this._topics).some((topicIndex) => {
      // Turns out regexes are stateful. We need to reset the search index back to
      // the beginning every time we use it.
      const theTopic = self._topics[topicIndex];
      theTopic.topicMatchRegex.lastIndex = 0;
      if (theTopic.topicMatchRegex.test(topic)) {
        targetTopic = theTopic;
      }
      return targetTopic !== null;
    });
    if (!!targetTopic) {
      targetTopic.handler(topic, payload);
    }
  }

  private _onC2DMessage(topic: string, payload: any): void {
    /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_005: [When a message event is emitted, the parameter shall be of type Message]*/
    let msg = new Message(payload);

    const topicParts = topic.split('/');
    // Message properties are always the 5th segment of the topic
    if (topicParts[4]) {
      const keyValuePairs = topicParts[4].split('&');

      for (let i = 0; i < keyValuePairs.length; i++) {
        const keyValuePair = keyValuePairs[i].split('=');
        const k = decodeURIComponent(keyValuePair[0]);
        const v = decodeURIComponent(keyValuePair[1]);

        switch (k) {
          case '$.mid':
            /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_008: [When a message is received, the receiver shall populate the generated `Message` object `messageId` with the value of the property `$.mid` serialized in the topic, if present.]*/
            msg.messageId = v;
            break;
          case '$.to':
            /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_009: [When a message is received, the receiver shall populate the generated `Message` object `to` with the value of the property `$.to` serialized in the topic, if present.]*/
            msg.to = v;
            break;
          case '$.exp':
            /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_010: [When a message is received, the receiver shall populate the generated `Message` object `expiryTimeUtc` with the value of the property `$.exp` serialized in the topic, if present.]*/
            msg.expiryTimeUtc = v;
            break;
          case '$.cid':
            /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_011: [When a message is received, the receiver shall populate the generated `Message` object `correlationId` with the value of the property `$.cid` serialized in the topic, if present.]*/
            msg.correlationId = v;
            break;
          case '$.uid':
            /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_012: [When a message is received, the receiver shall populate the generated `Message` object `userId` with the value of the property `$.uid` serialized in the topic, if present.]*/
            msg.userId = v;
            break;
          default:
            /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_007: [When a message is received, the receiver shall populate the generated `Message` object `properties` property with the user properties serialized in the topic.]*/
            msg.properties.add(k, v);
            break;
        }
      }
    }

    /*Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_16_004: [If there is a listener for the message event, a message event shall be emitted for each message received.]*/
    this.emit('message', msg);
  }

  private _onDeviceMethod(topic: string, payload: any): void {
    // The topic name looks like this:
    //  $iothub/methods/POST/{method name}?$rid={request id}&{serialized properties}
    // We parse out the message.

    /* Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_13_005: [ When a method_<METHOD NAME> event is emitted the parameter shall conform to the shape as defined by the interface specified below:

      interface StringMap {
          [key: string]: string;
      }

      interface MethodMessage {
          methods: { methodName: string; };
          requestId: string;
          properties: StringMap;
          body: Buffer;
          verb: string;
      }
    ]*/
    const methodMessage = _parseMessage(topic, payload);
    if (!!methodMessage) {
      // Codes_SRS_NODE_DEVICE_MQTT_RECEIVER_13_003: [ If there is a listener for the method event, a method_<METHOD NAME> event shall be emitted for each message received. ]
      // we emit a message for the event 'method_{method name}'
      this.emit('method_' + methodMessage.methods.methodName, methodMessage);
    }
  }
}
