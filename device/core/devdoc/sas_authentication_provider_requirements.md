# SharedAccessSignatureAuthenticationProvider requirements

## Overview

The `SharedAccessSignatureAuthenticationProvider` class is used when an SDK user wants to control how shared access signatures are generated. A device client created with this authentication provider will be notified every time the user updates the shared access signature and will take appropriate action to stay connected, depending on which transport is used.

## Example usage
```js
var sasAuthProvider = SharedAccessSignatureAuthenticationProvider.fromSharedAccessSignature('<shared access signature>');
// whenever the token is needed for authentication:
sasAuthProvider.getCredentials(function (err, credentials) {
  // do something with the credentials
});

// to update the credentials
sasAuthProvider.updateSharedAccessSignature('<new shared access signature>');

// to monitor for new tokens:
sasAuthProvider.on('newTokenAvailable', function (credentials) {
  // do something with the credentials
});
```

## Public API

### constructor(credentials: TransportConfig)

**SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_001: [** The `constructor` shall store the credentials passed in the `credentials` argument. **]**

### getDeviceCredentials(callback: (err: Error, credentials: TransportConfig) => void): void

**SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_002: [** The `getDeviceCredentials` method shall call its callback with a `null` error parameter and the stored `credentials` object containing the current device credentials. **]**

### updateSharedAccessSignature(sharedAccessSignature: string): void

**SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_003: [** The `updateSharedAccessSignature` method shall update the stored credentials with the new `sharedAccessSignature` value passed as an argument.**]**

**SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_004: [** The `updateSharedAccessSignature` method shall emit a `newTokenAvailable` event with the updated credentials. **]**

### static fromSharedAccessSignature(sharedAccessSignature: string): SharedAccessSignatureAuthenticationProvider

**SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_005: [** The `fromSharedAccessSignature` method shall throw a `ReferenceError` if the `sharedAccessSignature` argument is falsy. **]**

**SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_006: [** The `fromSharedAccessSignature` shall return a new `SharedAccessSignatureAuthenticationProvider` object initialized with the credentials parsed from the `sharedAccessSignature` argument. **]**

### stop(): void

**SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_007: [** The `stop` method shall simply return since there is no timeout or resources to clear. **]**