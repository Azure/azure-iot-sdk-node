# ClaimsBasedSecurityAgent Requirements

## Overview

The `ClaimsBasedSecurityAgent` class is internal to the SDK and shall be considered private. It shall not be used directly by clients of the SDK, who should instead rely on the higher-level constructs (`Client` classes provided by `azure-iot-device` and `azure-iothub`).

The `ClaimsBasedSecurityAgent` class manages the links used to process CBS Authentication messages. It can be attached and detached manually, and will try to attach automatically if not already attached when a "put token" operation is performed.

## Example usage

```typescript
import * as amqp10 from 'amqp10';
import { ClaimsBasedSecurityAgent } from './amqp_cbs';

const amqp10Client = new amqp10.AmqpClient(null);
// the amqp10 client shall be connected before using it with the CBS agent.
const cbs = new ClaimsBasedSecurityAgent(amqp10Client);
cbs.attach((err) => {
  if (err) {
    console.error(err.toString());
  } else {
    cbs.putToken('<IoT Hub hostname', 'shared access signature', (err) => {
      if (err) {
        console.log(err.toString());
      } else {
        // now authenticated using CBS
      }
    });
  }
});
```

## Public Interface

### constructor(amqpClient)

**SRS_NODE_AMQP_CBS_16_001: [** The `constructor` shall instantiate a `SenderLink` object for the `$cbs` endpoint using a custom policy `{encoder: function(body) { return body;}}` which forces the amqp layer to send the token as an amqp value in the body. **]**

**SRS_NODE_AMQP_CBS_16_002: [** The `constructor` shall instantiate a `ReceiverLink` object for the `$cbs` endpoint. **]**

### attach(callback)

**SRS_NODE_AMQP_CBS_16_003: [** `attach` shall attach the sender link. **]**

**SRS_NODE_AMQP_CBS_16_004: [** `attach` shall attach the receiver link. **]**

**SRS_NODE_AMQP_CBS_16_005: [** The `attach` method shall set up a listener for responses to put tokens on the `message` event of the receiver link. **]**

**SRS_NODE_AMQP_CBS_16_006: [** If given as an argument, the `attach` method shall call `callback` with a standard `Error` object if any link fails to attach. **]**

**SRS_NODE_AMQP_CBS_16_007: [** If given as an argument, the `attach` method shall call `callback` with a `null` error object if successful. **]**

### detach()

**SRS_NODE_AMQP_CBS_16_008: [** `detach` shall detach both sender and receiver links. **]**

### putToken(audience, token, callback)

**SRS_NODE_AMQP_CBS_16_009: [** The `putToken` method shall throw a ReferenceError if the `audience` argument is falsy. **]**

**SRS_NODE_AMQP_CBS_16_010: [** The `putToken` method shall throw a ReferenceError if the `token` argument is falsy. **]**

**SRS_NODE_AMQP_CBS_16_011: [** The `putToken` method shall construct an amqp message that contains the following application properties:
```
'operation': 'put-token'
'type': 'servicebus.windows.net:sastoken'
'name': <audience>
```

and system properties of

```
'to': '$cbs'
'messageId': <uuid>
'reply_to': 'cbs'
```

and a body containing `<sasToken>`. **]**

**SRS_NODE_AMQP_CBS_16_012: [** The `putToken` method shall send this message over the `$cbs` sender link. **]**

**SRS_NODE_AMQP_CBS_16_013: [** The `putToken` method shall call `callback` (if supplied) if the `send` generates an error such that no response from the service will be forthcoming. **]**

**SRS_NODE_AMQP_CBS_16_014: [** The `putToken` method will time out the put token operation if no response is returned within a configurable number of seconds. **]**

**SRS_NODE_AMQP_CBS_16_015: [** The `putToken` method will invoke the `callback` (if supplied) with an error object if the put token operation timed out. **]**

### events

**SRS_NODE_AMQP_CBS_16_016: [** If either the sender or receiver link emits an `error` event, remaining links shall be detached. **]**

# $cbs listener

**SRS_NODE_AMQP_CBS_16_019: [** A put token response of 200 will invoke the corresponding `putTokenCallback` with no parameters. **]**

**SRS_NODE_AMQP_CBS_16_018: [** A put token response not equal to 200 will invoke `putTokenCallback` with an error object of `UnauthorizedError`. **]**

**SRS_NODE_AMQP_CBS_16_020: [** All responses shall be completed. **]**
