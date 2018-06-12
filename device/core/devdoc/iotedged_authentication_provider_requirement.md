# IotEdgeAuthenticationProvider Requirements

# Overview

The `IotEdgeAuthenticationProvider` class implements the `AuthenticationProvider` interface by delegating the token generation process to iotedged.

# Public API

# constructor(private _authConfig: EdgedAuthConfig, credentials: TransportConfig, tokenValidTimeInSeconds?: number, tokenRenewalMarginInSeconds?: number)

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_016: [** The `constructor` shall create the initial token value using the `credentials` parameter. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_017: [** The `constructor` shall throw an `ArgumentError` if the `tokenRenewalMarginInSeconds` is less than or equal `tokenValidTimeInSeconds`. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_018: [** The `constructor` shall start a timer that will automatically renew the token every (`tokenValidTimeInSeconds` - `tokenRenewalMarginInSeconds`) seconds if specified, or 45 minutes by default. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_001: [** The `constructor` shall throw a `ReferenceError` if the `_authConfig` parameter is falsy. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_002: [** The `constructor` shall throw a `ReferenceError` if the `_authConfig.workloadUri` field is falsy. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_003: [** The `constructor` shall throw a `ReferenceError` if the `_authConfig.moduleId` field is falsy. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_004: [** The `constructor` shall throw a `ReferenceError` if the `_authConfig.generationId` field is falsy. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_005: [** The `constructor` shall throw a `TypeError` if the `_authConfig.workloadUri` field is not a valid URI. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_006: [** The `constructor` shall build a unix domain socket path host if the workload URI protocol is `unix`. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_007: [** The `constructor` shall build a string host if the workload URI protocol is not `unix`. **]**

# public getTrustBundle(callback: (err?: Error, ca?: string) => void): void

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_020: [** The `getTrustBundle` method shall throw a ReferenceError if the callback parameter is falsy or is not a function. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_023: [** The `getTrustBundle` method shall set the HTTP request option's `request` property to use the `http.request` object. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_024: [** The `getTrustBundle` method shall set the HTTP request option's `port` property to use the workload URI's port if available. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_021: [** The `getTrustBundle` method shall invoke `this._restApiClient.executeApiCall` to make the REST call on iotedged using the GET method. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_022: [** The `getTrustBundle` method shall build the HTTP request path in the format `/trust-bundle?api-version=2018-06-28`. **]**

# _sign(resourceUri: string, expiry: number, callback: (err: Error, signature?: string) => void): void

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_009: [** The `_sign` method shall throw a `ReferenceError` if the `callback` parameter is falsy or is not a function. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_010: [** The `_sign` method invoke `callback` with a `ReferenceError` if the `resourceUri` parameter is falsy. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_011: [** The `_sign` method shall build the HTTP request path in the format `/modules/<module id>/genid/<generation id>/sign?api-version=2018-06-28`. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_025: [** The `_sign` method shall set the HTTP request option's `request` property to use the `http.request` object. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_026: [** The `_sign` method shall set the HTTP request option's `port` property to use the workload URI's port if available. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_027: [** The `_sign` method shall use the `SharedAccessSignature.createWithSigningFunction` function to build the data buffer which is to be signed by iotedged. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_019: [** The `_sign` method shall invoke `this._restApiClient.executeApiCall` to make the REST call on iotedged using the POST method. **]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_014: [** The `_sign` method shall build an object with the following schema as the HTTP request body as the sign request:

```typescript
interface SignRequest {
  keyId: string;
  algo: string;
  data: string;
}
```
**]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_013: [** The `_sign` method shall build the sign request using the following values:

```typescript
const signRequest = {
  keyId: "primary"
  algo: "HMACSHA256"
  data: `${data}\n${expiry}`
};
```
**]**

**SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_015: [** The `_sign` method shall invoke `callback` when the signature is available. **]**