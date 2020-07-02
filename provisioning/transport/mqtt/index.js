// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * The `azure-iot-provisioning-device-mqtt` module provides support for the MQTT protocol to the Azure Device Provisoning Service.
 *
 * @module azure-iot-provisioning-device-mqtt
 * @requires module:azure-iot-mqtt-base
 * @requires module:azure-iot-common
 */

module.exports = {
  Mqtt: require('./dist/mqtt.js').Mqtt,
  MqttWs: require('./dist/mqtt_ws.js').MqttWs
};
