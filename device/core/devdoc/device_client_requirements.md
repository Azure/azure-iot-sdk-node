# azure-iot-device.Client Requirements

## Overview
azure-iot-device.Client provides a means for devices to send events to and receive messages from an Azure IoT Hub.  The client handles communication with IoT Hub through a transport supplied by the caller (e.g., azure-iot-device-http.Http).

## Example usage
```js
'use strict';
var Client = require('azure-iot-device-http').Client;
var Http = require('azure-iot-device-http').Http;

function print(err, res) {
  if (err) console.log(err.toString());
  if (res) console.log(res.statusCode + ' ' + res.statusMessage);
}

var config = {
  host: '<hostname>',
  deviceId: '<device-id>',
  sharedAccessSignature: '<shared-access-signature>'
};

var client = new Client(new Http(config));

client.sendEvent(new Message('hello world'), print);
```

## Public Interface

### Factory methods
#### fromConnectionString
**SRS_NODE_DEVICE_CLIENT_05_003: [** The `fromConnectionString` method shall throw ReferenceError if the connStr argument is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_05_006: [** The `fromConnectionString` method shall return a new instance of the `Client` object, as by a call to `new Client(new Transport(...))`. **]**

**SRS_NODE_DEVICE_CLIENT_16_087: [** The `fromConnectionString` method shall create a new `SharedAccessKeyAuthorizationProvider` object with the connection string passed as argument if it contains a SharedAccessKey parameter and pass this object to the transport constructor. **]**

**SRS_NODE_DEVICE_CLIENT_16_093: [** The `fromConnectionString` method shall create a new `X509AuthorizationProvider` object with the connection string passed as argument if it contains an X509 parameter and pass this object to the transport constructor. **]**

#### fromSharedAccessSignature

**SRS_NODE_DEVICE_CLIENT_16_029: [** The `fromSharedAccessSignature` method shall throw a `ReferenceError` if the sharedAccessSignature argument is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_030: [** The `fromSharedAccessSignature` method shall return a new instance of the `Client` object **]**

**SRS_NODE_DEVICE_CLIENT_16_088: [** The `fromSharedAccessSignature` method shall create a new `SharedAccessSignatureAuthorizationProvider` object with the shared access signature passed as argument, and pass this object to the transport constructor. **]**

#### fromAuthenticationProvider

**SRS_NODE_DEVICE_CLIENT_16_089: [** The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `authenticationProvider` argument is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_092: [** The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `transportCtor` argument is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_090: [** The `fromAuthenticationProvider` method shall pass the `authenticationProvider` object passed as argument to the transport constructor. **]**

**SRS_NODE_DEVICE_CLIENT_16_091: [** The `fromAuthenticationProvider` method shall return a `Client` object configured with a new instance of a transport created using the `transportCtor` argument. **]**


### Constructors
#### Client(transport, connectionString) constructor

**SRS_NODE_DEVICE_CLIENT_05_001: [** The `Client` constructor shall accept a transport object **]**  , e.g. `azure-iot-device-http.Http`.

**SRS_NODE_DEVICE_CLIENT_16_026: [** The `Client` constructor shall accept a connection string as an optional second argument **]**

### Public Methods

#### open(openCallback)

**SRS_NODE_DEVICE_CLIENT_12_001: [** The `open` function shall call the transport's `connect` function, if it exists. **]**

**SRS_NODE_DEVICE_CLIENT_16_045: [** If the transport successfully establishes a connection the `open` method shall subscribe to the `disconnect` event of the transport. **]**

**SRS_NODE_DEVICE_CLIENT_16_020: [** The `open` function should start listening for C2D messages if there are listeners on the `message` event **]**

**SRS_NODE_DEVICE_CLIENT_16_064: [** The `open` method shall call the `openCallback` immediately with a null error object and a `results.Connected()` object if called while renewing the shared access signature. **]**

**SRS_NODE_DEVICE_CLIENT_16_061: [** The `open` method shall not throw if the `openCallback` callback has not been provided. **]**

**SRS_NODE_DEVICE_CLIENT_16_060: [** The `open` method shall call the `openCallback` callback with a null error object and a `results.Connected()` result object if the transport is already connected, doesn't need to connect or has just connected successfully. **]**

#### close(closeCallback)
**SRS_NODE_DEVICE_CLIENT_16_001: [** The `close` function shall call the transport's `disconnect` function if it exists. **]**

**SRS_NODE_DEVICE_CLIENT_16_046: [** The `close` method shall remove the listener that has been attached to the transport `disconnect` event. **]**

**SRS_NODE_DEVICE_CLIENT_16_056: [** The `close` method shall not throw if the `closeCallback` is not passed. **]**

**SRS_NODE_DEVICE_CLIENT_16_055: [** The `close` method shall call the `closeCallback` function when done with either a single Error object if it failed or null and a results.Disconnected object if successful. **]**

**SRS_NODE_DEVICE_CLIENT_16_058: [** The `close` method shall immediately call the `closeCallback` function if provided and the transport is already disconnected. **]**

#### sendEvent(message, sendEventCallback)
The `sendEvent` method sends an event message to the IoT Hub as the device indicated in the constructor argument.

**SRS_NODE_DEVICE_CLIENT_05_002: [** The `sendEvent` method shall send the event (indicated by the `message` argument) via the transport associated with the Client instance. **]**

**SRS_NODE_DEVICE_CLIENT_05_003: [** When the `sendEvent` method completes, the callback function (indicated by the `sendEventCallback` argument) shall be invoked with the same arguments as the underlying transport method's callback. **]**

**SRS_NODE_DEVICE_CLIENT_16_047: [** The `sendEvent` method shall not throw if the `sendEventCallback` is not passed. **]**

#### sendEventBatch(messages, sendEventBatchCallback)
The `sendEventBatch` method sends a list of event messages to the IoT Hub as the device indicated in the constructor argument.

**SRS_NODE_DEVICE_CLIENT_16_082: [** The `sendEventBatch` method shall throw a `NotImplementedError` if the transport doesn't have that feature. **]**

**SRS_NODE_DEVICE_CLIENT_07_004: [** The `sendEventBatch` method shall send the list of events (indicated by the messages argument) via the transport associated with the Client instance. **]**

**SRS_NODE_DEVICE_CLIENT_07_005: [** When the `sendEventBatch` method completes the callback function shall be invoked with the same arguments as the underlying transport method's callback. **]**

**SRS_NODE_DEVICE_CLIENT_16_051: [** The `sendEventBatch` method shall not throw if the `sendEventBatchCallback` is not passed. **]**

#### setTransportOptions(options, done)
**`setTransportOptions` is deprecated and will be removed at the next major release.**

**SRS_NODE_DEVICE_CLIENT_16_024: [** The `setTransportOptions` method shall throw a `ReferenceError` if the options object is falsy **]**

**SRS_NODE_DEVICE_CLIENT_16_025: [** The `setTransportOptions` method shall throw a `NotImplementedError` if the transport doesn't implement a 'setOption' method. **]**

**SRS_NODE_DEVICE_CLIENT_16_021: [** The `setTransportOptions` method shall call the `setOptions` method on the transport object. **]**

**SRS_NODE_DEVICE_CLIENT_16_022: [** The `done` callback shall be invoked with a `null` error object and a `TransportConfigured` object once the transport has been configured. **]**

**SRS_NODE_DEVICE_CLIENT_16_023: [** The `done` callback shall be invoked with a standard javascript `Error` object and no result object if the transport could not be configured as requested. **]**

#### setOptions(options, done)
`setOptions` is used to configure the client.

**SRS_NODE_DEVICE_CLIENT_16_042: [** The `setOptions` method shall throw a `ReferenceError` if the options object is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_043: [** The `done` callback shall be invoked with no parameters when it has successfully finished setting the client and/or transport options. **]**

**SRS_NODE_DEVICE_CLIENT_16_044: [** The `done` callback shall be invoked with a standard javascript `Error` object and no result object if the client could not be configured as requested. **]**

#### complete(message, completeCallback)

**SRS_NODE_DEVICE_CLIENT_16_016: [** The `complete` method shall throw a `ReferenceError` if the `message` parameter is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_007: [** The `complete` method shall call the `complete` method of the transport with the message as an argument **]**

**SRS_NODE_DEVICE_CLIENT_16_008: [** The `completeCallback` callback shall be called with a `null` error object and a `MessageCompleted` result once the transport has completed the message. **]**

**SRS_NODE_DEVICE_CLIENT_16_009: [** The `completeCallback` callback shall be called with a standard javascript `Error` object and no result object if the transport could not complete the message. **]**

**SRS_NODE_DEVICE_CLIENT_16_067: [** The `complete` method shall not throw if the `completeCallback` is not passed. **]**

#### reject(message, rejectCallback)

**SRS_NODE_DEVICE_CLIENT_16_018: [** The `reject` method shall throw a ReferenceError if the `message` parameter is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_010: [** The `reject` method shall call the `reject` method of the transport with the message as an argument **]**

**SRS_NODE_DEVICE_CLIENT_16_011: [** The `rejectCallback` callback shall be called with a `null` error object and a `MessageRejected` result once the transport has completed the message. **]**

**SRS_NODE_DEVICE_CLIENT_16_012: [** The `rejectCallback` callback shall be called with a standard javascript `Error` object and no result object if the transport could not reject the message. **]**

**SRS_NODE_DEVICE_CLIENT_16_071: [** The `reject` method shall not throw if the `rejectCallback` is not passed. **]**

#### abandon(message, abandonCallback)

**SRS_NODE_DEVICE_CLIENT_16_017: [** The `abandon` method shall throw a ReferenceError if the `message` parameter is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_013: [** The `abandon` method shall call the `abandon` method of the transport with the message as an argument **]**

**SRS_NODE_DEVICE_CLIENT_16_014: [** The `abandonCallback` callback shall be called with a `null` error object and a `MessageAbandoned` result once the transport has completed the message. **]**

**SRS_NODE_DEVICE_CLIENT_16_015: [** The `abandonCallback` callback shall be called with a standard javascript `Error` object and no result object if the transport could not abandon the message. **]**

**SRS_NODE_DEVICE_CLIENT_16_075: [** The `abandon` method shall not throw if the `abandonCallback` is not passed. **]**

#### updateSharedAccessSignature(sharedAccessSignature, done)

**SRS_NODE_DEVICE_CLIENT_16_031: [** The `updateSharedAccessSignature` method shall throw a `ReferenceError` if the sharedAccessSignature parameter is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_032: [** The `updateSharedAccessSignature` method shall call the `updateSharedAccessSignature` method of the transport currently in use with the sharedAccessSignature parameter. **]**

**SRS_NODE_DEVICE_CLIENT_16_035: [** The `updateSharedAccessSignature` method shall call the `done` callback with an error object if an error happened while renewing the token. **]**

**SRS_NODE_DEVICE_CLIENT_16_036: [** The `updateSharedAccessSignature` method shall call the `done` callback with a `null` error object and a result of type SharedAccessSignatureUpdated if the token was updated successfully. **]**

#### uploadToBlob(blobName, stream, done)

**SRS_NODE_DEVICE_CLIENT_16_037: [** The `uploadToBlob` method shall throw a `ReferenceError` if `blobName` is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_038: [** The `uploadToBlob` method shall throw a `ReferenceError` if `stream` is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_039: [** The `uploadToBlob` method shall throw a `ReferenceError` if `streamLength` is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_040: [** The `uploadToBlob` method shall call the `done` callback with an `Error` object if the upload fails. **]**

**SRS_NODE_DEVICE_CLIENT_16_041: [** The `uploadToBlob` method shall call the `done` callback no parameters if the upload succeeds. **]**

#### getTwin(done)

**SRS_NODE_DEVICE_CLIENT_16_094: [** If this is the first call to `getTwin` the method shall instantiate a new `Twin` object  and pass it the transport currently in use. **]**

**SRS_NODE_DEVICE_CLIENT_16_095: [** The `getTwin` method shall call the `get()` method on the `Twin` object currently in use and pass it its `done` argument for a callback. **]**

#### onDeviceMethod(methodName, callback)

The `onDeviceMethod` method's `callback` parameter is a function that is expected to conform to the signature of the interface `DeviceMethodEventHandler` as defined below (specified here using TypeScript syntax for expository purposes):

```
interface StringMap {
  [key: string]: string;
}

interface DeviceMethodRequest {
  methodName: string;
  properties: StringMap;
  body: Buffer;
}

interface DeviceMethodResponse {
  properties: StringMap;
  write(data: Buffer | string): void;
  end(status: number, done?: (err: any): void);
}

interface DeviceMethodEventHandler {
  (request: DeviceMethodRequest, response: DeviceMethodResponse): void;
}
```

**SRS_NODE_DEVICE_CLIENT_13_020: [** `onDeviceMethod` shall throw a `ReferenceError` if `methodName` is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_13_024: [** `onDeviceMethod` shall throw a `TypeError` if `methodName` is not a string. **]**

**SRS_NODE_DEVICE_CLIENT_13_022: [** `onDeviceMethod` shall throw a `ReferenceError` if `callback` is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_13_025: [** `onDeviceMethod` shall throw a `TypeError` if `callback` is not a `Function`. **]**

**SRS_NODE_DEVICE_CLIENT_13_001: [** The `onDeviceMethod` method shall cause the `callback` function to be invoked when a cloud-to-device *method* invocation signal is received from the IoT Hub service. **]**

**SRS_NODE_DEVICE_CLIENT_13_003: [** The client shall start listening for method calls from the service whenever there is a listener subscribed for a method callback. **]**

**SRS_NODE_DEVICE_CLIENT_13_023: [** `onDeviceMethod` shall throw an `Error` if a listener is already subscribed for a given method call. **]**

**SRS_NODE_DEVICE_CLIENT_13_021: [** `onDeviceMethod` shall throw a `NotImplementedErrorError` if the underlying transport does not support device methods. **]**

#### setRetryPolicy(policy)

**SRS_NODE_DEVICE_CLIENT_16_083: [** The `setRetryPolicy` method shall throw a `ReferenceError` if the policy object is falsy. **]**

**SRS_NODE_DEVICE_CLIENT_16_084: [** The `setRetryPolicy` method shall throw an `ArgumentError` if the policy object doesn't have a `shouldRetry` method. **]**

**SRS_NODE_DEVICE_CLIENT_16_085: [** The `setRetryPolicy` method shall throw an `ArgumentError` if the policy object doesn't have a `nextRetryTimeout` method. **]**

**SRS_NODE_DEVICE_CLIENT_16_086: [** Any operation (such as `sendEvent` or `onDeviceMethod`) happening after a `setRetryPolicy` call should use the policy set during that call. **]*

#### sendOutputEvent(outputName: string, message: Message, callback: (err?: Error, result?: results.MessageEnqueued) => void): void;

**SRS_NODE_DEVICE_CLIENT_18_010: [** The `sendOutputEvent` method shall send the event indicated by the `message` argument via the transport associated with the Client instance. **]**

**SRS_NODE_DEVICE_CLIENT_18_018: [** When the `sendOutputEvent` method completes, the `callback` function shall be invoked with the same arguments as the underlying transport method's callback. **]**

**SRS_NODE_DEVICE_CLIENT_18_019: [** The `sendOutputEvent` method shall not throw if the `callback` is not passed. **]**

#### sendOutputEventBatch(outputName: string, messages: Message[], callback: (err?: Error, result?: results.MessageEnqueued) => void): void

**SRS_NODE_DEVICE_CLIENT_18_011: [** The `sendOutputEventBatch` method shall send the list of events (indicated by the `messages` argument) via the transport associated with the Client instance. **]**

**SRS_NODE_DEVICE_CLIENT_18_021: [** When the `sendOutputEventBatch` method completes the `callback` function shall be invoked with the same arguments as the underlying transport method's callback. **]**

**SRS_NODE_DEVICE_CLIENT_18_022: [** The `sendOutputEventBatch` method shall not throw if the `callback` is not passed. **]**


**SRS_NODE_DEVICE_CLIENT_16_096: [** The `setRetryPolicy` method shall call the `setRetryPolicy` method on the twin if it is set and pass it the `policy` object. **]**

### Events
#### message

**SRS_NODE_DEVICE_CLIENT_16_002: [** The `message` event shall be emitted when a cloud-to-device message is received from the IoT Hub service. **]**

**SRS_NODE_DEVICE_CLIENT_16_003: [** The `message` event parameter shall be a `message` object. **]**

**SRS_NODE_DEVICE_CLIENT_16_004: [** The client shall start listening for messages from the service whenever there is a listener subscribed to the `message` event. **]**

**SRS_NODE_DEVICE_CLIENT_16_005: [** The client shall stop listening for messages from the service whenever the last listener unsubscribes from the `message` event. **]**

**SRS_NODE_DEVICE_CLIENT_16_065: [** The client shall connect the transport if needed in order to receive messages. **]**

**SRS_NODE_DEVICE_CLIENT_16_066: [** The client shall emit an error if connecting the transport fails while subscribing to message events **]**

#### inputMessage

**SRS_NODE_DEVICE_CLIENT_18_012: [** The `inputMessage` event shall be emitted when an inputMessage is received from the IoT Hub service. **]**

**SRS_NODE_DEVICE_CLIENT_18_013: [** The `inputMessage` event parameters shall be the inputName for the message and a `Message` object. **]**

**SRS_NODE_DEVICE_CLIENT_18_014: [** The client shall start listening for messages from the service whenever there is a listener subscribed to the `inputMessage` event. **]**

**SRS_NODE_DEVICE_CLIENT_18_015: [** The client shall stop listening for messages from the service whenever the last listener unsubscribes from the `inputMessage` event. **]**

**SRS_NODE_DEVICE_CLIENT_18_016: [** The client shall connect the transport if needed in order to receive inputMessages. **]**

**SRS_NODE_DEVICE_CLIENT_18_017: [** The client shall emit an `error` if connecting the transport fails while subscribing to `inputMessage` events. **]**

#### error

**SRS_NODE_DEVICE_CLIENT_16_006: [** The `error` event shall be emitted when an error occurred within the client code. **]**

#### disconnect

**SRS_NODE_DEVICE_CLIENT_16_019: [** The `disconnect` event shall be emitted when the client is disconnected from the server. **]**

**SRS_NODE_DEVICE_CLIENT_16_097: [** If the transport emits a `disconnect` event event while the client is subscribed to c2d messages the retry policy shall be used to reconnect and re-enable the feature using the transport `enableC2D` method. **]**

**SRS_NODE_DEVICE_CLIENT_16_102: [** If the retry policy fails to reestablish the C2D functionality a `disconnect` event shall be emitted with a `results.Disconnected` object. **]**

**SRS_NODE_DEVICE_CLIENT_16_098: [** If the transport emits a `disconnect` event while the client is subscribed to direct methods the retry policy shall be used to reconnect and re-enable the feature using the transport `enableMethods` method. **]**

**SRS_NODE_DEVICE_CLIENT_16_100: [** If the retry policy fails to reestablish the direct methods functionality a `disconnect` event shall be emitted with a `results.Disconnected` object. **]**

**SRS_NODE_DEVICE_CLIENT_16_099: [** If the transport emits a `disconnect` event while the client is subscribed to desired properties updates the retry policy shall be used to reconnect and re-enable the feature using the transport `enableTwinDesiredPropertiesUpdates` method. **]**

**SRS_NODE_DEVICE_CLIENT_16_101: [** If the retry policy fails to reestablish the twin desired properties updates functionality a `disconnect` event shall be emitted with a `results.Disconnected` object. **]**