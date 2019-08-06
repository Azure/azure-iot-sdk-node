// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import {
  BaseInterface,
  Property
} from 'azure-iot-digitaltwins-device';

export class DeviceInformation extends BaseInterface {
  fwVersion: Property;
  manufacturer: Property;
  model: Property;
  oem: Property;
  osName: Property;
  osVersion: Property;
  processorArchitecture: Property;
  processorType: Property;
  processorManufacturer: Property;
  totalStorage: Property;
  totalMemory: Property;
  boardManufacturer: Property;
  boardPart: Property;
  serialNumber: Property;
  connectivity: Property;
  hwInterface: Property;
  secureHardware: Property;
  batteryRuntime: Property;
  batteryRemaining: Property;

  constructor(interfaceInstanceName: string) {
    super(interfaceInstanceName, 'urn:azureiot:DeviceInformation:1');
    this.fwVersion = new Property();
    this.manufacturer = new Property();
    this.model = new Property();
    this.oem = new Property();
    this.osName = new Property();
    this.osVersion = new Property();
    this.processorArchitecture = new Property();
    this.processorType = new Property();
    this.processorManufacturer = new Property();
    this.totalStorage = new Property();
    this.totalMemory = new Property();
    this.boardManufacturer = new Property();
    this.boardPart = new Property();
    this.serialNumber = new Property();
    this.connectivity = new Property();
    this.hwInterface = new Property();
    this.secureHardware = new Property();
    this.batteryRuntime = new Property();
    this.batteryRemaining = new Property();
  }
}
