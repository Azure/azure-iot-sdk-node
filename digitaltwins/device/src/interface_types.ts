import { BaseInterface } from './base_interface';

/*
 * Simple callback signature for callback interface methods.  They
 * simply provide an error.  When the asynchronous operation completes
 * successfully there are no results reported.
 *
* @param err                        Optional Error that will be provided if the asynchronous
 *                                  function encountered an error condition.
 */
export type Callback = (err?: Error) => void;

/*
 * Name for the type that represents a ReadOnlyProperty
 */
export const azureDigitalTwinReadOnlyProperty = 'ReadOnlyProperty';
/*
 * Name for the type that represents a ReadWriteProperty
 */
export const azureDigitalTwinReadWriteProperty = 'ReadWriteProperty';
/*
 * Name for the type that represents a Telemetry
 */
export const azureDigitalTwinTelemetry = 'Telemetry';
/*
 * Name for the type that represents a Command
 */
export const azureDigitalTwinCommand = 'Command';

/*
 * Used to represent the read only property type for Digital Twins.
 */
export class ReadOnlyProperty {
  /*
   * Holds the type for ReadOnlyProperty
   */
  azureDigitalTwinType: 'ReadOnlyProperty';
  /*
   * The method used by Digital Twin application to communicate the
   * value of a ReadOnlyProperty.
   *
   * Will have a signature of ReadOnlyPropertyReportPromise or ReadOnlyPropertyReportCallback.
   */
  report: any;
  constructor() {
    this.azureDigitalTwinType = 'ReadOnlyProperty';
  }
}

/*
 * Signature for public method for reporting read property change
 * that utilize a promise instead of callback.
 *
 * This is used for a ReadOnlyProperty .report method.
 *
 * @param   propertyValue           The value that the ReadOnlyProperty should be set to
 *                                  in the Digital Twin.
 * @returns {Promise<void>}         Promise if no callback function was passed, void otherwise.
 */
export type ReadOnlyPropertyReportPromise = (propertyValue: any) => Promise<void>;

/*
 * Signature for public method for reporting read property change
 * that utilize a callback instead of promise.
 *
 * This is used for a ReadOnlyProperty .report method.
 *
 * @param   propertyValue           The value that the ReadOnlyProperty should be set to
 *                                  in the Digital Twin.
 * @parm    callback                Function to be invoked when the operation to report
 *                                  the ReadOnlyProperty has completed successfully or
 *                                  with an Error.
 */
export type ReadOnlyPropertyReportCallback = (propertyValue: any, callback?: Callback) => void;

/*
 * Used to represent the read write property type for Digital Twins.
 */
export class ReadWriteProperty {
  /*
   * Holds the type for ReadWriteProperty
   */
  azureDigitalTwinType: 'ReadWriteProperty';
  /*
   * The method used by Digital Twin application to communicate the
   * value of a ReadWriteProperty.
   *
   * Will have a signature of ReadWritePropertyUpdatePromise or ReadWritePropertyUpdateCallback.
   */
  update: any;
  constructor() {
    this.azureDigitalTwinType = 'ReadWriteProperty';
  }
}

/*
 * Object provided by application code to report the status
 * of an update to a ReadWriteProperty.
 */
export interface ReadWritePropertyResponse {
  /*
   * The version this update is based on.
   */
  responseVersion: number;
  /*
   * An HTTP value such as 200, 401, 500.
   */
  statusCode: number;
  /*
   * A description of what the response is trying to communicate.
   * This could be something like: "Invalid value specified for property."
   * or "Executing phase 2 of runDiagnostics."
   */
  statusDescription: string;
}

/*
 * Signature for public method for updating read write property
 * that utilize a callback instead of promise.
 *
 * This is used for a ReadWriteProperty .update method.
 *
 * @param   propertyValue           The value that the ReadWriteProperty should be set to
 *                                  in the Digital Twin.
 * @parm    callback                Function to be invoked when the operation to report
 *                                  the ReadWriteProperty has completed successfully or
 *                                  with an Error.
 */
export type ReadWritePropertyUpdateCallback = (propertyValue: any, response: ReadWritePropertyResponse, callback: Callback) => void;

/*
 * Signature for public method for updating a read write property
 * that utilize a promise instead of callback.
 *
 * This is used for a ReadWriteProperty .update method.
 *
 * @param   propertyValue           The value that the ReadWriteProperty should be set to
 *                                  in the Digital Twin.
 * @returns {Promise<void>}         Promise if no callback function was passed, void otherwise.
 */
export type ReadWritePropertyUpdatePromise = (propertyValue: any, response: ReadWritePropertyResponse) => Promise<void>;

/*
 * Signature for the application function which will be invoked for handling read write properties.
 * This application supplied function will invoked for each ReadWriteProperty subsequent to
 * registration.  In addition it will be invoke each time the property is updated service side.
 *
 * This callback must be given in the BaseInterface object constructor if there are any
 * read write properties.
 *
 * @param   BaseInterface           The object that is an extension of the BaseInterface which contains
 *                                  the read write properties this callback will handle.
 * @param   propertyName            The particular property name of the ReadWriteProperty which has been
 *                                  updated service side, or post registration.
 * @param   reportedValue           The reported value in the Digital Twin.  This could be useful
 *                                  in that the application might not need to update if the value is the
 *                                  same as the desired value.  NOTE: This will ONLY be provided on the
 *                                  invocation post registration.
 * @param   desiredValue            The value of the read write property as set by a service side application.
 * @param   version                 The value of the version property for the desired properties of the Digital
 *                                  Twin.
 */
export type ReadWritePropertyChangedCallback = (interfaceObject: BaseInterface, propertyName: string, reportedValue: any, desiredValue: any, version: number) => void;

/*
 * Used to represent the Telemetry property type for Digital Twins.
 */
export class Telemetry {
  /*
   * Holds the type for Telemetry
   */
  azureDigitalTwinType: 'Telemetry';
  /*
   * The method used by Digital Twin application to communicate the
   * value of a Telemetry.
   *
   * Will have a signature of TelemetryPromise or TelemetryCallback.
   */
  send: any;
  constructor() {
    this.azureDigitalTwinType = 'Telemetry';
  }
}

/*
 * Signature for public method for sending a telemetry property
 * that utilize a promise instead of callback.
 *
 * This is used for a Telemetry .send method.
 *
 * @param   value                   The value for the telemetry being sent to
 *                                  in the Digital Twin.
 * @returns {Promise<void>}         Promise if no callback function was passed, void otherwise.
 */
export type TelemetryPromise = (value: any) => Promise<void>;

/*
 * Signature for public method for sending a telemetry property
 * that utilize a callback instead of a promise
 *
 * This is used for a Telemetry .send method.
 *
 * @param   value                   The value for the telemetry being sent to
 *                                  in the Digital Twin.
 * @parm    callback                Function to be invoked when the operation to send
 *                                  the telemetry has completed successfully or
 *                                  with an Error.
 */
export type TelemetryCallback = (value: any, callback: Callback) => void;

/*
 * Used to represent the Command property type for Digital Twins.
 */
export class Command {
  /*
   * Holds the type for Command
   */
  azureDigitalTwinType: 'Command';
  constructor() {
    this.azureDigitalTwinType = 'Command';
  }
}

/*
 * Signature for public method for providing the acknowledgement for a command property
 * that utilize a promise instead of a callback.
 *
 * This is used for a Command .acknowledge method.
 *
 * @param   status                  An Http status.
 * @param   payload                 An object containing information particular
 *                                  specific to this command implementation.
 * @returns {Promise<void>}         Promise if no callback function was passed, void otherwise.
 */
export type CommandAcknowledgePromise = (status: number, payload: any) => Promise<void>;

/*
 * Signature for public method for providing the acknowledgement for a command property
 * that utilize a callback instead of a promise.
 *
 * This is used for a Command .acknowledge method.
 *
 * @param   status                  An Http status.
 * @param   payload                 An object containing information particular
 *                                  specific to this command implementation.
 * @parm    callback                Function to be invoked when the operation to acknowledge
 *                                  the Command has completed successfully or with an Error.
 */
export type CommandAcknowledgeCallback = (status: number, payload: any, callback?: Callback) => void;

/*
 * Signature for public method for providing the update for a command property
 * that utilize a promise instead of a callback.
 *
 * This is used for a Command .update method.
 *
 * @param   status                  An Http status.
 * @param   payload                 An object containing information particular
 *                                  specific to this command implementation.
 * @returns {Promise<void>}         Promise if no callback function was passed, void otherwise.
 */
export type CommandUpdatePromise = (status: number, payload: any) => Promise<void>;

/*
 * Signature for public method for providing the update for a command property
 * that utilize a callback instead of a promise.
 *
 * This is used for a Command .update method.
 *
 * @param   status                  An Http status.
 * @param   payload                 An object containing information particular
 *                                  specific to this command implementation.
 * @parm    callback                Function to be invoked when the operation to update
 *                                  the Command has completed successfully or with an Error.
 */
export type CommandUpdateCallback = (status: number, payload: any, callback?: Callback) => void;

/*
 * One of the pair of parameters for the CommandCallback.
 */
export interface CommandRequest {
  /*
   * The object that is an extension of the BaseInterface which contains
   * the command properties this callback will handle.
   */
  component: BaseInterface;
  /*
   * The name of the interface instance for the commands that this callback will handle.
   */
  componentName: string;
  /*
   * The name of the command property that is to be invoked.
   */
  commandName: string;
  /*
   * A payload (which is application defined) that will be given to command to process.
   */
  payload: any;
}

/*
 * The second of the parameters to the CommandCallback.
 */
export interface CommandResponse {
  /*
   * The method to be invoked for the initial response (or only response for a synchronous command).
   *
   * It will have a signature of CommandAcknowledgeCallback or CommandAcknowledgePromise.
   */
  acknowledge: any;
  /*
   * The method to be invoked for all responses after the acknowledge response.
   *
   * It will have a signature of CommandUpdateCallback or CommandUpdatePromise.
   */
  update: any;
}

/*
 * Signature for the application function which will be invoked for handling command properties.
 *
 * This callback must be supplied in the BaseInterface object constructor, if there are any command
 * properties in the interface.
 *
 * @param   request                 A CommandRequest.
 * @param   response                A CommandResponse.
 */
export type CommandCallback = (request: CommandRequest, response: CommandResponse) => void;
