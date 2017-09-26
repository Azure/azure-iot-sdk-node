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

**SRS_NODE_DEVICE_AMQP_16_001: [**The Amqp constructor shall accept a config object with four properties:
`host` – (string) the fully-qualified DNS hostname of an IoT Hub
`hubName` - (string) the name of the IoT Hub instance (without suffix such as .azure-devices.net)
`deviceId` – (string) the identifier of a device registered with the IoT Hub
`sharedAccessSignature` – (string) the shared access signature associated with the device registration.**]**

**SRS_NODE_DEVICE_AMQP_RECEIVER_16_001: [** The `Amqp` constructor shall implement the `Receiver` object. **]**

**SRS_NODE_DEVICE_AMQP_RECEIVER_16_002: [** The `Amqp` object shall inherit from the `EventEmitter` node object. **]**

### connect(done)
The `connect` method establishes a connection with the Azure IoT Hub instance.

**SRS_NODE_DEVICE_AMQP_16_008: [**The `done` callback method passed in argument shall be called if the connection is established and authenticated. **]**

**SRS_NODE_DEVICE_AMQP_16_009: [**The `done` callback method passed in argument shall be called with an error object if the connection or authentication fails. **]**

**SRS_NODE_DEVICE_AMQP_06_005: [** If x509 authentication is NOT being utilized then `initializeCBS` shall be invoked. **]**

**SRS_NODE_DEVICE_AMQP_06_008: [** If `initializeCBS` is not successful then the client will remain disconnected and the callback will be called with an error per SRS_NODE_DEVICE_AMQP_16_009. **]**

**SRS_NODE_DEVICE_AMQP_06_006: [**If `initializeCBS` is successful, `putToken` shall be invoked with the first parameter `audience`, created from the `sr` field of the shared access signature, the actual shared access signature, and a callback. **]**

**SRS_NODE_DEVICE_AMQP_06_009: [** If `putToken` is not successful then the client will remain disconnected and the callback will be called with an error per SRS_NODE_DEVICE_AMQP_16_009. **]**

### disconnect(done)
The `disconnect` method terminates the connection with the Azure IoT Hub instance.

**SRS_NODE_DEVICE_AMQP_16_010: [**The `done` callback method passed in argument shall be called when disconnected. **]**

**SRS_NODE_DEVICE_AMQP_16_011: [**The `done` callback method passed in argument shall be called with an error object if disconnecting fails. **]**

**SRS_NODE_DEVICE_AMQP_16_022: [** The `disconnect` method shall detach all attached links. **]**

**SRS_NODE_DEVICE_AMQP_16_023: [** The `disconnect` method shall forcefully detach all attached links if a connection error is the causing the transport to be disconnected. **]**

### sendEvent(message, done)

The `sendEvent` method sends an event to the IoT Hub as the device indicated in the constructor argument.

**SRS_NODE_DEVICE_AMQP_16_024: [** The `sendEvent` method shall connect and authenticate the transport if necessary. **]**

**SRS_NODE_DEVICE_AMQP_16_025: [** The `sendEvent` method shall create and attach the d2c link if necessary. **]**

**SRS_NODE_DEVICE_AMQP_16_002: [**The `sendEvent` method shall construct an AMQP request using the message passed in argument as the body of the message.**]**

**SRS_NODE_DEVICE_AMQP_16_003: [**The `sendEvent` method shall call the `done` callback with a null error object and a MessageEnqueued result object when the message has been successfully sent.**]**

**SRS_NODE_DEVICE_AMQP_16_004: [**If `sendEvent` encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message). **]**

### sendEventBatch(messages, done)
Not implemented

### getReceiver(done) [deprecated]
This method is deprecated. The `AmqpReceiver` object and pattern is going away and the `Amqp` object now implements the `Receiver` interface until we can completely get rid of it in the device client.

**SRS_NODE_DEVICE_AMQP_16_021: [** The `getReceiver` method shall call the `done` callback with a first argument that is `null` and a second argument that it `this`, ie the current `Amqp` instance. **]**

### setOptions(options, done)

**SRS_NODE_DEVICE_AMQP_06_001: [** The setOptions method shall throw a ReferenceError if the options parameter has not been supplied. **]**

**SRS_NODE_DEVICE_AMQP_06_002: [** If `done` has been specified the `setOptions` method shall call the `done` callback with no arguments.**]**

**SRS_NODE_DEVICE_AMQP_06_003: [** `setOptions` should not throw if `done` has not been specified.**]**

**SRS_NODE_DEVICE_AMQP_06_004: [** The AMQP transport should use the x509 settings passed in the `options` object to connect to the service if present.**]**


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

### sendTwinRequest(method, resource, properties, body, done)

**SRS_NODE_DEVICE_AMQP_06_012: [** The `sendTwinRequest` method shall not throw `ReferenceError` if the `done` callback is falsy. **]**

**SRS_NODE_DEVICE_AMQP_06_013: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `method` argument is falsy. **]**

**SRS_NODE_DEVICE_AMQP_06_014: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `resource` argument is falsy. **]**

**SRS_NODE_DEVICE_AMQP_06_015: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `properties` argument is falsy. **]**

**SRS_NODE_DEVICE_AMQP_06_016: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `body` argument is falsy. **]**

**SRS_NODE_DEVICE_AMQP_06_017: [** The `sendTwinRequest` method shall throw an `ArgumentError` if the `method` argument is not a string. **]**

**SRS_NODE_DEVICE_AMQP_06_018: [** The `sendTwinRequest` method shall throw an `ArgumentError` if the `resource` argument is not a string. **]**

**SRS_NODE_DEVICE_AMQP_06_019: [** The `sendTwinRequest` method shall throw an `ArgumentError` if the `properties` argument is not a an object. **]**

An new Amqp message shall be instantiated.

**SRS_NODE_DEVICE_AMQP_06_020: [** The `method` argument shall be the value of the amqp message `operation` annotation. **]**

**SRS_NODE_DEVICE_AMQP_06_021: [** The `resource` argument shall be the value of the amqp message `resource` annotation. **]**

**SRS_NODE_DEVICE_AMQP_06_031: [** If the `resource` argument terminates in a slash, the slash shall be removed from the annotation. **]**

**SRS_NODE_DEVICE_AMQP_06_039: [** If the `resource` argument length is zero (after terminating slash removal), the resource annotation shall not be set. **]**

**SRS_NODE_DEVICE_AMQP_06_028: [** The `sendTwinRequest` method shall throw an `ArgumentError` if any members of the `properties` object fails to serialize to a string. **]**

**SRS_NODE_DEVICE_AMQP_06_022: [** All properties, except $rid, shall be set as the part of the properties map of the amqp message. **]**

**SRS_NODE_DEVICE_AMQP_06_023: [** The $rid property shall be set as the `correlationId` in the properties map of the amqp message. **]**

**SRS_NODE_DEVICE_AMQP_06_024: [** The `body` shall be value of the body of the amqp message. **]**

**SRS_NODE_DEVICE_AMQP_06_025: [** The amqp message will be sent upstream to the IoT Hub via the amqp client `send`. **]**

**SRS_NODE_DEVICE_AMQP_06_040: [** If an error occurs in the `sendTwinRequest` method, the `done` callback shall be called with the error as the first parameter. **]**

**SRS_NODE_DEVICE_AMQP_06_041: [** If an error occurs, the `sendTwinRequest` shall use the AMQP `translateError` module to convert the amqp-specific error to a transport agnostic error before passing it into the `done` callback. **]**

**SRS_NODE_DEVICE_AMQP_06_042: [** If the `sendTwinRequest` method is successful, the first parameter to the `done` callback shall be null and the second parameter shall be a MessageEnqueued object. **]**

### getTwinReceiver(done)

**SRS_NODE_DEVICE_AMQP_06_033: [** The `getTwinReceiver` method shall throw an `ReferenceError` if done is falsy **]**

**SRS_NODE_DEVICE_AMQP_16_026: [** The `getTwinReceiver` method shall call the `done` callback with a `null` error argument and the `AmqpTwinClient` instance created when the `Amqp` object was instantiated. **]**

**SRS_NODE_DEVICE_AMQP_16_027: [** The `getTwinReceiver` method shall connect and authenticate the AMQP connection if necessary. **]**

**SRS_NODE_DEVICE_AMQP_16_028: [** The `getTwinReceiver` method shall call the `done` callback with the corresponding error if the transport fails connect or authenticate the AMQP connection. **]**

### on('message', messageCallback)

**SRS_NODE_DEVICE_AMQP_RECEIVER_16_003: [** The `Amqp` object shall listen to the `message` and error events of the underlying `ReceiverLink` object when it has listeners on its `message` event. **]**

**SRS_NODE_DEVICE_AMQP_RECEIVER_16_008: [** The `Amqp` object shall remove the listeners on `message` and `error` events of the underlying `ReceiverLink` when no-one is listening to its own `message` event. **]**

**SRS_NODE_DEVICE_AMQP_16_029: [** The `Amqp` object shall connect and authenticate the AMQP connection if necessary to attach the C2D `ReceiverLink` object. **]**

**SRS_NODE_DEVICE_AMQP_16_030: [** The `Amqp` object shall attach the C2D `ReceiverLink` object if necessary to start receiving messages. **]**


### onDeviceMethod(methodName, methodCallback)

**SRS_NODE_DEVICE_AMQP_RECEIVER_16_007: [** The `onDeviceMethod` method shall forward the `methodName` and `methodCallback` arguments to the underlying `AmqpDeviceMethodClient` object. **]**
