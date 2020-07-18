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
var dbg = require("debug");
var debug = dbg('azure-iot-device:ModuleClient');
var fs = require("fs");
var azure_iot_common_1 = require("azure-iot-common");
var internal_client_1 = require("./internal_client");
var azure_iot_common_2 = require("azure-iot-common");
var sak_authentication_provider_1 = require("./sak_authentication_provider");
var sas_authentication_provider_1 = require("./sas_authentication_provider");
var iotedge_authentication_provider_1 = require("./iotedge_authentication_provider");
var device_method_1 = require("./device_method");
function safeCallback(callback, error, result) {
    if (callback)
        callback(error, result);
}
/**
 * IoT Hub device client used to connect a device with an Azure IoT hub.
 *
 * Users of the SDK should call one of the factory methods,
 * {@link azure-iot-device.Client.fromConnectionString|fromConnectionString}
 * or {@link azure-iot-device.Client.fromSharedAccessSignature|fromSharedAccessSignature}
 * to create an IoT Hub device client.
 */
var ModuleClient = /** @class */ (function (_super) {
    __extends(ModuleClient, _super);
    /**
     * @private
     * @constructor
     * @param {Object}  transport         An object that implements the interface
     *                                    expected of a transport object, e.g.,
     *                                    {@link azure-iot-device-mqtt.Mqtt|Mqtt}.
     * @param {Object}  restApiClient     the RestApiClient object to use for HTTP calls
     */
    function ModuleClient(transport, methodClient) {
        var _this = _super.call(this, transport, undefined) || this;
        _this._inputMessagesEnabled = false;
        _this._methodClient = methodClient;
        /* Codes_SRS_NODE_MODULE_CLIENT_18_012: [ The `inputMessage` event shall be emitted when an inputMessage is received from the IoT Hub service. ]*/
        /* Codes_SRS_NODE_MODULE_CLIENT_18_013: [ The `inputMessage` event parameters shall be the inputName for the message and a `Message` object. ]*/
        _this._transport.on('inputMessage', function (inputName, msg) {
            _this.emit('inputMessage', inputName, msg);
        });
        _this.on('removeListener', function (eventName) {
            if (eventName === 'inputMessage' && _this.listeners('inputMessage').length === 0) {
                /* Codes_SRS_NODE_MODULE_CLIENT_18_015: [ The client shall stop listening for messages from the service whenever the last listener unsubscribes from the `inputMessage` event. ]*/
                _this._disableInputMessages(function (err) {
                    if (err) {
                        _this.emit('error', err);
                    }
                });
            }
        });
        _this.on('newListener', function (eventName) {
            if (eventName === 'inputMessage') {
                /* Codes_SRS_NODE_MODULE_CLIENT_18_014: [ The client shall start listening for messages from the service whenever there is a listener subscribed to the `inputMessage` event. ]*/
                _this._enableInputMessages(function (err) {
                    if (err) {
                        /*Codes_SRS_NODE_MODULE_CLIENT_18_017: [The client shall emit an `error` if connecting the transport fails while subscribing to `inputMessage` events.]*/
                        _this.emit('error', err);
                    }
                });
            }
        });
        _this._moduleDisconnectHandler = function (err) {
            debug('transport disconnect event: ' + (err ? err.toString() : 'no error'));
            if (err && _this._retryPolicy.shouldRetry(err)) {
                if (_this._inputMessagesEnabled) {
                    _this._inputMessagesEnabled = false;
                    debug('re-enabling input message link');
                    _this._enableInputMessages(function (err) {
                        if (err) {
                            /*Codes_SRS_NODE_MODULE_CLIENT_16_102: [If the retry policy fails to reestablish the C2D functionality a `disconnect` event shall be emitted with a `results.Disconnected` object.]*/
                            _this.emit('disconnect', new azure_iot_common_1.results.Disconnected(err));
                        }
                    });
                }
            }
        };
        /*Codes_SRS_NODE_MODULE_CLIENT_16_045: [If the transport successfully establishes a connection the `open` method shall subscribe to the `disconnect` event of the transport.]*/
        _this._transport.on('disconnect', _this._moduleDisconnectHandler);
        return _this;
    }
    ModuleClient.prototype.sendOutputEvent = function (outputName, message, callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            var retryOp = new azure_iot_common_1.RetryOperation(_this._retryPolicy, _this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                /* Codes_SRS_NODE_MODULE_CLIENT_18_010: [ The `sendOutputEvent` method shall send the event indicated by the `message` argument via the transport associated with the Client instance. ]*/
                _this._transport.sendOutputEvent(outputName, message, opCallback);
            }, function (err, result) {
                /*Codes_SRS_NODE_MODULE_CLIENT_18_018: [ When the `sendOutputEvent` method completes, the `callback` function shall be invoked with the same arguments as the underlying transport method's callback. ]*/
                /*Codes_SRS_NODE_MODULE_CLIENT_18_019: [ The `sendOutputEvent` method shall not throw if the `callback` is not passed. ]*/
                safeCallback(_callback, err, result);
            });
        }, callback);
    };
    ModuleClient.prototype.sendOutputEventBatch = function (outputName, messages, callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            var retryOp = new azure_iot_common_1.RetryOperation(_this._retryPolicy, _this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                /* Codes_SRS_NODE_MODULE_CLIENT_18_011: [ The `sendOutputEventBatch` method shall send the list of events (indicated by the `messages` argument) via the transport associated with the Client instance. ]*/
                _this._transport.sendOutputEventBatch(outputName, messages, opCallback);
            }, function (err, result) {
                /*Codes_SRS_NODE_MODULE_CLIENT_18_021: [ When the `sendOutputEventBatch` method completes the `_callback` function shall be invoked with the same arguments as the underlying transport method's callback. ]*/
                /*Codes_SRS_NODE_MODULE_CLIENT_18_022: [ The `sendOutputEventBatch` method shall not throw if the `_callback` is not passed. ]*/
                safeCallback(_callback, err, result);
            });
        }, callback);
    };
    ModuleClient.prototype.close = function (closeCallback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            _this._transport.removeListener('disconnect', _this._moduleDisconnectHandler);
            _super.prototype.close.call(_this, _callback);
        }, closeCallback);
    };
    ModuleClient.prototype._invokeMethod = function (deviceId, moduleIdOrMethodParams, methodParamsOrCallback, callback) {
        /*Codes_SRS_NODE_MODULE_CLIENT_16_093: [`invokeMethod` shall throw a `ReferenceError` if the `deviceId` argument is falsy.]*/
        if (!deviceId) {
            throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');
        }
        /*Codes_SRS_NODE_MODULE_CLIENT_16_094: [`invokeMethod` shall throw a `ReferenceError` if the `moduleIdOrMethodParams` argument is falsy.]*/
        if (!moduleIdOrMethodParams) {
            throw new ReferenceError('The second parameter cannot be \'' + moduleIdOrMethodParams + '\'');
        }
        var actualModuleId = typeof moduleIdOrMethodParams === 'string' ? moduleIdOrMethodParams : null;
        var actualMethodParams = typeof moduleIdOrMethodParams === 'object' ? moduleIdOrMethodParams : methodParamsOrCallback;
        var actualCallback = typeof methodParamsOrCallback === 'function' ? methodParamsOrCallback : callback;
        /*Codes_SRS_NODE_MODULE_CLIENT_16_095: [`invokeMethod` shall throw a `ReferenceError` if the `deviceId` and `moduleIdOrMethodParams` are strings and the `methodParamsOrCallback` argument is falsy.]*/
        if (!actualMethodParams || typeof actualMethodParams !== 'object') {
            throw new ReferenceError('methodParams cannot be \'' + actualMethodParams + '\'');
        }
        /*Codes_SRS_NODE_MODULE_CLIENT_16_096: [`invokeMethod` shall throw a `ArgumentError` if the `methodName` property of the `MethodParams` argument is falsy.]*/
        if (!actualMethodParams.methodName) {
            throw new azure_iot_common_2.errors.ArgumentError('the name property of the methodParams argument cannot be \'' + actualMethodParams.methodName + '\'');
        }
        /*Codes_SRS_NODE_MODULE_CLIENT_16_097: [`invokeMethod` shall call the `invokeMethod` API of the `MethodClient` API that was created for the `ModuleClient` instance.]*/
        this._methodClient.invokeMethod(deviceId, actualModuleId, actualMethodParams, actualCallback);
    };
    ModuleClient.prototype.invokeMethod = function (deviceId, moduleIdOrMethodParams, methodParamsOrCallback, callback) {
        var _this = this;
        if (callback) {
            return this._invokeMethod(deviceId, moduleIdOrMethodParams, methodParamsOrCallback, callback);
        }
        else if (typeof methodParamsOrCallback === 'function') {
            return this._invokeMethod(deviceId, moduleIdOrMethodParams, methodParamsOrCallback);
        }
        return azure_iot_common_1.callbackToPromise(function (_callback) { return _this._invokeMethod(deviceId, moduleIdOrMethodParams, methodParamsOrCallback, _callback); });
    };
    /**
     * Registers a callback for a method named `methodName`.
     *
     * @param methodName Name of the method that will be handled by the callback
     * @param callback Function that shall be called whenever a method request for the method called `methodName` is received.
     */
    ModuleClient.prototype.onMethod = function (methodName, callback) {
        this._onDeviceMethod(methodName, callback);
    };
    ModuleClient.prototype.setOptions = function (options, done) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_MODULE_CLIENT_16_098: [The `setOptions` method shall call the `setOptions` method with the `options` argument on the `MethodClient` object of the `ModuleClient`.]*/
            if (_this._methodClient) {
                _this._methodClient.setOptions(options);
            }
            /*Codes_SRS_NODE_MODULE_CLIENT_16_042: [The `setOptions` method shall throw a `ReferenceError` if the options object is falsy.]*/
            /*Codes_SRS_NODE_MODULE_CLIENT_16_043: [The `_callback` callback shall be invoked with no parameters when it has successfully finished setting the client and/or transport options.]*/
            /*Codes_SRS_NODE_MODULE_CLIENT_16_044: [The `_callback` callback shall be invoked with a standard javascript `Error` object and no result object if the client could not be configured as requested.]*/
            _super.prototype.setOptions.call(_this, options, _callback);
        }, done);
    };
    ModuleClient.prototype._disableInputMessages = function (callback) {
        var _this = this;
        if (this._inputMessagesEnabled) {
            this._transport.disableInputMessages(function (err) {
                if (!err) {
                    _this._inputMessagesEnabled = false;
                }
                callback(err);
            });
        }
        else {
            callback();
        }
    };
    ModuleClient.prototype._enableInputMessages = function (callback) {
        var _this = this;
        if (!this._inputMessagesEnabled) {
            var retryOp = new azure_iot_common_1.RetryOperation(this._retryPolicy, this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                /* Codes_SRS_NODE_MODULE_CLIENT_18_016: [ The client shall connect the transport if needed in order to receive inputMessages. ]*/
                _this._transport.enableInputMessages(opCallback);
            }, function (err) {
                if (!err) {
                    _this._inputMessagesEnabled = true;
                }
                callback(err);
            });
        }
        else {
            callback();
        }
    };
    /**
     * Creates an IoT Hub device client from the given connection string using the given transport type.
     *
     * @param {String}    connStr        A connection string which encapsulates "device connect" permissions on an IoT hub.
     * @param {Function}  transportCtor  A transport constructor.
     *
     * @throws {ReferenceError}          If the connStr parameter is falsy.
     *
     * @returns {module:azure-iot-device.ModuleClient}
     */
    ModuleClient.fromConnectionString = function (connStr, transportCtor) {
        /*Codes_SRS_NODE_MODULE_CLIENT_05_003: [The fromConnectionString method shall throw ReferenceError if the connStr argument is falsy.]*/
        if (!connStr)
            throw new ReferenceError('connStr is \'' + connStr + '\'');
        var cn = azure_iot_common_1.ConnectionString.parse(connStr);
        /*Codes_SRS_NODE_MODULE_CLIENT_16_087: [The `fromConnectionString` method shall create a new `SharedAccessKeyAuthorizationProvider` object with the connection string passed as argument if it contains a SharedAccessKey parameter and pass this object to the transport constructor.]*/
        var authenticationProvider;
        if (cn.SharedAccessKey) {
            authenticationProvider = sak_authentication_provider_1.SharedAccessKeyAuthenticationProvider.fromConnectionString(connStr);
        }
        else {
            /*Codes_SRS_NODE_MODULE_CLIENT_16_001: [The `fromConnectionString` method shall throw a `NotImplementedError` if the connection string does not contain a `SharedAccessKey` field because x509 authentication is not supported yet for modules.]*/
            throw new azure_iot_common_2.errors.NotImplementedError('ModuleClient only supports SAS Token authentication');
        }
        /*Codes_SRS_NODE_MODULE_CLIENT_05_006: [The fromConnectionString method shall return a new instance of the Client object, as by a call to new Client(new transportCtor(...)).]*/
        return new ModuleClient(new transportCtor(authenticationProvider), new device_method_1.MethodClient(authenticationProvider));
    };
    /**
     * Creates an IoT Hub module client from the given shared access signature using the given transport type.
     *
     * @param {String}    sharedAccessSignature      A shared access signature which encapsulates "device
     *                                  connect" permissions on an IoT hub.
     * @param {Function}  Transport     A transport constructor.
     *
     * @throws {ReferenceError}         If the connStr parameter is falsy.
     *
     * @returns {module:azure-iothub.Client}
     */
    ModuleClient.fromSharedAccessSignature = function (sharedAccessSignature, transportCtor) {
        /*Codes_SRS_NODE_MODULE_CLIENT_16_029: [The fromSharedAccessSignature method shall throw a ReferenceError if the sharedAccessSignature argument is falsy.] */
        if (!sharedAccessSignature)
            throw new ReferenceError('sharedAccessSignature is \'' + sharedAccessSignature + '\'');
        /*Codes_SRS_NODE_MODULE_CLIENT_16_088: [The `fromSharedAccessSignature` method shall create a new `SharedAccessSignatureAuthorizationProvider` object with the shared access signature passed as argument, and pass this object to the transport constructor.]*/
        var authenticationProvider = sas_authentication_provider_1.SharedAccessSignatureAuthenticationProvider.fromSharedAccessSignature(sharedAccessSignature);
        /*Codes_SRS_NODE_MODULE_CLIENT_16_030: [The fromSharedAccessSignature method shall return a new instance of the Client object] */
        return new ModuleClient(new transportCtor(authenticationProvider), new device_method_1.MethodClient(authenticationProvider));
    };
    /**
     * Creates an IoT Hub module client from the given authentication method and using the given transport type.
     * @param authenticationProvider  Object used to obtain the authentication parameters for the IoT hub.
     * @param transportCtor           Transport protocol used to connect to IoT hub.
     */
    ModuleClient.fromAuthenticationProvider = function (authenticationProvider, transportCtor) {
        /*Codes_SRS_NODE_MODULE_CLIENT_16_089: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `authenticationProvider` argument is falsy.]*/
        if (!authenticationProvider) {
            throw new ReferenceError('authenticationMethod cannot be \'' + authenticationProvider + '\'');
        }
        /*Codes_SRS_NODE_MODULE_CLIENT_16_092: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `transportCtor` argument is falsy.]*/
        if (!transportCtor) {
            throw new ReferenceError('transportCtor cannot be \'' + transportCtor + '\'');
        }
        /*Codes_SRS_NODE_MODULE_CLIENT_16_090: [The `fromAuthenticationProvider` method shall pass the `authenticationProvider` object passed as argument to the transport constructor.]*/
        /*Codes_SRS_NODE_MODULE_CLIENT_16_091: [The `fromAuthenticationProvider` method shall return a `Client` object configured with a new instance of a transport created using the `transportCtor` argument.]*/
        return new ModuleClient(new transportCtor(authenticationProvider), new device_method_1.MethodClient(authenticationProvider));
    };
    ModuleClient.fromEnvironment = function (transportCtor, callback) {
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            // Codes_SRS_NODE_MODULE_CLIENT_13_033: [ The fromEnvironment method shall throw a ReferenceError if the callback argument is falsy or is not a function. ]
            if (!_callback || typeof (_callback) !== 'function') {
                throw new ReferenceError('callback cannot be \'' + _callback + '\'');
            }
            // Codes_SRS_NODE_MODULE_CLIENT_13_026: [ The fromEnvironment method shall invoke callback with a ReferenceError if the transportCtor argument is falsy. ]
            if (!transportCtor) {
                _callback(new ReferenceError('transportCtor cannot be \'' + transportCtor + '\''));
                return;
            }
            // Codes_SRS_NODE_MODULE_CLIENT_13_028: [ The fromEnvironment method shall delegate to ModuleClient.fromConnectionString if an environment variable called EdgeHubConnectionString or IotHubConnectionString exists. ]
            // if the environment has a value for EdgeHubConnectionString then we use that
            var connectionString = process.env.EdgeHubConnectionString || process.env.IotHubConnectionString;
            if (connectionString) {
                ModuleClient._fromEnvironmentNormal(connectionString, transportCtor, _callback);
            }
            else {
                ModuleClient._fromEnvironmentEdge(transportCtor, _callback);
            }
        }, callback);
    };
    ModuleClient._fromEnvironmentEdge = function (transportCtor, callback) {
        // make sure all the environment variables we need have been provided
        var validationError = ModuleClient.validateEnvironment();
        if (validationError) {
            callback(validationError);
            return;
        }
        var authConfig = {
            workloadUri: process.env.IOTEDGE_WORKLOADURI,
            deviceId: process.env.IOTEDGE_DEVICEID,
            moduleId: process.env.IOTEDGE_MODULEID,
            iothubHostName: process.env.IOTEDGE_IOTHUBHOSTNAME,
            authScheme: process.env.IOTEDGE_AUTHSCHEME,
            gatewayHostName: process.env.IOTEDGE_GATEWAYHOSTNAME,
            generationId: process.env.IOTEDGE_MODULEGENERATIONID
        };
        // Codes_SRS_NODE_MODULE_CLIENT_13_032: [ The fromEnvironment method shall create a new IotEdgeAuthenticationProvider object and pass this to the transport constructor. ]
        var authenticationProvider = new iotedge_authentication_provider_1.IotEdgeAuthenticationProvider(authConfig);
        // get trust bundle
        authenticationProvider.getTrustBundle(function (err, ca) {
            if (err) {
                callback(err);
            }
            else {
                var transport = new transportCtor(authenticationProvider);
                // Codes_SRS_NODE_MODULE_CLIENT_13_035: [ If the client is running in IoTEdge mode then the IotEdgeAuthenticationProvider.getTrustBundle method shall be invoked to retrieve the CA cert and the returned value shall be set as the CA cert for the transport via the transport's setOptions method passing in the CA value for the ca property in the options object. ]
                transport.setOptions({ ca: ca });
                var methodClient = new device_method_1.MethodClient(authenticationProvider);
                methodClient.setOptions({ ca: ca });
                // Codes_SRS_NODE_MODULE_CLIENT_13_031: [ The fromEnvironment method shall invoke the callback with a new instance of the ModuleClient object. ]
                callback(null, new ModuleClient(transport, methodClient));
            }
        });
    };
    ModuleClient._fromEnvironmentNormal = function (connectionString, transportCtor, callback) {
        var ca = '';
        if (process.env.EdgeModuleCACertificateFile) {
            fs.readFile(process.env.EdgeModuleCACertificateFile, 'utf8', function (err, data) {
                if (err) {
                    callback(err);
                }
                else {
                    // Codes_SRS_NODE_MODULE_CLIENT_13_034: [ If the client is running in a non-IoTEdge mode and an environment variable named EdgeModuleCACertificateFile exists then its file contents shall be set as the CA cert for the transport via the transport's setOptions method passing in the CA as the value for the ca property in the options object. ]
                    ca = data;
                    var moduleClient_1 = ModuleClient.fromConnectionString(connectionString, transportCtor);
                    moduleClient_1.setOptions({ ca: ca }, function (err) {
                        if (err) {
                            callback(err);
                        }
                        else {
                            callback(null, moduleClient_1);
                        }
                    });
                }
            });
        }
        else {
            callback(null, ModuleClient.fromConnectionString(connectionString, transportCtor));
        }
    };
    ModuleClient.validateEnvironment = function () {
        // Codes_SRS_NODE_MODULE_CLIENT_13_029: [ If environment variables EdgeHubConnectionString and IotHubConnectionString do not exist then the following environment variables must be defined: IOTEDGE_WORKLOADURI, IOTEDGE_DEVICEID, IOTEDGE_MODULEID, IOTEDGE_IOTHUBHOSTNAME, IOTEDGE_AUTHSCHEME and IOTEDGE_MODULEGENERATIONID. ]
        var keys = [
            'IOTEDGE_WORKLOADURI',
            'IOTEDGE_DEVICEID',
            'IOTEDGE_MODULEID',
            'IOTEDGE_IOTHUBHOSTNAME',
            'IOTEDGE_AUTHSCHEME',
            'IOTEDGE_MODULEGENERATIONID'
        ];
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            if (!process.env[key]) {
                return new ReferenceError("Environment variable " + key + " was not provided.");
            }
        }
        // Codes_SRS_NODE_MODULE_CLIENT_13_030: [ The value for the environment variable IOTEDGE_AUTHSCHEME must be sasToken. ]
        // we only support sas token auth scheme at this time
        if (process.env.IOTEDGE_AUTHSCHEME.toLowerCase() !== 'sastoken') {
            return new ReferenceError("Authentication scheme " + process.env.IOTEDGE_AUTHSCHEME + " is not a supported scheme.");
        }
    };
    return ModuleClient;
}(internal_client_1.InternalClient));
exports.ModuleClient = ModuleClient;
//# sourceMappingURL=module_client.js.map