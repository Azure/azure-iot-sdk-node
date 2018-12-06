# azure-iot-device.Http Requirements

## Overview
Http provides HTTP protocol support to the device SDK for communicating with Azure IoT Hub.

`Http` now also implements what used to be `HttpReceiver` therefore the receiver requirements have been added to this document.

```js
'use strict';
var Http = require('azure-iot-device-http').Http;
var Message = require('azure-iot-device-http').Message;

function print(err) {
  console.log(err.toString());
}

var config = {
  host: /* ... */,
  deviceId: /* ... */,
  sharedAccessSignature: /* ... */
};

var http = new Http(config);
var message = new Message('my message');
http.sendEvent(message, function (err, msg) {
  if (err) print(err);
  else console.log('sent message: ' + msg.getData());
});

http.on('message', function(msg) {
  console.log('received: ' + msg.getData());
  http.complete(msg);
});

http.on('errorReceived', function(err) {
  console.log('Error: ' + err.message);
});
```

## Public Interface

### Http constructor

**SRS_NODE_DEVICE_HTTP_05_001: [**The Http constructor shall accept an object with the following properties:
- `host` - (string) the fully-qualified DNS hostname of an IoT hub
- `deviceId` - (string) the name of the IoT hub, which is the first segment of hostname
and either:
- `sharedAccessSignature` - (string) a shared access signature generated from the credentials of a policy with the "device connect" permissions.
or:
- `x509` (object) an object with 3 properties: `cert`, `key` and `passphrase`, all strings, containing the necessary information to connect to the service.
**]**

### connect(callback)

**SRS_NODE_DEVICE_HTTP_16_028: [** The `connect` method shall call its callback immediately with a `null` first argument and a `results.Connected` second argument. **]**

### disconnect(callback)

**SRS_NODE_DEVICE_HTTP_16_029: [** The `disconnect` method shall disable the C2D message receiver if it is running. **]**

**SRS_NODE_DEVICE_HTTP_16_030: [** The `disconnect` method shall call its callback with an `Error` if disabling the C2D message receiver generates an error. **]**

**SRS_NODE_DEVICE_HTTP_16_031: [** The `disconnect` method shall call its callback with a `null` first argument and a `results.Disconnected` second argument after successfully disabling the C2D receiver (if necessary). **]**

**SRS_NODE_DEVICE_HTTP_16_039: [** The `disconnect` method shall call the `stop` method on the `AuthenticationProvider` object if the type of authentication used is "token".  **]**

### sendEvent(message, done)

The `sendEvent` method sends an event to an IoT hub on behalf of the device indicated in the constructor argument.

**SRS_NODE_DEVICE_HTTP_05_002: [** The `sendEvent` method shall construct an HTTP request using information supplied by the caller, as follows:
```
POST <config.host>/devices/URI_ENCODED(<config.deviceId>)/messages/events?api-version=<version> HTTP/1.1
iothub-to: /devices/URI_ENCODED(<config.deviceId>)/messages/events
User-Agent: <version string>
Host: <config.host>

<message>
```
**]**

**SRS_NODE_DEVICE_HTTP_13_001: [** `sendEvent` shall add message properties as HTTP headers and prefix the key name with the string **iothub-app**. **]**

**SRS_NODE_DEVICE_HTTP_16_014: [** If the `message` object has a `messageId` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-MessageId`. **]**

**SRS_NODE_DEVICE_HTTP_16_015: [** If the `message` object has a `correlationId` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-CorrelationId`. **]**

**SRS_NODE_DEVICE_HTTP_16_016: [** If the `message` object has a `userId` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-UserId`. **]**

**SRS_NODE_DEVICE_HTTP_16_017: [** If the `message` object has a `to` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-To`. **]**

**SRS_NODE_DEVICE_HTTP_16_018: [** If the `message` object has a `expiryTimeUtc` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-Expiry`. **]**

**SRS_NODE_DEVICE_HTTP_16_019: [** If the `message` object has a `ack` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-Ack`. **]**

**SRS_NODE_DEVICE_HTTP_16_037: [** If the `message` object has a `contentType` property, the value of the property shall be inserted in the headers of the HTTP request with the key `iothub-contenttype`. **]**

**SRS_NODE_DEVICE_HTTP_16_038: [** If the `message` object has a `contentEncoding` property, the value of the property shall be inserted in the headers of the HTTP request with the key `iothub-contentencoding`. **]**

### sendEventBatch(messages, done)

The sendEventBatch method sends a list of events to an IoT hub on behalf of the device indicated in the constructor argument.

**SRS_NODE_DEVICE_HTTP_05_003: [**The `sendEventBatch` method shall construct an HTTP request using information supplied by the caller, as follows:
```
POST <config.host>/devices/URI_ENCODED(<config.deviceId>)/messages/events?api-version=<version> HTTP/1.1
iothub-to: /devices/URI_ENCODED(<config.deviceId>)/messages/events
User-Agent: <version string>
Content-Type: application/vnd.microsoft.iothub.json
Host: <config.host>

{"body":"<Base64 Message1>","properties":{"iothub-app-<key>":"<value>"}},
{"body":"<Base64 Message1>"}...
```
**]**

**SRS_NODE_DEVICE_HTTP_13_002: [** `sendEventBatch` shall prefix the key name for all message properties with the string **iothub-app**. **]**

### setOptions(options, done)

**SRS_NODE_DEVICE_HTTP_16_004: [** The `setOptions` method shall call the `setOptions` method of the HTTP Receiver with the content of the `http.receivePolicy` property of the `options` parameter.**]**

**SRS_NODE_DEVICE_HTTP_16_005: [** If `done` has been specified the `setOptions` method shall call the `done` callback with no arguments when successful.**]**

**SRS_NODE_DEVICE_HTTP_16_009: [** If `done` has been specified the `setOptions` method shall call the `done` callback with a standard javascript `Error` object when unsuccessful. **]**

**SRS_NODE_DEVICE_HTTP_16_010: [** `setOptions` should not throw if `done` has not been specified. **]**

**SRS_NODE_DEVICE_HTTP_16_011: [** The HTTP transport should use the x509 settings passed in the `options` object to connect to the service if present. **]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_001: [** The setOptions method shall accept an argument formatted as such:
 {
     interval: (Number),
     at: (Date)
     cron: (string)
     drain: (Boolean)
     manualPolling: (Boolean)
}
**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_008: [**Only one of the `interval`, at, `manualPolling` and `cron` fields should be populated: if more than one is populated, an ArgumentError shall be thrown.**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_021: [**If `opts.interval` is set, messages should be received repeatedly at that interval**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_002: [**If `opts.interval` is not a number, an ArgumentError should be thrown.**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_005: [**If `opts.interval` is a negative number, an ArgumentError should be thrown.**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_003: [**if `opts.at` is set, messages shall be received at the Date and time specified.**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_022: [**If `opts.at` is not a Date object, an ArgumentError should be thrown**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_020: [**If `opts.cron` is set messages shall be received according to the schedule described by the expression.**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_004: [**if `opts.cron` is set it shall be a string that can be interpreted as a cron expression**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_007: [**If `opts.cron` is not a parseable cron string, an ArgumentError should be thrown.**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_017: [**If `opts.drain` is true all messages in the queue should be pulled at once.**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_018: [**If `opts.drain` is false, only one message shall be received at a time**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_019: [**If the receiver is already running with a previous configuration, the existing receiver should be restarted with the new configuration**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_023: [**If `opts.manualPolling` is true, messages shall be received only when receive() is called**]**

### abandon(message, done)

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_009: [**`abandon` shall construct an HTTP request using information supplied by the caller, as follows:
```
POST <config.host>/devices/URI_ENCODED(<config.deviceId>)/messages/devicebound/<lockToken>/abandon?api-version=<version> HTTP/1.1
If-Match: <lockToken>
Host: <config.host>
```
**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_025: [**If `message` is falsy, `abandon` should throw a `ReferenceException`**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_024: [**When successful, `abandon` should call the `done` callback with a null error object and a result object of type `MessageAbandoned`**]**

### complete(message, done)

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_011: [**complete shall construct an HTTP request using information supplied by the caller, as follows:
```
DELETE <config.host>/devices/URI_ENCODED(<config.deviceId>)/messages/devicebound/<lockToken>?api-version=<version> HTTP/1.1
If-Match: <lockToken>
Host: <config.host>
```
**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_027: [**If `message` is falsy, ` complete ` should throw a `ReferenceException`**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_028: [**When successful, `complete` should call the `done` callback with a `null` error object and a result object of type `MessageCompleted`**]**


### reject(message, done)

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_010: [**`reject` shall construct an HTTP request using information supplied by the caller, as follows:
```
DELETE <config.host>/devices/URI_ENCODED(<config.deviceId>)/messages/devicebound/<lockToken>?api-version=<version>&reject HTTP/1.1
If-Match: <lockToken>
Host: <config.host>
```
**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_026: [**If `message` is falsy, `reject` should throw a `ReferenceException`**]**

**SRS_NODE_DEVICE_HTTP_RECEIVER_16_029: [**When successful, `reject` should call the `done` callback with a `null` error object and a result object of type `MessageRejected`**]**

### receive(done) [Transport-specific]
The `receive` method queries the IoT hub for the next message in the indicated device’s cloud-to-device (c2d) message queue. It is a transport-specific method.

**SRS_NODE_DEVICE_HTTP_05_004: [** The receive method shall construct an HTTP request using information supplied by the caller, as follows:
GET <config.host>/devices/URI_ENCODED(<config.deviceId>)/messages/devicebound?api-version=<version> HTTP/1.1
iothub-to: /devices/URI_ENCODED(<config.deviceId>)/messages/devicebound
User-Agent: <version string>
Host: <config.host>
**]**

### updateSharedAccessSignature(sharedAccessSignature, done)

**SRS_NODE_DEVICE_HTTP_16_006: [**The `updateSharedAccessSignature` method shall save the new shared access signature given as a parameter to its configuration.**]**

**SRS_NODE_DEVICE_HTTP_16_007: [**The `updateSharedAccessSignature` method shall call the `done` callback with a null error object and a SharedAccessSignatureUpdated object as a result, indicating that the client does not need to reestablish the transport connection.**]**

### getTwin(done: (err?: Error, twin?: any) => void): void;

**SRS_NODE_DEVICE_HTTP_16_020: [** `getTwin` shall throw a `NotImplementedError`. **]**

### updateTwinReportedProperties(done: (err?: Error) => void): void

**SRS_NODE_DEVICE_HTTP_16_034: [** `updateTwinReportedProperties` shall throw a `NotImplementedError`. **]**

### enableTwinDesiredPropertiesUpdates(done: (err?: Error) => void): void

**SRS_NODE_DEVICE_HTTP_16_035: [** `enableTwinDesiredPropertiesUpdates` shall throw a `NotImplementedError`. **]**

### disableTwinDesiredPropertiesUpdates(done: (err?: Error) => void): void

**SRS_NODE_DEVICE_HTTP_16_036: [** `disableTwinDesiredPropertiesUpdates` shall throw a `NotImplementedError`. **]**

### sendMethodResponse(response: DeviceMethodResponse, done?: (err?: Error, result?: any) => void): void;

**SRS_NODE_DEVICE_HTTP_16_024: [** `sendMethodResponse` shall throw a `NotImplementedError`. **]**

### onDeviceMethod(methodName: string, methodCallback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void;

**SRS_NODE_DEVICE_HTTP_16_025: [** `onDeviceMethod` shall throw a `NotImplementedError`. **]**

### enableMethods(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_HTTP_16_026: [** `enableMethods` shall throw a `NotImplementedError`. **]**

### disableMethods(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_HTTP_16_027: [** `disableMethods` shall throw a `NotImplementedError`. **]**

### All HTTP requests

**SRS_NODE_DEVICE_HTTP_16_032: [** All HTTP requests shall obtain the credentials necessary to execute the request by calling `getDeviceCredentials` on the `AuthenticationProvider` object passed to the `Http` constructor. **]**

**SRS_NODE_DEVICE_HTTP_16_033: [** if the `getDeviceCredentials` fails with an error, the Http request shall call its callback with that error **]**

**SRS_NODE_DEVICE_HTTP_05_008: [**If any Http method encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message).**]**

**SRS_NODE_DEVICE_HTTP_05_009: [**When any Http method receives an HTTP response with a status code >= 300, it shall invoke the `done` callback function with the following arguments:
err - the standard JavaScript Error object, with the Node.js http.ServerResponse object attached as the property response**]**

**SRS_NODE_DEVICE_HTTP_05_010: [**When any Http method receives an HTTP response with a status code < 300, it shall invoke the `done` callback function with the following arguments:
- `err` - null
- `body` - the body of the HTTP response
- `response` - the Node.js http.ServerResponse object returned by the transport**]**

**SRS_NODE_DEVICE_HTTP_16_012: [** If using a shared access signature for authentication, the following additional header should be used in the HTTP request:
```
Authorization: <config.sharedAccessSignature>
```
**]**

**SRS_NODE_DEVICE_HTTP_16_013: [** If using x509 authentication the `Authorization` header shall not be set and the x509 parameters shall instead be passed to the underlying transpoort. **]**

### enableInputMessages(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_HTTP_18_001: [** `enableInputMessages` shall throw a `NotImplementedError`. **]**

### disableInputMessages(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_HTTP_18_002: [** `disableInputMessages` shall throw a `NotImplementedError`. **]**

### sendOutputEvent(outputName: string, message: Message, done: (err?: Error, result?: results.MessageEnqueued) => void): void;

**SRS_NODE_DEVICE_HTTP_18_003: [** `sendOutputEvent` shall throw a `NotImplementedError`. **]**

### sendOutputEventBatch(outputName: string, messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void;

**SRS_NODE_DEVICE_HTTP_18_004: [** `sendOutputEventBatch` shall throw a `NotImplementedError`. **]**
