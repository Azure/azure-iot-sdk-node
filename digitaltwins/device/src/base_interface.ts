import { PropertyChangedCallback, CommandCallback } from './interface_types';

export class BaseInterface {
  readonly interfaceId: string ;
  readonly interfaceInstanceName: string;
  readonly propertyChangedCallback: PropertyChangedCallback | undefined;
  readonly commandCallback: CommandCallback | undefined;
  [key: string]: any;

  constructor(interfaceInstanceName: string, interfaceId: string, propertyChangedCallback?: PropertyChangedCallback, commandCallback?: CommandCallback) {
    this.interfaceInstanceName = interfaceInstanceName;
    this.interfaceId = interfaceId;
    this.propertyChangedCallback = propertyChangedCallback;
    this.commandCallback = commandCallback;
  }
}
