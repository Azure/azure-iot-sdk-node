// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_http_base_1 = require("azure-iot-http-base");
var query_1 = require("./query");
var azure_iot_common_2 = require("azure-iot-common");
// tslint:disable-next-line:no-var-requires
var packageJson = require('../package.json');
var ArgumentError = azure_iot_common_1.errors.ArgumentError;
var ProvisioningServiceClient = /** @class */ (function () {
    function ProvisioningServiceClient(config, restApiClient) {
        this._enrollmentGroupsPrefix = '/enrollmentGroups/';
        this._enrollmentsPrefix = '/enrollments/';
        this._registrationsPrefix = '/registrations/';
        if (!config) {
            /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_001: [The `ProvisioningServiceClient` construction shall throw a `ReferenceError` if the `config` object is falsy.] */
            throw new ReferenceError('The \'config\' parameter cannot be \'' + config + '\'');
        }
        else if (!config.host || !config.sharedAccessSignature) {
            /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_002: [The `ProvisioningServiceClient` constructor shall throw an `ArgumentError` if the `config` object is missing one or more of the following properties:
                                                                  - `host`: the IoT Hub hostname
                                                                  - `sharedAccessSignature`: shared access signature with the permissions for the desired operations.] */
            throw new ArgumentError('The \'config\' argument is missing either the host or the sharedAccessSignature property');
        }
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_003: [The `ProvisioningServiceClient` constructor shall use the `restApiClient` provided as a second argument if it is provided.] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_004: [The `ProvisioningServiceClient` constructor shall use `azure-iot-http-base.RestApiClient` if no `restApiClient` argument is provided.] */
        this._restApiClient = restApiClient || new azure_iot_http_base_1.RestApiClient(config, packageJson.name + '/' + packageJson.version);
    }
    ProvisioningServiceClient.prototype.createOrUpdateIndividualEnrollment = function (enrollment, callback) {
        var _this = this;
        return azure_iot_common_1.httpCallbackToPromise(function (_callback) {
            _this._createOrUpdate(_this._enrollmentsPrefix, enrollment, _callback);
        }, callback);
    };
    ProvisioningServiceClient.prototype.deleteIndividualEnrollment = function (enrollmentOrId, etagOrCallback, deleteCallback) {
        var _this = this;
        if (deleteCallback && !(typeof deleteCallback === 'function')) {
            throw new ArgumentError('Callback has to be a Function');
        }
        if (!deleteCallback && (typeof etagOrCallback === 'function')) {
            deleteCallback = etagOrCallback;
            etagOrCallback = undefined;
        }
        return azure_iot_common_2.errorCallbackToPromise(function (_callback) {
            _this._delete(_this._enrollmentsPrefix, enrollmentOrId, etagOrCallback, _callback);
        }, deleteCallback);
    };
    ProvisioningServiceClient.prototype.getIndividualEnrollment = function (id, getCallback) {
        var _this = this;
        return azure_iot_common_1.httpCallbackToPromise(function (_callback) {
            _this._get(_this._enrollmentsPrefix, id, _callback);
        }, getCallback);
    };
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#createIndividualEnrollmentQuery
     * @description      Creates a query that can be used to return pages of existing enrollments.
     * @param {object}   querySpecification The query specification.
     * @param {number}   pageSize           The maximum number of elements to return per page.
     */
    ProvisioningServiceClient.prototype.createIndividualEnrollmentQuery = function (querySpecification, pageSize) {
        return new query_1.Query(this._getEnrollFunc(this._enrollmentsPrefix, querySpecification, pageSize));
    };
    ProvisioningServiceClient.prototype.getDeviceRegistrationState = function (id, callback) {
        var _this = this;
        return azure_iot_common_1.httpCallbackToPromise(function (_callback) {
            _this._get(_this._registrationsPrefix, id, _callback);
        }, callback);
    };
    ProvisioningServiceClient.prototype.createOrUpdateEnrollmentGroup = function (enrollmentGroup, callback) {
        var _this = this;
        return azure_iot_common_1.httpCallbackToPromise(function (_callback) {
            _this._createOrUpdate(_this._enrollmentGroupsPrefix, enrollmentGroup, _callback);
        }, callback);
    };
    ProvisioningServiceClient.prototype.deleteEnrollmentGroup = function (enrollmentGroupOrId, etagOrCallback, deleteCallback) {
        var _this = this;
        if (deleteCallback && !(typeof deleteCallback === 'function')) {
            throw new ArgumentError('Callback has to be a Function');
        }
        if (typeof etagOrCallback === 'function') {
            deleteCallback = etagOrCallback;
            etagOrCallback = undefined;
        }
        return azure_iot_common_2.errorCallbackToPromise(function (_callback) {
            _this._delete(_this._enrollmentGroupsPrefix, enrollmentGroupOrId, etagOrCallback, _callback);
        }, deleteCallback);
    };
    ProvisioningServiceClient.prototype.getEnrollmentGroup = function (id, getCallback) {
        var _this = this;
        return azure_iot_common_1.httpCallbackToPromise(function (_callback) {
            _this._get(_this._enrollmentGroupsPrefix, id, _callback);
        }, getCallback);
    };
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#createEnrollmentGroupQuery
     * @description      Creates a query that can be used to return pages of existing enrollment groups.
     * @param {object}   querySpecification The query specification.
     * @param {number}   pageSize           The maximum number of elements to return per page.
     */
    ProvisioningServiceClient.prototype.createEnrollmentGroupQuery = function (querySpecification, pageSize) {
        return new query_1.Query(this._getEnrollFunc(this._enrollmentGroupsPrefix, querySpecification, pageSize));
    };
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#createEnrollmentGroupDeviceRegistrationStateQuery
     * @description      Creates a query that can be used to return, for a specific EnrollmentGroup, pages of existing device registration status.
     * @param {object}   querySpecification The query specification.
     * @param {string}   enrollmentGroupId  The EnrollmentGroup id that provides the scope for the query.
     * @param {number}   pageSize           The maximum number of elements to return per page.
     */
    ProvisioningServiceClient.prototype.createEnrollmentGroupDeviceRegistrationStateQuery = function (querySpecification, enrollmentGroupId, pageSize) {
        if (!enrollmentGroupId) {
            throw new ReferenceError('Required enrollmentGroupId parameter was falsy.');
        }
        return new query_1.Query(this._getEnrollFunc(this._registrationsPrefix + encodeURIComponent(enrollmentGroupId) + '/', querySpecification, pageSize));
    };
    ProvisioningServiceClient.prototype.runBulkEnrollmentOperation = function (bulkEnrollmentOperation, callback) {
        var _this = this;
        return azure_iot_common_1.httpCallbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_038: [The `runBulkEnrollmentOperation` method shall throw `ReferenceError` if the `bulkEnrollmentOperation` argument is falsy.] */
            if (!bulkEnrollmentOperation) {
                throw new ReferenceError('Required bulkEnrollmentOperation parameter was falsy when calling runBulkEnrollmentOperation.');
            }
            var path = _this._enrollmentsPrefix + _this._versionQueryString();
            var httpHeaders = {
                'Accept': 'application/json',
                'Content-Type': 'application/json; charset=utf-8'
            };
            /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_039: [** The `runBulkEnrollmentOperation` method shall construct an HTTP request using information supplied by the caller as follows:
              POST /enrollments?api-version=<version> HTTP/1.1
              Authorization: <sharedAccessSignature>
              Accept: application/json
              Content-Type: application/json; charset=utf-8
      
              <stringified json string of the bulkEnrollmentOperation argument>
              ] */
            _this._restApiClient.executeApiCall('POST', path, httpHeaders, bulkEnrollmentOperation, function (err, bulkEnrollmentOperationResult, httpResponse) {
                if (callback) {
                    if (err) {
                        _callback(err);
                    }
                    else {
                        _callback(null, bulkEnrollmentOperationResult, httpResponse);
                    }
                }
            });
        }, callback);
    };
    ProvisioningServiceClient.prototype.deleteDeviceRegistrationState = function (idOrRegistrationState, etagOrCallback, deleteCallback) {
        var _this = this;
        if (deleteCallback && !(typeof deleteCallback === 'function')) {
            throw new ArgumentError('Callback has to be a Function');
        }
        if (typeof etagOrCallback === 'function') {
            deleteCallback = etagOrCallback;
            etagOrCallback = undefined;
        }
        return azure_iot_common_2.errorCallbackToPromise(function (_callback) {
            _this._delete(_this._registrationsPrefix, idOrRegistrationState, etagOrCallback, _callback);
        }, deleteCallback);
    };
    ProvisioningServiceClient.prototype.getIndividualEnrollmentAttestationMechanism = function (enrollementId, callback) {
        var _this = this;
        /*SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_001: [The `getIndividualEnrollmentAttestationMechanism` method shall throw a `ReferenceError` if the `enrollmentId` parameter is falsy.]*/
        if (!enrollementId) {
            throw new ReferenceError('enrollmentId cannot be \'' + enrollementId + '\'');
        }
        /*SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_002: [The `getIndividualEnrollmentAttestationMechanism` shall construct an HTTP request using information supplied by the caller as follows:
        ```
        POST /enrollments/<encodeUriComponentStrict(enrollmentId)>/attestationmechanism?api-version=<version> HTTP/1.1
        Authorization: <sharedAccessSignature>
        ```]*/
        var path = '/enrollments/' + azure_iot_common_1.encodeUriComponentStrict(enrollementId) + '/attestationmechanism' + this._versionQueryString();
        var headers = {};
        return azure_iot_common_1.httpCallbackToPromise(function (_callback) {
            // for some reason we have to specify types in this callback to avoid the typescript compiler complaining about not using AttestationMechanism (even if it's in the method signature)
            _this._restApiClient.executeApiCall('POST', path, headers, undefined, _callback);
        }, callback);
    };
    ProvisioningServiceClient.prototype.getEnrollmentGroupAttestationMechanism = function (enrollmentGroupId, callback) {
        var _this = this;
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_003: [The `getEnrollmentGroupAttestationMechanism` method shall throw a `ReferenceError` if the `enrollementGroupId` parameter is falsy.]*/
        if (!enrollmentGroupId) {
            throw new ReferenceError('enrollmentGroupId cannot be \'' + enrollmentGroupId + '\'');
        }
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_004: [The `getEnrollmentGroupAttestationMechanism` shall construct an HTTP request using information supplied by the caller as follows:
        ```
        POST /enrollmentgroups/<encodeUriComponentStrict(enrollmentGroupId)>/attestationmechanism?api-version=<version> HTTP/1.1
        Authorization: <sharedAccessSignature>
        ```]*/
        var path = '/enrollmentgroups/' + azure_iot_common_1.encodeUriComponentStrict(enrollmentGroupId) + '/attestationmechanism' + this._versionQueryString();
        var headers = {};
        return azure_iot_common_1.httpCallbackToPromise(function (_callback) {
            // for some reason we have to specify types in this callback to avoid the typescript compiler complaining about not using AttestationMechanism (even if it's in the method signature)
            _this._restApiClient.executeApiCall('POST', path, headers, undefined, _callback);
        }, callback);
    };
    ProvisioningServiceClient.prototype._getEnrollFunc = function (prefix, querySpecification, pageSize) {
        var _this = this;
        return function (continuationToken, done) {
            var path = prefix + 'query' + _this._versionQueryString();
            var headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json; charset=utf-8'
            };
            if (continuationToken) {
                headers['x-ms-continuation'] = continuationToken;
            }
            if (pageSize) {
                headers['x-ms-max-item-count'] = pageSize;
            }
            _this._restApiClient.executeApiCall('POST', path, headers, querySpecification, done);
        };
    };
    ProvisioningServiceClient.prototype._versionQueryString = function () {
        return '?api-version=2019-03-31';
    };
    ProvisioningServiceClient.prototype._createOrUpdate = function (endpointPrefix, enrollment, callback) {
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_009: [The `createOrUpdateIndividualEnrollment` method shall throw `ReferenceError` if the `IndividualEnrollment` argument is falsy.]*/
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_012: [The `createOrUpdateEnrollmentGroup` method shall throw `ReferenceError` if the `EnrollmentGroup` argument is falsy.] */
        if (!enrollment) {
            throw new ReferenceError('Required parameter enrollment was null or undefined when calling createOrUpdate.');
        }
        var id;
        if (endpointPrefix === this._enrollmentGroupsPrefix) {
            id = enrollment.enrollmentGroupId;
        }
        else {
            id = enrollment.registrationId;
        }
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_011: [The `createOrUpdateIndividualEnrollment` method shall throw `ArgumentError` if the `enrollment.registrationId` property is falsy.] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_013: [`createOrUpdateEnrollmentGroup` method shall throw `ArgumentError` if the `enrollmentGroup.enrollmentGroupsId` property is falsy.] */
        if (!id) {
            throw new ArgumentError('Required id property was null or undefined when calling createOrUpdate.');
        }
        var path = endpointPrefix + encodeURIComponent(id) + this._versionQueryString();
        var httpHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json; charset=utf-8'
        };
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_055: [If the `enrollmentGroup` object contains an `etag` property it will be added as the value of the `If-Match` header of the http request.] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_056: [If the `enrollment` object contains an `etag` property it will be added as the value of the `If-Match` header of the http request.] */
        if (enrollment.etag) {
            httpHeaders['If-Match'] = enrollment.etag;
        }
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_010: [The `createOrUpdateIndividualEnrollment` method shall construct an HTTP request using information supplied by the caller, as follows:
          PUT /enrollments/<uri-encoded-enrollment.registrationId>?api-version=<version> HTTP/1.1
          Authorization: <sharedAccessSignature>
          Accept: application/json
          Content-Type: application/json; charset=utf-8
    
          <stringified json string of the enrollment argument>]*/
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_014: [The `createOrUpdateEnrollmentGroup` method shall construct an HTTP request using information supplied by the caller, as follows:
          PUT /enrollmentGroups/<uri-encoded-enrollmentGroup.enrollmentGroupsId>?api-version=<version> HTTP/1.1
          Authorization: <sharedAccessSignature>
          Accept: application/json
          Content-Type: application/json; charset=utf-8
    
          <stringified json string of the enrollmentGroup argument>
          ] */
        this._restApiClient.executeApiCall('PUT', path, httpHeaders, enrollment, function (err, enrollmentResponse, httpResponse) {
            if (callback) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, enrollmentResponse, httpResponse);
                }
            }
        });
    };
    ProvisioningServiceClient.prototype._delete = function (endpointPrefix, enrollmentOrIdOrRegistration, etagOrCallback, deleteCallback) {
        var ifMatch;
        var suppliedCallback;
        var id;
        suppliedCallback = deleteCallback || ((typeof etagOrCallback === 'function') ? etagOrCallback : undefined);
        if (!suppliedCallback) {
            throw new ArgumentError('No callback was passed.');
        }
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_015: [The `deleteIndividualEnrollment` method shall throw `ReferenceError` if the `enrollmentOrId` argument is falsy.] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_016: [The `deleteEnrollmentGroup` method shall throw `ReferenceError` if the `enrollmentGroupOrId` argument is falsy.] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_025: [The `deleteDeviceRegistrationState` method shall throw `ReferenceError` if the `idOrRegistrationState` argument is falsy.] */
        if (!enrollmentOrIdOrRegistration) {
            throw new ReferenceError('Required parameter \'' + enrollmentOrIdOrRegistration + '\' was null or undefined when calling delete.');
        }
        if (typeof enrollmentOrIdOrRegistration === 'string') {
            id = enrollmentOrIdOrRegistration;
            /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_040: [The `deleteIndividualEnrollment` method, if the first argument is a string, the second argument if present, must be a string or a callback, otherwise shall throw `ArgumentError`. .] */
            /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_045: [The `deleteEnrollmentGroup` method, if the first argument is a string, the second argument if present, must be a string or a callback, otherwise shall throw `ArgumentError`.] */
            /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_050: [The `deleteDeviceRegistrationState` method, if the first argument is a string, the second argument if present, must be a string or a callback, otherwise shall throw `ArgumentError`.] */
            if (!etagOrCallback) {
                ifMatch = undefined;
            }
            else if (typeof etagOrCallback === 'string') {
                /*Codes_**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_044: [** The `deleteIndividualEnrollment` method, if the first argument is a string, and the second argument is a string, shall construct an HTTP request using information supplied by the caller as follows:
                  DELETE /enrollments/<uri-encoded-enrollmentOrId>?api-version=<version> HTTP/1.1
                  If-Match: <second argument>
                  Authorization: <sharedAccessSignature>
                  */
                /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_049: [** The `deleteEnrollmentGroup` method, if the first argument is a string, and the second argument is a string, shall construct an HTTP request using information supplied by the caller as follows:
                  DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId>?api-version=<version> HTTP/1.1
                  If-Match: <second argument>
                  Authorization: <sharedAccessSignature>
                  ] */
                /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_054: [** The `deleteDeviceRegistrationState` method, if the first argument is a string, and the second argument is a string, shall construct an HTTP request using information supplied by the caller as follows:
                  DELETE /registrations/<uri-encoded-idOrRegistrationState>?api-version=<version> HTTP/1.1
                  If-Match: <second argument>
                  Authorization: <sharedAccessSignature>
                  ] */
                ifMatch = etagOrCallback;
            }
            else if (typeof etagOrCallback === 'function') {
                /*Codes_**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_043: [** The `deleteIndividualEnrollment` method, if the first argument is a string, and the second argument is NOT a string, shall construct an HTTP request using information supplied by the caller as follows:
                  DELETE /enrollments/<uri-encoded-enrollmentOrId>?api-version=<version> HTTP/1.1
                  Authorization: <sharedAccessSignature>
                  */
                /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_048: [** The `deleteEnrollmentGroup` method, if the first argument is a string, and the second argument is NOT a string, shall construct an HTTP request using information supplied by the caller as follows:
                  DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId>?api-version=<version> HTTP/1.1
                  Authorization: <sharedAccessSignature>
                  ] */
                /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_053: [** The `deleteDeviceRegistrationState` method, if the first argument is a string, and the second argument is NOT a string, shall construct an HTTP request using information supplied by the caller as follows:
                  DELETE /registrations/<uri-encoded-idOrRegistrationState>?api-version=<version> HTTP/1.1
                  Authorization: <sharedAccessSignature>
                  ] */
                ifMatch = undefined;
                suppliedCallback = etagOrCallback;
            }
            else {
                throw new ArgumentError('Second argument of this delete method must be a string or function.');
            }
        }
        else {
            if (endpointPrefix === this._enrollmentsPrefix) {
                if (!enrollmentOrIdOrRegistration.registrationId) {
                    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_017: [The `deleteIndividualEnrollment` method, if the first argument is an `IndividualEnrollment` object, shall throw an `ArgumentError`, if the `registrationId` property is falsy.] */
                    throw new ArgumentError('Required property \'registrationId\' was null or undefined when calling delete.');
                }
                id = enrollmentOrIdOrRegistration.registrationId;
            }
            else if (endpointPrefix === this._enrollmentGroupsPrefix) {
                if (!enrollmentOrIdOrRegistration.enrollmentGroupId) {
                    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_018: [The `deleteEnrollmentGroup` method, if the first argument is an `EnrollmentGroup` object, shall throw an `ArgumentError`, if the `enrollmentGroupId' property is falsy.] */
                    throw new ArgumentError('Required property \'enrollmentGroupId\' was null or undefined when calling delete.');
                }
                id = enrollmentOrIdOrRegistration.enrollmentGroupId;
            }
            else if (endpointPrefix === this._registrationsPrefix) {
                if (!enrollmentOrIdOrRegistration.registrationId) {
                    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_026: [The `deleteDeviceRegistrationState` method, if the first argument is a `DeviceRegistrationState` object, shall throw an `ArgumentError`, if the `registrationId' property is falsy.] */
                    throw new ArgumentError('Required property \'registrationId\' was null or undefined when calling delete.');
                }
                id = enrollmentOrIdOrRegistration.registrationId;
            }
            else {
                throw new ArgumentError('Invalid path specified for delete operation.');
            }
            if (enrollmentOrIdOrRegistration.etag) {
                /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_021: [The `deleteIndividualEnrollment` method, if the first argument is an `IndividualEnrollment` object, with a non-falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
                  DELETE /enrollments/<uri-encoded-enrollmentOrIdOrRegistration.registrationId>?api-version=<version> HTTP/1.1
                  If-Match: enrollmentOrIdOrRegistration.etag
                  Authorization: <sharedAccessSignature>
                  ] */
                /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_022: [The `deleteEnrollmentGroup` method, if the first argument is an `EnrollmentGroup` object, with a non-falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
                  DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId.enrollmentGroupId>?api-version=<version> HTTP/1.1
                  If-Match: enrollmentParameter.etag
                  Authorization: <sharedAccessSignature>
                  ] */
                /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_028: [** The `deleteDeviceRegistrationState` method, if the first argument is a `DeviceRegistrationState` object, with a non-falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
                  DELETE /registrations/<uri-encoded-idOrRegistrationState.registrationId>?api-version=<version> HTTP/1.1
                  If-Match: idOrRegistrationState.etag
                  Authorization: <sharedAccessSignature>
                  ] */
                ifMatch = enrollmentOrIdOrRegistration.etag;
            }
            else {
                /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_023: [The `deleteEnrollmentGroup` method, if the first argument is an `EnrollmentGroup` object, with a falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
                  DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId.enrollmentGroupId>?api-version=<version> HTTP/1.1
                  Authorization: <sharedAccessSignature>
                  ] */
                /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_024: [The `deleteIndividualEnrollment` method, if the first argument is an `enrollment` object, with a falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
                  DELETE /enrollments/<uri-encoded-enrollmentParameter.registrationId>?api-version=<version> HTTP/1.1
                  Authorization: <sharedAccessSignature>
                  ] */
                /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_029: [** The `deleteDeviceRegistrationState` method, if the first argument is a `DeviceRegistrationState` object, with a falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
                  DELETE /registrations/<uri-encoded-idOrRegistrationState.registrationId>?api-version=<version> HTTP/1.1
                  Authorization: <sharedAccessSignature>
                  ] */
                ifMatch = undefined;
            }
        }
        var path = endpointPrefix + encodeURIComponent(id) + this._versionQueryString();
        var httpHeaders = {};
        if (ifMatch) {
            httpHeaders['If-Match'] = ifMatch;
        }
        this._restApiClient.executeApiCall('DELETE', path, httpHeaders, null, function (err) {
            if (suppliedCallback) {
                if (err) {
                    suppliedCallback(err);
                }
                else {
                    suppliedCallback(null);
                }
            }
        });
    };
    ProvisioningServiceClient.prototype._get = function (endpointPrefix, id, getCallback) {
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_030: [The `getIndividualEnrollment` method shall throw `ReferenceError` if the `id` argument is falsy.] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_031: [The `getEnrollmentGroup` method shall throw `ReferenceError` if the `id` argument is falsy.] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_032: [The `getDeviceRegistrationState` method shall throw `ReferenceError` if the `id` argument is falsy.] */
        if (!id) {
            throw new ReferenceError('Required parameter \'' + id + '\' was null or undefined when calling get.');
        }
        var path = endpointPrefix + encodeURIComponent(id) + this._versionQueryString();
        var httpHeaders = {
            'Accept': 'application/json'
        };
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_033: [** The `getIndividualEnrollment` method shall construct an HTTP request using information supplied by the caller as follows:
          GET /enrollments/<uri-encoded-id>?api-version=<version> HTTP/1.1
          Accept: application/json
          Authorization: <sharedAccessSignature>
          ] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_034: [** The `getEnrollmentGroup` method shall construct an HTTP request using information supplied by the caller as follows:
          GET /enrollmentGroups/<uri-encoded-id>?api-version=<version> HTTP/1.1
          Authorization: <sharedAccessSignature>
          ] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_035: [** The `getDeviceRegistrationState` method shall construct an HTTP request using information supplied by the caller as follows:
          GET /registrations/<uri-encoded-id>?api-version=<version> HTTP/1.1
          Authorization: <sharedAccessSignature>
          ] */
        this._restApiClient.executeApiCall('GET', path, httpHeaders, null, function (err, enrollmentOrRegistrationState, httpResponse) {
            var callback = getCallback;
            if (err) {
                callback(err);
            }
            else {
                callback(null, enrollmentOrRegistrationState, httpResponse);
            }
        });
    };
    /**
     * @method          module:azure-iot-provisioning-service.ProvisioningServiceClient#fromConnectionString
     * @description     Constructs a ProvisioningServiceClient object from the given connection
     *                  string using the default transport
     *                  ({@link module:azure-iothub.Http|Http}).
     * @param {String}  value       A connection string which encapsulates the
     *                              appropriate (read and/or write) ProvisioningServiceClient
     *                              permissions.
     * @returns {module:azure-iot-provisioning-service.ProvisioningServiceClient}
     */
    ProvisioningServiceClient.fromConnectionString = function (value) {
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_005: [The `fromConnectionString` method shall throw `ReferenceError` if the `value` argument is falsy.]*/
        if (!value)
            throw new ReferenceError('value is \'' + value + '\'');
        var cn = azure_iot_common_1.ConnectionString.parse(value);
        var config = {
            host: cn.HostName,
            sharedAccessSignature: azure_iot_common_1.SharedAccessSignature.create(cn.HostName, cn.SharedAccessKeyName, cn.SharedAccessKey, Date.now())
        };
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_006: [`fromConnectionString` method shall derive and transform the needed parts from the connection string in order to create a `config` object for the constructor (see `SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_002`).] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_007: [The `fromConnectionString` method shall return a new instance of the `ProvisioningServiceClient` object.] */
        return new ProvisioningServiceClient(config);
    };
    return ProvisioningServiceClient;
}());
exports.ProvisioningServiceClient = ProvisioningServiceClient;
//# sourceMappingURL=provisioningserviceclient.js.map