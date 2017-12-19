// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Amqp as Base } from 'azure-iot-amqp-base';
import { RegistrationRequest } from 'azure-iot-provisioning-device';
import { Amqp } from './amqp';

/**
 * Transport used to provision a device over AMQP over Websockets.
 */
export class AmqpWs extends Amqp {
  /**
   * @private
   */
  constructor(amqpBase?: Base) {
    super(amqpBase);
  }

  /**
   * @private
   */
  protected _getConnectionUri(request: RegistrationRequest): string {
    return 'wss://' + request.provisioningHost + ':443/$iothub/websocket';
  }
}
