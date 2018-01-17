# Amqp Requirements

The `Amqp` class provides the Provisioning Device SDK with a transport for TPM and x509 registration flows over AMQP. It is instantiated by SDK users only to be passed to the `ProvisioningDeviceClient` object and does not have a public API.

# Internal API

These methods are used by the other objects of the SDK but are not public API for the SDK user to call.

 ## setAuthentication(auth: X509): void

**SRS_NODE_PROVISIONING_AMQP_16_001: [** The certificate and key passed as properties of the `auth` argument shall be used to connect to the Device Provisioning Service endpoint, when a registration request or registration operation status request are made. **]**

## registrationRequest(request: RegistrationRequest, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void

**SRS_NODE_PROVISIONING_AMQP_16_002: [** The `registrationRequest` method shall connect the AMQP client with the certificate and key given in the `auth` parameter of the previously called `setAuthentication` method. **]**

**SRS_NODE_PROVISIONING_AMQP_16_003: [** The `registrationRequest` method shall attach a sender link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
```
com.microsoft:api-version: <API_VERSION>
com.microsoft:client-version: <CLIENT_VERSION>
```
**]**

**SRS_NODE_PROVISIONING_AMQP_16_004: [** The `registrationRequest` method shall attach a receiver link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
```
com.microsoft:api-version: <API_VERSION>
com.microsoft:client-version: <CLIENT_VERSION>
```
**]**

**SRS_NODE_PROVISIONING_AMQP_16_005: [** The `registrationRequest` method shall send a message on the previously attached sender link with a `correlationId` set to a newly generated UUID and the following application properties:
```
iotdps-operation-type: iotdps-register;
iotdps-forceRegistration: <true or false>;
```
 **]**

**SRS_NODE_PROVISIONING_AMQP_16_006: [** The `registrationRequest` method shall listen for the response on the receiver link and accept it when it comes. **]**

**SRS_NODE_PROVISIONING_AMQP_16_007: [** The `registrationRequest` method shall call its callback with a `RegistrationResult` object parsed from the body of the response message which `correlationId` matches the `correlationId` of the request message sent on the sender link. **]**

**SRS_NODE_PROVISIONING_AMQP_16_008: [** The `registrationRequest` method shall call its callback with an error if the transport fails to connect. **]**

**SRS_NODE_PROVISIONING_AMQP_16_009: [** The `registrationRequest` method shall call its callback with an error if the transport fails to attach the sender link. **]**

**SRS_NODE_PROVISIONING_AMQP_16_010: [** The `registrationRequest` method shall call its callback with an error if the transport fails to attach the receiver link. **]**

**SRS_NODE_PROVISIONING_AMQP_16_011: [** The `registrationRequest` method shall call its callback with an error if the transport fails to send the request message. **]**

## queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void

**SRS_NODE_PROVISIONING_AMQP_16_012: [** The `queryOperationStatus` method shall connect the AMQP client with the certificate and key given in the `auth` parameter of the previously called `setAuthentication` method. **]** **]**

**SRS_NODE_PROVISIONING_AMQP_16_013: [** The `queryOperationStatus` method shall attach a sender link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
```
com.microsoft:api-version: <API_VERSION>
com.microsoft:client-version: <CLIENT_VERSION>
```
**]**

**SRS_NODE_PROVISIONING_AMQP_16_014: [** The `queryOperationStatus` method shall attach a receiver link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
```
com.microsoft:api-version: <API_VERSION>
com.microsoft:client-version: <CLIENT_VERSION>
```
**]**

**SRS_NODE_PROVISIONING_AMQP_16_015: [** The `queryOperationStatus` method shall send a message on the pre-attached sender link with a `correlationId` set to a newly generated UUID and the following application properties:
```
iotdps-operation-type: iotdps-get-operationstatus;
iotdps-operation-id: <operationId>;
```
**]**

**SRS_NODE_PROVISIONING_AMQP_16_016: [** The `queryOperationStatus` method shall listen for the response on the receiver link and accept it when it comes. **]**

**SRS_NODE_PROVISIONING_AMQP_16_017: [** The `queryOperationStatus` method shall call its callback with a `RegistrationResult` object parsed from the body of the response message which `correlationId` matches the `correlationId` of the request message sent on the sender link. **]**

**SRS_NODE_PROVISIONING_AMQP_16_018: [** The `queryOperationStatus` method shall call its callback with an error if the transport fails to connect. **]**

**SRS_NODE_PROVISIONING_AMQP_16_019: [** The `queryOperationStatus` method shall call its callback with an error if the transport fails to attach the sender link. **]**

**SRS_NODE_PROVISIONING_AMQP_16_020: [** The `queryOperationStatus` method shall call its callback with an error if the transport fails to attach the receiver link. **]**

**SRS_NODE_PROVISIONING_AMQP_16_021: [** The `queryOperationStatus` method shall call its callback with an error if the transport fails to send the request message. **]**

## disconnect(callback: (err?: Error) => void): void

**SRS_NODE_PROVISIONING_AMQP_16_022: [** `disconnect` shall call its callback immediately if the AMQP connection is disconnected. **]**

**SRS_NODE_PROVISIONING_AMQP_16_023: [** `disconnect` shall detach the sender and receiver links and disconnect the AMQP connection. **]**

**SRS_NODE_PROVISIONING_AMQP_16_024: [** `disconnect` shall call its callback with no arguments if all detach/disconnect operations were successful. **]**

**SRS_NODE_PROVISIONING_AMQP_16_025: [** `disconnect` shall call its callback with the error passed from the first unsuccessful detach/disconnect operation if one of those fail. **]**

**SRS_NODE_PROVISIONING_AMQP_18_009: [** `disconnect` shall disonnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. **]**

**SRS_NODE_PROVISIONING_AMQP_18_001: [** `disconnect` shall cause a `registrationRequest` operation that is in progress to call its callback passing an `OperationCancelledError` object. **]**

**SRS_NODE_PROVISIONING_AMQP_18_002: [** `disconnect` shall cause a `queryOperationStatus` operation that is in progress to call its callback passing an `OperationCancelledError` object. **]**

## cancel(callback: (err?: Error) => void): void

**SRS_NODE_PROVISIONING_AMQP_18_003: [** `cancel` shall call its callback immediately if the AMQP connection is disconnected. **]**

**SRS_NODE_PROVISIONING_AMQP_18_004: [** `cancel` shall call its callback immediately if the AMQP connection is connected but idle. **]**

**SRS_NODE_PROVISIONING_AMQP_18_005: [** `cancel` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. **]**

**SRS_NODE_PROVISIONING_AMQP_18_006: [** `cancel` shall cause a `registrationRequest` operation that is in progress to call its callback passing an `OperationCancelledError` object. **]**

**SRS_NODE_PROVISIONING_AMQP_18_007: [** `cancel` shall cause a `queryOperationStatus` operation that is in progress to call its callback passing an `OperationCancelledError` object. **]**

**SRS_NODE_PROVISIONING_AMQP_18_008: [** `cancel` shall not disconnect the AMQP transport. **]**


