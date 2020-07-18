// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
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
var events_1 = require("events");
var fs = require("fs");
var dbg = require("debug");
var debug = dbg('azure-iot-device:InternalClient');
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_common_2 = require("azure-iot-common");
var device_method_1 = require("./device_method");
var twin_1 = require("./twin");
/**
 * @private
 * Default maximum operation timeout for client operations: 4 minutes.
 */
var MAX_OPERATION_TIMEOUT = 240000;
function safeCallback(callback, error, result) {
    if (callback)
        callback(error, result);
}
/**
 * @private
 */
var InternalClient = /** @class */ (function (_super) {
    __extends(InternalClient, _super);
    function InternalClient(transport, connStr) {
        var _this = this;
        /*Codes_SRS_NODE_INTERNAL_CLIENT_05_001: [The Client constructor shall throw ReferenceError if the transport argument is falsy.]*/
        if (!transport)
            throw new ReferenceError('transport is \'' + transport + '\'');
        _this = _super.call(this) || this;
        _this._methodsEnabled = false;
        if (connStr) {
            throw new azure_iot_common_1.errors.InvalidOperationError('the connectionString parameter of the constructor is not used - users of the SDK should be using the `fromConnectionString` factory method.');
        }
        _this._transport = transport;
        _this._transport.on('error', function (err) {
            // errors right now bubble up through the disconnect handler.
            // ultimately we would like to get rid of that disconnect event and rely on the error event instead
            debug('Transport error: ' + err.toString());
        });
        _this._methodCallbackMap = {};
        _this._disconnectHandler = function (err) {
            debug('transport disconnect event: ' + (err ? err.toString() : 'no error'));
            if (err && _this._retryPolicy.shouldRetry(err)) {
                /*Codes_SRS_NODE_INTERNAL_CLIENT_16_098: [If the transport emits a `disconnect` event while the client is subscribed to direct methods the retry policy shall be used to reconnect and re-enable the feature using the transport `enableMethods` method.]*/
                if (_this._methodsEnabled) {
                    _this._methodsEnabled = false;
                    debug('re-enabling Methods link');
                    _this._enableMethods(function (err) {
                        if (err) {
                            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_100: [If the retry policy fails to reestablish the direct methods functionality a `disconnect` event shall be emitted with a `results.Disconnected` object.]*/
                            _this.emit('disconnect', new azure_iot_common_1.results.Disconnected(err));
                        }
                    });
                }
                /*Codes_SRS_NODE_INTERNAL_CLIENT_16_099: [If the transport emits a `disconnect` event while the client is subscribed to desired properties updates the retry policy shall be used to reconnect and re-enable the feature using the transport `enableTwinDesiredPropertiesUpdates` method.]*/
                if (_this._twin && _this._twin.desiredPropertiesUpdatesEnabled) {
                    debug('re-enabling Twin');
                    _this._twin.enableTwinDesiredPropertiesUpdates(function (err) {
                        if (err) {
                            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_101: [If the retry policy fails to reestablish the twin desired properties updates functionality a `disconnect` event shall be emitted with a `results.Disconnected` object.]*/
                            _this.emit('disconnect', new azure_iot_common_1.results.Disconnected(err));
                        }
                    });
                }
            }
            else {
                _this.emit('disconnect', new azure_iot_common_1.results.Disconnected(err));
            }
        };
        /*Codes_SRS_NODE_INTERNAL_CLIENT_16_045: [If the transport successfully establishes a connection the `open` method shall subscribe to the `disconnect` event of the transport.]*/
        _this._transport.on('disconnect', _this._disconnectHandler);
        _this._retryPolicy = new azure_iot_common_2.ExponentialBackOffWithJitter();
        _this._maxOperationTimeout = MAX_OPERATION_TIMEOUT;
        return _this;
    }
    /*Codes_SRS_NODE_INTERNAL_CLIENT_05_016: [When a Client method encounters an error in the transport, the callback function (indicated by the done argument) shall be invoked with the following arguments:
    err - the standard JavaScript Error object, with a response property that points to a transport-specific response object, and a responseBody property that contains the body of the transport response.]*/
    /*Codes_SRS_NODE_INTERNAL_CLIENT_05_017: [With the exception of receive, when a Client method completes successfully, the callback function (indicated by the done argument) shall be invoked with the following arguments:
    err - null
    response - a transport-specific response object]*/
    InternalClient.prototype.updateSharedAccessSignature = function (sharedAccessSignature, updateSasCallback) {
        var _this = this;
        /*Codes_SRS_NODE_INTERNAL_CLIENT_16_031: [The updateSharedAccessSignature method shall throw a ReferenceError if the sharedAccessSignature parameter is falsy.]*/
        if (!sharedAccessSignature)
            throw new ReferenceError('sharedAccessSignature is falsy');
        var retryOp = new azure_iot_common_2.RetryOperation(this._retryPolicy, this._maxOperationTimeout);
        retryOp.retry(function (opCallback) {
            _this._transport.updateSharedAccessSignature(sharedAccessSignature, opCallback);
        }, function (err, result) {
            if (!err) {
                _this.emit('_sharedAccessSignatureUpdated');
            }
            safeCallback(updateSasCallback, err, result);
        });
    };
    InternalClient.prototype.open = function (openCallback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            var retryOp = new azure_iot_common_2.RetryOperation(_this._retryPolicy, _this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                _this._transport.connect(opCallback);
            }, function (connectErr, connectResult) {
                /*Codes_SRS_NODE_INTERNAL_CLIENT_16_060: [The `open` method shall call the `_callback` callback with a null error object and a `results.Connected()` result object if the transport is already connected, doesn't need to connect or has just connected successfully.]*/
                safeCallback(_callback, connectErr, connectResult);
            });
        }, openCallback);
    };
    InternalClient.prototype.sendEvent = function (message, sendEventCallback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            var retryOp = new azure_iot_common_2.RetryOperation(_this._retryPolicy, _this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                /*Codes_SRS_NODE_INTERNAL_CLIENT_05_007: [The sendEvent method shall send the event indicated by the message argument via the transport associated with the Client instance.]*/
                _this._transport.sendEvent(message, opCallback);
            }, function (err, result) {
                safeCallback(_callback, err, result);
            });
        }, sendEventCallback);
    };
    InternalClient.prototype.sendEventBatch = function (messages, sendEventBatchCallback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            var retryOp = new azure_iot_common_2.RetryOperation(_this._retryPolicy, _this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                /*Codes_SRS_NODE_INTERNAL_CLIENT_05_008: [The sendEventBatch method shall send the list of events (indicated by the messages argument) via the transport associated with the Client instance.]*/
                _this._transport.sendEventBatch(messages, opCallback);
            }, function (err, result) {
                safeCallback(_callback, err, result);
            });
        }, sendEventBatchCallback);
    };
    InternalClient.prototype.close = function (closeCallback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            _this._closeTransport(function (err, result) {
                safeCallback(_callback, err, result);
            });
        }, closeCallback);
    };
    InternalClient.prototype.setTransportOptions = function (options, done) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_024: [The ‘setTransportOptions’ method shall throw a ‘ReferenceError’ if the options object is falsy] */
            if (!options)
                throw new ReferenceError('options cannot be falsy.');
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_025: [The ‘setTransportOptions’ method shall throw a ‘NotImplementedError’ if the transport doesn’t implement a ‘setOption’ method.] */
            if (typeof _this._transport.setOptions !== 'function')
                throw new azure_iot_common_1.errors.NotImplementedError('setOptions does not exist on this transport');
            var clientOptions = {
                http: {
                    receivePolicy: options
                }
            };
            var retryOp = new azure_iot_common_2.RetryOperation(_this._retryPolicy, _this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                /*Codes_SRS_NODE_INTERNAL_CLIENT_16_021: [The ‘setTransportOptions’ method shall call the ‘setOptions’ method on the transport object.]*/
                _this._transport.setOptions(clientOptions, opCallback);
            }, function (err) {
                if (err) {
                    safeCallback(_callback, err);
                }
                else {
                    safeCallback(_callback, null, new azure_iot_common_1.results.TransportConfigured());
                }
            });
        }, done);
    };
    InternalClient.prototype.setOptions = function (options, done) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_042: [The `setOptions` method shall throw a `ReferenceError` if the options object is falsy.]*/
            if (!options)
                throw new ReferenceError('options cannot be falsy.');
            /*Codes_SRS_NODE_INTERNAL_CLIENT_06_001: [The `setOptions` method shall assume the `ca` property is the name of an already existent file and it will attempt to read that file as a pem into a string value and pass the string to config object `ca` property.  Otherwise, it is assumed to be a pem string.] */
            if (options.ca) {
                fs.readFile(options.ca, 'utf8', function (err, contents) {
                    if (!err) {
                        var localOptions = {};
                        for (var k in options) {
                            localOptions[k] = options[k];
                        }
                        localOptions.ca = contents;
                        _this._invokeSetOptions(localOptions, _callback);
                    }
                    else {
                        _this._invokeSetOptions(options, _callback);
                    }
                });
            }
            else {
                _this._invokeSetOptions(options, _callback);
            }
        }, done);
    };
    InternalClient.prototype.complete = function (message, completeCallback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_016: [The ‘complete’ method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
            if (!message)
                throw new ReferenceError('message is \'' + message + '\'');
            var retryOp = new azure_iot_common_2.RetryOperation(_this._retryPolicy, _this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                _this._transport.complete(message, opCallback);
            }, function (err, result) {
                safeCallback(_callback, err, result);
            });
        }, completeCallback);
    };
    InternalClient.prototype.reject = function (message, rejectCallback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_018: [The reject method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
            if (!message)
                throw new ReferenceError('message is \'' + message + '\'');
            var retryOp = new azure_iot_common_2.RetryOperation(_this._retryPolicy, _this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                _this._transport.reject(message, opCallback);
            }, function (err, result) {
                safeCallback(_callback, err, result);
            });
        }, rejectCallback);
    };
    InternalClient.prototype.abandon = function (message, abandonCallback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_017: [The abandon method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
            if (!message)
                throw new ReferenceError('message is \'' + message + '\'');
            var retryOp = new azure_iot_common_2.RetryOperation(_this._retryPolicy, _this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                _this._transport.abandon(message, opCallback);
            }, function (err, result) {
                safeCallback(_callback, err, result);
            });
        }, abandonCallback);
    };
    InternalClient.prototype.getTwin = function (done) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_094: [If this is the first call to `getTwin` the method shall instantiate a new `Twin` object  and pass it the transport currently in use.]*/
            if (!_this._twin) {
                _this._twin = new twin_1.Twin(_this._transport, _this._retryPolicy, _this._maxOperationTimeout);
            }
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_095: [The `getTwin` method shall call the `get()` method on the `Twin` object currently in use and pass it its `done` argument for a callback.]*/
            _this._twin.get(_callback);
        }, done);
    };
    /**
     * Sets the retry policy used by the client on all operations. The default is {@link azure-iot-common.ExponentialBackoffWithJitter|ExponentialBackoffWithJitter}.
     * @param policy {RetryPolicy}  The retry policy that should be used for all future operations.
     */
    InternalClient.prototype.setRetryPolicy = function (policy) {
        /*Codes_SRS_NODE_INTERNAL_CLIENT_16_083: [The `setRetryPolicy` method shall throw a `ReferenceError` if the policy object is falsy.]*/
        if (!policy) {
            throw new ReferenceError('\'policy\' cannot be \'' + policy + '\'');
        }
        else {
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_084: [The `setRetryPolicy` method shall throw an `ArgumentError` if the policy object doesn't have a `shouldRetry` method.]*/
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_085: [The `setRetryPolicy` method shall throw an `ArgumentError` if the policy object doesn't have a `nextRetryTimeout` method.]*/
            if (typeof policy.shouldRetry !== 'function' || typeof policy.nextRetryTimeout !== 'function') {
                throw new azure_iot_common_1.errors.ArgumentError('A policy object must have a maxTimeout property that is a number and a nextRetryTimeout method.');
            }
        }
        /*Codes_SRS_NODE_INTERNAL_CLIENT_16_086: [Any operation happening after a `setRetryPolicy` call should use the policy set during that call.]*/
        this._retryPolicy = policy;
        /*Codes_SRS_NODE_INTERNAL_CLIENT_16_096: [The `setRetryPolicy` method shall call the `setRetryPolicy` method on the twin if it is set and pass it the `policy` object.]*/
        if (this._twin) {
            this._twin.setRetryPolicy(policy);
        }
    };
    InternalClient.prototype._onDeviceMethod = function (methodName, callback) {
        var _this = this;
        // validate input args
        this._validateDeviceMethodInputs(methodName, callback);
        this._methodCallbackMap[methodName] = callback;
        this._addMethodCallback(methodName, callback);
        this._enableMethods(function (err) {
            if (err) {
                _this.emit('error', err);
            }
        });
    };
    InternalClient.prototype._invokeSetOptions = function (options, done) {
        var _this = this;
        // Making this an operation that can be retried because we cannot assume the transport's behavior (whether it's going to disconnect/reconnect, etc).
        var retryOp = new azure_iot_common_2.RetryOperation(this._retryPolicy, this._maxOperationTimeout);
        retryOp.retry(function (opCallback) {
            _this._transport.setOptions(options, opCallback);
        }, function (err) {
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_043: [The `done` callback shall be invoked no parameters when it has successfully finished setting the client and/or transport options.]*/
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_044: [The `done` callback shall be invoked with a standard javascript `Error` object and no result object if the client could not be configured as requested.]*/
            safeCallback(done, err);
        });
    };
    InternalClient.prototype._validateDeviceMethodInputs = function (methodName, callback) {
        // Codes_SRS_NODE_INTERNAL_CLIENT_13_020: [ onDeviceMethod shall throw a ReferenceError if methodName is falsy. ]
        if (!methodName) {
            throw new ReferenceError('methodName cannot be \'' + methodName + '\'');
        }
        // Codes_SRS_NODE_INTERNAL_CLIENT_13_024: [ onDeviceMethod shall throw a TypeError if methodName is not a string. ]
        if (typeof (methodName) !== 'string') {
            throw new TypeError('methodName\'s type is \'' + typeof (methodName) + '\'. A string was expected.');
        }
        // Codes_SRS_NODE_INTERNAL_CLIENT_13_022: [ onDeviceMethod shall throw a ReferenceError if callback is falsy. ]
        if (!callback) {
            throw new ReferenceError('callback cannot be \'' + callback + '\'');
        }
        // Codes_SRS_NODE_INTERNAL_CLIENT_13_025: [ onDeviceMethod shall throw a TypeError if callback is not a Function. ]
        if (typeof (callback) !== 'function') {
            throw new TypeError('callback\'s type is \'' + typeof (callback) + '\'. A function reference was expected.');
        }
        // Codes_SRS_NODE_INTERNAL_CLIENT_13_023: [ onDeviceMethod shall throw an Error if a listener is already subscribed for a given method call. ]
        if (!!(this._methodCallbackMap[methodName])) {
            throw new Error('A handler for this method has already been registered with the client.');
        }
    };
    InternalClient.prototype._addMethodCallback = function (methodName, callback) {
        var self = this;
        this._transport.onDeviceMethod(methodName, function (message) {
            // build the request object
            var request = new device_method_1.DeviceMethodRequest(message.requestId, message.methods.methodName, message.body);
            // build the response object
            var response = new device_method_1.DeviceMethodResponse(message.requestId, self._transport);
            // Codes_SRS_NODE_INTERNAL_CLIENT_13_001: [ The onDeviceMethod method shall cause the callback function to be invoked when a cloud-to-device method invocation signal is received from the IoT Hub service. ]
            callback(request, response);
        });
    };
    InternalClient.prototype._enableMethods = function (callback) {
        var _this = this;
        if (!this._methodsEnabled) {
            var retryOp = new azure_iot_common_2.RetryOperation(this._retryPolicy, this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                _this._transport.enableMethods(opCallback);
            }, function (err) {
                if (!err) {
                    _this._methodsEnabled = true;
                }
                callback(err);
            });
        }
        else {
            callback();
        }
    };
    // Currently there is no code making use of this function, because there is no "removeDeviceMethod" corresponding to "onDeviceMethod"
    // private _disableMethods(callback: (err?: Error) => void): void {
    //   if (this._methodsEnabled) {
    //     this._transport.disableMethods((err) => {
    //       if (!err) {
    //         this._methodsEnabled = false;
    //       }
    //       callback(err);
    //     });
    //   } else {
    //     callback();
    //   }
    // }
    InternalClient.prototype._closeTransport = function (closeCallback) {
        var onDisconnected = function (err, result) {
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_056: [The `close` method shall not throw if the `closeCallback` is not passed.]*/
            /*Codes_SRS_NODE_INTERNAL_CLIENT_16_055: [The `close` method shall call the `closeCallback` function when done with either a single Error object if it failed or null and a results.Disconnected object if successful.]*/
            safeCallback(closeCallback, err, result);
        };
        /*Codes_SRS_NODE_INTERNAL_CLIENT_16_046: [The `close` method shall remove the listener that has been attached to the transport `disconnect` event.]*/
        this._transport.removeListener('disconnect', this._disconnectHandler);
        /*Codes_SRS_NODE_INTERNAL_CLIENT_16_001: [The `close` function shall call the transport's `disconnect` function if it exists.]*/
        this._transport.disconnect(function (disconnectError, disconnectResult) {
            onDisconnected(disconnectError, disconnectResult);
        });
    };
    // SAS token created by the client have a lifetime of 60 minutes, renew every 45 minutes
    /**
     * @private
     */
    InternalClient.sasRenewalInterval = 2700000;
    return InternalClient;
}(events_1.EventEmitter));
exports.InternalClient = InternalClient;
//# sourceMappingURL=internal_client.js.map