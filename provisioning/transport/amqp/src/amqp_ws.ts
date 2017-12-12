// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Amqp as Base } from 'azure-iot-amqp-base';
import { RegistrationRequest } from 'azure-iot-provisioning-device';
import { Amqp } from './amqp';

export class AmqpWs extends Amqp {
  constructor(amqpBase?: Base) {
    super(amqpBase);
  }

  protected _getConnectionUri(request: RegistrationRequest): string {
    return 'wss://' + request.provisioningHost + ':443/$iothub/websocket';
  }

}
