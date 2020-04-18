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
 * @type DigitalTwinGetTwinResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinGetResponse = Models.DigitalTwinGetDigitalTwinResponse;

/**
 * @export
 * @type DigitalTwinUpdateResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinUpdateResponse = Models.DigitalTwinUpdateDigitalTwinResponse;

/**
 * @export
 * @type DigitalTwinGetComponentsResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinGetComponentsResponse = Models.DigitalTwinGetComponentsResponse;

/**
 * @export
 * @type DigitalTwinInterfaces   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinInterfaces = Models.DigitalTwinInterfaces;

/**
 * @export
 * @type DigitalTwinInterfacesPatch   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinInterfacesPatch = Models.DigitalTwinInterfacesPatch;

/**
 * @export
 * @type DigitalTwinUpdateComponentResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinUpdateComponentResponse = Models.DigitalTwinUpdateComponentResponse;

/**
 * @export
 * @type DigitalTwinGetComponentResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinGetComponentResponse = Models.DigitalTwinGetComponentResponse;

/**
 * @export
 * @type GetModelResponse   Type alias to simplify the auto generated type's name
 */
export type GetModelResponse = Models.DigitalTwinGetDigitalTwinModelResponse;

/**
 * @export
 * @type DigitalTwinInvokeComponentCommandResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinInvokeComponentCommandResponse = Models.DigitalTwinInvokeComponentCommandResponse;

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
   * @returns DigitalTwinGetDigitalTwinResponse  The return object containing the Digital Twin plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  getDigitalTwin(digitalTwinId: string): Promise<DigitalTwinGetResponse>;
  getDigitalTwin(digitalTwinId: string, callback: TripleValueCallback<DigitalTwinGetResponse, msRest.HttpOperationResponse>): void;
  getDigitalTwin(digitalTwinId: string, callback?: TripleValueCallback<DigitalTwinGetResponse, msRest.HttpOperationResponse>): void | Promise<DigitalTwinGetResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_002: [The `getDigitalTwin` method shall call the `getComponents` method of the protocol layer with the given argument.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_003: [The `getDigitalTwin` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_004: [The `getDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_020: [The `getDigitalTwin` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<DigitalTwinGetResponse, msRest.HttpOperationResponse, DigitalTwinGetResponse>((_callback) => {
      this._pl.digitalTwin.getDigitalTwin(digitalTwinId, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<DigitalTwinGetResponse, DigitalTwinGetResponse>(result, response), callback as TripleValueCallback<DigitalTwinGetResponse, msRest.HttpOperationResponse>);
  }

  /**
   * @method updateDigitalTwin                  module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.updateDigitalTwin
   * @description                               Update the Digital Twin Component of a given device using a patch object.
   * @param {string} digitalTwinId              The digital twin Id of the given device.
   * @param {any[]} patch  The path objet contains the update part of a Digital Twin Component.
   * @param {string} eTag                       The eTag for identifying the patch.
   * @returns DigitalTwinUpdateResponse         The return object containing the updated Digital Twin plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  updateDigitalTwin(digitalTwinId: string, patch: any[], eTag?: string): Promise<DigitalTwinUpdateResponse>;
  updateDigitalTwin(digitalTwinId: string, patch: any[], eTagOrCallback?: string | TripleValueCallback<void, msRest.HttpOperationResponse>, callback?: TripleValueCallback<void, msRest.HttpOperationResponse>): void;
  updateDigitalTwin(digitalTwinId: string, patch: any[], eTagOrCallback?: string | TripleValueCallback<void, msRest.HttpOperationResponse>, callback?: TripleValueCallback<void, msRest.HttpOperationResponse>): void | Promise<DigitalTwinUpdateResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_035: [The `updateDigitalTwin` method shall call the `updateDigitalTwin` method of the protocol layer with the given arguments.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_036: [The `updateDigitalTwin` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_037: [The `updateDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_038: [The `updateDigitalTwin` method shall return a promise if there is no callback passed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_039: [The `updateDigitalTwin` method shall call the `updateDigitalTwin` method of the protocol layer with the given arguments including eTag.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_040: [The `updateDigitalTwin` method shall return a promise if eTag is passed and there is no callback passed.] */
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
   * @method getComponents                      module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.getComponents
   * @description                               Retrieve list of Digital Twin Components of a given device.
   * @param {string} digitalTwinId              The digital twin Id of the given device or module.
   *                                            Format of digitalTwinId is DeviceId[~ModuleId]. ModuleId is optional.
   * @returns DigitalTwinGetComponentsResponse  The return object containing the Digital Twin plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  getComponents(digitalTwinId: string): Promise<DigitalTwinGetComponentsResponse>;
  getComponents(digitalTwinId: string, callback: TripleValueCallback<DigitalTwinGetComponentsResponse, msRest.HttpOperationResponse>): void;
  getComponents(digitalTwinId: string, callback?: TripleValueCallback<DigitalTwinGetComponentsResponse, msRest.HttpOperationResponse>): void | Promise<DigitalTwinGetComponentsResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_031: [The `getComponents` method shall call the `getComponents` method of the protocol layer with the given argument.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_032: [The `getComponents` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_033: [The `getComponents` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_034: [The `getComponents` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<DigitalTwinInterfaces, msRest.HttpOperationResponse, DigitalTwinGetComponentsResponse>((_callback) => {
      this._pl.digitalTwin.getComponents(digitalTwinId, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<DigitalTwinInterfaces, DigitalTwinGetComponentsResponse>(result, response), callback as TripleValueCallback<Models.DigitalTwinInterfaces, msRest.HttpOperationResponse>);
  }

  /**
   * @method updateComponent                            module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.updateComponent
   * @description                                       Update the Digital Twin Component of a given device using a patch object.
   * @param {string} digitalTwinId                      The digital twin Id of the given device.
   * @param {DigitalTwinInterfacesPatch} patch   The path objet contains the update part of a Digital Twin Component.
   * @param {string} eTag                               The eTag for identifying the patch.
   * @returns DigitalTwinResponse                       The return object containing the updated Digital Twin plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  updateComponent(digitalTwinId: string, patch: DigitalTwinInterfacesPatch, eTag?: string): Promise<DigitalTwinUpdateComponentResponse>;
  updateComponent(digitalTwinId: string, patch: DigitalTwinInterfacesPatch, eTagOrCallback?: string | TripleValueCallback<DigitalTwinUpdateComponentResponse, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwinUpdateComponentResponse, msRest.HttpOperationResponse>): void;
  updateComponent(digitalTwinId: string, patch: DigitalTwinInterfacesPatch, eTagOrCallback?: string | TripleValueCallback<DigitalTwinUpdateComponentResponse, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwinUpdateComponentResponse, msRest.HttpOperationResponse>): void | Promise<DigitalTwinUpdateComponentResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_011: [The `updateComponent` method shall call the `updateCompopnent` method of the protocol layer with the given arguments.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_012: [The `updateComponent` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_013: [The `updateComponent` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_023: [The `updateComponent` method shall return a promise if there is no callback passed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_026: [The `updateComponent` method shall call the `updateDigitalTwin` method of the protocol layer with the given arguments including eTag.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_030: [The `updateComponent` method shall return a promise if eTag is passed and there is no callback passed.] */
    const actualCallback = typeof eTagOrCallback === 'function' ? eTagOrCallback : callback;
    const actualEtag = typeof eTagOrCallback !== 'function' ? eTagOrCallback : undefined;
    const options = actualEtag ? {ifMatch: actualEtag} : undefined;

    return tripleValueCallbackToPromise<DigitalTwinInterfaces, msRest.HttpOperationResponse, DigitalTwinUpdateComponentResponse>((_callback) => {
      this._pl.digitalTwin.updateComponent(digitalTwinId, patch, options as Models.DigitalTwinUpdateComponentOptionalParams, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<DigitalTwinInterfaces, DigitalTwinUpdateComponentResponse>(result, response), actualCallback as TripleValueCallback<DigitalTwinInterfaces, msRest.HttpOperationResponse>);
  }

  /**
   * @method getComponent                      module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.getComponent
   * @description                              Retrieve one component of the Digital Twin of a given device.
   * @param {string} digitalTwinId             The digital twin Id of the given device.
   * @param {string} componentName             The name of the requested component.
   * @returns DigitalTwinGetComponentResponse  The return object containing the component plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  getComponent(digitalTwinId: string, componentName: string): Promise<DigitalTwinGetComponentResponse>;
  getComponent(digitalTwinId: string, componentName: string, callback: TripleValueCallback<DigitalTwinGetComponentResponse, msRest.HttpOperationResponse>): void;
  getComponent(digitalTwinId: string, componentName: string, callback?: TripleValueCallback<DigitalTwinGetComponentResponse, msRest.HttpOperationResponse>): void | Promise<DigitalTwinGetComponentResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_005: [The `getComponent` method shall call the `getComponent` method of the protocol layer with the given arguments.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_006: [The `getComponent` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_007: [The `getComponent` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_021: [The `getComponent` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<DigitalTwinInterfaces, msRest.HttpOperationResponse, DigitalTwinGetComponentResponse>((_callback) => {
      this._pl.digitalTwin.getComponent(digitalTwinId, componentName, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<DigitalTwinInterfaces, DigitalTwinGetComponentResponse>(result, response), callback as TripleValueCallback<DigitalTwinInterfaces, msRest.HttpOperationResponse>);
  }

  /**
   * @method getDigitalTwinModel          module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.getDigitalTwinModel
   * @description                         Retrieve a Digital Twin Model.
   * @param {string} modelId              The model Id of the requested model.
   * @returns GetModelResponse            The return object containing the Model plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  getDigitalTwinModel(modelId: string): Promise<GetModelResponse>;
  getDigitalTwinModel(modelId: string, callback: TripleValueCallback<GetModelResponse, msRest.HttpOperationResponse>): void;
  getDigitalTwinModel(modelId: string, callback?: TripleValueCallback<GetModelResponse, msRest.HttpOperationResponse>): void | Promise<GetModelResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_008: [The `getDigitalTwinModel` method shall call the `getDigitalTwinModel` method of the protocol layer with the given argument.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_009: [The `getDigitalTwinModel` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_010: [The `getDigitalTwinModel` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_022: [The `getDigitalTwinModel` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<GetModelResponse, msRest.HttpOperationResponse, GetModelResponse>((_callback) => {
      this._pl.digitalTwin.getDigitalTwinModel(modelId, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<GetModelResponse, GetModelResponse>(result, response), callback as TripleValueCallback<GetModelResponse, msRest.HttpOperationResponse>);
  }

  /**
   * @method invokeComponentCommand                       module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.invokeComponentCommand
   * @description                                         Invoke a command on an component of a particular device and get the result of it.
   * @param {string} digitalTwinId                        The digital twin Id of the given device.
   * @param {string} componentName                        The component's name.
   * @param {string} commandName                          The command's name.
   * @param {string} argument                             The argument of a command.
   * @returns DigitalTwinInvokeComponentCommandResponse   The result of the invoked command containing the result, status code, request ID and the parsed HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  invokeComponentCommand(digitalTwinId: string, componentName: string, commandName: string, argument: string): Promise<DigitalTwinInvokeComponentCommandResponse>;
  invokeComponentCommand(digitalTwinId: string, componentName: string, commandName: string, argument: string, callback: TripleValueCallback<DigitalTwinInvokeComponentCommandResponse, msRest.HttpOperationResponse>): void;
  invokeComponentCommand(digitalTwinId: string, componentName: string, commandName: string, argument: string, callback?: TripleValueCallback<DigitalTwinInvokeComponentCommandResponse, msRest.HttpOperationResponse>): void | Promise<DigitalTwinInvokeComponentCommandResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_017: [The `invokeCommand` method shall call the `invokeComponentCommand` method of the protocol layer with the given arguments.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_018: [The `invokeCommand` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_019: [The `invokeCommand` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_025: [The `invokeCommand` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<DigitalTwinInvokeComponentCommandResponse, msRest.HttpOperationResponse, DigitalTwinInvokeComponentCommandResponse>((_callback) => {
      this._pl.digitalTwin.invokeComponentCommand(digitalTwinId, componentName, commandName, argument, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<DigitalTwinInvokeComponentCommandResponse, DigitalTwinInvokeComponentCommandResponse>(result, response), callback as TripleValueCallback<DigitalTwinInvokeComponentCommandResponse, msRest.HttpOperationResponse>);
  }
}
