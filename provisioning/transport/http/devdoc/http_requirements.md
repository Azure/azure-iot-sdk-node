# azure-iot-provisioning-device-http Requirements

## Overview
This module provides HTTP protocol support to communicate with the Azure device provisioning service

## Example Usage
``js
  // this is an internal class that is used by the Azure provisioning service device client..  It is not meant to be used directly.
``

## Public Interface

### constructor(httpBase?: Base)
The `constructor` creates an Http transport object used to communicate with the Azure device provisioning service

**SRS_NODE_PROVISIONING_HTTP_18_001: [** The `Http` constructor shall accept the following properties:
  - `httpBase` - an optional test implementation of azure-iot-http-base **]**

### setTpmInformation(endorsementKey: Buffer, storageRootKey: Buffer)
The setTpmInformation will store set the tpm information into the  http class.

**SRS_NODE_PROVISIONING_HTTP_06_001: [** The `endorsementKey` will be saved into the class as a string. **]**
**SRS_NODE_PROVISIONING_HTTP_06_002: [** The `storageRootKey` will be saved into the class as a string. **]**

### getAuthenticationChallenge(request: RegistrationRequest, callback: (err: Error, tpmChallenge?: Buffer))
Queries the dps to obtain a buffer that may be used as a symmetric key to perform further registration tasks.

**SRS_NODE_PROVISIONING_HTTP_06_003: [** The getAuthenticationChallenge will perform a request that contains the endorsementKey, the storageRootKey, and the registrationId as the body of the request. **]**
**SRS_NODE_PROVISIONING_HTTP_06_004: [** The request will actually generate a 401 error since there is actually no authentication for the request. **]**
**SRS_NODE_PROVISIONING_HTTP_06_005: [** The request response will contain an activation blob which will be provided as the result of the callback for this function. **]**

### registrationRequest(request: RegistrationRequest, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void;

**SRS_NODE_PROVISIONING_HTTP_18_005: [** `registrationRequest` shall include the current `api-version` as a URL query string value named 'api-version'. **]**

**SRS_NODE_PROVISIONING_HTTP_18_006: [** `registrationRequest` shall specify the following in the Http header:
  Accept: application/json
  Content-Type: application/json; charset=utf-8 **]**

**SRS_NODE_PROVISIONING_HTTP_18_007: [** If an X509 cert if provided, `registrationRequest` shall include it in the Http authorization header. **]**

**SRS_NODE_PROVISIONING_HTTP_18_008: [** If `forceRegistration` is specified, `registrationRequest` shall include this as a query string value named 'forceRegistration' **]**

**SRS_NODE_PROVISIONING_HTTP_18_009: [** `registrationRequest` shall PUT the registration request to 'https://{provisioningHost}/{idScope}/registrations/{registrationId}/register' **]**

**SRS_NODE_PROVISIONING_HTTP_18_014: [** If the Http response has a failed status code, `registrationRequest` shall use `translateError` to translate this to a common error object **]**

**SRS_NODE_PROVISIONING_HTTP_18_044: [** If the Http request fails for any reason, `registrationRequest` shall call `callback`, passing the error along with the `result` and `response` objects. **]**

**SRS_NODE_PROVISIONING_HTTP_18_045: [** If the Http request succeeds, `registrationRequest` shall call `callback`, passing a `null` error along with the `result` and `response` objects. **]**

**SRS_NODE_PROVISIONING_HTTP_18_043: [** If `cancel` is called while the registration request is in progress, `register` shall call the `callback` with an `OperationCancelledError` error. **]**

### queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, result?: DeviceRegistrationResult, response?: any, pollingInterval?: number) => void): void;

**SRS_NODE_PROVISIONING_HTTP_18_037: [** `queryOperationStatus` shall include the current `api-version` as a URL query string value named 'api-version'. **]**

**SRS_NODE_PROVISIONING_HTTP_18_020: [** `queryOperationStatus` shall specify the following in the Http header:
  Accept: application/json
  Content-Type: application/json; charset=utf-8 **]**

**SRS_NODE_PROVISIONING_HTTP_18_021: [** If an X509 cert if provided, `queryOperationStatus` shall include it in the Http authorization header. **]**

**SRS_NODE_PROVISIONING_HTTP_18_022: [** `queryOperationStatus` shall send a GET operation sent to 'https://{provisioningHost}/{idScope}/registrations/{registrationId}/operations/{operationId}' **]**

**SRS_NODE_PROVISIONING_HTTP_18_026: [** If the Http response has a failed status code, `queryOperationStatus` shall use `translateError` to translate this to a common error object **]**

**SRS_NODE_PROVISIONING_HTTP_18_038: [** If the Http request fails for any reason, `queryOperationStatus` shall call `callback`, passing the error along with the `result` and `response` objects. **]**

**SRS_NODE_PROVISIONING_HTTP_18_039: [** If the Http request succeeds, `queryOperationStatus` shall call `callback`, passing a `null` error along with the `result` and `response` objects. **]**

**SRS_NODE_PROVISIONING_HTTP_18_042: [** If `cancel` is called while the operation status request is in progress, `queryOperationStatus` shall call the `callback` with an `OperationCancelledError` error. **]**


### disconnect(callback: (err?: Error) => void): void;

**SRS_NODE_PROVISIONING_HTTP_18_040: [** `disconnect` shall immediately call `callback` passing null. **]**


### cancel(callback: (err?: Error) => void): void;

**SRS_NODE_PROVISIONING_HTTP_18_041: [** `cancel` shall immediately call `callback` passing null. **]**



