# azure-iothub.ServiceReceiver requirements

# Overview

The `ServiceReceiver` object wraps over the `ReceiverLink` object and takes care of translating the AmqpMessage events into transport-agnostic Message events.

# Responsibilities
- `ServiceReceiver` hides the AMQP ReceiverLink object, to protect against refactoring in the lower AMQP layers
- `ServiceReceiver` translates an AMQP message into a transport-agnostic message

# Non-reponsibilities
- `ServiceReceiver` is NOT responsible for maintaining/monitoring the state of the AMQP link
- `ServiceReceiver` is NOT responsible for translating errors.

# Public API
```typescript
class ServiceReceiver extends EventEmitter implements Client.ServiceReceiver {
  constructor(receiver: ReceiverLink);
  complete(message: Message, done?: Client.Callback<results.MessageCompleted>): void;
  abandon(message: Message, done?: Client.Callback<results.MessageAbandoned>): void;
  reject(message: Message, done?: Client.Callback<results.MessageRejected>): void;
}
```

## constructor(receiver: ReceiverLink);

**SRS_NODE_SERVICE_RECEIVER_16_001: [** The constructor shall subscribe to the `message` event of the `ReceiverLink` object passed as argument. **]**

**SRS_NODE_SERVICE_RECEIVER_16_002: [** The constructor shall subscribe to the `error` event of the `ReceiverLink` object passed as argument. **]**

## complete(message: Message, done?: Client.Callback<results.MessageCompleted>): void;

**SRS_NODE_SERVICE_RECEIVER_16_003: [** The `complete` method shall call the `complete` method on the `ReceiverLink` object and pass it the `AmqpMessage` stored within the `transportObj` property of the `Message` object as well as the `done` callback passed as argument. **]**

## abandon(message: Message, done?: Client.Callback<results.MessageAbandoned>): void;

**SRS_NODE_SERVICE_RECEIVER_16_004: [** The `abandon` method shall call the `abandon` method on the `ReceiverLink` object and pass it the `AmqpMessage` stored within the `transportObj` property of the `Message` object as well as the `done` callback passed as argument. **]**

## reject(message: Message, done?: Client.Callback<results.MessageRejected>): void;

**SRS_NODE_SERVICE_RECEIVER_16_005: [** The `reject` method shall call the `reject` method on the `ReceiverLink` object and pass it the `AmqpMessage` stored within the `transportObj` property of the `Message` object as well as the `done` callback passed as argument. **]**

## events

### message

**SRS_NODE_SERVICE_RECEIVER_16_006: [** The `ServiceReceiver` class shall convert any `AmqpMessage` received with the `message` event from the `ReceiverLink` object into `Message` objects and emit a `message` event with that newly created `Message` object for argument. **]**

### error

**SRS_NODE_SERVICE_RECEIVER_16_007: [** Any error event received from the `ReceiverLink` object shall be forwarded as is. **]**

## detach(callback: (err?: Error) => void): void;

**SRS_NODE_SERVICE_RECEIVER_16_008: [** The `detach` method shall call the `detach` method on the `ReceiverLink` object and pass it its `callback` argument. **]**

## forceDetach(err?: Error): void;

**SRS_NODE_SERVICE_RECEIVER_16_009: [** The `forceDetach` method shall call the `forceDetach` method on the `ReceiverLink` object and pass it its `err` argument. **]**
