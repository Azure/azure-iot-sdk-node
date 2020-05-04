// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

const BaseInterface = require('azure-iot-digitaltwins-device').BaseInterface;
const Telemetry = require('azure-iot-digitaltwins-device').Telemetry;
const Property = require('azure-iot-digitaltwins-device').Property;
const Command = require('azure-iot-digitaltwins-device').Command;

module.exports.SDKInformation = class SDKInformation extends BaseInterface {
  constructor(name, propertyCallback, commandCallback) {
    super(name, 'dtmi:azure:SDKInformation;1', propertyCallback, commandCallback);
    this.language = new Property();
    this.version = new Property(true);
    this.vendor = new Property(true);
  }
};
