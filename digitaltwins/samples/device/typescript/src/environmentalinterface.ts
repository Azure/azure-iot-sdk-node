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
  turnOff: Command;
  turnOn: Command;
  runDiagnostics: Command;
  name: Property;
  brightness: Property;

  constructor(interfaceInstanceName: string, propertyChangedCallback?: PropertyChangedCallback, commandCallback?: CommandCallback) {
    super(interfaceInstanceName, 'urn:contoso:com:EnvironmentalSensor:1', propertyChangedCallback, commandCallback);
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
}
