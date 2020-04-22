// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import {
  BaseInterface,
  Property
} from 'azure-iot-digitaltwins-device';

export class DeviceInformation extends BaseInterface {
  manufacturer: Property;
  model: Property;
  swVersion: Property;
  osName: Property;
  processorArchitecture: Property;
  processorManufacturer: Property;
  totalStorage: Property;
  totalMemory: Property;

  constructor(componentName: string) {
    super(componentName, 'dtmi:contoso_device_corp:DeviceInformation;1');
    this.manufacturer = new Property();
    this.model = new Property();
    this.swVersion = new Property();
    this.osName = new Property();
    this.processorArchitecture = new Property();
    this.processorManufacturer = new Property();
    this.totalStorage = new Property();
    this.totalMemory = new Property();
  }
}
