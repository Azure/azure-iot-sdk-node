# Client requirements (Device client)

The `Client` class is the historical client object that is used by devices to connect to Azure IoT Hub and Azure IoT Edge. Modules use the `ModuleClient` class.

## Overview

```typescript
class Client extends InternalClient {
  uploadToBlob(blobName: string, stream: Stream, streamLength: number, done: (err?: Error) => void): void;
  on(type = 'message', msgHandler: (msg: Message) => void): void;

  static fromConnectionString(connStr: string, transportCtor: any): any;
  static fromSharedAccessSignature(sharedAccessSignature: string, transportCtor: any): any;
  static fromAuthenticationProvider(authenticationProvider: AuthenticationProvider, transportCtor: any): any;
}
```

## Public API

### fromConnectionString

**SRS_NODE_DEVICE_CLIENT_05_003: [** The `fromConnectionString` method shall throw ReferenceError if the connStr argument is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_05_006: [** The `fromConnectionString` method shall return a new instance of the `Client` object, as by a call to `new Client(new Transport(...))`. **]**

**SRS_NODE_DEVICE_CLIENT_16_087: [** The `fromConnectionString` method shall create a new `SharedAccessKeyAuthorizationProvider` object with the connection string passed as argument if it contains a SharedAccessKey parameter and pass this object to the transport constructor. **]**

**SRS_NODE_DEVICE_CLIENT_16_093: [** The `fromConnectionString` method shall create a new `X509AuthorizationProvider` object with the connection string passed as argument if it contains an X509 parameter and pass this object to the transport constructor. **]**

**SRS_NODE_DEVICE_CLIENT_16_094: [** The `fromConnectionString` method shall create a new `SharedAccessSignatureAuthenticationProvider` object with the connection string passed as argument if it contains a SharedAccessSignature parameter and pass this object to the transport constructor. **]**

### fromSharedAccessSignature

**SRS_NODE_DEVICE_CLIENT_16_029: [** The `fromSharedAccessSignature` method shall throw a `ReferenceError` if the sharedAccessSignature argument is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_030: [** The `fromSharedAccessSignature` method shall return a new instance of the `Client` object **]**

**SRS_NODE_DEVICE_CLIENT_16_088: [** The `fromSharedAccessSignature` method shall create a new `SharedAccessSignatureAuthorizationProvider` object with the shared access signature passed as argument, and pass this object to the transport constructor. **]**

### fromAuthenticationProvider

**SRS_NODE_DEVICE_CLIENT_16_089: [** The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `authenticationProvider` argument is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_092: [** The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `transportCtor` argument is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_090: [** The `fromAuthenticationProvider` method shall pass the `authenticationProvider` object passed as argument to the transport constructor. **]**

**SRS_NODE_DEVICE_CLIENT_16_091: [** The `fromAuthenticationProvider` method shall return a `Client` object configured with a new instance of a transport created using the `transportCtor` argument. **]**

### uploadToBlob(blobName, stream, done)

**SRS_NODE_DEVICE_CLIENT_16_037: [** The `uploadToBlob` method shall throw a `ReferenceError` if `blobName` is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_038: [** The `uploadToBlob` method shall throw a `ReferenceError` if `stream` is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_039: [** The `uploadToBlob` method shall throw a `ReferenceError` if `streamLength` is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_040: [** The `uploadToBlob` method shall call the `done` callback with an `Error` object if the upload fails. **]**

**SRS_NODE_DEVICE_CLIENT_16_041: [** The `uploadToBlob` method shall call the `done` callback no parameters if the upload succeeds. **]**


#### onDeviceMethod(methodName, callback)

The `onDeviceMethod` method's `callback` parameter is a function that is expected to conform to the signature of the interface `DeviceMethodEventHandler` as defined below (specified here using TypeScript syntax for expository purposes):

```
interface StringMap {
  [key: string]: string;
}

interface DeviceMethodRequest {
  methodName: string;
  properties: StringMap;
  body: Buffer;
}

interface DeviceMethodResponse {
  properties: StringMap;
  write(data: Buffer | string): void;
  end(status: number, done?: (err: any): void);
}

interface DeviceMethodEventHandler {
  (request: DeviceMethodRequest, response: DeviceMethodResponse): void;
}
```

**SRS_NODE_DEVICE_CLIENT_13_020: [** `onDeviceMethod` shall throw a `ReferenceError` if `methodName` is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_13_024: [** `onDeviceMethod` shall throw a `TypeError` if `methodName` is not a string. **]**

**SRS_NODE_DEVICE_CLIENT_13_022: [** `onDeviceMethod` shall throw a `ReferenceError` if `callback` is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_13_025: [** `onDeviceMethod` shall throw a `TypeError` if `callback` is not a `Function`. **]**

**SRS_NODE_DEVICE_CLIENT_13_001: [** The `onDeviceMethod` method shall cause the `callback` function to be invoked when a cloud-to-device *method* invocation signal is received from the IoT Hub service. **]**

**SRS_NODE_DEVICE_CLIENT_13_003: [** The client shall start listening for method calls from the service whenever there is a listener subscribed for a method callback. **]**

**SRS_NODE_DEVICE_CLIENT_13_023: [** `onDeviceMethod` shall throw an `Error` if a listener is already subscribed for a given method call. **]**

**SRS_NODE_DEVICE_CLIENT_13_021: [** `onDeviceMethod` shall throw a `NotImplementedErrorError` if the underlying transport does not support device methods. **]**

### on('message', messageHandler)

**SRS_NODE_DEVICE_CLIENT_16_002: [** The `message` event shall be emitted when a cloud-to-device message is received from the IoT Hub service. **]**

**SRS_NODE_DEVICE_CLIENT_16_003: [** The `message` event parameter shall be a `message` object. **]**

**SRS_NODE_DEVICE_CLIENT_16_004: [** The client shall start listening for messages from the service whenever there is a listener subscribed to the `message` event. **]**

**SRS_NODE_DEVICE_CLIENT_16_005: [** The client shall stop listening for messages from the service whenever the last listener unsubscribes from the `message` event. **]**

### on('disconnect', disconnectHandler)

**SRS_NODE_DEVICE_CLIENT_16_102: [** If the retry policy fails to reestablish the C2D functionality a `disconnect` event shall be emitted with a `results.Disconnected` object. **]**

**SRS_NODE_DEVICE_CLIENT_16_097: [** If the transport emits a `disconnect` event event while the client is subscribed to c2d messages the retry policy shall be used to reconnect and re-enable the feature using the transport `enableC2D` method. **]**

# on('disconnect') transport event

**SRS_NODE_DEVICE_CLIENT_16_098: [** If the transport emits a `disconnect` event while the client is subscribed to direct methods the retry policy shall be used to reconnect and re-enable the feature using the transport `enableMethods` method. **]**

**SRS_NODE_DEVICE_CLIENT_16_100: [** If the retry policy fails to reestablish the direct methods functionality a `disconnect` event shall be emitted with a `results.Disconnected` object. **]**
