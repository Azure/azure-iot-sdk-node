# X509registration requirements

## Overview

The `X509Registration` class is used to control the registration flow of an X509-enabled device, regardless of the transport, or `X509SecurityClient` implementation.

## Example usage

```js
// TODO once all the pieces are there in the SDK

```

## Public API

### register()

The `register` method completes the authentication and registration flow for the user.

**SRS_NODE_DPS_X509_REGISTRATION_18_001: [** `register` shall call `getCertificate` on the security object to acquire the X509 certificate. **]**

**SRS_NODE_DPS_X509_REGISTRATION_18_006: [** If `getCertificate`fails, `register` shall call `callback` with the error **]**

**SRS_NODE_DPS_X509_REGISTRATION_18_004: [** `register` shall pass the certificate into the `setAuthentication` method on the transport **]**

**SRS_NODE_DPS_X509_REGISTRATION_18_002: [** `register` shall call `register` on the pollingStateMachine and call `callback` with the result. **]**

**SRS_NODE_DPS_X509_REGISTRATION_18_005: [** If `register` on the pollingStateMachine fails, `register` shall call `callback` with the error **]**

### cancel()

The `cancel` method cancels a registration flow that is in progress.

**SRS_NODE_DPS_X509_REGISTRATION_18_003: [** `cancel` shall call `cancel` on the transport object. **]**