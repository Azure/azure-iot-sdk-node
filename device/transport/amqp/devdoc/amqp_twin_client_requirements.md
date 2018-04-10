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

**SRS_NODE_DEVICE_AMQP_TWIN_06_005: [** The `AmqpTwinClient` shall inherit from the `EventEmitter` class. **]**

### getTwin(callback: (err: Error, twin?: TwinProperties) => void): void;

**SRS_NODE_DEVICE_AMQP_TWIN_16_007: [** The `getTwin` method shall attach the sender link if it's not already attached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_008: [** If attaching the sender link fails, the `getTwin` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_009: [** THe `getTwin` method shall attach the receiver link if it's not already attached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_010: [** If attaching the receiver link fails, the `getTwin` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_011: [** The `getTwin` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
- `operation` annotation set to `GET`.
- `resource` annotation set to `undefined`
- `correlationId` property set to a uuid
- `body` set to ` `. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_012: [** If the `SenderLink.send` call fails, the `getTwin` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_013: [** The `getTwin` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler until a message with the same `correlationId` as the one that was sent is received. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_014: [** The `getTwin` method shall parse the body of the received message and call its callback with a `null` error object and the parsed object as a result. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_038: [** The `getTwin` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the `status` message annotation is `> 300`. **]**

### updateTwinReportedProperties(patch: any, callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_AMQP_TWIN_16_015: [** The `updateTwinReportedProperties` method shall attach the sender link if it's not already attached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_016: [** If attaching the sender link fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_017: [** THe `updateTwinReportedProperties` method shall attach the receiver link if it's not already attached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_018: [** If attaching the receiver link fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_019: [** The `updateTwinReportedProperties` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
- `operation` annotation set to `PATCH`.
- `resource` annotation set to `/properties/reported`
- `correlationId` property set to a uuid
- `body` set to the stringified patch object. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_020: [** If the `SenderLink.send` call fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_021: [** The `updateTwinReportedProperties` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler until a message with the same `correlationId` as the one that was sent is received. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_022: [** The `updateTwinReportedProperties` method shall call its callback with no argument when a response is received and the `status` message annotation code is `>= 200` or `< 300` **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_039: [** The `updateTwinReportedProperties` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the `status` message annotation is `> 300`. **]**

### enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_AMQP_TWIN_16_023: [** The `enableTwinDesiredPropertiesUpdates` method shall attach the sender link if it's not already attached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_024: [** If attaching the sender link fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_025: [** THe `enableTwinDesiredPropertiesUpdates` method shall attach the receiver link if it's not already attached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_026: [** If attaching the receiver link fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_027: [** The `enableTwinDesiredPropertiesUpdates` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
- `operation` annotation set to `PUT`.
- `resource` annotation set to `/notifications/twin/properties/desired`
- `correlationId` property set to a uuid
- `body` set to `undefined`. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_028: [** If the `SenderLink.send` call fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_029: [** The `enableTwinDesiredPropertiesUpdates` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler until a message with the same `correlationId` as the one that was sent is received. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_030: [** The `enableTwinDesiredPropertiesUpdates` method shall call its callback with no argument when a response is received **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_040: [** The `enableTwinDesiredPropertiesUpdates` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the status message annotation is `> 300`. **]**

### disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_AMQP_TWIN_16_031: [** The `disableTwinDesiredPropertiesUpdates` method shall call its callback immediately and with no arguments if the links are detached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_032: [** The `disableTwinDesiredPropertiesUpdates` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
- `operation` annotation set to `DELETE`.
- `resource` annotation set to `/notifications/twin/properties/desired`
- `correlationId` property set to a uuid
- `body` set to `undefined`. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_033: [** If the `SenderLink.send` call fails, the `disableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_034: [** The `disableTwinDesiredPropertiesUpdates` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler until a message with the same `correlationId` as the one that was sent is received. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_035: [** The `disableTwinDesiredPropertiesUpdates` method shall call its callback with no argument when a response is received **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_041: [** The `disableTwinDesiredPropertiesUpdates` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the status message annotation is `> 300`. **]**

### detach(callback: (err?: Error) => void): void;

**SRS_NODE_DEVICE_AMQP_TWIN_16_004: [** The `detach` method shall call its `callback` immediately if the links are already detached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_005: [** The `detach` method shall detach the links and call its `callback` with no arguments if the links are successfully detached. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_006: [** The `detach` method shall call its `callback` with an `Error` if detaching either of the links fail. **]**

### Links

**SRS_NODE_DEVICE_AMQP_TWIN_06_007: [** The endpoint argument for `attachReceiverLink` shall be `/devices/<deviceId>/twin`. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_18_001: [** If a `moduleId` value was set in the device's connection string, the endpoint argument for `attachReceiverLink` shall be `/devices/<deviceId>/modules/<moduleId>/twin` **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_008: [** The link options argument for `attachReceiverLink` shall be:
 attach: {
        properties: {
          'com.microsoft:channel-correlation-id' : 'twin:<correlationId>',
          'com.microsoft:api-version' : endpoint.apiVersion
        },
        sndSettleMode: 1,
        rcvSettleMode: 0
      } **]**


**SRS_NODE_DEVICE_AMQP_TWIN_06_009: [** The endpoint argument for `attachSenderLink` shall be `/device/<deviceId>/twin`. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_18_002: [** If a `moduleId` value was set in the device's connection string, the endpoint argument for `attachSenderLink` shall be `/device/<deviceId>/modules/<moduleId>/twin`. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_010: [** The link options argument for `attachSenderLink` shall be:
 attach: {
        properties: {
          'com.microsoft:channel-correlation-id' : 'twin:<correlationId>',
          'com.microsoft:api-version' : endpoint.apiVersion
        },
        sndSettleMode: 1,
        rcvSettleMode: 0
      } **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_036: [** The same correlationId shall be used for both the sender and receiver links. **]**

### Errors

There are 2 failure modes for Twin requests:
- the initial request is rejected: in that case, the error shall be translated using the usual `azure-iot-amqp-base.translateError` function
- the request is accepted but contains an invalid payload and leads to an error: in that case, the response sent on the receiver link will have a status code > 300 and shall be translated using **SRS_NODE_DEVICE_AMQP_TWIN_16_037**:

**SRS_NODE_DEVICE_AMQP_TWIN_16_037: [** The responses containing errors received on the receiver link shall be translated according to the following table:
| statusCode | ErrorType               |
| ---------- | ------------------------|
| 400        | FormatError             |
| 401        | UnauthorizedError       |
| 403        | InvalidOperationError   |
| 404        | DeviceNotFoundError     |
| 429        | ThrottlingError         |
| 500        | InternalServerError     |
| 503        | ServiceUnavailableError |
| 504        | TimeoutError            |
| others     | TwinRequestError        |
**]**


**SRS_NODE_DEVICE_AMQP_TWIN_16_038: [** The `getTwin` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the `status` message annotation is `> 300`. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_039: [** The `updateTwinReportedProperties` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the `status` message annotation is `> 300`. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_040: [** The `enableTwinDesiredPropertiesUpdates` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the status message annotation is `> 300`. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_16_041: [** The `disableTwinDesiredPropertiesUpdates` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the status message annotation is `> 300`. **]**