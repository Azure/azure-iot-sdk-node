import { ReadWritePropertyChangedCallback, CommandCallback } from './interface_types';

export class BaseInterface {
  readonly interfaceId: string ;
  readonly componentName: string;
  readonly readWritePropertyChangedCallback: ReadWritePropertyChangedCallback | undefined;
  readonly commandCallback: CommandCallback | undefined;
  [key: string]: any;

  constructor(componentName: string, interfaceId: string, readWritePropertyChangedCallback?: ReadWritePropertyChangedCallback, commandCallback?: CommandCallback) {
    this.componentName = componentName;
    this.interfaceId = interfaceId;
    this.readWritePropertyChangedCallback = readWritePropertyChangedCallback;
    this.commandCallback = commandCallback;
  }
}
