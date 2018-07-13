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

**SRS_NODE_SAK_AUTH_PROVIDER_16_011: [** The `constructor` shall throw an `ArgumentError` if the `tokenRenewalMarginInSeconds` is less than or equal `tokenValidTimeInSeconds`. **]**

## getDeviceCredentials(callback: (err: Error, credentials: TransportConfig) => void): void

**SRS_NODE_SAK_AUTH_PROVIDER_16_002: [** The `getDeviceCredentials` method shall start a timer that will automatically renew the token every (`tokenValidTimeInSeconds` - `tokenRenewalMarginInSeconds`) seconds if specified, or 45 minutes by default. **]**

**SRS_NODE_SAK_AUTH_PROVIDER_16_003: [** The `getDeviceCredentials` should call its callback with a `null` first parameter and a `TransportConfig` object as a second parameter, containing the latest valid token it generated. **]**

## newTokenAvailable event

**SRS_NODE_SAK_AUTH_PROVIDER_16_005: [** Every time a new token is created, the `newTokenAvailable` event shall be fired with the updated credentials. **]**

## fromConnectionString(connectionString: string, tokenValidTimeInSeconds?, tokenRenewalMarginInSeconds?: number): SharedAccessKeyAuthenticationProvider [static]

**SRS_NODE_SAK_AUTH_PROVIDER_16_006: [** The `fromConnectionString` method shall throw a `ReferenceError` if the `connectionString` parameter is falsy. **]**

**SRS_NODE_SAK_AUTH_PROVIDER_16_007: [** The `fromConnectionString` method shall throw an `errors.ArgumentError` if the `connectionString` does not have a SharedAccessKey parameter. **]**

**SRS_NODE_SAK_AUTH_PROVIDER_16_008: [** The `fromConnectionString` method shall extract the credentials from the `connectionString` argument and create a new `SharedAccessKeyAuthenticationProvider` that uses these credentials to generate security tokens. **]**

## stop(): void

**SRS_NODE_SAK_AUTH_PROVIDER_16_012: [** The `stop` method shall clear the token renewal timer if it is running. **]**

**SRS_NODE_SAK_AUTH_PROVIDER_16_013: [** The `stop` method shall simply return if the token renewal timer is not running. **]**

# Generated Security Token

**SRS_NODE_SAK_AUTH_PROVIDER_16_009: [** Every token shall be created with a validity period of `tokenValidTimeInSeconds` if specified when the constructor was called, or 1 hour by default. **]**

**SRS_NODE_SAK_AUTH_PROVIDER_16_010: [** Every token shall be created using the `azure-iot-common.SharedAccessSignature.create` method and then serialized as a string, with the arguments to the create methods being:
```
resourceUri: <IoT hub host>/devices/<deviceId>
keyName: the `SharedAccessKeyName` parameter of the connection string or `null`
key: the `SharedAccessKey` parameter of the connection string
expiry: the expiration time of the token, which is now + the token validity time, formatted as the number of seconds since Epoch (Jan 1st, 1970, 00:00 UTC).
```
**]**
