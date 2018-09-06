# Amqp/AmqpWs Requirements (Device SDK)


## Overview
`Amqp` provides transport functionality for devices that want to communicate with an Azure IoT Hub using the AMQP protocol. It provides an additional level of abstraction on top of the common Amqp class (`azure-iot-common.Amqp`) which is not specific to the device or service.
Based on the configuration parameters given to the constructor, the Amqp object will build the URL used to communicate with the IoT Hub instance, as well as the sending and receiving endpoints, and will instantiate a base Amqp object to use with these parameters.
AmqpWs works exactly the same way and provides AMQP transport over websockets. Requirements are the same.

Note that the `Amqp` class now implements what used to be `AmqpReceiver` and as such some of the requirements have transferred over and have been kept mostly intact.

## Example usage
```js
'use strict';
var Amqp = require('azure-iot-device-amqp').Amqp;
var Message = require('azure-iot-common').Message;

function print(err, res) {
  if (err) console.log(err.toString());
  if (res) console.log(res.statusCode + ' ' + res.statusMessage);
}

var config = {
  host: '<hostname>',
  deviceId: '<device-id>',
  sharedAccessSignature: '<shared-access-signature>'
};

var amqp = new Amqp(config);

amqp.sendEvent(new Message('hello world'), print);

// deprecated:
amqp.getReceiver(function (receiver) {
  receiver.on('message', function (msg) {
    devAmqp.sendFeedback('complete', msg.lockToken, print);
  });
  receiver.on('errorReceived', function (err) {
    print(err);
  });
});

// better way (for now):
amqp.on('message', function (msg) {
  devAmqp.sendFeedback('complete', msg.lockToken, print);
});
amqp.on('errorReceived', function (err) {
  print(err);
});
```

## Public Interface
### Amqp constructor

**SRS_NODE_DEVICE_AMQP_16_056: [** If the `authenticationProvider` object passed to the `Amqp` constructor has a `type` property which value is set to `AuthenticationType.Token` the `Amqp` constructor shall subscribe to the `newTokenAvailable` event of the `authenticationProvider` object. **]**

**SRS_NODE_DEVICE_AMQP_RECEIVER_16_001: [** The `Amqp` constructor shall implement the `Receiver` object. **]**

**SRS_NODE_DEVICE_AMQP_RECEIVER_16_002: [** The `Amqp` object shall inherit from the `EventEmitter` node object. **]**

**SRS_NODE_DEVICE_AMQP_16_057: [** If a `newTokenAvailable` event is emitted by the `authenticationProvider` object passed as an argument to the constructor, a `putToken` operation shall be initiated with the new shared access signature if the amqp connection is already connected. **]**

**SRS_NODE_DEVICE_AMQP_16_058: [** If the `putToken` operation initiated upon receiving a `newTokenAvailable` event fails, a `disconnect` event shall be emitted with the error from the failed `putToken` operation. **]**

### connect(done)
The `connect` method establishes a connection with the Azure IoT Hub instance.

**SRS_NODE_DEVICE_AMQP_16_054: [** The `connect` method shall get the current credentials by calling `getDeviceCredentials` on the `AuthenticationProvider` object passed to the constructor as an argument. **]**

**SRS_NODE_DEVICE_AMQP_16_055: [** The `connect` method shall call its callback with an error if the callback passed to the `getDeviceCredentials` method is called with an error. **]**

**SRS_NODE_DEVICE_AMQP_16_008: [**The `done` callback method passed in argument shall be called if the connection is established and authenticated. **]**

**SRS_NODE_DEVICE_AMQP_16_009: [**The `done` callback method passed in argument shall be called with an error object if the connection or authentication fails. **]**

**SRS_NODE_DEVICE_AMQP_06_005: [** If x509 authentication is NOT being utilized then `initializeCBS` shall be invoked. **]**

**SRS_NODE_DEVICE_AMQP_06_008: [** If `initializeCBS` is not successful then the client will remain disconnected and the callback will be called with an error per SRS_NODE_DEVICE_AMQP_16_009. **]**

**SRS_NODE_DEVICE_AMQP_06_006: [**If `initializeCBS` is successful, `putToken` shall be invoked with the first parameter `audience`, created from the `sr` field of the shared access signature, the actual shared access signature, and a callback. **]**

**SRS_NODE_DEVICE_AMQP_06_009: [** If `putToken` is not successful then the client will remain disconnected and the callback will be called with an error per SRS_NODE_DEVICE_AMQP_16_009. **]**

**SRS_NODE_DEVICE_AMQP_13_002: [** The `connect` method shall set the CA cert on the options object when calling the underlying connection object's connect method if it was supplied. **]**

### disconnect(done)
The `disconnect` method terminates the connection with the Azure IoT Hub instance.

**SRS_NODE_DEVICE_AMQP_16_010: [**The `done` callback method passed in argument shall be called when disconnected. **]**

**SRS_NODE_DEVICE_AMQP_16_011: [**The `done` callback method passed in argument shall be called with an error object if disconnecting fails. **]**

**SRS_NODE_DEVICE_AMQP_16_022: [** The `disconnect` method shall detach all attached links. **]**

**SRS_NODE_DEVICE_AMQP_16_023: [** The `disconnect` method shall forcefully detach all attached links if a connection error is the causing the transport to be disconnected. **]**

**SRS_NODE_DEVICE_AMQP_16_083: [** When the `amqp` client is disconnected and if token-based authentication is used the `stop` method of the `AuthenticationProvider` shall be called. **]**

### sendEvent(message, done)

The `sendEvent` method sends an event to the IoT Hub as the device indicated in the constructor argument.

**SRS_NODE_DEVICE_AMQP_16_024: [** The `sendEvent` method shall connect and authenticate the transport if necessary. **]**

**SRS_NODE_DEVICE_AMQP_16_025: [** The `sendEvent` method shall create and attach the d2c link if necessary. **]**

**SRS_NODE_DEVICE_AMQP_16_002: [**The `sendEvent` method shall construct an AMQP request using the message passed in argument as the body of the message.**]**

**SRS_NODE_DEVICE_AMQP_16_003: [**The `sendEvent` method shall call the `done` callback with a null error object and a MessageEnqueued result object when the message has been successfully sent.**]**

**SRS_NODE_DEVICE_AMQP_16_004: [**If `sendEvent` encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message). **]**

### sendEventBatch(messages, done)

**SRS_NODE_DEVICE_AMQP_16_052: [** The `sendEventBatch` method shall throw a `NotImplementedError`. **]**

### sendOutputEvent(outputName: string, message: Message, done: (err?: Error, result?: results.MessageEnqueued) => void): void;
The `sendOutputEvent` method sends an event to the IoT Hub as the device indicated in the constructor argument.

**SRS_NODE_DEVICE_AMQP_18_005: [** The `sendOutputEvent` method shall connect and authenticate the transport if necessary. **]**

**SRS_NODE_DEVICE_AMQP_18_006: [** The `sendOutputEvent` method shall create and attach the d2c link if necessary. **]**

**SRS_NODE_DEVICE_AMQP_18_007: [** The `sendOutputEvent` method shall construct an AMQP request using the message passed in argument as the body of the message. **]**

**SRS_NODE_DEVICE_AMQP_18_012: [** The `sendOutputEvent` method  shall set the application property "iothub-outputname" on the message to the `outputName`. **]**

**SRS_NODE_DEVICE_AMQP_18_008: [** The `sendOutputEvent` method shall call the `done` callback with a null error object and a MessageEnqueued result object when the message has been successfully sent. **]**

**SRS_NODE_DEVICE_AMQP_18_009: [** If `sendOutputEvent` encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message). **]**

### sendOutputEventBatch(outputName: string, messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void;

**SRS_NODE_DEVICE_AMQP_18_004: [** `sendOutputEventBatch` shall throw a `NotImplementedError`. **]**

### getReceiver(done) [deprecated]
This method is deprecated. The `AmqpReceiver` object and pattern is going away and the `Amqp` object now implements the `Receiver` interface until we can completely get rid of it in the device client.

**SRS_NODE_DEVICE_AMQP_16_021: [** The `getReceiver` method shall call the `done` callback with a first argument that is `null` and a second argument that it `this`, ie the current `Amqp` instance. **]**

### setOptions(options, done)

**SRS_NODE_DEVICE_AMQP_06_001: [** The setOptions method shall throw a ReferenceError if the options parameter has not been supplied. **]**

**SRS_NODE_DEVICE_AMQP_06_002: [** If `done` has been specified the `setOptions` method shall call the `done` callback with no arguments.**]**

**SRS_NODE_DEVICE_AMQP_06_003: [** `setOptions` should not throw if `done` has not been specified.**]**

**SRS_NODE_DEVICE_AMQP_06_004: [** The AMQP transport should use the x509 settings passed in the `options` object to connect to the service if present.**]**

**SRS_NODE_DEVICE_AMQP_16_053: [** The `setOptions` method shall throw an `InvalidOperationError` if the method is called while using token-based authentication. **]**

**SRS_NODE_DEVICE_AMQP_13_001: [** The `setOptions` method shall save the options passed in. **]**

### abandon(message, done)

**SRS_NODE_DEVICE_AMQP_16_012: [**The `abandon` method shall call the ‘abandon’ method of the C2D `ReceiverLink` object and pass it the `message` and the callback given as parameters.**]**

### complete(message, done)

**SRS_NODE_DEVICE_AMQP_16_013: [**The `complete` method shall call the ‘complete’ method of the C2D `ReceiverLink` object and pass it the message and the callback given as parameters.**]**

### reject(message, done)

**SRS_NODE_DEVICE_AMQP_16_014: [**The `reject` method shall call the ‘reject’ method of the C2D `ReceiverLink` object and pass it the message and the callback given as parameters.**]**

### updateSharedAccessSignature(sharedAccessSignature, done)

**SRS_NODE_DEVICE_AMQP_16_015: [**The `updateSharedAccessSignature` method shall save the new shared access signature given as a parameter to its configuration.**]**

**SRS_NODE_DEVICE_AMQP_06_010: [** If the AMQP connection is established, the `updateSharedAccessSignature` method shall call the amqp transport `putToken` method with the first parameter `audience`, created from the `sr` of the shared access signature, the actual shared access signature, and a callback. **]**

**SRS_NODE_DEVICE_AMQP_06_011: [** The `updateSharedAccessSignature` method shall call the `done` callback with a `null` error object and a `SharedAccessSignatureUpdated` object as a result, with the `needToReconnect` property set to `false`. **]**

### sendMethodResponse(methodResponse, callback)

**SRS_NODE_DEVICE_AMQP_16_019: [** The `sendMethodResponse` shall throw a `ReferenceError` if the `methodResponse` object is falsy. **]**

**SRS_NODE_DEVICE_AMQP_16_020: [** The `sendMethodResponse` response shall call the `AmqpDeviceMethodClient.sendMethodResponse` method with the arguments that were given to it. **]**

### onDeviceMethod(methodName, methodCallback)

**SRS_NODE_DEVICE_AMQP_RECEIVER_16_007: [** The `onDeviceMethod` method shall forward the `methodName` and `methodCallback` arguments to the underlying `AmqpDeviceMethodClient` object. **]**

### enableC2D(callback)

**SRS_NODE_DEVICE_AMQP_16_031: [** The `enableC2D` method shall connect and authenticate the transport if it is disconnected. **]**

**SRS_NODE_DEVICE_AMQP_16_032: [** The `enableC2D` method shall attach the C2D link and call its `callback` once it is successfully attached. **]**

**SRS_NODE_DEVICE_AMQP_16_033: [** The `enableC2D` method shall call its `callback` with an `Error` if the transport fails to connect, authenticate or attach link. **]**

**SRS_NODE_DEVICE_AMQP_16_034: [** Any `error` event received on the C2D link shall trigger the emission of an `error` event by the transport, with an argument that is a `CloudToDeviceDetachedError` object with the `innerError` property set to that error. **]**

### disableC2D(callback)

**SRS_NODE_DEVICE_AMQP_16_035: [** The `disableC2D` method shall call `detach` on the C2D link and call its callback when it is successfully detached. **]**

**SRS_NODE_DEVICE_AMQP_16_036: [** The `disableC2D` method shall call its `callback` with an `Error` if it fails to detach the C2D link. **]**

**SRS_NODE_DEVICE_AMQP_16_037: [** The `disableC2D` method shall call its `callback` immediately if the transport is already disconnected. **]**

### enableInputMessages(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_AMQP_18_010: [** The `enableInputMessages` method shall enable C2D messages **]**

### disableInputMessages(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_AMQP_18_011: [** The `disableInputMessages` method shall disable C2D messages **]**

### enableMethods(callback)

**SRS_NODE_DEVICE_AMQP_16_038: [** The `enableMethods` method shall connect and authenticate the transport if it is disconnected. **]**

**SRS_NODE_DEVICE_AMQP_16_039: [** The `enableMethods` method shall attach the method links and call its `callback` once these are successfully attached. **]**

**SRS_NODE_DEVICE_AMQP_16_040: [** The `enableMethods` method shall call its `callback` with an `Error` if the transport fails to connect, authenticate or attach method links. **]**

**SRS_NODE_DEVICE_AMQP_16_041: [** Any `error` event received on any of the links used for device methods shall trigger the emission of an `error` event by the transport, with an argument that is a `MethodsDetachedError` object with the `innerError` property set to that error. **]**

### disableMethods(callback)

**SRS_NODE_DEVICE_AMQP_16_042: [** The `disableMethods` method shall call `detach` on the device method links and call its callback when these are successfully detached. **]**

**SRS_NODE_DEVICE_AMQP_16_043: [** The `disableMethods` method shall call its `callback` with an `Error` if it fails to detach the device method links. **]**

**SRS_NODE_DEVICE_AMQP_16_044: [** The `disableMethods` method shall call its `callback` immediately if the transport is already disconnected. **]**


### getTwin(callback: (err?: Error, twin?: TwinProperties) => void): void;

**SRS_NODE_DEVICE_AMQP_16_059: [** The `getTwin` method shall connect and authenticate the transport if it is disconnected. **]**

**SRS_NODE_DEVICE_AMQP_16_060: [** The `getTwin` method shall call its callback with an error if connecting fails. **]**

**SRS_NODE_DEVICE_AMQP_16_061: [** The `getTwin` method shall call its callback with an error if authenticating fails. **]**

**SRS_NODE_DEVICE_AMQP_16_062: [** The `getTwin` method shall call the `getTwin` method on the `AmqpTwinClient` instance created by the constructor. **]**

**SRS_NODE_DEVICE_AMQP_16_063: [** The `getTwin` method shall call its callback with and error if the call to `AmqpTwinClient.getTwin` fails. **]**

**SRS_NODE_DEVICE_AMQP_16_064: [** The `getTwin` method shall call its callback with a `null` error parameter and the result of the `AmqpTwinClient.getTwin` method if it succeeds. **]**


### updateTwinReportedProperties(patch: any, callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_AMQP_16_065: [** The `updateTwinReportedProperties` method shall connect and authenticate the transport if it is disconnected. **]**

**SRS_NODE_DEVICE_AMQP_16_066: [** The `updateTwinReportedProperties` method shall call its callback with an error if connecting fails. **]**

**SRS_NODE_DEVICE_AMQP_16_067: [** The `updateTwinReportedProperties` method shall call its callback with an error if authenticating fails. **]**

**SRS_NODE_DEVICE_AMQP_16_068: [** The `updateTwinReportedProperties` method shall call the `updateTwinReportedProperties` method on the `AmqpTwinClient` instance created by the constructor. **]**

**SRS_NODE_DEVICE_AMQP_16_069: [** The `updateTwinReportedProperties` method shall call its callback with and error if the call to `AmqpTwinClient.updateTwinReportedProperties` fails. **]**

**SRS_NODE_DEVICE_AMQP_16_070: [** The `updateTwinReportedProperties` method shall call its callback with a `null` error parameter and the result of the `AmqpTwinClient.updateTwinReportedProperties` method if it succeeds. **]**

### enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_AMQP_16_071: [** The `enableTwinDesiredPropertiesUpdates` method shall connect and authenticate the transport if it is disconnected. **]**

**SRS_NODE_DEVICE_AMQP_16_072: [** The `enableTwinDesiredPropertiesUpdates` method shall call its callback with an error if connecting fails. **]**

**SRS_NODE_DEVICE_AMQP_16_073: [** The `enableTwinDesiredPropertiesUpdates` method shall call its callback with an error if authenticating fails. **]**

**SRS_NODE_DEVICE_AMQP_16_074: [** The `enableTwinDesiredPropertiesUpdates` method shall call the `enableTwinDesiredPropertiesUpdates` method on the `AmqpTwinClient` instance created by the constructor. **]**

**SRS_NODE_DEVICE_AMQP_16_075: [** The `enableTwinDesiredPropertiesUpdates` method shall call its callback with and error if the call to `AmqpTwinClient.enableTwinDesiredPropertiesUpdates` fails. **]**

**SRS_NODE_DEVICE_AMQP_16_076: [** The `enableTwinDesiredPropertiesUpdates` method shall call its callback with no arguments if the call to `AmqpTwinClient.enableTwinDesiredPropertiesUpdates` succeeds. **]**

### disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_AMQP_16_077: [** The `disableTwinDesiredPropertiesUpdates` method shall call the `disableTwinDesiredPropertiesUpdates` method on the `AmqpTwinClient` instance created by the constructor. **]**

**SRS_NODE_DEVICE_AMQP_16_078: [** The `disableTwinDesiredPropertiesUpdates` method shall call its callback with and error if the call to `AmqpTwinClient.disableTwinDesiredPropertiesUpdates` fails. **]**

**SRS_NODE_DEVICE_AMQP_16_079: [** The `disableTwinDesiredPropertiesUpdates` method shall call its callback no arguments if the call to `AmqpTwinClient.disableTwinDesiredPropertiesUpdates` succeeds. **]**

### Errors

**SRS_NODE_DEVICE_AMQP_16_080: [** if the handler specified in the `setDisconnectHandler` call is called while the `Amqp` object is disconnected, the call shall be ignored. **]**

**SRS_NODE_DEVICE_AMQP_16_081: [** if the handler specified in the `setDisconnectHandler` call is called while the `Amqp` object is connecting or authenticating, the connection shall be stopped and an `disconnect` event shall be emitted with the error translated to a transport-agnostic error. **]**

**SRS_NODE_DEVICE_AMQP_16_082: [** if the handler specified in the `setDisconnectHandler` call is called while the `Amqp` object is connected, the connection shall be disconnected and an `disconnect` event shall be emitted with the error translated to a transport-agnostic error. **]**


### message events

**SRS_NODE_DEVICE_AMQP_18_013: [** If `amqp` receives a message on the C2D link, it shall emit a "message" event with the message as the event parameter. **]**

### inputMessage events

**SRS_NODE_DEVICE_AMQP_18_014: [** If `amqp` receives a message on the input message link, it shall emit an "inputMessage" event with the value of the annotation property "x-opt-input-name" as the first parameter and the agnostic message as the second parameter. **]**

