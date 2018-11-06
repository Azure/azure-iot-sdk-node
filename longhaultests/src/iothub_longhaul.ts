#!/usr/bin/env node
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import * as uuid from 'uuid';
import * as async from 'async';
import * as dbg from 'debug';
const debug = dbg('longhaul:main');

import { Registry, ConnectionString as HubConnectionString } from 'azure-iothub';
import { ConnectionString as DeviceConnectionString } from 'azure-iot-device';

import { D2CSender } from './d2c_sender';

const MAX_EXECUTION_TIME = parseInt(process.env.MAX_EXECUTION_TIME_SECONDS) * 1000;
const SEND_INTERVAL = parseInt(process.env.DEVICE_SEND_INTERVAL_SECONDS) * 1000;
const SEND_TIMEOUT = parseInt(process.env.DEVICE_SEND_TIMEOUT_SECONDS) * 1000;

const MAX_CREATE_TIME = 30000;
const MAX_DELETE_TIME = 30000;
const MAX_START_TIME = 30000;
const MAX_STOP_TIME = 30000;

const ERROR_EXIT_CODE = -1;
const OK_EXIT_CODE = 0;

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
const registry = Registry.fromConnectionString(hubConnectionString);

const deviceId = 'node-longhaul-sak-' + uuid.v4();
let protocol;

/* tslint:disable:no-var-requires */
switch (process.env.DEVICE_PROTOCOL) {
  case 'amqp':
    protocol = require('azure-iot-device-amqp').Amqp;
  break;
  case 'amqp-ws':
    protocol = require('azure-iot-device-amqp').AmqpWs;
  break;
  case 'mqtt':
    protocol = require('azure-iot-device-mqtt').Mqtt;
  break;
  case 'mqtt-ws':
    protocol = require('azure-iot-device-mqtt').MqttWs;
  break;
  case 'http':
    protocol = require('azure-iot-device-mqtt').Http;
  break;
  default:
    debug('unknown protocol: ' + process.env.DEVICE_PROTOCOL);
    process.exit(ERROR_EXIT_CODE);
}
/* tslint:enable:no-var-requires */

const createDevice = (callback) => {
  debug('creating device: ' + deviceId);
  async.timeout(registry.create.bind(registry), MAX_CREATE_TIME)({ deviceId: deviceId }, (err, deviceInfo) => {
    if (err) {
      debug('error creating device: ' + deviceId + ':' + err.toString());
      callback(err);
    } else {
      debug('device created: ' + deviceId);
      const cs = HubConnectionString.parse(hubConnectionString);
      callback(null, DeviceConnectionString.createWithSharedAccessKey(cs.HostName, deviceInfo.deviceId, deviceInfo.authentication.symmetricKey.primaryKey));
    }
  });
};

const deleteDevice = (callback) => {
  debug('deleting device: ' + deviceId);
  async.timeout(registry.delete.bind(registry), MAX_DELETE_TIME)(deviceId, (err) => {
    if (err) {
      debug('error deleting the test device: ' + err.toString());
    } else {
      debug('test device deleted. Exiting.');
    }
    callback();
  });
};

createDevice((err, deviceConnectionString) => {
  if (err) {
    process.exit(ERROR_EXIT_CODE);
  } else {
    const sender = new D2CSender(deviceConnectionString, protocol, SEND_INTERVAL, SEND_TIMEOUT);

    const stopSender = (callback) => {
      async.timeout(sender.stop.bind(sender), MAX_STOP_TIME)((err) =>  {
        if (err) {
          debug('error stopping the sender: ' + err.toString());
        } else {
          debug('sender stopped.');
        }
        callback();
      });
    };

    sender.on('error', (err) => {
      debug('d2c_sender failed with error: ' + err.toString());
      deleteDevice(() => {
        process.exit(ERROR_EXIT_CODE);
      });
    });

    const endTimeout = setTimeout(() => {
      debug('end timeout: test completed successfully');
      stopSender(() => {
        debug('sender stopped. deleting device');
        deleteDevice(() => {
          debug('test device deleted from registry. Exiting.');
          process.exit(OK_EXIT_CODE);
        });
      });
    }, MAX_EXECUTION_TIME);

    debug('starting d2c_sender');
    async.timeout(sender.start.bind(sender), MAX_START_TIME)((err) => {
      if (err) {
        debug('error starting d2c_sender: ' + err.toString());
        clearTimeout(endTimeout);
        deleteDevice(() => {
          debug('test device deleted. Exiting.');
          process.exit(ERROR_EXIT_CODE);
        });
      } else {
        debug('d2c_sender started');
      }
    });
  }
});
