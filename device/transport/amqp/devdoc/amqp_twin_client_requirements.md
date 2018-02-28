# AmqpTwinClient Requirements

## Overview
Object used to subscribe to the Cloud-to-Device messages for Twin

## Public API

```typescript
class AmqpTwinClient extends EventEmitter {
  constructor(authenticationProvider: AuthenticationProvider, client: any) {
  getTwin(callback: (err: Error, twin?: TwinProperties) => void): void;
  updateTwinReportedProperties(patch: any, callback: (err?: Error) => void): void;
  enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
  disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
  detach(callback: (err?: Error) => void): void;
}
```
### constructor(authenticationProvider: AuthenticationProvider, client: any) {

**SRS_NODE_DEVICE_AMQP_TWIN_06_005: [** The `AmqpDeviceMethodClient` shall inherit from the `EventEmitter` class. **]**

### getTwin(callback: (err: Error, twin?: TwinProperties) => void): void;

**SRS_NODE_DEVICE_AMQP_TWIN_16_007: [** The `getTwin` method shall attach the sender link if it's not already attached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_008: [** If attaching the sender link fails, the `getTwin` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_009: [** THe `getTwin` method shall attach the receiver link if it's not already attached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_010: [** If attaching the receiver link fails, the `getTwin` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_011: [** The `getTwin` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
- `operation` annotation set to `GET`.
- `resource` annotation set to `undefined`
- `correlationId` property set to a random integer
- `body` set to ` `. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_012: [** If the `SenderLink.send` call fails the `getTwin` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_013: [** The `getTwin` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler and until a message with the same `correlationId` as the one that was sent is received. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_014: [** The `getTwin` method shall parse the body of the received message and call its callback with a `null` error object and the parsed object as a result. **]**

### updateTwinReportedProperties(patch: any, callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_AMQP_TWIN_16_015: [** The `updateTwinReportedProperties` method shall attach the sender link if it's not already attached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_016: [** If attaching the sender link fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_017: [** THe `updateTwinReportedProperties` method shall attach the receiver link if it's not already attached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_018: [** If attaching the receiver link fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_019: [** The `updateTwinReportedProperties` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
- `operation` annotation set to `PATCH`.
- `resource` annotation set to `/properties/reported`
- `correlationId` property set to a random integer
- `body` set to the stringified patch object. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_020: [** If the `SenderLink.send` call fails the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_021: [** The `updateTwinReportedProperties` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler and until a message with the same `correlationId` as the one that was sent is received. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_022: [** The `updateTwinReportedProperties` method shall call its callback with no argument when a response is received **]**
// TODO: we need to check error codes!


### enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_AMQP_TWIN_16_023: [** The `enableTwinDesiredPropertiesUpdates` method shall attach the sender link if it's not already attached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_024: [** If attaching the sender link fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_025: [** THe `enableTwinDesiredPropertiesUpdates` method shall attach the receiver link if it's not already attached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_026: [** If attaching the receiver link fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_027: [** The `enableTwinDesiredPropertiesUpdates` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
- `operation` annotation set to `PUT`.
- `resource` annotation set to `/notifications/twin/properties/desired`
- `correlationId` property set to a random integer
- `body` set to `undefined`. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_028: [** If the `SenderLink.send` call fails the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_029: [** The `enableTwinDesiredPropertiesUpdates` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler and until a message with the same `correlationId` as the one that was sent is received. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_030: [** The `enableTwinDesiredPropertiesUpdates` method shall call its callback with no argument when a response is received **]**
// TODO: we need to check error codes!

### disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_AMQP_TWIN_16_031: [** The `disableTwinDesiredPropertiesUpdates` method shall call its callback immediately and with no arguments if the links are detached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_032: [** The `disableTwinDesiredPropertiesUpdates` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
- `operation` annotation set to `DELETE`.
- `resource` annotation set to `/notifications/twin/properties/desired`
- `correlationId` property set to a random integer
- `body` set to `undefined`. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_033: [** If the `SenderLink.send` call fails the `disableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_034: [** The `disableTwinDesiredPropertiesUpdates` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler and until a message with the same `correlationId` as the one that was sent is received. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_035: [** The `disableTwinDesiredPropertiesUpdates` method shall call its callback with no argument when a response is received **]**
// TODO: we need to check error codes!

### detach(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_AMQP_TWIN_16_004: [** The `detach` method shall call its `callback` immediately if the links are already detached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_005: [** The `detach` method shall detach the links and call its `callback` with no arguments if the links are successfully detached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_006: [** The `detach` method shall call its `callback` with an `Error` if detaching either of the links fail. **]**

### Links

**SRS_NODE_DEVICE_AMQP_TWIN_06_007: [** The endpoint argument for attacheReceiverLink shall be `/devices/<deviceId>/twin`. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_008: [** The link options argument for attachReceiverLink shall be:
 attach: {
        properties: {
          'com.microsoft:channel-correlation-id' : 'twin:<correlationId>',
          'com.microsoft:api-version' : endpoint.apiVersion
        },
        sndSettleMode: 1,
        rcvSettleMode: 0
      } **]**


**SRS_NODE_DEVICE_AMQP_TWIN_06_009: [** The endpoint argument for attacheSenderLink shall be `/device/<deviceId>/twin`. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_010: [** The link options argument for attachSenderLink shall be:
 attach: {
        properties: {
          'com.microsoft:channel-correlation-id' : 'twin:<correlationId>',
          'com.microsoft:api-version' : endpoint.apiVersion
        },
        sndSettleMode: 1,
        rcvSettleMode: 0
      } **]**
