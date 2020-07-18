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
var azure_iot_http_base_1 = require("azure-iot-http-base");
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_provisioning_device_1 = require("azure-iot-provisioning-device");
var azure_iot_provisioning_device_2 = require("azure-iot-provisioning-device");
var dbg = require("debug");
var debug = dbg('azure-iot-provisioning-device-http:Http');
var _defaultHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json; charset=utf-8'
};
var _retryAfterPropertyName = 'retry-after';
/**
 * Transport used to provision a device over HTTP.
 */
var Http = /** @class */ (function (_super) {
    __extends(Http, _super);
    /**
     * @private
     */
    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_001: [ The `Http` constructor shall accept the following properties:
    - `httpBase` - an optional test implementation of azure-iot-http-base ] */
    function Http(httpBase) {
        var _this = _super.call(this) || this;
        _this._config = {};
        _this._httpBase = httpBase || new azure_iot_http_base_1.Http();
        _this._config.pollingInterval = azure_iot_provisioning_device_1.ProvisioningDeviceConstants.defaultPollingInterval;
        _this._config.timeoutInterval = azure_iot_provisioning_device_1.ProvisioningDeviceConstants.defaultTimeoutInterval;
        return _this;
    }
    /**
     * @private
     *
     */
    Http.prototype.respondToAuthenticationChallenge = function (request, sasToken, callback) {
        this._sas = sasToken;
        callback();
    };
    /**
     * @private
     *
     */
    Http.prototype.setTpmInformation = function (endorsementKey, storageRootKey) {
        /*Codes_SRS_NODE_PROVISIONING_HTTP_06_001: [The `endorsementKey` will be saved into the class as a string.] */
        /*Codes_SRS_NODE_PROVISIONING_HTTP_06_002: [The `storageRootKey` will be saved into the class as a string.] */
        this._tpmPublicKeys = { endorsementKey: endorsementKey.toString('base64'), storageRootKey: storageRootKey.toString('base64') };
    };
    /**
     * @private
     *
     */
    Http.prototype.getAuthenticationChallenge = function (request, callback) {
        /*Codes_SRS_NODE_PROVISIONING_HTTP_06_003: [The getAuthenticationChallenge will perform a request that contains the endorsementKey, the storageRootKey, and the registrationId as the body of the request.] */
        this.registrationRequest(request, function (err, result, response) {
            /*Codes_SRS_NODE_PROVISIONING_HTTP_06_004: [The request will actually generate a 401 error since there is actually no authentication for the request.] */
            if (err && err.response && (err.response.statusCode === 401)) {
                //
                // This request had no actual authentication.  Therefore, it is correct for us to get the 401 error.  Parse the response body and pull out the message, authenticationKey and the keyName.
                //
                var authenticationResponse = void 0;
                try {
                    authenticationResponse = JSON.parse(err.responseBody);
                }
                catch (parseError) {
                    debug('challenge could not be parsed: ' + err);
                    callback(new azure_iot_common_1.errors.FormatError('The server did NOT respond with an appropriately formatted authentication blob.'));
                    return;
                }
                /*Codes_SRS_NODE_PROVISIONING_HTTP_06_005: [** The request response will contain an activation blob which will be provided as the result of the callback for this function. **] */
                if (typeof authenticationResponse.authenticationKey === 'string') {
                    callback(null, Buffer.from(authenticationResponse.authenticationKey, 'base64'));
                }
                else {
                    debug('Invalid formatted challenge received: ' + err.responseBody);
                    callback(new azure_iot_common_1.errors.FormatError('The server did NOT respond with an appropriately formatted authentication blob.'));
                }
            }
            else {
                //
                // We should ALWAYS get an error for the un-authenticated request we just made.  The server is sending back something we
                // have no real context to interpret.
                //
                debug('Invalid response back from the authentication challenge: ' + err);
                callback(new azure_iot_common_1.errors.InvalidOperationError('The server did NOT respond with an unauthorized error.  For a TPM challenge this is incorrect.'));
            }
        });
    };
    /**
     * @private
     */
    Http.prototype.setAuthentication = function (auth) {
        this._auth = auth;
    };
    /**
     * @private
     */
    Http.prototype.setSharedAccessSignature = function (sas) {
        this._sas = sas;
    };
    /**
     * @private
     *
     */
    Http.prototype.setTransportOptions = function (options) {
        var _this = this;
        [
            'pollingInterval'
        ].forEach(function (optionName) {
            if (options.hasOwnProperty(optionName)) {
                _this._config[optionName] = options[optionName];
            }
        });
    };
    /**
     * @private
     */
    Http.prototype.cancel = function (callback) {
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_041: [ `cancel` shall immediately call `callback` passing null. ] */
        callback();
    };
    /**
     * @private
     */
    Http.prototype.disconnect = function (callback) {
        // nothing to do
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_040: [ `disconnect` shall immediately call `callback` passing null. ] */
        callback();
    };
    /**
     * @private
     */
    Http.prototype.registrationRequest = function (request, callback) {
        var _this = this;
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_007: [ If an X509 cert if provided, `registrationRequest` shall include it in the Http authorization header. ] */
        this._ensureRestApiClient(request);
        /*Codes_SRS_NODE_PROVISIONING_HTTP_06_006: [The `registrationRequest` will send a body in the message which contains a stringified JSON object with a `registrationId` property.] */
        var requestBody = { registrationId: request.registrationId };
        /*Codes_SRS_NODE_PROVISIONING_HTTP_06_007: [The `registrationRequest` will, if utilizing TPM attestation, send a `tpm` property with the endorsement and storage key in the JSON body.] */
        if (this._tpmPublicKeys) {
            requestBody.tpm = this._tpmPublicKeys;
        }
        /*Codes_SRS_NODE_PROVISIONING_HTTP_06_008: [The `registrationRequest` will, if utilizing custom allocation data, send a `payload` property in the JSON body.] */
        if (request.payload) {
            requestBody.payload = request.payload;
        }
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_005: [ `registrationRequest` shall include the current `api-version` as a URL query string value named 'api-version'. ] */
        var path = '/' + request.idScope + '/registrations/' + request.registrationId + '/register?api-version=' + azure_iot_provisioning_device_1.ProvisioningDeviceConstants.apiVersion;
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_008: [ If `forceRegistration` is specified, `registrationRequest` shall include this as a query string value named 'forceRegistration' ] */
        if (request.forceRegistration) {
            path += '&forceRegistration=true';
        }
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_006: [ `registrationRequest` shall specify the following in the Http header:
          Accept: application/json
          Content-Type: application/json; charset=utf-8 ] */
        var httpHeaders = JSON.parse(JSON.stringify(_defaultHeaders));
        if (this._sas) {
            httpHeaders.Authorization = this._sas;
        }
        debug('submitting PUT for ' + request.registrationId + ' to ' + path);
        debug(JSON.stringify(requestBody));
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_009: [ `registrationRequest` shall PUT the registration request to 'https://{provisioningHost}/{idScope}/registrations/{registrationId}/register' ] */
        this._restApiClient.executeApiCall('PUT', path, httpHeaders, requestBody, function (err, result, response) {
            if (err) {
                /* Codes_SRS_NODE_PROVISIONING_HTTP_18_044: [ If the Http request fails for any reason, `registrationRequest` shall call `callback`, passing the error along with the `result` and `response` objects. ] */
                debug('error executing PUT: ' + err.toString());
                callback(err, result, response);
            }
            else {
                debug('PUT result received:');
                debug(JSON.stringify(result));
                debug('PUT response.headers received:');
                debug(JSON.stringify(response.headers));
                var retryAfterInMilliseconds = _this._config.pollingInterval;
                /*Codes_SRS_NODE_PROVISIONING_HTTP_06_011: [ If the `registrationRequest` response contains the `header` `retry-after`, it will be interpreted as the number of seconds that should elapse before the next attempted operation.] */
                if (response.headers && response.headers[_retryAfterPropertyName]) {
                    retryAfterInMilliseconds = Number(response.headers[_retryAfterPropertyName]) * 1000;
                }
                if (response.statusCode < 300) {
                    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_045: [ If the Http request succeeds, `registrationRequest` shall call `callback`, passing a `null` error along with the `result` and `response` objects. ] */
                    callback(null, result, response, retryAfterInMilliseconds);
                }
                else if (response.statusCode >= 429) {
                    /*Codes_SRS_NODE_PROVISIONING_HTTP_06_012: [ If the `registrationRequest` response contains a status code >= 429, the result.status value will be set with `registering` and the callback will be invoked with *no* error object.] */
                    callback(null, { status: 'registering' }, response, retryAfterInMilliseconds);
                }
                else {
                    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_014: [ If the Http response has a failed status code, `registrationRequest` shall use `translateError` to translate this to a common error object ] */
                    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_044: [ If the Http request fails for any reason, `registrationRequest` shall call `callback`, passing the error along with the `result` and `response` objects. ] */
                    callback(azure_iot_provisioning_device_2.translateError('PUT operation returned failure', response.statusCode, result, response));
                }
            }
        });
    };
    /**
     * @private
     */
    Http.prototype.queryOperationStatus = function (request, operationId, callback) {
        var _this = this;
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_021: [ If an X509 cert if provided, `queryOperationStatus` shall include it in the Http authorization header. ] */
        this._ensureRestApiClient(request);
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_037: [ `queryOperationStatus` shall include the current `api-version` as a URL query string value named 'api-version'. ] */
        var path = '/' + request.idScope + '/registrations/' + request.registrationId + '/operations/' + operationId + '?api-version=' + azure_iot_provisioning_device_1.ProvisioningDeviceConstants.apiVersion;
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_020: [ `queryOperationStatus` shall specify the following in the Http header:
          Accept: application/json
          Content-Type: application/json; charset=utf-8 ] */
        var httpHeaders = JSON.parse(JSON.stringify(_defaultHeaders));
        if (this._sas) {
            httpHeaders.Authorization = this._sas;
        }
        /* Codes_SRS_NODE_PROVISIONING_HTTP_18_022: [ `queryOperationStatus` shall send a GET operation sent to 'https://{provisioningHost}/{idScope}/registrations/{registrationId}/operations/{operationId}'  ] */
        debug('submitting status GET for ' + request.registrationId + ' to ' + path);
        this._restApiClient.executeApiCall('GET', path, httpHeaders, {}, function (err, result, response) {
            if (err) {
                /* Codes_SRS_NODE_PROVISIONING_HTTP_18_038: [ If the Http request fails for any reason, `queryOperationStatus` shall call `callback`, passing the error along with the `result` and `response` objects. ] */
                debug('error executing GET: ' + err.toString());
                callback(err, result, response);
            }
            else {
                debug('GET result received:');
                debug(JSON.stringify(result));
                debug('GET response.headers received:');
                debug(JSON.stringify(response.headers));
                /* Codes_SRS_NODE_PROVISIONING_HTTP_06_010: [If the `queryOperationStatus` response contains the `header` `retry-after`, it will be interpreted as the number of seconds that should elapse before the next attempt at the `queryOperationStatus` operation.] */
                var retryAfterInMilliseconds = _this._config.pollingInterval;
                if (response.headers && response.headers[_retryAfterPropertyName]) {
                    retryAfterInMilliseconds = Number(response.headers[_retryAfterPropertyName]) * 1000;
                }
                if (response.statusCode < 300) {
                    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_039: [ If the Http request succeeds, `queryOperationStatus` shall call `callback`, passing a `null` error along with the `result` and `response` objects. ] */
                    callback(null, result, response, retryAfterInMilliseconds);
                }
                else if (response.statusCode >= 429) {
                    /* Codes_SRS_NODE_PROVISIONING_HTTP_06_009: [If the `queryOperationStatus` response contains a status code >= 429, the result.status value will be set with `assigning` and the callback will be invoked with *no* error object.]*/
                    callback(null, { status: 'assigning', operationId: operationId }, response, retryAfterInMilliseconds);
                }
                else {
                    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_026: [ If the Http response has a failed status code, `queryOperationStatus` shall use `translateError` to translate this to a common error object ] */
                    /* Codes_SRS_NODE_PROVISIONING_HTTP_18_038: [ If the Http request fails for any reason, `queryOperationStatus` shall call `callback`, passing the error along with the `result` and `response` objects. ] */
                    callback(azure_iot_provisioning_device_2.translateError('GET operation returned failure', response.statusCode, result, response));
                }
            }
        });
    };
    /**
     * @private
     */
    Http.prototype._ensureRestApiClient = function (request) {
        if (!this._restApiClient) {
            this._restApiClient = new azure_iot_http_base_1.RestApiClient({ 'host': request.provisioningHost, 'x509': this._auth }, azure_iot_provisioning_device_1.ProvisioningDeviceConstants.userAgent, this._httpBase);
        }
    };
    return Http;
}(events_1.EventEmitter));
exports.Http = Http;
//# sourceMappingURL=http.js.map