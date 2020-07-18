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
var debug = dbg('azure-iot-device:DeviceClient');
var azure_iot_common_1 = require("azure-iot-common");
var internal_client_1 = require("./internal_client");
var blob_upload_1 = require("./blob_upload");
var sas_authentication_provider_1 = require("./sas_authentication_provider");
var x509_authentication_provider_1 = require("./x509_authentication_provider");
var sak_authentication_provider_1 = require("./sak_authentication_provider");
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
var Client = /** @class */ (function (_super) {
    __extends(Client, _super);
    /**
     * @constructor
     * @param {Object}  transport         An object that implements the interface
     *                                    expected of a transport object, e.g.,
     *                                    {@link azure-iot-device-http.Http|Http}.
     * @param {string}  connStr           A connection string (optional: when not provided, updateSharedAccessSignature must be called to set the SharedAccessSignature token directly).
     * @param {Object}  blobUploadClient  An object that is capable of uploading a stream to a blob.
     * @param {Object}  fileUploadApi     An object that is used for communicating with IoT Hub for Blob Storage related actions.
     */
    function Client(transport, connStr, blobUploadClient, fileUploadApi) {
        var _this = _super.call(this, transport, connStr) || this;
        _this._blobUploadClient = blobUploadClient;
        _this._c2dEnabled = false;
        _this._fileUploadApi = fileUploadApi;
        _this.on('removeListener', function (eventName) {
            if (eventName === 'message' && _this.listeners('message').length === 0) {
                /*Codes_SRS_NODE_DEVICE_CLIENT_16_005: [The client shall stop listening for messages from the service whenever the last listener unsubscribes from the `message` event.]*/
                debug('in removeListener, disabling C2D.');
                _this._disableC2D(function (err) {
                    if (err) {
                        debug('in removeListener, error disabling C2D.');
                        _this.emit('error', err);
                    }
                    else {
                        debug('removeListener successfully disabled C2D.');
                    }
                });
            }
        });
        _this.on('newListener', function (eventName) {
            if (eventName === 'message') {
                /*Codes_SRS_NODE_DEVICE_CLIENT_16_004: [The client shall start listening for messages from the service whenever there is a listener subscribed to the `message` event.]*/
                debug('in newListener, enabling C2D.');
                _this._enableC2D(function (err) {
                    if (err) {
                        debug('in newListener, error enabling C2D.');
                        _this.emit('error', err);
                    }
                    else {
                        debug('in newListener, successfully enabled C2D');
                    }
                });
            }
        });
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_002: [The `message` event shall be emitted when a cloud-to-device message is received from the IoT Hub service.]*/
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_003: [The `message` event parameter shall be a `message` object.]*/
        _this._transport.on('message', function (msg) {
            _this.emit('message', msg);
        });
        _this._deviceDisconnectHandler = function (err) {
            debug('transport disconnect event: ' + (err ? err.toString() : 'no error'));
            if (err && _this._retryPolicy.shouldRetry(err)) {
                debug('reconnect policy specifies a reconnect on error');
                /*Codes_SRS_NODE_DEVICE_CLIENT_16_097: [If the transport emits a `disconnect` event while the client is subscribed to c2d messages the retry policy shall be used to reconnect and re-enable the feature using the transport `enableC2D` method.]*/
                debug('_c2dEnabled is: ' + _this._c2dEnabled);
                if (_this._c2dEnabled) {
                    _this._c2dEnabled = false;
                    debug('re-enabling C2D link.');
                    _this._enableC2D(function (err) {
                        if (err) {
                            /*Codes_SRS_NODE_DEVICE_CLIENT_16_102: [If the retry policy fails to reestablish the C2D functionality a `disconnect` event shall be emitted with a `results.Disconnected` object.]*/
                            debug('error on _enableC2D in _deviceDisconnectHandler. Failed to reestablish C2D functionality.');
                            _this.emit('disconnect', new azure_iot_common_1.results.Disconnected(err));
                        }
                        else {
                            debug('_deviceDisconnectHandler has enabled C2D');
                        }
                    });
                }
                else {
                    debug('During _deviceDisconnectHandler, _c2dEnabled is false');
                }
            }
        };
        _this._transport.on('disconnect', _this._deviceDisconnectHandler);
        return _this;
    }
    Client.prototype.setOptions = function (options, done) {
        if (!options)
            throw new ReferenceError('options cannot be falsy.');
        if (this._blobUploadClient) {
            /*Codes_SRS_NODE_DEVICE_CLIENT_99_103: [The `setOptions` method shall set `blobUploadClient` options.]*/
            this._blobUploadClient.setOptions(options);
        }
        return _super.prototype.setOptions.call(this, options, done);
    };
    Client.prototype.close = function (closeCallback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            _this._transport.removeListener('disconnect', _this._deviceDisconnectHandler);
            _super.prototype.close.call(_this, _callback);
        }, closeCallback);
    };
    /**
     * Registers a callback for a method named `methodName`.
     *
     * @param methodName Name of the method that will be handled by the callback
     * @param callback Function that shall be called whenever a method request for the method called `methodName` is received.
     */
    Client.prototype.onDeviceMethod = function (methodName, callback) {
        this._onDeviceMethod(methodName, callback);
    };
    Client.prototype.uploadToBlob = function (blobName, stream, streamLength, callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_DEVICE_CLIENT_16_037: [The `uploadToBlob` method shall throw a `ReferenceError` if `blobName` is falsy.]*/
            if (!blobName)
                throw new ReferenceError('blobName cannot be \'' + blobName + '\'');
            /*Codes_SRS_NODE_DEVICE_CLIENT_16_038: [The `uploadToBlob` method shall throw a `ReferenceError` if `stream` is falsy.]*/
            if (!stream)
                throw new ReferenceError('stream cannot be \'' + stream + '\'');
            /*Codes_SRS_NODE_DEVICE_CLIENT_16_039: [The `uploadToBlob` method shall throw a `ReferenceError` if `streamLength` is falsy.]*/
            if (!streamLength)
                throw new ReferenceError('streamLength cannot be \'' + streamLength + '\'');
            var retryOp = new azure_iot_common_1.RetryOperation(_this._retryPolicy, _this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                /*Codes_SRS_NODE_DEVICE_CLIENT_16_040: [The `uploadToBlob` method shall call the `_callback` callback with an `Error` object if the upload fails.]*/
                /*Codes_SRS_NODE_DEVICE_CLIENT_16_041: [The `uploadToBlob` method shall call the `_callback` callback no parameters if the upload succeeds.]*/
                _this._blobUploadClient.uploadToBlob(blobName, stream, streamLength, opCallback);
            }, function (err, result) {
                safeCallback(_callback, err, result);
            });
        }, callback);
    };
    Client.prototype.getBlobSharedAccessSignature = function (blobName, callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_DEVICE_CLIENT_41_001: [The `getBlobSharedAccessSignature` method shall throw a `ReferenceError` if `blobName` is falsy.]*/
            if (!blobName)
                throw new ReferenceError('blobName cannot be \'' + blobName + '\'');
            var retryOp = new azure_iot_common_1.RetryOperation(_this._retryPolicy, _this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                /*Codes_SRS_NODE_DEVICE_CLIENT_41_002: [The `getBlobSharedAccessSignature` method shall call the `getBlobSharedAccessSignature` method in the instantiated `_fileUploadApi` class and pass in `blobName` as a parameter.]*/
                _this._fileUploadApi.getBlobSharedAccessSignature(blobName, opCallback);
            }, function (err, result) {
                /*Codes_SRS_NODE_DEVICE_CLIENT_41_003: [The `getBlobSharedAccessSignature` method shall call the `_callback` callback with `err` and `result` from the call to `getBlobSharedAccessSignature`.]*/
                if (!err) {
                    debug('got blob storage shared access signature.');
                }
                else {
                    debug('Could not obtain blob shared access signature.');
                }
                safeCallback(_callback, err, result);
            });
        }, callback);
    };
    Client.prototype.notifyBlobUploadStatus = function (correlationId, isSuccess, statusCode, statusDescription, callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_DEVICE_CLIENT_41_016: [The `notifyBlobUploadStatus` method shall throw a `ReferenceError` if `correlationId` is falsy.]*/
            /*Codes_SRS_NODE_DEVICE_CLIENT_41_005: [The `notifyBlobUploadStatus` method shall throw a `ReferenceError` if `isSuccess` is falsy but not the boolean false.]*/
            /*Codes_SRS_NODE_DEVICE_CLIENT_41_006: [The `notifyBlobUploadStatus` method shall throw a `ReferenceError` if `statusCode` is falsy but not the number 0.]*/
            /*Codes_SRS_NODE_DEVICE_CLIENT_41_007: [The `notifyBlobUploadStatus` method shall throw a `ReferenceError` if `statusDescription` is falsy but not an empty string.]*/
            if (!correlationId)
                throw new ReferenceError('correlationId cannot be \' ' + correlationId + ' \'');
            if (!isSuccess && typeof (isSuccess) !== 'boolean')
                throw new ReferenceError('isSuccess cannot be \' ' + isSuccess + ' \'');
            if (!statusCode && !(statusCode === 0))
                throw new ReferenceError('statusCode cannot be \' ' + statusCode + ' \'');
            if (!statusDescription && statusDescription !== '')
                throw new ReferenceError('statusDescription cannot be \' ' + statusDescription + ' \'.');
            var retryOp = new azure_iot_common_1.RetryOperation(_this._retryPolicy, _this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                var uploadResult = { isSuccess: isSuccess, statusCode: statusCode, statusDescription: statusDescription };
                /*Codes_SRS_NODE_DEVICE_CLIENT_41_015: [The `notifyBlobUploadStatus` method shall call the `notifyUploadComplete` method via the internal `_fileUploadApi` class.]*/
                _this._fileUploadApi.notifyUploadComplete(correlationId, uploadResult, opCallback);
            }, function (err) {
                /*Codes_SRS_NODE_DEVICE_CLIENT_41_008: [The `notifyBlobUploadStatus` method shall call the `_callback` callback with `err` if the notification fails.]*/
                /*Codes_SRS_NODE_DEVICE_CLIENT_41_009: [The `notifyBlobUploadStatus` method shall call the `_callback` callback with no parameters if the notification succeeds.]*/
                safeCallback(_callback, err);
            });
        }, callback);
    };
    Client.prototype._enableC2D = function (callback) {
        var _this = this;
        debug('_c2dEnabled is: ' + this._c2dEnabled);
        if (!this._c2dEnabled) {
            debug('enabling C2D');
            var retryOp = new azure_iot_common_1.RetryOperation(this._retryPolicy, this._maxOperationTimeout);
            retryOp.retry(function (opCallback) {
                _this._transport.enableC2D(opCallback);
            }, function (err) {
                if (!err) {
                    debug('enabled C2D. Setting this._c2dEnabled to true.');
                    _this._c2dEnabled = true;
                }
                else {
                    debug('Error while enabling C2D.');
                }
                callback(err);
            });
        }
        else {
            debug('this._c2dEnable is true. Not enabling C2D.');
            callback();
        }
    };
    Client.prototype._disableC2D = function (callback) {
        var _this = this;
        debug('_c2dEnabled is: ' + this._c2dEnabled);
        if (this._c2dEnabled) {
            debug('disabling C2D');
            this._transport.disableC2D(function (err) {
                if (!err) {
                    debug('disabled C2D. Setting this._c2dEnabled to false.');
                    _this._c2dEnabled = false;
                }
                else {
                    debug('Error while disabling C2D.');
                }
                callback(err);
            });
        }
        else {
            debug('this._c2dEnable is false. Not disabling C2D.');
            callback();
        }
    };
    /**
     * Creates an IoT Hub device client from the given connection string using the given transport type.
     *
     * @param {String}    connStr        A connection string which encapsulates "device connect" permissions on an IoT hub.
     * @param {Function}  transportCtor  A transport constructor.
     *
     * @throws {ReferenceError}         If the connStr parameter is falsy.
     *
     * @returns {module:azure-iot-device.Client}
     */
    Client.fromConnectionString = function (connStr, transportCtor) {
        /*Codes_SRS_NODE_DEVICE_CLIENT_05_003: [The fromConnectionString method shall throw ReferenceError if the connStr argument is falsy.]*/
        if (!connStr)
            throw new ReferenceError('connStr is \'' + connStr + '\'');
        var cn = azure_iot_common_1.ConnectionString.parse(connStr);
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_087: [The `fromConnectionString` method shall create a new `SharedAccessKeyAuthorizationProvider` object with the connection string passed as argument if it contains a SharedAccessKey parameter and pass this object to the transport constructor.]*/
        var authenticationProvider;
        if (cn.SharedAccessKey) {
            authenticationProvider = sak_authentication_provider_1.SharedAccessKeyAuthenticationProvider.fromConnectionString(connStr);
        }
        else if (cn.SharedAccessSignature) {
            /*Codes_SRS_NODE_DEVICE_CLIENT_16_094: [The `fromConnectionString` method shall create a new `SharedAccessSignatureAuthenticationProvider` object with the connection string passed as argument if it contains a SharedAccessSignature parameter and pass this object to the transport constructor.]*/
            authenticationProvider = sas_authentication_provider_1.SharedAccessSignatureAuthenticationProvider.fromSharedAccessSignature(cn.SharedAccessSignature);
        }
        else {
            /*Codes_SRS_NODE_DEVICE_CLIENT_16_093: [The `fromConnectionString` method shall create a new `X509AuthorizationProvider` object with the connection string passed as argument if it contains an X509 parameter and pass this object to the transport constructor.]*/
            authenticationProvider = new x509_authentication_provider_1.X509AuthenticationProvider({
                host: cn.HostName,
                deviceId: cn.DeviceId
            });
        }
        /*Codes_SRS_NODE_DEVICE_CLIENT_05_006: [The fromConnectionString method shall return a new instance of the Client object, as by a call to new Client(new transportCtor(...)).]*/
        return new Client(new transportCtor(authenticationProvider), null, new blob_upload_1.BlobUploadClient(authenticationProvider), new blob_upload_1.DefaultFileUploadApi(authenticationProvider));
    };
    /**
     * @method            module:azure-iot-device.Client.fromSharedAccessSignature
     * @description       Creates an IoT Hub device client from the given
     *                    shared access signature using the given transport type.
     *
     * @param {String}    sharedAccessSignature      A shared access signature which encapsulates "device
     *                                  connect" permissions on an IoT hub.
     * @param {Function}  Transport     A transport constructor.
     *
     * @throws {ReferenceError}         If the connStr parameter is falsy.
     *
     * @returns {module:azure-iothub.Client}
     */
    Client.fromSharedAccessSignature = function (sharedAccessSignature, transportCtor) {
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_029: [The fromSharedAccessSignature method shall throw a ReferenceError if the sharedAccessSignature argument is falsy.] */
        if (!sharedAccessSignature)
            throw new ReferenceError('sharedAccessSignature is \'' + sharedAccessSignature + '\'');
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_088: [The `fromSharedAccessSignature` method shall create a new `SharedAccessSignatureAuthorizationProvider` object with the shared access signature passed as argument, and pass this object to the transport constructor.]*/
        var authenticationProvider = sas_authentication_provider_1.SharedAccessSignatureAuthenticationProvider.fromSharedAccessSignature(sharedAccessSignature);
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_030: [The fromSharedAccessSignature method shall return a new instance of the Client object] */
        return new Client(new transportCtor(authenticationProvider), null, new blob_upload_1.BlobUploadClient(authenticationProvider), new blob_upload_1.DefaultFileUploadApi(authenticationProvider));
    };
    /**
     * @method                        module:azure-iot-device.Client.fromAuthenticationMethod
     * @description                   Creates an IoT Hub device client from the given authentication method and using the given transport type.
     * @param authenticationProvider  Object used to obtain the authentication parameters for the IoT hub.
     * @param transportCtor           Transport protocol used to connect to IoT hub.
     */
    Client.fromAuthenticationProvider = function (authenticationProvider, transportCtor) {
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_089: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `authenticationProvider` argument is falsy.]*/
        if (!authenticationProvider) {
            throw new ReferenceError('authenticationMethod cannot be \'' + authenticationProvider + '\'');
        }
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_092: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `transportCtor` argument is falsy.]*/
        if (!transportCtor) {
            throw new ReferenceError('transportCtor cannot be \'' + transportCtor + '\'');
        }
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_090: [The `fromAuthenticationProvider` method shall pass the `authenticationProvider` object passed as argument to the transport constructor.]*/
        /*Codes_SRS_NODE_DEVICE_CLIENT_16_091: [The `fromAuthenticationProvider` method shall return a `Client` object configured with a new instance of a transport created using the `transportCtor` argument.]*/
        return new Client(new transportCtor(authenticationProvider), null, new blob_upload_1.BlobUploadClient(authenticationProvider), new blob_upload_1.DefaultFileUploadApi(authenticationProvider));
    };
    return Client;
}(internal_client_1.InternalClient));
exports.Client = Client;
//# sourceMappingURL=device_client.js.map