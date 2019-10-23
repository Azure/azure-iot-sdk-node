/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { DigitalTwinRepositoryService as PLClient, DigitalTwinRepositoryServiceModels as Models } from '../pl/digitalTwinRepositoryService';
import { tripleValueCallbackToPromise, TripleValueCallback } from 'azure-iot-common';
import * as msRest from '@azure/ms-rest-js';
import { ModelRepositoryCredentials } from '../auth/model_repository_credentials';
import { ArgumentError } from 'azure-iot-common/lib/errors';

/**
 * @export
 * @type GetModelParams   Type alias to simplify the auto generated type's name
 */
export type GetModelParams = Models.DigitalTwinRepositoryServiceGetModelOptionalParams;

/**
 * @export
 * @type GetModelResponse   Type alias to simplify the auto generated type's name
 */
export type GetModelResponse = Models.GetModelResponse;

/**
 * @export
 * @type SearchModelOptions   Type alias to simplify the auto generated type's name
 */
export type SearchModelOptions = Models.SearchOptions;

/**
 * @export
 * @type SearchModelParams   Type alias to simplify the auto generated type's name
 */
export type SearchModelParams = Models.DigitalTwinRepositoryServiceSearchModelOptionalParams;

/**
 * @export
 * @type SearchResponse   Type alias to simplify the auto generated type's name
 */
export type SearchResponse = Models.SearchResponse;

/**
 * @export
 * @type SearchModelResponse   Type alias to simplify the auto generated type's name
 */
export type SearchModelResponse = Models.SearchModelResponse;

/**
 * @export
 * @type CreateOrUpdateModelParams   Type alias to simplify the auto generated type's name
 */
export type CreateOrUpdateModelParams = Models.DigitalTwinRepositoryServiceCreateOrUpdateModelOptionalParams;

/**
 * @export
 * @type CreateOrUpdateModelResponse   Type alias to simplify the auto generated type's name
 */
export type CreateOrUpdateModelResponse = {
  _response: msRest.HttpResponse | undefined;
  xMsRequestId: string;
  eTag: string;
};

/**
 * @export
 * @type DeleteModelParams   Type alias to simplify the auto generated type's name
 */
export type DeleteModelParams = Models.DigitalTwinRepositoryServiceDeleteModelOptionalParams;

/**
 * @export
 * @type DeleteModelResponse   Type alias to simplify the auto generated type's name
 */
export type DeleteModelResponse = {
  _response: msRest.HttpResponse | undefined;
  xMsRequestId: string;
} | undefined;

/**
 * @export
 * @class ModelRepositoryServiceClient    Main class to implement Azure IoT Model Repository Service Client API
 */
export class ModelRepositoryServiceClient {
  /**
   * @private
   * The IoTHub token credentials used for creating the Protocol Layer client.
   */
  private _credentials: ModelRepositoryCredentials;
  /**
   * @private
   * The Protocol Layer Client instance used by the DigitalTwinServiceClient.
   */
  private _pl: PLClient;
  /**
   * @private
   * The Azure Model Repository service's API version.
   */
  private _apiVersion: string = '2019-07-01-Preview';

  /**
   * Constructor which also creates an instance of the Protocol Layer Client used by the ModelRepoServiceClient.
   * @param {IoTHubTokenCredentials} credentials    The IoTHub token credentials used for creating the Protocol Layer client.
   * @memberof ModelRepositoryServiceClient
   */
  constructor(credentials: ModelRepositoryCredentials) {
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_001: [ The `ModelRepositoryServiceClient` creates an instance of the ModelRepositoryServiceClient passing ModelRepositoryCredentials class as an argument. ]*/
    this._credentials = credentials;
    this._pl = new PLClient(this._credentials, {
        baseUri: credentials.getBaseUri(),
        deserializationContentTypes: { // application/ld+json isn't supported by autorest by default, which is why we need these options
          json: [
            'application/ld+json',
            'application/json',
            'text/json'
          ]
      }
    });
  }

  /**
   * @method getModel                         module: azure-iot-modelrepository-service.ModelRepoServiceClient.getModel
   * @description                             Retrieve a Digital Twin Model.
   * @param {string} modelId                  The Id of the requested model.
   * @param {GetModelParams} options          Optional argument with the following members:
   *                                          JSON format:
   *                                          options = {
   *                                            'repositoryId': '',
   *                                            'xMsClientRequestId': '',
   *                                            'expand'
   *                                          };
   *                                          Where:
   *                                          'repositoryId'
   *                                              {string} Private repository id. To access global repository, caller should not specify this value.
   *                                          'xMsClientRequestId'
   *                                              {string} Provides a client-generated opaque value that is recorded in the logs.
   *                                              Using this header is highly recommended for correlating client-side activities
   *                                              with requests received by the server.
   *                                          'expand'
   *                                              {boolean} Indicates whether to expand the capability
   *                                              model's interface definitions inline or not. This query parameter ONLY
   *                                              applies to Capability model. Default value: false .
   * @returns GetModelResponse                The return object containing the Model plus the HttpResponse.
   * @memberof ModelRepositoryServiceClient
   */
  getModel(modelId: string, options?: GetModelParams): Promise<GetModelResponse>;
  getModel(modelId: string, options?: GetModelParams, callback?: TripleValueCallback<GetModelResponse, msRest.HttpOperationResponse>): void;
  getModel(modelId: string, options?: GetModelParams, callback?: TripleValueCallback<GetModelResponse, msRest.HttpOperationResponse>): void | Promise<GetModelResponse> {
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_002: [ The `getModel` method shall call the `getModel` method of the protocol layer with the given arguments. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_003: [ The `getModel` method shall call the callback with an error parameter if a callback is passed. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_004: [ The `getModel` method shall return error if the method of the protocol layer failed. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_005: [ The `getModel` method shall return a promise if there is no callback passed. ]*/
    return tripleValueCallbackToPromise<GetModelResponse, msRest.HttpOperationResponse, GetModelResponse>((_callback) => {
      if (!options) {
        options = {};
      }
      this._pl.getModel(modelId, this._apiVersion, options, (err, result, request, response) => {
      _callback(err as Error, result, response);
      });
    }, (result, response) => result, callback as TripleValueCallback<GetModelResponse, msRest.HttpOperationResponse>);
  }

  /**
   * @method searchModel                             module: azure-iot-modelrepository-service.ModelRepoServiceClient.searchModel
   * @description                                    Search Digital Twin Models in the Model Repository using a search filter.
   * @param (SearchModelOptions) SearchModelOptions  To search models with the keyword, filter and continuation.
   * @param {SearchModelParams} options              Optional argument with the following members:
   *                                                 JSON format:
   *                                                 options = {
   *                                                   'repositoryId': '',
   *                                                   'xMsClientRequestId': '',
   *                                                 };
   *                                                 Where:
   *                                                 'repositoryId'
   *                                                    {string} Private repository id. To access global repository, caller should not specify this value.
   *                                                 'xMsClientRequestId'
   *                                                    {string} Provides a client-generated opaque value that is recorded in the logs.
   *                                                    Using this header is highly recommended for correlating client-side activities
   *                                                    with requests received by the server.
   * @returns SearchResponse                         The return object containing the SearchResponse plus the HttpResponse.
   * @memberof ModelRepositoryServiceClient
   */
  searchModel(searchModelOptions: SearchModelOptions, searchModelParams: SearchModelParams): Promise<SearchResponse>;
  searchModel(searchModelOptions: SearchModelOptions, searchModelParams: SearchModelParams, callback?: TripleValueCallback<SearchModelResponse, msRest.HttpOperationResponse>): void;
  searchModel(searchModelOptions: SearchModelOptions, searchModelParams: SearchModelParams, callback?: TripleValueCallback<SearchModelResponse, msRest.HttpOperationResponse>): void | Promise<SearchResponse> {
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_006: [ The `searchModel` method shall call the `searchModel` method of the protocol layer with the given arguments. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_007: [ The `searchModel` method shall call the callback with an error parameter if a callback is passed. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_008: [ The `searchModel` method shall return error if the method of the protocol layer failed. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_009: [ The `searchModel` method shall return a promise if there is no callback passed. ]*/
    return tripleValueCallbackToPromise<SearchResponse, msRest.HttpOperationResponse, SearchModelResponse>((_callback) => {
      if (!searchModelParams) {
        searchModelParams = {};
      }
      this._pl.searchModel(searchModelOptions, this._apiVersion, searchModelParams, (err, result, request, response) => {
      _callback(err as Error, result, response);
      });
    }, (result, response) => result as SearchModelResponse, callback as TripleValueCallback<SearchResponse, msRest.HttpOperationResponse>);
  }

  /**
   * @method createModel                             module: azure-iot-modelrepository-service.ModelRepoServiceClient.createModel
   * @description                                    Creates a Digital Twin Model in the Model Repository.
   * @param {any} model                              Model definition in Digital Twin Definition Language format.
   * @param {CreateOrUpdateModelParams} options      Optional argument with the following members:
   *                                                 JSON format:
   *                                                 options = {
   *                                                   'repositoryId': '',
   *                                                   'xMsClientRequestId': '',
   *                                                 };
   *                                                 Where:
   *                                                 'repositoryId'
   *                                                    {string} Private repository id. To access global repository, caller should not specify this value.
   *                                                 'xMsClientRequestId'
   *                                                    {string} Provides a client-generated opaque value that is recorded in the logs.
   *                                                    Using this header is highly recommended for correlating client-side activities
   *                                                    with requests received by the server.
   * @returns CreateOrUpdateModelResponse            The return object containing the CreateResponse plus the HttpResponse.
   * @memberof ModelRepositoryServiceClient
   */
  createModel(model: any, options?: CreateOrUpdateModelParams): Promise<CreateOrUpdateModelResponse>;
  createModel(model: any, options?: CreateOrUpdateModelParams, callback?: TripleValueCallback<CreateOrUpdateModelResponse, msRest.HttpOperationResponse>): void;
  createModel(model: any, options?: CreateOrUpdateModelParams, callback?: TripleValueCallback<CreateOrUpdateModelResponse, msRest.HttpOperationResponse>): void | Promise<CreateOrUpdateModelResponse> {
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_010: [ The `createModel` method shall call the `createOrUpdateModel` method of the protocol layer with the given arguments. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_011: [ The `createModel` method shall call the callback with an error parameter if a callback is passed. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_012: [ The `createModel` method shall return error if the method of the protocol layer failed. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_013: [ The `createModel` method shall return a promise if there is no callback passed. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_022: [ The `createModel` method shall throw ArgumentError if 'ifMatch' (eTag) is specified in 'options' argument. ]*/
    return tripleValueCallbackToPromise<CreateOrUpdateModelResponse, msRest.HttpOperationResponse, CreateOrUpdateModelResponse>((_callback) => {
      if (options) {
        if (options.ifMatch)
          throw new ArgumentError('IfMatch (eTag) should not be specified in createModel API!');
      } else {
        options = {};
      }
      this._pl.createOrUpdateModel(model['@id'], this._apiVersion, model, options, (err, result, request, response) => {
        let createOrUpdateModelResponse: CreateOrUpdateModelResponse = {
          _response: response,
          xMsRequestId: response ? response.parsedHeaders ? response.parsedHeaders.xMsRequestId : undefined : undefined,
          eTag: response ? response.parsedHeaders ? response.parsedHeaders.eTag : undefined : undefined,
        };
      _callback(err as Error, createOrUpdateModelResponse, response);
      });
    }, (createOrUpdateModelResponse, response) => createOrUpdateModelResponse, callback as TripleValueCallback<CreateOrUpdateModelResponse, msRest.HttpOperationResponse>);
  }

  /**
   * @method updateModel                             module: azure-iot-modelrepository-service.ModelRepoServiceClient.updateModel
   * @description                                    Updates a Digital Twin Model in the Model Repository.
   * @param {any} model                              Model definition in Digital Twin Definition Language format.
   * @param {CreateOrUpdateModelParams} options      Optional argument with the following members:
   *                                                 JSON format:
   *                                                 options = {
   *                                                   'repositoryId': '',
   *                                                   'xMsClientRequestId': '',
   *                                                 };
   *                                                 Where:
   *                                                 'repositoryId'
   *                                                    {string} Private repository id. To access global repository, caller should not specify this value.
   *                                                 'xMsClientRequestId'
   *                                                    {string} Provides a client-generated opaque value that is recorded in the logs.
   *                                                    Using this header is highly recommended for correlating client-side activities
   *                                                    with requests received by the server.
   * @returns CreateOrUpdateModelResponse            The return object containing the UpdateResponse plus the HttpResponse.
   * @memberof ModelRepositoryServiceClient
   */
  updateModel(model: any, eTag: string, options?: CreateOrUpdateModelParams): Promise<CreateOrUpdateModelResponse>;
  updateModel(model: any, eTag: string, options?: CreateOrUpdateModelParams, callback?: TripleValueCallback<CreateOrUpdateModelResponse, msRest.HttpOperationResponse>): void;
  updateModel(model: any, eTag: string, options?: CreateOrUpdateModelParams, callback?: TripleValueCallback<CreateOrUpdateModelResponse, msRest.HttpOperationResponse>): void | Promise<CreateOrUpdateModelResponse> {
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_014: [ The `createModel` method shall call the `createOrUpdateModel` method of the protocol layer with the given arguments. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_015: [ The `createModel` method shall call the callback with an error parameter if a callback is passed. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_016: [ The `createModel` method shall return error if the method of the protocol layer failed. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_017: [ The `createModel` method shall return a promise if there is no callback passed. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_023: [ The `updateModel` method shall use the 'eTag' argument's value even if user specified the 'ifMatch' in the 'options' argument. ]*/
    return tripleValueCallbackToPromise<CreateOrUpdateModelResponse, msRest.HttpOperationResponse, CreateOrUpdateModelResponse>((_callback) => {
      if (!options) {
        options = {
          'ifMatch': eTag
        };
      } else {
        if (options.ifMatch) {
          options.ifMatch = eTag;
        }
      }
      this._pl.createOrUpdateModel(model['@id'], this._apiVersion, model, options, (err, result, request, response) => {
        let createOrUpdateModelResponse: CreateOrUpdateModelResponse = {
          _response: response,
          xMsRequestId: response ? response.parsedHeaders ? response.parsedHeaders.xMsRequestId : undefined : undefined,
          eTag: response ? response.parsedHeaders ? response.parsedHeaders.eTag : undefined : undefined,
        };
      _callback(err as Error, createOrUpdateModelResponse, response);
      });
    }, (createOrUpdateModelResponse, response) => createOrUpdateModelResponse, callback as TripleValueCallback<CreateOrUpdateModelResponse, msRest.HttpOperationResponse>);
  }

  /**
   * @method deleteModel                             module: azure-iot-modelrepository-service.ModelRepoServiceClient.deleteModel
   * @description                                    Deletes a Digital Twin Model in the Model Repository.
   * @param {string} modelId                         The model Id of the model to delete.
   * @param {DeleteModelParams} options              Optional argument with the following members:
   *                                                 JSON format:
   *                                                 options = {
   *                                                   'xMsClientRequestId': '',
   *                                                 };
   *                                                 Where:
   *                                                 'xMsClientRequestId'
   *                                                    {string} Provides a client-generated opaque value that is recorded in the logs.
   *                                                    Using this header is highly recommended for correlating client-side activities
   *                                                    with requests received by the server.
   * @returns DeleteModelResponse                    The return object containing the DeleteResponse plus the HttpResponse.
   * @memberof ModelRepositoryServiceClient
   */
  deleteModel(modelId: string, options?: DeleteModelParams): Promise<DeleteModelResponse>;
  deleteModel(modelId: string, options?: DeleteModelParams, callback?: TripleValueCallback<DeleteModelResponse, msRest.HttpOperationResponse>): void;
  deleteModel(modelId: string, options?: DeleteModelParams, callback?: TripleValueCallback<DeleteModelResponse, msRest.HttpOperationResponse>): void | Promise<DeleteModelResponse> {
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_018: [ The `deleteModel` method shall call the `deleteModel` method of the protocol layer with the given arguments. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_019: [ The `deleteModel` method shall call the callback with an error parameter if a callback is passed. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_020: [ The `deleteModel` method shall return error if the method of the protocol layer failed. ]*/
    /* Codes_SRS_NODE_MODEL_REPOSITORY_SERVICE_CLIENT_12_021: [ The `deleteModel` method shall return a promise if there is no callback passed. ]*/
    return tripleValueCallbackToPromise<DeleteModelResponse, msRest.HttpOperationResponse, DeleteModelResponse>((_callback) => {
      if (!options) {
          options = {};
      }
      this._pl.deleteModel(modelId, this._credentials.getRepositoryId(), this._apiVersion, options, (err, result, request, response) => {
        let deleteModelResponse: DeleteModelResponse = {
          _response: response ? response : undefined,
          xMsRequestId: response ? response.parsedHeaders ? response.parsedHeaders.xMsRequestId : undefined : undefined
        };
      _callback(err as Error, deleteModelResponse, response);
      });
    }, (deleteModelResponse, response) => deleteModelResponse, callback as TripleValueCallback<DeleteModelResponse, msRest.HttpOperationResponse>);
  }
}
