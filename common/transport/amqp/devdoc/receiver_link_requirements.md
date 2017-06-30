# ReceiverLink Requirements

## Overview

The `ReceiverLink` class is internal to the SDK and shall be considered private. It shall not be used directly by clients of the SDK, who should instead rely on the higher-level constructs (`Client` classes provided by `azure-iot-device` and `azure-iothub`).

The `ReceiverLink` class implements a state machine that manages the underlying `amqp10` link object used to receive messages from IoT Hub. It can be attached and detached manually, and will try to attach automatically if not already attached when setting up a message listener or trying to settle an existing message.

## Example usage

```typescript
import * as amqp10 from 'amqp10';
import { AmqpMessage } from './ampq_message';

const linkAddress = 'exampleAddress';
const amqp10Client = new amqp10.AmqpClient(null);

const receiverLink = new ReceiverLink(linkAddress, null, amqp10Client);
receiverLink.on('error', (err) => {
  console.error(err.toString());
});

receiverLink.on('message', (msg) => {
  console.log(msg.body);
  receiverLink.accept(msg, (err) => {
    if (err) {
      console.error(err.toString());
    } else {
      console.log('message successfully settled (accept)');
    }
  });
});
```

## Public Interface

### constructor(linkAddress: string, linkOptions: any, amqp10Client: amqp10.AmqpClient)

**SRS_NODE_AMQP_RECEIVER_LINK_16_001: [** The `ReceiverLink` internal state machine shall be initialized in the `detached` state. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_002: [** The `ReceiverLink` class shall inherit from `EventEmitter`. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_003: [** The `ReceiverLink` class shall implement the `AmqpLink` interface. **]**

### attach(callback: (err?: Error) => void): void

**SRS_NODE_AMQP_RECEIVER_LINK_16_004: [** The `attach` method shall use the stored instance of the `amqp10.AmqpClient` object to attach a new link object with the `linkAddress` and `linkOptions` provided when creating the `ReceiverLink` instance. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_005: [** If the `amqp10.AmqpClient` emits an `errorReceived` event during the time the link is attached, the `callback` function shall be called with this error. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_006: [** The `ReceiverLink` object should subscribe to the `detached` event of the newly created `amqp10` link object. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_007: [** The `ReceiverLink` object should subscribe to the `errorReceived` event of the newly created `amqp10` link object. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_008: [** If the `amqp10.AmqpClient` fails to create the link the `callback` function shall be called with this error object. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_020: [** The `attach` method shall call the `callback` if the link was successfully attached **]**

### detach(): void

**SRS_NODE_AMQP_RECEIVER_LINK_16_009: [** The `detach` method shall detach the link created by the `amqp10.AmqpClient` underlying object. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_010: [** The `detach` method shall return the state machine to the `detached` state. **]**

### accept(message: AmqpMessage, callback: (err?: Error, result?: results.MessageAccepted) => void): void

**SRS_NODE_AMQP_RECEIVER_LINK_16_021: [** The `accept` method shall throw if the `message` argument is falsy. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_013: [** The `accept` method shall use the link created by the underlying `amqp10.AmqpClient` to settle the specified `message` with IoT hub by accepting it. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_022: [** The `accept` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageCompleted` object if a callback is specified. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_014: [** If the state machine is not in the `attached` state, the `accept` method shall immediately fail with a `DeviceMessageLockLostError`. **]**

### complete(message: AmqpMessage, callback: (err?: Error, result?: results.MessageAccepted) => void): void

**SRS_NODE_AMQP_RECEIVER_LINK_16_015: [** The `complete` method shall call the `accept` method with the same arguments (it is here for backward compatibility purposes only). **]**

### reject(message: AmqpMessage, callback: (err?: Error, result?: results.MessageRejected) => void): void

**SRS_NODE_AMQP_RECEIVER_LINK_16_021: [** The `reject` method shall throw if the `message` argument is falsy. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_016: [** The `reject` method shall use the link created by the underlying `amqp10.AmqpClient` to settle the specified `message` with IoT hub by rejecting it. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_023: [** The `reject` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageRejected` object if a callback is specified. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_017: [** If the state machine is not in the `attached` state, the `reject` method shall immediately fail with a `DeviceMessageLockLostError`. **]**

### abandon(message: AmqpMessage, callback: (err?: Error, result?: results.MessageAbandoned) => void): void

**SRS_NODE_AMQP_RECEIVER_LINK_16_021: [** The `abandon` method shall throw if the `message` argument is falsy. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_018: [** The `abandon` method shall use the link created by the underlying `amqp10.AmqpClient` to settle the specified `message` with IoT hub by abandoning it. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_024: [** The `abandon` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageAbandoned` object if a callback is specified. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_019: [** If the state machine is not in the `attached` state, the `abandon` method shall immediately fail with a `DeviceMessageLockLostError`. **]**

### Events

**SRS_NODE_AMQP_RECEIVER_LINK_16_011: [** If a `detached` or `errorReceived` event is emitted by the `ampq10` link object, the `ReceiverLink` object shall return to the `detached` state. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_012: [** If a `message` event is emitted by the `amqp10` link object, the `ReceiverLink` object shall emit a `message` event with the same content. **]**

