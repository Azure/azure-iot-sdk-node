// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

const BaseInterface = require('azure-iot-digitaltwins-device').BaseInterface;
const Property = require('azure-iot-digitaltwins-device').Property;

module.exports.SDKInformation = class SDKInformation extends BaseInterface {
  constructor(name, propertyCallback, commandCallback) {
    super(name, 'dtmi:azure:SDKInformation;1', propertyCallback, commandCallback);
    this.language = new Property();
    this.version = new Property();
    this.vendor = new Property();
  }
};
