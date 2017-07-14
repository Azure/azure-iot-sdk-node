# Amqp/AmqpWs Requirements (Device SDK)


## Overview
Amqp provides transport functionality for devices that want to communicate with an Azure IoT Hub using the AMQP protocol. It provides an additional level of abstraction on top of the common Amqp class (azure-iot-common.Amqp) which is not specific to the device or service.
Based on the configuration parameters given to the constructor, the Amqp object will build the SASL-Plain URL used to communicate with the IoT Hub instance, as well as the sending and receiving endpoints, and will instantiate a base Amqp object to use with these parameters.
AmqpWs works exactly the same way and provides AMQP transport over websockets. Requirements are the same.

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

amqp.getReceiver(function (receiver) {
  receiver.on('message', function (msg) {
    devAmqp.sendFeedback('complete', msg.lockToken, print);
  });
  receiver.on('errorReceived', function (err) {
    print(err);
  });
});
```

## Public Interface
### Amqp constructor

**SRS_NODE_DEVICE_AMQP_16_001: [**The Amqp constructor shall accept a config object with four properties:
`host` – (string) the fully-qualified DNS hostname of an IoT Hub
`hubName` - (string) the name of the IoT Hub instance (without suffix such as .azure-devices.net)
`deviceId` – (string) the identifier of a device registered with the IoT Hub
`sharedAccessSignature` – (string) the shared access signature associated with the device registration.**]**

### connect(done)
The `connect` method establishes a connection with the Azure IoT Hub instance.

**SRS_NODE_DEVICE_AMQP_16_008: [**The `done` callback method passed in argument shall be called if the connection is established**]**
**SRS_NODE_DEVICE_AMQP_16_009: [**The `done` callback method passed in argument shall be called with an error object if the connection fails**]**
**SRS_NODE_DEVICE_AMQP_06_005: [** If x509 authentication is NOT being utilized then `initializeCBS` shall be invoked. **]**
**SRS_NODE_DEVICE_AMQP_06_008: [** If `initializeCBS` is not successful then the client will remain disconnected and the callback will be called with an error per SRS_NODE_DEVICE_AMQP_16_009. **]**
**SRS_NODE_DEVICE_AMQP_06_006: [**If `initializeCBS` is successful, `putToken` shall be invoked with the first parameter audience, created from the sr of the sas signature, the next parameter of the actual sas, and a callback. **]**
**SRS_NODE_DEVICE_AMQP_06_009: [** If `putToken` is not successful then the client will remain disconnected and the callback will be called with an error per SRS_NODE_DEVICE_AMQP_16_009. **]**

### disconnect(done)
The `disconnect` method terminates the connection with the Azure IoT Hub instance.

**SRS_NODE_DEVICE_AMQP_16_010: [**The `done` callback method passed in argument shall be called when disconnected**]**
**SRS_NODE_DEVICE_AMQP_16_011: [**The `done` callback method passed in argument shall be called with an error object if disconnecting fails**]**

### sendEvent(message, done)

The `sendEvent` method sends an event to the IoT Hub as the device indicated in the constructor argument.

**SRS_NODE_DEVICE_AMQP_16_002: [**The `sendEvent` method shall construct an AMQP request using the message passed in argument as the body of the message.**]**
**SRS_NODE_DEVICE_AMQP_16_003: [**The `sendEvent` method shall call the `done` callback with a null error object and a MessageEnqueued result object when the message has been successfully sent.**]**
**SRS_NODE_DEVICE_AMQP_16_004: [**If `sendEvent` encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message). **]**

### sendEventBatch(messages, done)
The `sendEventBatch` method sends a list of events to the IoT Hub as the device indicated in the constructor argument.

**SRS_NODE_DEVICE_AMQP_16_005: [**If `sendEventBatch` encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message).**]**

### getReceiver(done)
Gets the AmqpReceiver object used to subscribe to messages and errors sent to this device and to settle those messages.

**SRS_NODE_DEVICE_AMQP_16_006: [**If a receiver for this endpoint has already been created, the getReceiver method should call the `done` method with the existing instance as an argument.**]**
**SRS_NODE_DEVICE_AMQP_16_007: [**If a receiver for this endpoint doesn’t exist, the getReceiver method should create a new AmqpReceiver object and then call the `done` method with the object that was just created as an argument.**]**

### setOptions(options, done)

**SRS_NODE_DEVICE_AMQP_06_001: [** The setOptions method shall throw a ReferenceError if the options parameter has not been supplied. **]**

**SRS_NODE_DEVICE_AMQP_06_002: [** If `done` has been specified the `setOptions` method shall call the `done` callback with no arguments.**]**

**SRS_NODE_DEVICE_AMQP_06_003: [** `setOptions` should not throw if `done` has not been specified.**]**

**SRS_NODE_DEVICE_AMQP_06_004: [** The AMQP transport should use the x509 settings passed in the `options` object to connect to the service if present.**]**


### abandon(message, done)

**SRS_NODE_DEVICE_AMQP_16_012: [**The `abandon` method shall call the ‘abandon’ method of the receiver object and pass it the `message` and the callback given as parameters.**]**

### complete(message, done)

**SRS_NODE_DEVICE_AMQP_16_013: [**The `complete` method shall call the ‘complete’ method of the receiver object and pass it the message and the callback given as parameters.**]**

### reject(message, done)

**SRS_NODE_DEVICE_AMQP_16_014: [**The `reject` method shall call the ‘reject’ method of the receiver object and pass it the message and the callback given as parameters.**]**

### updateSharedAccessSignature(sharedAccessSignature, done)

**SRS_NODE_DEVICE_AMQP_16_015: [**The `updateSharedAccessSignature` method shall save the new shared access signature given as a parameter to its configuration.**]**

**SRS_NODE_DEVICE_AMQP_06_010: [** The `updateSharedAccessSignature` method shall call the amqp transport `putToken` method with the first parameter audience, created from the sr of the sas signature, the next parameter of the actual sas, and a callback. *]**

**SRS_NODE_DEVICE_AMQP_06_011: [** The `updateSharedAccessSignature` method shall call the `done` callback with a null error object and a SharedAccessSignatureUpdated object as a result, indicating the client does NOT need to reestablish the transport connection. **]**

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

### getTwinReceiver

**SRS_NODE_DEVICE_AMQP_06_033: [** The `getTwinReceiver` method shall throw an `ReferenceError` if done is falsy **]**
**SRS_NODE_DEVICE_AMQP_06_034: [** If a twin receiver for this endpoint doesn't exist, the `getTwinReceiver` method should create a new `AmqpTwinReceiver` object. **]**
**SRS_NODE_DEVICE_AMQP_06_035: [** If a twin receiver for this endpoint has already been created, the `getTwinReceiver` method should not create a new `AmqpTwinReceiver` object. **]**
**SRS_NODE_DEVICE_AMQP_06_036: [** The `getTwinReceiver` method shall call the `done` method after it complete. **]**
**SRS_NODE_DEVICE_AMQP_06_037: [** If a twin receiver for this endpoint did not previously exist, the `getTwinReceiver` method should return the a new `AmqpTwinReceiver` object as the second parameter of the `done` function with null as the first parameter. **]**
**SRS_NODE_DEVICE_AMQP_06_038: [** If a twin receiver for this endpoint previously existed, the `getTwinReceiver` method should return the preexisting `AmqpTwinReceiver` object as the second parameter of the `done` function with null as the first parameter. **]**