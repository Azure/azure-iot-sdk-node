# SharedAccessKeySignatureProvider Requirements

# Overview

The `SharedAccessKeySignatureProvider` class implements the `SignatureProvider` interface by using a shared access key based HMAC algorithm. This is used to provide credentials to transports when the user wants the device to authenticate using security tokens.

# Public API

# constructor(private _sharedAccessKey: string, tokenValidTimeInSeconds?: number)

**SRS_NODE_SAK_SIG_PROVIDER_13_003: [** The `constructor` shall throw an `ArgumentError` if the `_sharedAccessKey` parameter is falsy. **]**

**SRS_NODE_SAK_SIG_PROVIDER_13_004: [** The `constructor` shall save the `tokenValidTimeInSeconds` parameter if supplied. If not, it shall default to 3600 seconds (1 hour). **]**

# sign(keyName: string, data: string, callback: (err: Error, signature: SharedAccessSignature) => void): void

**SRS_NODE_SAK_SIG_PROVIDER_13_005: [** The `sign` method shall throw a `ReferenceError` if the `callback` parameter is falsy or is not a function. **]**

**SRS_NODE_SAK_SIG_PROVIDER_13_006: [** The `sign` method invoke `callback` with a `ReferenceError` if the `data` parameter is falsy. **]**

**SRS_NODE_SAK_SIG_PROVIDER_13_001: [** Every token shall be created with a validity period of `tokenValidTimeInSeconds` if specified when the constructor was called, or 1 hour by default. **]**

**SRS_NODE_SAK_SIG_PROVIDER_13_002: [** Every token shall be created using the azure-iot-common.SharedAccessSignature.create method and then serialized as a string. The the expiration time of the token will be now + the token validity time, formatted as the number of seconds since Epoch (Jan 1st, 1970, 00:00 UTC). **]**

**SRS_NODE_SAK_SIG_PROVIDER_13_007: [** `sign` shall invoke the callback with the result of calling `azure-iot-common.SharedAccessSignature.create`. **]**