import * as machina from 'machina';
import * as dbg from 'debug';
import * as uuid from 'uuid';
import { EventEmitter } from 'events';
import { EventContext, AmqpError, Session, Receiver, ReceiverOptions, Delivery } from 'rhea';
import { errors, results } from 'azure-iot-common';
import { AmqpMessage } from './amqp_message';
import { AmqpLink } from './amqp_link_interface';

const debug = dbg('azure-iot-amqp-base:ReceiverLink');

interface DeliveryRecord {
  msg: AmqpMessage;
  delivery: Delivery;
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
  private _linkOptions: ReceiverOptions;
  private _rheaReceiver: Receiver;
  private _fsm: machina.Fsm;
  private _rheaSession: Session;
  //
  // We want to know if a detach has already occurred, having been sent by the peer.  We will want to send a matching
  // detach but we can't expect a reply to it.
  //
  private _receiverCloseOccurred: boolean = false;
  //
  // The following to fields contain the callbacks that were sent in to request the attach/detach.  Since
  // the work will be completed by event listeners, we needed a place to keep the callback for access
  // within the handler.
  //
  private _attachingCallback: (err: Error | AmqpError, result?: any) => void;
  private _detachingCallback: (err: Error | AmqpError, result?: any) => void;
  //
  // Used to hold onto an error that was indicated by a receiver_error event.  The error will be utilized
  // by the receiver_close code when it transitioning and calling back to the owner of the ReceiverLink.
  //
  private _indicatedError: Error | AmqpError;
  //
  // Create a name to uniquely identify the link.  Used for debugging purposes now.  If necessary it could
  // be used to distinguish receivers.
  //
  private _rheaReceiverName: string;
  private _combinedOptions: ReceiverOptions;
  //
  // When we receive a message from the service we send it up to the application.  We have no say as to how we
  // dispose of the message.
  //
  // We need for the application to indicate the disposition.
  //
  // We create a dictionary that is keyed by the amqpMessage.  The value of the dictionary is the delivery record associated
  // (by rhea) of this message.
  //
  // So when a message is received we place in the dictionary.  When the application settles the message by accepting, abandoning or rejecting,
  // it sends back down the message, we look it up in the dictionary, remove it if found, and issue the disposition.  Note we will
  // indicate an error to the callback (if provided), if we can't find the item in the dictionary.
  //
  // Note also, if the application does NOT provide an indication on what to do with the message this dictionary will NOT
  // remove the item.  This, could be considered a leak.  If so, we could implement a cleaner for the list.  However, for
  // now this is treated as an application error.
  //
  private _undisposedDeliveries: DeliveryRecord[];

  constructor(linkAddress: string, linkOptions: ReceiverOptions, session: Session) {
    super();
    this._linkAddress = linkAddress;
    this._linkOptions = linkOptions;
    this._rheaSession = session;
    this._undisposedDeliveries = [];
    this._combinedOptions = {
      source: linkAddress
    };

    if (linkOptions) {
      for (let k in linkOptions) {
        this._combinedOptions[k] = linkOptions[k];
      }
    }

    const receiverOpenHandler = (context: EventContext): void => {
      this._fsm.handle('receiverOpenEvent', context);
    };
    const receiverCloseHandler = (context: EventContext): void => {
      this._fsm.handle('receiverCloseEvent', context);
    };
    const receiverErrorHandler  = (context: EventContext): void => {
        this._fsm.handle('receiverErrorEvent', context);
    };

    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_012: [If a `message` event is emitted by the `rhea` link object, the `ReceiverLink` object shall emit a `message` event with the same content.]*/
    const receiverMessageHandler = (context: EventContext): void => {
      this._undisposedDeliveries.push({msg: context.message as any, delivery: context.delivery});
      this.emit('message', context.message);
    };

    const manageReceiverHandlers = (operation: string) => {
      this._rheaReceiver[operation]('receiver_error', receiverErrorHandler);
      this._rheaReceiver[operation]('receiver_close', receiverCloseHandler);
      this._rheaReceiver[operation]('receiver_open', receiverOpenHandler);
      this._rheaReceiver[operation]('message', receiverMessageHandler);
    };

    this._fsm = new machina.Fsm({
      /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_001: [The `ReceiverLink` internal state machine shall be initialized in the `detached` state.]*/
      initialState: 'detached',
      namespace: 'receiverLink',
      states: {
        detached: {
          _onEnter: (callback, err) => {
            this._rheaReceiver = null;
            this._rheaReceiverName = null;

            if (callback) {
              this._safeCallback(callback,err);
            } else if (err) {
              /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_011: [If a `receiver_close` or `receiver_error` event is emitted by the `rhea` link object, the `ReceiverLink` object shall forward that error to the client.]*/
              this.emit('error', err);
            }
          },
          attach: (callback) => {
            this._fsm.transition('attaching', callback);
          },
          detach: (callback, err) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_004: [If the `ReceiverLink` is already in the detached state an invocation of `detach` shall immediately invoke the callback with the (potentially) supplied error parameter.] */
            debug('while detached - detach for receiver link ' + this._linkAddress);
            this._safeCallback(callback, err);
          },
          forceDetach: () => {
            debug('while detached - force detach for receiver link ' + this._linkAddress);
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_028: [The `forceDetach` method shall return immediately if the link is already detached.]*/
            return;
          },
          accept: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          reject: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          abandon: (message, callback) => callback(new errors.DeviceMessageLockLostError())
        },
        attaching: {
          _onEnter: (callback) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_004: [The `attach` method shall use the stored instance of the `rhea` session object to attach a new link object with the combined `linkAddress` and `linkOptions` provided when creating the `ReceiverLink` instance.]*/
            this._attachingCallback = callback;
            this._indicatedError = undefined;
            this._receiverCloseOccurred = false;
            this._rheaReceiverName = 'rheaReceiver_' + uuid.v4();
            this._combinedOptions.name = this._rheaReceiverName;
            debug('attaching receiver name: ' + this._rheaReceiverName + ' with address: ' + this._linkAddress);
            //
            // According to the rhea maintainers, one can depend on that fact that no actual network activity
            // will occur until the nextTick() after the call to open_receiver.  Because of that, one can
            // put the event handlers on the rhea link returned from the open_receiver call and be assured
            // that the listeners are in place BEFORE any possible events will be emitted on the link.
            //
            this._rheaReceiver = this._rheaSession.open_receiver(this._combinedOptions);
            manageReceiverHandlers('on');
          },
          receiverOpenEvent: (context: EventContext) => {
            debug('In receiver attaching state - open event for ' + context.receiver.name);
            let callback = this._attachingCallback;
            this._attachingCallback = null;
            this._fsm.transition('attached', callback);
          },
          receiverErrorEvent: (context: EventContext) => {
            debug('In receiver attaching state - error event for ' + context.receiver.name + ' error is: ' + this._getErrorName(context.receiver.error));
            this._indicatedError = context.receiver.error;
            //
            // We don't transition at this point in that we are guaranteed that the error will be followed by a receiver_close
            // event.
            //
          },
          receiverCloseEvent: (context: EventContext) => {
            debug('in receiver attaching state - close event for ' + context.receiver.name);
            //
            // We enabled the event listeners on the onEnter handler.  They are to stay alive until we
            // are about to transition to the detached state.
            // We are about to transition to the detached state, so clean up.
            //
            manageReceiverHandlers('removeListener');
            let error = this._indicatedError;
            let callback = this._attachingCallback;
            this._indicatedError = undefined;
            this._attachingCallback = undefined;
            this._receiverCloseOccurred = true;
            this._fsm.transition('detached', callback, error);
          },
          attach: (null),
          detach: (callback, err) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_002: [If the `detach` method is invoked on the `ReceiverLink` while still attaching, the ReceiverLink shall detach.  It will indicate the error to the callback for the `detach` as well as the callback to the `attach`.] */
            debug('Detaching while attaching of rhea receiver link ' + this._linkAddress);
            manageReceiverHandlers('removeListener');
            //
            // We may have a callback outstanding from the request that started the attaching.
            // We will signal to that callback that an error occurred. We will also invoke the callback supplied
            // for this detach.
            //
            let error = err || this._indicatedError || new Error('Unexpected link detach while attaching');
            let attachingCallback = this._attachingCallback;
            this._indicatedError = undefined;
            this._attachingCallback = undefined;
            if (attachingCallback) {
              attachingCallback(error);
            }
            this._fsm.transition('detached', callback, error);
          },
          forceDetach: (err) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_003: [If the `forceDetach` method is invoked on the `ReceiverLink` while still attaching, the ReceiverLink shall detach.  With the error supplied to the forceDetach, the `attach` callback will also be invoked.  If the error is NOT falsy it will also be emitted as the argument to the `error` event.] */
            debug('Force detaching while attaching of rhea receiver link ' + this._linkAddress);
            manageReceiverHandlers('removeListener');
            let error = err || this._indicatedError;
            let attachingCallback = this._attachingCallback;
            this._indicatedError = undefined;
            this._attachingCallback = undefined;
            attachingCallback(error);
            this._fsm.transition('detached', undefined, error);
          },
          accept: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          reject: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          abandon: (message, callback) => callback(new errors.DeviceMessageLockLostError())
        },
        attached: {
          _onEnter: (callback, err) => {
            if (callback) callback(err);
          },
          receiverErrorEvent: (context: EventContext) => {
            debug('in receiver attached state - error event for ' + context.receiver.name + ' error is: ' + this._getErrorName(context.receiver.error));
            this._indicatedError = context.receiver.error;
            //
            // We don't transition at this point in that we are guaranteed that the error will be followed by a receiver_close
            // event.
            //
          },
          receiverCloseEvent: (context: EventContext) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_009: [If a `receiver_close` event received with no preceding error, the link shall be closed with no error.] */
            //
            // We have a close (which is how the amqp detach performative is surfaced). It could be because of an error that was
            // already indicated by the receiver_error event. Or it could simply be that for some reason (disconnect tests?)
            // the service side had decided to shut down the link.
            //
            let error = this._indicatedError; // This might be undefined.
            this._indicatedError = undefined;
            this._receiverCloseOccurred = true;
            debug('in receiver attached state - close event for ' + context.receiver.name + ' already indicated error is: ' + this._getErrorName(error));
            if (error) {
              context.container.emit('azure-iot-amqp-base:error-indicated', error);
            } else {
              this._fsm.transition('detaching');
            }
          },
          attach: (callback) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_001: [The `attach` method shall immediately invoke the `callback` if already in an attached state.] */
            this._safeCallback(callback);
          },
          detach: (callback, err) => {
            debug('while attached - detach for receiver link ' + this._linkAddress + ' callback: ' + callback + ' error: ' + this._getErrorName(err));
            this._fsm.transition('detaching', callback, err);
          },
          forceDetach: (err) => {
            debug('while attached - force detach for receiver link ' + this._linkAddress);
            manageReceiverHandlers('removeListener');
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_027: [** The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
            this._rheaReceiver.remove();
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_008: [The `forceDetach` method shall cause an `error` event to be emitted on the `ReceiverLink` if an error is supplied.] */
            this._fsm.transition('detached', undefined, err);
          },
          accept: (message, callback) => {
            let delivery = this._findDeliveryRecord(message);
            if (delivery) {
              /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_022: [** The `accept` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageCompleted` object if a callback is specified.]*/
              delivery.accept();
              this._safeCallback(callback, null, new results.MessageCompleted());
            } else {
              this._safeCallback(callback, new errors.DeviceMessageLockLostError());
            }
          },
          reject: (message, callback) => {
            let delivery = this._findDeliveryRecord(message);
            if (delivery) {
              /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_023: [** The `reject` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageRejected` object if a callback is specified.]*/
              delivery.reject();
              this._safeCallback(callback, null, new results.MessageRejected());
            } else {
              this._safeCallback(callback, new errors.DeviceMessageLockLostError());
            }
          },
          abandon: (message, callback) => {
            let delivery = this._findDeliveryRecord(message);
            if (delivery) {
              /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_024: [** The `abandon` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageAbandoned` object if a callback is specified.]*/
              delivery.release();
              this._safeCallback(callback, null, new results.MessageAbandoned());
            } else {
              this._safeCallback(callback, new errors.DeviceMessageLockLostError());
            }
          }
        },
        detaching: {
          _onEnter: (callback, err) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_025: [The `detach` method shall call the `callback` with an `Error` that caused the detach whether it succeeds or fails to cleanly detach the link.]*/
            debug('Detaching of rhea receiver link ' + this._linkAddress);
            this._detachingCallback = callback;
            this._indicatedError = err;
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_009: [The `detach` method shall detach the link created by `rhea` object.] */
            this._rheaReceiver.close();
            if (this._receiverCloseOccurred) {
              //
              // There will be no response from the peer to our detach (close).  Therefore no event handler will be invoked.  Simply
              // transition to detached now.
              //
              this._detachingCallback = undefined;
              this._indicatedError = undefined;
              this._fsm.transition('detached', callback, err);
            }
          },
          receiverErrorEvent: (context: EventContext) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_006: [An error occurring during a detach will be indicated in the error result of the `detach`.] */
            debug('in receiver detaching state - error event for ' + context.receiver.name + ' error is: ' + this._getErrorName(context.receiver.error));
            this._indicatedError = this._indicatedError || context.receiver.error;
            //
            // We don't transition at this point in that we are guaranteed that the error will be followed by a receiver_close
            // event.
            //
          },
          receiverCloseEvent: (context: EventContext) => {
            debug('in receiver detaching state - close event for ' + context.receiver.name + ' already indicated error is: ' + this._getErrorName(this._indicatedError));
            let error = this._indicatedError;
            let callback = this._detachingCallback;
            this._detachingCallback = undefined;
            this._indicatedError = undefined;
            manageReceiverHandlers('removeListener');
            this._fsm.transition('detached', callback, error);
          },
          detach: (callback, err) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_007: [If `detach` invoked while already detaching, it's callback will be invoked with an error.  Whatever caused the original detaching will proceed.] */
            //
            // Note that we are NOT transitioning to the detached state.
            // We are going to give the code a chance to complete normally.
            // The caller was free to invoke forceDetach.  That handler will
            // ALWAYS transition to the detached state.
            //
            debug('while detaching - detach for receiver link ' + this._linkAddress);
            if (callback) {
              err = err || new Error('Detached invoked while detaching.');
              this._safeCallback(callback, err);
            }
          },
          forceDetach: (err) => {
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_005: [If `forceDetach` invoked while detaching, the detach will be completed with the error supplied to the `forceDetach` or an error indicating that the `detach` was preempted by the `forceDetach`.] */
            debug('while detaching - Force detaching for receiver link ' + this._linkAddress);
            this._rheaReceiver.remove();
            let detachCallback = this._detachingCallback;
            let error = err || this._indicatedError || new Error('Detach preempted by force');
            this._detachingCallback = undefined;
            this._indicatedError = undefined;
            manageReceiverHandlers('removeListener');
            if (detachCallback) {
              detachCallback(error);
            }
            this._fsm.transition('detached', undefined, err);
          },
          '*': () => {
            this._fsm.deferUntilTransition('detached');
          }
        }
      }
    });

    this._fsm.on('transition', (transition) => {
      debug(transition.fromState + ' -> ' + transition.toState + ' (action:' + transition.action + ')');
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

  detach(callback: (err?: Error) => void, err?: Error | AmqpError): void {
    this._fsm.handle('detach', callback, err);
  }

  forceDetach(err?: Error | AmqpError): void {
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

  private _findDeliveryRecord(msg: AmqpMessage): Delivery {
    for (let element = 0; element < this._undisposedDeliveries.length; element++) {
      if (this._undisposedDeliveries[element].msg === msg) {
        let delivery = this._undisposedDeliveries[element].delivery;
        this._undisposedDeliveries.splice(element, 1);
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

  private _getErrorName(err: any): string {
    if (err) {
      if (err.condition) {
        return '(amqp error) ' + err.condition;
      } else if (err.name) {
        return '(javascript error) ' + err.name;
      } else {
        return 'unknown error type';
      }
    } else {
      return 'error is falsy';
    }
  }

}
