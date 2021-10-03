// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

import { Amqp, AmqpWs } from 'azure-iot-device-amqp';
import { Mqtt, MqttWs } from 'azure-iot-device-mqtt';
import { Http } from 'azure-iot-device-http';

// Helper function to go from a transport name to an actual transport.
export function getTransport(transport: string): any {
  switch (transport.toLowerCase()) {
    case 'amqp':
      return Amqp;
    case 'amqp-ws':
      return AmqpWs;
    case 'mqtt':
      return Mqtt;
    case 'mqtt-ws':
      return MqttWs;
    case 'http':
      return Http;
    default:
      throw new Error('unknown protocol: ' + transport);
  }
}

// Given an interval in milliseconds, return hours, minutes, and seconds as a human readable string.
export function getIntervalString(i: number): string {
  let seconds = Math.floor(i / 1000);

  const hours = Math.floor(seconds / 3600);
  seconds -= hours * 3600;

  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;

  return `${hours} hours, ${minutes} minutes, and ${seconds} seconds`;
}
