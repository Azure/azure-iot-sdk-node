import * as machina from 'machina';
import * as dbg from 'debug';
import * as uuid from 'uuid';
import { EventEmitter } from 'events';
import { EventContext, AmqpError, Session, Sender, SenderOptions } from 'rhea';
import { results } from 'azure-iot-common';
import { AmqpMessage } from './amqp_message';
import { AmqpLink } from './amqp_link_interface';

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
  //
  // If an error is sent by the peer (the IoT Hub service), *WHILE* the link is in the attached state,
  // this sender link will emit an error on the container object (rhea parent object) of 'azure-iot-amqp-base:error-indicated'.
  // Note that this SenderLink WILL NOT change states at this point.  It is left to the user of this SenderLink to invoke
  // the .detach method.  THAT call will cause us to transition to the detached state.
  //
  // While perhaps a non-intuitive workflow, there was quite a bit of dependency in the upper levels that required this behavior.
  // One rationalization for this strategy is that we really want this error condition to be signaled on the link itself rather
  // that via the individual send operations.  This also causes the rundown to be done in a top-down fashion as opposed to
  // bottom-up.
  //
  // Note also that errors will always be indicated in rhea on a link basis.
  //
  private _linkAddress: string;
  private _rheaSender: Sender;
  private _fsm: machina.Fsm;
  private _rheaSession: Session;
  private _combinedOptions: SenderOptions;
  //
  // We want to know if a detach has already occurred, having been sent by the peer.  We will want to send a matching
  // detach but we can't expect a reply to it.
  //
  private _senderCloseOccurred: boolean = false;
  //
  // The following two fields contain the callbacks that were sent in to request the attach/detach.  Since
  // the work will be completed by event listeners, we needed a place to keep the callback for access
  // within the handler.
  //
  private _attachingCallback: (err: Error, result?: any) => void;
  private _detachingCallback: (err: Error, result?: any) => void;
  //
  // Used to hold onto an error that was indicated by a sender_error event.  The error will be utilized
  // by the sender_close code when it transitioning and calling back to the owner of the SenderLink.
  //
  private _indicatedError: Error | AmqpError;
  //
  // Create a name to uniquely identify the link.  Used for debugging purposes now.  If necessary it could
  // be used to distinguish senders.
  //
  private _rheaSenderName: string;
  //
  // This array acts as an queue on messages that are to send.  We push new sends, thus then are at the end of the array.
  // When sending we shift (thus getting the oldest element).  Note that the shift removes the first element from the array.
  // The items in the array are an object that contains the actual amqp message and the callback (possibly null) associated
  // with the message.
  //
  private _unsentMessageQueue: MessageOperation[];
  //
  // As each message is sent we get a delivery object back from rhea.  That delivery object contains a delivery id.
  // We use this delivery id as the key to a following dictionary.  We do this so that when we receive a disposition,
  // which contains a delivery id, from the server we can get look up the callback associated with the send being disposed.
  // Note that we won't insert into the dictionary if the message is sent pre-settled.
  // Note that we use the same object for values of this dictionary as for the unsent message queue.
  //
  private _pendingMessageDictionary: {[key: number]: MessageOperation};

  constructor(linkAddress: string, linkOptions: SenderOptions, session: Session) {
    super();
    this._linkAddress = linkAddress;
    this._rheaSession = session;
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

    const senderOpenHandler = (context: EventContext): void => {
      this._fsm.handle('senderOpenEvent', context);
    };

    const senderCloseHandler = (context: EventContext): void => {
      this._fsm.handle('senderCloseEvent', context);
    };

    const senderErrorHandler = (context: EventContext): void => {
      debug('handling error event: ' + this._getErrorName(context.sender.error));
      this._fsm.handle('senderErrorEvent', context);
    };

    const senderAcceptedHandler = (context: EventContext): void => {
      this._fsm.handle('senderAcceptedEvent', context);
    };

    const senderRejectedHandler = (context: EventContext): void => {
      this._fsm.handle('senderRejectedEvent', context);
    };

    const senderSendableHandler = (context: EventContext): void => {
      this._fsm.handle('send');
    };

    const senderReleasedHandler = (context: EventContext): void => {
      this._fsm.handle('senderReleasedEvent', context);
    };

    const manageSenderHandlers = (operation: string) => {
      this._rheaSender[operation]('sender_error', senderErrorHandler);
      this._rheaSender[operation]('sender_open', senderOpenHandler);
      this._rheaSender[operation]('sender_close', senderCloseHandler);
      this._rheaSender[operation]('accepted', senderAcceptedHandler);
      this._rheaSender[operation]('rejected', senderRejectedHandler);
      this._rheaSender[operation]('released', senderReleasedHandler);
      this._rheaSender[operation]('sendable', senderSendableHandler);
    };

    this._fsm = new machina.Fsm({
      /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_001: [The `SenderLink` internal state machine shall be initialized in the `detached` state.]*/
      initialState: 'detached',
      namespace: 'senderLink',
      states: {
        detached: {
          _onEnter: (callback, err) => {
            let messageCallbackError = err || new Error('Link Detached');
            this._rheaSender = null;
            this._rheaSenderName = null;
            debug('link detached: ' + this._linkAddress);
            debug('unsent message queue length: ' + this._unsentMessageQueue.length);
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_021: [If the link fails to attach and there are messages in the queue, the callback for each message shall be called with the error that caused the detach in the first place.]*/
            if (this._unsentMessageQueue.length > 0) {

              debug('dequeuing and failing unsent messages');
              let unsent = this._unsentMessageQueue.shift();
              while (unsent) {
                if (unsent.callback) {
                  unsent.callback(messageCallbackError);
                }
                unsent = this._unsentMessageQueue.shift();
              }
            }

            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_014: [If the link is detached while a message is being sent, the `callback` shall be called with an `Error` object describing the AMQP error that caused the detach to happen in the first place.] */
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
              this.emit('error', err);
            }
          },
          /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_011: [If the state machine is not in the `attached` state, the `SenderLink` object shall attach the link first and then send the message.]*/
          attach: (callback) => this._fsm.transition('attaching', callback),
          detach: (callback, err) => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_005: [If the `SenderLink` is already in the detached state an invocation of `detach` shall immediately invoke the callback with the (potentially) supplied error parameter.] */
            debug('detach: link already detached');
            callback(err);
          },
          forceDetach: () => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_026: [The `forceDetach` method shall return immediately if the link is already detached.] */
            debug('forceDetach: link already detached');
            return;
          },
          send: () => {
            if (this._unsentMessageQueue.length > 0) {
              //
              // We are depending on the attach path to process the send queue when it is done attaching.
              //
              this._fsm.handle('attach');
            }
          }
        },
        attaching: {
          _onEnter: (callback) => {
            this._attachingCallback = callback;
            this._indicatedError = undefined;
            this._senderCloseOccurred = false;
            this._rheaSenderName = 'rheaSender_' + uuid.v4();
            this._combinedOptions.name = this._rheaSenderName;
            debug('attaching sender name: ' + this._rheaSenderName + ' with address: ' + this._linkAddress);
            //
            // According to the rhea maintainers, one can depend on that fact that no actual network activity
            // will occur until the nextTick() after the call to open_sender.  Because of that, one can
            // put the event handlers on the rhea link returned from the open_sender call and be assured
            // that the listeners are in place BEFORE any possible events will be emitted on the link.
            //
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_004: [The `attach` method shall use the stored instance of the `rhea` session object to attach a new link object with the combined `linkAddress` and `linkOptions` provided when creating the `SenderLink` instance.] */
            this._rheaSender = this._rheaSession.open_sender(this._combinedOptions);
            manageSenderHandlers('on');
          },
          senderOpenEvent: (context: EventContext) => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_022: [The `attach` method shall call the `callback` if the link was successfully attached.] */
            let callback = this._attachingCallback;
            this._attachingCallback = null;
            this._fsm.transition('attached', callback);
          },
          senderErrorEvent: (context: EventContext) => {
            debug('in sender attaching state - error event for ' + context.sender.name + ' error is: ' + this._getErrorName(context.sender.error));
            this._indicatedError = context.sender.error;
            //
            // We don't transition at this point in that we are guaranteed that the error will be followed by a sender_close
            // event.
            //
          },
          senderCloseEvent: (context: EventContext) => {
            debug('in sender attaching state - close event for ' + context.sender.name);
            //
            // We enabled the event listeners on the onEnter handler.  They are to stay alive until we
            // are about to transition to the detached state.
            // We are about to transition to the detached state, so clean up.
            //
            manageSenderHandlers('removeListener');
            //
            // This could be because of an error that was already indicated by the sender_error event.
            // Or it could simply be that for some reason (disconnect tests?) the service side had decided
            // to shut down the link.
            //
            let error = this._indicatedError;
            let callback = this._attachingCallback;
            this._indicatedError = undefined;
            this._attachingCallback = undefined;
            this._senderCloseOccurred = true;
            this._fsm.transition('detached', callback, error);
          },
          attach: (null),
          detach: (callback, err) => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_001: [If the `detach` method is invoked on the `SenderLink` while still attaching, the SenderLink shall detach.  It will indicate the error to the callback for the `detach` as well as the callback to the `attach`.] */
            debug('Detaching while attaching of rhea sender link ' + this._linkAddress);
            manageSenderHandlers('removeListener');
            //
            // We have a callback outstanding on the request that started the attaching.
            // We will signal to that callback that an error occurred. We will also invoke the callback supplied
            // for this detach.
            //
            let error = err || this._indicatedError || new Error('Unexpected link detach while attaching');
            let attachingCallback = this._attachingCallback;
            this._indicatedError = undefined;
            this._attachingCallback = undefined;
            attachingCallback(error);
            this._fsm.transition('detached', callback, error);
          },
          forceDetach: (err) => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_003: [If the `forceDetach` method is invoked on the `SenderLink` while still attaching, the SenderLink shall detach. With the error supplied to the forceDetach, the `attach` callback will also be invoked.  If the error is NOT falsy it will also be emitted as the argument to the `error` event.] */
            debug('Force detaching while attaching of rhea sender link ' + this._linkAddress);
            manageSenderHandlers('removeListener');
            let error = err || this._indicatedError;
            let attachingCallback = this._attachingCallback;
            this._indicatedError = undefined;
            this._attachingCallback = undefined;
            attachingCallback(error);
            this._fsm.transition('detached', undefined, error);
          }
        },
        attached: {
          _onEnter: (callback) => {
            debug('link attached. processing unsent message queue');
            if (callback) callback();
            if (this._unsentMessageQueue.length > 0) {
              this._fsm.handle('send');
            }
          },
          senderErrorEvent: (context: EventContext) => {
            debug('in sender attached state - error event for ' + context.sender.name + ' error is: ' + this._getErrorName(context.sender.error));
            this._indicatedError = context.sender.error;
            //
            // We don't transition at this point in that we are guaranteed that the error will be followed by a sender_close
            // event.
            //
          },
          senderCloseEvent: (context: EventContext) => {
            //
            // We have a close (which is how the amqp detach performative is surfaced). It could be because of an error that was
            // already indicated by the sender_error event. Or it could simply be that for some reason (disconnect tests?)
            // the service side had decided to shut down the link.
            //
            let error = this._indicatedError; // This could be undefined.
            this._indicatedError = undefined;
            this._senderCloseOccurred = true;
            debug('in sender attached state - close event for ' + context.sender.name + ' already indicated error is: ' + this._getErrorName(error));
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_016: [If an error happened that caused the link to be detached, the sender link shall call emit an `error` event with that error/] */
            if (error) {
              context.container.emit('azure-iot-amqp-base:error-indicated', error);
            } else {
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_006: [A `sender_close` event with no previous error will simply detach the link.  No error is emitted.] */
              this._fsm.transition('detaching');
            }
          },
          senderAcceptedEvent: (context: EventContext) => {
            debug('in sender attached state - accepted event for ' + context.sender.name);
            const op = this._pendingMessageDictionary
            [context.delivery.id];
            if (op) {
              delete this._pendingMessageDictionary[context.delivery.id];
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_013: [If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`.]*/
              if (op.callback) {
                op.callback(null, new results.MessageEnqueued());
              }
            }
          },
          senderRejectedEvent: (context: EventContext) => {
            debug('in sender attached state - rejected event for ' + context.sender.name + ' with a condition of ' + this._getErrorName(context.delivery.remote_state.error));
            const op = this._pendingMessageDictionary[context.delivery.id];
            if (op) {
              delete this._pendingMessageDictionary[context.delivery.id];
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_012: [If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service.] */
              if (op.callback) {
                op.callback(context.delivery.remote_state.error);
              }
            }
          },
          senderReleasedEvent: (context: EventContext) => {
            debug('in sender attached state - released event for ' + context.sender.name + ' with a condition of ' + this._getErrorName(context.delivery.remote_state.error));
            const op = this._pendingMessageDictionary[context.delivery.id];
            if (op) {
              delete this._pendingMessageDictionary[context.delivery.id];
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_012: [If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service.]*/
              if (op.callback) {
                op.callback(context.delivery.remote_state.error);
              }
            }
          },
          /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_007: [The `attach` method shall immediately invoke the `callback` if already in an attached state.] */
          attach: (callback) => callback(),
          detach: (callback, err) => {
            debug('while attached - detach for receiver link ' + this._linkAddress + ' callback: ' + callback + ' error: ' + this._getErrorName(err));
            this._fsm.transition('detaching', callback, err);
          },
          forceDetach: (err) => {
            debug('Force detaching while attached of rhea sender link ' + this._linkAddress);
            manageSenderHandlers('removeListener');
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_025: [The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
            this._rheaSender.remove();
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_004: [The `forceDetach` method shall cause an `error` event to be emitted on the `SenderLink` if an error is supplied.] */
            this._fsm.transition('detached', undefined, err);
          },
          send: () => {
            while ((this._unsentMessageQueue.length > 0) && this._rheaSender.sendable()) {
              debug('unsent message queue length is: ' + this._unsentMessageQueue.length);
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_020: [When the link gets attached, the messages shall be sent in the order they were queued.] */
              let opToSend = this._unsentMessageQueue.shift();
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_010: [The `send` method shall use the link created by the underlying `rhea` transport to send the specified `message` to the IoT hub.]*/
              let sendDeliveryObject = this._rheaSender.send(opToSend.message as any);
              if (sendDeliveryObject.settled) {
                /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_008: [Handles sending messages that can be settled on send.] */
                debug('message sent as settled');
                if (opToSend.callback) {
                  opToSend.callback( null, new results.MessageEnqueued());
                }
              } else {
                debug('message placed in dictionary for lookup later.');
                this._pendingMessageDictionary[sendDeliveryObject.id] = opToSend;
              }
            }
          }
        },
        detaching: {
          _onEnter: (callback, err) => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_023: [The `detach` method shall call the `callback` with the original `Error` that caused the detach whether it succeeds or fails to cleanly detach the link.]*/
            debug('Detaching of rhea sender link ' + this._linkAddress);
            this._detachingCallback = callback;
            this._indicatedError = err;
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_009: [The `detach` method shall detach the link created by `rhea`.] */
            this._rheaSender.close();
            if (this._senderCloseOccurred) {
              //
              // There will be no response from the peer to our detach (close).  Therefore no event handler will be invoked.  Simply
              // transition to detached now.
              //
              this._detachingCallback = undefined;
              this._indicatedError = undefined;
              this._fsm.transition('detached', callback, err);
            }
          },
          senderErrorEvent: (context: EventContext) => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_010: [An error occurring during a detach will be indicated in the error result of the `detach`.] */
            debug('in sender detaching state - error event for ' + context.sender.name + ' error is: ' + this._getErrorName(context.sender.error));
            this._indicatedError = this._indicatedError || context.sender.error;
            //
            // We don't transition at this point in that we are guaranteed that the error will be followed by a sender_close
            // event.
            //
          },
          senderCloseEvent: (context: EventContext) => {
            debug('in sender detaching state - close event for ' + context.sender.name + ' already indicated error is: ' + this._getErrorName(this._indicatedError));
            let error = this._indicatedError;
            let callback = this._detachingCallback;
            this._detachingCallback = undefined;
            this._indicatedError = undefined;
            this._senderCloseOccurred = true;
            manageSenderHandlers('removeListener');
            this._fsm.transition('detached', callback, error);
          },
          senderAcceptedEvent: (context: EventContext) => {
            debug('in sender detaching state - accepted event for ' + context.sender.name);
            const op = this._pendingMessageDictionary[context.delivery.id];
            if (op) {
              delete this._pendingMessageDictionary[context.delivery.id];
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_013: [If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`.]*/
              if (op.callback) {
                op.callback(null, new results.MessageEnqueued());
              }
            }
          },
          detach: (callback, err) => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_011: [If `detach` invoked while already detaching, it's callback will be invoked with an error.  Whatever caused the original detaching will proceed.] */
            //
            // Note that we are NOT transitioning to the detached state.
            // We are going to give the code a chance to complete normally.
            // The caller was free to invoke forceDetach.  That handler will
            // ALWAYS transition to the detached state.
            //
            debug('while detaching - detach for sender link ' + this._linkAddress);
            callback(err || new Error('Detached invoked while detaching.'));
          },
          forceDetach: (err) => {
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_009: [If `forceDetach` invoked while detaching, the detach will be completed with the error supplied to the `forceDetach` or an error indicating that the `detach` was preempted by the `forceDetach`.] */
            debug('while detaching - Force detaching for sender link ' + this._linkAddress);
            this._rheaSender.remove();
            let detachCallback = this._detachingCallback;
            let error = err || this._indicatedError || new Error('Detach preempted by force');
            this._detachingCallback = undefined;
            this._indicatedError = undefined;
            manageSenderHandlers('removeListener');
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

  send(message: AmqpMessage, callback: (err?: Error, result?: results.MessageEnqueued) => void): void {
    debug('placing a message in the unsent message queue.');
    /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_019: [While the link isn't attached, the messages passed to the `send` method shall be queued.] */
    this._unsentMessageQueue.push({
      message: message,
      callback: callback
    });
    this._fsm.handle('send');
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
