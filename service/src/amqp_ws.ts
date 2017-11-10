// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Amqp } from './amqp';
import { Client } from './client';

/**
 * Transport class used by the [service client]{@link azure-iothub.Client} to connect to the Azure IoT hub using the AMQP protocol over secure websockets.
 * This class should not be used directly and instead be passed to one of the {@link azure-iothub.Client} factory methods: {@link azure-iothub.Client.fromConnectionString|fromConnectionString} or {@link azure-iothub.Client.fromSharedAccessSignature|fromSharedAccessSignature}.
 */
/*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_WS_16_001: [The `AmqpWs` constructor shall accept a config object with those four properties:
- `host` – (string) the fully-qualified DNS hostname of an IoT Hub
- `keyName` – (string) the name of a key that can be used to communicate with the IoT Hub instance
- `sharedAccessSignature–` (string) the key associated with the key name.]*/
/*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_WS_16_002: [`AmqpWs` should inherit from `Amqp`.]*/
export class AmqpWs extends Amqp implements Client.Transport {
  /**
   * @private
   */
  constructor(config: Client.TransportConfigOptions) {
    super(config);
  }

  protected _getConnectionUri(): string {
    return 'wss://' + this._config.host + ':443/$iothub/websocket';
  }
}
