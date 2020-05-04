// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as dbg from 'debug';
const debug = dbg('azure-iot-digitaltwins-device:Client');

import { callbackToPromise, ErrorCallback, Message } from 'azure-iot-common';
import { Client, Twin, DeviceMethodRequest, DeviceMethodResponse } from 'azure-iot-device';
import { Mqtt, MqttWs } from 'azure-iot-device-mqtt';
import { BaseInterface } from './base_interface';
import { azureDigitalTwinCommand, azureDigitalTwinProperty,
         Property, PropertyChangedCallback, DesiredStateResponse,
         CommandRequest, CommandResponse, CommandUpdateCallback, CommandUpdatePromise, CommandCallback, Callback, azureDigitalTwinTelemetry
        } from './interface_types';

/**
 * @private
 * The name of the application property that contains the component name (a specific
 * interface instance) as its value.
 */
const messageSubjectProperty: string = '$.sub';
/**
 * @private
 * Prefixes the component name in various objects, like command names.
 */
const componentPrefix: string = '$iotin:';
/**
 * @private
 * Prefixes the actual data object in various Digital Twin objects, like command names.
 */
const commandComponentCommandNameSeparator = '*';

/**
 * @private
 * An array of these items will be created for each component.
 * When enableCommands is called, the code will sweep through all of the
 * components and within each component will utilize the data here to
 * enable a method handler for each command.
 */
interface CommandInformation {
  component: BaseInterface;
  commandName: string;
  //
  // The name that is passed to the underlying device client method client.
  // It is formed from the component name and command property name.
  methodName: string;
  //
  // An IoT client method handler.  We use these to implement the
  // digital twin commands.  One handler will be created for each command.
  // Each one of these command handlers will invoke the application specified
  // command handler with specific request and response objects more suitable
  // for digital twin commands.
  //
  methodCallback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void;
}

/**
 * @private
 *
 *
 * An array of these items will be created for each component.
 *
 * When enablePropertyUpdates is called, the code will sweep through all of the
 * added components and within each component will utilize the data here to
 * process each write enabled property.
 *
 * This are two separate things that must be done post registration.
 *
 * 1) Obtain (if they exist) both the desired and reported "value"s of each
 * property.  They should be supplied to the components property changed callback.  The
 * version property is also obtained.  The callback is free to act however it
 * choses (including doing a new "update" on the property).
 *
 * 2) Set a callback for delta updates of each writable property.  This callback will
 * be used to invoke the components property changed callback (The same one as invoked in "1)").
 * For delta updates the reported property value will NOT supplied.
 */
interface WritablePropertyInformation {
  component: BaseInterface;
  propertyName: string;
  //
  // This is part of the path to get to this particular writable property in the
  // twin.
  //
  // (Used in both the "reported" and "desired" paths.)
  //
  prefixAndComponentName: string;
}

/**
 * @private
 * These are the values of a dictionary created within the Digital Twin client.
 * The dictionary key is the component name.
 */
interface ComponentInformation {
  //
  // The actual object that defines an component.  These can be imported and constructed
  // or built up on the fly.
  //
  component: BaseInterface;
  //
  // An array of information for each command defined by the interface.
  commandProperties: CommandInformation[];
  //
  // An array of information for each writable property defined by the interface.
  //
  writableProperties: WritablePropertyInformation[];
}

export class DigitalTwinClient {
  //
  // Dictionary of each component and the associated interface.
  //
  private _components: {[key: string]: ComponentInformation} = {};
  //
  // Each Digital Twin client can have only one capability model associated with it.
  // The dcm is in DTMI format.
  //
  //
  // Client is a regular (not module) IoT Hub device client.
  //
  private _client: Client;
  //
  // The IoT Hub Twin that supports the Digital Twin concept.
  //
  private _twin: Twin;
  constructor(client: Client) {
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_002: [Will throw `ReferenceError` if the constructor `client` argument is falsy.] */
    if (!client) throw new ReferenceError('client must not be falsy');
    this._client = client;
    this._twin = {} as Twin;
  }

  /**
   * @method                        module:azure-iot-digitaltwins-device.DigitalTwinClient.enableCommands
   * @description                   This must be called before the interface command callbacks will be used.
   *                                Sweeps through all the components and enables method handlers for each command.
   */
  enableCommands(): void {
    Object.keys(this._components).forEach((componentName) => {
      this._components[componentName].commandProperties.forEach((commandInformation) => {
        /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_012: [For each property in an component with type `Command`, a device method will be enabled with a name of the form '$iotin:' followed by the component name followed by '*' followed by the property name.] */
        this._client.onDeviceMethod(commandInformation.methodName, commandInformation.methodCallback);
      });
    });
  }


  /**
   * @method                        module:azure-iot-digitaltwins-device.DigitalTwinClient.enablePropertyUpdates
   * @description                   Enables property updates for the Digital Twin Client so the propertyUpdateCallback will be invoked on
   *                                property changes.
   * @param callback                Optional callback. If not provided enablePropertyUpdates will return a promise.
   */
  enablePropertyUpdates(callback: Callback): void;
  enablePropertyUpdates(): Promise<void>;
  enablePropertyUpdates(callback?: Callback): Promise<void> | void {
    return callbackToPromise((_callback) => {
      /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_008: [ Will invoke the callback on success if provided ] */
      /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_009: [ Will resolve the promise if no callback is provided  ] */
      /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_010: [ Will pass an error to the callback if provided ] */
      /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_011: [ Will reject the promise if no callback is provided on error ] */
      this._client.getTwin((getTwinError: Error | undefined, twinResult: Twin | undefined) => {
        if (getTwinError) {
          return _callback(getTwinError);
        } else {
          this._twin = twinResult as Twin;
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_012: [ Will enable propertyChangedCallback on added components ] */
          this._initialWritablePropertyProcessing();
          return _callback();
        }
      });
    }, callback);
  }

  // TODO: is this the best API? Should it be split into a report for writable properties and a report for non-writable properties?
  /**
   * @method                        module:azure-iot-digitaltwins-device.DigitalTwinClient.report
   * @description                   Sends the value of a reported property to the Digital Twin.
   * @param component       Interface instance to be reported on.
   * @param propertiesToReport      An object of properties containing propertyNames and propertyValues as key, value pairs.
   * @param response                An optional response to patch the reported properties.
   *                                  When you have a desired property change,
   *                                  response is for writable properties as a response to the service sending desired state for those properties,
   *                                  when the device client responds on the status of the desired property setting.
   *                                  For instance an oven might not be done heating up yet, so the oven component would send
   *                                  a 204 (not a legitimate status code), 'oven still heating up to desired temperature'.
   *                                  For just a plain report, like SDK Information, there is no status.
   * @param callback (optional)     If present, the callback to be invoked on completion of the telemetry,
   *                                otherwise a promise is returned.
   */
  report(component: BaseInterface, propertiesToReport: any, responseOrCallback: DesiredStateResponse | ErrorCallback, callback?: ErrorCallback): void;
  report(component: BaseInterface, propertiesToReport: any, response?: DesiredStateResponse): Promise<void>;
  report(component: BaseInterface, propertiesToReport: any, responseOrCallback?: DesiredStateResponse | ErrorCallback, callback?: ErrorCallback): Promise<void> | void {
    let actualResponse: DesiredStateResponse | undefined;
    let actualCallback: ErrorCallback | undefined;
    if (responseOrCallback) {
      if (typeof responseOrCallback === 'function') {
        actualCallback = responseOrCallback as ErrorCallback;
        actualResponse = undefined;
      } else {
        actualResponse = responseOrCallback as DesiredStateResponse;
        actualCallback = callback as ErrorCallback;
      }
    }

    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_013: [ Will invoke the `callback` on success if provided ] */
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_014: [ Will invoke the `callback` on failure with an error ] */
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_015: [ Will resolve the promise on success when no callback provided ] */
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_016: [ Will reject the promise on failure with an error when no callback provided ] */
    return callbackToPromise((_callback: ErrorCallback) => {
      let componentPart = componentPrefix + component.componentName;
      let patch: any = {
        [componentPart]: {}
      };

      /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_017: [ Will produce a patch to the reported properties containing all the properties and values in the propertiesToReport object ] */
      for (const propertyName in propertiesToReport) {
        let propertyContent: any = { value: propertiesToReport[propertyName] };
        /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_018: [ May invoke with a propertiesToReport object and a response object to produce a patch to the reported properties. ] */
        if (actualResponse) {
          propertyContent.ac = actualResponse.code;
          propertyContent.ad = actualResponse.description;
          propertyContent.av = actualResponse.version;
        }
        patch[componentPart][propertyName] = propertyContent;
      }
      this._twin.properties.reported.update(patch, _callback);
    }, actualCallback);
  }

  /**
   * @method            module:azure-iot-digitaltwins-device.DigitalTwinClient.sendTelemetry
   * @description                                    Sends a telemetry message for a supplied interface.
   * @param {BaseInterface}  component       Interface instance to be associated with telemetry message.
   * @param {any}            telemetry               The object to be sent.
   * @param {ErrorCallback}  callback (optional)     If present, the callback to be invoked on completion of the telemetry,
   *                                                 otherwise a promise is returned.
   */
  sendTelemetry(component: BaseInterface, telemetry: any, callback: ErrorCallback): void;
  sendTelemetry(component: BaseInterface, telemetry: any): Promise<void>;
  sendTelemetry(component: BaseInterface, telemetry: any, callback?: ErrorCallback): Promise<void> | void {
    return callbackToPromise((_callback) => {
      let telemetryMessage = new Message(
        JSON.stringify(telemetry)
      );
      /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_006: [ The `sendTelemetry` method will send a device message with the following format:
      ```
      payload: {<telemetry property name>: <telemetry property value> ,...}
      message application properties:
      contentType: 'application/json'
      contentEncoding: 'utf-8'
      $.sub: <component name>
      ```
      ] */
      telemetryMessage.properties.add(messageSubjectProperty, component.componentName);
      telemetryMessage.contentType =  'application/json';
      telemetryMessage.contentEncoding = 'utf-8';
      this._client.sendEvent(telemetryMessage, (telemetryError: Error | undefined) => {
        return _callback(telemetryError);
      });
    }, callback);
  }

  /**
   * @method                        module:azure-iot-digitaltwins-device.DigitalTwinClient.addComponents
   * @description                   Adds multiple components to the Digital Twin client.  This will not cause
   *                                any network activity.  This is a synchronous method.
   * @param newComponents   A single object or multiple objects for a particular component.
   */
  addComponents(...args: BaseInterface[]): void {
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [ Can accept a variable number of interfaces to add via the addComponents method ] */
    for (let i = 0; i < args.length; i++) {
      this._addComponent(args[i]);
    }
  }

  /**
   * Adds the component to the Digital Twin client.  This will not cause
   * any network activity.  This is a synchronous method.
   */
  private _addComponent(newComponent: BaseInterface): void {
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_003: [Will throw `ReferenceError` if the `newComponent` argument is falsy.] */
    if (!newComponent) throw new ReferenceError('newComponent is \'' + newComponent + '\'');
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_004: [Will throw `ReferenceError` if the `newComponent` argument `interfaceId` property is falsy.] */
    if (!newComponent.interfaceId) throw new ReferenceError('interfaceId is \'' + newComponent.interfaceId + '\'');
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_005: [Will throw `ReferenceError` if the `newComponent` argument `componentName` property is falsy.] */
    if (!newComponent.componentName) throw new ReferenceError('component is \'' + newComponent.componentName + '\'');
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_006: [Will throw `Error` if the `newComponent` argument property `componentName` property value is used by a previously added component.] */
    if (this._components[newComponent.componentName]) throw new Error('component ' + newComponent.componentName + ' is already added.');
    this._components[newComponent.componentName] = {
      component: newComponent,
      commandProperties: [],
      writableProperties: []
    };
    Object.keys(newComponent).forEach((individualProperty) => {
      if (newComponent[individualProperty] && newComponent[individualProperty].azureDigitalTwinType) {
        debug(newComponent.componentName + '.' + individualProperty + ' is of type: ' + newComponent[individualProperty].azureDigitalTwinType);
        switch (newComponent[individualProperty].azureDigitalTwinType) {
          case azureDigitalTwinCommand: {
            //
            // Must have defined an application defined callback for the commands of this component.
            //
            // We use the _createCommandInformation method to instantiate an IoT Hub device method handler that will invoke application command callback.
            // We save this in a structure created for this component so that at registration time we can enable the IoT Hub device method handler.
            //
            if (newComponent.commandCallback) {
              this._components[newComponent.componentName].commandProperties.push(this._createCommandInformation(newComponent, individualProperty));
            } else {
              /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_007: [Will throw `Error` if the `newComponent` has a property of type `Command` but no defined `CommandCallback`.] */
              throw new Error('component ' + newComponent.componentName + ' does not have a command callback specified');
            }
            break;
          }
          case azureDigitalTwinProperty: {
            if ((newComponent[individualProperty] as Property).writable) {
              //
              // Must have defined a callback for the property updates of this component.
              //
              if (newComponent.propertyChangedCallback) {
                this._components[newComponent.componentName].writableProperties.push(this._createWritablePropertyInformation(newComponent, individualProperty));
              } else {
                /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_008: [Will throw `Error` if the `newComponent` has a writable property but no defined `PropertyChangedCallback`.] */
                throw new Error('component ' + newComponent.componentName + ' does not have a property update callback specified');
              }
            }
            break;
          }
          case azureDigitalTwinTelemetry: {
            // do nothing
            break;
          }
          default: {
            /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_009: [Will throw `TypeError` if the `newComponent` has a property `azureDigitalTwinType` with an unrecognized type.] */
            throw new TypeError('Unrecognized Azure Digital Twin Type');
          }
        }
      } else {
        debug(newComponent.componentName + '.' + individualProperty + ' is NOT of interest.');
      }
    });
  }

  private _getReportedOrDesiredPropertyValue(reportedOrDesired: 'reported' | 'desired', componentPart: string, propertyPart: string): any {
    if (this._twin.properties[reportedOrDesired] &&
        this._twin.properties[reportedOrDesired][componentPart] &&
        this._twin.properties[reportedOrDesired][componentPart][propertyPart]) {
      return this._twin.properties[reportedOrDesired][componentPart][propertyPart].value;
    } else {
      return null;
    }
  }

  private _initialWritablePropertyProcessing(): void {
    Object.keys(this._components).forEach((componentName) => {
      this._components[componentName].writableProperties.forEach((rwi) => {
        //
        // Get the desired value of the writable property  if it exists.  If we get one also try
        // to get the reported version of the writable if it exists.
        //
        const desiredPart = this._getReportedOrDesiredPropertyValue('desired', rwi.prefixAndComponentName, rwi.propertyName);
        const versionProperty = '$version';
        if (desiredPart) {
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_037: [Initially, if it exists, provide the reported property also to the property change callback.] */
          const reportedPart = this._getReportedOrDesiredPropertyValue('reported', rwi.prefixAndComponentName, rwi.propertyName);
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_036: [Following the initial get of the twin, the writable properties will have their desired values retrieved, provided they exist, provided to the property changed callback along with the current desired version value.] */
          (rwi.component.propertyChangedCallback as PropertyChangedCallback)(rwi.component, rwi.propertyName, reportedPart, desiredPart, this._twin.properties.desired[versionProperty]);
        }
        //
        // Setup the callback for delta changes.
        //
        /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_035: [Subsequent to the enablePropertyUpdates, a writable property will have an event listener on the `properties.desired.$iotin:<componentName>.<propertyName>`] */
        this._twin.on('properties.desired.' + rwi.prefixAndComponentName + '.' + rwi.propertyName, (delta: { value: any; }) => {
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_019: [A change to the desired property will invoke the property change callback with the change value and version.] */
          (rwi.component.propertyChangedCallback as PropertyChangedCallback)(rwi.component, rwi.propertyName, null, delta.value, this._twin.properties.desired[versionProperty]);
        });
      });
    });
  }



  private _createCommandInformation(component: BaseInterface, commandName: string): CommandInformation  {
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_013: [ For commands, the `commandCallback` will be invoked with `request` and `response` arguments with the following properties.
      request:
        {
          component: component,
          componentName: component.componentName
          commandName: command property name
          payload: payload of request
        }

      response:
        {
          acknowledge: function that invokes device method send api with arguments
                status,
                payload,
                callback or if undefined returns a promise
          update: function that will invoke the device client send api with arguments
              device message,
              callback, or if undefined returns a promise
        }
      ]
    */
    return {
      component: component,
      commandName: commandName,
      methodName: componentPrefix + component.componentName + commandComponentCommandNameSeparator + commandName,
      //
      // Create a function that will be used as the handler for IoT Hub method callbacks.
      // This instantiated function will create request and response objects suitable for
      // Digital Twin Commands.
      //
      methodCallback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => {
        const commandRequest: CommandRequest = {
          component: component,
          componentName: component.componentName,
          commandName: commandName,
          payload: request.payload.commandRequest.value
        };
        const commandResponse: CommandResponse = {
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_014: [The command callback should be able to invoke the `acknowledge` method and receive (if supplied) a callback upon completion.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_023: [The command callback should be able to invoke the `acknowledge` method, with no `payload` argument, and receive (if supplied) a callback upon completion.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_015: [The command callback should be able to invoke the `acknowledge` method with no callback and utilize the returned promise that resolves.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_024: [The command callback should be able to invoke the `acknowledge` method, with no `payload` or callback arguments, and utilize the returned promise that resolves.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_016: [The command callback should be able to invoke the `acknowledge` method and receive (if supplied) a callback with an error if the `acknowledge` failed.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_025: [The command callback should be able to invoke the `acknowledge` method, with no `payload` argument, and receive (if supplied) a callback with an error if the `acknowledge` failed.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_017: [The command callback should be able to invoke the `acknowledge` method with no callback and utilize the returned promise that rejects.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_026: [The command callback should be able to invoke the `acknowledge` method, with no `payload` or callback arguments, and utilize the returned promise that rejects.] */
          acknowledge: (status: number, payload?: any, callback?: ErrorCallback) => response.send(status, payload, callback as ErrorCallback),
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_018: [The command callback should be able to invoke the `update` method and receive (if supplied) a callback upon completion.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_027: [The command callback should be able to invoke the `update` method, with no `payload` argument, and receive (if supplied) a callback upon completion.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_019: [The command callback should be able to invoke the `update` method with no callback and utilize the returned promise that resolves.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_028: [The command callback should be able to invoke the `update` method, with no `payload` or callback arguments, and utilize the returned promise that resolves.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_020: [The command callback should be able to invoke the `update` method and receive (if supplied) a callback with an error if the `update` failed.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_029: [The command callback should be able to invoke the `update` method, with no `payload` argument, and receive (if supplied) a callback with an error if the `update` failed.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_021: [The command callback should be able to invoke the `update` method with no callback and utilize the returned promise that rejects.] */
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_030: [The command callback should be able to invoke the `update` method, with no `payload` or callback arguments, and utilize the returned promise that rejects.] */
          update: this._returnCommandUpdateMethod(component.componentName, component.interfaceId, commandName, request.payload.commandRequest.requestId)
         };
        (component.commandCallback as CommandCallback)(commandRequest, commandResponse);
      }
    };
  }

  //
  // The first of several methods that create and return a new method.
  // In this case the returned method is used to update the status of
  // a Digital Twin async command.
  //
  private _returnCommandUpdateMethod(componentName: string, interfaceId: string, commandName: string, requestId: string): CommandUpdateCallback | CommandUpdatePromise {
    return (status: number, payload: any, callback?: ErrorCallback) =>
      this._sendCommandUpdate(componentName, interfaceId, commandName, requestId, status, payload, callback as ErrorCallback);
  }

  /**
   * @method                            private _sendCommandUpdate
   * @description                       Sends a command update message component/command.
   * @param componentName       Name of the instance for this interface.
   * @param interfaceId                 The id (in DTMI format) for the interface.
   * @param commandName                 The name of the particular command updating its status.
   * @param requestId                   The id supplied by the Digital Twin Service that uniquely identifies
   *                                    this particular invocation of the command.
   * @param status                      An http code specifying the status of the command.
   * @param payload                     The data passed back as part of the response.
   * @param commandCallback (optional)  If present, the callback to be invoked on completion of the update,
   *                                    otherwise a promise is returned.
   */
  private _sendCommandUpdate(componentName: string, interfaceId: string, commandName: string, requestId: string, status: number, payload: any, commandCallback: ErrorCallback): void;
  private _sendCommandUpdate(componentName: string, interfaceId: string, commandName: string, requestId: string, status: number, payload: any): Promise<void>;
  private _sendCommandUpdate(componentName: string, interfaceId: string, commandName: string, requestId: string, status: number,payload: any, commandCallback?: ErrorCallback): Promise<void> | void {

    /*
      Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_022: [Within the command callback, the application can invoke the `update` method which in turn will invoke the device client `sendEvent` method with the following message:
      payload:
      This JSON stringified value of the payload parameter.

      message application properties:
      'iothub-message-schema': 'asyncResult'
      'iothub-command-name': <command name>
      'iothub-command-request-id': request.payload.commandRequest.requestId of the method request
      'iothub-command-statuscode': statusCode argument of the update method
      '$.sub': components name
      contentType: 'application/json'
      contentEncoding: 'utf-8'
      ]
     */
    const commandUpdateSchemaProperty = 'iothub-message-schema';
    const commandUpdateCommandNameProperty = 'iothub-command-name';
    const commandUpdateRequestIdProperty = 'iothub-command-request-id';
    const commandUpdateStatusCodeProperty = 'iothub-command-statuscode';
    return callbackToPromise((_callback) => {
      debug('about to begin the command update telemetry.');
      /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_031: [Within the command callback, the application can invoke the `update` method, with no `payload` argument or payload argument set to undefined or null, which in turn will invoke the device client `sendEvent` method with a message payload of 'null'. ] */
      let updateMessage = new Message(
        JSON.stringify(payload || null)
      );
      updateMessage.properties.add(commandUpdateSchemaProperty, 'asyncResult');
      updateMessage.properties.add(commandUpdateCommandNameProperty, commandName);
      updateMessage.properties.add(commandUpdateRequestIdProperty, requestId);
      updateMessage.properties.add(commandUpdateStatusCodeProperty, status.toString());
      updateMessage.properties.add(messageSubjectProperty, componentName);
      updateMessage.contentType = 'application/json';
      updateMessage.contentEncoding = 'utf-8';
      this._client.sendEvent(updateMessage, (updateError: Error | undefined) => {
        return _callback(updateError);
      });
    }, commandCallback);
  }

  private _createWritablePropertyInformation(component: BaseInterface, propertyName: string): WritablePropertyInformation  {
    return {
      component: component,
      propertyName: propertyName,
      prefixAndComponentName: componentPrefix + component.componentName,
    };
  }


  /**
   * @method            module:azure-iot-digitaltwins-device.DigitalTwinClient.sendTelemetry
   * @description                     Creates a Digital Twin Client from the given connection string.
   * @param {String}    connStr       A connection string which encapsulates "device connect" permissions on an IoT hub.
   * @param {Boolean}   ws            Optional boolean to specify if MQTT over Websockets should be used.
   * @throws {ReferenceError}         If the connStr or modelId parameter is falsy
   * @returns {module:azure-iot-digitaltwins.DigitalTwinClient}
   */
  static fromConnectionString(modelId: string, connStr: string, ws?: boolean): DigitalTwinClient {
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_001: [Will throw `ReferenceError` if the fromConnectionString method `connStr` argument is falsy.] */
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_002: [Will throw `ReferenceError` if the fromConnectionString method `modelId` argument is falsy.] */
    if (!modelId) throw new ReferenceError('modelId must not be falsy');
    if (!connStr) throw new ReferenceError('connStr (connection string) must not be falsy');

    let transport;
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_003: [`fromConnectionString` will use the Mqtt Transport by default] */
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_41_004: [`fromConnectionString` will use the Mqtt Websockets Transport if specified] */
    if (ws) {
      transport = MqttWs;
    } else {
      transport = Mqtt;
    }

    /* Codes_SRS_NODE_DEVICE_CLIENT_41_005: [The fromConnectionString method shall return a new instance of the Client object] */
    const client = Client.fromConnectionString(connStr, transport);
    client.setOptions({ modelId: modelId });

    return new DigitalTwinClient(client);
  }
}
