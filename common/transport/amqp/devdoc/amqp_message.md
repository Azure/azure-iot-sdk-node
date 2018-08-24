# AmqpMessage Requirements

## Overview
AmqpMessage is a type representing an AMQP message, including properties, annotations, and data as defined by the AMQP 1.0 spec, section 3.2.  It exposes a static factory method for creating an AMQP message from an IoT Hub Message, and exposes properties as mapped from the latter.

Example usage
```js
'use strict';
var Message = require('azure-iot-common').Message;
var AmqpMessage = require('./amqp_message.js');

var message = new Message('hello');
message.to = 'destination';
message.messageId = 'unique-message-id';
message.expiryTimeUtc = Date.now() + 60000; // 1 min from now
message.ack = 'negative';

var amqpMessage = AmqpMessage.fromMessage(message);
console.log(amqpMessage);

// output:
// AmqpMessage {
//   properties: {
//     to: 'destination',
//     absoluteExpiryTime: 1445537441835,
//     messageId: 'unique-message-id'
//   },
//   applicationProperties: {
//     'iothub-ack': 'negative'
//   },
//   body: 'hello'
// }
```

## Public Interface

### fromMessage(message) [static]
The fromMessage static method returns a new instance of the AmqpMessage object with properties corresponding to the properties found in message.
As this is an internal API, the input argument message can be assumed to be of type azure-iot-common.Message.

**SRS_NODE_IOTHUB_AMQPMSG_05_001: [** The `fromMessage` method shall create a new instance of `AmqpMessage`. **]**

**SRS_NODE_IOTHUB_AMQPMSG_05_003: [** If the `message` argument has a `to` property, the `AmqpMessage` object shall have a property named `to` with the same value. **]**

**SRS_NODE_IOTHUB_AMQPMSG_05_004: [** If the `message` argument has an `expiryTimeUtc` property, the `AmqpMessage` object shall have a property named `absolute_expiry_time` with the same value. **]**

**SRS_NODE_IOTHUB_AMQPMSG_05_007: [** If the `message` argument has a `messageId` property, the `AmqpMessage` object shall have a property named `message_id` with the same value. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_011: [** If the `Message.messageId` property is a UUID, the AMQP type of the `AmqpMessage.message_id` property shall be forced to Buffer[16]. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_010: [** If the `message` argument has a `correlationId` property, the `AmqpMessage` object shall have a property named `correlation_id` with the same value. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_014: [** If the `message` argument has a `contentEncoding` property, the `AmqpMessage` object shall have a property named `content_encoding` with the same value. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_015: [** If the `message` argument has a `contentType` property, the `AmqpMessage` object shall have a property named `content_type` with the same value. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_012: [** If the `Message.correlationId` property is a UUID, the AMQP type of the `AmqpMessage.correlation_id` property shall be forced to Buffer[16]. **]**

**SRS_NODE_IOTHUB_AMQPMSG_05_008: [** If needed, the created `AmqpMessage` object shall have a property of type `Object` named `application_properties`. **]**

**SRS_NODE_IOTHUB_AMQPMSG_05_009: [** If the `message` argument has an `ack` property, the `application_properties` property of the `AmqpMessage` object shall have a property named `iothub-ack` with the same value. **]**

**SRS_NODE_IOTHUB_AMQPMSG_13_001: [** If `message.properties` is truthy, then all the properties in it shall be copied to the `application_properties` property of the `AmqpMessage` object. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_013: [** If one of the property key is `IoThub-status`, this property is reserved and shall be forced to an `int` `rhea` type. **]**

**SRS_NODE_IOTHUB_AMQPMSG_05_005: [** If `message.getData()` is truthy, the `AmqpMessage` object shall have a property named `body` with the value returned from `message.getData()`. **]**

**SRS_NODE_IOTHUB_AMQPMSG_05_006: [** The generated `AmqpMessage` object shall be returned to the caller. **]**

# toMessage(amqpMessage) [static]
The `toMessage` static method takes an AMQP message from the underlying library and transforms it into a transport-agnostic `Message` object.

**SRS_NODE_IOTHUB_AMQPMSG_16_001: [** The `toMessage` method shall throw if the `amqpMessage` argument is falsy. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_002: [** The `toMessage` method shall return a `Message` object. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_003: [** The `toMessage` method shall set the `Message.correlationId` property to the `AmqpMessage.correlation_id` value if it is present. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_004: [** The `toMessage` method shall set the `Message.messageId` property to the `AmqpMessage.message_id` value if it is present. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_005: [** The `toMessage` method shall set the `Message.to` property to the `AmqpMessage.to` value if it is present. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_006: [** The `toMessage` method shall set the `Message.expiryTimeUtc` property to the `AmqpMessage.absolute_expiry_time` value if it is present. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_016: [** The `toMessage` method shall set the `Message.contentType` property to the `AmqpMessage.content_type` value if it is present.  **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_017: [** The `toMessage` method shall set the `Message.contentEncoding` property to the `AmqpMessage.content_encoding` value if it is present.  **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_007: [** The `toMessage` method shall convert the user-defined `AmqpMessage.application_properties` to a `Properties` collection stored in `Message.properties`. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_008: [** The `toMessage` method shall set the `Message.ack` property to the `AmqpMessage.application_properties['iothub-ack']` value if it is present. **]**

**SRS_NODE_IOTHUB_AMQPMSG_16_009: [** The `toMessage` method shall set the `Message.data` of the message to the content of the `AmqpMessage.body.content` property. **]**