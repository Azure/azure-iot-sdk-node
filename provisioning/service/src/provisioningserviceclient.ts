// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { errors, SharedAccessSignature, ConnectionString, httpCallbackToPromise, encodeUriComponentStrict } from 'azure-iot-common';
import { RestApiClient } from 'azure-iot-http-base';
import { QuerySpecification, Query, QueryResult } from './query';
// tslint seems to think AttestationMechanism isn't used on the next import statement so disabling this warning.
// tslint:disable-next-line:no-unused-variable
import { IndividualEnrollment, EnrollmentGroup, DeviceRegistrationState, BulkEnrollmentOperation, BulkEnrollmentOperationResult, AttestationMechanism } from './interfaces';
import { ErrorCallback, errorCallbackToPromise, HttpResponseCallback, ResultWithHttpResponse } from 'azure-iot-common';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

const ArgumentError = errors.ArgumentError;

export class ProvisioningServiceClient {

  private readonly _enrollmentGroupsPrefix: string = '/enrollmentGroups/';
  private readonly _enrollmentsPrefix: string = '/enrollments/';
  private readonly _registrationsPrefix: string = '/registrations/';
  private _restApiClient: RestApiClient;

  constructor(config: RestApiClient.TransportConfig, restApiClient?: RestApiClient) {
    if (!config) {
      /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_001: [The `ProvisioningServiceClient` construction shall throw a `ReferenceError` if the `config` object is falsy.] */
      throw new ReferenceError('The \'config\' parameter cannot be \'' + config + '\'');
    } else if (!config.host || !config.sharedAccessSignature) {
      /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_002: [The `ProvisioningServiceClient` constructor shall throw an `ArgumentError` if the `config` object is missing one or more of the following properties:
                                                            - `host`: the IoT Hub hostname
                                                            - `sharedAccessSignature`: shared access signature with the permissions for the desired operations.] */
      throw new ArgumentError('The \'config\' argument is missing either the host or the sharedAccessSignature property');
    }

    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_003: [The `ProvisioningServiceClient` constructor shall use the `restApiClient` provided as a second argument if it is provided.] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_004: [The `ProvisioningServiceClient` constructor shall use `azure-iot-http-base.RestApiClient` if no `restApiClient` argument is provided.] */
    this._restApiClient = restApiClient || new RestApiClient(config, packageJson.name + '/' + packageJson.version);
  }

  /**
   * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#createOrUpdateIndividualEnrollment
   * @description      Create or update a device enrollment record.
   * @param {object}   enrollment The device enrollment record.
   * @param {function} [callback] Invoked upon completion of the operation.
   * @returns {Promise<ResultWithHttpResponse<IndividualEnrollment>> | void} Promise if no callback function was passed, void otherwise.
   */
  public createOrUpdateIndividualEnrollment(enrollment: IndividualEnrollment, callback: HttpResponseCallback<IndividualEnrollment>): void;
  public createOrUpdateIndividualEnrollment(enrollment: IndividualEnrollment): Promise<ResultWithHttpResponse<IndividualEnrollment>>;
  public createOrUpdateIndividualEnrollment(enrollment: IndividualEnrollment, callback?: HttpResponseCallback<IndividualEnrollment>): Promise<ResultWithHttpResponse<IndividualEnrollment>> | void {
    return httpCallbackToPromise((_callback) => {
      this._createOrUpdate(this._enrollmentsPrefix, enrollment, _callback);
    }, callback);
  }

  /**
   * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#deleteIndividualEnrollment
   * @description      Delete a device enrollment record.
   * @param {string | object}   enrollmentOrId An IndividualEnrollment object or a string containing the registration id.
   * @param {string | function} etagOrCallback In the case of the first argument being a string this could be an etag (or the callback).
   * @param {function}          [deleteCallback] Invoked upon completion of the operation.
   * @returns {Promise<void> | void} Promise if no callback function was passed, void otherwise.
   */
  public deleteIndividualEnrollment(enrollmentOrId: string | IndividualEnrollment, etag: string, deleteCallback: ErrorCallback): void;
  public deleteIndividualEnrollment(enrollmentOrId: string | IndividualEnrollment, deleteCallback: ErrorCallback): void;
  public deleteIndividualEnrollment(enrollmentOrId: string | IndividualEnrollment, etag: string): Promise<void>;
  public deleteIndividualEnrollment(enrollmentOrId: string | IndividualEnrollment): Promise<void>;
  public deleteIndividualEnrollment(enrollmentOrId: string | IndividualEnrollment, etagOrCallback?: string | ErrorCallback, deleteCallback?: ErrorCallback): Promise<void> | void {
    if (deleteCallback && !(typeof deleteCallback === 'function')) {
      throw new ArgumentError('Callback has to be a Function');
    }

    if (!deleteCallback && (typeof etagOrCallback === 'function')) {
      deleteCallback = etagOrCallback as ErrorCallback;
      etagOrCallback = undefined;
    }

    return errorCallbackToPromise((_callback) => {
      this._delete(this._enrollmentsPrefix, enrollmentOrId, etagOrCallback, _callback);
    }, deleteCallback);
  }

  /**
   * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#getIndividualEnrollment
   * @description      Get a device enrollment record.
   * @param {string}   id          Registration ID.
   * @param {function} [getCallback] Invoked upon completion of the operation.
   * @returns {Promise<ResultWithHttpResponse<IndividualEnrollment>> | void} Promise if no callback function was passed, void otherwise.
   */
  public getIndividualEnrollment(id: string, getCallback: HttpResponseCallback<IndividualEnrollment>): void;
  public getIndividualEnrollment(id: string): Promise<ResultWithHttpResponse<IndividualEnrollment>>;
  public getIndividualEnrollment(id: string, getCallback?: HttpResponseCallback<IndividualEnrollment>): Promise<ResultWithHttpResponse<IndividualEnrollment>> | void {
    return httpCallbackToPromise((_callback) => {
      this._get(this._enrollmentsPrefix, id, _callback);
    }, getCallback);
  }

  /**
   * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#createIndividualEnrollmentQuery
   * @description      Creates a query that can be used to return pages of existing enrollments.
   * @param {object}   querySpecification The query specification.
   * @param {number}   pageSize           The maximum number of elements to return per page.
   */
  createIndividualEnrollmentQuery(querySpecification: QuerySpecification, pageSize?: number): Query {
    return new Query(this._getEnrollFunc(this._enrollmentsPrefix, querySpecification, pageSize));
  }

  /**
   * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#getDeviceRegistrationState
   * @description      Gets the device registration status.
   * @param {string}   id       Registration ID.
   * @param {function} [callback] Invoked upon completion of the operation.
   * @returns {Promise<ResultWithHttpResponse<DeviceRegistrationState>> | void} Promise if no callback function was passed, void otherwise.
   */
  public getDeviceRegistrationState(id: string, callback: HttpResponseCallback<DeviceRegistrationState>): void;
  public getDeviceRegistrationState(id: string): Promise<ResultWithHttpResponse<DeviceRegistrationState>>;
  public getDeviceRegistrationState(id: string, callback?: HttpResponseCallback<DeviceRegistrationState>): Promise<ResultWithHttpResponse<DeviceRegistrationState>> | void {
    return httpCallbackToPromise((_callback) => {
      this._get(this._registrationsPrefix, id, _callback);
    }, callback);
  }

  /**
   * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#createOrUpdateEnrollmentGroup
   * @description      Create or update a device enrollment group.
   * @param {object}   enrollmentGroup The device enrollment group.
   * @param {function} [callback]      Invoked upon completion of the operation.
   * @returns {Promise<ResultWithHttpResponse<DeviceRegistrationState>> | void} Promise if no callback function was passed, void otherwise.
   */
  public createOrUpdateEnrollmentGroup(enrollmentGroup: EnrollmentGroup, callback: HttpResponseCallback<EnrollmentGroup>): void;
  public createOrUpdateEnrollmentGroup(enrollmentGroup: EnrollmentGroup): Promise<ResultWithHttpResponse<EnrollmentGroup>>;
  public createOrUpdateEnrollmentGroup(enrollmentGroup: EnrollmentGroup, callback?: HttpResponseCallback<EnrollmentGroup>): Promise<ResultWithHttpResponse<EnrollmentGroup>> | void {
    return httpCallbackToPromise((_callback) => {
      this._createOrUpdate(this._enrollmentGroupsPrefix, enrollmentGroup, _callback);
    }, callback);
  }

  /**
   * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#deleteEnrollmentGroup
   * @description     Delete a device enrollment group.
   * @param {object | string}   enrollmentGroupOrId EnrollmentGroup object or a string containing the enrollment Group Id.
   * @param {string | function} [etagOrCallback]      In the case of the first argument being a string this could be an etag (or the callback).
   * @param {function}          [deleteCallback]      Invoked upon completion of the operation.
   * @returns {Promise<void> | void} Promise if no callback function was passed, void otherwise.
   */
  public deleteEnrollmentGroup(enrollmentGroupOrId: string | EnrollmentGroup, etag: string, deleteCallback: ErrorCallback): void;
  public deleteEnrollmentGroup(enrollmentGroupOrId: string | EnrollmentGroup, deleteCallback: ErrorCallback): void;
  public deleteEnrollmentGroup(enrollmentGroupOrId: string | EnrollmentGroup, etag: string): Promise<void>;
  public deleteEnrollmentGroup(enrollmentGroupOrId: string | EnrollmentGroup): Promise<void>;
  public deleteEnrollmentGroup(enrollmentGroupOrId: string | EnrollmentGroup, etagOrCallback?: string | ErrorCallback, deleteCallback?: ErrorCallback): Promise<void> | void {
    if (deleteCallback && !(typeof deleteCallback === 'function')) {
      throw new ArgumentError('Callback has to be a Function');
    }

    if (typeof etagOrCallback === 'function') {
      deleteCallback = etagOrCallback as ErrorCallback;
      etagOrCallback = undefined;
    }

    return errorCallbackToPromise((_callback) => {
      this._delete(this._enrollmentGroupsPrefix, enrollmentGroupOrId, etagOrCallback, _callback);
    }, deleteCallback);
  }

  /**
   * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#getEnrollmentGroup
   * @description      Get a device enrollment group.
   * @param {string}   id          IndividualEnrollment group ID.
   * @param {function} [getCallback] Invoked upon completion of the operation.
   * @returns {ResultWithHttpResponse<EnrollmentGroup> | void} Promise if no callback function was passed, void otherwise.
   */
  public getEnrollmentGroup(id: string, getCallback: HttpResponseCallback<EnrollmentGroup>): void;
  public getEnrollmentGroup(id: string): Promise<ResultWithHttpResponse<EnrollmentGroup>>;
  public getEnrollmentGroup(id: string, getCallback?: HttpResponseCallback<EnrollmentGroup>): Promise<ResultWithHttpResponse<EnrollmentGroup>> | void {
    return httpCallbackToPromise((_callback) => {
      this._get(this._enrollmentGroupsPrefix, id, _callback);
    }, getCallback);
  }

  /**
   * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#createEnrollmentGroupQuery
   * @description      Creates a query that can be used to return pages of existing enrollment groups.
   * @param {object}   querySpecification The query specification.
   * @param {number}   pageSize           The maximum number of elements to return per page.
   */
  createEnrollmentGroupQuery(querySpecification: QuerySpecification, pageSize?: number): Query {
    return new Query(this._getEnrollFunc(this._enrollmentGroupsPrefix, querySpecification, pageSize));
  }

  /**
   * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#createEnrollmentGroupDeviceRegistrationStateQuery
   * @description      Creates a query that can be used to return, for a specific EnrollmentGroup, pages of existing device registration status.
   * @param {object}   querySpecification The query specification.
   * @param {string}   enrollmentGroupId  The EnrollmentGroup id that provides the scope for the query.
   * @param {number}   pageSize           The maximum number of elements to return per page.
   */
  createEnrollmentGroupDeviceRegistrationStateQuery(querySpecification: QuerySpecification, enrollmentGroupId: string, pageSize?: number): Query {
    if (!enrollmentGroupId) {
      throw new ReferenceError('Required enrollmentGroupId parameter was falsy.');
    }
    return new Query(this._getEnrollFunc(this._registrationsPrefix + encodeURIComponent(enrollmentGroupId) + '/', querySpecification, pageSize));
  }

  /**
   * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#runBulkEnrollmentOperation
   * @description      Runs a number CRUD operations on an array of enrollment records.
   * @param {object}   bulkEnrollmentOperation An object that specifies the single kind of CRUD operations on the array of IndividualEnrollment objects that are also part of the object.
   * @param {function} callback      Invoked upon completion of the operation.
   */
  public runBulkEnrollmentOperation(bulkEnrollmentOperation: BulkEnrollmentOperation, callback: HttpResponseCallback<BulkEnrollmentOperationResult>): void;
  public runBulkEnrollmentOperation(bulkEnrollmentOperation: BulkEnrollmentOperation): Promise<ResultWithHttpResponse<BulkEnrollmentOperationResult>>;
  public runBulkEnrollmentOperation(bulkEnrollmentOperation: BulkEnrollmentOperation, callback?: HttpResponseCallback<BulkEnrollmentOperationResult>): Promise<ResultWithHttpResponse<BulkEnrollmentOperationResult>> | void {
    return httpCallbackToPromise((_callback) => {
      /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_038: [The `runBulkEnrollmentOperation` method shall throw `ReferenceError` if the `bulkEnrollmentOperation` argument is falsy.] */
      if (!bulkEnrollmentOperation) {
        throw new ReferenceError('Required bulkEnrollmentOperation parameter was falsy when calling runBulkEnrollmentOperation.');
      }

      const path = this._enrollmentsPrefix + this._versionQueryString();

      const httpHeaders = {
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
      this._restApiClient.executeApiCall('POST', path, httpHeaders, bulkEnrollmentOperation, (err, bulkEnrollmentOperationResult, httpResponse) => {
        if (callback) {
          if (err) {
            _callback(err);
          } else {
            _callback(null, bulkEnrollmentOperationResult, httpResponse);
          }
        }
      });
    }, callback);
  }

  /**
   * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#deleteDeviceRegistrationState
   * @description      Delete a device registration status.
   * @param {object | string}   idOrRegistrationState A string containing the registration id OR an actual DeviceRegistrationState.
   * @param {string | function} etagOrCallback        In the case of the first argument being a string this could be an etag (or the callback).
   * @param {function}          [deleteCallback]      Invoked upon completion of the operation.
   * @returns {Promise<void> | void} Promise if no callback function was passed, void otherwise.
   */
  public deleteDeviceRegistrationState(idOrRegistrationState: string | DeviceRegistrationState, etag: string, deleteCallback: ErrorCallback): void;
  public deleteDeviceRegistrationState(idOrRegistrationState: string | DeviceRegistrationState, deleteCallback: ErrorCallback): void;
  public deleteDeviceRegistrationState(idOrRegistrationState: string | DeviceRegistrationState, etag: string): Promise<void>;
  public deleteDeviceRegistrationState(idOrRegistrationState: string | DeviceRegistrationState): Promise<void>;
  public deleteDeviceRegistrationState(idOrRegistrationState: string | DeviceRegistrationState, etagOrCallback?: string | ErrorCallback, deleteCallback?: ErrorCallback): Promise<void> | void {
    if (deleteCallback && !(typeof deleteCallback === 'function')) {
      throw new ArgumentError('Callback has to be a Function');
    }

    if (typeof etagOrCallback === 'function') {
      deleteCallback = etagOrCallback as ErrorCallback;
      etagOrCallback = undefined;
    }

    return errorCallbackToPromise((_callback) => {
      this._delete(this._registrationsPrefix, idOrRegistrationState, etagOrCallback, _callback);
    }, deleteCallback);
  }

  /**
   * Gets the attestation mechanism for an IndividualEnrollment record.
   * @param enrollementId Unique identifier of the enrollment.
   * @param callback Function called when the request is completed, either with an error or with an AttestationMechanism object.
   * @returns {Promise<ResultWithHttpResponse<AttestationMechanism>> | void} Promise if no callback function was passed, void otherwise.
   */
    public getIndividualEnrollmentAttestationMechanism(enrollementId: string, callback: HttpResponseCallback<AttestationMechanism>): void;
    public getIndividualEnrollmentAttestationMechanism(enrollementId: string): Promise<ResultWithHttpResponse<AttestationMechanism>>;
    public getIndividualEnrollmentAttestationMechanism(enrollementId: string, callback?: HttpResponseCallback<AttestationMechanism>): Promise<ResultWithHttpResponse<AttestationMechanism>> | void  {
    /*SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_001: [The `getIndividualEnrollmentAttestationMechanism` method shall throw a `ReferenceError` if the `enrollmentId` parameter is falsy.]*/
    if (!enrollementId) {
      throw new ReferenceError('enrollmentId cannot be \'' + enrollementId + '\'');
    }

    /*SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_002: [The `getIndividualEnrollmentAttestationMechanism` shall construct an HTTP request using information supplied by the caller as follows:
    ```
    POST /enrollments/<encodeUriComponentStrict(enrollmentId)>/attestationmechanism?api-version=<version> HTTP/1.1
    Authorization: <sharedAccessSignature>
    ```]*/
    const path = '/enrollments/' + encodeUriComponentStrict(enrollementId) + '/attestationmechanism' + this._versionQueryString();
    const headers = {};

    return httpCallbackToPromise((_callback) => {
      // for some reason we have to specify types in this callback to avoid the typescript compiler complaining about not using AttestationMechanism (even if it's in the method signature)
      this._restApiClient.executeApiCall('POST', path, headers, undefined, _callback);
    }, callback);
  }

  /**
   * Gets the attestation mechanism for an EnrollmentGroup record.
   * @param enrollementGroupId Unique identifier of the EnrollmentGroup.
   * @param callback Function called when the request is completed, either with an error or with an AttestationMechanism object.
   * @returns {Promise<ResultWithHttpResponse<AttestationMechanism>> | void} Promise if no callback function was passed, void otherwise.
   */
  public getEnrollmentGroupAttestationMechanism(enrollmentGroupId: string, callback: HttpResponseCallback<AttestationMechanism>): void;
  public getEnrollmentGroupAttestationMechanism(enrollmentGroupId: string): Promise<ResultWithHttpResponse<AttestationMechanism>>;
  public getEnrollmentGroupAttestationMechanism(enrollmentGroupId: string, callback?: HttpResponseCallback<AttestationMechanism>): Promise<ResultWithHttpResponse<AttestationMechanism>> | void  {
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_003: [The `getEnrollmentGroupAttestationMechanism` method shall throw a `ReferenceError` if the `enrollementGroupId` parameter is falsy.]*/
    if (!enrollmentGroupId) {
      throw new ReferenceError('enrollmentGroupId cannot be \'' + enrollmentGroupId + '\'');
    }

    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_004: [The `getEnrollmentGroupAttestationMechanism` shall construct an HTTP request using information supplied by the caller as follows:
    ```
    POST /enrollmentgroups/<encodeUriComponentStrict(enrollmentGroupId)>/attestationmechanism?api-version=<version> HTTP/1.1
    Authorization: <sharedAccessSignature>
    ```]*/
    const path = '/enrollmentgroups/' + encodeUriComponentStrict(enrollmentGroupId) + '/attestationmechanism' + this._versionQueryString();
    const headers = {};

    return httpCallbackToPromise((_callback) => {
      // for some reason we have to specify types in this callback to avoid the typescript compiler complaining about not using AttestationMechanism (even if it's in the method signature)
      this._restApiClient.executeApiCall('POST', path, headers, undefined, _callback);
    }, callback);
  }

  private _getEnrollFunc(prefix: string, querySpecification: QuerySpecification, pageSize: number): (continuationToken: string, done: HttpResponseCallback<QueryResult>) => void {
    return (continuationToken, done) => {
      const path = prefix + 'query' + this._versionQueryString();

      let headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8'
      };

      if (continuationToken) {
        headers['x-ms-continuation'] = continuationToken;
      }

      if (pageSize) {
        headers['x-ms-max-item-count'] = pageSize;
      }

      this._restApiClient.executeApiCall('POST', path, headers, querySpecification, done);
    };
  }

  private _versionQueryString(): string {
    return '?api-version=2018-11-01';
  }

  private _createOrUpdate(endpointPrefix: string, enrollment: any, callback?: (err: Error, enrollmentResponse?: any, response?: any) => void): void {
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_009: [The `createOrUpdateIndividualEnrollment` method shall throw `ReferenceError` if the `IndividualEnrollment` argument is falsy.]*/
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_012: [The `createOrUpdateEnrollmentGroup` method shall throw `ReferenceError` if the `EnrollmentGroup` argument is falsy.] */
    if (!enrollment) {
      throw new ReferenceError('Required parameter enrollment was null or undefined when calling createOrUpdate.');
    }

    let id: string;
    if (endpointPrefix === this._enrollmentGroupsPrefix) {
      id = enrollment.enrollmentGroupId;
    } else {
      id = enrollment.registrationId;
    }

    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_011: [The `createOrUpdateIndividualEnrollment` method shall throw `ArgumentError` if the `enrollment.registrationId` property is falsy.] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_013: [`createOrUpdateEnrollmentGroup` method shall throw `ArgumentError` if the `enrollmentGroup.enrollmentGroupsId` property is falsy.] */
    if (!id) {
      throw new ArgumentError('Required id property was null or undefined when calling createOrUpdate.');
    }
    const path = endpointPrefix + encodeURIComponent(id) + this._versionQueryString();

    const httpHeaders = {
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
    this._restApiClient.executeApiCall('PUT', path, httpHeaders, enrollment, (err, enrollmentResponse, httpResponse) => {
      if (callback) {
        if (err) {
          callback(err);
        } else {
          callback(null, enrollmentResponse, httpResponse);
        }
      }
    });
  }

  private _delete(endpointPrefix: string, enrollmentOrIdOrRegistration: string | any, etagOrCallback?: string | ErrorCallback, deleteCallback?: ErrorCallback): void {
    let ifMatch: string;
    let suppliedCallback: ErrorCallback | undefined;
    let id: string;

    suppliedCallback = deleteCallback || ((typeof etagOrCallback === 'function') ? etagOrCallback as ErrorCallback : undefined);
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
      } else if (typeof etagOrCallback === 'string') {
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
      } else if (typeof etagOrCallback === 'function') {
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
      } else {
        throw new ArgumentError('Second argument of this delete method must be a string or function.');
      }
    } else {
      if (endpointPrefix === this._enrollmentsPrefix) {
        if (!enrollmentOrIdOrRegistration.registrationId) {
          /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_017: [The `deleteIndividualEnrollment` method, if the first argument is an `IndividualEnrollment` object, shall throw an `ArgumentError`, if the `registrationId` property is falsy.] */
          throw new ArgumentError('Required property \'registrationId\' was null or undefined when calling delete.');
        }
        id = enrollmentOrIdOrRegistration.registrationId;
      } else if (endpointPrefix === this._enrollmentGroupsPrefix) {
        if (!enrollmentOrIdOrRegistration.enrollmentGroupId) {
          /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_018: [The `deleteEnrollmentGroup` method, if the first argument is an `EnrollmentGroup` object, shall throw an `ArgumentError`, if the `enrollmentGroupId' property is falsy.] */
          throw new ArgumentError('Required property \'enrollmentGroupId\' was null or undefined when calling delete.');
        }
        id = enrollmentOrIdOrRegistration.enrollmentGroupId;
      } else if (endpointPrefix === this._registrationsPrefix) {
        if (!enrollmentOrIdOrRegistration.registrationId) {
          /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_026: [The `deleteDeviceRegistrationState` method, if the first argument is a `DeviceRegistrationState` object, shall throw an `ArgumentError`, if the `registrationId' property is falsy.] */
          throw new ArgumentError('Required property \'registrationId\' was null or undefined when calling delete.');
        }
        id = enrollmentOrIdOrRegistration.registrationId;
      } else {
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
      } else {
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

    const path = endpointPrefix + encodeURIComponent(id) + this._versionQueryString();

    let httpHeaders = {};

    if (ifMatch) {
      httpHeaders['If-Match'] = ifMatch;
    }

    this._restApiClient.executeApiCall('DELETE', path, httpHeaders, null, (err) => {
      if (suppliedCallback) {
        if (err) {
          suppliedCallback(err);
        } else {
          suppliedCallback(null);
        }
      }
    });
  }

  private _get(endpointPrefix: string, id: string, getCallback: HttpResponseCallback<DeviceRegistrationState> | HttpResponseCallback<IndividualEnrollment> | HttpResponseCallback<EnrollmentGroup>): void {
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_030: [The `getIndividualEnrollment` method shall throw `ReferenceError` if the `id` argument is falsy.] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_031: [The `getEnrollmentGroup` method shall throw `ReferenceError` if the `id` argument is falsy.] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_032: [The `getDeviceRegistrationState` method shall throw `ReferenceError` if the `id` argument is falsy.] */
    if (!id) {
      throw new ReferenceError('Required parameter \'' + id + '\' was null or undefined when calling get.');
    }

    const path = endpointPrefix + encodeURIComponent(id) + this._versionQueryString();

    const httpHeaders = {
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
    this._restApiClient.executeApiCall('GET', path, httpHeaders, null, (err?: Error, enrollmentOrRegistrationState?: DeviceRegistrationState | IndividualEnrollment | EnrollmentGroup, httpResponse?: any) => {
      const callback = (getCallback as HttpResponseCallback<DeviceRegistrationState | IndividualEnrollment | EnrollmentGroup>);
      if (err) {
        callback(err);
      } else {
        callback(null, enrollmentOrRegistrationState, httpResponse);
      }
    });
  }

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
  static fromConnectionString(value: string): ProvisioningServiceClient {
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_005: [The `fromConnectionString` method shall throw `ReferenceError` if the `value` argument is falsy.]*/
    if (!value) throw new ReferenceError('value is \'' + value + '\'');

    const cn = ConnectionString.parse(value);

    const config: RestApiClient.TransportConfig = {
      host: cn.HostName,
      sharedAccessSignature: SharedAccessSignature.create(cn.HostName, cn.SharedAccessKeyName, cn.SharedAccessKey, Date.now())
    };
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_006: [`fromConnectionString` method shall derive and transform the needed parts from the connection string in order to create a `config` object for the constructor (see `SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_002`).] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_007: [The `fromConnectionString` method shall return a new instance of the `ProvisioningServiceClient` object.] */
    return new ProvisioningServiceClient(config);
  }

}

export type _tsLintWorkaround = { query: QueryResult, results: BulkEnrollmentOperationResult };
