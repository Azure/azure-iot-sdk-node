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
  // Create a name to uniquely identify the link.  While not currently useful, it could be used to distinguish
  // whether an event is for this receiver.  If the event handlers were on the session object and not
  // directly on the link, this would be necessary.
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
  // So when a message is received we place in the dictionary.  When the application sends back down the message we look it up
  // in the dictionary, remove it if found, and issue the disposition.  Note we will indicate an error to the callback (if provided),
  // if we can't find the item in the dictionary.
  //
  // Note also, if the application does NOT provide an indication on what to do with the message this dictionary will NOT
  // remove the item.  This, could be considered a leak.  If so, we could implement a cleaner for the list.  However, for
  // now this is treated as an application error.
  //
  private _unDisposedDeliveries: DeliveryRecord[];

  constructor(linkAddress: string, linkOptions: ReceiverOptions, session: Session) {
    super();
    this._linkAddress = linkAddress;
    this._linkOptions = linkOptions;
    this._rheaSession = session;
    this._unDisposedDeliveries = [];
    this._combinedOptions = {
      source: linkAddress
    };

    if (linkOptions) {
      for (let k in linkOptions) {
        this._combinedOptions[k] = linkOptions[k];
      }
    }

    const receiverOpenHandler = (context: EventContext): void => {
      if (context.receiver.name === this._rheaReceiverName) {
        debug('handling receiver_open event for link: ' + context.receiver.name + 'source: ' + context.receiver.source.address);
        this._fsm.handle('receiverOpenEvent', context);
      } else {
        debug('the receiver open event is not for ' + this._linkAddress);
      }
    };
    const receiverCloseHandler = (context: EventContext): void => {
      if (context.receiver.name === this._rheaReceiverName) {
        debug('handling receiver_close event for link: ' + context.receiver.name + 'source: ' + context.receiver.source.address);
        this._fsm.handle('receiverCloseEvent', context);
      } else {
        debug('the receiver close event is not for ' + this._linkAddress);
      }
    };
    const receiverErrorHandler  = (context: EventContext): void => {
      if (context.receiver.name === this._rheaReceiverName) {
        debug('handling receiver_error event for link: ' + context.receiver.name + 'source: ' + context.receiver.source.address);
        this._fsm.handle('receiverErrorEvent', context);
      } else {
        debug('the receiver error event is not for ' + this._linkAddress);
      }
    };

    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_012: [If a `message` event is emitted by the `rhea` link object, the `ReceiverLink` object shall emit a `message` event with the same content.]*/
    const receiverMessageHandler = (context: EventContext): void => {
      if (context.receiver.name === this._rheaReceiverName) {
        debug('handling message event for link: ' + context.receiver.name + 'source: ' + context.receiver.source.address + ' for deliveryId: ' + context.delivery.id);
        this._unDisposedDeliveries.push({msg: context.message as any, delivery: context.delivery});
        this.emit('message', context.message);
      } else {
        debug('the receiver message event is not for ' + this._linkAddress);
      }
    };

    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_006: [The `ReceiverLink` object should subscribe to the `receiver_close` event of the newly created `rhea` link object.]*/
    /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_007: [The `ReceiverLink` object should subscribe to the `error` event of the newly created `rhea` link object.]*/
    const manageReceiverHandlers = (operation: string) => {
      this._rheaReceiver[operation]('receiver_error', receiverErrorHandler);
      this._rheaReceiver[operation]('receiver_close', receiverCloseHandler);
      this._rheaReceiver[operation]('receiver_open', receiverOpenHandler);
      this._rheaReceiver[operation]('message', receiverMessageHandler);
    };

    this._fsm = new machina.Fsm({
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
            // This could make one feel a bit queasy.  If so, or if the interface gets changed and we
            // can't depend on that anymore, the easy fix would be to move the call to manageReceiverHandlers
            // to before the call to open_receiver and change the implementation of manageReceiverHandler to
            // place the handlers on the session object instead of the link object.  The event handlers have
            // been written to deal with this appropriately.
            //
            this._rheaReceiver = this._rheaSession.open_receiver(this._combinedOptions);
            manageReceiverHandlers('on');
          },
          receiverOpenEvent: (context: EventContext) => {
            debug('In receiver attaching state - open event for ' + context.receiver.name);
            if (this._rheaReceiver !== context.receiver) {
              debug('the receiver provided in the open no equal to the receiver returned from open_receiver');
            }
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
          detach: (callback) => {
            debug('Detaching while attaching of rhea receiver link ' + this._linkAddress);
            manageReceiverHandlers('removeListener');
            //
            // We may have a callback outstanding on the request that started the attaching.
            // We will signal to that callback that an error occurred. We will also invoke the callback supplied
            // for this detach.
            //
            let error = this._indicatedError || new Error('Unexpected link detach while attaching');
            let attachingCallback = this._attachingCallback;
            this._indicatedError = undefined;
            this._attachingCallback = undefined;
            if (attachingCallback) {
              attachingCallback(error);
            }
            this._fsm.transition('detached', callback, error);
          },
          forceDetach: (err) => {
            debug('Force detaching while attaching of rhea receiver link ' + this._linkAddress);
            manageReceiverHandlers('removeListener');
            let error = err || this._indicatedError || new Error('Unexpected link detach while attaching');
            let attachingCallback = this._attachingCallback;
            this._indicatedError = undefined;
            this._attachingCallback = undefined;
            if (attachingCallback) {
              this._safeCallback(attachingCallback, error);
            }
            this._fsm.transition('detached', undefined, error);
          },
          accept: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          reject: (message, callback) => callback(new errors.DeviceMessageLockLostError()),
          abandon: (message, callback) => callback(new errors.DeviceMessageLockLostError())
        },
        attached: {
          _onEnter: (callback, err) => {
            this._safeCallback(callback, err);
          },
          receiverOpenEvent: (context: EventContext) => {
            debug('in receiver attached state - open event for ' + context.receiver.name);
            debug('this simply should not happen!');
            this._fsm.transition('detaching', null, new Error('Open receiver while already attached!'));
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
            this._safeCallback(callback);
          },
          detach: (callback, err) => {
            debug('while attached - detach for receiver link ' + this._linkAddress + ' callback: ' + callback + ' error: ' + this._getErrorName(err));
            this._fsm.transition('detaching', callback, err);
          },
          forceDetach: (err) => {
            debug('while attached - force detach for receiver link ' + this._linkAddress);
            manageReceiverHandlers('removeListener');
            if (this._rheaReceiver) {
              /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_027: [** The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
              this._rheaReceiver.remove();
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
          receiverOpenEvent: (context: EventContext) => {
            debug('in receiver detaching state - open event for ' + context.receiver.name);
            debug('this simply should not happen!');
          },
          receiverErrorEvent: (context: EventContext) => {
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
            debug('while detaching - Force detaching for receiver link ' + this._linkAddress);
            this._rheaReceiver.remove();
            this._detachingCallback = undefined;
            this._indicatedError = undefined;
            manageReceiverHandlers('removeListener');
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

  detach(callback: (err?: Error) => void, err?: Error | AmqpError): void {
    this._fsm.handle('detach', callback);
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

  private _getErrorName(err: any): string {
    if (err) {
      if (err.condition) {
        return '(amqp error) ' + err.condition;
      } else if (err.hasOwnProperty('name')) {
        return '(javascript error) ' + err.name;
      } else {
        return 'this is not an error type I understand';
      }
    } else {
      return 'error is falsy';
    }
  }

}
