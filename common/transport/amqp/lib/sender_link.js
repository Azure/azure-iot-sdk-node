"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var machina = require("machina");
var dbg = require("debug");
var uuid = require("uuid");
var events_1 = require("events");
var azure_iot_common_1 = require("azure-iot-common");
var debug = dbg('azure-iot-amqp-base:SenderLink');
/**
 * @private
 * State machine used to manage AMQP sender links
 *
 * @extends {EventEmitter}
 * @implements {AmqpLink}
 */
/*Codes_SRS_NODE_AMQP_SENDER_LINK_16_002: [The `SenderLink` class shall inherit from `EventEmitter`.]*/
/*Codes_SRS_NODE_AMQP_SENDER_LINK_16_003: [The `SenderLink` class shall implement the `AmqpLink` interface.]*/
var SenderLink = /** @class */ (function (_super) {
    __extends(SenderLink, _super);
    function SenderLink(linkAddress, linkOptions, session) {
        var _this = _super.call(this) || this;
        //
        // We want to know if a detach has already occurred, having been sent by the peer.  We will want to send a matching
        // detach but we can't expect a reply to it.
        //
        _this._senderCloseOccurred = false;
        _this._linkAddress = linkAddress;
        _this._rheaSession = session;
        _this._unsentMessageQueue = [];
        _this._pendingMessageDictionary = {};
        _this._combinedOptions = {
            target: linkAddress
        };
        if (linkOptions) {
            for (var k in linkOptions) {
                _this._combinedOptions[k] = linkOptions[k];
            }
        }
        var senderOpenHandler = function (context) {
            _this._fsm.handle('senderOpenEvent', context);
        };
        var senderCloseHandler = function (context) {
            _this._fsm.handle('senderCloseEvent', context);
        };
        var senderErrorHandler = function (context) {
            debug('handling error event: ' + _this._getErrorName(context.sender.error));
            _this._fsm.handle('senderErrorEvent', context);
        };
        var senderAcceptedHandler = function (context) {
            _this._fsm.handle('senderAcceptedEvent', context);
        };
        var senderRejectedHandler = function (context) {
            _this._fsm.handle('senderRejectedEvent', context);
        };
        var senderSendableHandler = function (context) {
            _this._fsm.handle('send');
        };
        var senderReleasedHandler = function (context) {
            _this._fsm.handle('senderReleasedEvent', context);
        };
        var manageSenderHandlers = function (operation) {
            _this._rheaSender[operation]('sender_error', senderErrorHandler);
            _this._rheaSender[operation]('sender_open', senderOpenHandler);
            _this._rheaSender[operation]('sender_close', senderCloseHandler);
            _this._rheaSender[operation]('accepted', senderAcceptedHandler);
            _this._rheaSender[operation]('rejected', senderRejectedHandler);
            _this._rheaSender[operation]('released', senderReleasedHandler);
            _this._rheaSender[operation]('sendable', senderSendableHandler);
        };
        _this._fsm = new machina.Fsm({
            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_001: [The `SenderLink` internal state machine shall be initialized in the `detached` state.]*/
            initialState: 'detached',
            namespace: 'senderLink',
            states: {
                detached: {
                    _onEnter: function (callback, err) {
                        var messageCallbackError = err || new Error('Link Detached');
                        _this._rheaSender = null;
                        _this._rheaSenderName = null;
                        debug('link detached: ' + _this._linkAddress);
                        debug('unsent message queue length: ' + _this._unsentMessageQueue.length);
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_021: [If the link fails to attach and there are messages in the queue, the callback for each message shall be called with the error that caused the detach in the first place.]*/
                        if (_this._unsentMessageQueue.length > 0) {
                            debug('dequeuing and failing unsent messages');
                            var unsent = _this._unsentMessageQueue.shift();
                            while (unsent) {
                                if (unsent.callback) {
                                    unsent.callback(messageCallbackError);
                                }
                                unsent = _this._unsentMessageQueue.shift();
                            }
                        }
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_014: [If the link is detached while a message is being sent, the `callback` shall be called with an `Error` object describing the AMQP error that caused the detach to happen in the first place.] */
                        Object.keys(_this._pendingMessageDictionary).forEach(function (pendingSend) {
                            var op = _this._pendingMessageDictionary[pendingSend];
                            delete _this._pendingMessageDictionary[pendingSend];
                            if (op.callback) {
                                op.callback(messageCallbackError);
                            }
                        });
                        if (callback) {
                            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_018: [If an error happened that caused the link to be detached while trying to attach the link or send a message, the `callback` for this function shall be called with that error.]*/
                            callback(err);
                        }
                        else if (err) {
                            _this.emit('error', err);
                        }
                    },
                    /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_011: [If the state machine is not in the `attached` state, the `SenderLink` object shall attach the link first and then send the message.]*/
                    attach: function (callback) { return _this._fsm.transition('attaching', callback); },
                    detach: function (callback, err) {
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_005: [If the `SenderLink` is already in the detached state an invocation of `detach` shall immediately invoke the callback with the (potentially) supplied error parameter.] */
                        debug('detach: link already detached');
                        callback(err);
                    },
                    forceDetach: function () {
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_026: [The `forceDetach` method shall return immediately if the link is already detached.] */
                        debug('forceDetach: link already detached');
                        return;
                    },
                    send: function () {
                        if (_this._unsentMessageQueue.length > 0) {
                            //
                            // We are depending on the attach path to process the send queue when it is done attaching.
                            //
                            _this._fsm.handle('attach', function (err) {
                                /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_027: [If the state machine is not in the attached state and the link is force-detached before successfully attaching , the send callback shall be called with the error passed to forceDetach]*/
                                if (err) {
                                    debug('failed to auto-attach, likely because a forceDetach happened: ' + err.toString());
                                    // no need to handle transitions, failing to attach will automatically revert to detached and take care of unsent messages.
                                }
                                else {
                                    debug('link was auto-attached.');
                                    // no need to handle transitions here either, a successful attach will already set us in the attached state and take care of unsent messages.
                                }
                            });
                        }
                    }
                },
                attaching: {
                    _onEnter: function (callback) {
                        _this._attachingCallback = callback;
                        _this._indicatedError = undefined;
                        _this._senderCloseOccurred = false;
                        _this._rheaSenderName = 'rheaSender_' + uuid.v4();
                        _this._combinedOptions.name = _this._rheaSenderName;
                        debug('attaching sender name: ' + _this._rheaSenderName + ' with address: ' + _this._linkAddress);
                        //
                        // According to the rhea maintainers, one can depend on that fact that no actual network activity
                        // will occur until the nextTick() after the call to open_sender.  Because of that, one can
                        // put the event handlers on the rhea link returned from the open_sender call and be assured
                        // that the listeners are in place BEFORE any possible events will be emitted on the link.
                        //
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_004: [The `attach` method shall use the stored instance of the `rhea` session object to attach a new link object with the combined `linkAddress` and `linkOptions` provided when creating the `SenderLink` instance.] */
                        _this._rheaSender = _this._rheaSession.open_sender(_this._combinedOptions);
                        manageSenderHandlers('on');
                    },
                    senderOpenEvent: function (context) {
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_022: [The `attach` method shall call the `callback` if the link was successfully attached.] */
                        var callback = _this._attachingCallback;
                        _this._attachingCallback = null;
                        _this._fsm.transition('attached', callback);
                    },
                    senderErrorEvent: function (context) {
                        debug('in sender attaching state - error event for ' + context.sender.name + ' error is: ' + _this._getErrorName(context.sender.error));
                        _this._indicatedError = context.sender.error;
                        //
                        // We don't transition at this point in that we are guaranteed that the error will be followed by a sender_close
                        // event.
                        //
                    },
                    senderCloseEvent: function (context) {
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
                        var error = _this._indicatedError;
                        var callback = _this._attachingCallback;
                        _this._indicatedError = undefined;
                        _this._attachingCallback = undefined;
                        _this._senderCloseOccurred = true;
                        _this._fsm.transition('detached', callback, error);
                    },
                    attach: (null),
                    detach: function (callback, err) {
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_001: [If the `detach` method is invoked on the `SenderLink` while still attaching, the SenderLink shall detach.  It will indicate the error to the callback for the `detach` as well as the callback to the `attach`.] */
                        debug('Detaching while attaching of rhea sender link ' + _this._linkAddress);
                        manageSenderHandlers('removeListener');
                        //
                        // We have a callback outstanding on the request that started the attaching.
                        // We will signal to that callback that an error occurred. We will also invoke the callback supplied
                        // for this detach.
                        //
                        var error = err || _this._indicatedError || new Error('Unexpected link detach while attaching');
                        var attachingCallback = _this._attachingCallback;
                        _this._indicatedError = undefined;
                        _this._attachingCallback = undefined;
                        attachingCallback(error);
                        _this._fsm.transition('detached', callback, error);
                    },
                    forceDetach: function (err) {
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_003: [If the `forceDetach` method is invoked on the `SenderLink` while still attaching, the SenderLink shall detach. With the error supplied to the forceDetach, the `attach` callback will also be invoked.  If the error is NOT falsy it will also be emitted as the argument to the `error` event.] */
                        debug('Force detaching while attaching of rhea sender link ' + _this._linkAddress);
                        manageSenderHandlers('removeListener');
                        var error = err || _this._indicatedError;
                        var attachingCallback = _this._attachingCallback;
                        _this._indicatedError = undefined;
                        _this._attachingCallback = undefined;
                        attachingCallback(error);
                        _this._fsm.transition('detached', undefined, error);
                    }
                },
                attached: {
                    _onEnter: function (callback) {
                        debug('link attached. processing unsent message queue');
                        if (callback)
                            callback();
                        if (_this._unsentMessageQueue.length > 0) {
                            _this._fsm.handle('send');
                        }
                    },
                    senderErrorEvent: function (context) {
                        debug('in sender attached state - error event for ' + context.sender.name + ' error is: ' + _this._getErrorName(context.sender.error));
                        _this._indicatedError = context.sender.error;
                        //
                        // We don't transition at this point in that we are guaranteed that the error will be followed by a sender_close
                        // event.
                        //
                    },
                    senderCloseEvent: function (context) {
                        //
                        // We have a close (which is how the amqp detach performative is surfaced). It could be because of an error that was
                        // already indicated by the sender_error event. Or it could simply be that for some reason (disconnect tests?)
                        // the service side had decided to shut down the link.
                        //
                        var error = _this._indicatedError; // This could be undefined.
                        _this._indicatedError = undefined;
                        _this._senderCloseOccurred = true;
                        if (error) {
                            debug('in sender attached state - close event for ' + context.sender.name + ' already indicated error is: ' + _this._getErrorName(error));
                        }
                        else {
                            debug('in sender attached state - close event for ' + context.sender.name);
                        }
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_016: [If an error happened that caused the link to be detached, the sender link shall call emit an `error` event with that error/] */
                        if (error) {
                            context.container.emit('azure-iot-amqp-base:error-indicated', error);
                        }
                        else {
                            /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_006: [A `sender_close` event with no previous error will simply detach the link.  No error is emitted.] */
                            _this._fsm.transition('detaching');
                        }
                    },
                    senderAcceptedEvent: function (context) {
                        debug('in sender attached state - accepted event for ' + context.sender.name);
                        var op = _this._pendingMessageDictionary[context.delivery.id];
                        if (op) {
                            delete _this._pendingMessageDictionary[context.delivery.id];
                            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_013: [If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`.]*/
                            if (op.callback) {
                                op.callback(null, new azure_iot_common_1.results.MessageEnqueued());
                            }
                        }
                    },
                    senderRejectedEvent: function (context) {
                        debug('in sender attached state - rejected event for ' + context.sender.name + ' with a condition of ' + _this._getErrorName(context.delivery.remote_state.error));
                        var op = _this._pendingMessageDictionary[context.delivery.id];
                        if (op) {
                            delete _this._pendingMessageDictionary[context.delivery.id];
                            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_012: [If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service.] */
                            if (op.callback) {
                                op.callback(context.delivery.remote_state.error);
                            }
                        }
                    },
                    senderReleasedEvent: function (context) {
                        debug('in sender attached state - released event for ' + context.sender.name + ' with a condition of ' + _this._getErrorName(context.delivery.remote_state.error));
                        var op = _this._pendingMessageDictionary[context.delivery.id];
                        if (op) {
                            delete _this._pendingMessageDictionary[context.delivery.id];
                            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_012: [If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service.]*/
                            if (op.callback) {
                                op.callback(context.delivery.remote_state.error);
                            }
                        }
                    },
                    /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_007: [The `attach` method shall immediately invoke the `callback` if already in an attached state.] */
                    attach: function (callback) { return callback(); },
                    detach: function (callback, err) {
                        debug('while attached - detach for receiver link ' + _this._linkAddress + ' callback: ' + callback + ' error: ' + _this._getErrorName(err));
                        _this._fsm.transition('detaching', callback, err);
                    },
                    forceDetach: function (err) {
                        debug('Force detaching while attached of rhea sender link ' + _this._linkAddress);
                        manageSenderHandlers('removeListener');
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_025: [The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
                        _this._rheaSender.remove();
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_004: [The `forceDetach` method shall cause an `error` event to be emitted on the `SenderLink` if an error is supplied.] */
                        _this._fsm.transition('detached', undefined, err);
                    },
                    send: function () {
                        while ((_this._unsentMessageQueue.length > 0) && _this._rheaSender.sendable()) {
                            debug('unsent message queue length is: ' + _this._unsentMessageQueue.length);
                            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_020: [When the link gets attached, the messages shall be sent in the order they were queued.] */
                            var opToSend = _this._unsentMessageQueue.shift();
                            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_010: [The `send` method shall use the link created by the underlying `rhea` transport to send the specified `message` to the IoT hub.]*/
                            var sendDeliveryObject = _this._rheaSender.send(opToSend.message);
                            if (sendDeliveryObject.settled) {
                                /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_008: [Handles sending messages that can be settled on send.] */
                                debug('message sent as settled');
                                if (opToSend.callback) {
                                    opToSend.callback(null, new azure_iot_common_1.results.MessageEnqueued());
                                }
                            }
                            else {
                                debug('message placed in dictionary for lookup later.');
                                _this._pendingMessageDictionary[sendDeliveryObject.id] = opToSend;
                            }
                        }
                    }
                },
                detaching: {
                    _onEnter: function (callback, err) {
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_023: [The `detach` method shall call the `callback` with the original `Error` that caused the detach whether it succeeds or fails to cleanly detach the link.]*/
                        debug('Detaching of rhea sender link ' + _this._linkAddress);
                        _this._detachingCallback = callback;
                        _this._indicatedError = err;
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_009: [The `detach` method shall detach the link created by `rhea`.] */
                        _this._rheaSender.close();
                        if (_this._senderCloseOccurred) {
                            //
                            // There will be no response from the peer to our detach (close).  Therefore no event handler will be invoked.  Simply
                            // transition to detached now.
                            //
                            _this._detachingCallback = undefined;
                            _this._indicatedError = undefined;
                            _this._fsm.transition('detached', callback, err);
                        }
                    },
                    senderErrorEvent: function (context) {
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_010: [An error occurring during a detach will be indicated in the error result of the `detach`.] */
                        debug('in sender detaching state - error event for ' + context.sender.name + ' error is: ' + _this._getErrorName(context.sender.error));
                        _this._indicatedError = _this._indicatedError || context.sender.error;
                        //
                        // We don't transition at this point in that we are guaranteed that the error will be followed by a sender_close
                        // event.
                        //
                    },
                    senderCloseEvent: function (context) {
                        debug('in sender detaching state - close event for ' + context.sender.name + ' already indicated error is: ' + _this._getErrorName(_this._indicatedError));
                        var error = _this._indicatedError;
                        var callback = _this._detachingCallback;
                        _this._detachingCallback = undefined;
                        _this._indicatedError = undefined;
                        _this._senderCloseOccurred = true;
                        manageSenderHandlers('removeListener');
                        _this._fsm.transition('detached', callback, error);
                    },
                    senderAcceptedEvent: function (context) {
                        debug('in sender detaching state - accepted event for ' + context.sender.name);
                        var op = _this._pendingMessageDictionary[context.delivery.id];
                        if (op) {
                            delete _this._pendingMessageDictionary[context.delivery.id];
                            /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_013: [If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`.]*/
                            if (op.callback) {
                                op.callback(null, new azure_iot_common_1.results.MessageEnqueued());
                            }
                        }
                    },
                    detach: function (callback, err) {
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_011: [If `detach` invoked while already detaching, it's callback will be invoked with an error.  Whatever caused the original detaching will proceed.] */
                        //
                        // Note that we are NOT transitioning to the detached state.
                        // We are going to give the code a chance to complete normally.
                        // The caller was free to invoke forceDetach.  That handler will
                        // ALWAYS transition to the detached state.
                        //
                        debug('while detaching - detach for sender link ' + _this._linkAddress);
                        callback(err || new Error('Detached invoked while detaching.'));
                    },
                    forceDetach: function (err) {
                        /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_009: [If `forceDetach` invoked while detaching, the detach will be completed with the error supplied to the `forceDetach` or an error indicating that the `detach` was preempted by the `forceDetach`.] */
                        debug('while detaching - Force detaching for sender link ' + _this._linkAddress);
                        _this._rheaSender.remove();
                        var detachCallback = _this._detachingCallback;
                        var error = err || _this._indicatedError || new Error('Detach preempted by force');
                        _this._detachingCallback = undefined;
                        _this._indicatedError = undefined;
                        manageSenderHandlers('removeListener');
                        if (detachCallback) {
                            detachCallback(error);
                        }
                        _this._fsm.transition('detached', undefined, err);
                    },
                    '*': function () {
                        _this._fsm.deferUntilTransition('detached');
                    }
                }
            }
        });
        _this._fsm.on('transition', function (transition) {
            debug(transition.fromState + ' -> ' + transition.toState + ' (action:' + transition.action + ')');
        });
        return _this;
    }
    SenderLink.prototype.detach = function (callback, err) {
        this._fsm.handle('detach', callback, err);
    };
    SenderLink.prototype.forceDetach = function (err) {
        this._fsm.handle('forceDetach', err);
    };
    SenderLink.prototype.attach = function (callback) {
        this._fsm.handle('attach', callback);
    };
    SenderLink.prototype.send = function (message, callback) {
        debug('placing a message in the unsent message queue.');
        /*Codes_SRS_NODE_AMQP_SENDER_LINK_16_019: [While the link isn't attached, the messages passed to the `send` method shall be queued.] */
        this._unsentMessageQueue.push({
            message: message,
            callback: callback
        });
        this._fsm.handle('send');
    };
    SenderLink.prototype._getErrorName = function (err) {
        if (err) {
            if (err.condition) {
                return '(amqp error) ' + err.condition;
            }
            else if (err.name) {
                return '(javascript error) ' + err.name;
            }
            else {
                return 'unknown error type';
            }
        }
        else {
            return 'error is falsy';
        }
    };
    return SenderLink;
}(events_1.EventEmitter));
exports.SenderLink = SenderLink;
//# sourceMappingURL=sender_link.js.map