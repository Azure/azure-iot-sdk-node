// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * The `azure-iot-mqtt-base` module contains MQTT support code common to the Azure IoT Hub Device and Service SDKs.
 *
 * @private
 * @module azure-iot-mqtt-base
 */

module.exports = {
  MqttBase: require('./lib/mqtt_base.js').MqttBase,
  translateError: require('./lib/mqtt_translate_error.js').translateError
};