# Model Repository Service Client requirements

The `ModelRepositoryServiceClient` class provides methods to interact with Azure IoT Model Repository.

## Overview

## Public interface

```typescript
type GetModelParams = Models.DigitalTwinRepositoryServiceGetModelOptionalParams;
type GetModelResponse = Models.GetModelResponse;
type SearchModelOptions = Models.SearchOptions;
type SearchModelParams = Models.DigitalTwinRepositoryServiceSearchModelOptionalParams;
type SearchResponse = Models.SearchResponse;
type SearchModelResponse = Models.SearchModelResponse;
type CreateOrUpdateModelParams = Models.DigitalTwinRepositoryServiceCreateOrUpdateModelOptionalParams;
type CreateOrUpdateModelResponse = {
  _response: msRest.HttpResponse | undefined;
  xMsRequestId: string;
  eTag: string;
};
type DeleteModelParams = Models.DigitalTwinRepositoryServiceDeleteModelOptionalParams;
type DeleteModelResponse = {
  _response: msRest.HttpResponse | undefined;
  xMsRequestId: string;
} | undefined;

class ModelRepositoryServiceClient
  getModel(modelId: string): Promise<GetModelResponse>;
  getModel(modelId: string, callback: TripleValueCallback<GetModelResponse, msRest.HttpOperationResponse>): void;
  getModel(modelId: string, callback?: TripleValueCallback<GetModelResponse, msRest.HttpOperationResponse>): void | Promise<GetModelResponse>;

  searchModel(searchOptions: Models.SearchOptions): Promise<Models.SearchModelResponse>;
  searchModel(searchOptions: Models.SearchOptions, callback: TripleValueCallback<Models.SearchResponse, msRest.HttpOperationResponse>): void;
  searchModel(searchOptions: Models.SearchOptions, callback?: TripleValueCallback<Models.SearchResponse, msRest.HttpOperationResponse>): void | Promise<Models.SearchModelResponse>;

  createModel(model: any, options?: CreateOrUpdateModelParams): Promise<CreateOrUpdateModelResponse>;
  createModel(model: any, options?: CreateOrUpdateModelParams, callback?: TripleValueCallback<CreateOrUpdateModelResponse, msRest.HttpOperationResponse>): void;
  createModel(model: any, options?: CreateOrUpdateModelParams, callback?: TripleValueCallback<CreateOrUpdateModelResponse, msRest.HttpOperationResponse>): void | Promise<CreateOrUpdateModelResponse>;

  updateModel(model: any, eTag: string, options?: CreateOrUpdateModelParams): Promise<CreateOrUpdateModelResponse>;
  updateModel(model: any, eTag: string, options?: CreateOrUpdateModelParams, callback?: TripleValueCallback<CreateOrUpdateModelResponse, msRest.HttpOperationResponse>): void;
  updateModel(model: any, eTag: string, options?: CreateOrUpdateModelParams, callback?: TripleValueCallback<CreateOrUpdateModelResponse, msRest.HttpOperationResponse>): void | Promise<CreateOrUpdateModelResponse>;

  deleteModel(modelId: string, options?: DeleteModelParams): Promise<DeleteModelResponse>;
  deleteModel(modelId: string, options?: DeleteModelParams, callback?: TripleValueCallback<DeleteModelResponse, msRest.HttpOperationResponse>): void;
  deleteModel(modelId: string, options?: DeleteModelParams, callback?: TripleValueCallback<DeleteModelResponse, msRest.HttpOperationResponse>): void | Promise<DeleteModelResponse>;
```

## Example usage

```javascript
  const modelRepositoryServiceClient = new ModelRepositoryServiceClient(modelRepositoryCredentials);
  const getModelResponse = await modelRepositoryServiceClient.getModel(modelId);
  const searchModelResponse = await modelRepositoryServiceClient.searchModel(searchOptions);
  const createModelResponse = await modelRepositoryServiceClient.createModel(modelDocument);
  const updateResponse = await modelRepositoryServiceClient.updateModel(modelDocument, eTag);
  const deleteModelResponse = await modelRepositoryServiceClient.deleteModel(modelId);
```

## Public API

## Constructor

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_001: [** The `ModelRepositoryServiceClient` creates an instance of the ModelRepositoryServiceClient passing ModelRepositoryCredentials class as an argument. **]**

## getModel

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_002: [** The `getModel` method shall call the `getModel` method of the protocol layer with the given arguments. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_003: [** The `getModel` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_004: [** The `getModel` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_005: [** The `getModel` method shall return a promise if there is no callback passed. **]**

## searchModel

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_006: [** The `searchModel` method shall call the `searchModel` method of the protocol layer with the given arguments. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_007: [** The `searchModel` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_008: [** The `searchModel` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_009: [** The `searchModel` method shall return a promise if there is no callback passed. **]**

## createModel

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_010: [** The `createModel` method shall call the `createOrUpdateModel` method of the protocol layer with the given arguments. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_011: [** The `createModel` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_012: [** The `createModel` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_013: [** The `createModel` method shall return a promise if there is no callback passed. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_022: [** The `createModel` method shall throw ArgumentError if 'ifMatch' (eTag) is specified in 'options' argument. **]**

## updateModel

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_014: [** The `updateModel` method shall call the `createOrUpdateModel` method of the protocol layer with the given arguments. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_015: [** The `updateModel` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_016: [** The `updateModel` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_017: [** The `updateModel` method shall return a promise if there is no callback passed. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_023: [** The `updateModel` method shall use the 'eTag' argument's value even if user specified the 'ifMatch' in the 'options' argument. **]**

## deleteModel

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_018: [** The `deleteModel` method shall call the `deleteModel` method of the protocol layer with the given arguments. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_019: [** The `deleteModel` method shall call the callback with an error parameter if a callback is passed. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_020: [** The `deleteModel` method shall return error if the method of the protocol layer failed. **]**

**SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_021: [** The `deleteModel` method shall return a promise if there is no callback passed. **]**
-->
