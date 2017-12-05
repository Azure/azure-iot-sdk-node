# provisioning client requirements

## Overview

The `ProvisioningDeviceClient` class is the factory object used by clients to create a registration clients.

## Example usage

```js
// TODO once all the pieces are there in the SDK

```

## Public API

### create(transport, securityClient)

The `create` method is used to retrieve a client object that can be used to register with the Device Provisioning Service

**SRS_PROVISIONING_CLIENT_18_001: [** If `securityClient` supports x509 security and the `transport` supports x509 authentication, then `crate` shall
return an `X509Registration` object. **]**

**SRS_PROVISIONING_CLIENT_18_002: [** If `securityClient` supports x509 security and the `transport` does not support x509 authentication, then `crate` shall throw a `ArgumentError` exepction. **]**

**SRS_PROVISIONING_CLIENT_18_003: [** If `securityClient` supports TPM security and the `transport` supports TPM authentication, then `create` shall return a `TpmRegistration` object. **]**

**SRS_PROVISIONING_CLIENT_18_004: [** If `securityClient` supports TPM security and the `transport` does not support TPM authentication, then `crate` shall throw a `ArgumentError` exepction. **]**

**SRS_PROVISIONING_CLIENT_18_005: [** If `securityClient` does not support X509 or TPM security, then `create` shall show an `ArgumentError` exception. **]**