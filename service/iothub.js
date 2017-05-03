// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * The Azure IoT Service SDK for Node.js allows applications to send messages
 * to devices and get feedback when they're delivered. It also supports
 * creating, removing, updating, and listing device identities registered with
 * an IoT hub.
 * @module azure-iothub
 */
module.exports = {
  Client: require('./lib/client.js').Client,
  ConnectionString: require('./lib/connection_string.js'),
  Registry: require('./lib/registry.js').Registry,
  SharedAccessSignature: require('./lib/shared_access_signature.js'),
  Amqp: require('./lib/amqp.js').Amqp,
  AmqpWs: require('./lib/amqp_ws.js').AmqpWs,
  JobClient: require('./lib/job_client.js').JobClient,
  Device: require('./lib/device.js').Device
};