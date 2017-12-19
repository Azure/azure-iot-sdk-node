
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Mqtt } from './mqtt';
import { RegistrationRequest } from 'azure-iot-provisioning-device';
import { MqttBase } from 'azure-iot-mqtt-base';

/**
 * Transport used to provision a device over MQTT over Websockets.
 */
export class MqttWs extends Mqtt {

  /**
   * @private
   */
  constructor(mqttBase?: MqttBase) {
    super(mqttBase);
  }

  /**
   * @private
   */
  /* Codes_SRS_NODE_PROVISIONING_MQTT_18_049: [ When connecting using websockets, `Mqtt`Ws shall set the uri passed into the transport to 'wss://<host>:443/$iothub/websocket'.] */
  protected _getConnectionUri(request: RegistrationRequest): string {
    return 'wss://' + request.provisioningHost + ':443/$iothub/websocket';
  }

}
