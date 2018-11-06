# azure-iot-common.MqttBase Requirements

## Overview
MqttBase provides generalized MQTT support for higher-level libraries that will be communicating with Azure IoT Hub. It exposes functions for Connect, Publish, Subscribe and Receive operations.

## Example usage

```js
'use strict';
var MqttBase = require('azure-iot-device-mqtt').MqttBase;
var config = {
  host: [Host name goes here],
  deviceId: [Device ID goes here],
  sharedAccessSignature: [SAS token goes here],
  gatewayHostName: [Gateway host address goes here]
};

var base = new MqttBase(config));
base.connect();
base.publish(message);
base.subscribe();

base.receive(function (topic, msg) {
  console.log('Topic: ' + topic.toString());
  console.log('Received data: ' + msg.toString());
  }
};
```

## Public Interface

### MqttBase(config)
The `Mqtt` constructor receives the configuration parameters to configure the MQTT.JS library to connect to an IoT hub.

**SRS_NODE_COMMON_MQTT_BASE_16_004: [** The `Mqtt` constructor shall instanciate the default MQTT.JS library if no argument is passed to it. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_005: [** The `Mqtt` constructor shall use the object passed as argument instead of the default MQTT.JS library if it's not falsy. **]**

### MqttBase.connect(config, done)
The `connect` method establishes a connection with the server using the config object passed in the arguments.
**SRS_NODE_COMMON_MQTT_BASE_16_006: [** The `connect` method shall throw a ReferenceError if the config argument is falsy, or if one of the following properties of the config argument is falsy: uri, clientId, username, and one of sharedAccessSignature or x509.cert and x509.key. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_002: [** The `connect` method shall use the authentication parameters contained in the `config` argument to connect to the server. **]**

**SRS_NODE_COMMON_MQTT_BASE_18_001: [** The `connect` method shall set the `ca` option based on the `ca` string passed in the `options` structure via the `setOptions` function. **]**

**SRS_NODE_COMMON_MQTT_BASE_18_002: [** The `connect` method shall set the `wsOptions.agent` option based on the `mqtt.webSocketAgent` object passed in the `options` structure via the `setOptions` function. **]**

**SRS_NODE_COMMON_MQTT_BASE_12_005: [** The `connect` method shall call connect on MQTT.JS  library and call the `done` callback with a `null` error object and the result as a second argument. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_003: [** The `connect` method shall call the `done` callback with a standard javascript `Error` object if the connection failed. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_016: [** The `connect` method shall configure the `keepalive` ping interval to 3 minutes by default since the Azure Load Balancer TCP Idle timeout default is 4 minutes. (https://docs.microsoft.com/en-us/azure/load-balancer/load-balancer-tcp-idle-timeout) **]**

### MqttBase.disconnect(done)
The `disconnect` method closes the connection to the server.

**SRS_NODE_COMMON_MQTT_BASE_16_001: [** The `disconnect` method shall call the `done` callback when the connection to the server has been closed. **]**

### Mqtt.publish(topic, payload, options, callback)

**SRS_NODE_COMMON_MQTT_BASE_16_017: [** The `publish` method publishes a `payload` on a `topic` using `options`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_018: [** The `publish` method shall throw a `ReferenceError` if the topic is falsy. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_020: [** The `publish` method shall call the callback with a `NotConnectedError` if the connection hasn't been established prior to calling `publish`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_021: [** The  `publish` method shall call `publish` on the mqtt client object and call the `callback` argument with `null` and the `puback` object if it succeeds. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_022: [** The `publish` method shall call the `callback` argument with an Error if the operation fails. **]**


### MqttBase.subscribe(topic, options, callback)

**SRS_NODE_COMMON_MQTT_BASE_12_008: [** The `subscribe` method shall call `subscribe`  on MQTT.JS  library and pass it the `topic` and `options` arguments. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_023: [** The `subscribe` method shall throw a `ReferenceError` if the topic is falsy. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_024: [** The `subscribe` method shall call the callback with `null` and the `suback` object if the mqtt library successfully subscribes to the `topic`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_025: [** The `subscribe` method shall call the callback with an `Error` if the mqtt library fails to subscribe to the `topic`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_026: [** The `subscribe` method shall call the callback with a `NotConnectedError` if the connection hasn't been established prior to calling `publish`. **]**

### MqttBase.unsubscribe(topic, callback)

**SRS_NODE_COMMON_MQTT_BASE_16_031: [** The `unsubscribe` method shall throw a `ReferenceError` if the `topic` argument is falsy. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_027: [** The `unsubscribe` method shall call the callback with a `NotConnectedError` if the connection hasn't been established prior to calling `publish`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_028: [** The `unsubscribe` method shall call `unsubscribe` on the mqtt library and pass it the `topic`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_029: [** The `unsubscribe` method shall call the `callback` argument with no arguments if the operation succeeds. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_030: [** The `unsubscribe` method shall call the `callback` argument with an `Error` if the operation fails. **]**


### MqttBase.updateSharedAccessSignature(sharedAccessSignature, callback)

**SRS_NODE_COMMON_MQTT_BASE_16_032: [** The `updateSharedAccessSignature` method shall throw a `ReferenceError` if the `sharedAccessSignature` argument is falsy. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_033: [** The `updateSharedAccessSignature` method shall disconnect and reconnect the mqtt client with the new `sharedAccessSignature`. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_034: [** The `updateSharedAccessSignature` method shall not trigger any network activity if the mqtt client is not connected. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_035: [** The `updateSharedAccessSignature` method shall call the `callback` argument with no parameters if the operation succeeds. **]**

**SRS_NODE_COMMON_MQTT_BASE_16_036: [** The `updateSharedAccessSignature` method shall call the `callback` argument with an `Error` if the operation fails. **]**