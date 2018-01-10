# TpmRegistration requirements

## Overview

The `TpmRegistration` class is used to control the registration flow of a TPM-enabled device, regardless of the transport, or `TpmSecurityClient` implementation.

## Example usage

```js
// TODO once all the pieces are there in the SDK

```

## Public API

### register()

The `register` method completes the authentication and registration flow for the user.

**SRS_NODE_DPS_TPM_REGISTRATION_16_001: [** The `register` method shall get the endorsement key by calling `getEndorsementKey` on the `TpmSecurityClient` object passed to the constructor. **]**

**SRS_NODE_DPS_TPM_REGISTRATION_16_002: [** The `register` method shall get the storage root key by calling `getStorageRootKey` on the `TpmSecurityClient` object passed to the constructor. **]**

**SRS_NODE_DPS_TPM_REGISTRATION_16_003: [** The `register` method shall initiate the authentication flow with the device provisioning service by calling the `getAuthenticationChallenge` method of the `TpmProvisioningTransport` object passed to the constructor with an object with the following properties:
- `registrationId`: a unique identifier computed from the endorsement key
- `provisioningHost`: the host address of the dps instance
- `idScope`: the `idscope` value obtained from the azure portal for this instance.
- a callback that will handle either an error or a `Buffer` object containing a session key to be used later in the authentication process.
**]**

**SRS_NODE_DPS_TPM_REGISTRATION_16_004: [** The `register` method shall store the session key in the TPM by calling the `activateIdentityKey` method of the `TpmSecurityClient` object passed to the constructor with the following arguments:
- `sessionKey`: the session key returned by the previous call to `TpmProvisioningTransport.getAuthenticationChallenge`
- a callback that will handle an optional error if the operation fails.
**]**

**SRS_NODE_DPS_TPM_REGISTRATION_16_005: [** The `register` method shall create a signature for the initial SAS token by signing the following payload with the session key and the `TpmSecurityClient`:
```
<idScope>/registrations/<registrationId>\n<expiryTimeUtc>
```
with:
- `idScope` being the value of the `idScope` argument passed to the `TpmRegistration` constructor.
- `registrationId` being the previously computed registration id.
- `expiryTimeUtc` being the number of seconds since Epoch + a delay during which the initial sas token should be valid (1 hour by default).
 **]**

**SRS_NODE_DPS_TPM_REGISTRATION_16_006: [** The `register` method shall create a SAS token to be used to get the actual registration result as follows:
```
SharedAccessSignature sr=<audience>&sig=<signature>&se=<expiryTimeUtc>&skn=registration
```
With the following fields:
- `audience`: <idScope>/registrations/<registrationId>
- `signature`: the base64 encoded version of the signature generated per `SRS_NODE_DPS_TPM_REGISTRATION_16_005`
- `expiryTimeUtc`: the same value that was used to generate the signature.
 **]**

**SRS_NODE_DPS_TPM_REGISTRATION_16_007: [** The `register` method shall start the actual registration process by calling the `register` method on the `TpmProvisioningTransport` object passed to the constructor with the following parameters:
- `sasToken`: the SAS token generated according to `SRS_NODE_DPS_TPM_REGISTRATION_16_006`
- `registrationInfo`: an object with the following properties `endorsementKey`, `storageRootKey`, `registrationId` and their previously set values.
- a callback that will handle an optional error and a `result` object containing the IoT hub name, device id and symmetric key for this device.
**]**

**SRS_NODE_DPS_TPM_REGISTRATION_16_008: [** When the callback for the registration process is called, the `register` method shall store the symmetric key within the TPM by calling the `activateIdentityKey` method of the `TpmSecurityClient` object passed to the constructor with the following arguments:
- `symmetricKey`: the symmetric key returned by the previous call to `TpmProvisioningTransport.getAuthenticationChallenge`
- a callback that will handle an optional error if the operation fails.

**]**

**SRS_NODE_DPS_TPM_REGISTRATION_16_009: [** Once the symmetric key has been stored, the `register` method shall call its own callback with a `null` error object and a `TpmRegistrationResult` object containing the information that the `TpmProvisioningTransport` returned once the registration was successful. **]**

**SRS_NODE_DPS_TPM_REGISTRATION_16_010: [** If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure. **]**

### cancel()

**SRS_NODE_DPS_TPM_REGISTRATION_16_011: [** The `cancel` method shall interrupt the ongoing registration process. **]**