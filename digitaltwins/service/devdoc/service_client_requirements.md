# Digital Twin Service Client requirements

The `DigitalTwinServiceClient` class provides methods to interact with a device's digital twin object stored in Azure IoT Hub.

## Overview

## Public interface

```typescript
class DigitalTwinServiceClient
  getDigitalTwin(digitalTwinId: string): Promise<Models.DigitalTwinGetInterfacesResponse>;
  getDigitalTwin(digitalTwinId: string, callback: Callback<Models.DigitalTwinGetInterfacesResponse>): void;
  getDigitalTwin(digitalTwinId: string, callback?: Callback<Models.DigitalTwinGetInterfacesResponse>): void | Promise<Models.DigitalTwinGetInterfacesResponse> {

  getDigitalTwinComponent(digitalTwinId: string, componentName: string): Promise<Models.DigitalTwinGetInterfaceResponse>;
  getDigitalTwinComponent(digitalTwinId: string, componentName: string, callback: Callback<Models.DigitalTwinGetInterfaceResponse>): void;
  getDigitalTwinComponent(digitalTwinId: string, componentName: string, callback?: Callback<Models.DigitalTwinGetInterfaceResponse>): void | Promise<Models.DigitalTwinGetInterfaceResponse> {

  getDigitalTwinModel(modelId: string): Promise<Models.DigitalTwinGetDigitalTwinModelResponse>;
  getDigitalTwinModel(modelId: string, callback: Callback<Models.DigitalTwinGetDigitalTwinModelResponse>): void;
  getDigitalTwinModel(modelId: string, callback?: Callback<Models.DigitalTwinGetDigitalTwinModelResponse>): void | Promise<Models.DigitalTwinGetDigitalTwinModelResponse> {

  updateDigitalTwin(digitalTwinId: string, patch: Models.DigitalTwinInterfacesPatch): Promise<Models.DigitalTwinUpdateInterfacesResponse>;
  updateDigitalTwin(digitalTwinId: string, patch: Models.DigitalTwinInterfacesPatch, callback: Callback<Models.DigitalTwinUpdateInterfacesResponse>): void;
  updateDigitalTwin(digitalTwinId: string, patch: Models.DigitalTwinInterfacesPatch, callback?: Callback<Models.DigitalTwinUpdateInterfacesResponse>): void | Promise<Models.DigitalTwinUpdateInterfacesResponse> {

  updateDigitalTwinProperty(digitalTwinId: string, componentName: string, propertyName: string, propertyValue: string): Promise<Models.DigitalTwinUpdateInterfacesResponse>;
  updateDigitalTwinProperty(digitalTwinId: string, componentName: string, propertyName: string, propertyValue: string, callback: Callback<Models.DigitalTwinUpdateInterfacesResponse>): void;
  updateDigitalTwinProperty(digitalTwinId: string, componentName: string, propertyName: string, propertyValue: string, callback?: Callback<Models.DigitalTwinUpdateInterfacesResponse>): void | Promise<Models.DigitalTwinUpdateInterfacesResponse> {

  invokeCommand(digitalTwinId: string, componentName: string, commandName: string, argument: string): Promise<Models.DigitalTwinInvokeInterfaceCommandResponse>;
  invokeCommand(digitalTwinId: string, componentName: string, commandName: string, argument: string, callback: Callback<Models.DigitalTwinInvokeInterfaceCommandResponse>): void;
  invokeCommand(digitalTwinId: string, componentName: string, commandName: string, argument: string, callback?: Callback<Models.DigitalTwinInvokeInterfaceCommandResponse>): void | Promise<Models.DigitalTwinInvokeInterfaceCommandResponse> {
}
```

## Example usage

```javascript
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);
  const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceDescription.deviceId);
  const digitalTwinComponent = await digitalTwinServiceClient.getDigitalTwinComponent(deviceDescription.deviceId, componentName);
  const digitalTwinModel = await digitalTwinServiceClient.getDigitalTwinModel(modelId);
  var updatedDigitalTwin = await digitalTwinServiceClient.updateDigitalTwin(deviceDescription.deviceId, patch, digitalTwin.eTag);
  var digitalTwinCommandResult = await digitalTwinServiceClient.invokeCommand(digitalTwin.Id, digitalTwinComponentName, digitalTwinCommandName, digitalTwinArgument);
```

## Public API

## Constructor

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_001: [** The `DigitalTwinServiceClient` creates an instance of the DigitalTwinServiceClient passing IoTHubTokenCredentials class as an argument. **]**

## getDigitalTwin

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_002: [** The `getDigitalTwin` method shall call the `getInterfaces` method of the protocol layer with the given argument. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_003: [** The `getDigitalTwin` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_004: [** The `getDigitalTwin` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_020: [** The `getDigitalTwin` method shall return a promise if there is no callback passed. **]**

## getDigitalTwinComponent

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_005: [** The `getDigitalTwinComponent` method shall call the `getInterface` method of the protocol layer with the given arguments. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_006: [** The `getDigitalTwinComponent` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_007: [** The `getDigitalTwinComponent` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_021: [** The `getDigitalTwinComponent` method shall return a promise if there is no callback passed. **]**

## getDigitalTwinModel

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_008: [** The `getDigitalTwinModel` method shall call the `getDigitalTwinModel` method of the protocol layer with the given argument. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_009: [** The `getDigitalTwinModel` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_010: [** The `getDigitalTwinModel` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_022: [** The `getDigitalTwinModel` method shall return a promise if there is no callback passed. **]**

## updateDigitalTwin

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_011: [** The `updateDigitalTwin` method shall call the `updateInterfaces` method of the protocol layer with the given arguments. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_012: [** The `updateDigitalTwin` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_013: [** The `updateDigitalTwin` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_023: [** The `updateDigitalTwin` method shall return a promise if there is no callback passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_026: [** The `updateDigitalTwin` method shall call the `updateInterfaces` method of the protocol layer with the given arguments including eTag. **]**

## updateDigitalTwinProperty

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_014: [** The `updateDigitalTwinProperty` method shall call the `updateInterfaces` method of the protocol layer. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_015: [** The `updateDigitalTwinProperty` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_016: [** The `updateDigitalTwinProperty` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_024: [** The `updateDigitalTwinProperty` method shall return a promise if there is no callback passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_027: [** The `updateDigitalTwinProperty` method shall call the `updateInterfaces` method of the protocol layer including eTag. **]**

## invokeCommand

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_017: [** The `invokeCommand` method shall call the `invokeInterfaceCommand` method of the protocol layer with the given arguments. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_018: [** The `invokeCommand` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_019: [** The `invokeCommand` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_025: [** The `invokeCommand` method shall return a promise if there is no callback passed. **]**
