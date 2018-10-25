# provisioning client requirements

## Overview

The `ProvisioningDeviceClient` class is the factory object used by clients to create a registration clients.

## Public API

### create(provisioningHost, idScope, transport, securityClient)

The `create` method is used to retrieve a client object that can be used to register with the Device Provisioning Service

**SRS_PROVISIONING_CLIENT_06_001: [** The `create` method shall throw `ReferenceError` if the `provisioningHost` argument is falsy. **]**

**SRS_PROVISIONING_CLIENT_06_002: [** The `create` method shall throw `ReferenceError` if the `idScope` argument is falsy. **]**

**SRS_PROVISIONING_CLIENT_18_001: [** If `securityClient` implements `X509SecurityClient` and the `transport` implements `X509ProvisioningTransport`, then `create` shall
return an `X509Registration` object. **]**

**SRS_PROVISIONING_CLIENT_18_002: [** If `securityClient` implements `X509SecurityClient` and the `transport` does not implement `X509ProvisioningTransport`, then `create` shall throw an `ArgumentError` exception. **]**

**SRS_PROVISIONING_CLIENT_18_003: [** If `securityClient` implements `TPMSecurityClient` and the `transport` implements `TPMProvisioningTransport`, then `create` shall return a `TpmRegistration` object. **]**

**SRS_PROVISIONING_CLIENT_18_004: [** If `securityClient` implements `TPMSecurityClient` and the `transport` dos not implement `TPMProvisioningTransport`, then `create` shall throw an `ArgumentError` exception. **]**

**SRS_PROVISIONING_CLIENT_06_003: [** If `securityClient` implements `SymmetricKeySecurityClient` and the `transport` implements `SymmetricKeyProvisioningTransport`, then `create` shall return an `SymmetricKeyRegistration` object. **]**

**SRS_PROVISIONING_CLIENT_06_004: [** If `securityClient` implements `SymmetricKeySecurityClient` and the `transport` does not implement `SymmetricKeyProvisioningTransport`, then `create` shall throw an `ArgumentError` exception. **]**

**SRS_PROVISIONING_CLIENT_18_005: [** If `securityClient` does not implement `X509SecurityClient`, `TPMSecurityClient`,  or `SymmetricKeySecurityClient` then `create` shall show an `ArgumentError` exception. **]**