# ReceiverLink Requirements

## Overview

The `ReceiverLink` class is internal to the SDK and shall be considered private. It shall not be used directly by clients of the SDK, who should instead rely on the higher-level constructs (`Client` classes provided by `azure-iot-device` and `azure-iothub`).

The `ReceiverLink` class implements a state machine that manages the underlying `rhea` link object used to receive messages from IoT Hub. It can be attached and detached manually, and will try to attach automatically if not already attached when setting up a message listener or trying to settle an existing message.

## Public Interface

### constructor(linkAddress: string, linkOptions: ReceiverOptions, session: Session)

**SRS_NODE_AMQP_RECEIVER_LINK_16_002: [** The `ReceiverLink` class shall inherit from `EventEmitter`. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_003: [** The `ReceiverLink` class shall implement the `AmqpLink` interface. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_001: [**The `ReceiverLink` internal state machine shall be initialized in the `detached` state. **]**

### attach(callback: (err?: Error) => void): void

**SRS_NODE_AMQP_RECEIVER_LINK_16_004: [** The `attach` method shall use the stored instance of the `rhea` session object to attach a new link object with the combined `linkAddress` and `linkOptions` provided when creating the `ReceiverLink` instance. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_008: [** If the `rhea` session fails to create the link the `callback` function shall be called with this error object. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_020: [** The `attach` method shall call the `callback` if the link was successfully attached **]**

**SRS_NODE_AMQP_RECEIVER_LINK_06_001: [** The `attach` method shall immediately invoke the `callback` if already in an attached state. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_06_002: [** If the `detach` method is invoked on the `ReceiverLink` while still attaching, the ReceiverLink shall detach.  It will indicate the error to the callback for the `detach` as well as the callback to the `attach`. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_06_003: [** If the `forceDetach` method is invoked on the `ReceiverLink` while still attaching, the ReceiverLink shall detach.  With the error supplied to the forceDetach, the `attach` callback will also be invoked. If the error is NOT falsy it will also be emitted as the argument to the `error` event.**]**

### detach(callback?: (err?: Error) => void): void

**SRS_NODE_AMQP_RECEIVER_LINK_06_004: [** If the `ReceiverLink` is already in the detached state an invocation of `detach` shall immediately invoke the callback with the (potentially) supplied error parameter. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_009: [** The `detach` method shall detach the link created by `rhea` object. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_06_005: [** If `forceDetach` invoked while detaching, the detach will be completed with the error supplied to the `forceDetach` or an error indicating that the `detach` was preempted by the `forceDetach`. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_06_006: [** An error occurring during a detach will be indicated in the error result of the `detach`. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_06_007: [** If `detach` invoked while already detaching, it's callback will be invoked with an error.  Whatever caused the original detaching will proceed. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_025: [** The `detach` method shall call the `callback` with an `Error` that caused the detach whether it succeeds or fails to cleanly detach the link. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_06_009: [** If a `receiver_close` event received with no preceding error, the link shall be closed with no error. **]**

### forceDetach()

**SRS_NODE_AMQP_RECEIVER_LINK_16_027: [** The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_028: [** The `forceDetach` method shall return immediately if the link is already detached. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_06_008: [** The `forceDetach` method shall cause an `error` event to be emitted on the `ReceiverLink` if an error is supplied. **]**
### accept(message: AmqpMessage, callback?: (err?: Error, result?: results.MessageAccepted) => void): void

**SRS_NODE_AMQP_RECEIVER_LINK_16_021: [** The `accept` method shall throw if the `message` argument is falsy. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_013: [** The `accept` method shall use the link created by the underlying `rhea` to settle the specified `message` with IoT hub by accepting it. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_022: [** The `accept` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageCompleted` object if a callback is specified. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_014: [** If the state machine is not in the `attached` state, the `accept` method shall immediately fail with a `DeviceMessageLockLostError`. **]**

### complete(message: AmqpMessage, callback?: (err?: Error, result?: results.MessageAccepted) => void): void

**SRS_NODE_AMQP_RECEIVER_LINK_16_015: [** The `complete` method shall call the `accept` method with the same arguments (it is here for backward compatibility purposes only). **]**

### reject(message: AmqpMessage, callback?: (err?: Error, result?: results.MessageRejected) => void): void

**SRS_NODE_AMQP_RECEIVER_LINK_16_021: [** The `reject` method shall throw if the `message` argument is falsy. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_016: [** The `reject` method shall use the link created by the underlying `rhea` to settle the specified `message` with IoT hub by rejecting it. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_023: [** The `reject` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageRejected` object if a callback is specified. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_017: [** If the state machine is not in the `attached` state, the `reject` method shall immediately fail with a `DeviceMessageLockLostError`. **]**

### abandon(message: AmqpMessage, callback?: (err?: Error, result?: results.MessageAbandoned) => void): void

**SRS_NODE_AMQP_RECEIVER_LINK_16_021: [** The `abandon` method shall throw if the `message` argument is falsy. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_018: [** The `abandon` method shall use the link created by the underlying `rhea` to settle the specified `message` with IoT hub by abandoning it. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_024: [** The `abandon` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageAbandoned` object if a callback is specified. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_019: [** If the state machine is not in the `attached` state, the `abandon` method shall immediately fail with a `DeviceMessageLockLostError`. **]**

### Events

**SRS_NODE_AMQP_RECEIVER_LINK_16_011: [** If a `receiver_closed` or `error` event is emitted by the `rhea` link object, the `ReceiverLink` object shall forward that error to the client. **]**

**SRS_NODE_AMQP_RECEIVER_LINK_16_012: [** If a `message` event is emitted by the `rhea` link object, the `ReceiverLink` object shall emit a `message` event with the same content. **]**

