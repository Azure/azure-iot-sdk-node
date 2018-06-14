# ModuleClient requirements

The `ModuleClient` class is used to connect modules to Azure IoT Hub and Azure Edge hub. Devices use the `Client` class.

## Overview

```typescript
class ModuleClient extends InternalClient {
  sendOutputEvent(outputName: string, message: Message, callback: (err?: Error, result?: results.MessageEnqueued) => void): void;
  sendOutputEventBatch(outputName: string, messages: Message[], callback: (err?: Error, result?: results.MessageEnqueued) => void): void;
  on(type = 'inputMessage', msgHandler: (msg: Message) => void): void;

  static fromConnectionString(connStr: string, transportCtor: any): any;
  static fromSharedAccessSignature(sharedAccessSignature: string, transportCtor: any): any;
  static fromAuthenticationProvider(authenticationProvider: AuthenticationProvider, transportCtor: any):
}
```

## Public API

### fromConnectionString

**SRS_NODE_MODULE_CLIENT_05_003: [** The `fromConnectionString` method shall throw ReferenceError if the connStr argument is falsy. **]**

**SRS_NODE_MODULE_CLIENT_05_006: [** The `fromConnectionString` method shall return a new instance of the `Client` object, as by a call to `new Client(new Transport(...))`. **]**

**SRS_NODE_MODULE_CLIENT_16_087: [** The `fromConnectionString` method shall create a new `SharedAccessKeyAuthorizationProvider` object with the connection string passed as argument if it contains a SharedAccessKey parameter and pass this object to the transport constructor. **]**

**SRS_NODE_MODULE_CLIENT_16_001: [** The `fromConnectionString` method shall throw a `NotImplementedError` if the connection string does not contain a `SharedAccessKey` field because x509 authentication is not supported yet for modules. **]**

### fromSharedAccessSignature

**SRS_NODE_MODULE_CLIENT_16_029: [** The `fromSharedAccessSignature` method shall throw a `ReferenceError` if the sharedAccessSignature argument is falsy. **]**

**SRS_NODE_MODULE_CLIENT_16_030: [** The `fromSharedAccessSignature` method shall return a new instance of the `Client` object **]**

**SRS_NODE_MODULE_CLIENT_16_088: [** The `fromSharedAccessSignature` method shall create a new `SharedAccessSignatureAuthorizationProvider` object with the shared access signature passed as argument, and pass this object to the transport constructor. **]**

### fromAuthenticationProvider

**SRS_NODE_MODULE_CLIENT_16_089: [** The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `authenticationProvider` argument is falsy. **]**

**SRS_NODE_MODULE_CLIENT_16_092: [** The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `transportCtor` argument is falsy. **]**

**SRS_NODE_MODULE_CLIENT_16_090: [** The `fromAuthenticationProvider` method shall pass the `authenticationProvider` object passed as argument to the transport constructor. **]**

**SRS_NODE_MODULE_CLIENT_16_091: [** The `fromAuthenticationProvider` method shall return a `Client` object configured with a new instance of a transport created using the `transportCtor` argument. **]**

#### fromEnvironment

**SRS_NODE_MODULE_CLIENT_13_033: [** The `fromEnvironment` method shall throw a `ReferenceError` if the `callback` argument is falsy or is not a function. **]**

**SRS_NODE_MODULE_CLIENT_13_026: [** The `fromEnvironment` method shall invoke callback with a `ReferenceError` if the `transportCtor` argument is falsy. **]**

**SRS_NODE_MODULE_CLIENT_13_028: [** The `fromEnvironment` method shall delegate to `ModuleClient.fromConnectionString` if an environment variable called `EdgeHubConnectionString` or `IotHubConnectionString` exists. **]**

**SRS_NODE_MODULE_CLIENT_13_034: [** If the client is running in a non-edge mode and an environment variable named `EdgeModuleCACertificateFile` exists then its value shall be set as the CA cert for the transport via the transport's `setOptions` method passing in the CA as the value for the `ca` property in the options object. **]**

**SRS_NODE_MODULE_CLIENT_13_035: [** If the client is running in edge mode then the `IotEdgeAuthenticationProvider.getTrustBundle` method shall be invoked to retrieve the CA cert and the returned value shall be set as the CA cert for the transport via the transport's `setOptions` method passing in the CA value for the `ca` property in the options object. **]**

**SRS_NODE_MODULE_CLIENT_13_029: [** If environment variables `EdgeHubConnectionString` and `IotHubConnectionString` do not exist then the following environment variables must be defined: `IOTEDGE_WORKLOADURI`, `IOTEDGE_DEVICEID`, `IOTEDGE_MODULEID`, `IOTEDGE_IOTHUBHOSTNAME`, `IOTEDGE_AUTHSCHEME` and `IOTEDGE_MODULEGENERATIONID`. **]**

**SRS_NODE_MODULE_CLIENT_13_030: [** The value for the environment variable `IOTEDGE_AUTHSCHEME` must be `sasToken`. **]**

**SRS_NODE_MODULE_CLIENT_13_031: [** The `fromEnvironment` method shall invoke the callback with a new instance of the `ModuleClient` object. **]**

**SRS_NODE_MODULE_CLIENT_13_032: [** The `fromEnvironment` method shall create a new `IotEdgeAuthenticationProvider` object and pass this to the transport constructor. **]**

### sendOutputEvent(outputName: string, message: Message, callback: (err?: Error, result?: results.MessageEnqueued) => void): void;

**SRS_NODE_MODULE_CLIENT_18_010: [** The `sendOutputEvent` method shall send the event indicated by the `message` argument via the transport associated with the Client instance. **]**

**SRS_NODE_MODULE_CLIENT_18_018: [** When the `sendOutputEvent` method completes, the `callback` function shall be invoked with the same arguments as the underlying transport method's callback. **]**

**SRS_NODE_MODULE_CLIENT_18_019: [** The `sendOutputEvent` method shall not throw if the `callback` is not passed. **]**

### sendOutputEventBatch(outputName: string, messages: Message[], callback: (err?: Error, result?: results.MessageEnqueued) => void): void

**SRS_NODE_MODULE_CLIENT_18_011: [** The `sendOutputEventBatch` method shall send the list of events (indicated by the `messages` argument) via the transport associated with the Client instance. **]**

**SRS_NODE_MODULE_CLIENT_18_021: [** When the `sendOutputEventBatch` method completes the `callback` function shall be invoked with the same arguments as the underlying transport method's callback. **]**

**SRS_NODE_MODULE_CLIENT_18_022: [** The `sendOutputEventBatch` method shall not throw if the `callback` is not passed. **]**


**SRS_NODE_MODULE_CLIENT_16_096: [** The `setRetryPolicy` method shall call the `setRetryPolicy` method on the twin if it is set and pass it the `policy` object. **]**

### on('inputMessage', msgHandler)

**SRS_NODE_MODULE_CLIENT_18_012: [** The `inputMessage` event shall be emitted when an inputMessage is received from the IoT Hub service. **]**

**SRS_NODE_MODULE_CLIENT_18_013: [** The `inputMessage` event parameters shall be the inputName for the message and a `Message` object. **]**

**SRS_NODE_MODULE_CLIENT_18_014: [** The client shall start listening for messages from the service whenever there is a listener subscribed to the `inputMessage` event. **]**

**SRS_NODE_MODULE_CLIENT_18_015: [** The client shall stop listening for messages from the service whenever the last listener unsubscribes from the `inputMessage` event. **]**

**SRS_NODE_MODULE_CLIENT_18_016: [** The client shall connect the transport if needed in order to receive inputMessages. **]**

**SRS_NODE_MODULE_CLIENT_18_017: [** The client shall emit an `error` if connecting the transport fails while subscribing to `inputMessage` events. **]**

**SRS_NODE_MODULE_CLIENT_16_097: [** The client shall emit an `error` if connecting the transport fails while unsubscribing to `inputMessage` events. **]**