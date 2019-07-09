import { BaseInterface } from './base_interface';

export type Callback = (err?: Error) => void;
export type ReadOnlyPropertyReportPromise = (propertyValue: any) => Promise<void>;
export type ReadOnlyPropertyReportCallback = (propertyValue: any, callback?: Callback) => void;

export type CommandAcknowledgePromise = (status: number, payload: any) => Promise<void>;
export type CommandAcknowledgeCallback = (status: number, payload: any, callback?: Callback) => void;

export type CommandUpdatePromise = (status: number, payload: any) => Promise<void>;
export type CommandUpdateCallback = (status: number, payload: any, callback?: Callback) => void;


export const azureDigitalTwinReadOnlyProperty = 'ReadOnlyProperty';
export const azureDigitalTwinReadWriteProperty = 'ReadWriteProperty';
export const azureDigitalTwinTelemetryProperty = 'TelemetryProperty';
export const azureDigitalTwinCommandProperty = 'CommandProperty';

export class ReadOnlyProperty {
  azureDigitalTwinType: 'ReadOnlyProperty';
  report: any;
  constructor() {
    this.azureDigitalTwinType = 'ReadOnlyProperty';
  }
}

export interface ReadWritePropertyResponse {
  responseVersion: number;
  statusCode: number;
  statusDescription: string;
}

export type ReadWritePropertyUpdateCallback = (propertyValue: any, response: ReadWritePropertyResponse, callback: Callback) => void;
export type ReadWritePropertyUpdatePromise = (propertyValue: any, response: ReadWritePropertyResponse) => Promise<void>;
export type ReadWritePropertyChangedCallback = (interfaceObject: BaseInterface, propertyName: string, reportedValue: any, desiredValue: any, version: number) => void;

export class ReadWriteProperty {
  azureDigitalTwinType: 'ReadWriteProperty';
  update: any;
  constructor() {
    this.azureDigitalTwinType = 'ReadWriteProperty';
  }
}

export type TelemetryPromise = (value: any) => Promise<void>;
export type TelemetryCallback = (value: any, callback: Callback) => void;
export type TelemetryCallbackOrPromise = (value: any, callback?: Callback) => void | Promise<void>;

export class Telemetry {
  azureDigitalTwinType: 'TelemetryProperty';
  send: any;
  constructor() {
    this.azureDigitalTwinType = 'TelemetryProperty';
  }
}

export interface CommandRequest {
  component: BaseInterface;
  componentName: string;
  commandName: string;
  payload: any;
}

export interface CommandResponse {
  acknowledge: any;
  update: any;
}

export type CommandCallback = (request: CommandRequest, response: CommandResponse) => void;

export class Command {
  azureDigitalTwinType: 'CommandProperty';
  constructor() {
    this.azureDigitalTwinType = 'CommandProperty';
  }
}
