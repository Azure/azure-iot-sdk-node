#azure-iothub.Client Requirements

## Overview
`Client` exposes methods for sending cloud-to-device (c2d) messages, and receiving feedback regarding message delivery.

##Example usage
```js
'use strict';
var Client = require('azure-iothub').Client;
var Message = require('azure-iot-common').Message;

var message = new Message('hello');
message.messageId = 'unique-message-id';
message.ack = 'full';

var client = Client.fromConnectionString('Connection String');
client.open(function (err) {
  if (err) handleErrorAndExit(err);
  client.getFeedbackReceiver(function (err, receiver) {
    if (err) handleErrorAndExit(err);
    receiver.on('errorReceived', function (err) {
      handleErrorAndExit(err);
    });
    receiver.on('message', function (feedback) {
      console.log(feedback.body);
      client.close();
    });
  });
  client.send('my-device', message, function (err) {
    if (err) handleErrorAndExit(err);
  });
});
```

##Public Interface
###Client(transport) constructor
**SRS_NODE_IOTHUB_CLIENT_05_001: [**The `Client` constructor shall throw `ReferenceError` if the transport argument is falsy.**]**

**SRS_NODE_IOTHUB_CLIENT_16_021: [** The `Client` constructor shall initialize the default retry policy to `ExponentialBackoffWithJitter` with a maximum timeout of 4 minutes. **]**

###fromConnectionString(connStr, Transport) [static]
The `fromConnectionString` static method returns a new instance of the `Client` object using the transport provided as a second argument, or the default (AMQP) transport if the second argument is null.

**SRS_NODE_IOTHUB_CLIENT_05_002: [**The `fromConnectionString` method shall throw `ReferenceError` if the `connStr` argument is falsy.**]**

**SRS_NODE_IOTHUB_CLIENT_16_015: [** The `fromConnectionString` method shall create a new transport instance and pass it a config object formed from the connection string given as argument. **]**

**SRS_NODE_IOTHUB_CLIENT_16_016: [** The `fromConnectionString` method shall use the `Transport` constructor passed as argument to instantiate a transport object if it's not falsy. **]**

**SRS_NODE_IOTHUB_CLIENT_16_017: [** The `fromConnectionString` method shall use the default Transport (Amqp) if the `Transport` optional argument is falsy. **]**

**SRS_NODE_IOTHUB_CLIENT_05_004: [**The `fromConnectionString` method shall return a new instance of the Client object, as by a call to new Client(transport).**]**

###fromSharedAccessSignature(sharedAccessSignature, Transport) [static]
The `fromSharedAccessSignature` static method returns a new instance of the `Client` object using the default (AMQP) transport.

**SRS_NODE_IOTHUB_CLIENT_05_005: [**The `fromSharedAccessSignature` method shall throw `ReferenceError` if the sharedAccessSignature argument is falsy.**]**

**SRS_NODE_IOTHUB_CLIENT_16_018: [** The `fromSharedAccessSignature` method shall create a new transport instance and pass it a config object formed from the connection string given as argument. **]**

**SRS_NODE_IOTHUB_CLIENT_16_019: [** The `fromSharedAccessSignature` method shall use the `Transport` constructor passed as argument to instantiate a transport object if it's not falsy. **]**

**SRS_NODE_IOTHUB_CLIENT_16_020: [** The `fromSharedAccessSignature` method shall use the default Transport (Amqp) if the `Transport` optional argument is falsy. **]**

**SRS_NODE_IOTHUB_CLIENT_05_007: [**The `fromSharedAccessSignature` method shall return a new instance of the `Client` object, as by a call to `new Client(transport)`.**]**

###open(done)
The open method opens a connection to the IoT Hub service.

**SRS_NODE_IOTHUB_CLIENT_05_008: [**The `open` method shall open a connection to the IoT Hub that was identified when the `Client` object was created (e.g., in Client.fromConnectionString).**]**

**SRS_NODE_IOTHUB_CLIENT_05_009: [**When the `open` method completes, the callback function (indicated by the `done` argument) shall be invoked with the following arguments:
- `err` - standard JavaScript `Error` object (or subclass)**]**

**SRS_NODE_IOTHUB_CLIENT_05_010: [**The argument `err` passed to the callback `done` shall be null if the protocol operation was successful.**]**

**SRS_NODE_IOTHUB_CLIENT_05_011: [**Otherwise the argument `err` shall have an `amqpError` property containing implementation-specific response information for use in logging and troubleshooting.**]**

**SRS_NODE_IOTHUB_CLIENT_05_012: [**If the connection is already open when `open` is called, it shall have no effect—that is, the `done` callback shall be invoked immediately with a null argument.**]**

**SRS_NODE_IOTHUB_CLIENT_16_002: [** If the transport successfully establishes a connection the `open` method shall subscribe to the `disconnect` event of the transport.**]**

**SRS_NODE_IOTHUB_CLIENT_16_006: [** The `open` method should not throw if the `done` callback is not specified. **]**

**SRS_NODE_IOTHUB_CLIENT_16_022: [** The `open` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to connect the transport. **]**

###send(devceId, message, done)
The `send` method sends a cloud-to-device message to the service, intended for delivery to the given device.

**SRS_NODE_IOTHUB_CLIENT_05_013: [**The `send` method shall throw `ReferenceError` if the deviceId or message arguments are falsy.**]**

**SRS_NODE_IOTHUB_CLIENT_18_016: [** The `send` method shall throw an `ArgumentError` if the `message` argument is not of type `azure-iot-common.Message` or `azure-iot-common.Message.BufferConvertible`. **]**

**SRS_NODE_IOTHUB_CLIENT_05_014: [**The `send` method shall convert the `message` object to type `azure-iot-common.Message` if it is not already of type `azure-iot-common.Message`. **]**

**SRS_NODE_IOTHUB_CLIENT_05_016: [**When the `send` method completes, the callback function (indicated by the done - argument) shall be invoked with the following arguments:
- `err` - standard JavaScript Error object (or subclass)
- `result` - an implementation-specific response object returned by the underlying protocol, useful for logging and troubleshooting**]**

**SRS_NODE_IOTHUB_CLIENT_05_017: [**The argument `err` passed to the callback `done` shall be `null` if the protocol operation was successful.**]**

**SRS_NODE_IOTHUB_CLIENT_05_018: [**Otherwise the argument `err` shall have an `amqpError` property containing implementation-specific response information for use in logging and troubleshooting.**]**

**SRS_NODE_IOTHUB_CLIENT_05_019: [**If the `deviceId` has not been registered with the IoT Hub, `send` shall call the `done` callback with a `DeviceNotFoundError`.**]**

**SRS_NODE_IOTHUB_CLIENT_05_020: [**If the queue which receives messages on behalf of the device is full, `send` shall call the `done` callback with a `DeviceMaximumQueueDepthExceededError`.**]**

**SRS_NODE_IOTHUB_CLIENT_16_023: [** The `send` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to send the message. **]**

**SRS_NODE_IOTHUB_CLIENT_16_030: [** The `send` method shall not throw if the `done` callback is falsy. **]**



###getFeedbackReceiver(done)
The `getFeedbackReceiver` method is used to obtain an `AmqpReceiver` object which emits events when new feedback messages are received by the client.

**SRS_NODE_IOTHUB_CLIENT_05_027: [**When the `getFeedbackReceiver` method completes, the callback function (indicated by the `done` argument) shall be invoked with the following arguments:
- `err` - standard JavaScript `Error` object (or subclass): `null` if the operation was successful
- `receiver` - an `AmqpReceiver` instance: `undefined` if the operation failed **]**

**SRS_NODE_IOTHUB_CLIENT_16_024: [** The `getFeedbackReceiver` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to get a feedback receiver object. **]**

###getFileNotificationReceiver(done)
The `getFileNotificationReceiver` method is used to obtain an `AmqpReceiver` object which emits events when new file notifications are received by the client.

**SRS_NODE_IOTHUB_CLIENT_16_001: [** When the `getFileNotificationReceiver` method completes, the callback function (indicated by the `done` argument) shall be invoked with the following arguments:
- `err` - standard JavaScript `Error` object (or subclass): `null` if the operation was successful
- `receiver` - an `AmqpReceiver` instance: `undefined` if the operation failed **]**

**SRS_NODE_IOTHUB_CLIENT_16_025: [** The `getFileNotificationReceiver` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to send the get a feedback receiver object. **]**

###close(done)
The `close` method closes the connection opened by open.

**SRS_NODE_IOTHUB_CLIENT_05_021: [**The `close` method shall close the connection.**]**

**SRS_NODE_IOTHUB_CLIENT_05_022: [**When the `close` method completes, the callback function (indicated by the done argument) shall be invoked with the following arguments:
- `err` - standard JavaScript `Error` object (or subclass)**]**

**SRS_NODE_IOTHUB_CLIENT_05_023: [**The argument `err` passed to the callback `done` shall be `null` if the protocol operation was successful.**]**

**SRS_NODE_IOTHUB_CLIENT_05_024: [**Otherwise the argument `err` shall have a transport property containing implementation-specific response information for use in logging and troubleshooting.**]**

**SRS_NODE_IOTHUB_CLIENT_05_025: [**If the connection is not open when close is called, it shall have no effect— that is, the `done` callback shall be invoked immediately with `null` arguments.**]**

**SRS_NODE_IOTHUB_CLIENT_16_003: [** The `close` method shall remove the listener that has been attached to the transport `disconnect` event. **]**

**SRS_NODE_IOTHUB_CLIENT_16_005: [** The `close` method should not throw if the `done` callback is not specified. **]**

### invokeDeviceMethod(deviceId: string, moduleIdOrMethodParams: string | DeviceMethodParams, methodParamsOrDone?: DeviceMethodParams | Callback<any>, done?: Callback<any>): void;
The `invokeDeviceMethod` method calls a device method on a specific device or module and calls back with the result of this method's execution.

#### Valid prototypes:
```typescript
invokeDeviceMethod(deviceId: string, methodParams: DeviceMethodParams, done?: Callback<any>): void;
invokeDeviceMethod(deviceId: string, moduleId: string, methodParams: DeviceMethodParams, done?: Callback<any>): void;
invokeDeviceMethod(deviceId: string, moduleIdOrMethodParams: string | DeviceMethodParams, methodParamsOrDone?: DeviceMethodParams | Callback<any>, done?: Callback<any>): void;
```

**SRS_NODE_IOTHUB_CLIENT_16_014: [** The `invokeDeviceMethod` method shall throw a `ReferenceError` if `deviceId` is `null`, `undefined` or an empty string. **]**

**SRS_NODE_IOTHUB_CLIENT_16_006: [** The `invokeDeviceMethod` method shall throw a `ReferenceError` if `methodParams.methodName` is `null`, `undefined` or an empty string. **]**

**SRS_NODE_IOTHUB_CLIENT_16_007: [** The `invokeDeviceMethod` method shall throw a `TypeError` if `methodParams.methodName` is not a `string`. **]**

**SRS_NODE_IOTHUB_CLIENT_16_009: [** The `invokeDeviceMethod` method shall initialize a new instance of `DeviceMethod` with the `methodParam` argument. **]**

**SRS_NODE_IOTHUB_CLIENT_16_010: [** The `invokeDeviceMethod` method shall use the newly created instance of `DeviceMethod` to invoke the method on the device specified with the `deviceid` argument . **]**

**SRS_NODE_IOTHUB_CLIENT_16_012: [** The `invokeDeviceMethod` method shall call the `done` callback with a standard javascript `Error` object if the request failed. **]**

**SRS_NODE_IOTHUB_CLIENT_16_013: [** The `invokeDeviceMethod` method shall call the `done` callback with a `null` first argument, the result of the method execution in the second argument, and the transport-specific response object as a third argument. **]**

**SRS_NODE_IOTHUB_CLIENT_16_026: [** The `invokeDeviceMethod` method shall use the retry policy defined either by default or by a call to `setRetryPolicy` if necessary to send the method request. **]**

**SRS_NODE_IOTHUB_CLIENT_18_003: [** If `moduleIdOrMethodParams` is a string the `invokeDeviceMethod` method shall call `invokeOnModule` on the new `DeviceMethod` instance. **]**

### setRetryPolicy(policy)

**SRS_NODE_IOTHUB_CLIENT_16_027: [** The `setRetryPolicy` method shall throw a `ReferenceError` if the `policy` argument is falsy. **]**

**SRS_NODE_IOTHUB_CLIENT_16_028: [** The `setRetryPolicy` method shall throw an `ArgumentError` if the `policy` object does not have a `shouldRetry` method and a `nextRetryTimeout` method. **]**

**SRS_NODE_IOTHUB_CLIENT_16_029: [** Any operation (e.g. `send`, `getFeedbackReceiver`, etc) initiated after a call to `setRetryPolicy` shall use the policy passed as argument to retry. **]**

### Events
#### disconnect
**SRS_NODE_IOTHUB_CLIENT_16_004: [** The `disconnect` event shall be emitted when the client is disconnected from the server. **]**