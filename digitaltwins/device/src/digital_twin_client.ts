// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as dbg from 'debug';
const debug = dbg('azure-iot-digitaltwins-device:Client');

import { DigitalTwinInterface as SdkInformation } from './sdkinformation';
import { callbackToPromise, ErrorCallback, Message } from 'azure-iot-common';
import { Client, Twin, DeviceMethodRequest, DeviceMethodResponse } from 'azure-iot-device';
import { BaseInterface } from './base_interface';
import { azureDigitalTwinTelemetry, azureDigitalTwinCommand, azureDigitalTwinReadOnlyProperty, azureDigitalTwinReadWriteProperty,
         Telemetry, TelemetryPromise, TelemetryCallback,
         ReadOnlyProperty, ReadOnlyPropertyReportCallback, ReadOnlyPropertyReportPromise,
         CommandRequest, CommandResponse, CommandUpdateCallback, CommandUpdatePromise, CommandCallback,
         ReadWritePropertyChangedCallback, ReadWritePropertyUpdateCallback, ReadWritePropertyUpdatePromise,
         ReadWritePropertyResponse, ReadWriteProperty
        } from './interface_types';

/**
 * @private
 * The name of the application property that contains the interface id as its value.
 */
const messageInterfaceIdProperty: string = '$.ifid';
/**
 * @private
 * The name of the application property that contains the component name (a specific
 * interface instance) as its value.
 */
const messageComponentProperty: string = '$.ifname';
/**
 * @private
 * The Digital Twin application property name whose value communicates what the item is.
 * For instance, a telemetry, or registration model information.
 */
const messageSchemaProperty: string = '$.schema';
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
 * Read the following comments.
 */
//
// An array of these items will be created for each component.
//
// At registration time, the registration code will sweep through all of the
// registered components and within each component will utilize the data here to
// enable a method handler for each command.
//
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
 * Read the following comments.
 */
//
// An array of these items will be created for each component.
//
// At registration time, the registration code will sweep through all of the
// registered components and within each component will utilize the data here to
// process each read/write property.
//
// This are two separate things that must be done post registration.
//
// 1) Obtain (if they exist) both the desired and reported "value"s of each
// property.  They should be supplied to the components r/w callback.  The
// version property is also obtained.  The callback is free to act however it
// choses (including doing a new "update" on the property).
//
// 2) Set a callback for delta updates of each r/w property.  This callback will
// be used to invoke the components r/w callback (The same one as invoked in "1)"").
// For delta updates the reported property value will NOT supplied.
//
interface ReadWriteInformation {
  component: BaseInterface;
  readWritePropertyName: string;
  //
  // This is part of the path to get to this particular r/w property in the
  // twin.
  //
  // (Used in both the "reported" and "desired" paths.)
  //
  prefixAndComponentName: string;
}

/**
 * @private
 * Read the following comments.
 */
//
// These are the values of a dictionary created within the Digital Twin client.
// The dictionary key is the component name.
//
interface ComponentInformation {
  //
  // Utilized to insure that an component isn't used before registration.
  //
  registered: boolean;
  //
  // The actual object that defines a component.  These can be imported and constructed
  // or built up on the fly.
  //
  component: BaseInterface;
  //
  // An array of information for each command defined by the interface.
  commandProperties: CommandInformation[];
  //
  // An array of information for each read/write property defined by the interface.
  //
  readWriteProperties: ReadWriteInformation[];
}

/**
 * @private
 * Utilized by the SDK Information interface to obtain the version information.
 */
// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

/**
 * @private
 * An instantiation of the SDK information interface.
 */
const sdkInformation = new SdkInformation('urn_azureiot_Client_SDKInformation', 'urn:azureiot:Client:SDKInformation:1');

export class DigitalTwinClient {
  //
  // Dictionary of each component and the associated interface.
  //
  private _components: {[key: string]: ComponentInformation} = {};
  //
  // Each Digital Twin client can have only one capability model associated with it.
  // The dcm is in URN format.
  //
  private _capabilityModel: string;
  //
  // Client is a regular (not module) IoT Hub device client.
  //
  private _client: Client;
  //
  // The IoT Hub Twin that supports the Digital Twin concept.
  //
  private _twin: Twin;
  constructor(capabilityModel: string, client: Client) {
    this._capabilityModel = capabilityModel;
    this._client = client;
    this._twin = {} as Twin;
    this.addComponent(sdkInformation);
  }

  /**
   * @method                        module:azure-iot-digitaltwins-device.DigitalTwinClient.addComponent
   * @description                   Adds the component to the Digital Twin client.  This will not cause
   *                                any network activity.  This is a synchronous method.
   * @param newComponent            The object for a particular component.
   */
  addComponent(newComponent: BaseInterface): void {
    if (!newComponent.interfaceId) throw new ReferenceError('interfaceId is \'' + newComponent.interfaceId + '\'');
    if (!newComponent.componentName) throw new ReferenceError('component is \'' + newComponent.componentName + '\'');
    if (this._components[newComponent.componentName]) throw new Error('component ' + newComponent.componentName + ' is already added.');
    this._components[newComponent.componentName] = {
      component: newComponent,
      commandProperties: [],
      readWriteProperties: [],
      registered: false
    };
    Object.keys(newComponent).forEach((individualProperty) => {
      if (newComponent[individualProperty] && newComponent[individualProperty].azureDigitalTwinType) {
        debug(newComponent.componentName + '.' + individualProperty + ' is of type: ' + newComponent[individualProperty].azureDigitalTwinType);
        switch (newComponent[individualProperty].azureDigitalTwinType) {
          case azureDigitalTwinTelemetry: {
            //
            // This instantiates a 'send' method for this telemetry property that invokes the lower level clients send function.  The
            // instantiated function will format the message appropriately and add any necessary transport/digital twin properties to
            // the message.
            //
            (newComponent[individualProperty] as Telemetry).send = this._returnTelemetrySendMethod(newComponent.componentName, newComponent.interfaceId, individualProperty);
            break;
          }
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
              throw new Error('Component ' + newComponent.componentName + ' does not have a command callback specified');
            }
            break;
          }
          case azureDigitalTwinReadOnlyProperty: {
            //
            // This instantiates a 'report' method for this read only property that invokes the lower level clients twin reporting.  The
            // instantiated function will format the message appropriately and add any necessary transport/digital twin properties to
            // the message.
            //
            (newComponent[individualProperty] as ReadOnlyProperty).report  = this._returnReadOnlyPropertyReportMethod(newComponent.componentName, newComponent.interfaceId, individualProperty);
            break;
          }
          case azureDigitalTwinReadWriteProperty: {
            //
            // Must have defined a callback for the read write properties of this component.
            //
            if (newComponent.readWritePropertyChangedCallback) {
              (newComponent[individualProperty] as ReadWriteProperty).update =
                this._returnReadWritePropertyUpdateMethod(newComponent.componentName, newComponent.interfaceId, individualProperty);
              this._components[newComponent.componentName].readWriteProperties.push(this._createReadWriteInformation(newComponent, individualProperty));
            } else {
              throw new Error('Component ' + newComponent.componentName + ' does not have a property update callback specified');
            }
            break;
          }
          default: {
            throw new TypeError('Unrecognized Azure Digital Twin Type');
          }
        }
      } else {
        debug(newComponent.componentName + '.' + individualProperty + ' is NOT of interest.');
      }
    });
  }

  /**
   * @method                        module:azure-iot-digitaltwins-device.DigitalTwinClient.register
   * @description                   Registers the already provided components with the service.
   * @param registerCallback        If provided, will be invoked on completion of registration, otherwise a promise will be returned.
   */
  register(registerCallback: ErrorCallback): void;
  register(): Promise<void>;
  register(registerCallback?: ErrorCallback): Promise<void> | void {
    return callbackToPromise((_callback) => {
      this._register((err) => {_callback(err);});
    }, registerCallback);
  }

  //
  // Simple private function that sweeps through all the components subsequent to registration and marks them as
  // registered.
  //
  private _setAllComponentsRegistered(): void {
    Object.keys(this._components).forEach((componentName) => {
      this._components[componentName].registered = true;
    });
  }

  //
  // A not quite as simple function that sweeps through all of the components subsequent to registration and
  // enables method handlers for each command.
  //
  private _enableAllCommands(): void {
    Object.keys(this._components).forEach((componentName) => {
      this._components[componentName].commandProperties.forEach((commandInformation) => {
        this._client.onDeviceMethod(commandInformation.methodName, commandInformation.methodCallback);
      });
    });
  }

  private _createCommandInformation(component: BaseInterface, commandName: string): CommandInformation  {
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
          acknowledge: (status: number, payload?: any, callback?: ErrorCallback) => response.send(status, payload, callback as ErrorCallback),
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
   * @param componentName               Name of the instance for this interface.
   * @param interfaceId                 The id (in URN format) for the interface.
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

    //
    // There is NO WAY that this function could be invoked prior to registration.
    // No need to test if registered.
    //
    const commandUpdateSchemaProperty = 'iothub-message-schema';
    const commandUpdateCommandNameProperty = 'iothub-command-name';
    const commandUpdateRequestIdProperty = 'iothub-command-request-id';
    const commandUpdateStatusCodeProperty = 'iothub-command-statuscode';
    return callbackToPromise((_callback) => {
      debug('about to begin the command update telemetry.');
      let updateMessage = new Message(
        JSON.stringify(payload)
      );
      updateMessage.properties.add(commandUpdateSchemaProperty, 'asyncResult');
      updateMessage.properties.add(commandUpdateCommandNameProperty, commandName);
      updateMessage.properties.add(commandUpdateRequestIdProperty, requestId);
      updateMessage.properties.add(commandUpdateStatusCodeProperty, status.toString());
      updateMessage.properties.add(messageInterfaceIdProperty, interfaceId);
      updateMessage.properties.add(messageComponentProperty, componentName);
      this._client.sendEvent(updateMessage, (updateError) => {
        return _callback(updateError);
      });
    }, commandCallback);
  }

  //
  // Another of several functions that create and return a new function.
  // In this case the returned function is used to set telemetry values
  // for a Digital Twin telemetry property.
  //
  private _returnTelemetrySendMethod(componentName: string, interfaceId: string, telemetryName: string): TelemetryPromise | TelemetryCallback {
    return (value, callback) => this._sendTelemetry(componentName, interfaceId, telemetryName, value, callback);
  }

  /**
   * @method                        private _sendTelemetry
   * @description                   Sends a named telemetry message for a supplied interface.
   * @param componentName           Name of the instance for this interface.
   * @param interfaceId             The id (in URN format) for the interface.
   * @param telemetryName           Name of the particular telemetry.
   * @param telemetryValue          The object to be sent.
   * @param callback (optional)     If present, the callback to be invoked on completion of the telemetry,
   *                                otherwise a promise is returned.
   */
  private _sendTelemetry(componentName: string, interfaceId: string, telemetryName: string, telemetryValue: any, sendCallback: ErrorCallback): void;
  private _sendTelemetry(componentName: string, interfaceId: string, telemetryName: string, telemetryValue: any): Promise<void>;
  private _sendTelemetry(componentName: string, interfaceId: string, telemetryName: string, telemetryValue: any, sendCallback?: ErrorCallback): Promise<void> | void {

    return callbackToPromise((_callback) => {
      debug('about to begin the interface telemetry.');
      if (!this._components[componentName].registered) throw new Error(componentName + ' is not registered');
      let newObject: any = {[telemetryName]: telemetryValue};
      let telemetryMessage = new Message(
        JSON.stringify(newObject)
      );
      telemetryMessage.properties.add(messageInterfaceIdProperty, interfaceId);
      telemetryMessage.properties.add(messageComponentProperty, componentName);
      telemetryMessage.properties.add(messageSchemaProperty, telemetryName);
      telemetryMessage.contentType =  'application/json';
      this._client.sendEvent(telemetryMessage, (telemetryError) => {
        return _callback(telemetryError);
      });
    }, sendCallback);
  }

  //
  // Yet another of several methods that create and return a method.
  // In this case the returned method is used to report read only property
  // values.
  //
  private _returnReadOnlyPropertyReportMethod(componentName: string, interfaceId: string, propertyName: string): ReadOnlyPropertyReportPromise | ReadOnlyPropertyReportCallback {
    return (value, callback) => this._reportProperty(componentName, interfaceId, propertyName, value, callback as ErrorCallback);
  }

  /**
   * @method                        private _reportProperty
   * @description                   Sends the value of a reported read only property to the Digital Twin.
   * @param componentName           Name of the instance for this interface.
   * @param interfaceId             The id (in URN format) for the interface.
   * @param propertyName            Name of the particular read only property.
   * @param property                The object to be sent.
   * @param callback (optional)     If present, the callback to be invoked on completion of the telemetry,
   *                                otherwise a promise is returned.
   */
  private _reportProperty(componentName: string, interfaceId: string, propertyName: string, property: any, reportCallback: ErrorCallback): void;
  private _reportProperty(componentName: string, interfaceId: string, propertyName: string, property: any): Promise<void>;
  private _reportProperty(componentName: string, interfaceId: string, propertyName: string, property: any, reportCallback?: ErrorCallback): Promise<void> | void {

    return callbackToPromise((_callback) => {
      if (!this._components[componentName].registered) throw new Error(componentName + ' is not registered');
      let componentPart = componentPrefix + componentName;
      let patch: any = {};
      patch[componentPart] = {};
      patch[componentPart][propertyName] = {value: {}};
      patch[componentPart][propertyName].value = property;
      return this._twin.properties.reported.update(patch, (reportError: Error) => {
        return _callback(reportError);
      });
    }, reportCallback);
  }

  //
  // Yet another of several methods that create and return a method.
  // In this case the returned method is used to update read write property
  // values.
  //
  private _returnReadWritePropertyUpdateMethod(componentName: string, interfaceId: string, readWritePropertyName: string): ReadWritePropertyUpdateCallback | ReadWritePropertyUpdatePromise {
    return (propertyValue, response, callback) => this._reportReadWriteProperty(componentName, interfaceId, readWritePropertyName, propertyValue, response, callback);
  }

  /**
   * @method                              private _reportReadWriteProperty
   * @description                         Sends the value of a reported read write property to the Digital Twin.
   * @param componentName                 Name of the instance for this interface.
   * @param interfaceId                   The id (in URN format) for the interface.
   * @param propertyName                  Name of the particular read only property.
   * @param property                      The object to be sent.
   * @param response                      The response status object for a read write.
   * @param reportCallback (optional)     If present, the callback to be invoked on completion of the telemetry,
   *                                      otherwise a promise is returned.
   */
  private _reportReadWriteProperty(componentName: string, interfaceId: string, propertyName: string, property: any, response: ReadWritePropertyResponse, reportCallback: ErrorCallback): void;
  private _reportReadWriteProperty(componentName: string, interfaceId: string, propertyName: string, property: any, response: ReadWritePropertyResponse): Promise<void>;
  private _reportReadWriteProperty(componentName: string, interfaceId: string, propertyName: string, property: any, response: ReadWritePropertyResponse, reportCallback?: ErrorCallback): Promise<void> | void {

    return callbackToPromise((_callback) => {
      if (!this._components[componentName].registered) throw new Error(componentName + ' is not registered');
      let prefixAndComponentName = componentPrefix + componentName;
      let patch: any = {};
      patch[prefixAndComponentName] = {};
      patch[prefixAndComponentName][propertyName] = {
        value: property,
        sc: response.statusCode,
        sd: response.statusDescription,
        sv: response.responseVersion
      };
      return this._twin.properties.reported.update(patch, (reportError: Error) => {
        return _callback(reportError);
      });
    }, reportCallback);
  }

  private _createReadWriteInformation(component: BaseInterface, readWritePropertyName: string): ReadWriteInformation  {
    return {
      component: component,
      readWritePropertyName: readWritePropertyName,
      prefixAndComponentName: componentPrefix + component.componentName,
    };
  }

  private _getReportedOrDesiredPropertyValue(reportedOrDesired: 'reported' | 'desired', componentPart: string, propertyPart: string): any {
    if (this._twin.properties[reportedOrDesired][componentPart] &&
        this._twin.properties[reportedOrDesired][componentPart][propertyPart]) {
      return this._twin.properties[reportedOrDesired][componentPart][propertyPart].value;
    } else {
      return null;
    }
  }

  private _initialReadWritePropertyProcessing(): void {
    Object.keys(this._components).forEach((componentName) => {
      this._components[componentName].readWriteProperties.forEach((rwi) => {
        //
        // Get the desired value of the read write property (R/W) if it exists.  If we get one also try
        // to get the reported version of the R/W if it exists.
        //
        const desiredPart = this._getReportedOrDesiredPropertyValue('desired', rwi.prefixAndComponentName, rwi.readWritePropertyName);
        const versionProperty = '$version';
        if (desiredPart) {
          const reportedPart = this._getReportedOrDesiredPropertyValue('reported', rwi.prefixAndComponentName, rwi.readWritePropertyName);
          (rwi.component.readWritePropertyChangedCallback as ReadWritePropertyChangedCallback)(rwi.component, rwi.readWritePropertyName, reportedPart, desiredPart, this._twin.properties.desired[versionProperty]);
        }
        //
        // Setup the callback for delta changes.
        //
        this._twin.on('properties.desired.' + rwi.prefixAndComponentName + '.' + rwi.readWritePropertyName, (delta) => {
          (rwi.component.readWritePropertyChangedCallback as ReadWritePropertyChangedCallback)(rwi.component, rwi.readWritePropertyName, null, delta.value, this._twin.properties.desired[versionProperty]);
        });
      });
    });
  }

  /**
   * @method                        private _register
   * @description                   Performs multiple tasks.
   *                                1) Send a telemetry message with a registration object
   *                                   This will be the first network activity of the client.
   *                                2) Given success, it will mark all the components as registered.
   *                                3) It will enable all commands for all components.
   *                                4) It will get the twin.
   *                                5) If permitted, send the SDK information.
   *                                6) It will get all of the RW properties current desired properties
   *                                7) It will set up delta handlers for each RW property.
   *
   * @param registerCallback        The callback to be invoked on completion of the registration.
   */
  private _register(registerCallback: (err?: Error) => void): void {
    debug('about to begin the interface registration.');
    const modelInterfaceId = 'urn:azureiot:ModelDiscovery:ModelInformation:1';
    const modelComponentName = 'urn_azureiot_ModelDiscovery_ModelInformation';
    const registrationSchema = 'modelInformation';

    if (!this._capabilityModel) {
      return registerCallback(new Error('No capability model available.'));
    }

    let registrationObject: any = {};
    registrationObject = {
      modelInformation: {
        capabilityModelId: this._capabilityModel,
        interfaces: {}
      }
    };

    registrationObject.modelInformation.interfaces[modelComponentName] = modelInterfaceId;
    Object.keys(this._components).forEach((componentName) => {
      registrationObject.modelInformation.interfaces[componentName] = this._components[componentName].component.interfaceId;
    });
    let registrationMessage = new Message(JSON.stringify(registrationObject));
    registrationMessage.properties.add(messageInterfaceIdProperty, modelInterfaceId);
    registrationMessage.properties.add(messageComponentProperty, modelComponentName);
    registrationMessage.properties.add(messageSchemaProperty, registrationSchema);
    registrationMessage.contentType = 'application/json';
    this._client.sendEvent(registrationMessage, (registrationError) => {
      if (registrationError) {
        return registerCallback(registrationError);
      } else {
        this._setAllComponentsRegistered();
        this._enableAllCommands();
        this._client.getTwin((getTwinError, twinResult) => {
          if (getTwinError) {
            registerCallback(getTwinError);
          } else {
            this._twin = twinResult as Twin;
            sdkInformation.language.report('Node.js');
            sdkInformation.version.report(packageJson.name + '/' + packageJson.version);
            sdkInformation.vendor.report('Microsoft Corporation');
            this._initialReadWritePropertyProcessing();
            registerCallback();
          }
        });
      }
    });
  }
}
