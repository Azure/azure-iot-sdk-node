# azure-iot-security-symmetric-key.SymmetricKeySecurityClient Requirements

## Overview
`SymmetricKeySecurityClient` provides query operations for symmetric key based attestation and a sas token object.

## Example usage

var securityClient = new symmetricKeySecurity.SymmetricKeySecurityClient();
var provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new provisioningTransport(), securityClient);

### SymmetricKeySecurityClient(registrationId: string, symmetricKey: string) [constructor]

The `SymmetricKeySecurityClient` constructor initializes a new instance of a `SymmetricKeySecurityClient` object.

### getRegistrationId(callback: (err: Error, registrationId: string) => void): void

**SRS_NODE_SYMMETRIC_KEY_SECURITY_CLIENT_06_004: [** This function returns the `registrationId` for the particular device. **]**

### createSharedAccessSignature(idScope: string, callback: (err: Error, sasTokenObject: SharedAccessSignature)) => void): void

**SRS_NODE_SYMMETRIC_KEY_SECURITY_CLIENT_06_005: [** Will throw `ReferenceError` if `idScope` parameter is falsy. **]**

**SRS_NODE_SYMMETRIC_KEY_SECURITY_CLIENT_06_006: [** The `idScope` parameter must be of type string. **]**

**SRS_NODE_SYMMETRIC_KEY_SECURITY_CLIENT_06_007: [** A SharedAccessSignature object shall be returned, based on the `idScope`, and the `registrationId` given in the constructor. **]**
