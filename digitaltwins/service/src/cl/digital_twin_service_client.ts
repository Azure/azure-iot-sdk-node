/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { IotHubGatewayServiceAPIs20190701Preview as PLClient, IotHubGatewayServiceAPIs20190701PreviewModels as Models } from '../pl/iotHubGatewayServiceAPIs20190701Preview';
import { tripleValueCallbackToPromise, TripleValueCallback } from 'azure-iot-common';
import { IoTHubTokenCredentials } from '../auth/iothub_token_credentials';
import * as msRest from '@azure/ms-rest-js';

export type DigitalTwin = Models.DigitalTwinInterfaces & Models.DigitalTwinGetInterfacesHeaders | undefined;
export type DigitalTwinResponse = Models.DigitalTwinGetInterfacesResponse | undefined;

export type Model = Models.DigitalTwinGetDigitalTwinModelResponse;
export type ModelResponse = Model & {_response: msRest.HttpResponse};

export interface CommandResult {
  result?: any;
  statusCode?: number;
  requestId?: string;
}

export interface CommandResultResponse extends CommandResult {
  _response?: msRest.HttpResponse;
}

export function createResultWithHttpResponse<TArg, TResult>(result: TArg, response: msRest.HttpResponse): TResult {
  (result as any)._response = response;
  return <any>result;
}

export class DigitalTwinServiceClient {
  private _creds: IoTHubTokenCredentials;
  private _pl: PLClient;
  private _apiVersion: string = '2019-07-01-preview';

  /*Code_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_001: [** The `DigitalTwinServiceClient` creates an instance of the DigitalTwinServiceClient passing IoTHubTokenCredentials class as an argument.]*/
  constructor(creds: IoTHubTokenCredentials) {
    this._creds = creds;
    this._pl = new PLClient(this._creds, {
      baseUri: 'https://' + this._creds.getHubName(),
      apiVersion: this._apiVersion
    });
  }

  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_002: [The `getDigitalTwin` method shall call the `getInterfaces` method of the protocol layer with the given argument.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_003: [The `getDigitalTwin` method shall call the callback with an error parameter if a callback is passed..]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_004: [The `getDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_020: [The `getDigitalTwin` method shall return a promise if there is no callback passed.]*/
  getDigitalTwin(digitalTwinId: string): Promise<DigitalTwinResponse>;
  getDigitalTwin(digitalTwinId: string, callback: TripleValueCallback<DigitalTwin, msRest.HttpResponse>): void;
  getDigitalTwin(digitalTwinId: string, callback?: TripleValueCallback<DigitalTwin, msRest.HttpResponse>): void | Promise<DigitalTwinResponse> {
    return tripleValueCallbackToPromise<DigitalTwin, msRest.HttpResponse, DigitalTwinResponse>((_callback) => {
      this._pl.digitalTwin.getInterfaces(digitalTwinId, (err, result, request, response) => {
        let digitalTwin: DigitalTwin = {
          interfaces: result ? result.interfaces : undefined,
          version: result ? result.version : undefined,
          eTag: response ? response.parsedHeaders ? response.parsedHeaders.eTag : undefined : undefined
        };
        _callback(err as Error, digitalTwin, response);
      });
    }, (digitalTwin, response) => createResultWithHttpResponse<DigitalTwin, DigitalTwinResponse>(digitalTwin, response), callback as TripleValueCallback<DigitalTwin, msRest.HttpResponse>);
  }

  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_005: [The `getDigitalTwinInterfaceInstance` method shall call the `getInterface` method of the protocol layer with the given arguments.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_006: [The `getDigitalTwinInterfaceInstance` method shall call the callback with an error parameter if a callback is passed..]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_007: [The `getDigitalTwinInterfaceInstance` method shall return error if the method of the protocol layer failed.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_021: [The `getDigitalTwinInterfaceInstance` method shall return a promise if there is no callback passed.]*/
  getDigitalTwinInterfaceInstance(digitalTwinId: string, interfaceInstanceName: string): Promise<DigitalTwinResponse>;
  getDigitalTwinInterfaceInstance(digitalTwinId: string, interfaceInstanceName: string, callback: TripleValueCallback<DigitalTwin, msRest.HttpResponse>): void;
  getDigitalTwinInterfaceInstance(digitalTwinId: string, interfaceInstanceName: string, callback?: TripleValueCallback<DigitalTwin, msRest.HttpResponse>): void | Promise<DigitalTwinResponse> {
    return tripleValueCallbackToPromise<DigitalTwin, msRest.HttpResponse, DigitalTwinResponse>((_callback) => {
      this._pl.digitalTwin.getInterface(digitalTwinId, interfaceInstanceName, (err, result, request, response) => {
        let digitalTwin: DigitalTwin = {
          interfaces: result ? result.interfaces : undefined,
          version: result ? result.version : undefined,
          eTag: response ? response.parsedHeaders ? response.parsedHeaders.eTag : undefined : undefined
        };
        _callback(err as Error, digitalTwin, response);
      });
    }, (digitalTwin, response) => createResultWithHttpResponse<DigitalTwin, DigitalTwinResponse>(digitalTwin, response), callback as TripleValueCallback<DigitalTwin, msRest.HttpResponse>);
  }

  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_008: [The `getDigitalTwinModel` method shall call the `getDigitalTwinModel` method of the protocol layer with the given argument.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_009: [The `getDigitalTwinModel` method shall call the callback with an error parameter if a callback is passed..]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_010: [The `getDigitalTwinModel` method shall return error if the method of the protocol layer failed.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_022: [The `getDigitalTwinModel` method shall return a promise if there is no callback passed.]*/
  getModel(modelId: string): Promise<ModelResponse>;
  getModel(modelId: string, callback: TripleValueCallback<Model, msRest.HttpResponse>): void;
  getModel(modelId: string, callback?: TripleValueCallback<Model, msRest.HttpResponse>): void | Promise<ModelResponse> {
    return tripleValueCallbackToPromise<Model, msRest.HttpResponse, ModelResponse>((_callback) => {
      this._pl.digitalTwin.getDigitalTwinModel(modelId, (err, result, request, response) => {
        let model: Model = result;
        _callback(err as Error, model, response);
      });
    }, (model, response) => createResultWithHttpResponse<Model, ModelResponse>(model, response), callback as TripleValueCallback<Model, msRest.HttpResponse>);
  }

  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_011: [The `updateDigitalTwin` method shall call the `updateInterfaces` method of the protocol layer with the given arguments.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_012: [The `updateDigitalTwin` method shall call the callback with an error parameter if a callback is passed..]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_013: [The `updateDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_023: [The `updateDigitalTwin` method shall return a promise if there is no callback passed.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_026: [The `updateDigitalTwin` method shall call the `updateInterfaces` method of the protocol layer with the given arguments including eTag.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_030: [The `updateDigitalTwin` method shall return a promise if eTag is passed and there is no callback passed.] */
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_028: [** The `patch` argument of the `updateDigitalTwin` method should be a JSON string using the following format:]
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
  The interfaceInstanceName should be an existing interfaceInstance's name.
  The propertyName could be existing or new.
  The patch should contain difference to a previously reported twin only (e.g. patch).
  **]*/
  updateDigitalTwin(digitalTwinId: string, patch: Models.DigitalTwinInterfacesPatch, eTag?: string): Promise<DigitalTwinResponse>;
  updateDigitalTwin(digitalTwinId: string, patch: Models.DigitalTwinInterfacesPatch, eTagOrCallback?: string | TripleValueCallback<DigitalTwin, msRest.HttpResponse>, callback?: TripleValueCallback<DigitalTwin, msRest.HttpResponse>): void;
  updateDigitalTwin(digitalTwinId: string, patch: Models.DigitalTwinInterfacesPatch, eTagOrCallback?: string | TripleValueCallback<DigitalTwin, msRest.HttpResponse>, callback?: TripleValueCallback<DigitalTwin, msRest.HttpResponse>): void | Promise<DigitalTwinResponse> {
    const actualCallback = typeof eTagOrCallback === 'function' ? eTagOrCallback : callback;
    const actualEtag = typeof eTagOrCallback !== 'function' ? eTagOrCallback : undefined;
    const options = actualEtag ? {ifMatch: actualEtag} : undefined;

    return tripleValueCallbackToPromise<DigitalTwin, msRest.HttpResponse, DigitalTwinResponse>((_callback) => {
      this._pl.digitalTwin.updateInterfaces(digitalTwinId, patch, options as Models.DigitalTwinUpdateInterfacesOptionalParams, (err, result, request, response) => {
        let digitalTwin: DigitalTwin = {
          interfaces: result ? result.interfaces : undefined,
          version: result ? result.version : undefined,
          eTag: response ? response.parsedHeaders ? response.parsedHeaders.eTag : undefined : undefined
        };
        _callback(err as Error, digitalTwin, response);
      });
    }, (digitalTwin, response) => createResultWithHttpResponse<DigitalTwin, DigitalTwinResponse>(digitalTwin, response), actualCallback as TripleValueCallback<DigitalTwin, msRest.HttpResponse>);
  }

  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_014: [The `updateDigitalTwinProperty` method shall call the `updateInterfaces` method of the protocol layer.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_015: [The `updateDigitalTwinProperty` method shall call the callback with an error parameter if a callback is passed..]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_016: [The `updateDigitalTwinProperty` method shall return error if the method of the protocol layer failed.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_024: [The `updateDigitalTwinProperty` method shall return a promise if there is no callback passed.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_027: [The `updateDigitalTwinProperty` method shall call the `updateInterfaces` method of the protocol layer including eTag.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_029: [** The `updateDigitalTwinProperty` method receives the following arguments:
  const interfaceInstanceName - an existing interfaceInstance's name.
  const propertyName - the property what need to be updated or created.
  const property value - the reported value of the property.]*/
  updateDigitalTwinProperty(digitalTwinId: string, interfaceInstanceName: string, propertyName: string, propertyValue: any, eTag?: string): Promise<DigitalTwinResponse>;
  updateDigitalTwinProperty(digitalTwinId: string, interfaceInstanceName: string, propertyName: string, propertyValue: any, eTagOrCallback?: string | TripleValueCallback<DigitalTwin, msRest.HttpResponse>, callback?: TripleValueCallback<DigitalTwin, msRest.HttpResponse>): void;
  updateDigitalTwinProperty(digitalTwinId: string, interfaceInstanceName: string, propertyName: string, propertyValue: any, eTagOrCallback?: string | TripleValueCallback<DigitalTwin, msRest.HttpResponse>, callback?: TripleValueCallback<DigitalTwin, msRest.HttpResponse>): void | Promise<DigitalTwinResponse> {
    let patch: Models.DigitalTwinInterfacesPatch = {
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
    if (eTagOrCallback) {
      return this.updateDigitalTwin(digitalTwinId, patch, eTagOrCallback, callback);
    } else {
      return this.updateDigitalTwin(digitalTwinId, patch, callback);
    }
  }

  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_017: [The `invokeCommand` method shall call the `invokeInterfaceCommand` method of the protocol layer with the given arguments.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_018: [The `invokeCommand` method shall call the callback with an error parameter if a callback is passed..]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_019: [The `invokeCommand` method shall return error if the method of the protocol layer failed.]*/
  /*Codes_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_025: [The `invokeCommand` method shall return a promise if there is no callback passed.]*/
  invokeCommand(digitalTwinId: string, interfaceInstanceName: string, commandName: string, argument: string): Promise<CommandResultResponse>;
  invokeCommand(digitalTwinId: string, interfaceInstanceName: string, commandName: string, argument: string, callback: TripleValueCallback<CommandResult, msRest.HttpResponse>): void;
  invokeCommand(digitalTwinId: string, interfaceInstanceName: string, commandName: string, argument: string, callback?: TripleValueCallback<CommandResult, msRest.HttpResponse>): void | Promise<CommandResultResponse> {
    return tripleValueCallbackToPromise<CommandResult, msRest.HttpResponse, CommandResultResponse>((_callback) => {
      this._pl.digitalTwin.invokeInterfaceCommand(digitalTwinId, interfaceInstanceName, commandName, argument, (err, result, request, response) => {
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
    }, (commandResult, response) => createResultWithHttpResponse<CommandResult, CommandResultResponse>(commandResult, response), callback as TripleValueCallback<CommandResult, msRest.HttpResponse>);
  }
}
