# SymmetricKeyRegistration requirements

## Overview

The `SymmetricKeyRegistration` class is used to control the registration flow of a device, regardless of the transport, or `SymmetricKeySecurityClient` implementation.

## Example usage

```js
// TODO once all the pieces are there in the SDK

```

## Public API

### register()

The `register` method completes the authentication and registration flow for the user.

**SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_006: [** `register` shall call the `getRegistrationId` method on the security object to acquire the registration id. **]**

**SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_007: [** If the `getRegistrationId` fails, the `register` shall call the `_callback` with the error. **]**

**SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_008: [** `register` shall invoke `createSharedAccessSignature` method on the security object to acquire a sas token object. **]**

**SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_009: [** If the `createSharedAccessSignature` fails, the `register` shall call the `_callback` with the error. **]**

**SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_004: [** `register` shall pass the SAS into the `setSharedAccessSignature` method on the transport. **]**

**SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_005: [** `register` shall call `register` on the polling state machine object. **]**

**SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_010: [** if the polling register returns an error, the `register` shall invoke the `_callback` with that error. **]**

**SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_011: [** Otherwise `register` shall invoke the `_callback` with the resultant `registrationState` as the second argument. **]**

### cancel()

The `cancel` method cancels a registration flow that is in progress.

**SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_001: [** `cancel` shall call `cancel` on the transport object. **]**