// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_http_base_1 = require("azure-iot-http-base");
var utils_1 = require("../utils");
var _ = require("lodash");
/**
 * @private
 */
var MethodClient = /** @class */ (function () {
    function MethodClient(authProvider) {
        this._authProvider = authProvider;
        this._options = {};
        this._httpHeaders = {
            'Content-Type': 'application/json'
        };
    }
    MethodClient.prototype.invokeMethod = function (deviceId, moduleId, methodParams, callback) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_006: [The `invokeMethod` method shall get the latest credentials by calling `getDeviceCredentials` on the `AuthenticationProvider` object.]*/
            /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_007: [The `invokeMethod` method shall create a `RestApiClient` object if it does not exist.]*/
            _this._init(function (err) {
                if (err) {
                    /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_008: [The `invokeMethod` method shall call its callback with an `Error` if it fails to get the latest credentials from the `AuthenticationProvider` object.]*/
                    _callback(err);
                }
                else {
                    /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_009: [The `invokeMethod` method shall call the `setOptions` method on the `RestApiClient` with its options as argument to make sure the CA certificate is populated.]*/
                    _this._restApiClient.setOptions(_this._options);
                    /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_010: [The `invokeMethod` method shall construct the HTTP request path as `/twins/encodeUriComponentStrict(<targetDeviceId>)/methods` if the target is a device.]*/
                    var path = "/twins/" + azure_iot_common_1.encodeUriComponentStrict(deviceId);
                    /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_011: [The `invokeMethod` method shall construct the HTTP request path as `/twins/encodeUriComponentStrict(<targetDeviceId>)/modules/encodeUriComponentStrict(<targetModuleId>)/methods` if the target is a module.]*/
                    if (moduleId) {
                        path += "/modules/" + azure_iot_common_1.encodeUriComponentStrict(moduleId);
                    }
                    path += '/methods';
                    /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_012: [The `invokeMethod` method shall call `RestApiClient.executeApiCall` with:
                      - `POST` for the HTTP method argument.
                      - `path` as defined in `SRS_NODE_DEVICE_METHOD_CLIENT_16_010` and `SRS_NODE_DEVICE_METHOD_CLIENT_16_011`
                      - 2 custom headers:
                        - `Content-Type` shall be set to `application/json`
                        - `x-ms-edge-moduleId` shall be set to `<deviceId>/<moduleId>` with `deviceId` and `moduleId` being the identifiers for the current module (as opposed to the target module)
                      - the stringified version of the `MethodParams` object as the body of the request
                      - a timeout value in milliseconds that is the sum of the `connectTimeoutInSeconds` and `responseTimeoutInSeconds` parameters of the `MethodParams` object.]*/
                    var body = JSON.stringify(methodParams);
                    var methodTimeout = 1000 * (methodParams.connectTimeoutInSeconds + methodParams.responseTimeoutInSeconds);
                    _this._restApiClient.executeApiCall('POST', path, _this._httpHeaders, body, methodTimeout, function (err, result) {
                        if (err) {
                            /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_013: [The `invokeMethod` method shall call its callback with an error if `RestApiClient.executeApiCall` fails.]*/
                            _callback(err);
                        }
                        else {
                            /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_014: [The `invokeMethod` method shall call its callback with the result object if the call to `RestApiClient.executeApiCall` succeeds.]*/
                            _callback(null, result);
                        }
                    });
                }
            });
        }, callback);
    };
    MethodClient.prototype.setOptions = function (options) {
        /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_001: [The `setOptions` method shall merge the options passed in argument with the existing set of options used by the `MethodClient`.]*/
        this._options = _.merge(this._options, options);
    };
    MethodClient.prototype._init = function (callback) {
        var _this = this;
        this._authProvider.getDeviceCredentials(function (err, creds) {
            if (err) {
                callback(err);
            }
            else {
                _this._httpHeaders['x-ms-edge-moduleId'] = creds.deviceId + '/' + creds.moduleId;
                if (_this._restApiClient) {
                    /*Codes_SRS_NODE_DEVICE_METHOD_CLIENT_16_015: [The `invokeMethod` method shall update the shared access signature of the `RestApiClient` by using its `updateSharedAccessSignature` method and the credentials obtained with the call to `getDeviceCredentials` (see `SRS_NODE_DEVICE_METHOD_CLIENT_16_006`).]*/
                    _this._restApiClient.updateSharedAccessSignature(creds.sharedAccessSignature);
                    callback();
                }
                else {
                    utils_1.getUserAgentString(function (userAgentString) {
                        var transportConfig = {
                            host: creds.gatewayHostName,
                            sharedAccessSignature: creds.sharedAccessSignature
                        };
                        _this._restApiClient = new azure_iot_http_base_1.RestApiClient(transportConfig, userAgentString);
                        callback();
                    });
                }
            }
        });
    };
    return MethodClient;
}());
exports.MethodClient = MethodClient;
//# sourceMappingURL=method_client.js.map