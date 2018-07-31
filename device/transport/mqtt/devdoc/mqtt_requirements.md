# azure-iot-device-mqtt.Mqtt/MqttWs Requirements

## Overview
`Mqtt` and `MqttWs` provide a standard transport interface between the generic device Client and the specific MQTT transport implementation.
`MqttWs` will connect over secure websockets whereas `Mqtt` connects over secure TCP sockets.

## Public Interface
### Mqtt constructor
The `Mqtt` and `MqttWs` constructors initialize a new instance of the MQTT transport.

**SRS_NODE_DEVICE_MQTT_16_071: [** The constructor shall subscribe to the `newTokenAvailable` event of the `authenticationProvider` passed as an argument if it uses tokens for authentication. **]**

**SRS_NODE_DEVICE_MQTT_16_072: [** If the `newTokenAvailable` event is fired, the `Mqtt` object shall do nothing if it isn't connected. **]**

**SRS_NODE_DEVICE_MQTT_16_073: [** If the `newTokenAvailable` event is fired, the `Mqtt` object shall call `updateSharedAccessSignature` on the `mqttBase` object if it is connected. **]**

**SRS_NODE_DEVICE_MQTT_16_074: [** If updating the shared access signature fails when the `newTokenAvailable` event is fired, the `Mqtt` state machine shall fire a `disconnect` event. **]**

**SRS_NODE_DEVICE_MQTT_12_003: [** The constructor shall create an MqttBase object and store it in a member variable.**]**

**SRS_NODE_DEVICE_MQTT_16_016: [** If the connection string does not specify a `gatewayHostName` value, the `Mqtt` constructor shall initialize the `uri` property of the `config` object to `mqtts://<host>`. **]**

**SRS_NODE_DEVICE_MQTT_18_054: [** If a `gatewayHostName` is specified in the connection string, the Mqtt constructor shall initialize the `uri` property of the `config` object to `mqtts://<gatewayhostname>`. **]**

**SRS_NODE_DEVICE_MQTT_18_052: [** If a `moduleId` is specified in the connection string, the Mqtt constructor shall initialize the `clientId` property of the `config` object to '<deviceId>/<moduleId>'. **]**

**SRS_NODE_DEVICE_MQTT_18_053: [** If a `moduleId` is not specified in the connection string, the Mqtt constructor shall initialize the `clientId` property of the `config` object to '<deviceId>'. **]**

**SRS_NODE_DEVICE_MQTT_18_055: [** The Mqtt constructor shall initialize the `username` property of the `config` object to '<host>/<clientId>/api-version=<version>&DeviceClientType=<agentString>'. **]**

**SRS_NODE_DEVICE_MQTT_18_053: [** If a `moduleId` is not specified in the connection string, the Mqtt constructor shall initialize the `clientId` property of the `config` object to '<deviceId>'. **]**

**SRS_NODE_DEVICE_MQTT_18_055: [** The Mqtt constructor shall initialize the `username` property of the `config` object to '<host>/<clientId>/api-version=<version>&DeviceClientType=<agentString>'. **]**

**SRS_NODE_DEVICE_MQTT_16_017: [** The `MqttWs` constructor shall initialize the `uri` property of the `config` object to `wss://<host>:443/$iothub/websocket`. **]**

**SRS_NODE_DEVICE_MQTT_18_025: [** If the `Mqtt` constructor receives a second parameter, it shall be used as a provider in place of mqtt.js **]**

**SRS_NODE_DEVICE_MQTT_16_081: [** The `Mqtt` constructor shall subscribe to the `MqttTwinClient` `twinDesiredPropertiesUpdates`. **]**

**SRS_NODE_DEVICE_MQTT_16_082: [** A `twinDesiredPropertiesUpdates` shall be emitted by the `Mqtt` object for each `twinDesiredPropertiesUpdates` event received from the `MqttTwinClient` with the same payload. **]**

### connect(done)

The `connect` method initializes a connection to an IoT hub.

**SRS_NODE_DEVICE_MQTT_12_004: [** The `connect` method shall call the `connect` method on `MqttBase`. **]**

**SRS_NODE_DEVICE_MQTT_18_029: [** If a `moduleId` is not specified, the `connect` method shall use a `clientId` of "<deviceId>" when connecting to the MQTT service. **]**

**SRS_NODE_DEVICE_MQTT_18_030: [** If a `moduleId` is not specified, the `connect` method shall use a `username` of "<host>/<deviceId>/DeviceClientType=<userAgent>&apiVersion=<apiVersion>". **]**

**SRS_NODE_DEVICE_MQTT_18_031: [** If a `moduleId` is specified, The `connect` method shall use a `clientId` of "<deviceId>/<moduleId>" when connecting to the MQTT service. **]**

**SRS_NODE_DEVICE_MQTT_18_032: [** If a `moduleId` is specified, the `connect` method shall use a `username` of "<host>/<deviceId>/<moduleId>/DeviceClientType=<userAgent>&apiVersion=<apiVersion>". **]**

**SRS_NODE_DEVICE_MQTT_18_026: [** When `MqttBase` fires the `error` event, the `Mqtt` object shall emit a `disconnect` event. **]**

**SRS_NODE_DEVICE_MQTT_16_018: [** The `connect` method shall call its callback immediately if `MqttBase` is already connected. **]**

**SRS_NODE_DEVICE_MQTT_16_019: [** The `connect` method shall calls its callback with an `Error` that has been translated from the `MqttBase` error using the `translateError` method if it fails to establish a connection. **]**

**SRS_NODE_DEVICE_MQTT_16_020: [** The `connect` method shall call its callback with a `null` error parameter and a `results.Connected` response if `MqttBase` successfully connects. **]**

**SRS_NODE_DEVICE_MQTT_16_067: [** The `connect` method shall call the `getDeviceCredentials` method of the `AuthenticationProvider` object passed to the constructor to obtain the credentials of the device. **]**

**SRS_NODE_DEVICE_MQTT_16_068: [** The `connect` method shall call its callback with the error returned by `getDeviceCredentials` if it fails to return the device credentials. **]**

### disconnect(done)

The `disconnect` method should close the connection to the IoT Hub instance.

**SRS_NODE_DEVICE_MQTT_16_001: [** The `disconnect` method should call the `disconnect` method on `MqttBase`. **]**

**SRS_NODE_DEVICE_MQTT_16_021: [** The `disconnect` method shall call its callback immediately with a `null` argument and a `results.Disconnected` second argument if `MqttBase` is already disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_022: [** The `disconnect` method shall call its callback with a `null` error parameter and a `results.Disconnected` response if `MqttBase` successfully disconnects if not disconnected already. **]**

**SRS_NODE_DEVICE_MQTT_16_085: [** Once the MQTT transport is disconnected and if it is using a token authentication provider, the `stop` method of the `AuthenticationProvider` object shall be called to stop any running timer. **]**

### sendEvent(message)

The `sendEvent` method sends an event to an IoT hub on behalf of the device indicated in the constructor argument.

**SRS_NODE_DEVICE_MQTT_12_005: [** The `sendEvent` method shall call the publish method on `MqttBase`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_008: [** The `sendEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/messages/events/`. **]**

**SRS_NODE_DEVICE_MQTT_18_034: [** If the connection string specifies a `moduleId` value, the `sendEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/<moduleId>/messages/events/` **]**

**SRS_NODE_COMMON_MQTT_BASE_16_009: [** If the message has properties, the property keys and values shall be uri-encoded, then serialized and appended at the end of the topic with the following convention: `<key>=<value>&<key2>=<value2>&<key3>=<value3>(...)`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_010: [** The `sendEvent` method shall use QoS level of 1. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_011: [** The `sendEvent` method shall serialize the `messageId` property of the message as a key-value pair on the topic with the key `$.mid`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_012: [** The `sendEvent` method shall serialize the `correlationId` property of the message as a key-value pair on the topic with the key `$.cid`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_013: [** The `sendEvent` method shall serialize the `userId` property of the message as a key-value pair on the topic with the key `$.uid`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_014: [** The `sendEvent` method shall serialize the `to` property of the message as a key-value pair on the topic with the key `$.to`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_015: [** The `sendEvent` method shall serialize the `expiryTimeUtc` property of the message as a key-value pair on the topic with the key `$.exp`. **]**

**SRS_NODE_DEVICE_MQTT_16_083: [** The `sendEvent` method shall serialize the `contentEncoding` property of the message as a key-value pair on the topic with the key `$.ce`. **]**

**SRS_NODE_DEVICE_MQTT_16_084: [** The `sendEvent` method shall serialize the `contentType` property of the message as a key-value pair on the topic with the key `$.ct`. **]**

**SRS_NODE_DEVICE_MQTT_16_023: [** The `sendEvent` method shall connect the Mqtt connection if it is disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_024: [** The `sendEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to establish a connection. **]**

**SRS_NODE_DEVICE_MQTT_16_025: [** If `sendEvent` is called while `MqttBase` is establishing the connection, it shall wait until the connection is established and then send the event. **]**

**SRS_NODE_DEVICE_MQTT_16_035: [** If `sendEvent` is called while `MqttBase` is establishing the connection, and `MqttBase` fails to establish the connection, then sendEvent shall fail. **]**

**SRS_NODE_DEVICE_MQTT_16_026: [** If `sendEvent` is called while `MqttBase` is disconnecting, it shall wait until the disconnection is complete and then try to connect again and send the event.  **]**

**SRS_NODE_DEVICE_MQTT_16_027: [** The `sendEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to publish the message. **]**

### sendEventBatch(messages, done)
**SRS_NODE_DEVICE_MQTT_16_056: [** The `sendEventBatch` method shall throw a `NotImplementedError` **]**

### sendOutputEvent(outputName: string, message: Message, done: (err?: Error, result?: results.MessageEnqueued) => void): void;

**SRS_NODE_DEVICE_MQTT_18_035: [** The `sendOutputEvent` method shall call the publish method on `MqttBase`. **]**

**SRS_NODE_DEVICE_MQTT_18_036: [** If a `moduleId` was not specified in the transport connection, the `sendOutputEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/messages/events/`. **]**

**SRS_NODE_DEVICE_MQTT_18_037: [** If a `moduleId` was specified in the transport connection, the `sendOutputEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/<moduleId>/messages/events/`. **]**

**SRS_NODE_DEVICE_MQTT_18_038: [** If the outputEvent message has properties, the property keys and values shall be uri-encoded, then serialized and appended at the end of the topic with the following convention: `<key>=<value>&<key2>=<value2>&<key3>=<value3>(...)`. **]**

**SRS_NODE_DEVICE_MQTT_18_039: [** The `sendOutputEvent` method shall use QoS level of 1. **]**

**SRS_NODE_DEVICE_MQTT_18_040: [** The `sendOutputEvent` method shall serialize the `messageId` property of the message as a key-value pair on the topic with the key `$.mid`. **]**

**SRS_NODE_DEVICE_MQTT_18_041: [** The `sendOutputEvent` method shall serialize the `correlationId` property of the message as a key-value pair on the topic with the key `$.cid`. **]**

**SRS_NODE_DEVICE_MQTT_18_042: [** The `sendOutputEvent` method shall serialize the `userId` property of the message as a key-value pair on the topic with the key `$.uid`. **]**

**SRS_NODE_DEVICE_MQTT_18_043: [** The `sendOutputEvent` method shall serialize the `to` property of the message as a key-value pair on the topic with the key `$.to`. **]**

**SRS_NODE_DEVICE_MQTT_18_044: [** The `sendOutputEvent` method shall serialize the `expiryTimeUtc` property of the message as a key-value pair on the topic with the key `$.exp`. **]**

**SRS_NODE_DEVICE_MQTT_18_045: [** The `sendOutputEvent` method shall connect the Mqtt connection if it is disconnected. **]**

**SRS_NODE_DEVICE_MQTT_18_046: [** The `sendOutputEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to establish a connection. **]**

**SRS_NODE_DEVICE_MQTT_18_047: [** If `sendOutputEvent` is called while `MqttBase` is establishing the connection, it shall wait until the connection is established and then send the event. **]**

**SRS_NODE_DEVICE_MQTT_18_048: [** If `sendOutputEvent` is called while `MqttBase` is establishing the connection, and `MqttBase` fails to establish the connection, then sendEvent shall fail. **]**

**SRS_NODE_DEVICE_MQTT_18_049: [** If `sendOutputEvent` is called while `MqttBase` is disconnecting, it shall wait until the disconnection is complete and then try to connect again and send the event. **]**

**SRS_NODE_DEVICE_MQTT_18_050: [** The `sendOutputEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to publish the message. **]**

**SRS_NODE_DEVICE_MQTT_18_068: [** The `sendOutputEvent` method shall serialize the `outputName` property of the message as a key-value pair on the topic with the key `$.on`. **]**

### sendOutputEventBatch(outputName: string, messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void {

**SRS_NODE_DEVICE_MQTT_18_051: [** `sendOutputEventBatch` shall throw a `NotImplementedError` exception. **]**

### abandon(message, done)

The `abandon` method is there for compatibility purposes with other transports but will throw because the MQTT protocol doesn't support abandoning messages.

**SRS_NODE_DEVICE_MQTT_16_004: [** The `abandon` method shall throw because MQTT doesn’t support abandoning messages. **]**

### complete(message, done)

The `complete` method is there for compatibility purposes with other transports but doesn't do anything because messages are automatically acknowledged.

**SRS_NODE_DEVICE_MQTT_16_005: [** The `complete` method shall call the `done` callback given as argument immediately since all messages are automatically completed. **]**

### reject(message, done)

The `reject` method is there for compatibility purposes with other transports but will throw because the MQTT protocol doesn't support rejecting messages.

**SRS_NODE_DEVICE_MQTT_16_006: [** The `reject` method shall throw because MQTT doesn’t support rejecting messages. **]**

### updateSharedAccessSignature(sharedAccessSignature, done)

**SRS_NODE_DEVICE_MQTT_16_007: [** The `updateSharedAccessSignature` method shall save the new shared access signature given as a parameter to its configuration. **]**

**SRS_NODE_DEVICE_MQTT_16_028: [** The `updateSharedAccessSignature` method shall call the `updateSharedAccessSignature` method on the `MqttBase` object if it is connected. **]**

**SRS_NODE_DEVICE_MQTT_16_009: [** The `updateSharedAccessSignature` method shall call the `done` method with an `Error` object if `MqttBase.updateSharedAccessSignature` fails. **]**

**SRS_NODE_DEVICE_MQTT_16_010: [** The `updateSharedAccessSignature` method shall call the `done` callback with a `null` error object and a `SharedAccessSignatureUpdated` object with its `needToReconnect` property set to `false`, if `MqttBase.updateSharedAccessSignature` succeeds. **]**

### setOptions(options, done)

**SRS_NODE_DEVICE_MQTT_16_011: [** The `setOptions` method shall throw a `ReferenceError` if the `options` argument is falsy **]**

**SRS_NODE_DEVICE_MQTT_16_015: [** The `setOptions` method shall throw an `ArgumentError` if the `cert` property is populated but the device uses symmetric key authentication. **]**

**SRS_NODE_DEVICE_MQTT_16_012: [** The `setOptions` method shall update the existing configuration of the MQTT transport with the content of the `options` object. **]**

**SRS_NODE_DEVICE_MQTT_16_013: [** If a `done` callback function is passed as a argument, the `setOptions` method shall call it when finished with no arguments. **]**

**SRS_NODE_DEVICE_MQTT_16_014: [** The `setOptions` method shall not throw if the `done` argument is not passed. **]**

**SRS_NODE_DEVICE_MQTT_16_069: [** The `setOptions` method shall obtain the current credentials by calling `getDeviceCredentials` on the `AuthenticationProvider` passed to the constructor as an argument. **]**

**SRS_NODE_DEVICE_MQTT_16_070: [** The `setOptions` method shall call its callback with the error returned by `getDeviceCredentials` if it fails to return the credentials. **]**

### onDeviceMethod(methodName, methodCallback)

**SRS_NODE_DEVICE_MQTT_16_066: [** The `methodCallback` parameter shall be called whenever a `method_<methodName>` is emitted and device methods have been enabled. **]**

### sendMethodResponse(response, done)

The `sendMethodResponse` method sends the given response to the method's topic on an IoT Hub on behalf of the device indicated in the constructor argument. The `response` argument is an object that has the following shape:

```
interface StringMap {
  [key: string]: string;
}

interface DeviceMethodResponse {
  requestId: string;
  properties: StringMap;
  status: number;
  bodyParts: Buffer[];
}
```

**SRS_NODE_DEVICE_MQTT_13_001: [** `sendMethodResponse` shall throw an `Error` if `response` is falsy or does not conform to the shape defined by `DeviceMethodResponse`. **]**

**SRS_NODE_DEVICE_MQTT_13_002: [** `sendMethodResponse` shall build an MQTT topic name in the format: `$iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES>` where `<STATUS>` is `response.status`. **]**

**SRS_NODE_DEVICE_MQTT_13_003: [** `sendMethodResponse` shall build an MQTT topic name in the format: `$iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES>` where `<REQUEST ID>` is `response.requestId`. **]**

**SRS_NODE_DEVICE_MQTT_13_004: [** `sendMethodResponse` shall build an MQTT topic name in the format: `$iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES>` where `<PROPERTIES>` is URL encoded. **]**

**SRS_NODE_DEVICE_MQTT_13_005: [** `sendMethodResponse` shall concatenate `response.bodyParts` into a single `Buffer` and publish the message to the MQTT topic name. **]**

**SRS_NODE_DEVICE_MQTT_13_006: [** If the MQTT publish fails then an error that has been translated using the `translateError` method shall be returned via the `done` callback's first parameter. **]**

**SRS_NODE_DEVICE_MQTT_13_007: [** If the MQTT publish is successful then the `done` callback shall be invoked passing `null` for the first parameter. **]**

**SRS_NODE_DEVICE_MQTT_16_034: [** The `sendMethodResponse` method shall fail with a `NotConnectedError` if the `MqttBase` object is not connected. **]**

### getTwin(done)

The `getTwin` method is used to retrieve the device twin.

**SRS_NODE_DEVICE_MQTT_16_075: [** `getTwin` shall establish the MQTT connection by calling `connect` on the `MqttBase` object if it is disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_076: [** `getTwin` shall call its callback with an error if it fails to connect the transport **]**

**SRS_NODE_DEVICE_MQTT_16_077: [** `getTwin` shall call the `getTwin` method on the `MqttTwinClient` object and pass it its callback. **]**

### updateTwinReportedProperties

The `updateTwinReportedProperties` method is used to retrieve the device twin.

**SRS_NODE_DEVICE_MQTT_16_078: [** `updateTwinReportedProperties` shall establish the MQTT connection by calling `connect` on the `MqttBase` object if it is disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_079: [** `updateTwinReportedProperties` shall call its callback with an error if it fails to connect the transport **]**

**SRS_NODE_DEVICE_MQTT_16_080: [** `updateTwinReportedProperties` shall call the `updateTwinReportedProperties` method on the `MqttTwinClient` object and pass it its callback. **]**

### enableC2D

**SRS_NODE_DEVICE_MQTT_16_047: [** `enableC2D` shall connect the MQTT connection if it is disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_048: [** `enableC2D` shall calls its callback with an `Error` object if it fails to connect. **]**

**SRS_NODE_DEVICE_MQTT_16_049: [** `enableC2D` shall subscribe to the MQTT topic for messages with a QoS of `1`. **]**

**SRS_NODE_DEVICE_MQTT_16_050: [** `enableC2D` shall call its callback with no arguments when the `SUBACK` packet is received. **]**

**SRS_NODE_DEVICE_MQTT_16_052: [** `enableC2D` shall call its callback with an `Error` if subscribing to the topic fails. **]**

### enableMethods

**SRS_NODE_DEVICE_MQTT_16_038: [** `enableMethods` shall connect the MQTT connection if it is disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_039: [** `enableMethods` shall calls its callback with an `Error` object if it fails to connect. **]**

**SRS_NODE_DEVICE_MQTT_16_040: [** `enableMethods` shall subscribe to the MQTT topic for direct methods. **]**

**SRS_NODE_DEVICE_MQTT_16_051: [** `enableMethods` shall call its callback with no arguments when the `SUBACK` packet is received. **]**

**SRS_NODE_DEVICE_MQTT_16_053: [** `enableMethods` shall call its callback with an `Error` if subscribing to the topic fails. **]**

### enableTwinDesiredPropertiesUpdates

**SRS_NODE_DEVICE_MQTT_16_057: [** `enableTwinDesiredPropertiesUpdates` shall connect the MQTT connection if it is disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_058: [** `enableTwinDesiredPropertiesUpdates` shall calls its callback with an `Error` object if it fails to connect. **]**

**SRS_NODE_DEVICE_MQTT_16_059: [** `enableTwinDesiredPropertiesUpdates` shall subscribe to the MQTT topics for twins. **]**

**SRS_NODE_DEVICE_MQTT_16_060: [** `enableTwinDesiredPropertiesUpdates` shall call its callback with no arguments when the `SUBACK` packet is received. **]**

**SRS_NODE_DEVICE_MQTT_16_061: [** `enableTwinDesiredPropertiesUpdates` shall call its callback with an `Error` if subscribing to the topics fails. **]**

### enableInputMessages(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_MQTT_18_059: [** `enableInputMessages` shall connect the MQTT connection if it is disconnected. **]**

**SRS_NODE_DEVICE_MQTT_18_060: [** `enableInputMessages` shall calls its callback with an `Error` object if it fails to connect. **]**

**SRS_NODE_DEVICE_MQTT_18_061: [** `enableInputMessages` shall subscribe to the MQTT topic for inputMessages. **]**

**SRS_NODE_DEVICE_MQTT_18_062: [** `enableInputMessages` shall call its callback with no arguments when the `SUBACK` packet is received. **]**

**SRS_NODE_DEVICE_MQTT_18_063: [** `enableInputMessages` shall call its callback with an `Error` if subscribing to the topic fails. **]**

### disableC2D

**SRS_NODE_DEVICE_MQTT_16_041: [** `disableC2D` shall call its callback immediately if the MQTT connection is already disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_042: [** `disableC2D` shall unsubscribe from the topic for C2D messages. **]**

**SRS_NODE_DEVICE_MQTT_16_054: [** `disableC2D` shall call its callback with no arguments when the `UNSUBACK` packet is received. **]**

**SRS_NODE_DEVICE_MQTT_16_043: [** `disableC2D` shall call its callback with an `Error` if an error is received while unsubscribing. **]**

### disableMethods

**SRS_NODE_DEVICE_MQTT_16_044: [** `disableMethods` shall call its callback immediately if the MQTT connection is already disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_045: [** `disableMethods` shall unsubscribe from the topic for direct methods. **]**

**SRS_NODE_DEVICE_MQTT_16_055: [** `disableMethods` shall call its callback with no arguments when the `UNSUBACK` packet is received. **]**

**SRS_NODE_DEVICE_MQTT_16_046: [** `disableMethods` shall call its callback with an `Error` if an error is received while unsubscribing. **]**

### disableTwinDesiredPropertiesUpdates

**SRS_NODE_DEVICE_MQTT_16_062: [** `disableTwinDesiredPropertiesUpdates` shall call its callback immediately if the MQTT connection is already disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_063: [** `disableTwinDesiredPropertiesUpdates` shall unsubscribe from the topics for twin messages. **]**

**SRS_NODE_DEVICE_MQTT_16_064: [** `disableTwinDesiredPropertiesUpdates` shall call its callback with no arguments when the `UNSUBACK` packet is received. **]**

**SRS_NODE_DEVICE_MQTT_16_065: [** `disableTwinDesiredPropertiesUpdates` shall call its callback with an `Error` if an error is received while unsubscribing. **]**

### disableInputMessages(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_MQTT_18_064: [** `disableInputMessages` shall call its callback immediately if the MQTT connection is already disconnected. **]**

**SRS_NODE_DEVICE_MQTT_18_065: [** `disableInputMessages` shall unsubscribe from the topic for inputMessages. **]**

**SRS_NODE_DEVICE_MQTT_18_066: [** `disableInputMessages` shall call its callback with no arguments when the `UNSUBACK` packet is received. **]**

**SRS_NODE_DEVICE_MQTT_18_067: [** `disableInputMessages` shall call its callback with an `Error` if an error is received while unsubscribing. **]**

### message Event

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_004: [** If there is a listener for the `message` event, a `message` event shall be emitted for each message received. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_005: [** When a `message` event is emitted, the parameter shall be of type `Message`. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_007: [** When a message is received, the receiver shall populate the generated `Message` object `properties` property with the user properties serialized in the topic. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_008: [** When a message is received, the receiver shall populate the generated `Message` object `messageId` with the value of the property `$.mid` serialized in the topic, if present. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_009: [** When a message is received, the receiver shall populate the generated `Message` object `to` with the value of the property `$.to` serialized in the topic, if present. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_010: [** When a message is received, the receiver shall populate the generated `Message` object `expiryTimeUtc` with the value of the property `$.exp` serialized in the topic, if present. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_011: [** When a message is received, the receiver shall populate the generated `Message` object `correlationId` with the value of the property `$.cid` serialized in the topic, if present. **]**

**SRS_NODE_DEVICE_MQTT_RECEIVER_16_012: [** When a message is received, the receiver shall populate the generated `Message` object `userId` with the value of the property `$.uid` serialized in the topic, if present. **]**

### method Event

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

### inputMessage event

**SRS_NODE_DEVICE_MQTT_18_057: [** An `inputMessage` event shall be emitted for each message received. **]**

**SRS_NODE_DEVICE_MQTT_18_058: [** When an `inputMessage` event is received, Mqtt shall extract the inputName from the topic according to the following convention: 'devices/<deviceId>/modules/<moduleId>/inputs/<inputName>' **]**

**SRS_NODE_DEVICE_MQTT_18_056: [** When an `inputMessage` event is emitted, the first parameter shall be the inputName and the second parameter shall be of type `Message`. **]**

