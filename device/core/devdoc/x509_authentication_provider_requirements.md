# X509AuthenticationProvider Requirements

## Overview

The `X509AuthenticationProvider` class can be used to configure a device client to authenticate with an X509 certificate/key pair.

## Example

```js
var x509AuthProvider = X509AuthenticationProvider.fromX509Options('<device id>', '<host name>', { cert: 'cert', key: 'key' });
// whenever the token is needed for authentication:
x509AuthProvider.getCredentials(function (err, credentials) {
  // do something with the credentials
});

// to update the credentials
x509AuthProvider.setX509Options({ cert: 'new cert', key: 'new key' });
});
```

## Public API

### constructor(credentials: TransportConfig)

**SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_001: [** The `constructor` shall store the credentials passed as argument. **]**

### getDeviceCredentials(callback: (err: Error, credentials?: TransportConfig) => void): void

**SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_002: [** The `getDeviceCredentials` method shall call its callback with a `null` error object and the stored device credentials as a second argument. **]**

### setX509Options(x509: X509): void

**SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_003: [** The `setX509Options` method shall store the `X509` object passed as an argument with the existing credentials. **]**

### fromX509Options(deviceId: string, iotHubHostname: string, x509info: X509): X509AuthenticationProvider [static]

**SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_004: [** The `fromX509Options` method shall throw a `ReferenceError` if `deviceId` is falsy. **]**

**SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_005: [** The `fromX509Options` method shall throw a `ReferenceError` if `iotHubHostname` is falsy. **]**

**SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_006: [** The `fromX509Options` method shall throw a `ReferenceError` if `x509info` is falsy. **]**

**SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_007: [** The `fromX509Options` method shall throw an `errors.ArgumentError` if `x509info.cert` is falsy. **]**

**SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_008: [** The `fromX509Options` method shall throw an `errors.ArgumentError` if `x509info.key` is falsy. **]**

**SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_009: [** The `fromX509Options` method shall create a new instance of `X509AuthenticationProvider` with a credentials object created from the arguments. **]**