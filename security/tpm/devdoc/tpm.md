# azure-iot-security-tpm.TpmSecurityClient Requirements

## Overview
`TpmSecurityClient` provides query and key operations for the device registration client.

## Example usage
TBD

### TpmSecurityClient(registrationId?: string, customTpm?: any) [constructor]

The `TpmSecurityClient` constructor initializes a new instance of a `TpmSecurityClient` object that is used to query TPM entities and perform key manipulation and setup.

**SRS_NODE_TPM_SECURITY_CLIENT_06_001: [** The `registrationId` argument if present will be returned as the `registrationId` for subsequent calls to `getRegistrationId`. **]**

**SRS_NODE_TPM_SECURITY_CLIENT_06_002: [** The `customTpm` argument, if present` will be used at the underlying TPM provider.  Otherwise the TPM provider will the tss TPM client with a parameter of `false` for simulator use. **]**

### getEndorsementKey(callback: (err: Error, endorsementKey: string) => void): void

Queries and returns the public portion of the endorsement key in the TPM hardware.

**SRS_NODE_TPM_SECURITY_CLIENT_06_006: [** The `getEndorsementKey` function shall query the TPM hardware and return the `endorsementKey` in the callback. **]**

**SRS_NODE_TPM_SECURITY_CLIENT_06_007: [** Any errors from interacting with the TPM hardware will cause a `SecurityDeviceError` to be returned in the `err` parameter of the callback. **]**

### getStorageRootKey(callback: (err: Error, storageKey: string) => void): void

Queries and returns the public portion of the storage root key in the TPM hardware.

**SRS_NODE_TPM_SECURITY_CLIENT_06_008: [** The `getStorageRootKey` function shall query the TPM hardware and return the `storageRootKey` in the callback. **]**

**SRS_NODE_TPM_SECURITY_CLIENT_06_009: [** Any errors from interacting with the TPM hardware will cause in SecurityDeviceError to be returned in the err parameter of the callback. **]**

### signWithIdentity(dataToSign: Buffer, callback: (err: Error, signedData: Buffer) => void): void

The `signWithIdentity` function will perform an HMAC signing with a previously defined symmetric identity.

**SRS_NODE_TPM_SECURITY_CLIENT_06_011: [** If `dataToSign` is falsy, an ReferenceError will be thrown. **]**

**SRS_NODE_TPM_SECURITY_CLIENT_06_013: [** If `signWithIdentity` is invoked without a previous successful invocation of `activateSymmetricIdentity`, an InvalidOperationError is thrown. **]**

### activateSymmetricIdentity(identityKey: Buffer, callback: (err: Error, returnedActivate: Buffer) => void): void

The `activateSymmetricIdentity` will set up the TPM to perform sigining operation utilizing the `identityKey` specified withing the identity key argument.

**SRS_NODE_TPM_SECURITY_CLIENT_06_014: [** If the `identityKey` parameter is falsy, an ReferenceError will be thrown. **]**

### getRegistrationId(callback: (err: Error, registrationId: string) => void): void

This function returns the `registrationId` for the particular device.

**SRS_NODE_TPM_SECURITY_CLIENT_06_003: [** If the TpmSecurityClient was given a `registrationId` at creation, that `registrationId` will be returned. **]**

**SRS_NODE_TPM_SECURITY_CLIENT_06_004: [** If not provided, the `registrationId` will be constructed and returned as follows:

The endorsementKey will be queried.
The endorsementKey will be hashed utilizing SHA256.
The resultant digest will be base 32 encoded in conformance with the `RFC4648` specification.
The resultant string will have terminating `=` characters removed. **]**

**SRS_NODE_TPM_SECURITY_CLIENT_06_005: [** Any errors from interacting with the TPM hardware will cause an SecurityDeviceError to be returned in the err parameter of the callback. **]**