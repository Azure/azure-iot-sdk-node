// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Interface = require('./lib/transport_interface');
var Fsm = require('./lib/transport_state_machine');

/**
 * The `azure-device-provisioning-client` module provides access to the Azure Device Provisoning Service.
 *
 * @module azure-device-provisioning-client
 * @requires module:azure-iot-common
 */

module.exports = {
  Transport: Interface.Transport,
  Config: Interface.Config,
  ResponseCallback: Interface.ResponseCallback,
  TransportHandlers: Fsm.TransportHandlers,
  TransportStateMachine: Fsm.TransportStateMachine
};