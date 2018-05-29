# SharedAccessKeyAuthenticationProvider Requirements

# Overview

The `SharedAccessKeyAuthenticationProvider` class is used to provide credentials to transports when the user wants the device to authenticate using security tokens, typically generated from shared access key that is passed as part of a connection string.

The `SharedAccessKeyAuthenticationProvider` class implements the `TokenAuthenticationProvider` interface from `azure-iot-common`.

# Example Usage
```js
var sakAuthProvider = SharedAccessKeyAuthenticationProvider.fromConnectionString('<connectionstring>');
// whenever a new token is needed:
sakAuthProvider.getCredentials(function (err, credentials) {
  // do something with the credentials
});

// to monitor for new tokens:
sakAuthProvider.on('newTokenAvailable', function (credentials) {
  // do something with the credentials
});
```

# Public API

# constructor(credentials: TransportConfig, tokenValidTimeInSeconds?, tokenRenewalMarginInSeconds?: number)

**SRS_NODE_SAK_AUTH_PROVIDER_16_001: [** The `constructor` shall create the initial token value using the `credentials` parameter. **]**

**SRS_NODE_SAK_AUTH_PROVIDER_16_002: [** The `constructor` shall start a timer that will automatically renew the token every (`tokenValidTimeInSeconds` - `tokenRenewalMarginInSeconds`) seconds if specified, or 45 minutes by default. **]**

**SRS_NODE_SAK_AUTH_PROVIDER_16_011: [** The `constructor` shall throw an `ArgumentError` if the `tokenRenewalMarginInSeconds` is less than or equal `tokenValidTimeInSeconds`. **]**

**SRS_NODE_SAK_AUTH_PROVIDER_13_001: [** The `constructor` shall save the supplied signature provider or create a `SharedAccessKeySignatureProvider` object instance by default. **]**

## getDeviceCredentials(callback: (err: Error, credentials: TransportConfig) => void): void

**SRS_NODE_SAK_AUTH_PROVIDER_16_003: [** The `getDeviceCredentials` should call its callback with a `null` first parameter and a `TransportConfig` object as a second parameter, containing the latest valid token it generated. **]**

## newTokenAvailable event

**SRS_NODE_SAK_AUTH_PROVIDER_16_005: [** Every time a new token is created, the `newTokenAvailable` event shall be fired with the updated credentials. **]**

## fromConnectionString(connectionString: string, tokenValidTimeInSeconds?, tokenRenewalMarginInSeconds?: number): SharedAccessKeyAuthenticationProvider [static]

**SRS_NODE_SAK_AUTH_PROVIDER_16_006: [** The `fromConnectionString` method shall throw a `ReferenceError` if the `connectionString` parameter is falsy. **]**

**SRS_NODE_SAK_AUTH_PROVIDER_16_007: [** The `fromConnectionString` method shall throw an `errors.ArgumentError` if the `connectionString` does not have a SharedAccessKey parameter. **]**

**SRS_NODE_SAK_AUTH_PROVIDER_16_008: [** The `fromConnectionString` method shall extract the credentials from the `connectionString` argument and create a new `SharedAccessKeyAuthenticationProvider` that uses these credentials to generate security tokens. **]**
