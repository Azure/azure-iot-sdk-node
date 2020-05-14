// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import {
  BaseInterface,
  Property
} from 'azure-iot-digitaltwins-device';

export class SDKInformation extends BaseInterface {
  language: Property;
  version: Property;
  vendor: Property;

  constructor(componentName: string) {
    super(componentName, 'dtmi:azure:Client:SDKInformation;1');
    this.language = new Property();
    this.version = new Property();
    this.vendor = new Property();
  }
}
