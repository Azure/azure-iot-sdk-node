# azure-iot-device.Twin Requirements

## Overview
azure-iot-device.Twin provides access to the Device Twin functionaliy of IoTHub.

## Public Interface

```typescript
class Twin extends EventEmitter {
  constructor(transport: Client.Transport, retryPolicy: RetryPolicy, maxOperationTimeout: number);
  get(callback: (err: Error, twin?: Twin) => void): void;
  properties: {
    reported: {
      [key: string]: any,
      update: ((err?: Error) => void): void;
    },
    desired: {
      [key: string]: any
    }
  }
}
```

### constructor(transport: Client.Transport);

**SRS_NODE_DEVICE_TWIN_16_001: [** The `Twin` constructor shall subscribe to the `twinDesiredPropertiesUpdate` event off the `transport` object. **]**

### get(callback: (err: Error, twin?: Twin) => void): void;

**SRS_NODE_DEVICE_TWIN_16_002: [** The `get` method shall call the `getTwin` method of the `Transport` object with a callback. **]**

**SRS_NODE_DEVICE_TWIN_16_003: [** If the callback passed to the `getTwin` method is called with an error, the `callback` passed to the call to the `get` method shall be called with that error. **]**

**SRS_NODE_DEVICE_TWIN_16_004: [** If the callback passed to the `getTwin` method is called with no error and a `TwinProperties` object, these properties shall be merged with the current instance properties. **]**

**SRS_NODE_DEVICE_TWIN_16_005: [** Once the properties have been merged the `callback` method passed to the call to `get` shall be called with a first argument that is `null` and a second argument that is the current `Twin` instance (`this`). **]**

**SRS_NODE_DEVICE_TWIN_16_006: [** For each desired property that is part of the `TwinProperties` object received, an event named after the path to this property shall be fired and passed the property value as argument. **]**

### properties.reported.update(state: any, done: (err?: null) => void): void;
`update` is a method which application developers use to send reported state to the service.

**SRS_NODE_DEVICE_TWIN_16_007: [** The `update` method shall call the `updateReportedProperties` method of the `Transport` object and pass it the patch object and a callback accepting an error as argument. **]**

**SRS_NODE_DEVICE_TWIN_16_008: [** If the callback passed to the transport is called with an error, the `callback` argument of the `update` method shall be called with that error. **]**

**SRS_NODE_DEVICE_TWIN_18_031: [** If the callback passed to the transport is called with no error, the  `properties.reported.update` shall merge the contents of the patch object into `properties.reported` **]**

**SRS_NODE_DEVICE_TWIN_18_032: [** When merging the patch, if any properties are set to `null`, `properties.reported.update` shall delete that property from `properties.reported`. **]**

**SRS_NODE_DEVICE_TWIN_16_009: [** Once the properties have been merged the `callback` argument of the `update` method shall be called with no argument. **]**

### on('properties.desired[.path])

**SRS_NODE_DEVICE_TWIN_16_010: [** When a listener is added for the first time on an event which name starts with `properties.desired`, the twin shall call the `enableTwinDesiredPropertiesUpdates` method of the `Transport` object. **]**

**SRS_NODE_DEVICE_TWIN_16_011: [** If the callback passed to the transport is called with an error, that error shall be emitted by the Twin object. **]**

**SRS_NODE_DEVICE_TWIN_18_045: [** If a property is already set when a handler is added for that property, the `Twin` object shall fire a property changed event for the property. **]**

**SRS_NODE_DEVICE_TWIN_16_012: [** When a `twinDesiredPropertiesUpdates` event is emitted by the transport, the property patch passed as argument to the event handler shall be merged with the current desired properties. **]**

**SRS_NODE_DEVICE_TWIN_16_013: [** Recursively for each desired property that is part of the patch received, an event named using the convention `properties.desired[.path]` shall be fired with an argument containing the value of the property. **]**

**SRS_NODE_DEVICE_TWIN_18_045: [** If a property is already set when a handler is added for that property, the `Twin` object shall fire a property changed event for the property. **]**

**SRS_NODE_DEVICE_TWIN_16_012: [** When a `twinDesiredPropertiesUpdates` event is emitted by the transport, the property patch passed as argument to the event handler shall be merged with the current desired properties. **]**

**SRS_NODE_DEVICE_TWIN_16_013: [** Recursively for each desired property that is part of the patch received, an event named using the convention `properties.desired[.path]` shall be fired with an argument containing the value of the property. **]**

### setRetryPolicy(retryPolicy: RetryPolicy): void

**SRS_NODE_DEVICE_TWIN_16_014: [** the `retryPolicy` object passed to the `setRetryPolicy` method shall be used to retry any subsequent operation (`get`, `properties.reported.update` or `enableTwinDesiredPropertiesUpdates`).  **]**


## Implementation notes

All service-to-device version identifiers are ignored.  No device-to-service version identifiers shall be sent.

TODO: All PATCHes arriving before the GET response comes back shall be ignored.

TODO: handle re-connection.  Need to unsub, resub, and get.  We can't currently do this because the transport doesn't have an "onConnectionDropped" event.

