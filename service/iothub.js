// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * The Azure IoT Service SDK for Node.js allows applications to interact with an Azure IoT hub with:
 * A messaging {@link azure-iothub.Client} using either AMQP or AMQP over Websockets that enables:
 * - sending cloud-to-device messages (also known as commands) to devices
 * - execute direct methods on devices
 * - listening for feedback when cloud-to-device messages are delivered
 * - listening for file upload notifications from devices
 *
 * It also supports Device identity registry operations with the {@link azure-iothub.Registry} object:
 * - creating, removing, updating, and listing device identities registered with an IoT hub
 * - get and update and query device twins
 *
 * Finally, the `{@link azure-iothub.JobClient} object allows to schedule long running tasks that:
 * - execute direct methods on one or more devices at a specific time
 * - update one or more device twins at a specific time
 *
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
  Device: require('./lib/device.js').Device,
  Twin: require('./lib/twin.js').Twin
};
