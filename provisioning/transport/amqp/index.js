// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * The `azure-iot-provisioning-amqp` module provides support for the AMQP protocol to the Azure Device Provisoning Service.
 *
 * @module azure-iot-provisioning-amqp
 * @requires module:azure-iot-amqp-base
 * @requires module:azure-iot-common
 */

module.exports = {
  Amqp: require('./lib/amqp.js').Amqp,
  AmqpWs: require('./lib/amqp_ws.js').AmqpWs,
};
