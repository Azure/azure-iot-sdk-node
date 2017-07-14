// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import machina = require('machina');

import { endpoint, errors, results, Message } from 'azure-iot-common';
import { Amqp as BaseAmqpClient, translateError, AmqpMessage } from 'azure-iot-amqp-base';
import { ClientConfig } from 'azure-iot-device';

import * as uuid from 'uuid';
import * as dbg from 'debug';
const debug = dbg('azure-iot-device:twin');

const responseTopic = '$iothub/twin/res';

/**
 * @class        module:azure-iot-device-amqp.AmqpTwinReceiver
 * @classdesc    Acts as a receiver for device-twin traffic
 *
 * @param {Object} config   configuration object
 * @fires AmqpTwinReceiver#subscribed   an response or post event has been set up for listening.
 * @fires AmqpTwinReceiver#error    an error has occurred
 * @fires AmqpTwinReceiver#response   a response message has been received from the service
 * @fires AmqpTwinReceiver#post a post message has been received from the service
 * @throws {ReferenceError} If client parameter is falsy.
 *
 */

/* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_005: [The `AmqpTwinReceiver` shall inherit from the `EventEmitter` class.] */
export class AmqpTwinReceiver extends EventEmitter {
  static errorEvent: string = 'error';
  static responseEvent: string = 'response';
  static postEvent: string = 'post';
  static subscribedEvent: string = 'subscribed';

  private _client: BaseAmqpClient;
  private _boundMessageHandler: Function;
  private _endpoint: string;
  private _upstreamAmqpLink: any;
  private _downstreamAmqpLink: any;
  private _fsm: any;
  private _internalOperations: { [key: string]: () => void };
  private _eventQueue: any[];
  private _eventQueueError: Error;

  constructor(config: ClientConfig, client: any) {
    super();
    /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_003: [The `AmqpTwinReceiver` constructor shall accept a `config` object.] */
    /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_004: [The `AmqpTwinReceiver` constructor shall throw `ReferenceError` if the `config` object is falsy.] */
    if (!config) {
      throw new ReferenceError('required parameter is missing');
    }

    /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_001: [The `AmqpTwinReceiver` constructor shall accept a `client` object.] */
    /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_002: [** The `AmqpTwinReceiver` constructor shall throw `ReferenceError` if the `client` object is falsy. **] */
    if (!client) {
      throw new ReferenceError('required parameter is missing');
    }

    this._client = client;
    this._internalOperations = {};
    this._upstreamAmqpLink = null;
    this._downstreamAmqpLink = null;
    this._eventQueue = [];
    this._eventQueueError = null;

    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_007: [The endpoint argument for attacheReceiverLink shall be `/device/<deviceId>/twin`.] */
    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_009: [The endpoint argument for attacheSenderLink shall be `/device/<deviceId>/twin`.] */
    this._endpoint = endpoint.devicePath(config.deviceId) + '/twin';

    this._fsm = new machina.Fsm({
      namespace: 'amqp-twin-receiver',
      initialState: 'disconnected',
      states: {
        'disconnected': {
          _onEnter: () => {
            let headEvent: any[];
            while (headEvent = this._eventQueue.shift()) {
              if (headEvent.shift() === 'actual_sendTwinRequest') {
                this._rundown_sendTwinRequest.apply(this, headEvent);
              }
            }
            this._eventQueueError = null;
          },
          handleNewListener: (eventName) => {
            if ((eventName === AmqpTwinReceiver.responseEvent) || (eventName === AmqpTwinReceiver.postEvent)) {
              this._appendEventQueue();
              this._fsm.transition('connecting');
            }
          },
          sendTwinRequest: () => {
            this._appendEventQueue();
            this._fsm.transition('connecting');
          },
          handleErrorEmit: (err: Error) => {
            debug('_handleError: error is: ' + JSON.stringify(err));
            this.emit(AmqpTwinReceiver.errorEvent, translateError('received an error from the amqp transport: ', err));
          },
          handleLinkDetach: (detachObject: any) => {
            if (detachObject && detachObject.error) {
              this.emit(AmqpTwinReceiver.errorEvent, translateError('received an error from the amqp transport: ', detachObject.error));
            }
          }
        },
        'connecting': {
          _onEnter: () => {
            /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_006: [When a listener is added for the `response` event, and the `post` event is NOT already subscribed, upstream and downstream links are established via calls to `attachReceiverLink` and `attachSenderLink`.] */
            /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_012: [When a listener is added for the `post` event, and the `response` event is NOT already subscribed, upstream and downstream links are established via calls to `attachReceiverLink` and `attachSenderLine`.] */
            const linkCorrelationId: string  = uuid.v4().toString();
            this._client.attachReceiverLink( this._endpoint, this._generateTwinLinkProperties(linkCorrelationId), (receiverLinkError?: Error, receiverTransportObject?: any): void => {
              if (receiverLinkError) {
                /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_022: [If an error occurs on establishing the upstream or downstream link then the `error` event shall be emitted.] */
                this._fsm.handle('handleErrorEmit', receiverLinkError);
              } else {
                this._downstreamAmqpLink = receiverTransportObject;
                this._downstreamAmqpLink.on('detached', this._onAmqpDetached.bind(this));
                this._downstreamAmqpLink.on('errorReceived', this._handleError.bind(this));
                this._client.attachSenderLink( this._endpoint, this._generateTwinLinkProperties(linkCorrelationId), (senderLinkError?: Error, senderTransportObject?: any): void => {
                  if (senderLinkError) {
                    this._fsm.handle('handleErrorEmit', senderLinkError);
                  } else {
                    this._upstreamAmqpLink = senderTransportObject;
                    this._upstreamAmqpLink.on('detached', this._onAmqpDetached.bind(this));
                    this._upstreamAmqpLink.on('errorReceived', this._handleError.bind(this));
                    this._fsm.transition('connected');
                  }
                });
              }
            });
          },
          handleErrorEmit: () => {
            this._fsm.deferUntilTransition('disconnected');
            this._fsm.transition('disconnecting');
          },
          handleNewListener: () => {
            this._appendEventQueue();
          },
          handleRemoveListener: () => {
            this._appendEventQueue();
          },
          sendTwinRequest: () => {
            this._appendEventQueue();
          }
        },
        'connected': {
          _onEnter: () => {
            this._downstreamAmqpLink.on('message', this._boundMessageHandler);
            this._handleHeadOfEventQueue();
          },
          actual_handleNewListener: (eventName) => {
            if (eventName === AmqpTwinReceiver.responseEvent) {
              /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_011: [** Upon successfully establishing the upstream and downstream links the `subscribed` event shall be emitted from the twin receiver, with an argument object of {eventName: "response", transportObject: <object>}.] */
              this.emit(AmqpTwinReceiver.subscribedEvent, { 'eventName' : AmqpTwinReceiver.responseEvent, 'transportObject' : this._upstreamAmqpLink });
            } else if (eventName === AmqpTwinReceiver.postEvent) {
              //
              // We need to send a PUT request upstream to enable notification of desired property changes
              // from the cloud. Then we have to wait for the (hopefully) successful response to this request.
              //
              // Only at this point can we emit an successful subscribe to the agnostic twin code that is utilizing this receiver.
              //
              const correlationId = uuid.v4().toString();
              /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_013: [Upon receiving a successful response message with the correlationId of the `PUT`, the `subscribed` event shall be emitted from the twin receiver, with an argument object of {eventName: "post", transportObject: <object>}.] */
              this._internalOperations[correlationId] = () => {
                this.emit(AmqpTwinReceiver.subscribedEvent, { 'eventName' : AmqpTwinReceiver.postEvent, 'transportObject' : this._upstreamAmqpLink });
              };
              /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_019: [Upon successfully establishing the upstream and downstream links, a `PUT` request shall be sent on the upstream link with a correlationId set in the properties of the amqp message.] */
              this._sendTwinRequest('PUT', '/notifications/twin/properties/desired', { $rid: correlationId }, ' ');
            }
            this._handleHeadOfEventQueue();
          },
          actual_handleRemoveListener: (eventName) => {
            if ((eventName === AmqpTwinReceiver.postEvent) && EventEmitter.listenerCount(this, AmqpTwinReceiver.postEvent) === 0) {
              /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_021: [When there is no more listeners for the `post` event, a `DELETE` request shall be sent on the upstream link with a correlationId set in the properties of the amqp message.] */
              const correlationId = uuid.v4().toString();
              this._internalOperations[correlationId] = () => {
                debug('Turned off desired property notification');
              };
              this._sendTwinRequest('DELETE', '/notifications/twin/properties/desired', { $rid: correlationId }, ' ');
            }
            if ((EventEmitter.listenerCount(this, AmqpTwinReceiver.postEvent) + EventEmitter.listenerCount(this, AmqpTwinReceiver.responseEvent)) === 0) {
              /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_014: [When there are no more listeners for the `response` AND the `post` event, the upstream and downstream amqp links shall be closed via calls to `detachReceiverLink` and `detachSenderLink`.] */
              this._fsm.transition('disconnecting');
            } else {
              this._handleHeadOfEventQueue();
            }
          },
          actual_sendTwinRequest: (method, resource, properties, body, done) => {
            this._sendTwinRequest(method, resource, properties, body, done);
            this._handleHeadOfEventQueue();
          },
          handleNewListener: () => {
            this._AppendOrHandleEvent();
          },
          handleRemoveListener: () => {
            this._AppendOrHandleEvent();
          },
          sendTwinRequest: () => {
            this._AppendOrHandleEvent();
          },
          handleErrorEmit: () => {
            this._fsm.deferUntilTransition('disconnected');
            this._fsm.transition('disconnecting');
          },
          handleLinkDetach: (detachObject) => {
            /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_023: [If a detach with error occurs on the upstream or the downstream link then the `error` event shall be emitted.] */
            /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_024: [If any detach occurs the other link will also be detached by the twin receiver.] */
            this._eventQueueError = (detachObject) ? detachObject.error : null;
            this._fsm.deferUntilTransition('disconnected');
            this._fsm.transition('disconnecting');
          },
          _onExit: () => {
            this._downstreamAmqpLink.removeListener('message', this._boundMessageHandler);
          }
        },
        'disconnecting': {
          _onEnter: () => {
            this._client.detachSenderLink( this._endpoint, (detachSenderError: Error, result?: any) => {
              if (detachSenderError) {
                debug('we received an error for the detach of the upstream link during the disconnect.  Moving on to the downstream link.');
              }
              this._client.detachReceiverLink(this._endpoint,  (detachReceiverError: Error, result?: any) => {
                if (detachReceiverError) {
                  debug('we received an error for the detach of the downstream link during the disconnect.');
                }
                let possibleError = detachSenderError || detachReceiverError;
                if (possibleError) {
                  this._fsm.handle('handleErrorEmit', possibleError);
                }
                this._fsm.transition('disconnected');
              });
            });
          },
          handleErrorEmit: () => {
            this._fsm.deferUntilTransition('disconnected');
          },
          handleNewListener: () => {
            this._appendEventQueue();
          },
          handleRemoveListener: () => {
            this._appendEventQueue();
          },
          sendTwinRequest: () => {
            this._appendEventQueue();
          }
        }
      }
    });

    this.on('newListener', this._handleNewListener.bind(this));
    this.on('removeListener', this._handleRemoveListener.bind(this));
    this._boundMessageHandler = this._onAmqpMessage.bind(this); // need to save this so that calls to add & remove listeners can be matched by the EventEmitter.

  }

  /**
   * @method          module:azure-iot-device-amqp.Amqp#sendTwinRequest
   * @description     Send a device-twin specific message to the IoT Hub instance
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
    this._fsm.handle('sendTwinRequest', method, resource, properties, body, done);
  }

  private _generateTwinLinkProperties( correlationId: string): any {
    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_010: [** The link options argument for attachSenderLink shall be:
         attach: {
                properties: {
                  'com.microsoft:channel-correlation-id' : 'twin:<correlationId>',
                  'com.microsoft:api-version' : endpoint.apiVersion
                },
                sndSettleMode: 1,
                rcvSettleMode: 0
              } ] */
    /*Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_008: [The link options argument for attachReceiverLink shall be:
         attach: {
                properties: {
                  'com.microsoft:channel-correlation-id' : 'twin:<correlationId>',
                  'com.microsoft:api-version' : endpoint.apiVersion
                },
                sndSettleMode: 1,
                rcvSettleMode: 0
              } ] */
    // Note that the settle mode hard coded values correspond to the defined constant values in the amqp10 specification.
    return {
      attach: {
        properties: {
          'com.microsoft:channel-correlation-id' : 'twin:' + correlationId,
          'com.microsoft:api-version' : endpoint.apiVersion
        },
        sndSettleMode: 1,
        rcvSettleMode: 0
      }
    };
  }

  private _handleNewListener(eventName: string): void {
    this._fsm.handle('handleNewListener', eventName);
  }

  private _handleRemoveListener(eventName: string): void {
    this._fsm.handle('handleRemoveListener', eventName);
  }

  private _onAmqpMessage(message: Message): void {
    //
    // The ONLY time we should see a message on the downstream link without a correlationId is if the message is a desired property delta update.
    //
    const correlationId: string = message.correlationId;
    if (correlationId) {
      this._onResponseMessage(message);
    } else if (message.hasOwnProperty('data')) {
      this._onDesiredPropertyDelta(message);
    } else {
      //
      // Can't be any message we know what to do with.  Just drop it on the floor.
      //
      debug('malformed response message received from service: ' + JSON.stringify(message));
    }
  }

  private _onResponseMessage(message: Message): void {
    debug('onResponseMessage: The downstream message is: ' + JSON.stringify(message));
    if (this._internalOperations[message.correlationId]) {
      const callback = this._internalOperations[message.correlationId];
      delete this._internalOperations[message.correlationId];
      callback();
    } else {
      //
      // The service sending back any response is an implied success.  Set status to 200.
      //
      /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_016: [When a `response` event is emitted, the parameter shall be an object which contains `status`, `requestId` and `body` members.] */
      /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_026: [The `status` value is acquired from the amqp message status message annotation.] */
      /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_017: [The `requestId` value is acquired from the amqp message correlationId property in the response amqp message.] */
      /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_018: [the `body` parameter of the `response` event shall be the data of the received amqp message.] */
      const response = {
        'topic': responseTopic,
        'status': message.transportObj.messageAnnotations.status,
        '$rid': message.correlationId,
        'body': message.data
      };

      this.emit(AmqpTwinReceiver.responseEvent, response);
    }
  }

  private _onDesiredPropertyDelta(message: Message): void {
    /* Codes_SRS_NODE_DEVICE_AMQP_TWIN_06_020: [If there is a listener for the `post` event, a `post` event shall be emitted for each amqp message received on the downstream link that does NOT contain a correlation id, the parameter of the emit will be is the data of the amqp message.] */
    debug('onPostMessage: The downstream message is: ' + JSON.stringify(message));
    this.emit(AmqpTwinReceiver.postEvent, message.data);
  }

  private _onAmqpDetached(detachObject: any): void {
    this._fsm.handle('handleLinkDetach', detachObject);
  }

  private _handleError(err: Error): void {
    this._fsm.handle('handleErrorEmit', err);
  }


  private _safeCallback(callback: (err: Error | null, result?: any) => void, error?: Error | null, result?: any): void {
    if (callback) {
      process.nextTick(() => callback(error, result));
    }
  }

  private _appendEventQueue(): void {
    let argArray: any[] = [];
    argArray.push('actual_' + this._fsm.currentActionArgs[0].inputType);
    let i = 1;
    for ( ; i <= this._fsm.currentActionArgs.length - 1 ; i++) {
      argArray.push(this._fsm.currentActionArgs[i]);
    }
    this._eventQueue.push(argArray);
  }

  private _handleHeadOfEventQueue(): void {
    let head: any[] = this._eventQueue.shift();
    if (head) {
      this._fsm.handle.apply(this._fsm, head);
    }
  }

  private _AppendOrHandleEvent(): void {
    this._appendEventQueue();
    if (this._eventQueue.length === 1) {
      this._handleHeadOfEventQueue();
    }
  }


  private _isString(obj: any): boolean {
    return (typeof obj === 'string');
  }

  private _isNumber(obj: any): boolean {
    return (typeof obj === 'number');
  }

  private _isBoolean(obj: any): boolean {
    return (typeof obj === 'boolean');
  }

  private _rundown_sendTwinRequest(method: string, resource: string, properties: { [key: string]: string }, body: any, done?: (err?: Error, result?: results.MessageEnqueued) => void): void {
    if (!!done && (typeof done === 'function' )) {
      done(this._eventQueueError || new Error('Link Detached'));
    }
  }

  private _sendTwinRequest(method: string, resource: string, properties: { [key: string]: string }, body: any, done?: (err?: Error, result?: results.MessageEnqueued) => void): void {
    /* Codes_SRS_NODE_DEVICE_AMQP_06_012: [The `sendTwinRequest` method shall not throw `ReferenceError` if the `done` callback is falsy.] */
    /* Codes_SRS_NODE_DEVICE_AMQP_06_013: [The `sendTwinRequest` method shall throw an `ReferenceError` if the `method` argument is falsy.] */
    /* Codes_SRS_NODE_DEVICE_AMQP_06_014: [The `sendTwinRequest` method shall throw an `ReferenceError` if the `resource` argument is falsy.] */
    /* Codes_SRS_NODE_DEVICE_AMQP_06_015: [The `sendTwinRequest` method shall throw an `ReferenceError` if the `properties` argument is falsy.] */
    /* Codes_SRS_NODE_DEVICE_AMQP_06_016: [The `sendTwinRequest` method shall throw an `ReferenceError` if the `body` argument is falsy.] */
    if (!method || !resource || !properties || !body) {
      throw new ReferenceError('required parameter is missing');
    }

    /* Codes_SRS_NODE_DEVICE_AMQP_06_017: [The `sendTwinRequest` method shall throw an `ArgumentError` if the `method` argument is not a string.] */
    /* Codes_SRS_NODE_DEVICE_AMQP_06_018: [The `sendTwinRequest` method shall throw an `ArgumentError` if the `resource` argument is not a string.] */
    if (!this._isString(method) || !this._isString(resource)) {
      throw new errors.ArgumentError('required string parameter is not a string');
    }

    /* Codes_SRS_NODE_DEVICE_AMQP_06_019: [The `sendTwinRequest` method shall throw an `ArgumentError` if the `properties` argument is not a an object.] */
    if (!(properties instanceof Object)) {
      throw new errors.ArgumentError('required properties parameter is not an object');
    }

    let amqpMessage = new AmqpMessage();
    amqpMessage.messageAnnotations = {};
    amqpMessage.properties = {};

    //
    // Amqp requires that the resource designation NOT be terminated by a slash.  The agnostic twin client was terminating the
    // resources with a slash which worked just dandy for MQTT.
    //
    // We need to cut off a terminating slash.  If we cut off a terminating slash and the length of resource is zero then simply
    // don't specify a resource.
    //
    // What if the caller specifies a "//" resource?  Don't do that.
    //
    // So you'll note that in this case "/" sent down will be turned into an empty string.  So why not
    // simply send down "" to begin with?  Because you can't send a falsy parameter.
    //
    /* Codes_SRS_NODE_DEVICE_AMQP_06_020: [The `method` argument shall be the value of the amqp message `operation` annotation.] */
    amqpMessage.messageAnnotations.operation = method;
    let localResource: string = resource;
    /* Codes_SRS_NODE_DEVICE_AMQP_06_031: [If the `resource` argument terminates in a slash, the slash shall be removed from the annotation.] */
    if (localResource.substr(localResource.length - 1, 1) === '/') {
      localResource = localResource.slice(0, localResource.length - 1);
    }
    /* Codes_SRS_NODE_DEVICE_AMQP_06_039: [If the `resource` argument length is zero (after terminating slash removal), the resource annotation shall not be set.] */
    if (localResource.length > 0) {
      /* Codes_SRS_NODE_DEVICE_AMQP_06_021: [The `resource` argument shall be the value of the amqp message `resource` annotation.] */
      amqpMessage.messageAnnotations.resource = localResource;
    }

    Object.keys(properties).forEach((key) => {
      /* Codes_SRS_NODE_DEVICE_AMQP_06_028: [The `sendTwinRequest` method shall throw an `ArgumentError` if any members of the `properties` object fails to serialize to a string.] */
      if (!this._isString(properties[key]) && !this._isNumber(properties[key]) && !this._isBoolean(properties[key])) {
        throw new errors.ArgumentError('required properties object has non-string properties');
      }

      /* Codes_SRS_NODE_DEVICE_AMQP_06_022: [All properties, except $rid, shall be set as the part of the properties map of the amqp message.] */
      /* Codes_SRS_NODE_DEVICE_AMQP_06_023: [The $rid property shall be set as the `correlationId` in the properties map of the amqp message.] */
      if (key === '$rid') {
        amqpMessage.properties.correlationId = properties[key].toString();
      } else {
        amqpMessage.properties[key] = properties[key];
      }
    });

    /* Codes_SRS_NODE_DEVICE_AMQP_06_024: [The `body` shall be value of the body of the amqp message.] */
    amqpMessage.body = body.toString();

    /* Codes_SRS_NODE_DEVICE_AMQP_06_025: [The amqp message will be sent upstream to the IoT Hub via the amqp client `send`.]*/
    this._upstreamAmqpLink.send(amqpMessage)
      .then((state) => {
        debug(' amqp-twin-receiver: Good disposition on the amqp message send: ' + JSON.stringify(state));
        this._safeCallback(done, null, new results.MessageEnqueued(state));
        return null;
      })
      .catch((err) => {
        debug(' amqp-twin-receiver: Bad disposition on the amqp message send: ' + err);
        this._safeCallback(done, translateError('Unable to send Twin message', err));
      });
  }

}
