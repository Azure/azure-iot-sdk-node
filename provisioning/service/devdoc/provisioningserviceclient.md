# azure-iot-provisioning-service.ProvisioningServiceClient Requirements

## Overview
`ProvisioningServiceClient` provides CRUD operations for the service client for the provisioning service

## Example usage
TBD

## Constructor/Factory methods

### ProvisioningServiceClient(config, restApiClient) [constructor]

The `ProvisioningServiceClient` construction initializes a new instance of a `ProvisioningServiceClient` object that is used to conduct CRUD operations with the provisioning service

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_001: [** The `ProvisioningServiceClient` construction shall throw a `ReferenceError` if the `config` object is falsy. **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_002: [** The `ProvisioningServiceClient` constructor shall throw an `ArgumentError` if the `config` object is missing one or more of the following properties:
- `host`: the IoT Hub hostname
- `sharedAccessSignature`: shared access signature with the permissions for the desired operations. **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_003: [** The `ProvisioningServiceClient` constructor shall use the `restApiClient` provided as a second argument if it is provided. **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_004: [** The `ProvisioningServiceClient` constructor shall use `azure-iot-http-base.RestApiClient` if no `restApiClient` argument is provided. **]**

### fromConnectionString(value) [static]

The `fromConnectionString` static method returns a new instance of the `ProvisioningServiceClient` object.

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_005: [** The `fromConnectionString` method shall throw `ReferenceError` if the `value` argument is falsy. **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_006: [** `fromConnectionString` method shall derive and transform the needed parts from the connection string in order to create a `config` object for the constructor (see `SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_002`).  **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_007: [** The `fromConnectionString` method shall return a new instance of the `ProvisioningServiceClient` object. **]**

### createOrUpdateIndividualEnrollment(enrollment, createOrUpdateIndividualEnrollmentCallback)
The `createOrUpdateIndividualEnrollment` method adds a device enrollment.

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_009: [** The `createOrUpdateIndividualEnrollment` method shall throw `ReferenceError` if the `enrollment` argument is falsy.  **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_011: [** The `createOrUpdateIndividualEnrollment` method shall throw `ArgumentError` if the `enrollment.registrationId` property is falsy. **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_056: [** If the `enrollment` object contains an `etag` property it will be added as the value of the `If-Match` header of the http request. **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_010: [** The `createOrUpdateIndividualEnrollment` method shall construct an HTTP request using information supplied by the caller, as follows:
```
PUT /enrollments/<uri-encoded-enrollment.registrationId>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Accept: application/json
Content-Type: application/json; charset=utf-8

<stringified json string of the enrollment argument>
```
**]**

### createOrUpdateEnrollmentGroup(enrollmentGroup, createOrUpdateEnrollmentGroupCallback)
The `createOrUpdateEnrollmentGroup` method adds a device enrollment group.

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_012: [** The `createOrUpdateEnrollmentGroup` method shall throw `ReferenceError` if the `EnrollmentGroup` argument is falsy. **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_013: [** `createOrUpdateEnrollmentGroup` method shall throw `ArgumentError` if the `enrollmentGroup.enrollmentGroupsId` property is falsy. **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_055: [** If the `enrollmentGroup` object contains an `etag` property it will be added as the value of the `If-Match` header of the http request. **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_014: [** The `createOrUpdateEnrollmentGroup` method shall construct an HTTP request using information supplied by the caller, as follows:
```
PUT /enrollmentGroups/<uri-encoded-enrollmentGroup.enrollmentGroupsId>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Accept: application/json
Content-Type: application/json; charset=utf-8

<stringified json string of the enrollmentGroup argument>
```
**]**


### deleteIndividualEnrollment(enrollmentOrId, etagOrCallback, deleteCallback)
The `deleteIndividualEnrollment` method deletes a device enrollment.

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_015: [** The `deleteIndividualEnrollment` method shall throw `ReferenceError` if the `enrollmentOrId` argument is falsy. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_040: [** The `deleteIndividualEnrollment` method, if the first argument is a string, the second argument if present, must be a string or a callback, otherwise shall throw `ArgumentError`. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_041: [** The `deleteIndividualEnrollment` method, if the first argument is a string and the second argument is a string, the third argument if present, must be a callback, otherwise shall throw `ArgumentError`.**]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_042: [** The `deleteIndividualEnrollment` method, if the first argument is an `IndividualEnrollment` object, the second argument if present, must be a callback, otherwise shall throw `ArgumentError`.**]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_017: [** The `deleteIndividualEnrollment` method, if the first argument is an `IndividualEnrollment` object, shall throw an `ArgumentError`, if the `registrationId` property is falsy. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_043: [** The `deleteIndividualEnrollment` method, if the first argument is a string, and the second argument is NOT a string, shall construct an HTTP request using information supplied by the caller as follows:
```
DELETE /enrollments/<uri-encoded-enrollmentOrId>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
```
**]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_044: [** The `deleteIndividualEnrollment` method, if the first argument is a string, and the second argument is a string, shall construct an HTTP request using information supplied by the caller as follows:
```
DELETE /enrollments/<uri-encoded-enrollmentOrId>?api-version=<version> HTTP/1.1
If-Match: <second argument>
Authorization: <sharedAccessSignature>
```
**]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_021: [** The `deleteIndividualEnrollment` method, if the first argument is an `IndividualEnrollment` object, with a non-falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
```
DELETE /enrollments/<uri-encoded-enrollmentOrId.registrationId>?api-version=<version> HTTP/1.1
If-Match: enrollmentOrId.etag
Authorization: <sharedAccessSignature>
```
**]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_024: [** The `deleteIndividualEnrollment` method, if the first argument is an `IndividualEnrollment` object, with a falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
```
DELETE /enrollments/<uri-encoded-enrollmentParameter.registrationId>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
```
**]**

### deleteEnrollmentGroup(enrollmentGroupOrId, deleteCallback)
The `deleteEnrollmentGroup` method deletes an enrollment group.

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_016: [** The `deleteEnrollmentGroup` method shall throw `ReferenceError` if the `enrollmentGroupOrId` argument is falsy. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_045: [** The `deleteEnrollmentGroup` method, if the first argument is a string, the second argument if present, must be a string or a callback, otherwise shall throw `ArgumentError`. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_046: [** The `deleteEnrollmentGroup` method, if the first argument is a string and the second argument is a string, the third argument if present, must be a callback, otherwise shall throw `ArgumentError`. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_047: [** The `deleteEnrollmentGroup` method, if the first argument is an `EnrollmentGroup` object, the second argument if present, must be a callback, otherwise shall throw `ArgumentError`. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_018: [** The `deleteEnrollmentGroup` method, if the first argument is an `EnrollmentGroup` object, shall throw an `ArgumentError`, if the `enrollmentGroupId' property is falsy. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_048: [** The `deleteEnrollmentGroup` method, if the first argument is a string, and the second argument is NOT a string, shall construct an HTTP request using information supplied by the caller as follows:
```
DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
```
**]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_049: [** The `deleteEnrollmentGroup` method, if the first argument is a string, and the second argument is a string, shall construct an HTTP request using information supplied by the caller as follows:
```
DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId>?api-version=<version> HTTP/1.1
If-Match: <second argument>
Authorization: <sharedAccessSignature>
```
**]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_022: [** The `deleteEnrollmentGroup` method, if the first argument is an `EnrollmentGroup` object, with a non-falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
```
DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId.enrollmentGroupId>?api-version=<version> HTTP/1.1
If-Match: enrollmentGroupOrId.etag
Authorization: <sharedAccessSignature>
```
**]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_023: [** The `deleteEnrollmentGroup` method, if the first argument is an `EnrollmentGroup` object, with a falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
```
DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId.enrollmentGroupId>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
```
**]**

### deleteDeviceRegistrationState(idOrRegistrationState, deleteCallback)
The `deleteDeviceRegistrationState` method deletes a registration state.

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_025: [** The `deleteDeviceRegistrationState` method shall throw `ReferenceError` if the `idOrRegistrationState` argument is falsy. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_050: [** The `deleteDeviceRegistrationState` method, if the first argument is a string, the second argument if present, must be a string or a callback, otherwise shall throw `ArgumentError`. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_051: [** The `deleteDeviceRegistrationState` method, if the first argument is a string and the second argument is a string, the third argument if present, must be a callback, otherwise shall throw `ArgumentError`. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_052: [** The `deleteDeviceRegistrationState` method, if the first argument is an `DeviceRegistrationState` object, the second argument if present, must be a callback, otherwise shall throw `ArgumentError`. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_026: [** The `deleteDeviceRegistrationState` method, if the first argument is a `DeviceRegistrationState` object, shall throw an `ArgumentError`, if the `registrationId' property is falsy. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_053: [** The `deleteDeviceRegistrationState` method, if the first argument is a string, and the second argument is NOT a string, shall construct an HTTP request using information supplied by the caller as follows:
```
DELETE /registrations/<uri-encoded-idOrRegistrationState>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
```
**]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_054: [** The `deleteDeviceRegistrationState` method, if the first argument is a string, and the second argument is a string, shall construct an HTTP request using information supplied by the caller as follows:
```
DELETE /registrations/<uri-encoded-idOrRegistrationState>?api-version=<version> HTTP/1.1
If-Match: <second argument>
Authorization: <sharedAccessSignature>
```
**]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_028: [** The `deleteDeviceRegistrationState` method, if the first argument is a `DeviceRegistrationState` object, with a non-falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
```
DELETE /registrations/<uri-encoded-idOrRegistrationState.registrationId>?api-version=<version> HTTP/1.1
If-Match: idOrRegistrationState.etag
Authorization: <sharedAccessSignature>
```
**]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_029: [** The `deleteDeviceRegistrationState` method, if the first argument is a `DeviceRegistrationState` object, with a falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
```
DELETE /registrations/<uri-encoded-idOrRegistrationState.registrationId>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
```
**]**

### getIndividualEnrollment(id, getCallback)
The `getIndividualEnrollment` method returns an `IndividualEnrollment` object.

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_030: [** The `getIndividualEnrollment` method shall throw `ReferenceError` if the `id` argument is falsy. **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_033: [** The `getIndividualEnrollment` method shall construct an HTTP request using information supplied by the caller as follows:
```
GET /enrollments/<uri-encoded-id>?api-version=<version> HTTP/1.1
Accept: application/json
Authorization: <sharedAccessSignature>
```
**]**

### getEnrollmentGroup(id, getEnrollmentGroupCallback)
The `getEnrollmentGroup` method returns an `EnrollmentGroup` object

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_031: [** The `getEnrollmentGroup` method shall throw `ReferenceError` if the `id` argument is falsy. **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_034: [** The `getEnrollmentGroup` method shall construct an HTTP request using information supplied by the caller as follows:
```
GET /enrollmentGroups/<uri-encoded-id>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
```
**]**

### getDeviceRegistrationState(id, deviceRegistrationsStateCallback)
The `getDeviceRegistrationState` returns a `DeviceRegistrationState`.

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_032: [** The `getDeviceRegistrationState` method shall throw `ReferenceError` if the `id` argument is falsy. **]**
**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_035: [** The `getDeviceRegistrationState` method shall construct an HTTP request using information supplied by the caller as follows:
```
GET /registrations/<uri-encoded-id>?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
```
**]**

### runBulkEnrollmentOperation(bulkEnrollmentOperation, bulkEnrollmentOperationCallback)
The `runBulkEnrollmentOperation` can perform CRUD operations on IndividualEnrollment objects in bulk.

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_038: [** The `runBulkEnrollmentOperation` method shall throw `ReferenceError` if the `bulkEnrollmentOperation` argument is falsy. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_039: [** The `runBulkEnrollmentOperation` method shall construct an HTTP request using information supplied by the caller as follows:
```
POST /enrollments?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
Accept: application/json
Content-Type: application/json; charset=utf-8

<stringified json string of the bulkEnrollmentOperation argument>
```
**]**

### getIndividualEnrollmentAttestationMechanism(enrollementId: string, callback: (err: Error, attestationMechanism?: AttestationMechanism) => void): void;
The `getIndividualEnrollmentAttestationMechanism` method gets the `AttestationMechanism` object of a specific enrollment record.

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_001: [** The `getIndividualEnrollmentAttestationMechanism` method shall throw a `ReferenceError` if the `enrollmentId` parameter is falsy. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_002: [** The `getIndividualEnrollmentAttestationMechanism` shall construct an HTTP request using information supplied by the caller as follows:
```
POST /enrollments/<encodeUriComponentStrict(enrollmentId)>/attestationmechanism?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
```
**]**

### getEnrollmentGroupAttestationMechanism(enrollementGroupId: string, callback: (err: Error, attestationMechanism?: AttestationMechanism) => void): void;
The `getEnrollmentGroupAttestationMechanism` method gets the `AttestationMechanism` object of a specific enrollment record.

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_003: [** The `getEnrollmentGroupAttestationMechanism` method shall throw a `ReferenceError` if the `enrollementGroupId` parameter is falsy. **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_004: [** The `getEnrollmentGroupAttestationMechanism` shall construct an HTTP request using information supplied by the caller as follows:
```
POST /enrollmentgroups/<encodeUriComponentStrict(enrollmentGroupId)>/attestationmechanism?api-version=<version> HTTP/1.1
Authorization: <sharedAccessSignature>
```
**]**

### Generic HTTP Requirements

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_036: [** If any device enrollment operation method encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript `Error` object with a text description of the error (err.message).  **]**

**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_037: [** When any registry operation method receives an HTTP response with a status code >= 300, it shall invoke the `done` callback function with an error translated using the requirements detailed in `registry_http_errors_requirements.md`  **]**