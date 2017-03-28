// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var util = require('util');
var Amqp = require('./amqp.js');

/**
 * @class module:azure-iot-device-amqp.AmqpWs
 * @classdesc Constructs an {@linkcode AmqpWs} object that can be used on a device to send
 *            and receive messages to and from an IoT Hub instance, using the AMQP protocol over secure websockets.
 *            This class overloads the constructor of the base {@link module:azure-iot-device-amqp:Amqp} class from the AMQP transport, and inherits all methods from it.
 *
 * @augments module:azure-iot-device-amqp.Amqp
 *
 * @param {Object}  config   Configuration object generated from the connection string by the client.
 */
function AmqpWs(config) {
  Amqp.call(this, config);
}

util.inherits(AmqpWs, Amqp);

AmqpWs.prototype._getConnectionUri = function _getConnectionUri() {
  return 'wss://' + this._config.host + ':443/$iothub/websocket';
};

module.exports = AmqpWs;