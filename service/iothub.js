// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import {Client} from './dist-esm/src/client.js';
import { ConnectionString } from './dist-esm/src/connection_string.js';
import { Registry } from './dist-esm/src/registry.js';
import { SharedAccessSignature } from './dist-esm/src/shared_access_signature.js';
import { Amqp } from './dist-esm/src/amqp.js';
import { AmqpWs } from './dist-esm/src/amqp_ws.js';
import { JobClient } from './dist-esm/src/job_client.js';
import { Device } from './dist-esm/src/device.js';
import { Twin } from './dist-esm/src/twin.js';
import { IoTHubTokenCredentials } from './dist-esm/src/auth/iothub_token_credentials.js';
import { DigitalTwinClient } from './dist-esm/src/cl/digital_twin_client.js';

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

export default IoTHubServiceClientLibrary = {
  Client: Client,
  ConnectionString: ConnectionString,
  Registry: Registry,
  SharedAccessSignature: SharedAccessSignature,
  Amqp: Amqp,
  AmqpWs: AmqpWs,
  JobClient: JobClient,
  Device: Device,
  Twin: Twin,
  IoTHubTokenCredentials: IoTHubTokenCredentials,
  DigitalTwinClient: DigitalTwinClient
};