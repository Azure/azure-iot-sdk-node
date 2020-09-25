# Digital Twin Service Client requirements

The `DigitalTwinClient` class provides methods to interact with a device's digital twin object stored in Azure IoT Hub.

## Overview

## Public interface

```typescript
type DigitalTwinGetResponse = Models.DigitalTwinGetDigitalTwinResponse;
type DigitalTwinUpdateResponse = Models.DigitalTwinUpdateDigitalTwinResponse;
type DigitalTwinGetComponentsResponse = Models.DigitalTwinGetComponentsResponse;
type DigitalTwinInterfaces = Models.DigitalTwinInterfaces;
type DigitalTwinPatch = Models.DigitalTwinPatch;
type DigitalTwinInterfacesPatch = Models.DigitalTwinInterfacesPatch;
type DigitalTwinUpdateComponentResponse = Models.DigitalTwinUpdateComponentResponse;
type DigitalTwinGetComponentResponse = Models.DigitalTwinGetComponentResponse;
type GetModelResponse = Models.DigitalTwinGetDigitalTwinModelResponse;
type DigitalTwinUpdateDigitalTwinModelResponse = Models.DigitalTwinUpdateDigitalTwinModelResponse | void;
type DigitalTwinInvokeComponentCommandResponse = Models.DigitalTwinInvokeComponentCommandResponse;

class DigitalTwinClient

  getDigitalTwin(digitalTwinId: string): Promise<DigitalTwinResponse>;
  getDigitalTwin(digitalTwinId: string, callback: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void;
  getDigitalTwin(digitalTwinId: string, callback?: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void | Promise<DigitalTwinResponse>;

  updateDigitalTwin(digitalTwinId: string, patch: DigitalTwinPatch, eTag?: string): Promise<DigitalTwinUpdateResponse>;
  updateDigitalTwin(digitalTwinId: string, patch: DigitalTwinPatch, eTagOrCallback?: string | TripleValueCallback<DigitalTwinUpdateResponse, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwinUpdateResponse, msRest.HttpOperationResponse>): void;
  updateDigitalTwin(digitalTwinId: string, patch: DigitalTwinPatch, eTagOrCallback?: string | TripleValueCallback<DigitalTwinUpdateResponse, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwinUpdateResponse, msRest.HttpOperationResponse>): void | Promise<DigitalTwinUpdateResponse>;

  getComponents(digitalTwinId: string): Promise<DigitalTwinGetComponentsResponse>;
  getComponents(digitalTwinId: string, callback: TripleValueCallback<DigitalTwinGetComponentsResponse, msRest.HttpOperationResponse>): void;
  getComponents(digitalTwinId: string, callback?: TripleValueCallback<DigitalTwinGetComponentsResponse, msRest.HttpOperationResponse>): void | Promise<DigitalTwinGetComponentsResponse>;

  updateComponent(digitalTwinId: string, patch: DigitalTwinInterfacesPatch, eTag?: string): Promise<DigitalTwinUpdateComponentResponse>;
  updateComponent(digitalTwinId: string, patch: DigitalTwinInterfacesPatch, eTagOrCallback?: string | TripleValueCallback<DigitalTwinUpdateComponentResponse, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwinUpdateComponentResponse, msRest.HttpOperationResponse>): void;
  updateComponent(digitalTwinId: string, patch: DigitalTwinInterfacesPatch, eTagOrCallback?: string | TripleValueCallback<DigitalTwinUpdateComponentResponse, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwinUpdateComponentResponse, msRest.HttpOperationResponse>): void | Promise<DigitalTwinUpdateComponentResponse>;

  getComponent(digitalTwinId: string, componentName: string): Promise<DigitalTwinGetComponentResponse>;
  getComponent(digitalTwinId: string, componentName: string, callback: TripleValueCallback<DigitalTwinGetComponentResponse, msRest.HttpOperationResponse>): void;
  getComponent(digitalTwinId: string, componentName: string, callback?: TripleValueCallback<DigitalTwinGetComponentResponse, msRest.HttpOperationResponse>): void | Promise<DigitalTwinGetComponentResponse>;

  getDigitalTwinModel(modelId: string): Promise<GetModelResponse>;
  getDigitalTwinModel(modelId: string, callback: TripleValueCallback<GetModelResponse, msRest.HttpOperationResponse>): void;
  getDigitalTwinModel(modelId: string, callback?: TripleValueCallback<GetModelResponse, msRest.HttpOperationResponse>): void | Promise<GetModelResponse>;

  updateDigitalTwinModel(modelId: string, eTag?: string): Promise<DigitalTwinUpdateDigitalTwinModelResponse>;
  updateDigitalTwinModel(modelId: string, eTagOrCallback?: string | TripleValueCallback<DigitalTwinUpdateDigitalTwinModelResponse, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwinUpdateDigitalTwinModelResponse, msRest.HttpOperationResponse>): void;
  updateDigitalTwinModel(modelId: string, eTagOrCallback?: string | TripleValueCallback<DigitalTwinUpdateDigitalTwinModelResponse, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwinUpdateDigitalTwinModelResponse, msRest.HttpOperationResponse>): void | Promise<DigitalTwinUpdateDigitalTwinModelResponse>;

  invokeComponentCommand(digitalTwinId: string, componentName: string, commandName: string, argument: string): Promise<DigitalTwinInvokeComponentCommandResponse>;
  invokeComponentCommand(digitalTwinId: string, componentName: string, commandName: string, argument: string, callback: TripleValueCallback<DigitalTwinInvokeComponentCommandResponse, msRest.HttpOperationResponse>): void;
  invokeComponentCommand(digitalTwinId: string, componentName: string, commandName: string, argument: string, callback?: TripleValueCallback<DigitalTwinInvokeComponentCommandResponse, msRest.HttpOperationResponse>): void | Promise<DigitalTwinInvokeComponentCommandResponse>;
```

## Public API

## Constructor

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_001: [** The `DigitalTwinClient` creates an instance of the DigitalTwinClient passing IoTHubTokenCredentials class as an argument. **]**

## getDigitalTwin

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_002: [** The `getDigitalTwin` method shall call the `getDigitalTwin` method of the protocol layer with the given argument. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_003: [** The `getDigitalTwin` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_004: [** The `getDigitalTwin` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_020: [** The `getDigitalTwin` method shall return a promise if there is no callback passed. **]**

## updateDigitalTwin

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_035: [** The `updateDigitalTwin` method shall call the `updateDigitalTwin` method of the protocol layer with the given argument. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_036: [** The `updateDigitalTwin` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_037: [** The `updateDigitalTwin` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_038: [** The `updateDigitalTwin` method shall return a promise if there is no callback passed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_039: [** The `updateDigitalTwin` method shall call the `updateDigitalTwin` method of the protocol layer with the given arguments including eTag. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_040: [** The `updateDigitalTwin` method shall return a promise if eTag is passed and there is no callback passed.] **]**

## getComponents

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_031: [** The `getComponents` method shall call the `getComponents` method of the protocol layer with the given argument. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_032: [** The `getComponents` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_033: [** The `getComponents` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_034: [** The `getComponents` method shall return a promise if there is no callback passed. **]**

## updateComponent

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_011: [** The `updateComponent` method shall call the `updateComponent` method of the protocol layer with the given arguments. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_012: [** The `updateComponent` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_013: [** The `updateComponent` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_023: [** The `updateComponent` method shall return a promise if there is no callback passed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_026: [** The `updateComponent` method shall call the `updateComponent` method of the protocol layer with the given arguments including eTag. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_030: [** The `updateComponent` method shall return a promise if eTag is passed and there is no callback passed.] **]**

## getComponent

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_005: [** The `getComponent` method shall call the `getComponent` method of the protocol layer with the given arguments. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_006: [** The `getComponent` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_007: [** The `getComponent` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_021: [** The `getComponent` method shall return a promise if there is no callback passed. **]**

## getDigitalTwinModel

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_008: [** The `getDigitalTwinModel` method shall call the `getDigitalTwinModel` method of the protocol layer with the given argument. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_009: [** The `getDigitalTwinModel` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_010: [** The `getDigitalTwinModel` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_022: [** The `getDigitalTwinModel` method shall return a promise if there is no callback passed. **]**

## updateDigitalTwinModel

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_035: [** The `updateDigitalTwinModel` method shall call the `updateDigitaupdateDigitalTwinModellTwin` method of the protocol layer with the given argument. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_036: [** The `updateDigitalTwinModel` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_037: [** The `updateDigitalTwinModel` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_038: [** The `updateDigitalTwinModel` method shall return a promise if there is no callback passed. **]**

## invokeCommand

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_017: [** The `invokeCommand` method shall call the `invokeComponentCommand` method of the protocol layer with the given arguments. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_018: [** The `invokeCommand` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_019: [** The `invokeCommand` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_DIGITAL_TWIN_CLIENT_12_025: [** The `invokeCommand` method shall return a promise if there is no callback passed. **]**
