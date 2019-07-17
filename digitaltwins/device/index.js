// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

module.exports = {
  DigitalTwinClient: require('./dist/digital_twin_client').DigitalTwinClient,
  BaseInterface: require('./dist/base_interface').BaseInterface,
  Telemetry: require('./dist/interface_types').Telemetry,
  ReadWritePropertyChangedCallback: require('./dist/interface_types').ReadWritePropertyChangedCallback,
  CommandCallback: require('./dist/interface_types').CommandCallback,
  ReadOnlyProperty: require('./dist/interface_types').ReadOnlyProperty,
  ReadWriteProperty: require('./dist/interface_types').ReadWriteProperty,
  Command: require('./dist/interface_types').Command
};
