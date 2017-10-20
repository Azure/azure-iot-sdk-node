 import * as machina from 'machina';
import * as dbg from 'debug';
import { EventEmitter } from 'events';
import { Message, results } from 'azure-iot-common';
import { AmqpMessage } from './amqp_message';
import { AmqpLink } from './amqp_link_interface';

const debug = dbg('azure-iot-amqp-base:SenderLink');

interface MessageOperation {
  message: Message;
  callback: (err?: Error, result?: results.MessageEnqueued) => void;
}

/**
 * @private
 * State machine used to manage AMQP sender links
 *
 * @extends {EventEmitter}
 * @implements {AmqpLink}
 */
/*Codes_SRS_NODE_AMQP_SENDER_LINK_16_002: [The `SenderLink` class shall inherit from `EventEmitter`.]*/
/*Codes_SRS_NODE_AMQP_SENDER_LINK_16_003: [The `SenderLink` class shall implement the `AmqpLink` interface.]*/
export class SenderLink extends EventEmitter implements AmqpLink {
  private _linkAddress: string;
  private _linkOptions: any;
  private _linkObject: any;
  private _fsm: machina.Fsm;
  private _amqp10Client: any;
  private _unsentMessageQueue: MessageOperation[];
  private _pendingMessageQueue: MessageOperation[];
  private _detachHandler: (detachEvent: any) => void;
  private _errorHandler: (err: Error) => void;

  constructor(linkAddress: string, linkOptions: any, amqp10Client: any) {
    super();
    this._linkAddress = linkAddress;
    this._linkOptions = linkOptions;
    this._amqp10Client = amqp10Client;
    this._unsentMessageQueue = [];
    this._pendingMessageQueue = [];

    this._detachHandler = (detachEvent: any): void => {
      debug('handling detach event: ' + JSON.stringify(detachEvent));
      this._fsm.handle('forceDetach', detachEvent.error);
    };

    this._errorHandler = (err: Error): void => {
      debug('handling error event: ' + err.toString());
      this._fsm.handle('forceDetach', err);
    };

    const pushToQueue = (message, callback) => {
      this._unsentMessageQueue.push({
        message: message,
        callback: callback
      });
    };

    this._fsm = new machina.Fsm({
      initialState: 'detached',
      namespace: 'senderlink',
      states: {
        detached: {
          _onEnter: (callback, err) => {
            this._linkObject = null;
            debug('link detached: ' + this._linkAddress);
            debug('unsent message queue length: ' + this._unsentMessageQueue.length);
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_021: [If the link fails to attach and there are messages in the queue, the callback for each message shall be called with the error that caused the detach in the first place.]*/
            if (this._unsentMessageQueue.length > 0) {
              let messageCallbackError = err || new Error('Link Detached');

              debug('dequeuing and failing unsent messages');
              let unsent = this._unsentMessageQueue.shift();
              while (unsent) {
                unsent.callback(messageCallbackError);
                unsent = this._unsentMessageQueue.shift();
              }
            }

            debug('pending message queue length: ' + this._pendingMessageQueue.length);
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_014: [If the link is detached while a message is being sent, the `callback` shall be called with an `Error` object describing the AMQP error that caused the detach to happen in the first place.]*/
            if (this._pendingMessageQueue.length > 0) {
              debug('dequeuing and failing pending messages');
              let messageCallbackError = err || new Error('Link Detached');

              let pending = this._pendingMessageQueue.shift();
              while (pending) {
                debug('failing pending message with error: ' + messageCallbackError.toString());
                pending.callback(messageCallbackError);
                pending = this._pendingMessageQueue.shift();
              }
            }

            if (callback) {
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_018: [If an error happened that caused the link to be detached while trying to attach the link or send a message, the `callback` for this function shall be called with that error.]*/
              callback(err);
            } else if (err) {
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_016: [If an error happened that caused the link to be detached, the sender link shall call emit an `error` event with that error.]*/
              this.emit('error', err);
            }
          },
          /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_011: [If the state machine is not in the `attached` state, the `SenderLink` object shall attach the link first and then send the message.]*/
          attach: (callback) => this._fsm.transition('attaching', callback),
          detach: (callback) => {
            debug('detach: link already detached');
            callback();
          },
          forceDetach: () => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_026: [The `forceDetach` method shall return immediately if the link is already detached.]*/
            debug('forceDetach: link already detached');
            return;
          },
          send: (message, callback) => {
            pushToQueue(message, callback);
            this._fsm.handle('attach');
          }
        },
        attaching: {
          _onEnter: (callback) => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_004: [The `attach` method shall use the stored instance of the `amqp10.AmqpClient` object to attach a new link object with the `linkAddress` and `linkOptions` provided when creating the `SenderLink` instance.]*/
            debug('creating sender with amqp10 for: ' + this._linkAddress);
            this._amqp10Client.createSender(this._linkAddress, this._linkOptions)
              .then((amqp10link) => {
                debug('sender object created by amqp10 for endpoint: ' + this._linkAddress);
                if (this._fsm.state === 'attaching') {
                  this._linkObject = amqp10link;
                  /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_006: [The `SenderLink` object should subscribe to the `detached` event of the newly created `amqp10` link object.]*/
                  this._linkObject.on('detached', this._detachHandler);
                  /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_007: [The `SenderLink` object should subscribe to the `errorReceived` event of the newly created `amqp10` link object.]*/
                  this._linkObject.on('errorReceived', this._errorHandler);
                  this._fsm.transition('attached', callback);
                } else {
                  debug('client forceDetached us already - cleaning up');
                  amqp10link.forceDetach();
                }
                return null;
              })
              .catch((err) => {
                debug('amqp10 failed to create sender: ' + err.toString());
                this._fsm.transition('detached', callback, err);
              });
          },
          detach: (callback) => this._fsm.transition('detaching', callback),
          forceDetach: (err) => {
            if (this._linkObject) {
              this._removeListeners();
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_025: [The `forceDetach` method shall call the `forceDetach` method on the underlying `amqp10` link object.]*/
              this._linkObject.forceDetach();
            }

            this._fsm.transition('detached', undefined, err);
          },
          send: (message, callback) => pushToQueue(message, callback)
        },
        attached: {
          _onEnter: (callback) => {
            debug('link attached. processing unsent message queue');
            let toSend = this._unsentMessageQueue.shift();
            while (toSend) {
              debug('got message from unsent queue');
              this._fsm.handle('send', toSend.message, toSend.callback);
              toSend = this._unsentMessageQueue.shift();
            }
            if (callback) callback();
          },
          attach: (callback) => callback(),
          detach: (callback) => this._fsm.transition('detaching', callback),
          forceDetach: (err) => {
            if (this._linkObject) {
              this._removeListeners();
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_025: [The `forceDetach` method shall call the `forceDetach` method on the underlying `amqp10` link object.]*/
              this._linkObject.forceDetach();
            }

            this._fsm.transition('detached', undefined, err);
          },
          send: (message, callback) => {
            const op = {
              message: message,
              callback: callback
            };

            debug('pushing message to pending queue');
            this._pendingMessageQueue.push(op);

            /*Codes_SRS_NODE_COMMON_AMQP_16_011: [All methods should treat the `done` callback argument as optional and not throw if it is not passed as argument.]*/
            let _processPendingMessageCallback = (error?, result?) => {
              const opIndex = this._pendingMessageQueue.indexOf(op);
              if (opIndex >= 0) {
                this._pendingMessageQueue.splice(opIndex, 1);
                if (op.callback) {
                  /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_013: [If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`.]*/
                  /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_012: [If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service.]*/
                  process.nextTick(() => op.callback(error, result));
                }
              }
            };

            debug('sending message using underlying amqp10 link object');
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_010: [The `send` method shall use the link created by the underlying `amqp10.AmqpClient` to send the specified `message` to the IoT hub.]*/
            this._linkObject.send(message)
                            .then((state) => {
                              debug('message sent successfully');
                              _processPendingMessageCallback(null, new results.MessageEnqueued(state));
                              return null;
                            })
                            .catch((err) => {
                              debug('error sending message');
                              _processPendingMessageCallback(err);
                            });
          }
        },
        detaching: {
          _onEnter: (callback, err) => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_023: [The `detach` method shall call the `callback` with the original `Error` that caused the detach whether it succeeds or fails to cleanly detach the link.]*/
            if (this._linkObject) {
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_009: [** The `detach` method shall detach the link created by the `amqp10.AmqpClient` underlying object.]*/
              this._removeListeners();
              this._linkObject.detach().then(() => {
                this._fsm.transition('detached', callback, err);
              }).catch((err) => {
                debug('error detaching the sender link: ' + err.toString());
                this._fsm.transition('detached', callback, err);
              });
            } else {
              this._fsm.transition('detached', callback, err);
            }
          },
          '*': () => this._fsm.deferUntilTransition('detached')
        }
      }
    });
    this._fsm.on('transition', (transition) => {
      debug(transition.fromState + ' -> ' + transition.toState + ' (action:' + transition.action + ')');
    });
  }

  detach(callback: (err?: Error) => void): void {
    this._fsm.handle('detach', callback);
  }

  forceDetach(err?: Error): void {
    this._fsm.handle('forceDetach', err);
  }

  attach(callback: (err?: Error) => void): void {
    this._fsm.handle('attach', callback);
  }

  send(message: AmqpMessage, callback: (err?: Error, result?: results.MessageEnqueued) => void): void {
    this._fsm.handle('send', message, callback);
  }

  private _removeListeners(): void {
    this._linkObject.removeListener('detached', this._detachHandler);
    this._linkObject.removeListener('errorReceived', this._errorHandler);
  }
}
