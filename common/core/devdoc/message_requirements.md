# azure-iot-common.Message Requirements
========================================

## Overview
azure-iot-common.Message provides a container for message content and properties travelling to and from an IoT Hub.

## Example usage
```
'use strict';
var Message = require('azure-iot-common').Message;

var message = new Message('data to send');
message.properties.add('myProperty', 'my property value');
console.log('message content: ' + message.getData());
```

## Public Interface

| **Name**              | **Type**                | **Description** |
|-----------------------|-------------------------|-----------------|
| message.properties    | Object<string, string>  | A container of custom message properties |
| message.messageId     | String                  |  Used to correlate two-way communication. Format: A case-sensitive string ( up to 128 char long) of ASCII 7-bit alphanumeric chars + {'-', ':',’.', '+', '%', '_', '#', '*', '?', '!', '(', ')', ',', '=', '@', ';', '$', '''}. |
| message.to            |                         | Destination of the message |
| message.expiryTime    | Date                    | Expiry time in UTC. Interpreted by hub on C2D messages. Ignored in other cases |
| message.lockToken     | String                  | Used by receiver to Abandon, Reject or Complete the message |
| message.correlationId | String                  | Used in message responses and feedback |
| message.userId        | String                  | Used to specify the entity creating the message |


### Message(data)
Construct a Message with the given data
**SRS_NODE_IOTHUB_MESSAGE_07_004: [**The `Message` constructor shall accept a variable message that will be transmitted.**]**

### getData()
Return the data passed to the constructor

**SRS_NODE_IOTHUB_MESSAGE_07_003: [**The `getData` function shall return a representation of the body of the message as the type that was presented during construction.**]**

### getBytes()
Return the data passed to the constructor as a Buffer of bytes

**SRS_NODE_IOTHUB_MESSAGE_07_001: [**If the data message that is store is of type `Buffer` then the data object will get returned unaltered.**]**

**SRS_NODE_IOTHUB_MESSAGE_07_002: [**If the data message is of any other type then the data will be converted to a `Buffer` object and returned.**]**

## static isBufferConvertible(obj: any): boolean;
Returns true if the given object is of type `BufferConvertible`

**SRS_NODE_IOTHUB_MESSAGE_18_001: [** `isBufferConvertible` shall return `true` if `obj` is a `Buffer`, a `string`, an `Array`, or an `ArrayBuffer`. **]**

**SRS_NODE_IOTHUB_MESSAGE_18_002: [** `isBufferConvertible` shall return `false` if `obj` is any other type. **]**

## properties
A collection of Message properties.

