/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { IotHubGatewayServiceAPIs as PLClient, IotHubGatewayServiceAPIsModels as Models } from '../pl/iotHubGatewayServiceAPIs';
import { tripleValueCallbackToPromise, TripleValueCallback } from 'azure-iot-common';
import { IoTHubTokenCredentials } from '../auth/iothub_token_credentials';
import * as msRest from '@azure/ms-rest-js';

/**
 * @export
 * @type DigitalTwin   Type alias to simplify the auto generated type's name
 */
export type DigitalTwin = Models.DigitalTwinGetComponentsHeaders | undefined;

/**
 * @export
 * @type DigitalTwinResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinResponse = Models.DigitalTwinGetDigitalTwinResponse | undefined;


/**
 * @export
 * @type DigitalTwinComponents   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinComponents = Models.DigitalTwinInterfaces | undefined;

/**
 * @export
 * @type DigitalTwinGetComponentResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinGetComponentResponse = Models.DigitalTwinGetComponentResponse;

/**
 * @export
 * @type DigitalTwinGetComponentsResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinGetComponentsResponse = Models.DigitalTwinGetComponentsResponse;

/**
 * @export
 * @type DigitalTwinUpdateResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinUpdateResponse = Models.DigitalTwinUpdateDigitalTwinResponse | undefined;

/**
 * @export
 * @type Model   Type alias to simplify the auto generated type's name
 */
export type Model = Models.DigitalTwinGetDigitalTwinModelResponse;

/**
 * @export
 * @type DigitalTwinGetDigitalTwinModelResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinGetDigitalTwinModelResponse = Models.DigitalTwinGetDigitalTwinModelResponse;

/**
 * @export
 * @type DigitalTwinComponentsPatch   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinComponentsPatch = Models.DigitalTwinInterfacesPatch;

/**
 * @export
 * @type DigitalTwinUpdateComponentResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinUpdateComponentResponse = Models.DigitalTwinUpdateComponentResponse | undefined;

/**
 * @export
 * @interface CommandResult   Base interface containing the following fields:
 * @field result              The return value of an invoked command
 * @field statusCode          The status code of the executed command
 * @field requestId           Identifier of the invoked command
 */
export interface CommandResult {
  result?: any;
  statusCode?: number;
  requestId?: string;
}

/**
 * @export
 * @interface CommandResultResponse   Extended command result interface adding the following field:
 * @field _response                   The full and parsed Http response for debugging purposes
 */
export interface CommandResultResponse extends CommandResult {
  _response?: msRest.HttpOperationResponse;
}

/**
 * @private
 * Helper function to create extended result type
 */
function createResultWithHttpOperationResponse<TArg, TResult>(result: TArg, response: msRest.HttpOperationResponse): TResult {
  if (result) {
    (result as any)._response = response;
  }
  return <any>result;
}

/**
 * @export
 * @class DigitalTwinServiceClient    Main class to implement Azure IoT Digital Twin Service Client API
 */
export class DigitalTwinServiceClient {
  /**
   * @private
   * The IoTHub token credentials used for creating the Protocol Layer client.
   */
  private _creds: IoTHubTokenCredentials;
  /**
   * @private
   * The Protocol Layer Client instance used by the DigitalTwinServiceClient.
   */
  private _pl: PLClient;
  /**
   * @private
   * The Azure IoT service's API version.
   */
  private _apiVersion: string = '2020-05-31-preview';

  /**
   * Constructor which also creates an instance of the Protocol Layer Client used by the DigitalTwinServiceClient.
   * @param {IoTHubTokenCredentials} creds    The IoTHub token credentials used for creating the Protocol Layer client.
   * @memberof DigitalTwinServiceClient
   */
  constructor(creds: IoTHubTokenCredentials) {
    /*Code_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_001: [** The `DigitalTwinServiceClient` creates an instance of the DigitalTwinServiceClient passing IoTHubTokenCredentials class as an argument.]*/
    this._creds = creds;
    this._pl = new PLClient(this._creds, {
      baseUri: 'https://' + this._creds.getHubName(),
      apiVersion: this._apiVersion,
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
   * @method getDigitalTwin                      module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.getDigitalTwin
   * @description                                Retrieve the Digital Twin of a given device.
   * @param {string} digitalTwinId               The digital twin Id of the given device or module.
   *                                             Format of digitalTwinId is DeviceId[~ModuleId]. ModuleId is optional.
   * @returns DigitalTwinResponse                The return object containing the Digital Twin plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  getDigitalTwin(digitalTwinId: string): Promise<DigitalTwinResponse>;
  getDigitalTwin(digitalTwinId: string, callback: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void;
  getDigitalTwin(digitalTwinId: string, callback?: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void | Promise<DigitalTwinResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_002: [The `getDigitalTwin` method shall call the `getDigitalTwin` method of the protocol layer with the given argument.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_003: [The `getDigitalTwin` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_004: [The `getDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_020: [The `getDigitalTwin` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<DigitalTwin, msRest.HttpOperationResponse, DigitalTwinResponse>((_callback) => {
      this._pl.digitalTwin.getDigitalTwin(digitalTwinId, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<DigitalTwin, DigitalTwinResponse>(result, response), callback as TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>);
  }

  /**
   * @method updateDigitalTwin                          module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.updateDigitalTwin
   * @description                                       Update the Digital Twin of a given device using a patch object.
   * @param {string} digitalTwinId                      The digital twin Id of the given device.
   * @param {any[]} patch                               The patch objet contains the update part of a Digital Twin.
   * @param {string} eTag                               The eTag for identifying the patch.
   * @returns DigitalTwinUpdateResponse                 The HTTPesponse.
   * @memberof DigitalTwinServiceClient
   */
  updateDigitalTwin(digitalTwinId: string, patch: any[], eTag?: string): Promise<DigitalTwinUpdateResponse>;
  updateDigitalTwin(digitalTwinId: string, patch: any[], eTagOrCallback?: string | TripleValueCallback<void, msRest.HttpOperationResponse>, callback?: TripleValueCallback<void, msRest.HttpOperationResponse>): void;
  updateDigitalTwin(digitalTwinId: string, patch: any[], eTagOrCallback?: string | TripleValueCallback<void, msRest.HttpOperationResponse>, callback?: TripleValueCallback<void, msRest.HttpOperationResponse>): void | Promise<DigitalTwinUpdateResponse> {
    const actualCallback = typeof eTagOrCallback === 'function' ? eTagOrCallback : callback;
    const actualEtag = typeof eTagOrCallback !== 'function' ? eTagOrCallback : undefined;
    const options = actualEtag ? {ifMatch: actualEtag} : undefined;

    return tripleValueCallbackToPromise<void, msRest.HttpOperationResponse, DigitalTwinUpdateResponse>((_callback) => {
      this._pl.digitalTwin.updateDigitalTwin(digitalTwinId, patch, options as Models.DigitalTwinUpdateDigitalTwinOptionalParams, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<void, DigitalTwinUpdateResponse>(result, response), actualCallback as TripleValueCallback<void, msRest.HttpOperationResponse>);
  }

  /**
   * @method getComponents                      module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.getDigitalTwinComponent
   * @description                               Retrieve all components of the Digital Twin of a given device.
   * @param {string} digitalTwinId              The digital twin Id of the given device.
   * @param {string} componentName              The name of the requested component.
   * @returns DigitalTwinGetComponentsResponse  The return object containing the component plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  getComponents(digitalTwinId: string): Promise<DigitalTwinGetComponentsResponse>;
  getComponents(digitalTwinId: string, callback: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void;
  getComponents(digitalTwinId: string, callback?: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void | Promise<DigitalTwinGetComponentsResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_005: [The `getDigitalTwinComponent` method shall call the `getComponent` method of the protocol layer with the given arguments.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_006: [The `getDigitalTwinComponent` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_007: [The `getDigitalTwinComponent` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_021: [The `getDigitalTwinComponent` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<DigitalTwinComponents, msRest.HttpOperationResponse, DigitalTwinGetComponentsResponse>((_callback) => {
      this._pl.digitalTwin.getComponents(digitalTwinId, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<DigitalTwinComponents, DigitalTwinGetComponentsResponse>(result, response), callback as TripleValueCallback<DigitalTwinComponents, msRest.HttpOperationResponse>);
  }

  /**
   * @method updateComponent                            module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.updateComponent
   * @description                                       Updates desired properties of multiple copmonents.
   * @param {string} digitalTwinId                      Digital Twin ID. Format of digitalTwinId is DeviceId[~ModuleId]. ModuleId is optional.
   * @param {DigitalTwinComponentsPatch} patch          Desired properties to update.
   * @param {string} eTag                               The eTag for identifying the patch.
   * @returns DigitalTwinUpdateComponentResponse        The return object containing the updated Component plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  updateComponent(digitalTwinId: string, patch: DigitalTwinComponentsPatch, eTag?: string): Promise<DigitalTwinUpdateComponentResponse>;
  updateComponent(digitalTwinId: string, patch: DigitalTwinComponentsPatch, eTagOrCallback?: string | TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void;
  updateComponent(digitalTwinId: string, patch: DigitalTwinComponentsPatch, eTagOrCallback?: string | TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void | Promise<DigitalTwinUpdateComponentResponse> {
    const actualCallback = typeof eTagOrCallback === 'function' ? eTagOrCallback : callback;
    const actualEtag = typeof eTagOrCallback !== 'function' ? eTagOrCallback : undefined;
    const options = actualEtag ? {ifMatch: actualEtag} : undefined;

    return tripleValueCallbackToPromise<DigitalTwinComponents, msRest.HttpOperationResponse, DigitalTwinUpdateComponentResponse>((_callback) => {
      this._pl.digitalTwin.updateComponent(digitalTwinId, patch, options as Models.DigitalTwinUpdateComponentOptionalParams, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<DigitalTwinComponents, DigitalTwinUpdateComponentResponse>(result, response), actualCallback as TripleValueCallback<DigitalTwinComponents, msRest.HttpOperationResponse>);
  }

  /**
   * @method getComponent                      module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.getDigitalTwinComponent
   * @description                              Retrieve a component of the Digital Twin of a given device.
   * @param {string} digitalTwinId             The digital twin Id of the given device.
   * @param {string} componentName             The name of the requested component.
   * @returns DigitalTwinGetComponentResponse  The return object containing the component plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  getComponent(digitalTwinId: string, componentName: string): Promise<DigitalTwinGetComponentResponse>;
  getComponent(digitalTwinId: string, componentName: string, callback: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void;
  getComponent(digitalTwinId: string, componentName: string, callback?: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void | Promise<DigitalTwinGetComponentResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_005: [The `getDigitalTwinComponent` method shall call the `getComponent` method of the protocol layer with the given arguments.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_006: [The `getDigitalTwinComponent` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_007: [The `getDigitalTwinComponent` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_021: [The `getDigitalTwinComponent` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<DigitalTwinComponents, msRest.HttpOperationResponse, DigitalTwinGetComponentResponse>((_callback) => {
      this._pl.digitalTwin.getComponent(digitalTwinId, componentName, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<DigitalTwinComponents, DigitalTwinGetComponentResponse>(result, response), callback as TripleValueCallback<DigitalTwinComponents, msRest.HttpOperationResponse>);
  }

  /**
   * @method getModel                                 module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.getModel
   * @description                                     Retrieve a Digital Twin Model.
   * @param {string} modelId                          The model Id of the requested model.
   * @returns DigitalTwinGetDigitalTwinModelResponse  The return object containing the Model plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  getModel(modelId: string): Promise<DigitalTwinGetDigitalTwinModelResponse>;
  getModel(modelId: string, callback: TripleValueCallback<Model, msRest.HttpOperationResponse>): void;
  getModel(modelId: string, callback?: TripleValueCallback<Model, msRest.HttpOperationResponse>): void | Promise<DigitalTwinGetDigitalTwinModelResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_008: [The `getModel` method shall call the `getDigitalTwinModel` method of the protocol layer with the given argument.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_009: [The `getModel` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_010: [The `getModel` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_022: [The `getModel` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<Model, msRest.HttpOperationResponse, DigitalTwinGetDigitalTwinModelResponse>((_callback) => {
      this._pl.digitalTwin.getDigitalTwinModel(modelId, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<Model, DigitalTwinGetDigitalTwinModelResponse>(result, response), callback as TripleValueCallback<Model, msRest.HttpOperationResponse>);
  }

  /**
   * @method invokeComponentCommand         module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.invokeComponentCommand
   * @description                           Invoke a command on an component of a particular device and get the result of it.
   * @param {string} digitalTwinId          The digital twin Id of the given device.
   * @param {string} componentName          The component's name.
   * @param {string} commandName            The command's name.
   * @param {string} argument               The argument of a command.
   * @returns CommandResultResponse         The result of the invoked command containing the result, status code, request ID and the parsed HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  invokeComponentCommand(digitalTwinId: string, componentName: string, commandName: string, argument: string): Promise<CommandResultResponse>;
  invokeComponentCommand(digitalTwinId: string, componentName: string, commandName: string, argument: string, callback: TripleValueCallback<CommandResult, msRest.HttpOperationResponse>): void;
  invokeComponentCommand(digitalTwinId: string, componentName: string, commandName: string, argument: string, callback?: TripleValueCallback<CommandResult, msRest.HttpOperationResponse>): void | Promise<CommandResultResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_017: [The `invokeComponentCommand` method shall call the `invokeComponentCommand1` method of the protocol layer with the given arguments.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_018: [The `invokeComponentCommand` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_019: [The `invokeComponentCommand` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_025: [The `invokeComponentCommand` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<CommandResult, msRest.HttpOperationResponse, CommandResultResponse>((_callback) => {
      this._pl.digitalTwin.invokeComponentCommand1(digitalTwinId, componentName, commandName, argument, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<CommandResult, CommandResultResponse>(result, response), callback as TripleValueCallback<CommandResult, msRest.HttpOperationResponse>);
  }
}
