# Amqp Requirements

The `Amqp` class provides the Provisioning Device SDK with a transport for TPM and x509 registration flows over AMQP.

# Example usage

```js
var Amqp = require('azure-iot-provisioning-device-amqp').Amqp;
var ProvisioningDeviceClient = require('azure-iot-provisioning-device').Client;
var X509Security = require('azure-iot-device-security-x509').X509Security;

var transport = new Amqp(idScope, dpsHost);
var securityClient = new X509Security(deviceCert);
var deviceClient = ProvisioningDeviceClient.create(transport, securityClient);

[...]
```

# Public API

This is the public API surface that the customer will use.

## constructor

The `Amqp` constructor shall throw a `ReferenceError` if the `scopeId` argument is falsy.

The `Amqp` constructor shall throw a `ReferenceError` if the `provisioningServiceEndpoint` argument is falsy.


# Internal API

These methods are considered public from a Typescript perspective but private from a public API surface perspective because the customers shouldn't use these directly.

## registerX509(registrationId: string, auth: X509, forceRegistration: boolean, callback: (err?: Error, registrationResult?: X509RegistrationResult, body?: any, result?: any) => void): void

The `registerX509` method shall connect the AMQP client with the certificate and key given in the `auth` parameter.

The `registerX509` method shall attach a sender link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
```
com.microsoft:api-version: <API_VERSION>
com.microsoft:client-version: <CLIENT_VERSION>
```

The `registerX509` method shall attach a receiver link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
```
com.microsoft:api-version: <API_VERSION>
com.microsoft:client-version: <CLIENT_VERSION>
```

The `registerX509` method shall use a polling state machine to trigger the registration process.

## registrationRequest

The `registrationRequest` method shall send a message on the pre-attached sender link with a `correlationId` set to a newly generated UUID and the following application properties:
```
iotdps-operation-type: iotdps-register;
iotdps-forceRegistration: <true or false>;
```

The `registrationRequest` method shall listen for the response on the receiver link and accept it when it comes.

The `registrationRequest` method shall call its callback with a `InitialRegistrationResponse` object with the following properties populated from the response message:
```
TBD
```


## operationStatusRequest

The `operationStatusRequest` method shall send a message on the pre-attached sender link with a `correlationId` set to a newly generated UUID and the following application properties:
```
iotdps-operation-type: iotdps-get-operationstatus;
iotdps-operation-id: <operationId>;
```

The `registrationRequest` method shall listen for the response on the receiver link and accept it when it comes.

The `registrationRequest` method shall call its callback with a `OperationStatusResponse` object with the following properties populated from the response message:
```
TBD
```

## cancel(callback: (err: Error) => void): void

`cancel` shall call its callback immediately if the AMQP connection is disconnected.

`cancel` shall call `cancel` on the polling state machine if it is running.

`cancel` shall detach the sender and receiver links and disconnect the AMQP connection.

`cancel` shall call its callback with no arguments if all detach/disconnect operations were successful

`cancel` shall call its callback with the error passed from the first unsuccessful detach/disconnect operation if one of those fail.

## getAuthenticationChallenge(registrationInfo: TpmRegistrationInfo, callback: (err: Error, tpmChallenge?: TpmChallenge) => void): void

## register(registrationInfo: TpmRegistrationInfo, sasToken: string, callback: (err: Error, result?: TpmRegistrationResult) => void): void

