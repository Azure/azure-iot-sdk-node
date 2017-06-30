# SenderLink Requirements

## Overview

The `SenderLink` class is internal to the SDK and shall be considered private. It shall not be used directly by clients of the SDK, who should instead rely on the higher-level constructs (`Client` classes provided by `azure-iot-device` and `azure-iothub`).

The `SenderLink` class implements a state machine that manages the underlying `amqp10` link object used to send messages to IoT Hub. It can be attached and detached manually, and will try to attach automatically if not already attached when calling `send`.

## Example usage

```typescript
import * as amqp10 from 'amqp10';
import { AmqpMessage } from './ampq_message';

const linkAddress = 'exampleAddress';
const amqp10Client = new amqp10.AmqpClient(null);

const senderLink = new SenderLink(linkAddress, null, amqp10Client);
senderLink.on('errorReceived', (err) => {
  console.error(err.toString());
});

senderLink.send(new AmqpMessage(''), linkAddress, (err) => {
  if (err) {
    console.error(err.toString());
  } else {
    console.log('message successfully sent');
  }
});
```

## Public Interface

### constructor(linkAddress: string, linkOptions: any, amqp10Client: amqp10.AmqpClient)

**SRS_NODE_AMQP_SENDER_LINK_16_001: [** The `SenderLink` internal state machine shall be initialized in the `detached` state. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_002: [** The `SenderLink` class shall inherit from `EventEmitter`. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_003: [** The `SenderLink` class shall implement the `AmqpLink` interface. **]**

### attach(callback: (err?: Error) => void): void

**SRS_NODE_AMQP_SENDER_LINK_16_004: [** The `attach` method shall use the stored instance of the `amqp10.AmqpClient` object to attach a new link object with the `linkAddress` and `linkOptions` provided when creating the `SenderLink` instance. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_022: [** The `attach` method shall call the `callback` if the link was successfully attached. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_005: [** If the `amqp10.AmqpClient` emits an `errorReceived` event during the time the link is attached, the `callback` function shall be called with this error. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_006: [** The `SenderLink` object should subscribe to the `detached` event of the newly created `amqp10` link object. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_007: [** The `SenderLink` object should subscribe to the `errorReceived` event of the newly created `amqp10` link object. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_008: [** If the `amqp10.AmqpClient` fails to create the link the `callback` function shall be called with this error object. **]**

### detach(): void

**SRS_NODE_AMQP_SENDER_LINK_16_009: [** The `detach` method shall detach the link created by the `amqp10.AmqpClient` underlying object. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_017: [** The `detach` method shall return the state machine to the `detached` state. **]**

### send(message: AmqpMessage, callback: (err?: Error, result?: results.MessageEnqueued) => void): void

**SRS_NODE_AMQP_SENDER_LINK_16_010: [** The `send` method shall use the link created by the underlying `amqp10.AmqpClient` to send the specified `message` to the IoT hub. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_011: [** If the state machine is not in the `attached` state, the `SenderLink` object shall attach the link first and then send the message. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_012: [** If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_013: [** If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_014: [** If the link is detached while a message is being sent, the `callback` shall be called with an `Error` object describing the AMQP error that caused the detach to happen in the first place. **]**

### Events

**SRS_NODE_AMQP_SENDER_LINK_16_015: [** If a `detached` or `errorReceived` event is emitted by the `ampq10` link object, the `SenderLink` object shall return to the `detached` state. **]**

### Internal state machine

**SRS_NODE_AMQP_SENDER_LINK_16_016: [** If returning to the `detached` state because of an error that didn't happen while trying to attach the link or send a message, the sender link shall call emit an `error` event with that error. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_018: [** If returning to the `detached` state because of an error that happened while trying to attach the link or send a message, the `callback` for this function shall be called with that error. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_019: [** While the link isn't attached, the messages passed to the `send` method shall be queued. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_020: [** When the link gets attached, the messages shall be sent in the order they were queued. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_021: [** If the link fails to attach and there are messages in the queue, the callback for each message shall be called with the error that caused the detach in the first place. **]**
