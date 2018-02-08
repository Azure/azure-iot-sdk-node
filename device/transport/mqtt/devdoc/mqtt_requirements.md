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

**SRS_NODE_DEVICE_MQTT_16_016: [** The `Mqtt` constructor shall initialize the `uri` property of the `config` object to `mqtts://<host>`. **]**

**SRS_NODE_DEVICE_MQTT_16_017: [** The `MqttWs` constructor shall initialize the `uri` property of the `config` object to `wss://<host>:443/$iothub/websocket`. **]**

**SRS_NODE_DEVICE_MQTT_18_025: [** If the `Mqtt` constructor receives a second parameter, it shall be used as a provider in place of mqtt.js **]**

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

### sendEvent(message)

The `sendEvent` method sends an event to an IoT hub on behalf of the device indicated in the constructor argument.

**SRS_NODE_DEVICE_MQTT_12_005: [** The `sendEvent` method shall call the publish method on `MqttBase`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_008: [** If a moduleId was not specified in the transport connection, the `sendEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/messages/events/`. **]**

**SRS_NODE_DEVICE_MQTT_18_027: [** If a moduleId was specified in the transport connection, the `sendEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/modules/<moduleId>/messages/events/`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_009: [** If the message has properties, the property keys and values shall be uri-encoded, then serialized and appended at the end of the topic with the following convention: `<key>=<value>&<key2>=<value2>&<key3>=<value3>(...)`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_010: [** The `sendEvent` method shall use QoS level of 1. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_011: [** The `sendEvent` method shall serialize the `messageId` property of the message as a key-value pair on the topic with the key `$.mid`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_012: [** The `sendEvent` method shall serialize the `correlationId` property of the message as a key-value pair on the topic with the key `$.cid`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_013: [** The `sendEvent` method shall serialize the `userId` property of the message as a key-value pair on the topic with the key `$.uid`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_014: [** The `sendEvent` method shall serialize the `to` property of the message as a key-value pair on the topic with the key `$.to`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_015: [** The `sendEvent` method shall serialize the `expiryTimeUtc` property of the message as a key-value pair on the topic with the key `$.exp`. **]**

**SRS_NODE_DEVICE_MQTT_18_028: [** The `sendEvent` method shall serialize the `outputName` property of the message as a key-value pair on the topic with the key `$.on`. **]**

**SRS_NODE_DEVICE_MQTT_18_027: [** The `sendEvent` method shall serialize the `outputName` property of the message as a key-value pair on the topic with the key `$.on`. **]**

**SRS_NODE_DEVICE_MQTT_16_023: [** The `sendEvent` method shall connect the Mqtt connection if it is disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_024: [** The `sendEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to establish a connection. **]**

**SRS_NODE_DEVICE_MQTT_16_025: [** If `sendEvent` is called while `MqttBase` is establishing the connection, it shall wait until the connection is established and then send the event. **]**

**SRS_NODE_DEVICE_MQTT_16_035: [** If `sendEvent` is called while `MqttBase` is establishing the connection, and `MqttBase` fails to establish the connection, then sendEvent shall fail. **]**

**SRS_NODE_DEVICE_MQTT_16_026: [** If `sendEvent` is called while `MqttBase` is disconnecting, it shall wait until the disconnection is complete and then try to connect again and send the event.  **]**

**SRS_NODE_DEVICE_MQTT_16_027: [** The `sendEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to publish the message. **]**

### sendEventBatch(messages, done)
**SRS_NODE_DEVICE_MQTT_16_056: [** The `sendEventBatch` method shall throw a `NotImplementedError` **]**


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

### sendTwinRequest(method, resource, properties, body, done)

The `sendTwinRequest` method sends the given body to the given endpoint on an IoT hub on behalf of the device indicated in the constructor argument.

**SRS_NODE_DEVICE_MQTT_18_001: [** The `sendTwinRequest` method shall call the publish method on `MqttBase`. **]**

**SRS_NODE_DEVICE_MQTT_18_008: [** The `sendTwinRequest` method shall not throw if the `done` callback is falsy. **]**

**SRS_NODE_DEVICE_MQTT_18_009: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `method` argument is falsy. **]**

**SRS_NODE_DEVICE_MQTT_18_010: [** The `sendTwinRequest` method shall throw an `ArgumentError` if the `method` argument is not a string. **]**

**SRS_NODE_DEVICE_MQTT_18_019: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `resource` argument is falsy. **]**

**SRS_NODE_DEVICE_MQTT_18_020: [** The `sendTwinRequest` method shall throw an `ArgumentError` if the `resource` argument is not a string. **]**

**SRS_NODE_DEVICE_MQTT_18_011: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `properties` argument is falsy. **]**

**SRS_NODE_DEVICE_MQTT_18_012: [** The `sendTwinRequest` method shall throw an `ArgumentError` if the `properties` argument is not a an object. **]**

**SRS_NODE_DEVICE_MQTT_18_018: [** The `sendTwinRequest` method shall throw an `ArgumentError` if any members of the `properties` object fails to serialize to a string **]**

**SRS_NODE_DEVICE_MQTT_18_013: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `body` argument is falsy. **]**

**SRS_NODE_DEVICE_MQTT_18_022: [** The `propertyQuery` string shall be constructed from the `properties` object. **]**

**SRS_NODE_DEVICE_MQTT_18_023: [** Each member of the `properties` object shall add another 'name=value&' pair to the `propertyQuery` string. **]**

**SRS_NODE_DEVICE_MQTT_18_004: [** If a `done` callback is passed as an argument, The `sendTwinRequest` method shall call `done` after the body has been published. **]**

**SRS_NODE_DEVICE_MQTT_18_021: [** The topic name passed to the publish method shall be $iothub/twin/`method`/`resource`/?`propertyQuery` **]**

**SRS_NODE_DEVICE_MQTT_18_015: [** The `sendTwinRequest` shall publish the request with QOS=0, DUP=0, and Retain=0 **]**

**SRS_NODE_DEVICE_MQTT_18_016: [** If an error occurs in the `sendTwinRequest` method, the `done` callback shall be called with the error as the first parameter. **]**

**SRS_NODE_DEVICE_MQTT_18_024: [** If an error occurs, the `sendTwinRequest` shall use the MQTT `translateError` module to convert the mqtt-specific error to a transport agnostic error before passing it into the `done` callback. **]**

**SRS_NODE_DEVICE_MQTT_18_017: [** If the `sendTwinRequest` method is successful, the first parameter to the `done` callback shall be null and the second parameter shall be a MessageEnqueued object. **]**

**SRS_NODE_DEVICE_MQTT_16_029: [** The `sendTwinRequest` method shall connect the Mqtt connection if it is disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_031: [** If `sendTwinRequest` is called while `MqttBase` is establishing the connection, it shall wait until the connection is established and then send the twin request. **]**

**SRS_NODE_DEVICE_MQTT_16_036: [** If `sendTwinRequest` is called while `MqttBase` is establishing the connection, and `MqttBase` fails to establish the connection, then `sendTwinRequest` shall fail. **]**

**SRS_NODE_DEVICE_MQTT_16_032: [** If `sendTwinRequest` is called while `MqttBase` is disconnecting, it shall wait until the disconnection is complete and then try to connect again and send the twin request. **]**

**SRS_NODE_DEVICE_MQTT_16_033: [** The `sendTwinRequest` method shall call its callback with an error translated using `translateError` if `MqttBase` fails to connect. **]**

### getTwinReceiver(done)

The `getTwinReceiver` method creates a `MqttTwinReceiver` object for the twin response endpoint and returns it, or returns the existing instance.

**SRS_NODE_DEVICE_MQTT_18_014: [** The `getTwinReceiver` method shall throw an `ReferenceError` if done is falsy **]**

**SRS_NODE_DEVICE_MQTT_18_005: [** The `getTwinReceiver` method shall call the `done` method after it completes **]**

**SRS_NODE_DEVICE_MQTT_18_006: [** If a twin receiver for this endpoint did not previously exist, the `getTwinReceiver` method should return the a new `MqttTwinReceiver` object as the second parameter of the `done` function with null as the first parameter. **]**

**SRS_NODE_DEVICE_MQTT_18_007: [** If a twin receiver for this endpoint previously existed, the `getTwinReceiver` method should return the preexisting `MqttTwinReceiver` object as the second parameter of the `done` function with null as the first parameter. **]**

### enableC2D

**SRS_NODE_DEVICE_MQTT_16_047: [** `enableC2D` shall connect the MQTT connection if it is disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_048: [** `enableC2D` shall calls its callback with an `Error` object if it fails to connect. **]**

**SRS_NODE_DEVICE_MQTT_16_049: [** `enableC2D` shall subscribe to the MQTT topic for messages. **]**

**SRS_NODE_DEVICE_MQTT_16_050: [** `enableC2D` shall call its callback with no arguments when the `SUBACK` packet is received. **]**

**SRS_NODE_DEVICE_MQTT_16_052: [** `enableC2D` shall call its callback with an `Error` if subscribing to the topic fails. **]**

### enableMethods

**SRS_NODE_DEVICE_MQTT_16_038: [** `enableMethods` shall connect the MQTT connection if it is disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_039: [** `enableMethods` shall calls its callback with an `Error` object if it fails to connect. **]**

**SRS_NODE_DEVICE_MQTT_16_040: [** `enableMethods` shall subscribe to the MQTT topic for direct methods. **]**

**SRS_NODE_DEVICE_MQTT_16_051: [** `enableMethods` shall call its callback with no arguments when the `SUBACK` packet is received. **]**

**SRS_NODE_DEVICE_MQTT_16_053: [** `enableMethods` shall call its callback with an `Error` if subscribing to the topic fails. **]**

### enableTwin

**SRS_NODE_DEVICE_MQTT_16_057: [** `enableTwin` shall connect the MQTT connection if it is disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_058: [** `enableTwin` shall calls its callback with an `Error` object if it fails to connect. **]**

**SRS_NODE_DEVICE_MQTT_16_059: [** `enableTwin` shall subscribe to the MQTT topics for twins. **]**

**SRS_NODE_DEVICE_MQTT_16_060: [** `enableTwin` shall call its callback with no arguments when the `SUBACK` packet is received. **]**

**SRS_NODE_DEVICE_MQTT_16_061: [** `enableTwin` shall call its callback with an `Error` if subscribing to the topics fails. **]**

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

### disableTwin

**SRS_NODE_DEVICE_MQTT_16_062: [** `disableTwin` shall call its callback immediately if the MQTT connection is already disconnected. **]**

**SRS_NODE_DEVICE_MQTT_16_063: [** `disableTwin` shall unsubscribe from the topics for twin messages. **]**

**SRS_NODE_DEVICE_MQTT_16_064: [** `disableTwin` shall call its callback with no arguments when the `UNSUBACK` packet is received. **]**

**SRS_NODE_DEVICE_MQTT_16_065: [** `disableTwin` shall call its callback with an `Error` if an error is received while unsubscribing. **]**

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

**SRS_NODE_DEVICE_MQTT_18_033: [** When the `inputMessage` event is subscribed to, if no `moduleId` was specified through the `constructor`, `Mqtt` shall throw an `InvalidOperationError` exception. **]**

**SRS_NODE_DEVICE_MQTT_18_034: [** When the `inputMessage` event is subscribed to, `Mqtt` shall subscribe to the "devices/<deviceId>/modules/<moduleId>/#" topic **]**

**SRS_NODE_DEVICE_MQTT_18_035: [** When an `inputMessage` event is emitted, the parameter shall be of type `Message`. **]**

**SRS_NODE_DEVICE_MQTT_18_036: [** When an `inputMessage` is received, the topic shall be parsed as "devices/<deviceId>/modules/<moduleId>/inputs/<inputName>/<queryString>" **]**

**SRS_NODE_DEVICE_MQTT_18_037: [** When an `inputMessage` is received, the receiver shall populated the generated `Message` object `inputName` property from the inputName in the topic name. **]**

**SRS_NODE_DEVICE_MQTT_18_038: [** When an `inputMessage` is received, the receiver shall populate the generated `Message` object `properties` property with the user properties serialized in the topic. **]**

**SRS_NODE_DEVICE_MQTT_18_039: [** When an `inputMessage` is received, the receiver shall populate the generated `Message` object `messageId` with the value of the property `$.mid` serialized in the topic, if present. **]**

**SRS_NODE_DEVICE_MQTT_18_040: [** When an `inputMessage` is received, the receiver shall populate the generated `Message` object `to` with the value of the property `$.to` serialized in the topic, if present. **]**

**SRS_NODE_DEVICE_MQTT_18_041: [** When an `inputMessage` is received, the receiver shall populate the generated `Message` object `expiryTimeUtc` with the value of the property `$.exp` serialized in the topic, if present. **]**

**SRS_NODE_DEVICE_MQTT_18_042: [** When an `inputMessage` is received, the receiver shall populate the generated `Message` object `correlationId` with the value of the property `$.cid` serialized in the topic, if present. **]**

**SRS_NODE_DEVICE_MQTT_18_043: [** When an `inputMessage` is received, the receiver shall populate the generated `Message` object `userId` with the value of the property `$.uid` serialized in the topic, if present. **]**

