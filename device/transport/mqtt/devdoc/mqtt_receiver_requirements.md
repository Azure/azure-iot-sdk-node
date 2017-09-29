# MqttReceiver Requirements

## Overview
Object used to subscribe to the Cloud-to-Device messages endpoint and receive messages for this device
These requirements now apply to the `Mqtt` object as the receiver pattern is being deprecated.

## Example
```javascript
receiver.on('message', function(msg) {
    console.log('Message received: ' + msg.data);
});
```

## Public API

### Events

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_003: [** When a listener is added for the `message` event, the topic should be subscribed to. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_13_002: [** When a listener is added for the `method` event, the topic should be subscribed to. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_004: [** If there is a listener for the `message` event, a `message` event shall be emitted for each message received. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_13_003: [** If there is a listener for the `method` event, a `method_<METHOD NAME>` event shall be emitted for each message received. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_13_005: [** When a `method_<METHOD NAME>` event is emitted the parameter shall conform to the shape as defined by the interface specified below:

```
interface StringMap {
    [key: string]: string;
}

interface MethodMessage {
    methods: { methodName: string; };
    requestId: string;
    properties: StringMap;
    body: any;
    verb: string;
}
```
**]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_005: [** When a `message` event is emitted, the parameter shall be of type `Message`. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_006: [** When there are no more listeners for the `message` event, the topic should be unsubscribed. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_13_004: [** When there are no more listeners for the `method` event, the topic should be unsubscribed. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_007: [** When a message is received, the receiver shall populate the generated `Message` object `properties` property with the user properties serialized in the topic. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_008: [** When a message is received, the receiver shall populate the generated `Message` object `messageId` with the value of the property `$.mid` serialized in the topic, if present. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_009: [** When a message is received, the receiver shall populate the generated `Message` object `to` with the value of the property `$.to` serialized in the topic, if present. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_010: [** When a message is received, the receiver shall populate the generated `Message` object `expiryTimeUtc` with the value of the property `$.exp` serialized in the topic, if present. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_011: [** When a message is received, the receiver shall populate the generated `Message` object `correlationId` with the value of the property `$.cid` serialized in the topic, if present. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_012: [** When a message is received, the receiver shall populate the generated `Message` object `userId` with the value of the property `$.uid` serialized in the topic, if present. **]**