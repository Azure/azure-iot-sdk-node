// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Mqtt } from './mqtt';
import { MqttBaseTransportConfig } from 'azure-iot-mqtt-base';
import { AuthenticationProvider, TransportConfig } from 'azure-iot-common';

/**
 * Provides MQTT over WebSockets transport for the device [client]{@link module:azure-iot-device.Client} class.
 * This class is not meant to be used directly, instead it should just be passed to the [client]{@link module:azure-iot-device.Client} object.
 */
/*Codes_SRS_NODE_DEVICE_MQTT_12_001: [The constructor shall accept the transport configuration structure.]*/
/*Codes_SRS_NODE_DEVICE_MQTT_12_002: [The constructor shall store the configuration structure in a member variable.]*/
/*Codes_SRS_NODE_DEVICE_MQTT_12_003: [The constructor shall create an base transport object and store it in a member variable.]*/
export class MqttWs extends Mqtt {
  /**
   * @private
   * @constructor
   * @param   {Object}    config  Configuration object derived from the connection string by the client.
   */
  constructor(authenticationProvider: AuthenticationProvider, mqttBase?: any) {
    super(authenticationProvider, mqttBase);
    /*Codes_SRS_NODE_DEVICE_MQTT_16_017: [The `MqttWs` constructor shall initialize the `uri` property of the `config` object to `wss://<host>:443/$iothub/websocket`.]*/
  }

  protected _getBaseTransportConfig(credentials: TransportConfig): MqttBaseTransportConfig {
    let baseConfig: MqttBaseTransportConfig = super._getBaseTransportConfig(credentials);
    baseConfig.uri  = 'wss://' + (credentials.gatewayHostName || credentials.host) + ':443/$iothub/websocket';
    return baseConfig;
  }
}
