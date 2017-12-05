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

**SRS_NODE_DPS_X509_REGISTRATION_18_001: [** `register` shall acquite the X509 certificate from the `X509SecurityClient` object. **]**

**SRS_NODE_DPS_X509_REGISTRATION_18_002: [** `register` shall call `registerX509` on the transport object and call it's callback with the result of the transport operation. **]**

### cancel()

The `cancel` method cancels a registration flow that is in progress.

**SRS_NODE_DPS_X509_REGISTRATION_18_003: [** `cancel` shall call `endSession` on the transport object. **]**