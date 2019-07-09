// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import {
  BaseInterface,
  Command,
  ReadOnlyProperty,
  ReadWriteProperty,
  Telemetry,
  ReadWritePropertyChangedCallback,
  CommandCallback
} from 'azure-iot-digitaltwin-device';

export class DigitalTwinInterface extends BaseInterface {
  temp: Telemetry;
  humid: Telemetry;
  state: ReadOnlyProperty;
  blink: Command;
  turnOn: Command;
  turnOff: Command;
  runDiagnostics: Command;
  name: ReadWriteProperty;
  brightness: ReadWriteProperty;

  constructor(component: string, readWritePropertyChangedCallback?: ReadWritePropertyChangedCallback, commandCallback?: CommandCallback) {
    super(component, 'urn:contoso:com:EnvironmentalSensor:1', readWritePropertyChangedCallback, commandCallback);
    this.temp = new Telemetry();
    this.humid = new Telemetry();
    this.state = new ReadOnlyProperty();
    this.blink = new Command();
    this.turnOff = new Command();
    this.turnOn = new Command();
    this.runDiagnostics = new Command();
    this.name = new ReadWriteProperty();
    this.brightness = new ReadWriteProperty();
  }
}
