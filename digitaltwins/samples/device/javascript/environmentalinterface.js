// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

const BaseInterface = require('azure-iot-digitaltwins-device').BaseInterface;
const Telemetry = require('azure-iot-digitaltwins-device').Telemetry;
const Property = require('azure-iot-digitaltwins-device').Property;
const Command = require('azure-iot-digitaltwins-device').Command;

module.exports.EnvironmentalSensor = class EnvironmentalSensor extends BaseInterface {
  constructor(name, propertyCallback, commandCallback) {
    super(name, 'urn:contoso:com:EnvironmentalSensor:1', propertyCallback, commandCallback);
    this.temp = new Telemetry();
    this.humid = new Telemetry();
    this.state = new Property();
    this.blink = new Command();
    this.turnOff = new Command();
    this.turnOn = new Command();
    this.runDiagnostics = new Command();
    this.name = new Property(true);
    this.brightness = new Property(true);
  }
};
