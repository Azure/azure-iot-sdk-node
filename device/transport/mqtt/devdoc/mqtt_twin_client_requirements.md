# MqttTwinClient Requirements

## Overview
Object used to publish, subscribe and receive twin messages.

## Responsibilities
- subscribe to the necessary topics to achieve twin operations
- format MQTT messages to send twin requests and reported properties updates
- get the full twin using the appropriate topics and request/response mechanism
- receive desired properties updates and signal them to the Mqtt client.

## Non-responsibilities
- connecting/disconnecting the Mqtt connection
- any other feature that is not twin-related
- retries and timeouts.

## Public API
```typescript
class MqttTwinClient extends EventEmitter {
  constructor(client: MqttBase);
  getTwin(callback: (err?: Error, twin?: TwinProperties) => void): void;
  updateTwinReportedProperties(patch: any, callback: (err?: Error) => void): void;
  enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
  disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
}
```

### constructor(client: MqttBase);

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_18_001: [** The `MqttTwinClient` constructor shall accept a `client` object **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_001: [** The `MqttTwinClient` constructor shall immediately subscribe to the `message` event of the `client` object. **]**

### getTwin(callback: (err?: Error, twin?: TwinProperties) => void): void;

The `getTwin` method retrieves the device twin by publishing a twin request on a topic and receiving the response on another one.

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_002: [** The `getTwin` method shall subscribe to the `$iothub/twin/res/#` topic if not already subscribed. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_009: [** If subscribing to the response topic fails, the callback shall be called with the translated version of the error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_003: [** The `getTwin` method shall publish the request message on the `$iothub/twin/get/?rid=<requestId>` topic using the `MqttBase.publish` method. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_004: [** The `getTwin` method shall publish the request message with QoS=0, DUP=0 and Retain=0. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_005: [** The `requestId` property in the topic querystring should be set to a unique identifier that will be used to identify the response later on. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_006: [** The request message published by the `getTwin` method shall have an empty body. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_007: [** When a message is received on the response topic with an `$rid` property in the query string of the topic matching the one that was sent on the request topic, the `callback` shall be called with a `null` error object and the parsed content of the response message. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_008: [** If an error happen while publishing the request message, the `callback` shall be called with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package. **]**

### updateTwinReportedProperties(patch: any, callback: (err?: Error) => void): void;

The `updateTwinReportedProperties` publishes an update to the reported properties.

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_011: [** The `updateTwinReportedProperties` method shall subscribe to the `$iothub/twin/res/#` topic if not already subscribed. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_012: [** If subscribing to the response topic fails, the callback shall be called with the translated version of the error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_013: [** The `updateTwinReportedProperties` method shall publish the request message on the `$iothub/twin/patch/properties/reported/?rid=<requestId>` topic using the `MqttBase.publish` method. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_014: [** The `updateTwinReportedProperties` method shall publish the request message with QoS=0, DUP=0 and Retain=0. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_015: [** The `requestId` property in the topic querystring should be set to a unique identifier that will be used to identify the response later on. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_016: [** The body of the request message published by the `updateTwinReportedProperties` method shall be a JSON string of the reported properties patch. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_017: [** When a message is received on the response topic with an `$rid` property in the query string of the topic matching the one that was sent on the request topic, the `callback` shall be called with a `null` error object. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_018: [** If an error happen while publishing the request message, the `callback` shall be called with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package. **]**

### enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_019: [** The `enableTwinDesiredPropertiesUpdates` shall subscribe to the `$iothub/twin/PATCH/properties/desired/#` topic using the `MqttBase.subscribe` method if it hasn't been subscribed to already. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_020: [** The `enableTwinDesiredPropertiesUpdates` shall call its callback with no arguments if the subscription is successful. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_021: [** if subscribing fails with an error the `enableTwinDesiredPropertiesUpdates` shall call its callback with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package. **]**

### disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_022: [** The `disableTwinDesiredPropertiesUpdates` shall unsubscribe from the `$iothub/twin/PATCH/properties/desired/#` topic using the `MqttBase.unsubscribe` method if it hasn't been unsubscribed from already. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_023: [** The `disableTwinDesiredPropertiesUpdates` shall call its callback with no arguments if the unsubscription is successful. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_024: [** if unsubscribing fails with an error the `disableTwinDesiredPropertiesUpdates` shall call its callback with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package. **]**


### twinDesiredPropertiesUpdate event

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_025: [** Once the desired properties update topic has been subscribed to the `MqttTwinClient` shall emit a `twinDesiredPropertiesUpdate` event for messages received on that topic. **]**

**SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_026: [** The argument of the `twinDesiredPropertiesUpdate` event emitted shall be the object parsed from the JSON string contained in the received message. **]**