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
var https_1 = require("https");
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_common_2 = require("azure-iot-common");
var ConnectionString = require("./connection_string");
var amqp_1 = require("./amqp");
var device_method_1 = require("./device_method");
var azure_iot_http_base_1 = require("azure-iot-http-base");
var interfaces_1 = require("./interfaces");
var azure_iot_common_3 = require("azure-iot-common");
// tslint:disable-next-line:no-var-requires
var packageJson = require('../package.json');
var MAX_RETRY_TIMEOUT = 240000; // 4 minutes
/**
 * The IoT Hub service client is used to communicate with devices through an Azure IoT hub.
 * It lets the SDK user:
 *   - send cloud-to-device (also known as commands) to devices: commands are queued on IoT Hub and delivered asynchronously only when the device is connected. Only 50 commands can be queued per device.
 *   - invoke direct methods on devices (which will work only if the device is currently connected: it's a synchronous way of communicating with the device)
 *   - listen for feedback messages sent by devices for previous commands.
 *   - listen for file upload notifications from devices.
 *
 * Users should create new {@link azure-iothub.Client} instances by calling one of the factory methods,
 * {@link azure-iothub.Client.fromConnectionString|fromConnectionString} or
 * {@link azure-iothub.Client.fromSharedAccessSignature|fromSharedAccessSignature},
 * to create an IoT Hub service Client.
 */
var Client = /** @class */ (function (_super) {
    __extends(Client, _super);
    /**
     * @private
     */
    function Client(transport, restApiClient) {
        var _this = _super.call(this) || this;
        /*Codes_SRS_NODE_IOTHUB_CLIENT_05_001: [The Client constructor shall throw ReferenceError if the transport argument is falsy.]*/
        if (!transport)
            throw new ReferenceError('transport is \'' + transport + '\'');
        _this._transport = transport;
        _this._restApiClient = restApiClient;
        if (_this._restApiClient && _this._restApiClient.setOptions) {
            _this._restApiClient.setOptions({ http: { agent: new https_1.Agent({ keepAlive: true }) } });
        }
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_021: [The `Client` constructor shall initialize the default retry policy to `ExponentialBackoffWithJitter` with a maximum timeout of 4 minutes.]*/
        _this._retryPolicy = new azure_iot_common_2.ExponentialBackOffWithJitter();
        return _this;
    }
    Client.prototype.open = function (done) {
        var _this = this;
        return azure_iot_common_3.tripleValueCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_008: [The open method shall open a connection to the IoT Hub that was identified when the Client object was created (e.g., in Client.fromConnectionString).]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_009: [When the open method completes, the callback function (indicated by the done argument) shall be invoked with the following arguments:
            err - standard JavaScript Error object (or subclass)]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_010: [The argument err passed to the callback done shall be null if the protocol operation was successful.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_011: [Otherwise the argument err shall have a transport property containing implementation-specific response information for use in logging and troubleshooting.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_012: [If the connection is already open when open is called, it shall have no effect—that is, the done callback shall be invoked immediately with a null argument.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_16_006: [The `open` method should not throw if the `done` callback is not specified.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_16_022: [The `open` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to connect the transport.]*/
            var retryOp = new azure_iot_common_2.RetryOperation(_this._retryPolicy, MAX_RETRY_TIMEOUT);
            retryOp.retry(function (retryCallback) {
                _this._transport.connect(retryCallback);
            }, function (err, result) {
                if (err) {
                    if (_callback)
                        _callback(err);
                }
                else {
                    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_002: [If the transport successfully establishes a connection the `open` method shall subscribe to the `disconnect` event of the transport.]*/
                    _this._transport.on('disconnect', _this._disconnectHandler.bind(_this));
                    if (_callback)
                        _callback(null, result);
                }
            });
        }, function (r, m) { return interfaces_1.createResultWithIncomingMessage(r, m); }, done);
    };
    Client.prototype.close = function (done) {
        var _this = this;
        return azure_iot_common_3.tripleValueCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_021: [The close method shall close the connection.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_022: [When the close method completes, the callback function (indicated by the done argument) shall be invoked with the following arguments:
            err - standard JavaScript Error object (or subclass)]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_023: [The argument err passed to the callback _callback shall be null if the protocol operation was successful.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_024: [Otherwise the argument err shall have a transport property containing implementation-specific response information for use in logging and troubleshooting.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_025: [If the connection is not open when close is called, it shall have no effect— that is, the _callback callback shall be invoked immediately with null arguments.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_16_005: [The `close` method should not throw if the `_callback` callback is not specified.]*/
            _this._transport.disconnect(function (err, result) {
                if (err) {
                    if (_callback)
                        _callback(err);
                }
                else {
                    /*Codes_SRS_NODE_IOTHUB_CLIENT_16_003: [The `close` method shall remove the listener that has been attached to the transport `disconnect` event.]*/
                    _this._transport.removeAllListeners('disconnect');
                    if (_callback)
                        _callback(null, result);
                }
            });
        }, function (r, m) { return interfaces_1.createResultWithIncomingMessage(r, m); }, done);
    };
    Client.prototype.send = function (deviceId, message, done) {
        var _this = this;
        return azure_iot_common_3.tripleValueCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_013: [The send method shall throw ReferenceError if the deviceId or message arguments are falsy.]*/
            if (!deviceId) {
                throw new ReferenceError('deviceId is \'' + deviceId + '\'');
            }
            if (!message) {
                throw new ReferenceError('message is \'' + message + '\'');
            }
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_014: [The `send` method shall convert the `message` object to type `azure-iot-common.Message` if it is not already of type `azure-iot-common.Message`.]*/
            if (message.constructor.name !== 'Message') {
                /*Codes_SRS_NODE_IOTHUB_CLIENT_18_016: [The `send` method shall throw an `ArgumentError` if the `message` argument is not of type `azure-iot-common.Message` or `azure-iot-common.Message.BufferConvertible`.]*/
                if (!azure_iot_common_1.Message.isBufferConvertible(message)) {
                    throw new azure_iot_common_1.errors.ArgumentError('message is not of type Message or Message.BufferConvertible');
                }
                message = new azure_iot_common_1.Message(message);
            }
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_015: [If the connection has not already been opened (e.g., by a call to open), the send method shall open the connection before attempting to send the message.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_016: [When the send method completes, the callback function (indicated by the _callback argument) shall be invoked with the following arguments:
            err - standard JavaScript Error object (or subclass)
            response - an implementation-specific response object returned by the underlying protocol, useful for logging and troubleshooting]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_017: [The argument err passed to the callback _callback shall be null if the protocol operation was successful.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_018: [Otherwise the argument err shall have a transport property containing implementation-specific response information for use in logging and troubleshooting.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_019: [If the deviceId has not been registered with the IoT Hub, send shall return an instance of DeviceNotFoundError.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_020: [If the queue which receives messages on behalf of the device is full, send shall return and instance of DeviceMaximumQueueDepthExceededError.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_16_023: [The `send` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to send the message.]*/
            var retryOp = new azure_iot_common_2.RetryOperation(_this._retryPolicy, MAX_RETRY_TIMEOUT);
            retryOp.retry(function (retryCallback) {
                _this._transport.send(deviceId, message, retryCallback);
            }, function (err, result) {
                /*Codes_SRS_NODE_IOTHUB_CLIENT_16_030: [The `send` method shall not throw if the `_callback` callback is falsy.]*/
                if (_callback) {
                    if (err) {
                        _callback(err);
                    }
                    else {
                        _callback(null, result);
                    }
                }
            });
        }, function (r, m) { return interfaces_1.createResultWithIncomingMessage(r, m); }, done);
    };
    Client.prototype._invokeDeviceMethod = function (deviceId, moduleIdOrMethodParams, methodParamsOrDone, done) {
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_014: [The `invokeDeviceMethod` method shall throw a `ReferenceError` if `deviceId` is `null`, `undefined` or an empty string.]*/
        if (deviceId === undefined || deviceId === null || deviceId === '')
            throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');
        var actualModuleId = undefined;
        var actualMethodParams = undefined;
        var actualCallback = undefined;
        if (typeof moduleIdOrMethodParams === 'string') {
            actualModuleId = moduleIdOrMethodParams;
            actualMethodParams = methodParamsOrDone;
            actualCallback = done;
        }
        else {
            // actualModuleId stays undefined
            actualMethodParams = moduleIdOrMethodParams;
            actualCallback = methodParamsOrDone;
        }
        // Validation of the validity of actualMethodParams is handled in the DeviceMethod constructor.
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_009: [The `invokeDeviceMethod` method shall initialize a new `DeviceMethod` instance with the `methodName`, `payload` and `timeout` values passed in the arguments.]*/
        var method = new device_method_1.DeviceMethod(actualMethodParams, this._restApiClient);
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_010: [The `invokeDeviceMethod` method shall use the newly created instance of `DeviceMethod` to invoke the method on the device specified with the `deviceid` argument .]*/
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_012: [The `invokeDeviceMethod` method shall call the `done` callback with a standard javascript `Error` object if the request failed.]*/
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_013: [The `invokeDeviceMethod` method shall call the `done` callback with a `null` first argument, the result of the method execution in the second argument, and the transport-specific response object as a third argument.]*/
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_026: [The `invokeDeviceMethod` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to send the method request.]*/
        var retryOp = new azure_iot_common_2.RetryOperation(this._retryPolicy, MAX_RETRY_TIMEOUT);
        retryOp.retry(function (retryCallback) {
            /*Codes_SRS_NODE_IOTHUB_CLIENT_18_003: [If `moduleIdOrMethodParams` is a string the `invokeDeviceMethod` method shall call `invokeOnModule` on the new `DeviceMethod` instance. ]*/
            if (actualModuleId) {
                method.invokeOnModule(deviceId, actualModuleId, retryCallback);
            }
            else {
                method.invokeOn(deviceId, retryCallback);
            }
        }, function (err, result, response) {
            if (actualCallback) {
                if (err) {
                    actualCallback(err);
                }
                else {
                    actualCallback(null, result, response);
                }
            }
        });
    };
    Client.prototype.invokeDeviceMethod = function (deviceId, moduleIdOrMethodParams, methodParamsOrDone, done) {
        var _this = this;
        var callback = done || ((typeof methodParamsOrDone === 'function') ? methodParamsOrDone : undefined);
        var moduleId;
        var methodParams;
        if (callback) {
            return this._invokeDeviceMethod(deviceId, moduleIdOrMethodParams, methodParamsOrDone, done);
        }
        else {
            if (typeof moduleIdOrMethodParams === 'string') {
                moduleId = moduleIdOrMethodParams;
                if (methodParamsOrDone) {
                    methodParams = methodParamsOrDone;
                }
            }
            else {
                moduleId = undefined;
                methodParams = moduleIdOrMethodParams;
            }
        }
        if (moduleId) {
            return azure_iot_common_3.tripleValueCallbackToPromise(function (_callback) {
                _this._invokeDeviceMethod(deviceId, moduleId, methodParams, _callback);
            }, function (r, m) { return interfaces_1.createResultWithIncomingMessage(r, m); }, callback);
        }
        else {
            return azure_iot_common_3.tripleValueCallbackToPromise(function (_callback) {
                _this._invokeDeviceMethod(deviceId, methodParams, _callback);
            }, function (r, m) { return interfaces_1.createResultWithIncomingMessage(r, m); }, callback);
        }
    };
    Client.prototype.getFeedbackReceiver = function (done) {
        var _this = this;
        return azure_iot_common_3.tripleValueCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_027: [When the `getFeedbackReceiver` method completes, the callback function (indicated by the `done` argument) shall be invoked with the following arguments:
                - `err` - standard JavaScript `Error` object (or subclass): `null` if the operation was successful
                - `receiver` - an `AmqpReceiver` instance: `undefined` if the operation failed]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_030: [The FeedbackReceiver class shall inherit EventEmitter to provide consumers the ability to listen for (and stop listening for) events.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_031: [FeedbackReceiver shall expose the 'errorReceived' event, whose handler shall be called with the following arguments:
            err – standard JavaScript Error object (or subclass)]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_032: [FeedbackReceiver shall expose the 'message' event, whose handler shall be called with the following arguments when a new feedback message is received from the IoT Hub:
            message – a JavaScript object containing a batch of one or more feedback records]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_05_033: [getFeedbackReceiver shall return the same instance of Client.FeedbackReceiver every time it is called with a given instance of Client.]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_16_024: [The `getFeedbackReceiver` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to get a feedback receiver object.]*/
            var retryOp = new azure_iot_common_2.RetryOperation(_this._retryPolicy, MAX_RETRY_TIMEOUT);
            retryOp.retry(function (retryCallback) {
                _this._transport.getFeedbackReceiver(retryCallback);
            }, function (err, result) {
                if (_callback) {
                    if (err) {
                        _callback(err);
                    }
                    else {
                        _callback(null, result);
                    }
                }
            });
        }, function (r, m) { return interfaces_1.createResultWithIncomingMessage(r, m); }, done);
    };
    Client.prototype.getFileNotificationReceiver = function (done) {
        var _this = this;
        return azure_iot_common_3.tripleValueCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_IOTHUB_CLIENT_16_001: [When the `getFileNotificationReceiver` method completes, the callback function (indicated by the `done` argument) shall be invoked with the following arguments:
             - `err` - standard JavaScript `Error` object (or subclass): `null` if the operation was successful
             - `receiver` - an `AmqpReceiver` instance: `undefined` if the operation failed]*/
            /*Codes_SRS_NODE_IOTHUB_CLIENT_16_025: [The `getFileNotificationReceiver` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to send the get a feedback receiver object.]*/
            var retryOp = new azure_iot_common_2.RetryOperation(_this._retryPolicy, MAX_RETRY_TIMEOUT);
            retryOp.retry(function (retryCallback) {
                _this._transport.getFileNotificationReceiver(retryCallback);
            }, function (err, result) {
                if (_callback) {
                    if (err) {
                        _callback(err);
                    }
                    else {
                        _callback(null, result);
                    }
                }
            });
        }, function (r, m) { return interfaces_1.createResultWithIncomingMessage(r, m); }, done);
    };
    /**
     * Set the policy used by the client to retry network operations.
     *
     * @param policy policy used to retry operations (eg. open, send, etc.).
     *               The SDK comes with 2 "built-in" policies: ExponentialBackoffWithJitter (default)
     *               and NoRetry (to cancel any form of retry). The user can also pass its own object as
     *               long as it implements 2 methods:
     *               - shouldRetry(err: Error): boolean : indicates whether an operation should be retried based on the error type
     *               - nextRetryTimeout(retryCount: number, throttled: boolean): number : returns the time to wait (in milliseconds)
     *               before retrying based on the past number of attempts (retryCount) and the fact that the error is a throttling error or not.
     */
    Client.prototype.setRetryPolicy = function (policy) {
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_027: [The `setRetryPolicy` method shall throw a `ReferenceError` if the `policy` argument is falsy.]*/
        if (!policy) {
            throw new ReferenceError('policy cannot be \'' + policy + '\'');
        }
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_028: [The `setRetryPolicy` method shall throw an `ArgumentError` if the `policy` object does not have a `shouldRetry` method and a `nextRetryTimeout` method.]*/
        if (!(typeof policy.shouldRetry === 'function') || !(typeof policy.nextRetryTimeout === 'function')) {
            throw new azure_iot_common_1.errors.ArgumentError('policy should have a shouldRetry method and a nextRetryTimeout method');
        }
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_029: [Any operation (e.g. `send`, `getFeedbackReceiver`, etc) initiated after a call to `setRetryPolicy` shall use the policy passed as argument to retry.]*/
        this._retryPolicy = policy;
    };
    Client.prototype._disconnectHandler = function (reason) {
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_004: [** The `disconnect` event shall be emitted when the client is disconnected from the server.]*/
        var evt = new azure_iot_common_1.results.Disconnected();
        evt.reason = reason;
        this.emit('disconnect', evt);
    };
    /**
     * @method            module:azure-iothub.Client.fromConnectionString
     * @static
     * @description       Creates an IoT Hub service client from the given
     *                    connection string using the default transport
     *                    (Amqp) or the one specified in the second argument.
     *
     * @param {String}    connStr       A connection string which encapsulates "device
     *                                  connect" permissions on an IoT hub.
     * @param {Function}  Transport     A transport constructor.
     *
     * @returns {module:azure-iothub.Client}
     */
    Client.fromConnectionString = function (connStr, transportCtor) {
        /*Codes_SRS_NODE_IOTHUB_CLIENT_05_002: [The fromConnectionString method shall throw ReferenceError if the connStr argument is falsy.]*/
        if (!connStr)
            throw new ReferenceError('connStr is \'' + connStr + '\'');
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_016: [The `fromConnectionString` method shall use the `Transport` constructor passed as argument to instantiate a transport object if it's not falsy.]*/
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_017: [The `fromConnectionString` method shall use the default Transport (Amqp) if the `Transport` optional argument is falsy.]*/
        if (!transportCtor) {
            transportCtor = amqp_1.Amqp;
        }
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_015: [The `fromConnectionString` method shall create a new transport instance and pass it a config object formed from the connection string given as argument.]*/
        var cn = ConnectionString.parse(connStr);
        var config = {
            host: cn.HostName,
            keyName: cn.SharedAccessKeyName,
            sharedAccessSignature: azure_iot_common_1.SharedAccessSignature.create(cn.HostName, cn.SharedAccessKeyName, cn.SharedAccessKey, azure_iot_common_1.anHourFromNow())
        };
        /*Codes_SRS_NODE_IOTHUB_CLIENT_05_004: [The fromConnectionString method shall return a new instance of the Client object, as by a call to new Client(transport).]*/
        return new Client(new transportCtor(config), new azure_iot_http_base_1.RestApiClient(config, packageJson.name + '/' + packageJson.version));
    };
    /**
     * @method            module:azure-iothub.Client.fromSharedAccessSignature
     * @static
     * @description       Creates an IoT Hub service client from the given
     *                    shared access signature using the default transport
     *                    (Amqp) or the one specified in the second argument.
     *
     * @param {String}    sharedAccessSignature   A shared access signature which encapsulates
     *                            "service connect" permissions on an IoT hub.
     * @param {Function}  Transport     A transport constructor.
     *
     * @returns {module:azure-iothub.Client}
     */
    Client.fromSharedAccessSignature = function (sharedAccessSignature, transportCtor) {
        /*Codes_SRS_NODE_IOTHUB_CLIENT_05_005: [The fromSharedAccessSignature method shall throw ReferenceError if the sharedAccessSignature argument is falsy.]*/
        if (!sharedAccessSignature)
            throw new ReferenceError('sharedAccessSignature is \'' + sharedAccessSignature + '\'');
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_019: [The `fromSharedAccessSignature` method shall use the `Transport` constructor passed as argument to instantiate a transport object if it's not falsy.]*/
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_020: [The `fromSharedAccessSignature` method shall use the default Transport (Amqp) if the `Transport` optional argument is falsy.]*/
        if (!transportCtor) {
            transportCtor = amqp_1.Amqp;
        }
        var sas = azure_iot_common_1.SharedAccessSignature.parse(sharedAccessSignature);
        var decodedUri = decodeURIComponent(sas.sr);
        /*Codes_SRS_NODE_IOTHUB_CLIENT_16_018: [The `fromSharedAccessSignature` method shall create a new transport instance and pass it a config object formed from the connection string given as argument.]*/
        var config = {
            host: decodedUri,
            keyName: sas.skn,
            sharedAccessSignature: sas.toString()
        };
        /*Codes_SRS_NODE_IOTHUB_CLIENT_05_007: [The fromSharedAccessSignature method shall return a new instance of the Client object, as by a call to new Client(transport).]*/
        return new Client(new transportCtor(config), new azure_iot_http_base_1.RestApiClient(config, packageJson.name + '/' + packageJson.version));
    };
    return Client;
}(events_1.EventEmitter));
exports.Client = Client;
//# sourceMappingURL=client.js.map