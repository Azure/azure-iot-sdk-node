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
var debug = dbg('azure-iot-amqp-base:ReceiverLink');
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
var ReceiverLink = /** @class */ (function (_super) {
    __extends(ReceiverLink, _super);
    function ReceiverLink(linkAddress, linkOptions, session) {
        var _this = _super.call(this) || this;
        //
        // We want to know if a detach has already occurred, having been sent by the peer.  We will want to send a matching
        // detach but we can't expect a reply to it.
        //
        _this._receiverCloseOccurred = false;
        _this._linkAddress = linkAddress;
        _this._rheaSession = session;
        _this._undisposedDeliveries = [];
        _this._combinedOptions = {
            source: linkAddress
        };
        if (linkOptions) {
            for (var k in linkOptions) {
                _this._combinedOptions[k] = linkOptions[k];
            }
        }
        var receiverOpenHandler = function (context) {
            _this._fsm.handle('receiverOpenEvent', context);
        };
        var receiverCloseHandler = function (context) {
            _this._fsm.handle('receiverCloseEvent', context);
        };
        var receiverErrorHandler = function (context) {
            _this._fsm.handle('receiverErrorEvent', context);
        };
        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_012: [If a `message` event is emitted by the `rhea` link object, the `ReceiverLink` object shall emit a `message` event with the same content.]*/
        var receiverMessageHandler = function (context) {
            _this._undisposedDeliveries.push({ msg: context.message, delivery: context.delivery });
            _this.emit('message', context.message);
        };
        var manageReceiverHandlers = function (operation) {
            _this._rheaReceiver[operation]('receiver_error', receiverErrorHandler);
            _this._rheaReceiver[operation]('receiver_close', receiverCloseHandler);
            _this._rheaReceiver[operation]('receiver_open', receiverOpenHandler);
            _this._rheaReceiver[operation]('message', receiverMessageHandler);
        };
        _this._fsm = new machina.Fsm({
            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_001: [The `ReceiverLink` internal state machine shall be initialized in the `detached` state.]*/
            initialState: 'detached',
            namespace: 'receiverLink',
            states: {
                detached: {
                    _onEnter: function (callback, err) {
                        _this._rheaReceiver = null;
                        _this._rheaReceiverName = null;
                        if (callback) {
                            _this._safeCallback(callback, err);
                        }
                        else if (err) {
                            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_011: [If a `receiver_close` or `receiver_error` event is emitted by the `rhea` link object, the `ReceiverLink` object shall forward that error to the client.]*/
                            _this.emit('error', err);
                        }
                    },
                    attach: function (callback) {
                        _this._fsm.transition('attaching', callback);
                    },
                    detach: function (callback, err) {
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_004: [If the `ReceiverLink` is already in the detached state an invocation of `detach` shall immediately invoke the callback with the (potentially) supplied error parameter.] */
                        debug('while detached - detach for receiver link ' + _this._linkAddress);
                        _this._safeCallback(callback, err);
                    },
                    forceDetach: function () {
                        debug('while detached - force detach for receiver link ' + _this._linkAddress);
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_028: [The `forceDetach` method shall return immediately if the link is already detached.]*/
                        return;
                    },
                    accept: function (message, callback) { return callback(new azure_iot_common_1.errors.DeviceMessageLockLostError()); },
                    reject: function (message, callback) { return callback(new azure_iot_common_1.errors.DeviceMessageLockLostError()); },
                    abandon: function (message, callback) { return callback(new azure_iot_common_1.errors.DeviceMessageLockLostError()); }
                },
                attaching: {
                    _onEnter: function (callback) {
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_004: [The `attach` method shall use the stored instance of the `rhea` session object to attach a new link object with the combined `linkAddress` and `linkOptions` provided when creating the `ReceiverLink` instance.]*/
                        _this._attachingCallback = callback;
                        _this._indicatedError = undefined;
                        _this._receiverCloseOccurred = false;
                        _this._rheaReceiverName = 'rheaReceiver_' + uuid.v4();
                        _this._combinedOptions.name = _this._rheaReceiverName;
                        debug('attaching receiver name: ' + _this._rheaReceiverName + ' with address: ' + _this._linkAddress);
                        //
                        // According to the rhea maintainers, one can depend on that fact that no actual network activity
                        // will occur until the nextTick() after the call to open_receiver.  Because of that, one can
                        // put the event handlers on the rhea link returned from the open_receiver call and be assured
                        // that the listeners are in place BEFORE any possible events will be emitted on the link.
                        //
                        _this._rheaReceiver = _this._rheaSession.open_receiver(_this._combinedOptions);
                        manageReceiverHandlers('on');
                    },
                    receiverOpenEvent: function (context) {
                        debug('In receiver attaching state - open event for ' + context.receiver.name);
                        var callback = _this._attachingCallback;
                        _this._attachingCallback = null;
                        _this._fsm.transition('attached', callback);
                    },
                    receiverErrorEvent: function (context) {
                        debug('In receiver attaching state - error event for ' + context.receiver.name + ' error is: ' + _this._getErrorName(context.receiver.error));
                        _this._indicatedError = context.receiver.error;
                        //
                        // We don't transition at this point in that we are guaranteed that the error will be followed by a receiver_close
                        // event.
                        //
                    },
                    receiverCloseEvent: function (context) {
                        debug('in receiver attaching state - close event for ' + context.receiver.name);
                        //
                        // We enabled the event listeners on the onEnter handler.  They are to stay alive until we
                        // are about to transition to the detached state.
                        // We are about to transition to the detached state, so clean up.
                        //
                        manageReceiverHandlers('removeListener');
                        var error = _this._indicatedError;
                        var callback = _this._attachingCallback;
                        _this._indicatedError = undefined;
                        _this._attachingCallback = undefined;
                        _this._receiverCloseOccurred = true;
                        _this._fsm.transition('detached', callback, error);
                    },
                    attach: (null),
                    detach: function (callback, err) {
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_002: [If the `detach` method is invoked on the `ReceiverLink` while still attaching, the ReceiverLink shall detach.  It will indicate the error to the callback for the `detach` as well as the callback to the `attach`.] */
                        debug('Detaching while attaching of rhea receiver link ' + _this._linkAddress);
                        manageReceiverHandlers('removeListener');
                        //
                        // We may have a callback outstanding from the request that started the attaching.
                        // We will signal to that callback that an error occurred. We will also invoke the callback supplied
                        // for this detach.
                        //
                        var error = err || _this._indicatedError || new Error('Unexpected link detach while attaching');
                        var attachingCallback = _this._attachingCallback;
                        _this._indicatedError = undefined;
                        _this._attachingCallback = undefined;
                        if (attachingCallback) {
                            attachingCallback(error);
                        }
                        _this._fsm.transition('detached', callback, error);
                    },
                    forceDetach: function (err) {
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_003: [If the `forceDetach` method is invoked on the `ReceiverLink` while still attaching, the ReceiverLink shall detach.  With the error supplied to the forceDetach, the `attach` callback will also be invoked.  If the error is NOT falsy it will also be emitted as the argument to the `error` event.] */
                        debug('Force detaching while attaching of rhea receiver link ' + _this._linkAddress);
                        manageReceiverHandlers('removeListener');
                        var error = err || _this._indicatedError;
                        var attachingCallback = _this._attachingCallback;
                        _this._indicatedError = undefined;
                        _this._attachingCallback = undefined;
                        attachingCallback(error);
                        _this._fsm.transition('detached', undefined, error);
                    },
                    accept: function (message, callback) { return callback(new azure_iot_common_1.errors.DeviceMessageLockLostError()); },
                    reject: function (message, callback) { return callback(new azure_iot_common_1.errors.DeviceMessageLockLostError()); },
                    abandon: function (message, callback) { return callback(new azure_iot_common_1.errors.DeviceMessageLockLostError()); }
                },
                attached: {
                    _onEnter: function (callback, err) {
                        if (callback)
                            callback(err);
                    },
                    receiverErrorEvent: function (context) {
                        debug('in receiver attached state - error event for ' + context.receiver.name + ' error is: ' + _this._getErrorName(context.receiver.error));
                        _this._indicatedError = context.receiver.error;
                        //
                        // We don't transition at this point in that we are guaranteed that the error will be followed by a receiver_close
                        // event.
                        //
                    },
                    receiverCloseEvent: function (context) {
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_009: [If a `receiver_close` event received with no preceding error, the link shall be closed with no error.] */
                        //
                        // We have a close (which is how the amqp detach performative is surfaced). It could be because of an error that was
                        // already indicated by the receiver_error event. Or it could simply be that for some reason (disconnect tests?)
                        // the service side had decided to shut down the link.
                        //
                        var error = _this._indicatedError; // This might be undefined.
                        _this._indicatedError = undefined;
                        _this._receiverCloseOccurred = true;
                        debug('in receiver attached state - close event for ' + context.receiver.name + ' already indicated error is: ' + _this._getErrorName(error));
                        if (error) {
                            context.container.emit('azure-iot-amqp-base:error-indicated', error);
                        }
                        else {
                            _this._fsm.transition('detaching');
                        }
                    },
                    attach: function (callback) {
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_001: [The `attach` method shall immediately invoke the `callback` if already in an attached state.] */
                        _this._safeCallback(callback);
                    },
                    detach: function (callback, err) {
                        debug('while attached - detach for receiver link ' + _this._linkAddress + ' callback: ' + callback + ' error: ' + _this._getErrorName(err));
                        _this._fsm.transition('detaching', callback, err);
                    },
                    forceDetach: function (err) {
                        debug('while attached - force detach for receiver link ' + _this._linkAddress);
                        manageReceiverHandlers('removeListener');
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_027: [** The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
                        _this._rheaReceiver.remove();
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_008: [The `forceDetach` method shall cause an `error` event to be emitted on the `ReceiverLink` if an error is supplied.] */
                        _this._fsm.transition('detached', undefined, err);
                    },
                    accept: function (message, callback) {
                        var delivery = _this._findDeliveryRecord(message);
                        if (delivery) {
                            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_022: [** The `accept` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageCompleted` object if a callback is specified.]*/
                            delivery.accept();
                            _this._safeCallback(callback, null, new azure_iot_common_1.results.MessageCompleted());
                        }
                        else {
                            _this._safeCallback(callback, new azure_iot_common_1.errors.DeviceMessageLockLostError());
                        }
                    },
                    reject: function (message, callback) {
                        var delivery = _this._findDeliveryRecord(message);
                        if (delivery) {
                            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_023: [** The `reject` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageRejected` object if a callback is specified.]*/
                            delivery.reject();
                            _this._safeCallback(callback, null, new azure_iot_common_1.results.MessageRejected());
                        }
                        else {
                            _this._safeCallback(callback, new azure_iot_common_1.errors.DeviceMessageLockLostError());
                        }
                    },
                    abandon: function (message, callback) {
                        var delivery = _this._findDeliveryRecord(message);
                        if (delivery) {
                            /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_024: [** The `abandon` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageAbandoned` object if a callback is specified.]*/
                            delivery.release();
                            _this._safeCallback(callback, null, new azure_iot_common_1.results.MessageAbandoned());
                        }
                        else {
                            _this._safeCallback(callback, new azure_iot_common_1.errors.DeviceMessageLockLostError());
                        }
                    }
                },
                detaching: {
                    _onEnter: function (callback, err) {
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_025: [The `detach` method shall call the `callback` with an `Error` that caused the detach whether it succeeds or fails to cleanly detach the link.]*/
                        debug('Detaching of rhea receiver link ' + _this._linkAddress);
                        _this._detachingCallback = callback;
                        _this._indicatedError = err;
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_009: [The `detach` method shall detach the link created by `rhea` object.] */
                        _this._rheaReceiver.close();
                        if (_this._receiverCloseOccurred) {
                            //
                            // There will be no response from the peer to our detach (close).  Therefore no event handler will be invoked.  Simply
                            // transition to detached now.
                            //
                            _this._detachingCallback = undefined;
                            _this._indicatedError = undefined;
                            _this._fsm.transition('detached', callback, err);
                        }
                    },
                    receiverErrorEvent: function (context) {
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_006: [An error occurring during a detach will be indicated in the error result of the `detach`.] */
                        debug('in receiver detaching state - error event for ' + context.receiver.name + ' error is: ' + _this._getErrorName(context.receiver.error));
                        _this._indicatedError = _this._indicatedError || context.receiver.error;
                        //
                        // We don't transition at this point in that we are guaranteed that the error will be followed by a receiver_close
                        // event.
                        //
                    },
                    receiverCloseEvent: function (context) {
                        debug('in receiver detaching state - close event for ' + context.receiver.name + ' already indicated error is: ' + _this._getErrorName(_this._indicatedError));
                        var error = _this._indicatedError;
                        var callback = _this._detachingCallback;
                        _this._detachingCallback = undefined;
                        _this._indicatedError = undefined;
                        manageReceiverHandlers('removeListener');
                        _this._fsm.transition('detached', callback, error);
                    },
                    detach: function (callback, err) {
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_007: [If `detach` invoked while already detaching, it's callback will be invoked with an error.  Whatever caused the original detaching will proceed.] */
                        //
                        // Note that we are NOT transitioning to the detached state.
                        // We are going to give the code a chance to complete normally.
                        // The caller was free to invoke forceDetach.  That handler will
                        // ALWAYS transition to the detached state.
                        //
                        debug('while detaching - detach for receiver link ' + _this._linkAddress);
                        if (callback) {
                            err = err || new Error('Detached invoked while detaching.');
                            _this._safeCallback(callback, err);
                        }
                    },
                    forceDetach: function (err) {
                        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_06_005: [If `forceDetach` invoked while detaching, the detach will be completed with the error supplied to the `forceDetach` or an error indicating that the `detach` was preempted by the `forceDetach`.] */
                        debug('while detaching - Force detaching for receiver link ' + _this._linkAddress);
                        _this._rheaReceiver.remove();
                        var detachCallback = _this._detachingCallback;
                        var error = err || _this._indicatedError || new Error('Detach preempted by force');
                        _this._detachingCallback = undefined;
                        _this._indicatedError = undefined;
                        manageReceiverHandlers('removeListener');
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
        _this.on('removeListener', function (eventName) {
            // stop listening for AMQP events if our consumers stop listening for our events
            if (eventName === 'message' && _this.listeners('message').length === 0) {
                _this._fsm.handle('detach');
            }
        });
        _this.on('newListener', function (eventName) {
            // lazy-init AMQP event listeners
            if (eventName === 'message') {
                _this._fsm.handle('attach');
            }
        });
        return _this;
    }
    ReceiverLink.prototype.detach = function (callback, err) {
        this._fsm.handle('detach', callback, err);
    };
    ReceiverLink.prototype.forceDetach = function (err) {
        this._fsm.handle('forceDetach', err);
    };
    ReceiverLink.prototype.attach = function (callback) {
        this._fsm.handle('attach', callback);
    };
    ReceiverLink.prototype.accept = function (message, callback) {
        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_021: [The `accept` method shall throw if the `message` argument is falsy.]*/
        if (!message) {
            throw new ReferenceError('Invalid message object.');
        }
        this._fsm.handle('accept', message, callback);
    };
    /**
     * @deprecated Use accept(message, callback) instead (to adhere more closely to the AMQP10 lingo).
     */
    ReceiverLink.prototype.complete = function (message, callback) {
        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_015: [The `complete` method shall call the `accept` method with the same arguments (it is here for backward compatibility purposes only).]*/
        this.accept(message, callback);
    };
    ReceiverLink.prototype.reject = function (message, callback) {
        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_021: [The `reject` method shall throw if the `message` argument is falsy.]*/
        if (!message) {
            throw new ReferenceError('Invalid message object.');
        }
        this._fsm.handle('reject', message, callback);
    };
    ReceiverLink.prototype.abandon = function (message, callback) {
        /*Codes_SRS_NODE_AMQP_RECEIVER_LINK_16_021: [The `abandon` method shall throw if the `message` argument is falsy.]*/
        if (!message) {
            throw new ReferenceError('Invalid message object.');
        }
        this._fsm.handle('abandon', message, callback);
    };
    ReceiverLink.prototype._findDeliveryRecord = function (msg) {
        for (var element = 0; element < this._undisposedDeliveries.length; element++) {
            if (this._undisposedDeliveries[element].msg === msg) {
                var delivery = this._undisposedDeliveries[element].delivery;
                this._undisposedDeliveries.splice(element, 1);
                return delivery;
            }
        }
        return undefined;
    };
    ReceiverLink.prototype._safeCallback = function (callback, error, result) {
        if (callback) {
            process.nextTick(function () { return callback(error, result); });
        }
    };
    ReceiverLink.prototype._getErrorName = function (err) {
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
    return ReceiverLink;
}(events_1.EventEmitter));
exports.ReceiverLink = ReceiverLink;
//# sourceMappingURL=receiver_link.js.map