// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Amqp } from './amqp.js';
import { AuthenticationProvider, TransportConfig } from 'azure-iot-common';

/**
 * Constructs a transport object that can be used by the device {@link azure-iot-device.Client} to send and receive messages to and from an IoT Hub instance, using the AMQP protocol over secure websockets.
 * This class overloads the constructor of the base {@link azure-iot-device-amqp.Amqp} class from the AMQP transport, and inherits all methods from it.
 *
 * @augments module:azure-iot-device-amqp.Amqp
 */
export class AmqpWs extends Amqp {
  /**
   * @private
   * @constructor
   * @param {Object}  config   Configuration object generated from the connection string by the client.
   */
  constructor(authenticationProvider: AuthenticationProvider) {
    super(authenticationProvider);
  }

  protected _getConnectionUri(credentials: TransportConfig): string {
    return 'wss://' + (credentials.gatewayHostName || credentials.host) + ':443/$iothub/websocket';
  }
}
