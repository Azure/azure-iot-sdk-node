// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import * as dbg from 'debug';
const debug = dbg('azure-iot-digitaltwins-device:Client');

import { DigitalTwinInterface as SdkInformation } from './sdkinformation';
import { callbackToPromise, errorCallbackToPromise, ErrorCallback, Message } from 'azure-iot-common';
import { Client, Twin, DeviceMethodRequest, DeviceMethodResponse } from 'azure-iot-device';
import { BaseInterface } from './base_interface';
import { azureDigitalTwinTelemetry, azureDigitalTwinCommand, azureDigitalTwinProperty,
         Telemetry, TelemetryPromise, TelemetryCallback,
         Property, PropertyReportCallback, PropertyReportPromise, PropertyChangedCallback, DesiredStateResponse,
         CommandRequest, CommandResponse, CommandUpdateCallback, CommandUpdatePromise, CommandCallback
        } from './interface_types';

/**
 * @private
 * The name of the application property that contains the interface id as its value.
 */
const messageInterfaceIdProperty: string = '$.ifid';
/**
 * @private
 * The name of the application property that contains the interfaceInstance name (a specific
 * interface instance) as its value.
 */
const messageInterfaceInstanceProperty: string = '$.ifname';
/**
 * @private
 * The Digital Twin application property name whose value communicates what the item is.
 * For instance, a telemetry, or registration model information.
 */
const messageSchemaProperty: string = '$.schema';
/**
 * @private
 * Prefixes the interfaceInstance name in various objects, like command names.
 */
const interfaceInstancePrefix: string = '$iotin:';
/**
 * @private
 * Prefixes the actual data object in various Digital Twin objects, like command names.
 */
const commandInterfaceInstanceCommandNameSeparator = '*';

/**
 * @private
 * An array of these items will be created for each interfaceInstance.
 * At registration time, the registration code will sweep through all of the
 * registered interfaceInstances and within each interfaceInstance will utilize the data here to
 * enable a method handler for each command.
 */
interface CommandInformation {
  interfaceInstance: BaseInterface;
  commandName: string;
  //
  // The name that is passed to the underlying device client method client.
  // It is formed from the interfaceInstance name and command property name.
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
 * An array of these items will be created for each interfaceInstance.
 *
 * At registration time, the registration code will sweep through all of the
 * registered interfaceInstances and within each interfaceInstance will utilize the data here to
 * process each write enabled property.
 *
 * This are two separate things that must be done post registration.
 *
 * 1) Obtain (if they exist) both the desired and reported "value"s of each
 * property.  They should be supplied to the interfaceInstances property changed callback.  The
 * version property is also obtained.  The callback is free to act however it
 * choses (including doing a new "update" on the property).
 *
 * 2) Set a callback for delta updates of each writable property.  This callback will
 * be used to invoke the interfaceInstances property changed callback (The same one as invoked in "1)").
 * For delta updates the reported property value will NOT supplied.
 */
interface WritablePropertyInformation {
  interfaceInstance: BaseInterface;
  propertyName: string;
  //
  // This is part of the path to get to this particular writable property in the
  // twin.
  //
  // (Used in both the "reported" and "desired" paths.)
  //
  prefixAndInterfaceInstanceName: string;
}

/**
 * @private
 * These are the values of a dictionary created within the Digital Twin client.
 * The dictionary key is the interfaceInstance name.
 */
interface InterfaceInstanceInformation {
  //
  // Utilized to insure that an interfaceInstance isn't used before registration.
  //
  registered: boolean;
  //
  // The actual object that defines an interfaceInstance.  These can be imported and constructed
  // or built up on the fly.
  //
  interfaceInstance: BaseInterface;
  //
  // An array of information for each command defined by the interface.
  commandProperties: CommandInformation[];
  //
  // An array of information for each writable property defined by the interface.
  //
  writableProperties: WritablePropertyInformation[];
}

/**
 * @private
 * Utilized by the SDK Information interface to obtain the version information.
 */
// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

export class DigitalTwinClient {
  //
  // An instantiation of the SDK information interface.
  //
  private readonly _sdkInformation: SdkInformation  = new SdkInformation('urn_azureiot_Client_SDKInformation', 'urn:azureiot:Client:SDKInformation:1');

  //
  // Dictionary of each interfaceInstance and the associated interface.
  //
  private _interfaceInstances: {[key: string]: InterfaceInstanceInformation} = {};
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
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_001: [Will throw `ReferenceError` if `capabilityModel` argument is falsy.] */
    if (!capabilityModel) throw new ReferenceError('capabilityModel must not be falsy');
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_002: [Will throw `ReferenceError` if the constructor `client` argument is falsy.] */
    if (!client) throw new ReferenceError('client must not be falsy');
    this._capabilityModel = capabilityModel;
    this._client = client;
    this._twin = {} as Twin;
    this.addInterfaceInstance(this._sdkInformation);
  }

  /**
   * @method                        module:azure-iot-digitaltwins-device.DigitalTwinClient.addInterfaceInstance
   * @description                   Adds the interfaceInstance to the Digital Twin client.  This will not cause
   *                                any network activity.  This is a synchronous method.
   * @param newInterfaceInstance            The object for a particular interfaceInstance.
   */
  addInterfaceInstance(newInterfaceInstance: BaseInterface): void {
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_003: [Will throw `ReferenceError` if the `newInterfaceInstance` argument is falsy.] */
    if (!newInterfaceInstance) throw new ReferenceError('newInterfaceInstance is \'' + newInterfaceInstance + '\'');
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_004: [Will throw `ReferenceError` if the `newInterfaceInstance` argument `interfaceId` property is falsy.] */
    if (!newInterfaceInstance.interfaceId) throw new ReferenceError('interfaceId is \'' + newInterfaceInstance.interfaceId + '\'');
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_005: [Will throw `ReferenceError` if the `newInterfaceInstance` argument `interfaceInstanceName` property is falsy.] */
    if (!newInterfaceInstance.interfaceInstanceName) throw new ReferenceError('interfaceInstance is \'' + newInterfaceInstance.interfaceInstanceName + '\'');
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_006: [Will throw `Error` if the `newInterfaceInstance` argument property `interfaceInstanceName` property value is used by a previously added interfaceInstance.] */
    if (this._interfaceInstances[newInterfaceInstance.interfaceInstanceName]) throw new Error('interfaceInstance ' + newInterfaceInstance.interfaceInstanceName + ' is already added.');
    this._interfaceInstances[newInterfaceInstance.interfaceInstanceName] = {
      interfaceInstance: newInterfaceInstance,
      commandProperties: [],
      writableProperties: [],
      registered: false
    };
    Object.keys(newInterfaceInstance).forEach((individualProperty) => {
      if (newInterfaceInstance[individualProperty] && newInterfaceInstance[individualProperty].azureDigitalTwinType) {
        debug(newInterfaceInstance.interfaceInstanceName + '.' + individualProperty + ' is of type: ' + newInterfaceInstance[individualProperty].azureDigitalTwinType);
        switch (newInterfaceInstance[individualProperty].azureDigitalTwinType) {
          case azureDigitalTwinTelemetry: {
            //
            // This instantiates a 'send' method for this telemetry property that invokes the lower level clients send function.  The
            // instantiated function will format the message appropriately and add any necessary transport/digital twin properties to
            // the message.
            //
            /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_034: [ Subsequent to addInterfaceInstance a Telemetry will have a report method.] */
            (newInterfaceInstance[individualProperty] as Telemetry).send = this._returnTelemetrySendMethod(newInterfaceInstance.interfaceInstanceName, newInterfaceInstance.interfaceId, individualProperty);
            break;
          }
          case azureDigitalTwinCommand: {
            //
            // Must have defined an application defined callback for the commands of this interfaceInstance.
            //
            // We use the _createCommandInformation method to instantiate an IoT Hub device method handler that will invoke application command callback.
            // We save this in a structure created for this interfaceInstance so that at registration time we can enable the IoT Hub device method handler.
            //
            if (newInterfaceInstance.commandCallback) {
              this._interfaceInstances[newInterfaceInstance.interfaceInstanceName].commandProperties.push(this._createCommandInformation(newInterfaceInstance, individualProperty));
            } else {
              /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_007: [Will throw `Error` if the `newInterfaceInstance` has a property of type `Command` but no defined `CommandCallback`.] */
              throw new Error('InterfaceInstance ' + newInterfaceInstance.interfaceInstanceName + ' does not have a command callback specified');
            }
            break;
          }
          case azureDigitalTwinProperty: {
            if ((newInterfaceInstance[individualProperty] as Property).writable) {
              //
              // Must have defined a callback for the property updates of this interfaceInstance.
              //
              if (newInterfaceInstance.propertyChangedCallback) {
                this._interfaceInstances[newInterfaceInstance.interfaceInstanceName].writableProperties.push(this._createWritablePropertyInformation(newInterfaceInstance, individualProperty));
              } else {
                /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_008: [Will throw `Error` if the `newInterfaceInstance` has a writable property but no defined `PropertyChangedCallback`.] */
                throw new Error('InterfaceInstance ' + newInterfaceInstance.interfaceInstanceName + ' does not have a property update callback specified');
              }
            }

            //
            // This instantiates a 'report' method for this property that invokes the lower level clients twin reporting.  The
            // instantiated function will format the message appropriately and add any necessary transport/digital twin properties to
            // the message.
            //
            /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_033: [** Subsequent to addInterfaceInstance a writable property will have a report method.] */
            (newInterfaceInstance[individualProperty] as Property).report  = this._returnPropertyReportMethod(newInterfaceInstance.interfaceInstanceName, newInterfaceInstance.interfaceId, individualProperty);
            break;
          }
          default: {
            /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_009: [Will throw `TypeError` if the `newInterfaceInstance` has a property `azureDigitalTwinType` with an unrecognized type.] */
            throw new TypeError('Unrecognized Azure Digital Twin Type');
          }
        }
      } else {
        debug(newInterfaceInstance.interfaceInstanceName + '.' + individualProperty + ' is NOT of interest.');
      }
    });
  }

  /**
   * @method                        module:azure-iot-digitaltwins-device.DigitalTwinClient.register
   * @description                   Registers the already provided interfaceInstances with the service.
   * @param registerCallback        If provided, will be invoked on completion of registration, otherwise a promise will be returned.
   */
  register(registerCallback: ErrorCallback): void;
  register(): Promise<void>;
  register(registerCallback?: ErrorCallback): Promise<void> | void {
    return errorCallbackToPromise((_callback) => this._register(_callback), registerCallback as ErrorCallback);
  }

  //
  // Simple private function that sweeps through all the interfaceInstances subsequent to registration and marks them as
  // registered.
  //
  private _setAllInterfaceInstancesRegistered(): void {
    Object.keys(this._interfaceInstances).forEach((interfaceInstanceName) => {
      this._interfaceInstances[interfaceInstanceName].registered = true;
    });
  }

  //
  // A not quite as simple function that sweeps through all of the interfaceInstances subsequent to registration and
  // enables method handlers for each command.
  //
  private _enableAllCommands(): void {
    Object.keys(this._interfaceInstances).forEach((interfaceInstanceName) => {
      this._interfaceInstances[interfaceInstanceName].commandProperties.forEach((commandInformation) => {
        /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_012: [For each property in an interfaceInstance with type `Command`, a device method will be enabled with a name of the form '$iotin:' followed by the interfaceInstance name followed by '*' followed by the property name.] */
        this._client.onDeviceMethod(commandInformation.methodName, commandInformation.methodCallback);
      });
    });
  }

  private _createCommandInformation(interfaceInstance: BaseInterface, commandName: string): CommandInformation  {
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_013: [** For commands, the `commandCallback` will be invoked with `request` and `response` arguments with the following properties.
      request:
        {
          interfaceInstance: interfaceInstance,
          interfaceInstanceName: interfaceInstance.interfaceInstanceName
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
      **]
    */
    return {
      interfaceInstance: interfaceInstance,
      commandName: commandName,
      methodName: interfaceInstancePrefix + interfaceInstance.interfaceInstanceName + commandInterfaceInstanceCommandNameSeparator + commandName,
      //
      // Create a function that will be used as the handler for IoT Hub method callbacks.
      // This instantiated function will create request and response objects suitable for
      // Digital Twin Commands.
      //
      methodCallback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => {
        const commandRequest: CommandRequest = {
          interfaceInstance: interfaceInstance,
          interfaceInstanceName: interfaceInstance.interfaceInstanceName,
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
          update: this._returnCommandUpdateMethod(interfaceInstance.interfaceInstanceName, interfaceInstance.interfaceId, commandName, request.payload.commandRequest.requestId)
         };
        (interfaceInstance.commandCallback as CommandCallback)(commandRequest, commandResponse);
      }
    };
  }

  //
  // The first of several methods that create and return a new method.
  // In this case the returned method is used to update the status of
  // a Digital Twin async command.
  //
  private _returnCommandUpdateMethod(interfaceInstanceName: string, interfaceId: string, commandName: string, requestId: string): CommandUpdateCallback | CommandUpdatePromise {
    return (status: number, payload: any, callback?: ErrorCallback) =>
      this._sendCommandUpdate(interfaceInstanceName, interfaceId, commandName, requestId, status, payload, callback as ErrorCallback);
  }

  /**
   * @method                            private _sendCommandUpdate
   * @description                       Sends a command update message interfaceInstance/command.
   * @param interfaceInstanceName               Name of the instance for this interface.
   * @param interfaceId                 The id (in URN format) for the interface.
   * @param commandName                 The name of the particular command updating its status.
   * @param requestId                   The id supplied by the Digital Twin Service that uniquely identifies
   *                                    this particular invocation of the command.
   * @param status                      An http code specifying the status of the command.
   * @param payload                     The data passed back as part of the response.
   * @param commandCallback (optional)  If present, the callback to be invoked on completion of the update,
   *                                    otherwise a promise is returned.
   */
  private _sendCommandUpdate(interfaceInstanceName: string, interfaceId: string, commandName: string, requestId: string, status: number, payload: any, commandCallback: ErrorCallback): void;
  private _sendCommandUpdate(interfaceInstanceName: string, interfaceId: string, commandName: string, requestId: string, status: number, payload: any): Promise<void>;
  private _sendCommandUpdate(interfaceInstanceName: string, interfaceId: string, commandName: string, requestId: string, status: number,payload: any, commandCallback?: ErrorCallback): Promise<void> | void {

    /*
      Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_022: [Within the command callback, the application can invoke the `update` method which in turn will invoke the device client `sendEvent` method with the following message:
      payload:
      This JSON stringified value of the payload parameter.

      message application properties:
      'iothub-message-schema' : 'asyncResult'
      'iothub-command-name': <command name>
      'iothub-command-request-id': request.payload.commandRequest.requestId of the method request
      'iothub-command-statuscode': statusCode argument of the update method
      '$.ifname': interfaceInstances name
      contentType: 'application/json'
      ]
     */
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
      /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_031: [Within the command callback, the application can invoke the `update` method, with no `payload` argument or payload argument set to undefined or null, which in turn will invoke the device client `sendEvent` method with a message payload of 'null'. ] */
      let updateMessage = new Message(
        JSON.stringify(payload || null)
      );
      updateMessage.properties.add(commandUpdateSchemaProperty, 'asyncResult');
      updateMessage.properties.add(commandUpdateCommandNameProperty, commandName);
      updateMessage.properties.add(commandUpdateRequestIdProperty, requestId);
      updateMessage.properties.add(commandUpdateStatusCodeProperty, status.toString());
      updateMessage.properties.add(messageInterfaceInstanceProperty, interfaceInstanceName);
      updateMessage.contentType = 'application/json';
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
  private _returnTelemetrySendMethod(interfaceInstanceName: string, interfaceId: string, telemetryName: string): TelemetryPromise | TelemetryCallback {
    return (value, callback) => this._sendTelemetry(interfaceInstanceName, interfaceId, telemetryName, value, callback);
  }

  /**
   * @method                        private _sendTelemetry
   * @description                   Sends a named telemetry message for a supplied interface.
   * @param interfaceInstanceName           Name of the instance for this interface.
   * @param interfaceId             The id (in URN format) for the interface.
   * @param telemetryName           Name of the particular telemetry.
   * @param telemetryValue          The object to be sent.
   * @param callback (optional)     If present, the callback to be invoked on completion of the telemetry,
   *                                otherwise a promise is returned.
   */
  private _sendTelemetry(interfaceInstanceName: string, interfaceId: string, telemetryName: string, telemetryValue: any, sendCallback: ErrorCallback): void;
  private _sendTelemetry(interfaceInstanceName: string, interfaceId: string, telemetryName: string, telemetryValue: any): Promise<void>;
  private _sendTelemetry(interfaceInstanceName: string, interfaceId: string, telemetryName: string, telemetryValue: any, sendCallback?: ErrorCallback): Promise<void> | void {
      /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_032: [** A telemetry will send a device message with the following format:
        payload: {<telemetry property name>: value}
        message application properties:
        contentType: 'application/json'
        $.ifname: <interfaceInstance name>
        $.schema: <telemetry property name>
        **]
      */
    return callbackToPromise((_callback) => {
      debug('about to begin the interface telemetry.');
      if (!this._interfaceInstances[interfaceInstanceName].registered) {
        return _callback(new Error(interfaceInstanceName + ' is not registered'));
      } else {
        let newObject: any = {[telemetryName]: telemetryValue};
        let telemetryMessage = new Message(
          JSON.stringify(newObject)
        );
        telemetryMessage.properties.add(messageInterfaceInstanceProperty, interfaceInstanceName);
        telemetryMessage.properties.add(messageSchemaProperty, telemetryName);
        telemetryMessage.contentType =  'application/json';
        this._client.sendEvent(telemetryMessage, (telemetryError) => {
          return _callback(telemetryError);
        });
      }
    }, sendCallback);
  }

  //
  // Yet another of several methods that create and return a method.
  // In this case the returned method is used to update a property
  // values.
  //
  private _returnPropertyReportMethod(interfaceInstanceName: string, interfaceId: string, propertyName: string): PropertyReportPromise | PropertyReportCallback {
    return (propertyValue, responseOrCallback, callback) => {
      return this._reportProperty(interfaceInstanceName, interfaceId, propertyName, propertyValue, responseOrCallback as DesiredStateResponse, callback as ErrorCallback);
    };
  }

  /**
   * @method                        private _reportProperty
   * @description                   Sends the value of a reported property to the Digital Twin.
   * @param interfaceInstanceName           Name of the instance for this interface.
   * @param interfaceId             The id (in URN format) for the interface.
   * @param propertyName            Name of the particular property.
   * @param propertyValue           The object to be sent.
   * @param callback (optional)     If present, the callback to be invoked on completion of the telemetry,
   *                                otherwise a promise is returned.
   */
  private _reportProperty(interfaceInstanceName: string, interfaceId: string, propertyName: string, propertyValue: any, responseOrCallback: DesiredStateResponse | ErrorCallback, callback?: ErrorCallback): void;
  private _reportProperty(interfaceInstanceName: string, interfaceId: string, propertyName: string, propertyValue: any, response?: DesiredStateResponse): Promise<void>;
  private _reportProperty(interfaceInstanceName: string, interfaceId: string, propertyName: string, propertyValue: any, responseOrCallback?: DesiredStateResponse | ErrorCallback, callback?: ErrorCallback): Promise<void> | void {
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

    return callbackToPromise((_callback) => {
      if (!this._interfaceInstances[interfaceInstanceName].registered) {
        return _callback(new Error(interfaceInstanceName + ' is not registered'));
      } else {
        /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_038: [** Properties may invoke the method `report` with a value to produce a patch to the reported properties. **] */
        let interfaceInstancePart = interfaceInstancePrefix + interfaceInstanceName;
        let propertyContent: any = {
          value: propertyValue
        };

        /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_039: [** Properties may invoke the method `report` with a value and a response object to produce a patch to the reported properties. **] */
        if (actualResponse) {
          propertyContent.sc = actualResponse.code;
          propertyContent.sd = actualResponse.description;
          propertyContent.sv = actualResponse.version;
        }

        let patch = {
          [interfaceInstancePart]: {
            [propertyName]: propertyContent
          }
        };

        this._twin.properties.reported.update(patch, _callback);
      }
    }, actualCallback);
  }

  private _createWritablePropertyInformation(interfaceInstance: BaseInterface, propertyName: string): WritablePropertyInformation  {
    return {
      interfaceInstance: interfaceInstance,
      propertyName: propertyName,
      prefixAndInterfaceInstanceName: interfaceInstancePrefix + interfaceInstance.interfaceInstanceName,
    };
  }

  private _getReportedOrDesiredPropertyValue(reportedOrDesired: 'reported' | 'desired', interfaceInstancePart: string, propertyPart: string): any {
    if (this._twin.properties[reportedOrDesired] &&
        this._twin.properties[reportedOrDesired][interfaceInstancePart] &&
        this._twin.properties[reportedOrDesired][interfaceInstancePart][propertyPart]) {
      return this._twin.properties[reportedOrDesired][interfaceInstancePart][propertyPart].value;
    } else {
      return null;
    }
  }

  private _initialWritablePropertyProcessing(): void {
    Object.keys(this._interfaceInstances).forEach((interfaceInstanceName) => {
      this._interfaceInstances[interfaceInstanceName].writableProperties.forEach((rwi) => {
        //
        // Get the desired value of the writable property  if it exists.  If we get one also try
        // to get the reported version of the writable if it exists.
        //
        const desiredPart = this._getReportedOrDesiredPropertyValue('desired', rwi.prefixAndInterfaceInstanceName, rwi.propertyName);
        const versionProperty = '$version';
        if (desiredPart) {
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_037: [Initially, if it exists, provide the reported property also to the property change callback.] */
          const reportedPart = this._getReportedOrDesiredPropertyValue('reported', rwi.prefixAndInterfaceInstanceName, rwi.propertyName);
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_036: [Following the initial get of the twin, the writable properties will have their desired values retrieved, provided they exist, provided to the property changed callback along with the current desired version value.] */
          (rwi.interfaceInstance.propertyChangedCallback as PropertyChangedCallback)(rwi.interfaceInstance, rwi.propertyName, reportedPart, desiredPart, this._twin.properties.desired[versionProperty]);
        }
        //
        // Setup the callback for delta changes.
        //
        /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_035: [Subsequent to the register, a writable property will have an event listener on the `properties.desired.$iotin:<interfaceInstanceName>.<propertyName>`] */
        this._twin.on('properties.desired.' + rwi.prefixAndInterfaceInstanceName + '.' + rwi.propertyName, (delta) => {
          /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_040: [A change to the desired property will invoke the property change callback with the change value and version.] */
          (rwi.interfaceInstance.propertyChangedCallback as PropertyChangedCallback)(rwi.interfaceInstance, rwi.propertyName, null, delta.value, this._twin.properties.desired[versionProperty]);
        });
      });
    });
  }

  /**
   * @method                        private _register
   * @description                   Performs multiple tasks.
   *                                1) Send a telemetry message with a registration object
   *                                   This will be the first network activity of the client.
   *                                2) Given success, it will mark all the interfaceInstances as registered.
   *                                3) It will enable all commands for all interfaceInstances.
   *                                4) It will get the twin.
   *                                5) If permitted, send the SDK information.
   *                                6) It will get all of the writable properties current desired properties
   *                                7) It will set up delta handlers for each writable property.
   *
   * @param registerCallback        The callback to be invoked on completion of the registration.
   */
  private _register(registerCallback: (err?: Error) => void): void {
    debug('about to begin the interface registration.');
    /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_010: [** Will send a telemetry message with the following properties and payload to perform the registration:
      payload:
      {modelInformation:
        capabilityModelId: <capabilityModelURN>,
        interfaces: {
          <interfaceInstanceName>: <interfaceId>
        }
      }
      message application properties:
      $.ifid : 'urn:azureiot:ModelDiscovery:ModelInformation:1'
      $.ifname: 'urn_azureiot_ModelDiscovery_ModelInformation'
      $.schema: 'modelInformation'
      contentType: 'application/json'
      **]
    */
    const modelInterfaceId = 'urn:azureiot:ModelDiscovery:ModelInformation:1';
    const modelInterfaceInstanceName = 'urn_azureiot_ModelDiscovery_ModelInformation';
    const registrationSchema = 'modelInformation';

    let registrationObject: any = {};
    registrationObject = {
      modelInformation: {
        capabilityModelId: this._capabilityModel,
        interfaces: {}
      }
    };

    registrationObject.modelInformation.interfaces[modelInterfaceInstanceName] = modelInterfaceId;
    Object.keys(this._interfaceInstances).forEach((interfaceInstanceName) => {
      registrationObject.modelInformation.interfaces[interfaceInstanceName] = this._interfaceInstances[interfaceInstanceName].interfaceInstance.interfaceId;
    });
    let registrationMessage = new Message(JSON.stringify(registrationObject));
    registrationMessage.properties.add(messageInterfaceIdProperty, modelInterfaceId);
    registrationMessage.properties.add(messageInterfaceInstanceProperty, modelInterfaceInstanceName);
    registrationMessage.properties.add(messageSchemaProperty, registrationSchema);
    registrationMessage.contentType = 'application/json';
    this._client.sendEvent(registrationMessage, (registrationError) => {
      if (registrationError) {
        /* Codes_SRS_NODE_DIGITAL_TWIN_DEVICE_06_011: [Will indicate an error via a callback or by promise rejection if the registration message fails.] */
        return registerCallback(registrationError);
      } else {
        this._setAllInterfaceInstancesRegistered();
        this._enableAllCommands();
        this._client.getTwin((getTwinError, twinResult) => {
          if (getTwinError) {
            return registerCallback(getTwinError);
          } else {
            this._twin = twinResult as Twin;
            this._initialWritablePropertyProcessing();
            //
            // Intentionally letting a failure of SDK information report
            // be ignored.
            //
            this._sdkInformation.language.report('Node.js', (err?: Error) => {
              if (err) {
                debug('Error updating the SDK language: ' + err.toString());
              }
              this._sdkInformation.version.report(packageJson.name + '/' + packageJson.version, (err?: Error) => {
                if (err) {
                  debug('Error updating the SDK version: ' + err.toString());
                }
                this._sdkInformation.vendor.report('Microsoft Corporation', (err?: Error) => {
                  if (err) {
                    debug('Error updating the SDK vendor: ' + err.toString());
                  }
                  return registerCallback();
                });
              });
            });
          }
        });
      }
    });
  }
}
