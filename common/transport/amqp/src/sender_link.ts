import * as machina from 'machina';
import * as dbg from 'debug';
import { EventEmitter } from 'events';
import { results } from 'azure-iot-common';
import { AmqpMessage } from './amqp_message';
import { AmqpLink } from './amqp_link_interface';
import { ArgumentError } from '../../../core/lib/errors';

const debug = dbg('azure-iot-amqp-base:SenderLink');

interface MessageOperation {
  message: AmqpMessage;
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
  private _amqpSession: any;
  private _combinedOptions: any;
  private _unsentMessageQueue: MessageOperation[];
  private _pendingMessageDictionary: {[key: number]: any};

  constructor(linkAddress: string, linkOptions: any, session: any) {
    super();
    this._linkAddress = linkAddress;
    this._linkOptions = linkOptions;
    this._amqpSession = session;
    this._unsentMessageQueue = [];
    this._pendingMessageDictionary = {};
    this._combinedOptions = {
      target: linkAddress
    };

    if (linkOptions) {
      for (let k in linkOptions) {
        this._combinedOptions[k] = linkOptions[k];
      }
    }

    let manageAttachedSenderHandlers: (operation: string) => void;

    const attachedSenderDisconnectedHandler = (err: Error): void => {
      debug('handling disconnected event: ' + err.toString());
      this._fsm.handle('forceDetach', err);
    };

    const attachedSenderCloseHandler = (context: any): void => {
      debug('handling detach event: ' + JSON.stringify(context));
      this._fsm.handle('forceDetach', context);
    };

    const attachedSenderErrorHandler = (err: Error): void => {
      debug('handling error event: ' + err.toString());
      this._fsm.handle('forceDetach', err);
    };

    const attachedSenderAcceptedHandler = (context: any): void => {
      debug('got an accepted event for delivery: ' + context.delivery.id);
      const op = this._pendingMessageDictionary[context.delivery.id];
      if (op) {
        delete this._pendingMessageDictionary[context.delivery.id];
        if (op.callback) {
          /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_013: [If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`.]*/
          process.nextTick(() => op.callback(null, new results.MessageEnqueued()));
        }
      }
    };

    const attachedSenderRejectedHandler = (context: any): void => {
      const op = this._pendingMessageDictionary[context.delivery.id];
      if (op) {
        delete this._pendingMessageDictionary[context.delivery.id];
        if (op.callback) {
          /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_012: [If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service.]*/
          process.nextTick(() => op.callback(context.delivery.remote_state.error));
        }
      }
    };

    const attachedSenderSendableHandler = (): void => {
      this._fsm.handle('send');
    };

    const attachedSenderReleasedHandler = (context: any): void => {
      const op = this._pendingMessageDictionary[context.delivery.id];
      if (op) {
        delete this._pendingMessageDictionary[context.delivery.id];
        if (op.callback) {
          /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_012: [If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service.]*/
          throw new ArgumentError();
        }
      }
    };

    /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_006: [The `SenderLink` object should subscribe to the `sender_close` event of the newly created `rhea` link object.]*/
    /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_007: [The `SenderLink` object should subscribe to the `error` event of the newly created `rhea` link object.]*/
    manageAttachedSenderHandlers = (operation: string) => {
      if (this._linkObject) {
        this._linkObject[operation]('error', attachedSenderErrorHandler);
        this._linkObject[operation]('disconnected', attachedSenderDisconnectedHandler);
        this._linkObject[operation]('sender_close', attachedSenderCloseHandler);
        this._linkObject[operation]('accepted', attachedSenderAcceptedHandler);
        this._linkObject[operation]('rejected', attachedSenderRejectedHandler);
        this._linkObject[operation]('released', attachedSenderReleasedHandler);
        this._linkObject[operation]('sendable', attachedSenderSendableHandler);
      } else {
        debug('manage attached sender handlers called with no link object');
      }
    };

    this._fsm = new machina.Fsm({
      initialState: 'detached',
      namespace: 'senderlink',
      states: {
        detached: {
          _onEnter: (callback, err) => {
            let messageCallbackError = err || new Error('Link Detached');
            this._linkObject = null;
            debug('link detached: ' + this._linkAddress);
            debug('unsent message queue length: ' + this._unsentMessageQueue.length);
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_021: [If the link fails to attach and there are messages in the queue, the callback for each message shall be called with the error that caused the detach in the first place.]*/
            if (this._unsentMessageQueue.length > 0) {

              debug('dequeuing and failing unsent messages');
              let unsent = this._unsentMessageQueue.shift();
              while (unsent) {
                unsent.callback(messageCallbackError);
                unsent = this._unsentMessageQueue.shift();
              }
            }

            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_014: [If the link is detached while a message is being sent, the `callback` shall be called with an `Error` object describing the AMQP error that caused the detach to happen in the first place.]*/
            Object.keys(this._pendingMessageDictionary).forEach((pendingSend) => {
              let op = this._pendingMessageDictionary[pendingSend];
              delete this._pendingMessageDictionary[pendingSend];
              if (op.callback) {
                op.callback(messageCallbackError);
              }
            });

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
          send: () => {
            this._fsm.handle('attach');
          }
        },
        attaching: {
          _onEnter: (callback) => {
            let manageAttachingSenderHandlers: (operation: string) => void;
            const attachingSenderErrorHandler = (err) => {
              debug('In the error handler for the attaching sender');
              manageAttachingSenderHandlers('removeListener');
              this._fsm.transition('detached', callback, err);
            };
            const attachingSenderCloseHandler = (context) => {
              debug('In the close handler for attaching sender');
              manageAttachingSenderHandlers('removeListener');
              this._fsm.transition('detached', callback, context);
            };
            const attachingSenderDisconnectedHandler = (context) => {
              debug('In the disconnected handler for the attaching receiver');
              manageAttachingSenderHandlers('removeListener');
              this._fsm.transition('detached', callback, context);
            };
            const attachingSenderCancelHandler = (context) => {
              debug('In the cancel handler for attaching sender');
              manageAttachingSenderHandlers('removeListener');
              this._fsm.transition('detached', callback, context);
            };
            const attachingSenderOpenHandler = (context) => {
              debug('In the open handler for attaching sender');
              this._linkObject = context.sender;
              manageAttachingSenderHandlers('removeListener');
              manageAttachedSenderHandlers('on');
              this._fsm.transition('attached', callback);
            };
            manageAttachingSenderHandlers = (operation: string) => {
              if (this._amqpSession) {
                this._amqpSession[operation]('cancelAzureIotSdkAmqpAttaching', attachingSenderCancelHandler);
                this._amqpSession[operation]('sender_open', attachingSenderOpenHandler);
                this._amqpSession[operation]('sender_close', attachingSenderCloseHandler);
                this._amqpSession[operation]('disconnected', attachingSenderDisconnectedHandler);
                this._amqpSession[operation]('error', attachingSenderErrorHandler);
              } else {
                debug('manage sender attaching state handlers called with no session object');
              }
            };
            manageAttachingSenderHandlers('on');
            this._amqpSession.open_sender(this._combinedOptions);

            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_004: [The `attach` method shall use the stored instance of the `rhea` session object to attach a new link object with the combined `linkAddress` and `linkOptions` provided when creating the `SenderLink` instance.]*/
            debug('creating sender with rhea for: ' + this._linkAddress);
          },
          attach: (null),
          detach: (callback) => {
            this._amqpSession.emit('cancelAzureIotSdkAmqpAttaching');
            this._fsm.transition('detached', callback, new Error('detached while attaching'));
          },
          forceDetach: (err) => {
            this._amqpSession.emit('cancelAzureIotSdkAmqpAttaching');
            if (this._linkObject) {
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_025: [The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
              this._linkObject.remove();
            }
            this._fsm.transition('detached', undefined, err);
          },
          send: () => this._fsm.deferUntilTransition('send')
        },
        attached: {
          _onEnter: (callback) => {
            debug('link attached. processing unsent message queue');
            this._fsm.handle('send');
            if (callback) callback();
          },
          attach: (callback) => callback(),
          detach: (callback) => this._fsm.transition('detaching', callback),
          forceDetach: (err) => {
            if (this._linkObject) {
              manageAttachedSenderHandlers('removeListener');
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_025: [The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
              this._linkObject.remove();
            }
            this._fsm.transition('detached', undefined, err);
          },
          send: () => {
            while ((this._unsentMessageQueue.length > 0) && this._linkObject.sendable()) {
              let opToSend = this._unsentMessageQueue.shift();
              if (opToSend) {
                debug('sending message using underlying rhea link object');
                /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_010: [The `send` method shall use the link created by the underlying `rhea` transport to send the specified `message` to the IoT hub.]*/
                let sendDeliveryObject = this._linkObject.send(opToSend.message);
                this._pendingMessageDictionary[sendDeliveryObject.id] = opToSend;
              } else {
                break;
              }
            }
          }
        },
        detaching: {
          _onEnter: (callback, err) => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_023: [The `detach` method shall call the `callback` with the original `Error` that caused the detach whether it succeeds or fails to cleanly detach the link.]*/
            manageAttachedSenderHandlers('removeListener');
            let manageDetachingSenderHandlers: (operation: string) => void;
            if (this._linkObject) {
              const detachingSenderCloseHandler = (context) => {
                debug('sender normal detaching close callback entered ' + context);
                manageDetachingSenderHandlers('removeListener');
                this._fsm.transition('detached', callback, err);
              };
              const detachingSenderErrorHandler = (err) => {
                debug('sender normal detaching error callback entered ' + err);
                manageDetachingSenderHandlers('removeListener');
                this._fsm.transition('detached', callback, err);
              };
              const detachingSenderDisconnectedHandler = (context) => {
                debug('sender normal detaching disconnected callback entered ' + context);
                manageDetachingSenderHandlers('removeListener');
                this._fsm.transition('detached', callback, new Error('Disconnected'));
              };
              const detachingSenderCancelHandler = () => {
                debug('sender normal detaching cancel callback entered ');
                manageDetachingSenderHandlers('removeListener');
                this._fsm.transition('detached', callback, new Error('detaching cancelled'));
              };
              manageDetachingSenderHandlers = (operation: string) => {
                if (this._linkObject) {
                  this._linkObject[operation]('cancelAzureIotSdkAmqpDetaching', detachingSenderCancelHandler);
                  this._linkObject[operation]('sender_close', detachingSenderCloseHandler);
                  this._linkObject[operation]('error', detachingSenderErrorHandler);
                  this._linkObject[operation]('disconnected', detachingSenderDisconnectedHandler);
                } else {
                  debug('manage sender detaching state handlers called with no link object');
                }
              };
              manageDetachingSenderHandlers('on');
              this._linkObject.close_sender();
            } else {
              this._fsm.transition('detached', callback, err);
            }
          },
          detach: (null),
          forceDetach: (err) => {
            if (this._linkObject) {
              this._linkObject.emit('cancelAzureIotSdkAmqpDetaching');
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_025: [The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
              this._linkObject.remove();
            }
            this._fsm.transition('detached', undefined, err);
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
    this._unsentMessageQueue.push({
      message: message,
      callback: callback
    });
    this._fsm.handle('send');
  }
}
