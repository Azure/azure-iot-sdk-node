// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

import { BaseInterface, Command, PropertyChangedCallback, CommandCallback } from 'azure-iot-digitaltwins-device';

export class SampleExit extends BaseInterface {
  exit: Command;
  constructor(interfaceInstanceName: string, propertyChangedCallback?: PropertyChangedCallback, commandCallback?: CommandCallback) {
    super(interfaceInstanceName, 'urn:azureiotsdknode:SampleInterface:SampleExit:1', propertyChangedCallback, commandCallback);
    this.exit = new Command();
  }
}
