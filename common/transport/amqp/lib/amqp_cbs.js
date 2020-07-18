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
var uuid = require("uuid");
var async = require("async");
var events_1 = require("events");
var dbg = require("debug");
var azure_iot_common_1 = require("azure-iot-common");
var amqp_message_1 = require("./amqp_message");
var sender_link_1 = require("./sender_link");
var receiver_link_1 = require("./receiver_link");
var debug = dbg('azure-iot-amqp-base:CBS');
/**
 * @class      module:azure-iot-amqp-base.PutTokenStatus
 * @classdesc  Describes the state of the "put token" feature of the client that enables Claim-Based-Security authentication.
 *
 * @property   {Function}   outstandingPutTokens                This array will hold outstanding put token operations.  The array has
 *                                                              a monotonically increasing time ordering.  This is effected by the nature
 *                                                              of inserting new elements at the end of the array.  Note that elements may
 *                                                              be removed from the array at any index.
 * @property   {Number}     numberOfSecondsToTimeout            Currently a fixed value.  Could have a set option if we want to make this configurable.
 * @property   {Number}     putTokenTimeOutExaminationInterval  While there are ANY put token operations outstanding a timer will be invoked every
 *                                                              10 seconds to examine the outstandingPutTokens array for any put tokens that may have
 *                                                              expired.
 * @property   {Number}     timeoutTimer                        Timer used to trigger examination of the outstandingPutTokens array.
 */
var PutTokenStatus = /** @class */ (function () {
    function PutTokenStatus() {
        this.outstandingPutTokens = [];
        this.numberOfSecondsToTimeout = 120;
        this.putTokenTimeOutExaminationInterval = 10000;
    }
    return PutTokenStatus;
}());
/**
 * @private
 * Handles claims based security (sending and receiving SAS tokens over AMQP links).
 * This resides in the amqp-base package because it's used by the device and service SDKs but
 * the life cycle of this object is actually managed by the upper layer of each transport.
 */
var ClaimsBasedSecurityAgent = /** @class */ (function (_super) {
    __extends(ClaimsBasedSecurityAgent, _super);
    function ClaimsBasedSecurityAgent(session) {
        var _this = _super.call(this) || this;
        _this._putToken = new PutTokenStatus();
        _this._rheaSession = session;
        /*Codes_SRS_NODE_AMQP_CBS_16_001: [The `constructor` shall instantiate a `SenderLink` object for the `$cbs` endpoint.]*/
        _this._senderLink = new sender_link_1.SenderLink(ClaimsBasedSecurityAgent._putTokenSendingEndpoint, null, _this._rheaSession);
        /*Codes_SRS_NODE_AMQP_CBS_16_002: [The `constructor` shall instantiate a `ReceiverLink` object for the `$cbs` endpoint.]*/
        _this._receiverLink = new receiver_link_1.ReceiverLink(ClaimsBasedSecurityAgent._putTokenReceivingEndpoint, null, _this._rheaSession);
        _this._putTokensNotYetSent = [];
        _this._fsm = new machina.Fsm({
            initialState: 'detached',
            states: {
                detached: {
                    _onEnter: function (callback, err) {
                        clearTimeout(_this._putToken.timeoutTimer); // In the detached state there should be no outstanding put tokens.
                        var tokenOperation = _this._putTokensNotYetSent.shift();
                        while (tokenOperation) {
                            tokenOperation.callback(err);
                            tokenOperation = _this._putTokensNotYetSent.shift();
                        }
                        /*Codes_SRS_NODE_AMQP_CBS_16_006: [If given as an argument, the `attach` method shall call `callback` with a standard `Error` object if any link fails to attach.]*/
                        if (callback) {
                            callback(err);
                        }
                    },
                    attach: function (callback) {
                        _this._fsm.transition('attaching', callback);
                    },
                    detach: function (callback) { if (callback)
                        callback(); },
                    /*Tests_SRS_NODE_AMQP_CBS_16_021: [The `forceDetach()` method shall return immediately if no link is attached.]*/
                    forceDetach: function () { return; },
                    putToken: function (audience, token, callback) {
                        _this._putTokensNotYetSent.push({
                            audience: audience,
                            token: token,
                            callback: callback
                        });
                        _this._fsm.transition('attaching');
                    }
                },
                attaching: {
                    _onEnter: function (callback) {
                        _this._senderLink.attach(function (err) {
                            if (err) {
                                _this._fsm.transition('detaching', callback, err);
                            }
                            else {
                                _this._receiverLink.attach(function (err) {
                                    if (err) {
                                        _this._fsm.transition('detaching', callback, err);
                                    }
                                    else {
                                        _this._receiverLink.on('message', function (msg) {
                                            //
                                            // Regardless of whether we found the put token in the list of outstanding
                                            // operations, accept it.  This could be a put token that we previously
                                            // timed out.  Be happy.  It made it home, just too late to be useful.
                                            //
                                            /*Codes_SRS_NODE_AMQP_CBS_16_020: [All responses shall be accepted.]*/
                                            _this._receiverLink.accept(msg);
                                            for (var i = 0; i < _this._putToken.outstandingPutTokens.length; i++) {
                                                //
                                                // Just as a reminder.  For cbs, the message id and the correlation id
                                                // always stayed as string values.  They never went on over the wire
                                                // as the amqp uuid type.
                                                //
                                                if (msg.correlation_id === _this._putToken.outstandingPutTokens[i].correlationId) {
                                                    var completedPutToken = _this._putToken.outstandingPutTokens[i];
                                                    _this._putToken.outstandingPutTokens.splice(i, 1);
                                                    //
                                                    // If this was the last outstanding put token then get rid of the timer trying to clear out expiring put tokens.
                                                    //
                                                    if (_this._putToken.outstandingPutTokens.length === 0) {
                                                        clearTimeout(_this._putToken.timeoutTimer);
                                                    }
                                                    if (completedPutToken.putTokenCallback) {
                                                        /*Codes_SRS_NODE_AMQP_CBS_16_019: [A put token response of 200 will invoke `putTokenCallback` with null parameters.]*/
                                                        var error = null;
                                                        if (msg.application_properties['status-code'] !== 200) {
                                                            /*Codes_SRS_NODE_AMQP_CBS_16_018: [A put token response not equal to 200 will invoke `putTokenCallback` with an error object of UnauthorizedError.]*/
                                                            error = new azure_iot_common_1.errors.UnauthorizedError(msg.application_properties['status-description']);
                                                        }
                                                        completedPutToken.putTokenCallback(error);
                                                    }
                                                    break;
                                                }
                                            }
                                        });
                                        _this._fsm.transition('attached', callback);
                                    }
                                });
                            }
                        });
                    },
                    detach: function (callback, err) { return _this._fsm.transition('detaching', callback, err); },
                    forceDetach: function () {
                        /*Tests_SRS_NODE_AMQP_CBS_16_022: [The `forceDetach()` method shall call `forceDetach()` on all attached links.]*/
                        if (_this._senderLink) {
                            _this._senderLink.forceDetach();
                        }
                        if (_this._receiverLink) {
                            _this._receiverLink.forceDetach();
                        }
                        _this._fsm.transition('detached');
                    },
                    putToken: function (audience, token, callback) {
                        _this._putTokensNotYetSent.push({
                            audience: audience,
                            token: token,
                            callback: callback
                        });
                    }
                },
                attached: {
                    _onEnter: function (callback) {
                        if (callback) {
                            callback();
                        }
                        var tokenOperation = _this._putTokensNotYetSent.shift();
                        while (tokenOperation) {
                            _this._fsm.handle('putToken', tokenOperation.audience, tokenOperation.token, tokenOperation.callback);
                            tokenOperation = _this._putTokensNotYetSent.shift();
                        }
                    },
                    /*Codes_SRS_NODE_AMQP_CBS_06_001: [If in the attached state, either the sender or the receiver links gets an error, an error of `azure-iot-amqp-base:error-indicated` will have been indicated on the container object and the cbs will remain in the attached state.  The owner of the cbs MUST detach.] */
                    attach: function (callback) { return callback(); },
                    detach: function (callback, err) {
                        debug('while attached - detach for CBS links ' + _this._receiverLink + ' ' + _this._senderLink);
                        _this._fsm.transition('detaching', callback, err);
                    },
                    forceDetach: function () {
                        debug('while attached - force detach for CBS links ' + _this._receiverLink + ' ' + _this._senderLink);
                        /*Tests_SRS_NODE_AMQP_CBS_16_022: [The `forceDetach()` method shall call `forceDetach()` on all attached links.]*/
                        _this._receiverLink.forceDetach();
                        _this._senderLink.forceDetach();
                        _this._fsm.transition('detached');
                    },
                    putToken: function (audience, token, putTokenCallback) {
                        /*SRS_NODE_AMQP_CBS_16_011: [The `putToken` method shall construct an amqp message that contains the following application properties:
                        ```
                        'operation': 'put-token'
                        'type': 'servicebus.windows.net:sastoken'
                        'name': <audience>
                        ```
                        and system properties of
                        ```
                        'to': '$cbs'
                        'messageId': <uuid>
                        'reply_to': 'cbs'
                        ```
                        and a body containing `<sasToken>`.]*/
                        var amqpMessage = new amqp_message_1.AmqpMessage();
                        amqpMessage.application_properties = {
                            operation: 'put-token',
                            type: 'servicebus.windows.net:sastoken',
                            name: audience
                        };
                        amqpMessage.body = token;
                        amqpMessage.to = '$cbs';
                        //
                        // For CBS, the message id and correlation id are encoded as string
                        //
                        amqpMessage.message_id = uuid.v4();
                        amqpMessage.reply_to = 'cbs';
                        var outstandingPutToken = {
                            putTokenCallback: putTokenCallback,
                            expirationTime: Math.round(Date.now() / 1000) + _this._putToken.numberOfSecondsToTimeout,
                            correlationId: amqpMessage.message_id
                        };
                        _this._putToken.outstandingPutTokens.push(outstandingPutToken);
                        //
                        // If this is the first put token then start trying to time it out.
                        //
                        if (_this._putToken.outstandingPutTokens.length === 1) {
                            _this._putToken.timeoutTimer = setTimeout(_this._removeExpiredPutTokens.bind(_this), _this._putToken.putTokenTimeOutExaminationInterval);
                        }
                        /*Codes_SRS_NODE_AMQP_CBS_16_012: [The `putToken` method shall send this message over the `$cbs` sender link.]*/
                        _this._senderLink.send(amqpMessage, function (err) {
                            if (err) {
                                // Find the operation in the outstanding array.  Remove it from the array since, well, it's not outstanding anymore.
                                // Since we may have arrived here asynchronously, we simply can't assume that it is the end of the array.  But,
                                // it's more likely near the end.
                                // If the token has expired it won't be found, but that's ok because its callback will have been called when it was removed.
                                for (var i = _this._putToken.outstandingPutTokens.length - 1; i >= 0; i--) {
                                    if (_this._putToken.outstandingPutTokens[i].correlationId === amqpMessage.message_id) {
                                        var outStandingPutTokenInError = _this._putToken.outstandingPutTokens[i];
                                        _this._putToken.outstandingPutTokens.splice(i, 1);
                                        //
                                        // This was the last outstanding put token.  No point in having a timer around trying to time nothing out.
                                        //
                                        if (_this._putToken.outstandingPutTokens.length === 0) {
                                            clearTimeout(_this._putToken.timeoutTimer);
                                        }
                                        /*Codes_SRS_NODE_AMQP_CBS_16_013: [The `putToken` method shall call `callback` (if supplied) if the `send` generates an error such that no response from the service will be forthcoming.]*/
                                        outStandingPutTokenInError.putTokenCallback(err);
                                        break;
                                    }
                                }
                            }
                        });
                    }
                },
                detaching: {
                    _onEnter: function (forwardedCallback, err) {
                        /*Codes_SRS_NODE_AMQP_CBS_16_008: [`detach` shall detach both sender and receiver links and return the state machine to the `detached` state.]*/
                        var links = [_this._senderLink, _this._receiverLink];
                        async.each(links, function (link, callback) {
                            if (link) {
                                debug('while detaching for link ');
                                link.detach(callback);
                            }
                            else {
                                callback();
                            }
                        }, function () {
                            _this._fsm.transition('detached', forwardedCallback, err);
                        });
                    },
                    '*': function (callback) { return _this._fsm.deferUntilTransition('detached'); }
                }
            }
        });
        return _this;
    }
    ClaimsBasedSecurityAgent.prototype.attach = function (callback) {
        this._fsm.handle('attach', callback);
    };
    ClaimsBasedSecurityAgent.prototype.detach = function (callback) {
        this._fsm.handle('detach', callback);
    };
    ClaimsBasedSecurityAgent.prototype.forceDetach = function () {
        this._fsm.handle('forceDetach');
    };
    /**
     * @method             module:azure-iot-amqp-base.Amqp#putToken
     * @description        Sends a put token operation to the IoT Hub to provide authentication for a device.
     * @param              audience          The path that describes what is being authenticated.  An example would be
     *                                       hub.azure-devices.net%2Fdevices%2Fmydevice
     * @param              token             The actual sas token being used to authenticate the device.  For the most
     *                                       part the audience is likely to be the sr field of the token.
     * @param {Function}   putTokenCallback  Called when the put token operation terminates.
     */
    ClaimsBasedSecurityAgent.prototype.putToken = function (audience, token, putTokenCallback) {
        /*Codes_SRS_NODE_AMQP_CBS_16_009: [The `putToken` method shall throw a ReferenceError if the `audience` argument is falsy.]*/
        if (!audience) {
            throw new ReferenceError('audience cannot be \'' + audience + '\'');
        }
        /*Codes_SRS_NODE_AMQP_CBS_16_010: [The `putToken` method shall throw a ReferenceError if the `token` argument is falsy.]*/
        if (!token) {
            throw new ReferenceError('token cannot be \'' + token + '\'');
        }
        this._fsm.handle('putToken', audience, token, putTokenCallback);
    };
    ClaimsBasedSecurityAgent.prototype._removeExpiredPutTokens = function () {
        var _this = this;
        var currentTime = Math.round(Date.now() / 1000);
        var expiredPutTokens = [];
        while (this._putToken.outstandingPutTokens.length > 0) {
            //
            // The timeouts in this array by definition are monotonically increasing.  We will be done looking if we
            // hit one that is not yet expired.
            //
            /*Codes_SRS_NODE_AMQP_CBS_16_014: [The `putToken` method will time out the put token operation if no response is returned within a configurable number of seconds.]*/
            if (this._putToken.outstandingPutTokens[0].expirationTime < currentTime) {
                expiredPutTokens.push(this._putToken.outstandingPutTokens[0]);
                this._putToken.outstandingPutTokens.splice(0, 1);
            }
            else {
                break;
            }
        }
        expiredPutTokens.forEach(function (currentExpiredPut) {
            /*Codes_SRS_NODE_AMQP_CBS_16_015: [The `putToken` method will invoke the `callback` (if supplied) with an error object if the put token operation timed out.]*/
            currentExpiredPut.putTokenCallback(new azure_iot_common_1.errors.TimeoutError('Put Token operation had no response within ' + _this._putToken.numberOfSecondsToTimeout));
        });
        //
        // If there are any putTokens left keep trying to time them out.
        //
        if (this._putToken.outstandingPutTokens.length > 0) {
            this._putToken.timeoutTimer = setTimeout(this._removeExpiredPutTokens.bind(this), this._putToken.putTokenTimeOutExaminationInterval);
        }
    };
    ClaimsBasedSecurityAgent._putTokenSendingEndpoint = '$cbs';
    ClaimsBasedSecurityAgent._putTokenReceivingEndpoint = '$cbs';
    return ClaimsBasedSecurityAgent;
}(events_1.EventEmitter));
exports.ClaimsBasedSecurityAgent = ClaimsBasedSecurityAgent;
//# sourceMappingURL=amqp_cbs.js.map