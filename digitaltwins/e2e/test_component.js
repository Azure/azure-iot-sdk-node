// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

const BaseInterface = require('azure-iot-digitaltwin-device').BaseInterface;
const Telemetry = require('azure-iot-digitaltwin-device').Telemetry;
const ReadOnlyProperty = require('azure-iot-digitaltwin-device').ReadOnlyProperty;
const ReadWriteProperty = require('azure-iot-digitaltwin-device').ReadWriteProperty;
const Command = require('azure-iot-digitaltwin-device').Command;

const interfaceId = 'urn:microsoft:azureiot:nodesdk:e2etest:1';

module.exports.TestComponent = class TestComponent extends BaseInterface {
  constructor(name, propertyCallback, commandCallback) {
    super(name, interfaceId, propertyCallback, commandCallback);
    this.interfaceId = interfaceId;
    this.componentName = name;
    this.telemetry = new Telemetry();
    this.readOnlyProperty = new ReadOnlyProperty();
    this.readWriteProperty = new ReadWriteProperty();
    this.syncCommand = new Command();
  }
};
