# AmqpDeviceMethodClient Requirements

## Overview
The `AmqpDeviceMethodClient` object encapsulates the logic necessary to receive device methods over AMQP and send the responses to those method calls.
Receiving a method request and responding to it requires 2 AMQP links and both of them must be established before the a device is considered capable of
receiving method calls by the IoT hub service.

The method response will be encapsulated in a message with a special property (`IoThub-status`) that contains a status code (`200` means success, anything else is failure)
and the payload of the response itself must be valid JSON. The response message must also have the same `correlationId` property as the request.

## Usage
```js
var Amqp = require('azure-iot-device-amqp').Amqp;
var config = {
  deviceId: '<deviceId>',
  host: '<host>',
  sharedAccessSignature: '<sas>'
};

var amqpClient = new Amqp(config);
var client = new AmqpDeviceMethodClient(config, amqpClient);

client.onDeviceMethod('lockDoor', function(methodRequest) {
  // Do something with the payload of the method request.
});

client.sendMethodResponse(methodResponse, function(err, result) {
  if (err) {
    // sending the method response failed
  } else {
    // method response was sent successfully
  }
});

client.attach(function (err) {
  // attaches the sender and receiver links
});
```

## Public API

### AmqpDeviceMethodClient(config, amqpClient) [constructor]

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_003: [** The `AmqpDeviceMethodClient` shall inherit from the `EventEmitter` class. **]**

### attach(callback)

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_027: [** The `attach` method shall call the `getDeviceCredentials` method on the `authenticationProvider` object passed as an argument to the constructor to retrieve the device id. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_028: [** The `attach` method shall call its callback with an error if the call to `getDeviceCredentials` fails with an error. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_014: [** The `AmqpDeviceMethodClient` object shall set 2 properties of any AMQP link that it create:
- `com.microsoft:api-version` shall be set to the current API version in use.
- `com.microsoft:channel-correlation-id` shall be set to the string "methods:" followed by a guid **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_019: [** The `attach` method shall create a SenderLink and a ReceiverLink and attach them. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_020: [** The `attach` method shall immediately call the callback if the links are already attached. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_021: [** The `attach` method shall subscribe to the `message` and `error` events on the `ReceiverLink` object associated with the method endpoint. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_015: [** The `AmqpDeviceMethodClient` object shall forward any error received on a link to any listening client in an `error` event. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_017: [** The endpoint used to for the sender and receiver link shall be `/devices/<device-id>/methods/devicebound` **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_18_001: [** If a `moduleId` value was set in the device's connection string, The endpoint used to for the sender and receiver link shall be `/devices/<deviceId>/modules/<moduleId>/methods/devicebound` **]**

### detach(callback)

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_022: [** The `detach` method shall detach both Sender and Receiver links. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_023: [** The `detach` method shall call the callback with no arguments if the links are properly detached. **]**

### forceDetach(err)

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_024: [** The `forceDetach` method shall forcefully detach all links. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_025: [** The `forceDetach` method shall immediately return if all links are already detached. **]**

### onDeviceMethod(methodName, callback)

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_004: [** The `onDeviceMethod` method shall throw a `ReferenceError` if the `methodName` argument is falsy. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_018: [** The `onDeviceMethod` method shall throw an `ArgumentError` if the `methodName` argument is not a string. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_006: [** The `onDeviceMethod` method shall save the `callback` argument so that it is called when the corresponding method call is received. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_016: [** When a message is received on the method endpoint, a new object describing the method request shall be created with the following properties:
- `requestId`: a UUID that uniquely identifies this method name and is stored as the correlationId in the incoming message
- `body`: the payload of the message received, which is also the payload of the method request
- `methods`: an object with a `methodName` property containing the name of the method that is being called, extracted from the incoming message's application property named `IoThub-methodname`. **]**

### sendMethodResponse(methodResponse, callback)

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_007: [** The `sendMethodResponse` method shall throw a `ReferenceError` if the `methodResponse` object is falsy. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_008: [** The `sendMethodResponse` method shall throw an `ArgumentError` if the `methodResponse.status` property is `null` or `undefined`. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_009: [** The `sendMethodResponse` method shall throw an `ArgumentError` if the `methodResponse.requestId` property is falsy. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_010: [** The `sendMethodResponse` method shall create a new `Message` object with the following properties:
- The `IoThub-status` application property must be set to the value of the `methodResponse.status` property.
- The `correlationId` property of the message must be set to the value of the `methodResponse.requestId` property.
- The `body` property of the messager must be set to the value of the `methodResponse.payload` property. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_011: [** The `sendMethodResponse` method shall call the `sendEvent` method on local `AmqpClient` instance with the specially crafted message containing the method response. **]**

**SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_026: [** The `sendMethodResponse` shall fail with a `NotConnectedError` if it is called while the links are detached. **]**
