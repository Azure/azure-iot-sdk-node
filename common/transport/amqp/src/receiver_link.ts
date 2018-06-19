import * as machina from 'machina';
import * as dbg from 'debug';
import { EventEmitter } from 'events';
import { errors, results } from 'azure-iot-common';
import { AmqpMessage } from './amqp_message';
import { AmqpLink } from './amqp_link_interface';

const debug = dbg('azure-iot-amqp-base:ReceiverLink');

interface DeliveryRecord {
  msg: AmqpMessage;
  delivery: any;
}

/**
 * @private
 * State machine used to manage AMQP receiver links
 *
 * @extends {EventEmitter}
 * @implements {AmqpLink}
 *
 * @fires ReceiverLink#message
 * @fires ReceiverLink#error
 */
/*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_002: [** The `ReceiverLink` class shall inherit from `EventEmitter`.]*/
/*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_003: [** The `ReceiverLink` class shall implement the `AmqpLink` interface.]*/
export class ReceiverLink  extends EventEmitter implements AmqpLink {
  private _linkAddress: string;
  private _linkOptions: any;
  private _linkObject: any;
  private _fsm: machina.Fsm;
  private _amqpSession: any;
  private _combinedOptions: any;
  private _unDisposedDeliveries: DeliveryRecord[];

  constructor(linkAddress: string, linkOptions: any, session: any) {
    super();
    this._linkAddress = linkAddress;
    this._linkOptions = linkOptions;
    this._amqpSession = session;
    this._unDisposedDeliveries = [];
    this._combinedOptions = {
      source: linkAddress
    };

    if (linkOptions) {
      for (let k in linkOptions) {
        this._combinedOptions[k] = linkOptions[k];
      }
    }

    let manageAttachedReceiverHandlers: (operation: string) => void;

    const attachedReceiverErrorHandler = (err: Error): void => {
      debug('handling error event: ' + err.toString());
      this._fsm.handle('forceDetach', err);
    };

    const attachedReceiverDisconnectedHandler = (err: Error): void => {
      debug('handling disconnected event: ' + err.toString());
      this._fsm.handle('forceDetach', err);
    };

    const attachedReceiverCloseHandler = (context: any): void => {
      debug('handling detach event: ' + JSON.stringify(context));
      this._fsm.handle('forceDetach', context);
    };

    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_012: [If a `message` event is emitted by the `rhea` link object, the `ReceiverLink` object shall emit a `message` event with the same content.]*/
    const attachedReceiverMessageHandler = (context: any): void => {
      this._unDisposedDeliveries.push({ msg: context.message, delivery: context.delivery});
      this.emit('message', context.message);
    };

    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_006: [The `ReceiverLink` object should subscribe to the `receiver_close` event of the newly created `rhea` link object.]*/
    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_007: [The `ReceiverLink` object should subscribe to the `error` event of the newly created `rhea` link object.]*/
    manageAttachedReceiverHandlers = (operation: string) => {
      if (this._linkObject) {
        this._linkObject[operation]('error', attachedReceiverErrorHandler);
        this._linkObject[operation]('disconnected', attachedReceiverDisconnectedHandler);
        this._linkObject[operation]('receiver_close', attachedReceiverCloseHandler);
        this._linkObject[operation]('message', attachedReceiverMessageHandler);
      } else {
        debug('manage attached receiver handlers called with no link object');
      }
    };

    this._fsm = new machina.Fsm({
      initialState: 'detached',
      namespace: 'receiverlink',
      states: {
        detached: {
          _onEnter: (callback, err) => {
            this._linkObject = null;

            if (callback) {
              callback(err);
            } else if (err) {
              /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_011: [If a `receiver_close` or `error` event is emitted by the `rhea` link object, the `ReceiverLink` object shall forward that error to the client.]*/
              this.emit('error', err);
            }
          },
          attach: (callback) => {
            this._fsm.transition('attaching', callback);
          },
          detach: (callback) => { this._safeCallback(callback); },
          forceDetach: () => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_028: [The `forceDetach` method shall return immediately if the link is already detached.]*/
            debug('forceDetach: link already detached');
            return;
          },
          accept: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          reject: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          abandon: (message, callback) => callback(new errors.DeviceMessageLockLostError())
        },
        attaching: {
          _onEnter: (callback) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_004: [The `attach` method shall use the stored instance of the `rhea` session object to attach a new link object with the combined `linkAddress` and `linkOptions` provided when creating the `ReceiverLink` instance.]*/
            debug('creating receiver with rhea for: ' + this._linkAddress);
            let manageAttachingReceiverHandlers: (operation: string) => void;
            const attachingReceiverErrorHandler = (context) => {
              debug('In the error handler for the attaching receiver');
              manageAttachingReceiverHandlers('removeListener');
              this._fsm.transition('detached', callback, context);
            };
            const attachingReceiverDisconnectedHandler = (context) => {
              debug('In the disconnected handler for the attaching receiver');
              manageAttachingReceiverHandlers('removeListener');
              this._fsm.transition('detached', callback, context);
            };
            const attachingReceiverCloseHandler = (context) => {
              debug('In the close handler for attaching receiver');
              manageAttachingReceiverHandlers('removeListener');
              this._fsm.transition('detached', callback, context);
            };
            const attachingReceiverCancelHandler = (context) => {
              debug('In the cancel handler for attaching receiver');
              manageAttachingReceiverHandlers('removeListener');
              this._fsm.transition('detached', callback, context);
            };
            const attachingReceiverOpenHandler = (context) => {
              debug('In the open handler for attaching receiver');
              this._linkObject = context.receiver;
              manageAttachingReceiverHandlers('removeListener');
              manageAttachedReceiverHandlers('on');
              this._fsm.transition('attached', callback);
            };
            manageAttachingReceiverHandlers = (operation: string) => {
              if (this._amqpSession) {
                this._amqpSession[operation]('cancelAzureIotSdkAmqpAttaching', attachingReceiverCancelHandler);
                this._amqpSession[operation]('receiver_open', attachingReceiverOpenHandler);
                this._amqpSession[operation]('receiver_close', attachingReceiverCloseHandler);
                this._amqpSession[operation]('disconnected', attachingReceiverDisconnectedHandler);
                this._amqpSession[operation]('error', attachingReceiverErrorHandler);
              } else {
                debug('manage receiver attaching state handlers called with no session object');
              }
            };
            manageAttachingReceiverHandlers('on');
            /*Codes_SRS_NODE_COMMON_AMQP_16_018: [The `attachReceiverLink` method shall call `createReceiver` on the `amqp10` client object.]*/
            this._amqpSession.open_receiver(this._combinedOptions);
          },
          attach: (null),
          detach: (callback) => {
            this._amqpSession.emit('cancelAzureIotSdkAmqpAttaching');
            this._fsm.transition('detached', callback, new Error('detached while attaching'));
          },
          forceDetach: (err) => {
            this._amqpSession.emit('cancelAzureIotSdkAmqpAttaching');
            if (this._linkObject) {
              this._linkObject.remove();
            }
            this._fsm.transition('detached', undefined, err);
          },
          accept: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          reject: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          abandon: (message, callback) => callback(new errors.DeviceMessageLockLostError())
        },
        attached: {
          _onEnter: (callback, err) => {
            this._safeCallback(callback, err);
          },
          attach: (callback) => {
            this._safeCallback(callback);
          },
          detach: (callback) => this._fsm.transition('detaching', callback),
          forceDetach: (err) => {
            if (this._linkObject) {
              manageAttachedReceiverHandlers('removeListener');
              /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_027: [** The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
              this._linkObject.remove();
            }
            this._fsm.transition('detached', undefined, err);
          },
          accept: (message, callback) => {
            let delivery = this._findDeliveryRecord(message);
            if (delivery) {
              /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_022: [** The `accept` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageCompleted` object if a callback is specified.]*/
              delivery.accept();
              this._safeCallback(callback, null, new results.MessageCompleted());
            } else {
              callback(new errors.DeviceMessageLockLostError());
            }
          },
          reject: (message, callback) => {
            let delivery = this._findDeliveryRecord(message);
            if (delivery) {
              /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_023: [** The `reject` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageRejected` object if a callback is specified.]*/
              delivery.reject();
              this._safeCallback(callback, null, new results.MessageRejected());
            } else {
              callback(new errors.DeviceMessageLockLostError());
            }
          },
          abandon: (message, callback) => {
            let delivery = this._findDeliveryRecord(message);
            if (delivery) {
              /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_024: [** The `abandon` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageAbandoned` object if a callback is specified.]*/
              delivery.release();
              this._safeCallback(callback, null, new results.MessageAbandoned());
            } else {
              callback(new errors.DeviceMessageLockLostError());
            }
          }
        },
        detaching: {
          _onEnter: (callback, err) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_025: [The `detach` method shall call the `callback` with an `Error` that caused the detach whether it succeeds or fails to cleanly detach the link.]*/
            if (this._linkObject) {
              manageAttachedReceiverHandlers('removeListener');
              let manageDetachingReceiverHandlers: (operation: string) => void;
              if (this._linkObject) {
                const detachingReceiverCloseHandler = (context) => {
                  debug('receiver normal detaching close callback entered ' + context);
                  manageDetachingReceiverHandlers('removeListener');
                  this._fsm.transition('detached', callback, err);
                };
                const detachingReceiverErrorHandler = (err) => {
                  debug('receiver normal detaching error callback entered ' + err);
                  manageDetachingReceiverHandlers('removeListener');
                  this._fsm.transition('detached', callback, err);
                };
                const detachingReceiverDisconnectedHandler = (context) => {
                  debug('receiver normal detaching disconnected callback entered ' + context);
                  manageDetachingReceiverHandlers('removeListener');
                  this._fsm.transition('detached', callback, new Error('Disconnected'));
                };
                const detachingReceiverCancelHandler = () => {
                  debug('receiver normal detaching cancel callback entered ');
                  manageDetachingReceiverHandlers('removeListener');
                  this._fsm.transition('detached', callback, new Error('detaching cancelled'));
                };
                manageDetachingReceiverHandlers = (operation: string) => {
                  if (this._linkObject) {
                    this._linkObject[operation]('cancelAzureIotSdkAmqpDetaching', detachingReceiverCancelHandler);
                    this._linkObject[operation]('receiver_close', detachingReceiverCloseHandler);
                    this._linkObject[operation]('error', detachingReceiverErrorHandler);
                    this._linkObject[operation]('disconnected', detachingReceiverDisconnectedHandler);
                  } else {
                    debug('manage sender detaching state handlers called with no link object');
                  }
                };
                manageDetachingReceiverHandlers('on');
                this._linkObject.close_receiver();
              } else {
                this._fsm.transition('detached', callback, err);
              }
            } else {
              this._fsm.transition('detached', callback, err);
            }
          },
          detach: (null),
          forceDetach: (err) => {
            if (this._linkObject) {
              this._linkObject.emit('cancelAzureIotSdkAmqpDetaching');
              this._linkObject.remove();
            }
            this._fsm.transition('detached', undefined, err);
          },
          '*': () => this._fsm.deferUntilTransition('detached')
        }
      }
    });

    this.on('removeListener', (eventName) => {
      // stop listening for AMQP events if our consumers stop listening for our events
      if (eventName === 'message' && this.listeners('message').length === 0) {
        this._fsm.handle('detach');
      }
    });

    this.on('newListener', (eventName) => {
      // lazy-init AMQP event listeners
      if (eventName === 'message') {
        this._fsm.handle('attach');
      }
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

  accept(message: AmqpMessage, callback?: (err?: Error, result?: results.MessageCompleted) => void): void {
    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_021: [The `accept` method shall throw if the `message` argument is falsy.]*/
    if (!message) { throw new ReferenceError('Invalid message object.'); }
    this._fsm.handle('accept', message, callback);
  }

  /**
   * @deprecated Use accept(message, callback) instead (to adhere more closely to the AMQP10 lingo).
   */
  complete(message: AmqpMessage, callback?: (err?: Error, result?: results.MessageCompleted) => void): void {
    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_015: [The `complete` method shall call the `accept` method with the same arguments (it is here for backward compatibility purposes only).]*/
    this.accept(message, callback);
  }

  reject(message: AmqpMessage, callback?: (err?: Error, result?: results.MessageRejected) => void): void {
    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_021: [The `reject` method shall throw if the `message` argument is falsy.]*/
    if (!message) { throw new ReferenceError('Invalid message object.'); }
    this._fsm.handle('reject', message, callback);
  }

  abandon(message: AmqpMessage, callback?: (err?: Error, result?: results.MessageAbandoned) => void): void {
    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_021: [The `abandon` method shall throw if the `message` argument is falsy.]*/
    if (!message) { throw new ReferenceError('Invalid message object.'); }
    this._fsm.handle('abandon', message, callback);
  }

  private _findDeliveryRecord(msg: AmqpMessage): any {
    for (let element = 0; element < this._unDisposedDeliveries.length; element++) {
      if (this._unDisposedDeliveries[element].msg === msg) {
        let delivery = this._unDisposedDeliveries[element].delivery;
        this._unDisposedDeliveries.splice(element, 1);
        return delivery;
      }
    }
    return undefined;
  }
  private _safeCallback(callback: (err?: Error, result?: any) => void, error?: Error | null, result?: any): void {
    if (callback) {
      process.nextTick(() => callback(error, result));
    }
  }
}
