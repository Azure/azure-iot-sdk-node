# AmqpTwinReceiver Requirements

## Overview
Object used to subscribe to the Cloud-to-Device messages for Twin

## Example
```javascript
var receiver = new AmqpTwinReceiver(config: ClientConfig, client: any);
receiver.on('response', function(response) {
    console.log('Response received for request ' + response.requestId);
    console.log('  status = " + response.status);
    console.log(response.body);
});
```

## Public API

### Constructor

**SRS_NODE_DEVICE_AMQP_TWIN_06_004: [** The `AmqpTwinReceiver` constructor shall throw `ReferenceError` if the `config` object is falsy. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_002: [** The `AmqpTwinReceiver` constructor shall throw `ReferenceError` if the `client` object is falsy. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_005: [** The `AmqpDeviceMethodClient` shall inherit from the `EventEmitter` class. **]**

### response event

**SRS_NODE_DEVICE_AMQP_TWIN_06_006: [** When a listener is added for the `response` event, and the `post` event is NOT already subscribed, upstream and downstream links are established via calls to `attachReceiverLink` and `attachSenderLink`. **]**

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
.

**SRS_NODE_DEVICE_AMQP_TWIN_06_011: [** Upon successfully establishing the upstream and downstream links the `subscribed` event shall be emitted from the twin receiver, with an argument object of {eventName: "response", transportObject: <object>}. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_015: [** If there is a listener for the `response` event, a `response` event shall be emitted for each response received for requests initiated by SendTwinRequest. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_014: [** When there are no more listeners for the `response` AND the `post` event, the upstream and downstream amqp links shall be closed via calls to `detachReceiverLink` and `detachSenderLink`. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_016: [** When a `response` event is emitted, the parameter shall be an object which contains `status`, `requestId` and `body` members. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_017: [** The `requestId` value is acquired from the amqp message correlationId property in the response amqp message. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_026: [** The `status` value is acquired from the amqp message status message annotation. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_018: [** The `body` parameter of the `response` event shall be the data of the received amqp message. **]**

#### post event

**SRS_NODE_DEVICE_AMQP_TWIN_06_012: [** When a listener is added for the `post` event, and the `response` event is NOT already subscribed, upstream and downstream links are established via calls to `attachReceiverLink` and `attachSenderLine`. **]**

The endpoints and link options are as for the response event.

**SRS_NODE_DEVICE_AMQP_TWIN_06_019: [** Upon successfully establishing the upstream and downstream links, a `PUT` request shall be sent on the upstream link with a correlationId set in the properties of the amqp message. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_013: [** Upon receiving a successful response message with the correlationId of the `PUT`, the `subscribed` event shall be emitted from the twin receiver, with an argument object of {eventName: "post", transportObject: <object>}. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_020: [** If there is a listener for the `post` event, a `post` event shall be emitted for each amqp message received on the downstream link that does NOT contain a correlation id, the parameter of the emit will be is the data of the amqp message. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_021: [** When there is no more listeners for the `post` event, a `DELETE` request shall be sent on the upstream link with a correlationId set in the properties of the amqp message. **]**

### error

**SRS_NODE_DEVICE_AMQP_TWIN_06_022: [** If an error occurs on establishing the upstream or downstream link then the `error` event shall be emitted. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_023: [** If a detach with error occurs on the upstream or the downstream link then the `error` event shall be emitted. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_024: [** If any detach occurs the other link will also be detached by the twin receiver. **]**

**SRS_NODE_DEVICE_AMQP_TWIN_06_025: [** When the `error` event is emitted, the first parameter shall be an error object obtained via the amqp `translateError` module. **]**