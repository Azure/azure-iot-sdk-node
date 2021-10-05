#!/usr/bin/env node
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

export const amqpFaults = [
  {
    operationType: 'KillTcp',
    closeReason: ' severs the TCP connection ',
  },
  {
    operationType: 'KillAmqpConnection',
    closeReason: ' severs the AMQP connection ',
  },
  {
    operationType: 'KillAmqpSession',
    closeReason: ' severs the AMQP session ',
  },
  {
    operationType: 'KillAmqpCBSLinkReq',
    closeReason: ' severs AMQP CBS request link ',
  },
  {
    operationType: 'KillAmqpCBSLinkResp',
    closeReason: ' severs AMQP CBS response link ',
  },
  {
    operationType: 'KillAmqpD2CLink',
    closeReason: ' severs AMQP D2C link ',
  },
  {
    operationType: 'ShutDownAmqp',
    closeReason: ' cleanly shutdowns AMQP connection ',
  },
];

export const mqttFaults = [
  {
    operationType: 'KillTcp',
    closeReason: ' severs the TCP connection ',
  },
  {
    operationType: 'ShutDownMqtt',
    closeReason: ' cleanly shutdowns MQTT connection ',
  },
];
