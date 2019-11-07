# Digital Twin Service Client requirements

The `DigitalTwinServiceClient` class provides methods to interact with a device's digital twin object stored in Azure IoT Hub.

## Overview

## Public interface

```typescript
type DigitalTwin = Models.DigitalTwinInterfaces & Models.DigitalTwinGetInterfacesHeaders | undefined;
type DigitalTwinResponse = Models.DigitalTwinGetInterfacesResponse | undefined;
type Model = Models.DigitalTwinGetDigitalTwinModelResponse;
type ModelResponse = Model & {_response: msRest.HttpOperationResponse};
interface CommandResult {
  result?: any;
  statusCode?: number;
  requestId?: string;
}
interface CommandResultResponse extends CommandResult {
  _response?: msRest.HttpOperationResponse;
}

class DigitalTwinServiceClient

  getDigitalTwin(digitalTwinId: string): Promise<DigitalTwinResponse>;
  getDigitalTwin(digitalTwinId: string, callback: Callback<DigitalTwinResponse>): void;
  getDigitalTwin(digitalTwinId: string, callback?: Callback<DigitalTwinResponse>): void | Promise<DigitalTwinResponse> {

  getDigitalTwinInterfaceInstance(digitalTwinId: string, interfaceInstanceName: string): Promise<DigitalTwinResponse>;
  getDigitalTwinInterfaceInstance(digitalTwinId: string, interfaceInstanceName: string, callback: Callback<DigitalTwinResponse>): void;
  getDigitalTwinInterfaceInstance(digitalTwinId: string, interfaceInstanceName: string, callback?: Callback<DigitalTwinResponse>): void | Promise<DigitalTwinResponse> {

  getModel(modelId: string): Promise<ModelResponse>;
  getModel(modelId: string, callback: Callback<ModelResponse>): void;
  getModel(modelId: string, callback?: Callback<ModelResponse>): void | Promise<ModelResponse> {

  updateDigitalTwin(digitalTwinId: string, patch: Models.DigitalTwinInterfacesPatch): Promise<DigitalTwinResponse>;
  updateDigitalTwin(digitalTwinId: string, patch: Models.DigitalTwinInterfacesPatch, callback: Callback<DigitalTwinResponse>): void;
  updateDigitalTwin(digitalTwinId: string, patch: Models.DigitalTwinInterfacesPatch, callback?: Callback<DigitalTwinResponse>): void | Promise<DigitalTwinResponse> {

  updateDigitalTwinProperty(digitalTwinId: string, interfaceInstanceName: string, propertyName: string, propertyValue: string): Promise<DigitalTwinResponse>;
  updateDigitalTwinProperty(digitalTwinId: string, interfaceInstanceName: string, propertyName: string, propertyValue: string, callback: Callback<DigitalTwinResponse>): void;
  updateDigitalTwinProperty(digitalTwinId: string, interfaceInstanceName: string, propertyName: string, propertyValue: string, callback?: Callback<DigitalTwinResponse>): void | Promise<DigitalTwinResponse> {

  invokeCommand(digitalTwinId: string, interfaceInstanceName: string, commandName: string, argument: string): Promise<CommandResultResponse>;
  invokeCommand(digitalTwinId: string, interfaceInstanceName: string, commandName: string, argument: string, callback: Callback<CommandResultResponse>): void;
  invokeCommand(digitalTwinId: string, interfaceInstanceName: string, commandName: string, argument: string, callback?: Callback<CommandResultResponse>): void | Promise<CommandResultResponse> {
}
```

## Example usage

```javascript
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);
  const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceDescription.deviceId);
  const digitalTwinInterfaceInstance = await digitalTwinServiceClient.getDigitalTwinInterfaceInstance(deviceDescription.deviceId, interfaceInstanceName);
  const digitalTwinModel = await digitalTwinServiceClient.getModel(modelId);
  const updatedDigitalTwin = await digitalTwinServiceClient.updateDigitalTwin(deviceDescription.deviceId, patch, digitalTwin.eTag);
  const digitalTwinCommandResult = await digitalTwinServiceClient.invokeCommand(digitalTwin.Id, digitalTwinInterfaceInstanceName, digitalTwinCommandName, digitalTwinArgument);
```

## Public API

## Constructor

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_001: [** The `DigitalTwinServiceClient` creates an instance of the DigitalTwinServiceClient passing IoTHubTokenCredentials class as an argument. **]**

## getDigitalTwin

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_002: [** The `getDigitalTwin` method shall call the `getInterfaces` method of the protocol layer with the given argument. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_003: [** The `getDigitalTwin` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_004: [** The `getDigitalTwin` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_020: [** The `getDigitalTwin` method shall return a promise if there is no callback passed. **]**

## getDigitalTwinInterfaceInstance

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_005: [** The `getDigitalTwinInterfaceInstance` method shall call the `getInterface` method of the protocol layer with the given arguments. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_006: [** The `getDigitalTwinInterfaceInstance` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_007: [** The `getDigitalTwinInterfaceInstance` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_021: [** The `getDigitalTwinInterfaceInstance` method shall return a promise if there is no callback passed. **]**

## getModel

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_008: [** The `getModel` method shall call the `getDigitalTwinModel` method of the protocol layer with the given argument. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_009: [** The `getModel` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_010: [** The `getModel` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_022: [** The `getModel` method shall return a promise if there is no callback passed. **]**

## updateDigitalTwin

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_011: [** The `updateDigitalTwin` method shall call the `updateInterfaces` method of the protocol layer with the given arguments. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_012: [** The `updateDigitalTwin` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_013: [** The `updateDigitalTwin` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_023: [** The `updateDigitalTwin` method shall return a promise if there is no callback passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_026: [** The `updateDigitalTwin` method shall call the `updateInterfaces` method of the protocol layer with the given arguments including eTag. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_028: [** The `patch` argument of the `updateDigitalTwin` method should be a JSON string using the following format:
 const patch = {
    interfaces: {
      [interfaceInstanceName]: {
        properties: {
          [propertyName]: {
            desired: {
              value: propertyValue
            }
          }
        }
      }
    }
  };
  The interfaceInstanceName should be an existing interface instance's name.
  The propertyName could be existing or new.
  The patch should contain difference to a previously reported twin only (e.g. patch).
 **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_030: [** The `updateDigitalTwin` method shall return a promise if eTag is passed and there is no callback passed.] **]**

## updateDigitalTwinProperty

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_014: [** The `updateDigitalTwinProperty` method shall call the `updateInterfaces` method of the protocol layer. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_015: [** The `updateDigitalTwinProperty` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_016: [** The `updateDigitalTwinProperty` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_024: [** The `updateDigitalTwinProperty` method shall return a promise if there is no callback passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_027: [** The `updateDigitalTwinProperty` method shall call the `updateInterfaces` method of the protocol layer including eTag. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_029: [** The `updateDigitalTwinProperty` method receives the following arguments:
  const interfaceInstanceName - an existing interface instance's name.
  const propertyName - the property what need to be updated or created.
  const property value - the reported value of the property.
 **]**

## invokeCommand

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_017: [** The `invokeCommand` method shall call the `invokeInterfaceCommand` method of the protocol layer with the given arguments. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_018: [** The `invokeCommand` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_019: [** The `invokeCommand` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_025: [** The `invokeCommand` method shall return a promise if there is no callback passed. **]**
