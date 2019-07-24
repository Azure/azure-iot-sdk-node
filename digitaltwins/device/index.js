// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

module.exports = {
  DigitalTwinClient: require('./dist/digital_twin_client').DigitalTwinClient,
  BaseInterface: require('./dist/base_interface').BaseInterface,
  Telemetry: require('./dist/interface_types').Telemetry,
  PropertyChangedCallback: require('./dist/interface_types').PropertyChangedCallback,
  CommandCallback: require('./dist/interface_types').CommandCallback,
  Property: require('./dist/interface_types').Property,
  Command: require('./dist/interface_types').Command
};
