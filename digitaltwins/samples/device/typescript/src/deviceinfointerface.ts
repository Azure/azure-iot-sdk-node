// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import {
  BaseInterface,
  ReadOnlyProperty
} from 'azure-iot-digitaltwins-device';

export class DigitalTwinInterface extends BaseInterface {
  fwVersion: ReadOnlyProperty;
  manufacturer: ReadOnlyProperty;
  model: ReadOnlyProperty;
  oem: ReadOnlyProperty;
  osName: ReadOnlyProperty;
  osVersion: ReadOnlyProperty;
  processorArchitecture: ReadOnlyProperty;
  processorType: ReadOnlyProperty;
  processorManufacturer: ReadOnlyProperty;
  totalStorage: ReadOnlyProperty;
  totalMemory: ReadOnlyProperty;
  boardManufacturer: ReadOnlyProperty;
  boardPart: ReadOnlyProperty;
  serialNumber: ReadOnlyProperty;
  connectivity: ReadOnlyProperty;
  hwInterface: ReadOnlyProperty;
  secureHardware: ReadOnlyProperty;
  batteryRuntime: ReadOnlyProperty;
  batteryRemaining: ReadOnlyProperty;

  constructor(component: string) {
    super(component, 'urn:azureiot:DeviceInformation:1');
    this.fwVersion = new ReadOnlyProperty();
    this.manufacturer = new ReadOnlyProperty();
    this.model = new ReadOnlyProperty();
    this.oem = new ReadOnlyProperty();
    this.osName = new ReadOnlyProperty();
    this.osVersion = new ReadOnlyProperty();
    this.processorArchitecture = new ReadOnlyProperty();
    this.processorType = new ReadOnlyProperty();
    this.processorManufacturer = new ReadOnlyProperty();
    this.totalStorage = new ReadOnlyProperty();
    this.totalMemory = new ReadOnlyProperty();
    this.boardManufacturer = new ReadOnlyProperty();
    this.boardPart = new ReadOnlyProperty();
    this.serialNumber = new ReadOnlyProperty();
    this.connectivity = new ReadOnlyProperty();
    this.hwInterface = new ReadOnlyProperty();
    this.secureHardware = new ReadOnlyProperty();
    this.batteryRuntime = new ReadOnlyProperty();
    this.batteryRemaining = new ReadOnlyProperty();
  }
}
