// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

const BaseInterface = require('azure-iot-digitaltwins-device').BaseInterface;
const Command = require('azure-iot-digitaltwins-device').Command;

module.exports.ModelDefinition = class ModelDefinition extends BaseInterface {
  constructor(name, propertyCallback, commandCallback) {
    super(name, 'urn:azureiot:ModelDiscovery:ModelDefinition:1', propertyCallback, commandCallback);
    this.getModelDefinition = new Command();
  }
};