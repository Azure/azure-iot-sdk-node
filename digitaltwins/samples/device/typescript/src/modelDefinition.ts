// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

import { BaseInterface, Command, PropertyChangedCallback, CommandCallback } from 'azure-iot-digitaltwins-device';

export class ModelDefinition extends BaseInterface {
  getModelDefinition: Command;
  constructor(componentName: string, propertyChangedCallback?: PropertyChangedCallback, commandCallback?: CommandCallback) {
    super(componentName, 'dtmi:contoso_device_corp:ModelDiscovery:ModelDefinition;1', propertyChangedCallback, commandCallback);
    this.getModelDefinition = new Command();
  }
}
