import { PropertyChangedCallback, CommandCallback } from './interface_types';

export class BaseInterface {
  readonly interfaceId: string ;
  readonly componentName: string;
  readonly propertyChangedCallback: PropertyChangedCallback | undefined;
  readonly commandCallback: CommandCallback | undefined;
  [key: string]: any;

  constructor(componentName: string, interfaceId: string, propertyChangedCallback?: PropertyChangedCallback, commandCallback?: CommandCallback) {
    this.componentName = componentName;
    this.interfaceId = interfaceId;
    this.propertyChangedCallback = propertyChangedCallback;
    this.commandCallback = commandCallback;
  }
}
