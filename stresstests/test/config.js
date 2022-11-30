// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// const deviceHttp = require('azure-iot-device-http');
// const deviceAmqp = require('azure-iot-device-amqp');
const deviceMqtt = require('azure-iot-device-mqtt');

module.exports = {
  d2c: {
    transportsToTest: [
      // deviceHttp.Http,
      deviceMqtt.Mqtt,
      // deviceMqtt.MqttWs,
      // deviceAmqp.Amqp,
      // deviceAmqp.AmqpWs,
    ],
    deviceClientHelperMethodsToUse: [
      'createDeviceClientSas',
      // 'createDeviceClientSymmetricKey',
      // 'createDeviceClientX509SelfSigned',
      // 'createDeviceClientX509CaSigned',
      // 'createModuleClientSas',
      // 'createModuleClientSymmetricKey',
    ],
    telemetryPayloadSizeInBytes: 16 * 1024,
    memorySamplingIntervalInMs: 5 * 1000,
    peakRssFailureTriggerInBytes: Infinity,
    peakTelemetryArrivalTimeFailureTriggerInMs: Infinity,
    peakReconnectTimeFailureTriggerInMs: Infinity,
    continuousTest: {
      testDurationInMs: 120 * 1000,
      messagesPerSecond: 30,
    },
    allAtOnceTest: {
      messageCount: 3000,
      elapsedTimeFailureTriggerInMs: 5 * 60 * 1000,
    },
  },

}
