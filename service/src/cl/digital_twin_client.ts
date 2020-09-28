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
export type DigitalTwin = Models.DigitalTwinGetDigitalTwinHeaders | undefined;

/**
 * @export
 * @type DigitalTwinResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinResponse = Models.DigitalTwinGetDigitalTwinResponse | undefined;

/**
 * @export
 * @type DigitalTwinUpdateResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinUpdateResponse = Models.DigitalTwinUpdateDigitalTwinResponse | undefined;

/**
 * @export
 * @type DigitalTwinInvokeComponentCommandResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinInvokeComponentCommandResponse = Models.DigitalTwinInvokeComponentCommandResponse | undefined;

/**
 * @export
 * @type DigitalTwinInvokeRootLevelCommandResponse   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinInvokeRootLevelCommandResponse = Models.DigitalTwinInvokeRootLevelCommandResponse | undefined;

/**
 * @export
 * @type DigitalTwinInvokeComponentCommandOptionalParams   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinInvokeComponentCommandOptionalParams = Models.DigitalTwinInvokeComponentCommandOptionalParams;

/**
 * @export
 * @type DigitalTwinInvokeRootLevelCommandOptionalParams   Type alias to simplify the auto generated type's name
 */
export type DigitalTwinInvokeRootLevelCommandOptionalParams = Models.DigitalTwinInvokeRootLevelCommandOptionalParams;

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
 * @class DigitalTwinClient    Main class to implement Azure IoT Digital Twin Client API
 */
export class DigitalTwinClient {
  /**
   * @private
   * The IoTHub token credentials used for creating the Protocol Layer client.
   */
  private _creds: IoTHubTokenCredentials;
  /**
   * @private
   * The Protocol Layer Client instance used by the DigitalTwinClient.
   */
  private _pl: PLClient;
  /**
   * @private
   * The Azure IoT service's API version.
   */
  private _apiVersion: string = '2020-09-30';

  /**
   * Constructor which also creates an instance of the Protocol Layer Client used by the DigitalTwinClient.
   * @param {IoTHubTokenCredentials} creds    The IoTHub token credentials used for creating the Protocol Layer client.
   * @memberof DigitalTwinClient
   */
  constructor(creds: IoTHubTokenCredentials) {
    /*Code_SRS_NODE_DIGITAL_TWIN_CLIENT_12_001: [** The `DigitalTwinClient` creates an instance of the DigitalTwinClient passing IoTHubTokenCredentials class as an argument.]*/
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
   * @method getDigitalTwin                      module: azure-iot-digitaltwins-service.DigitalTwinClient.getDigitalTwin
   * @description                                Retrieve the Digital Twin of a given device.
   * @param {string} digitalTwinId               The digital twin Id of the given device or module.
   *                                             Format of digitalTwinId is DeviceId[~ModuleId]. ModuleId is optional.
   * @returns DigitalTwinResponse                The return object containing the Digital Twin plus the HttpResponse.
   * @memberof DigitalTwinClient
   */
  getDigitalTwin(digitalTwinId: string): Promise<DigitalTwinResponse>;
  getDigitalTwin(digitalTwinId: string, callback: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void;
  getDigitalTwin(digitalTwinId: string, callback?: TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>): void | Promise<DigitalTwinResponse> {
    /*Codes_SRS_NODE_DIGITAL_TWIN_CLIENT_12_002: [The `getDigitalTwin` method shall call the `getDigitalTwin` method of the protocol layer with the given argument.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_CLIENT_12_003: [The `getDigitalTwin` method shall call the callback with an error parameter if a callback is passed..]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_CLIENT_12_004: [The `getDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
    /*Codes_SRS_NODE_DIGITAL_TWIN_CLIENT_12_020: [The `getDigitalTwin` method shall return a promise if there is no callback passed.]*/
    return tripleValueCallbackToPromise<DigitalTwin, msRest.HttpOperationResponse, DigitalTwinResponse>((_callback) => {
      this._pl.digitalTwin.getDigitalTwin(digitalTwinId, (err, result, _request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<DigitalTwin, DigitalTwinResponse>(result, response), callback as TripleValueCallback<DigitalTwin, msRest.HttpOperationResponse>);
  }

  /**
   * @method updateDigitalTwin                          module: azure-iot-digitaltwins-service.DigitalTwinClient.updateDigitalTwin
   * @description                                       Update the Digital Twin of a given device using a patch object.
   * @param {string} digitalTwinId                      The digital twin Id of the given device.
   * @param {any[]} patch                               The patch objet contains the update part of a Digital Twin.
   * @param {string} eTag                               The eTag for identifying the patch.
   * @returns DigitalTwinUpdateResponse                 The HTTPesponse.
   * @memberof DigitalTwinClient
   */
  updateDigitalTwin(digitalTwinId: string, patch: any[], eTag?: string): Promise<DigitalTwinUpdateResponse>;
  updateDigitalTwin(digitalTwinId: string, patch: any[], eTagOrCallback?: string | TripleValueCallback<void, msRest.HttpOperationResponse>, callback?: TripleValueCallback<void, msRest.HttpOperationResponse>): void;
  updateDigitalTwin(digitalTwinId: string, patch: any[], eTagOrCallback?: string | TripleValueCallback<void, msRest.HttpOperationResponse>, callback?: TripleValueCallback<void, msRest.HttpOperationResponse>): void | Promise<DigitalTwinUpdateResponse> {
    const actualCallback = typeof eTagOrCallback === 'function' ? eTagOrCallback : callback;
    const actualEtag = typeof eTagOrCallback !== 'function' ? eTagOrCallback : undefined;
    const options = actualEtag ? {ifMatch: actualEtag} : undefined;

    return tripleValueCallbackToPromise<void, msRest.HttpOperationResponse, DigitalTwinUpdateResponse>((_callback) => {
      this._pl.digitalTwin.updateDigitalTwin(digitalTwinId, patch, options as Models.DigitalTwinUpdateDigitalTwinOptionalParams, (err, result, _request, response) => {
        _callback(err as Error, result, response);
      });
    }, (result, response) => createResultWithHttpOperationResponse<void, DigitalTwinUpdateResponse>(result, response), actualCallback as TripleValueCallback<void, msRest.HttpOperationResponse>);
  }

  /**
   * @method invokeComponentCommand                                     module: azure-iot-digitaltwins-service.DigitalTwinClient.invokeComponentCommand
   * @description                                                       Invoke a command on an component of a particular device and get the result of it.
   * @param {string} digitalTwinId                                      The digital twin Id of the given device.
   * @param {string} componentName                                      The component's name.
   * @param {string} commandName                                        The command's name.
   * @param {string} argument                                           The argument of a command.
   * @param {DigitalTwinInvokeComponentCommandOptionalParams} options   The optional parameter to set options including connectionTimeoutInSeconds and responseTimeoutInSeconds.
   *                                                                    The responseTimeoutInSeconds must be within [5; 300]
   * @returns DigitalTwinInvokeComponentCommandResponse                 The result of the invoked command containing the result, status code, request ID and the parsed HttpResponse.
   * @memberof DigitalTwinClient
   */
  invokeComponentCommand(digitalTwinId: string, componentName: string, commandName: string, argument: string, options?: DigitalTwinInvokeComponentCommandOptionalParams): Promise<DigitalTwinInvokeComponentCommandResponse>{
    return this._pl.digitalTwin.invokeComponentCommand(digitalTwinId, componentName, commandName, argument, options);
  }

  /**
   * @method invokeCommand                                              module: azure-iot-digitaltwins-service.DigitalTwinClient.invokeCommand
   * @description                                                       Invoke a command on an component of a particular device and get the result of it.
   * @param {string} digitalTwinId                                      The digital twin Id of the given device.
   * @param {string} argument                                           The argument of a command.
   * @param {DigitalTwinInvokeRootLevelCommandOptionalParams} options   The optional parameter to set options including connectionTimeoutInSeconds and responseTimeoutInSeconds.
   *                                                                    The responseTimeoutInSeconds must be within [5; 300]
   * @returns DigitalTwinInvokeRootLevelCommandResponse                 The result of the invoked command containing the result, status code, request ID and the parsed HttpResponse.
   * @memberof DigitalTwinClient
   */
  invokeCommand(digitalTwinId: string, commandName: string, argument: string, options?: DigitalTwinInvokeRootLevelCommandOptionalParams): Promise<DigitalTwinInvokeRootLevelCommandResponse>{
    return this._pl.digitalTwin.invokeRootLevelCommand(digitalTwinId, commandName, argument, options);
  }
}
