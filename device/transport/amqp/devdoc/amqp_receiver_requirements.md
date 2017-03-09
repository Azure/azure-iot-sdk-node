# AmqpReceiver Requirements (Device SDK)


## Overview
The `AmqpReceiver` object emits events when messages are received by the device and provides a way to listen to device method calls.
The goal of this object is to maintain a consistent API across AMQP and MQTT transports and isolate AMQP-specific logic from the Device Client.
As such, it hides an underlying `azure-iot-amqp-base.AmqpReceiver` object for messaging, and an `azure-iot-device-amqp.AmqpDeviceMethodClient` object
and redirects calls to its own method to those clients.

## Public Interface
### AmqpReceiver(config, amqpClient, deviceMethodClient) [constructor]
**SRS_NODE_DEVICE_AMQP_RECEIVER_16_001: [** The `AmqpReceiver` constructor shall initialize a new instance of an `AmqpReceiver` object. **]**

**SRS_NODE_DEVICE_AMQP_RECEIVER_16_002: [** The `AmqpReceiver` object shall inherit from the `EventEmitter` node object. **]**

### on('message', messageCallback)
**SRS_NODE_DEVICE_AMQP_RECEIVER_16_003: [** The `AmqpReceiver` shall forward any new listener of the `message` event to the underlying amqp message receiver. **]**

**SRS_NODE_DEVICE_AMQP_RECEIVER_16_008: [** The `AmqpReceiver` shall remove any listener of its `message` event from the underlying amqp message receiver. **]**

### complete(message, callback) [deprecated]
NOTE: This method is deprecated and the `azure-iot-device-amqp.Amqp.complete` method should be used instead.

**SRS_NODE_DEVICE_AMQP_RECEIVER_16_004: [** The `complete` method shall forward the `message` and `callback` arguments to the underlying message receiver. **]**

### reject(message, callback) [deprecated]
NOTE: This method is deprecated and the `azure-iot-device-amqp.Amqp.reject` method should be used instead.

**SRS_NODE_DEVICE_AMQP_RECEIVER_16_005: [** The `reject` method shall forward the `message` and `callback` arguments to the underlying message receiver. **]**

### abandon(message, callback) [deprecated]
NOTE: This method is deprecated and the `azure-iot-device-amqp.Amqp.abandon` method should be used instead.

**SRS_NODE_DEVICE_AMQP_RECEIVER_16_006: [** The `abandon` method shall forward the `message` and `callback` arguments to the underlying message receiver. **]**

### onDeviceMethod(methodName, methodCallback)
**SRS_NODE_DEVICE_AMQP_RECEIVER_16_007: [** The `onDeviceMethod` method shall forward the `methodName` and `methodCallback` arguments to the underlying `AmqpDeviceMethodClient` object. **]**
