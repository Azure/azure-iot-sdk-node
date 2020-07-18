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
var http_1 = require("http");
var azure_iot_common_1 = require("azure-iot-common");
var sak_authentication_provider_1 = require("./sak_authentication_provider");
var azure_iot_http_base_1 = require("azure-iot-http-base");
var url = require("url");
// tslint:disable-next-line:no-var-requires
var packageJson = require('../package.json');
/**
 * @private
 *
 * The iotedged HTTP API version this code is built to work with.
 */
exports.WORKLOAD_API_VERSION = '2018-06-28';
var DEFAULT_SIGN_ALGORITHM = 'HMACSHA256';
var DEFAULT_KEY_ID = 'primary';
/**
 * Provides an `AuthenticationProvider` implementation that delegates token generation to iotedged. This implementation is meant to be used when using the module client with Azure IoT Edge.
 *
 * This type inherits from `SharedAccessKeyAuthenticationProvider` and is functionally identical to that type except for the token generation part which it overrides by implementing the `_sign` method.
 */
var IotEdgeAuthenticationProvider = /** @class */ (function (_super) {
    __extends(IotEdgeAuthenticationProvider, _super);
    /**
     * @private
     *
     * Initializes a new instance of the IotEdgeAuthenticationProvider.
     *
     * @param _authConfig                    iotedged connection configuration information.
     * @param tokenValidTimeInSeconds        [optional] The number of seconds for which a token is supposed to be valid.
     * @param tokenRenewalMarginInSeconds    [optional] The number of seconds before the end of the validity period during which the `IotEdgeAuthenticationProvider` should renew the token.
     */
    function IotEdgeAuthenticationProvider(_authConfig, tokenValidTimeInSeconds, tokenRenewalMarginInSeconds) {
        var _this = 
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_016: [ The constructor shall create the initial token value using the credentials parameter. ]
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_017: [ The constructor shall throw an ArgumentError if the tokenRenewalMarginInSeconds is less than or equal tokenValidTimeInSeconds. ]
        _super.call(this, {
            host: _authConfig && _authConfig.iothubHostName,
            deviceId: _authConfig && _authConfig.deviceId,
            moduleId: _authConfig && _authConfig.moduleId,
            gatewayHostName: _authConfig && _authConfig.gatewayHostName
        }, tokenValidTimeInSeconds, tokenRenewalMarginInSeconds) || this;
        _this._authConfig = _authConfig;
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_001: [ The constructor shall throw a ReferenceError if the _authConfig parameter is falsy. ]
        if (!_this._authConfig) {
            throw new ReferenceError('_authConfig cannot be \'' + _authConfig + '\'');
        }
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_002: [ The constructor shall throw a ReferenceError if the _authConfig.workloadUri field is falsy. ]
        if (!_this._authConfig.workloadUri) {
            throw new ReferenceError('_authConfig.workloadUri cannot be \'' + _this._authConfig.workloadUri + '\'');
        }
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_003: [ The constructor shall throw a ReferenceError if the _authConfig.moduleId field is falsy. ]
        if (!_this._authConfig.moduleId) {
            throw new ReferenceError('_authConfig.moduleId cannot be \'' + _this._authConfig.moduleId + '\'');
        }
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_004: [ The constructor shall throw a ReferenceError if the _authConfig.generationId field is falsy. ]
        if (!_this._authConfig.generationId) {
            throw new ReferenceError('_authConfig.generationId cannot be \'' + _this._authConfig.generationId + '\'');
        }
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_005: [ The constructor shall throw a TypeError if the _authConfig.workloadUri field is not a valid URI. ]
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_006: [ The constructor shall build a unix domain socket path host if the workload URI protocol is unix. ]
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_007: [ The constructor shall build a string host if the workload URI protocol is not unix. ]
        _this._workloadUri = url.parse(_this._authConfig.workloadUri);
        var config = {
            host: _this._workloadUri.protocol === 'unix:' ? { socketPath: _this._workloadUri.pathname } : _this._workloadUri.hostname
        };
        // TODO: The user agent string below needs to be constructed using the utils.getUserAgentString function.
        // But that is an async function and since we can't do async things while initializing fields, one way to
        // handle this might be to make this._restApiClient a lazily initialized object.
        _this._restApiClient = new azure_iot_http_base_1.RestApiClient(config, packageJson.name + "/" + packageJson.version);
        return _this;
    }
    IotEdgeAuthenticationProvider.prototype.getTrustBundle = function (callback) {
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_020: [ The getTrustBundle method shall throw a ReferenceError if the callback parameter is falsy or is not a function. ]
        if (!callback || typeof callback !== 'function') {
            throw new ReferenceError('callback cannot be \'' + callback + '\'');
        }
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_022: [ The getTrustBundle method shall build the HTTP request path in the format /trust-bundle?api-version=2018-06-28. ]
        var path = "/trust-bundle?api-version=" + azure_iot_common_1.encodeUriComponentStrict(exports.WORKLOAD_API_VERSION);
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_021: [ The getTrustBundle method shall invoke this._restApiClient.executeApiCall to make the REST call on iotedged using the GET method. ]
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_023: [** The `getTrustBundle` method shall set the HTTP request option's `request` property to use the `http.request` object.
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_024: [** The `getTrustBundle` method shall set the HTTP request option's `port` property to use the workload URI's port if available.
        this._restApiClient.executeApiCall('GET', path, null, null, this._getRequestOptions(), function (err, ca) {
            if (err) {
                callback(err);
            }
            else {
                callback(null, ca.certificate);
            }
        });
    };
    IotEdgeAuthenticationProvider.prototype._sign = function (resourceUri, expiry, callback) {
        var _this = this;
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_009: [ The _sign method shall throw a ReferenceError if the callback parameter is falsy or is not a function. ]
        if (!callback || typeof callback !== 'function') {
            throw new ReferenceError('callback cannot be \'' + callback + '\'');
        }
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_010: [ The _sign method invoke callback with a ReferenceError if the resourceUri parameter is falsy. ]
        if (!resourceUri) {
            callback(new ReferenceError('resourceUri cannot be \'' + resourceUri + '\''), null);
            return;
        }
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_011: [ The _sign method shall build the HTTP request path in the format /modules/<module id>/genid/<generation id>/sign?api-version=2018-06-28. ]
        // the request path needs to look like this:
        //  /modules/<module id>/genid/<generation id>/sign?api-version=2018-06-28
        var path = "/modules/" + azure_iot_common_1.encodeUriComponentStrict(this._authConfig.moduleId) + "/genid/" + azure_iot_common_1.encodeUriComponentStrict(this._authConfig.generationId) + "/sign?api-version=" + azure_iot_common_1.encodeUriComponentStrict(exports.WORKLOAD_API_VERSION);
        // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_027: [** The `_sign` method shall use the `SharedAccessSignature.createWithSigningFunction` function to build the data buffer which is to be signed by iotedged.
        azure_iot_common_1.SharedAccessSignature.createWithSigningFunction(this._credentials, expiry, function (buffer, signCallback) {
            // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_014: [ The _sign method shall build an object with the following schema as the HTTP request body as the sign request:
            //   interface SignRequest {
            //     keyId: string;
            //     algo: string;
            //     data: string;
            //   }
            //   ]
            // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_013: [ The _sign method shall build the sign request using the following values:
            //   const signRequest = {
            //     keyId: "primary"
            //     algo: "HMACSHA256"
            //     data: `${data}\n${expiry}`
            //   };
            //   ]
            var signRequest = {
                keyId: DEFAULT_KEY_ID,
                algo: DEFAULT_SIGN_ALGORITHM,
                data: buffer.toString('base64')
            };
            // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_019: [ The _sign method shall invoke this._restApiClient.executeApiCall to make the REST call on iotedged using the POST method. ]
            // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_025: [** The `_sign` method shall set the HTTP request option's `request` property to use the `http.request` object.
            // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_026: [** The `_sign` method shall set the HTTP request option's `port` property to use the workload URI's port if available.
            _this._restApiClient.executeApiCall('POST', path, { 'Content-Type': 'application/json' }, signRequest, _this._getRequestOptions(), function (err, body, response) {
                if (err) {
                    signCallback(err, null);
                }
                else {
                    // Codes_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_015: [ The _sign method shall invoke callback when the signature is available. ]
                    signCallback(null, Buffer.from(body.digest, 'base64'));
                }
            });
        }, function (err, sas) {
            if (err) {
                callback(err);
            }
            else {
                callback(null, sas.toString());
            }
        });
    };
    IotEdgeAuthenticationProvider.prototype._getRequestOptions = function () {
        var requestOptions = {
            request: http_1.request,
        };
        if (this._workloadUri.port) {
            var port = parseInt(this._workloadUri.port);
            if (!isNaN(port)) {
                requestOptions.port = port;
            }
        }
        return requestOptions;
    };
    return IotEdgeAuthenticationProvider;
}(sak_authentication_provider_1.SharedAccessKeyAuthenticationProvider));
exports.IotEdgeAuthenticationProvider = IotEdgeAuthenticationProvider;
//# sourceMappingURL=iotedge_authentication_provider.js.map