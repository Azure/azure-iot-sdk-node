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
export type DigitalTwin = Models.DigitalTwinInterfaces & Models.DigitalTwinGetComponentsHeaders | undefined;

/**
 * @export
 * @type DigitalTwinResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinResponse = Models.DigitalTwinGetComponentsResponse | undefined;

/**
 * @export
 * @type Model   Type alias to simplify the auto generated type's name
 */
export type Model = Models.DigitalTwinGetDigitalTwinModelResponse;

/**
 * @export
 * @type ModelResponse   Type alias to simplify the auto generated type's name
 */
export type ModelResponse = Model & {_response: msRest.HttpOperationResponse};

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
  private _apiVersion: string = '2019-07-01-preview';

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
   * @method getDigitalTwin                   module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.getDigitalTwin
   * @description                             Retrieve the Digital Twin of a given device.
   * @param {string} digitalTwinId            The digital twin Id of the given device.
   * @returns DigitalTwinResponse             The return object containing the Digital Twin plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  getDigitalTwin(digitalTwinId: string): Promise<DigitalTwinResponse>;
  getDigitalTwin(digitalTwinId: string, callback: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void;
  getDigitalTwin(digitalTwinId: string, callback?: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void | Promise<DigitalTwinResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_002: [The `getDigitalTwin` method shall call the `getComponents` method of the protocol layer with the given argument.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_003: [The `getDigitalTwin` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_004: [The `getDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_020: [The `getDigitalTwin` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<DigitalTwin, msRest.HttpOperationResponse, DigitalTwinResponse>((_callback) => {
      this._pl.digitalTwin.getComponents(digitalTwinId, (err, result, request, response) => {
        let digitalTwin: DigitalTwin = {
          interfaces: result ? result.interfaces : undefined,
          version: result ? result.version : undefined,
          eTag: response ? response.parsedHeaders ? response.parsedHeaders.eTag : undefined : undefined
        };
        _callback(err as Error, digitalTwin, response);
      });
    }, (digitalTwin, response) => createResultWithHttpOperationResponse<DigitalTwin, DigitalTwinResponse>(digitalTwin, response), callback as TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>);
  }

  /**
   * @method getDigitalTwinComponentInstance  module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.getDigitalTwinComponentInstance
   * @description                             Retrieve one component instance of the Digital Twin of a given device.
   * @param {string} digitalTwinId            The digital twin Id of the given device.
   * @param {string} componentInstanceName    The name of the requested component instance.
   * @returns DigitalTwinResponse             The return object containing the intercomponentface instance plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  getDigitalTwinComponentInstance(digitalTwinId: string, componentInstanceName: string): Promise<DigitalTwinResponse>;
  getDigitalTwinComponentInstance(digitalTwinId: string, componentInstanceName: string, callback: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void;
  getDigitalTwinComponentInstance(digitalTwinId: string, componentInstanceName: string, callback?: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void | Promise<DigitalTwinResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_005: [The `getDigitalTwinComponentInstance` method shall call the `getComponent` method of the protocol layer with the given arguments.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_006: [The `getDigitalTwinComponentInstance` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_007: [The `getDigitalTwinComponentInstance` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_021: [The `getDigitalTwinComponentInstance` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<DigitalTwin, msRest.HttpOperationResponse, DigitalTwinResponse>((_callback) => {
      this._pl.digitalTwin.getComponent(digitalTwinId, componentInstanceName, (err, result, request, response) => {
        let digitalTwin: DigitalTwin = {
          interfaces: result ? result.interfaces : undefined,
          version: result ? result.version : undefined,
          eTag: response ? response.parsedHeaders ? response.parsedHeaders.eTag : undefined : undefined
        };
        _callback(err as Error, digitalTwin, response);
      });
    }, (digitalTwin, response) => createResultWithHttpOperationResponse<DigitalTwin, DigitalTwinResponse>(digitalTwin, response), callback as TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>);
  }

  /**
   * @method getModel                         module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.getModel
   * @description                             Retrieve a Digital Twin Model.
   * @param {string} modelId                  The model Id of the requested model.
   * @returns ModelResponse                   The return object containing the Model plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  getModel(modelId: string): Promise<ModelResponse>;
  getModel(modelId: string, callback: TripleValueCallback<Model, msRest.HttpOperationResponse>): void;
  getModel(modelId: string, callback?: TripleValueCallback<Model, msRest.HttpOperationResponse>): void | Promise<ModelResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_008: [The `getModel` method shall call the `getDigitalTwinModel` method of the protocol layer with the given argument.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_009: [The `getModel` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_010: [The `getModel` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_022: [The `getModel` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<Model, msRest.HttpOperationResponse, ModelResponse>((_callback) => {
      this._pl.digitalTwin.getDigitalTwinModel(modelId, (err, result, request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<Model, ModelResponse>(result, response), callback as TripleValueCallback<Model, msRest.HttpOperationResponse>);
  }

  /**
   * @method updateDigitalTwin                          module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.updateDigitalTwin
   * @description                                       Update the Digital Twin of a given device using a patch object.
   * @param {string} digitalTwinId                      The digital twin Id of the given device.
   * @param {Models.DigitalTwinInterfacesPatch} patch   The path objet contains the update part of a Digital Twin.
   * @param {string} eTag                               The eTag for identifying the patch.
   * @returns DigitalTwinResponse                       The return object containing the updated Digital Twin plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  updateDigitalTwin(digitalTwinId: string, patch: Models.DigitalTwinInterfacesPatch, eTag?: string): Promise<DigitalTwinResponse>;
  updateDigitalTwin(digitalTwinId: string, patch: Models.DigitalTwinInterfacesPatch, eTagOrCallback?: string | TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void;
  updateDigitalTwin(digitalTwinId: string, patch: Models.DigitalTwinInterfacesPatch, eTagOrCallback?: string | TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void | Promise<DigitalTwinResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_011: [The `updateDigitalTwin` method shall call the `updateComponent` method of the protocol layer with the given arguments.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_012: [The `updateDigitalTwin` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_013: [The `updateDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_023: [The `updateDigitalTwin` method shall return a promise if there is no callback passed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_026: [The `updateDigitalTwin` method shall call the `updateComponent` method of the protocol layer with the given arguments including eTag.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_030: [The `updateDigitalTwin` method shall return a promise if eTag is passed and there is no callback passed.] */
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_028: [** The `patch` argument of the `updateDigitalTwin` method should be a JSON string using the following format:]
    const patch = {
      interfaces: {
        [componentInstanceName]: {
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
    The componentInstanceName should be an existing componentInstance's name.
    The propertyName could be existing or new.
    The patch should contain difference to a previously reported twin only (e.g. patch).
    **]*/
    const actualCallback = typeof eTagOrCallback === 'function' ? eTagOrCallback : callback;
    const actualEtag = typeof eTagOrCallback !== 'function' ? eTagOrCallback : undefined;
    const options = actualEtag ? {ifMatch: actualEtag} : undefined;

    return tripleValueCallbackToPromise<DigitalTwin, msRest.HttpOperationResponse, DigitalTwinResponse>((_callback) => {
      this._pl.digitalTwin.updateComponent(digitalTwinId, patch, options as Models.DigitalTwinUpdateComponentOptionalParams, (err, result, request, response) => {
        let digitalTwin: DigitalTwin = {
          interfaces: result ? result.interfaces : undefined,
          version: result ? result.version : undefined,
          eTag: response ? response.parsedHeaders ? response.parsedHeaders.eTag : undefined : undefined
        };
        _callback(err as Error, digitalTwin, response);
      });
    }, (digitalTwin, response) => createResultWithHttpOperationResponse<DigitalTwin, DigitalTwinResponse>(digitalTwin, response), actualCallback as TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>);
  }

  /**
   * @method updateDigitalTwinProperty                  module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.updateDigitalTwinProperty
   * @description                                       Update one property's value on a particular component instance in the Digital Twin.
   * @param {string} digitalTwinId                      The digital twin Id of the given device.
   * @param {string} componentInstanceName              The component instance's name.
   * @param {string} propertyName                       The property's name.
   * @param {any} propertyValue                         The new value of the given property.
   * @param {string} eTag                               The eTag for identifying the patch.
   * @returns DigitalTwinResponse                       The return object containing the updated Digital Twin plus the HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  updateDigitalTwinProperty(digitalTwinId: string, componentInstanceName: string, propertyName: string, propertyValue: any, eTag?: string): Promise<DigitalTwinResponse>;
  updateDigitalTwinProperty(digitalTwinId: string, componentInstanceName: string, propertyName: string, propertyValue: any, eTagOrCallback?: string | TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void;
  updateDigitalTwinProperty(digitalTwinId: string, componentInstanceName: string, propertyName: string, propertyValue: any, eTagOrCallback?: string | TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>, callback?: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void | Promise<DigitalTwinResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_014: [The `updateDigitalTwinProperty` method shall call the `updateComponent` method of the protocol layer.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_015: [The `updateDigitalTwinProperty` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_016: [The `updateDigitalTwinProperty` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_024: [The `updateDigitalTwinProperty` method shall return a promise if there is no callback passed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_027: [The `updateDigitalTwinProperty` method shall call the `updateComponent` method of the protocol layer including eTag.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_029: [** The `updateDigitalTwinProperty` method receives the following arguments:
    const componentInstanceName - an existing componentInstance's name.
    const propertyName - the property what need to be updated or created.
    const property value - the reported value of the property.]*/
    let patch: Models.DigitalTwinInterfacesPatch = {
      interfaces: {
        [componentInstanceName]: {
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
    if (eTagOrCallback) {
      return this.updateDigitalTwin(digitalTwinId, patch, eTagOrCallback, callback);
    } else {
      return this.updateDigitalTwin(digitalTwinId, patch, callback);
    }
  }

  /**
   * @method invokeCommand                      module: azure-iot-digitaltwins-service.DigitalTwinServiceClient.invokeCommand
   * @description                               Invoke a command on an component instance of a particular device and get the result of it.
   * @param {string} digitalTwinId              The digital twin Id of the given device.
   * @param {string} componentInstanceName      The component instance's name.
   * @param {string} commandName                The command's name.
   * @param {string} argument                   The argument of a command.
   * @returns {Promise<CommandResultResponse>}  The result of the invoked command containing the result, status code, request ID and the parsed HttpResponse.
   * @memberof DigitalTwinServiceClient
   */
  invokeCommand(digitalTwinId: string, componentInstanceName: string, commandName: string, argument: string): Promise<CommandResultResponse>;
  invokeCommand(digitalTwinId: string, componentInstanceName: string, commandName: string, argument: string, callback: TripleValueCallback<CommandResult, msRest.HttpOperationResponse>): void;
  invokeCommand(digitalTwinId: string, componentInstanceName: string, commandName: string, argument: string, callback?: TripleValueCallback<CommandResult, msRest.HttpOperationResponse>): void | Promise<CommandResultResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_017: [The `invokeCommand` method shall call the `invokeComponentCommand` method of the protocol layer with the given arguments.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_018: [The `invokeCommand` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_019: [The `invokeCommand` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_025: [The `invokeCommand` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<CommandResult, msRest.HttpOperationResponse, CommandResultResponse>((_callback) => {
      this._pl.digitalTwin.invokeComponentCommand(digitalTwinId, componentInstanceName, commandName, argument, (err, result, request, response) => {
          let commandResult: CommandResult;
          if ((!response) || (!request)) {
            commandResult = result;
          } else {
            commandResult = {
              result: result,
              statusCode: Number(response.headers.get('x-ms-command-statuscode')),
              requestId: response.headers.get('x-ms-request-id')
            };
          }
        _callback(err as Error, commandResult, result);
      });
    }, (commandResult, response) => createResultWithHttpOperationResponse<CommandResult, CommandResultResponse>(commandResult, response), callback as TripleValueCallback<CommandResult, msRest.HttpOperationResponse>);
  }
}
