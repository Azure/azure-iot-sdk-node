# DirectMethodClient requirements

The `DirectMethodClient` class is in charge of making edgeHub method API calls. It is a private class that shall be used by the `ModuleClient` to make method calls and the SDK user should only use the `ModuleClient` object.

## Overview
```typescript
export class DirectMethodClient {
  constructor(authProvider: AuthenticationProvider);
  invokeMethod(deviceId: string, moduleId: string, methodParams: DirectMethodParams, callback: DirectMethodCallback): void;
  setOptions(options: any): void;
  updateSharedAccessSignature(sharedAccessSignature: string, callback: (err?: Error) => void): void;
}
```

## API
*Note: this API is internal only and is used solely by the `ModuleClient` object.*

### invokeMethod(deviceId: string, moduleId: string, methodParams: DirectMethodParams, callback: DirectMethodCallback): void

**SRS_NODE_DEVICE_METHOD_CLIENT_16_006: [** The `invokeMethod` method shall get the latest credentials by calling `getDeviceCredentials` on the `AuthenticationProvider` object. **]**

**SRS_NODE_DEVICE_METHOD_CLIENT_16_007: [** The `invokeMethod` method shall create a `RestApiClient` object if it does not exist. **]**

**SRS_NODE_DEVICE_METHOD_CLIENT_16_015: [** The `invokeMethod` method shall update the shared access signature of the `RestApiClient` by using its `updateSharedAccessSignature` method and the credentials obtained with the call to `getDeviceCredentials` (see `SRS_NODE_DEVICE_METHOD_CLIENT_16_006`). **]**

**SRS_NODE_DEVICE_METHOD_CLIENT_16_008: [** The `invokeMethod` method shall call its callback with an `Error` if it fails to get the latest credentials from the `AuthenticationProvider` object. **]**

**SRS_NODE_DEVICE_METHOD_CLIENT_16_009: [** The `invokeMethod` method shall call the `setOptions` method on the `RestApiClient` with its options as argument to make sure the CA certificate is populated. **]**

**SRS_NODE_DEVICE_METHOD_CLIENT_16_010: [** The `invokeMethod` method shall construct the HTTP request path as `/twins/encodeUriComponentStrict(<targetDeviceId>)/methods` if the target is a device. **]**

**SRS_NODE_DEVICE_METHOD_CLIENT_16_011: [** The `invokeMethod` method shall construct the HTTP request path as `/twins/encodeUriComponentStrict(<targetDeviceId>)/modules/encodeUriComponentStrict(<targetModuleId>)/methods` if the target is a module. **]**

**SRS_NODE_DEVICE_METHOD_CLIENT_16_012: [** The `invokeMethod` method shall call `RestApiClient.executeApiCall` with:
- `POST` for the HTTP method argument.
- `path` as defined in `SRS_NODE_DEVICE_METHOD_CLIENT_16_010` and `SRS_NODE_DEVICE_METHOD_CLIENT_16_011`
- 2 custom headers:
  - `Content-Type` shall be set to `application/json`
  - `x-ms-edge-moduleId` shall be set to `<deviceId>/<moduleId>` with `deviceId` and `moduleId` being the identifiers for the current module (as opposed to the target module)
- the stringified version of the `MethodParams` object as the body of the request
- a timeout value in milliseconds that is the sum of the `connectTimeoutInSeconds` and `responseTimeoutInSeconds` parameters of the `MethodParams` object. **]**

**SRS_NODE_DEVICE_METHOD_CLIENT_16_013: [** The `invokeMethod` method shall call its callback with an error if `RestApiClient.executeApiCall` fails. **]**

**SRS_NODE_DEVICE_METHOD_CLIENT_16_014: [** The `invokeMethod` method shall call its callback with the result object if the call to `RestApiClient.executeApiCall` succeeds. **]**

### setOptions(options: any): void

**SRS_NODE_DEVICE_METHOD_CLIENT_16_001: [** The `setOptions` method shall merge the options passed in argument with the existing set of options used by the `MethodClient`. **]**
