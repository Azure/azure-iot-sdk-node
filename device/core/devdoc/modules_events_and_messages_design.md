# Azure IoT Modules API

## Concepts
There are two types of clients: device and module. A client instance is defined by a connection string.  It can be either device or module but not both.
* A device client has a `deviceId`, but no `moduleId`.
* A module client has a `deviceId` and a `moduleId`.

There are two kinds of outgoing events that can be sent by an IoT device: `sendEvent` and `sendOutputEvent`
* `sendEvent` is an outgoing event without an `outputName`.  This is traditionally called "telemetry"
* `sendOutputEvent` is an outgoing event with an `outputName`.  These are being called "outputEvents"

There are two kinds of incoming messages that can be received by an IoT device: Messages and inputMessages
* Messages are incoming messages without an `inputName`.  These are traditionally called "C2D" or "commands"
* inputMessages are incoming messages with an `inputName`.  These are being called "inputMessages"

The following table shows which clients support which events & messages:

| client type | `sendEvent` | `sendOutputEvent` | `on('messages')` | `on('inputMessages')` |
|------------ | --------- | --------------- | -------- | ------------- |
| device | yes | no  | yes | no |
| module | no | yes | no | yes|

## Notes on inputName and outputName encoding
| parameter | encoding for MQTT | encoding for AMQP |
|-|-|-|
| outputName | encoded in outgoing topic name.  E.g. "devices/\<deviceId>/modules/\<moduleId>/messages/events/$.on=\<outputName>" | uses the same link as telemetry, outputName is encoded in an annotation named "x-opt-output-name" |
| inputName | encoded in incoming topic name E.g. "devices/\<deviceId>/modules/\<moduleId>/messages/inputs/\<inputName>" | uses the same link as C2D, inputName is encoded in an annotation named "x-opt-input-name" |

Put another way:
* AMQP uses the C2D and telemetry links for inputs and outputs.  This applies to both the device SDK and the service SDK.  inputName and outputName are stored in annotations.
* For outputs, MQTT uses the same base topic string as for telemetry, with the outputName being stored in the newly added $.on querystring value.
* For inputs, MQTT has an entirely new topic string, ending in /inputs/\<inputName>

## Design principles
1. The concept of "module" is completely orthogonal to the concepts of `inputName` and `outputName`.  The `moduleId` is one of the properties of the service connection.  The `inputName` and `outputName` define how a message travels.  This orthogonality is very important.
2. The concepts of `inputName` and `outputName` are not properties of a `Message`.  They define the route that a `Message` takes, but the `Message` is completely independent of the route that it takes.  As a result, inputName and outputName are always _parameters_ and not _properties_.
3. As a side-effect of #2, `Client` and transport object do not modify any `Message` objects that are passed in by the caller.
4. Instead of overloading, we're adding explicit functions and events for inputMessages and outputEvents.
5. No explicit `enableInputMessages` and `disableInputMessages` functions were added to the `Client` API.  This mirrors the existing design for other features.  The caller enables this functionality by adding eventHandlers.

## Addition to `Client` API:

```
// Output events
sendOutputEvent(outputName: string, message: Message, callback: (err?: Error, result?: results.MessageEnqueued) => void): void;
sendOutputEventBatch(outputName: string, messages: Message[], callback: (err?: Error, result?: results.MessageEnqueued) => void): void;
```

## Responsibilities of `Client`
1. The `Client` wraps transport operations in the Retry API.
2. The `Client` calls into the transport to enable input messages when the caller subscribes to the given events.
3. The `Client` subscribes to transport InputMessage_* events on behalf of the caller.
4. The `Client` passes output events unmodified to the transport for sending


## Addition to transport API:

```
// Input messages
enableInputMessages(callback: (err?: Error) => void): void;
disableInputMessages(callback: (err?: Error) => void): void;

// Output events
sendOutputEvent(outputName: string, message: Message, callback: (err?: Error, result?: results.MessageEnqueued) => void): void;
sendOutputEventBatch(outputName: string, messages: Message[], callback: (err?: Error, result?: results.MessageEnqueued) => void): void;
```

## Responsibilities of the transport
1. The transport builds appropriate topic names based on the presence of the moduleId.
2. The transport builds the URI and userName based on deviceId, moduleId, and gatewayHostName.
3. The transport subscribes to the inputMessage topics when the client calls the `enableInputMessages` function.
3. The transport inserts the outputName into the outgoing topic name.
4. The transport extracts the inputName from the incoming topic name.
5. The transport fires the "InputMessage_\<inputName\>" events when they come in.

## Changes to MqttBase transport config

MqttBase has a structure called TransportConfig which _overlaps_ with the `Client` TransportConfig structure, but is not the same.
Before this change, `Client` would pass its TransportConfig into MqttBase with the assumption that the MqttBase knew how to read the upper-level config structure.
Additionally, some of the iothub-ness of the MQTT transport (such as username creation) has leaked down into MqttBase.
To support modules, we update the MqttBase TransportConfig to remove the coincidental overlap and make the conversion of hub configuration to mqtt configuration explicit.

Specific justifications:
1. The old notion of `host` is broken because it was used to create both the URI and the username.  For Azure IoT Edge, the GateWayHostName is used to construct the URI and the hostname in the connection string is used to build the username.  Building the URI and userId belong in upper layers, so I moved it there.
2. The old notion of `deviceId` is broken.  It was previously used as the MQTT clientId.  For Modules, the clientId is "deviceId/moduleId", so I made the field name explicit.
3. The optional `username` field was a hack for DPS, but MQTT base would still construct the userName based on IotHub rules.  Since userName is different for device/module connections, I just moved all this logic up to the device transport.
4. The `uri` field needed to be created at an upper level because of #1.  This also allows a cleaner MqttWs implementation.

### Old MqttBase.TransportConfig:
```
export namespace MqttBase {
  export interface TransportConfig {
    host: string;
    sharedAccessSignature?: string | SharedAccessSignature;
    deviceId: string;
    x509?: X509;
    username?: string;
    clean?: boolean;
  }
```

### New MqttBaseTransportConfig:
(The new name is explicit.  Notice the removal of namespacing)

```
export interface MqttBaseTransportConfig {
  sharedAccessSignature?: string | SharedAccessSignature;
  clientId: string;
  x509?: X509;
  username: string;
  clean?: boolean;
  uri: string;
}
```

## supporting changes

1. Addition of moduleId and gatewayHostName strings to connection string and TransportConfig structure