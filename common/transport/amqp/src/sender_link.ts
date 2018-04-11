import * as machina from 'machina';
import * as dbg from 'debug';
import * as uuid from 'uuid';
import { EventEmitter } from 'events';
import { EventContext, AmqpError, Session, Sender } from 'rhea';
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
  private _linkAddress: string;
  private _linkOptions: any;
  private _rheaSenderLink: Sender;
  private _fsm: machina.Fsm;
  private _rheaSession: Session;
  private _combinedOptions: any;
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
  // Create a name so that we can ensure that an event from the session is actually for the link we are utilizing
  // for this SenderLink.
  //
  private _rheaSenderLinkName: string;
  private _unsentMessageQueue: MessageOperation[];
  private _pendingMessageDictionary: {[key: number]: any};

  constructor(linkAddress: string, linkOptions: any, session: Session) {
    super();
    this._linkAddress = linkAddress;
    this._linkOptions = linkOptions;
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
      if (context.sender.name === this._rheaSenderLinkName) {
        debug('handling sender_open event for link: ' + context.sender.name + ' target: ' + context.sender.target.address);
        this._fsm.handle('senderOpenEvent', context);
      } else {
        debug('The sender open event is not for: ' + this._linkAddress);
      }
    };

    const senderCloseHandler = (context: EventContext): void => {
      if (context.sender.name === this._rheaSenderLinkName) {
        debug('handling sender_close event for link: ' + context.sender.name + ' target: ' + context.sender.target.address);
        this._fsm.handle('senderCloseEvent', context);
      } else {
        debug('The sender close event is not for: ' + this._linkAddress);
      }
    };

    const senderErrorHandler = (context: EventContext): void => {
      if (context.sender.name === this._rheaSenderLinkName) {
        debug('handling sender error event for link: ' + context.sender.name + ' target: ' + context.sender.target.address);
        debug('handling error event: ' + this._getErrorName(context.sender.error));
        this._fsm.handle('senderErrorEvent', context);
      } else {
        debug('The sender close event is not for: ' + this._linkAddress);
      }
    };

    const senderAcceptedHandler = (context: EventContext): void => {
      if (context.sender.name === this._rheaSenderLinkName) {
        debug('handling sender accepted event for link: ' + context.sender.name + ' target: ' + context.sender.target.address + ' for deliveryId: ' + context.delivery.id);
        this._fsm.handle('senderAcceptedEvent', context);
      } else {
        debug('The sender accepted event is not for: ' + this._linkAddress);
      }
    };

    const senderRejectedHandler = (context: EventContext): void => {
      if (context.sender.name === this._rheaSenderLinkName) {
        debug('handling sender rejected event for link: ' + context.sender.name + ' target: ' + context.sender.target.address + ' for deliveryId: ' + context.delivery.id);
        this._fsm.handle('senderRejectedEvent', context);
      } else {
        debug('The sender rejected event is not for: ' + this._linkAddress);
      }
    };

    const senderSendableHandler = (context: EventContext): void => {
      if (context.sender.name === this._rheaSenderLinkName) {
        debug('handling sender sendable event for link: ' + context.sender.name + ' target: ' + context.sender.target.address);
        this._fsm.handle('send');
      } else {
        debug('The sender sendable event is not for: ' + this._linkAddress);
      }
    };

    const senderReleasedHandler = (context: EventContext): void => {
      if (context.sender.name === this._rheaSenderLinkName) {
        debug('handling sender released event for link: ' + context.sender.name + ' target: ' + context.sender.target.address + ' for deliveryId: ' + context.delivery.id);
        this._fsm.handle('senderReleasedEvent', context);
      } else {
        debug('The sender released event is not for: ' + this._linkAddress);
      }
    };

    /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_006: [The `SenderLink` object should subscribe to the `sender_close` event of the newly created `rhea` link object.]*/
    /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_007: [The `SenderLink` object should subscribe to the `error` event of the newly created `rhea` link object.]*/
    const manageSenderHandlers = (operation: string) => {
      this._rheaSenderLink[operation]('sender_error', senderErrorHandler);
      this._rheaSenderLink[operation]('sender_open', senderOpenHandler);
      this._rheaSenderLink[operation]('sender_close', senderCloseHandler);
      this._rheaSenderLink[operation]('accepted', senderAcceptedHandler);
      this._rheaSenderLink[operation]('rejected', senderRejectedHandler);
      this._rheaSenderLink[operation]('released', senderReleasedHandler);
      this._rheaSenderLink[operation]('sendable', senderSendableHandler);
    };

    this._fsm = new machina.Fsm({
      initialState: 'detached',
      namespace: 'senderLink',
      states: {
        detached: {
          _onEnter: (callback, err) => {
            let messageCallbackError = err || new Error('Link Detached');
            this._rheaSenderLink = null;
            this._rheaSenderLinkName = null;
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
          detach: (callback, err) => {
            debug('detach: link already detached');
            callback(err);
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
            this._attachingCallback = callback;
            this._indicatedError = undefined;
            this._senderCloseOccurred = false;
            this._rheaSenderLinkName = 'rheaSender_' + uuid.v4();
            this._combinedOptions.name = this._rheaSenderLinkName;
            debug('attaching sender name: ' + this._rheaSenderLinkName + ' with address: ' + this._linkAddress);
            //
            // According to the rhea maintainers, one can depend on that fact that no actual network activity
            // will occur until the nextTick() after the call to open_sender.  Because of that, one can
            // put the event handlers on the rhea link returned from the open_sender call and be assured
            // that the listeners are in place BEFORE any possible events will be emitted on the link.
            //
            // This could make one feel a bit queasy.  If so, or if the interface gets changed and we
            // can't depend on that anymore, the easy fix would be to move the call to manageReceiverHandlers
            // to before the call to open_sender and change the implementation of manageReceiverHandler to
            // place the handlers on the session object instead of the link object.  The event handlers have
            // been written to deal with this appropriately.
            //
            this._rheaSenderLink = this._rheaSession.open_sender(this._combinedOptions);
            manageSenderHandlers('on');
          },
          senderOpenEvent: (context: EventContext) => {
            debug('in sender attaching state - open event for ' + context.sender.name);
            if (this._rheaSenderLink !== context.sender) {
              debug('the sender provided in the open not equal to the receiver returned from open_sender');
            }
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
            // We want to be particularly careful when we do this.  We don't wan to blindly just disable the handlers.
            // If we do, we could accidentally disable another SenderLink's set of listeners.
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
            debug('Detaching while attaching of rhea sender link ' + this._linkAddress);
            manageSenderHandlers('removeListener');
            //
            // We have a callback outstanding on the request that started the attaching.
            // We will signal to that callback that an error occurred. We will also invoke the callback supplied
            // for this detach.
            //
            let error = err || this._indicatedError;
            let attachingCallback = this._attachingCallback;
            this._indicatedError = undefined;
            this._attachingCallback = undefined;
            attachingCallback(error);
            this._fsm.transition('detached', callback, error);
          },
          forceDetach: (err) => {
            debug('Force detaching while attaching of rhea sender link ' + this._linkAddress);
            manageSenderHandlers('removeListener');
            let error = err || this._indicatedError;
            let attachingCallback = this._attachingCallback;
            this._indicatedError = undefined;
            this._attachingCallback = undefined;
            attachingCallback(error);
            this._fsm.transition('detached', undefined, error);
          },
          send: () => this._fsm.deferUntilTransition('send')
        },
        attached: {
          _onEnter: (callback) => {
            debug('link attached. processing unsent message queue');
            callback();
            this._fsm.handle('send');
          },
          senderOpenEvent: (context: EventContext) => {
            debug('in sender attached state - open event for ' + context.sender.name);
            debug('this simply should not happen!');
            this._fsm.transition('detaching', null, new Error('Open Sender while already attached!'));
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
            if (error) {
              context.container.emit('azure-iot-amqp-base:error-indicated', error);
            } else {
              this._fsm.transition('detaching');
            }
          },
          senderAcceptedEvent: (context: EventContext) => {
            debug('in sender attached state - accepted event for ' + context.sender.name);
            const op = this._pendingMessageDictionary[context.delivery.id];
            if (op) {
              delete this._pendingMessageDictionary[context.delivery.id];
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_013: [If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`.]*/
              if (op.callback) {
                op.callback(null, new results.MessageEnqueued());
              }
            }
          },
          senderRejectedEvent: (context: EventContext) => {
            debug('in sender attached state - rejected event for ' + context.sender.name);
            const op = this._pendingMessageDictionary[context.delivery.id];
            if (op) {
              delete this._pendingMessageDictionary[context.delivery.id];
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_012: [If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service.]*/
              if (op.callback) {
                op.callback(context.delivery.remote_state.error);
              }
            }
          },
          senderReleasedEvent: (context: EventContext) => {
            debug('in sender attached state - released event for ' + context.sender.name);
            const op = this._pendingMessageDictionary[context.delivery.id];
            if (op) {
              delete this._pendingMessageDictionary[context.delivery.id];
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_012: [If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service.]*/
              if (op.callback) {
                op.callback(context.delivery.remote_state.error);
              }
            }
          },
          sendable: (context: EventContext) => {
            debug('in sender attached state - sendable event for ' + context.sender.name);
            this._fsm.handle('send');
          },
          attach: (callback) => callback(),
          detach: (callback, err) => {
            debug('while attached - detach for receiver link ' + this._linkAddress + ' callback: ' + callback + ' error: ' + this._getErrorName(err));
            this._fsm.transition('detaching', callback, err);
          },
          forceDetach: (err) => {
            debug('Force detaching while attached of rhea sender link ' + this._linkAddress);
            manageSenderHandlers('removeListener');
            if (this._rheaSenderLink) {
              /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_025: [The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
              this._rheaSenderLink.remove();
            }
            this._fsm.transition('detached', undefined, err);
          },
          send: () => {
            while ((this._unsentMessageQueue.length > 0) && this._rheaSenderLink.sendable()) {
              debug('unsent message queue length is: ' + this._unsentMessageQueue.length);
              let opToSend = this._unsentMessageQueue.shift();
              debug('after shift unsent message queue length is: ' + this._unsentMessageQueue.length);
              if (opToSend) {
                debug('sending message using underlying rhea link object');
                /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_010: [The `send` method shall use the link created by the underlying `rhea` transport to send the specified `message` to the IoT hub.]*/
                let sendDeliveryObject = this._rheaSenderLink.send(opToSend.message as any);
                if (sendDeliveryObject.settled) {
                  debug('message sent as settled');
                  opToSend.callback( null, new results.MessageEnqueued());
                } else {
                  debug('message placed in dictionary for lookup later.');
                  this._pendingMessageDictionary[sendDeliveryObject.id] = opToSend;
                }
              } else {
                break;
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
            this._rheaSenderLink.close();
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
          senderOpenEvent: (context: EventContext) => {
            debug('in sender detaching state - open event for ' + context.sender.name);
            debug('this simply should not happen!');
          },
          senderErrorEvent: (context: EventContext) => {
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
            debug('while detaching - Force detaching for sender link ' + this._linkAddress);
            this._rheaSenderLink.remove();
            this._detachingCallback = undefined;
            this._indicatedError = undefined;
            manageSenderHandlers('removeListener');
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
