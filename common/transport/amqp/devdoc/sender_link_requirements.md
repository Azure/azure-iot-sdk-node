# SenderLink Requirements

## Overview

The `SenderLink` class is internal to the SDK and shall be considered private. It shall not be used directly by clients of the SDK, who should instead rely on the higher-level constructs (`Client` classes provided by `azure-iot-device` and `azure-iothub`).

The `SenderLink` class implements a state machine that manages the underlying `amqp10` link object used to send messages to IoT Hub. It can be attached and detached manually, and will try to attach automatically if not already attached when calling `send`.

## Example usage

```typescript
import * as amqp10 from 'amqp10';
import { AmqpMessage } from './amqp_message';

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

**SRS_NODE_AMQP_SENDER_LINK_16_002: [** The `SenderLink` class shall inherit from `EventEmitter`. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_003: [** The `SenderLink` class shall implement the `AmqpLink` interface. **]**

### attach(callback: (err?: Error) => void): void

**SRS_NODE_AMQP_SENDER_LINK_16_004: [** The `attach` method shall use the stored instance of the `rhea` session object to attach a new link object with the combined `linkAddress` and `linkOptions` provided when creating the `SenderLink` instance. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_022: [** The `attach` method shall call the `callback` if the link was successfully attached. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_006: [** The `SenderLink` object should subscribe to the `sender_close` event of the newly created `rhea` link object. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_007: [** The `SenderLink` object should subscribe to the `error` event of the newly created `rhea` link object. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_008: [** If the `rhea` session fails to create the link the `callback` function shall be called with this error object. **]**

### detach(callback?: (err?: Error) => void): void

**SRS_NODE_AMQP_SENDER_LINK_16_009: [** The `detach` method shall detach the link created by `rhea`. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_023: [** The `detach` method shall call the `callback` with the original `Error` that caused the detach whether it succeeds or fails to cleanly detach the link. **]**

### forceDetach()

**SRS_NODE_AMQP_SENDER_LINK_16_025: [** The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_026: [** The `forceDetach` method shall return immediately if the link is already detached.  **]**

### send(message: AmqpMessage, callback: (err?: Error, result?: results.MessageEnqueued) => void): void

**SRS_NODE_AMQP_SENDER_LINK_16_010: [** The `send` method shall use the link created by the underlying `rhea` to send the specified `message` to the IoT hub. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_011: [** If the state machine is not in the `attached` state, the `SenderLink` object shall attach the link first and then send the message. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_012: [** If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_013: [** If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_014: [** If the link is detached while a message is being sent, the `callback` shall be called with an `Error` object describing the AMQP error that caused the detach to happen in the first place. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_019: [** While the link isn't attached, the messages passed to the `send` method shall be queued. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_020: [** When the link gets attached, the messages shall be sent in the order they were queued. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_021: [** If the link fails to attach and there are messages in the queue, the callback for each message shall be called with the error that caused the detach in the first place. **]**

### Events

**SRS_NODE_AMQP_SENDER_LINK_16_015: [** If a `sender_close` or `error` event is emitted by the `rhea` link object, the `SenderLink` object shall return to the `detached` state. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_016: [** If an error happened that caused the link to be detached, the sender link shall call emit an `error` event with that error. **]**

**SRS_NODE_AMQP_SENDER_LINK_16_018: [** If an error happened that caused the link to be detached while trying to attach the link or send a message, the `callback` for this function shall be called with that error, and the event should not be emitted. **]**
