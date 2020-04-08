// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

const BaseInterface = require('azure-iot-digitaltwins-device').BaseInterface;
const Telemetry = require('azure-iot-digitaltwins-device').Telemetry;
const Property = require('azure-iot-digitaltwins-device').Property;
const Command = require('azure-iot-digitaltwins-device').Command;

const interfaceId = 'dtmi:microsoft:azureiot:nodesdk:e2etest;1';

module.exports.TestInterfaceInstance = class TestInterfaceInstance extends BaseInterface {
  constructor(name, propertyCallback, commandCallback) {
    super(name, interfaceId, propertyCallback, commandCallback);
    this.telemetry = new Telemetry();
    this.firstTelemetryProperty = new Telemetry();
    this.secondTelemetryProperty = new Telemetry();
    this.thirdTelemetryProperty = new Telemetry();
    this.readOnlyProperty = new Property();
    this.writableProperty = new Property(true);
    this.syncCommand = new Command();
    this.asyncCommand = new Command();
  }
};
