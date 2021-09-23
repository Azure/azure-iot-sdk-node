// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * The `azure-iot-amqp-base` module contains AMQP support code common to the Azure IoT Hub Device and Service SDKs.
 *
 * @private
 * @module azure-iot-amqp-base
 */

module.exports = {
  Amqp: require('./dist/amqp.js').Amqp,
  AmqpMessage: require('./dist/amqp_message.js').AmqpMessage,
  AmqpReceiver: require('./dist/receiver_link.js').ReceiverLink,
  ReceiverLink: require('./dist/receiver_link.js').ReceiverLink,
  SenderLink: require('./dist/sender_link.js').SenderLink,
  translateError: require('./dist/amqp_common_errors.js').translateError,
  getErrorName: require('./dist/amqp_common_errors.js').getErrorName
};
