// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

const BaseInterface = require('azure-iot-digitaltwins-device').BaseInterface;
const Property = require('azure-iot-digitaltwins-device').Property;

module.exports.DeviceInformation = class DeviceInformation extends BaseInterface {
  constructor(name, propertyCallback, commandCallback) {
    super(name, 'urn:azureiot:DeviceManagement:DeviceInformation:1', propertyCallback, commandCallback);
    this.manufacturer = new Property();
    this.model = new Property();
    this.swVersion = new Property();
    this.osName = new Property();
    this.processorArchitecture = new Property();
    this.processorManufacturer = new Property();
    this.totalStorage = new Property();
    this.totalMemory = new Property();
  }
};
