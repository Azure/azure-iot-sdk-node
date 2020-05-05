// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import {
  BaseInterface,
  Command,
  Property,
  Telemetry,
  PropertyChangedCallback,
  CommandCallback
} from 'azure-iot-digitaltwins-device';

export class EnvironmentalSensor extends BaseInterface {
  temp: Telemetry;
  humid: Telemetry;
  state: Property;
  blink: Command;
  turnoff: Command;
  turnon: Command;
  rundiagnostics: Command;
  name: Property;
  brightness: Property;

  constructor(componentName: string, propertyChangedCallback?: PropertyChangedCallback, commandCallback?: CommandCallback) {
    super(componentName, 'dtmi:my_company:com:EnvironmentalSensor;1', propertyChangedCallback, commandCallback);
    this.temp = new Telemetry();
    this.humid = new Telemetry();
    this.state = new Property();
    this.blink = new Command();
    this.turnoff = new Command();
    this.turnon = new Command();
    this.rundiagnostics = new Command();
    this.name = new Property(true);
    this.brightness = new Property(true);
  }
}
