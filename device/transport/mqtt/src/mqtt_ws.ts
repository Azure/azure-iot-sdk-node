// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { ClientConfig, Client, StableConnectionTransport, TwinTransport } from 'azure-iot-device';
import { Mqtt } from './mqtt';

/**
 * Provides MQTT over WebSockets transport for the device [client]{@link module:azure-iot-device.Client} class.
 * This class is not meant to be used directly, instead it should just be passed to the [client]{@link module:azure-iot-device.Client} object.
 */
/*Codes_SRS_NODE_DEVICE_MQTT_12_001: [The constructor shall accept the transport configuration structure.]*/
/*Codes_SRS_NODE_DEVICE_MQTT_12_002: [The constructor shall store the configuration structure in a member variable.]*/
/*Codes_SRS_NODE_DEVICE_MQTT_12_003: [The constructor shall create an base transport object and store it in a member variable.]*/
export class MqttWs extends Mqtt implements Client.Transport, StableConnectionTransport, TwinTransport {
  /**
   * @private
   * @constructor
   * @param   {Object}    config  Configuration object derived from the connection string by the client.
   */
  constructor(config: ClientConfig) {
    super(config);
    /*Codes_SRS_NODE_DEVICE_MQTT_16_017: [The `MqttWs` constructor shall initialize the `uri` property of the `config` object to `wss://<host>:443/$iothub/websocket`.]*/
    (this._config as any).uri  = 'wss://' + config.host + ':443/$iothub/websocket';
  }
}
