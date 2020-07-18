import { RestApiClient } from 'azure-iot-http-base';
import { QuerySpecification, Query, QueryResult } from './query';
import { IndividualEnrollment, EnrollmentGroup, DeviceRegistrationState, BulkEnrollmentOperation, BulkEnrollmentOperationResult, AttestationMechanism } from './interfaces';
import { ErrorCallback, HttpResponseCallback, ResultWithHttpResponse } from 'azure-iot-common';
export declare class ProvisioningServiceClient {
    private readonly _enrollmentGroupsPrefix;
    private readonly _enrollmentsPrefix;
    private readonly _registrationsPrefix;
    private _restApiClient;
    constructor(config: RestApiClient.TransportConfig, restApiClient?: RestApiClient);
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#createOrUpdateIndividualEnrollment
     * @description      Create or update a device enrollment record.
     * @param {object}   enrollment The device enrollment record.
     * @param {function} [callback] Invoked upon completion of the operation.
     * @returns {Promise<ResultWithHttpResponse<IndividualEnrollment>> | void} Promise if no callback function was passed, void otherwise.
     */
    createOrUpdateIndividualEnrollment(enrollment: IndividualEnrollment, callback: HttpResponseCallback<IndividualEnrollment>): void;
    createOrUpdateIndividualEnrollment(enrollment: IndividualEnrollment): Promise<ResultWithHttpResponse<IndividualEnrollment>>;
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#deleteIndividualEnrollment
     * @description      Delete a device enrollment record.
     * @param {string | object}   enrollmentOrId An IndividualEnrollment object or a string containing the registration id.
     * @param {string | function} etagOrCallback In the case of the first argument being a string this could be an etag (or the callback).
     * @param {function}          [deleteCallback] Invoked upon completion of the operation.
     * @returns {Promise<void> | void} Promise if no callback function was passed, void otherwise.
     */
    deleteIndividualEnrollment(enrollmentOrId: string | IndividualEnrollment, etag: string, deleteCallback: ErrorCallback): void;
    deleteIndividualEnrollment(enrollmentOrId: string | IndividualEnrollment, deleteCallback: ErrorCallback): void;
    deleteIndividualEnrollment(enrollmentOrId: string | IndividualEnrollment, etag: string): Promise<void>;
    deleteIndividualEnrollment(enrollmentOrId: string | IndividualEnrollment): Promise<void>;
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#getIndividualEnrollment
     * @description      Get a device enrollment record.
     * @param {string}   id          Registration ID.
     * @param {function} [getCallback] Invoked upon completion of the operation.
     * @returns {Promise<ResultWithHttpResponse<IndividualEnrollment>> | void} Promise if no callback function was passed, void otherwise.
     */
    getIndividualEnrollment(id: string, getCallback: HttpResponseCallback<IndividualEnrollment>): void;
    getIndividualEnrollment(id: string): Promise<ResultWithHttpResponse<IndividualEnrollment>>;
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#createIndividualEnrollmentQuery
     * @description      Creates a query that can be used to return pages of existing enrollments.
     * @param {object}   querySpecification The query specification.
     * @param {number}   pageSize           The maximum number of elements to return per page.
     */
    createIndividualEnrollmentQuery(querySpecification: QuerySpecification, pageSize?: number): Query;
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#getDeviceRegistrationState
     * @description      Gets the device registration status.
     * @param {string}   id       Registration ID.
     * @param {function} [callback] Invoked upon completion of the operation.
     * @returns {Promise<ResultWithHttpResponse<DeviceRegistrationState>> | void} Promise if no callback function was passed, void otherwise.
     */
    getDeviceRegistrationState(id: string, callback: HttpResponseCallback<DeviceRegistrationState>): void;
    getDeviceRegistrationState(id: string): Promise<ResultWithHttpResponse<DeviceRegistrationState>>;
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#createOrUpdateEnrollmentGroup
     * @description      Create or update a device enrollment group.
     * @param {object}   enrollmentGroup The device enrollment group.
     * @param {function} [callback]      Invoked upon completion of the operation.
     * @returns {Promise<ResultWithHttpResponse<DeviceRegistrationState>> | void} Promise if no callback function was passed, void otherwise.
     */
    createOrUpdateEnrollmentGroup(enrollmentGroup: EnrollmentGroup, callback: HttpResponseCallback<EnrollmentGroup>): void;
    createOrUpdateEnrollmentGroup(enrollmentGroup: EnrollmentGroup): Promise<ResultWithHttpResponse<EnrollmentGroup>>;
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#deleteEnrollmentGroup
     * @description     Delete a device enrollment group.
     * @param {object | string}   enrollmentGroupOrId EnrollmentGroup object or a string containing the enrollment Group Id.
     * @param {string | function} [etagOrCallback]      In the case of the first argument being a string this could be an etag (or the callback).
     * @param {function}          [deleteCallback]      Invoked upon completion of the operation.
     * @returns {Promise<void> | void} Promise if no callback function was passed, void otherwise.
     */
    deleteEnrollmentGroup(enrollmentGroupOrId: string | EnrollmentGroup, etag: string, deleteCallback: ErrorCallback): void;
    deleteEnrollmentGroup(enrollmentGroupOrId: string | EnrollmentGroup, deleteCallback: ErrorCallback): void;
    deleteEnrollmentGroup(enrollmentGroupOrId: string | EnrollmentGroup, etag: string): Promise<void>;
    deleteEnrollmentGroup(enrollmentGroupOrId: string | EnrollmentGroup): Promise<void>;
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#getEnrollmentGroup
     * @description      Get a device enrollment group.
     * @param {string}   id          IndividualEnrollment group ID.
     * @param {function} [getCallback] Invoked upon completion of the operation.
     * @returns {ResultWithHttpResponse<EnrollmentGroup> | void} Promise if no callback function was passed, void otherwise.
     */
    getEnrollmentGroup(id: string, getCallback: HttpResponseCallback<EnrollmentGroup>): void;
    getEnrollmentGroup(id: string): Promise<ResultWithHttpResponse<EnrollmentGroup>>;
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#createEnrollmentGroupQuery
     * @description      Creates a query that can be used to return pages of existing enrollment groups.
     * @param {object}   querySpecification The query specification.
     * @param {number}   pageSize           The maximum number of elements to return per page.
     */
    createEnrollmentGroupQuery(querySpecification: QuerySpecification, pageSize?: number): Query;
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#createEnrollmentGroupDeviceRegistrationStateQuery
     * @description      Creates a query that can be used to return, for a specific EnrollmentGroup, pages of existing device registration status.
     * @param {object}   querySpecification The query specification.
     * @param {string}   enrollmentGroupId  The EnrollmentGroup id that provides the scope for the query.
     * @param {number}   pageSize           The maximum number of elements to return per page.
     */
    createEnrollmentGroupDeviceRegistrationStateQuery(querySpecification: QuerySpecification, enrollmentGroupId: string, pageSize?: number): Query;
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#runBulkEnrollmentOperation
     * @description      Runs a number CRUD operations on an array of enrollment records.
     * @param {object}   bulkEnrollmentOperation An object that specifies the single kind of CRUD operations on the array of IndividualEnrollment objects that are also part of the object.
     * @param {function} callback      Invoked upon completion of the operation.
     */
    runBulkEnrollmentOperation(bulkEnrollmentOperation: BulkEnrollmentOperation, callback: HttpResponseCallback<BulkEnrollmentOperationResult>): void;
    runBulkEnrollmentOperation(bulkEnrollmentOperation: BulkEnrollmentOperation): Promise<ResultWithHttpResponse<BulkEnrollmentOperationResult>>;
    /**
     * @method           module:azure-iot-provisioning-service.ProvisioningServiceClient#deleteDeviceRegistrationState
     * @description      Delete a device registration status.
     * @param {object | string}   idOrRegistrationState A string containing the registration id OR an actual DeviceRegistrationState.
     * @param {string | function} etagOrCallback        In the case of the first argument being a string this could be an etag (or the callback).
     * @param {function}          [deleteCallback]      Invoked upon completion of the operation.
     * @returns {Promise<void> | void} Promise if no callback function was passed, void otherwise.
     */
    deleteDeviceRegistrationState(idOrRegistrationState: string | DeviceRegistrationState, etag: string, deleteCallback: ErrorCallback): void;
    deleteDeviceRegistrationState(idOrRegistrationState: string | DeviceRegistrationState, deleteCallback: ErrorCallback): void;
    deleteDeviceRegistrationState(idOrRegistrationState: string | DeviceRegistrationState, etag: string): Promise<void>;
    deleteDeviceRegistrationState(idOrRegistrationState: string | DeviceRegistrationState): Promise<void>;
    /**
     * Gets the attestation mechanism for an IndividualEnrollment record.
     * @param enrollementId Unique identifier of the enrollment.
     * @param callback Function called when the request is completed, either with an error or with an AttestationMechanism object.
     * @returns {Promise<ResultWithHttpResponse<AttestationMechanism>> | void} Promise if no callback function was passed, void otherwise.
     */
    getIndividualEnrollmentAttestationMechanism(enrollementId: string, callback: HttpResponseCallback<AttestationMechanism>): void;
    getIndividualEnrollmentAttestationMechanism(enrollementId: string): Promise<ResultWithHttpResponse<AttestationMechanism>>;
    /**
     * Gets the attestation mechanism for an EnrollmentGroup record.
     * @param enrollementGroupId Unique identifier of the EnrollmentGroup.
     * @param callback Function called when the request is completed, either with an error or with an AttestationMechanism object.
     * @returns {Promise<ResultWithHttpResponse<AttestationMechanism>> | void} Promise if no callback function was passed, void otherwise.
     */
    getEnrollmentGroupAttestationMechanism(enrollmentGroupId: string, callback: HttpResponseCallback<AttestationMechanism>): void;
    getEnrollmentGroupAttestationMechanism(enrollmentGroupId: string): Promise<ResultWithHttpResponse<AttestationMechanism>>;
    private _getEnrollFunc;
    private _versionQueryString;
    private _createOrUpdate;
    private _delete;
    private _get;
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
    static fromConnectionString(value: string): ProvisioningServiceClient;
}
export declare type _tsLintWorkaround = {
    query: QueryResult;
    results: BulkEnrollmentOperationResult;
};
