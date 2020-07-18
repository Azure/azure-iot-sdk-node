#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var uuid = require("uuid");
var timeout_1 = require("async/timeout");
var dbg = require("debug");
var debug = dbg('longhaul:main');
var azure_iothub_1 = require("azure-iothub");
var azure_iot_device_1 = require("azure-iot-device");
var d2c_sender_1 = require("./d2c_sender");
var MAX_EXECUTION_TIME = parseInt(process.env.MAX_EXECUTION_TIME_SECONDS) * 1000;
var SEND_INTERVAL = parseInt(process.env.DEVICE_SEND_INTERVAL_SECONDS) * 1000;
var SEND_TIMEOUT = parseInt(process.env.DEVICE_SEND_TIMEOUT_SECONDS) * 1000;
var MAX_CREATE_TIME = 30000;
var MAX_DELETE_TIME = 30000;
var MAX_START_TIME = 30000;
var MAX_STOP_TIME = 30000;
var ERROR_EXIT_CODE = -1;
var OK_EXIT_CODE = 0;
var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
var registry = azure_iothub_1.Registry.fromConnectionString(hubConnectionString);
var deviceId = 'node-longhaul-sak-' + uuid.v4();
var protocol;
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
var createDevice = function (callback) {
    debug('creating device: ' + deviceId);
    timeout_1.default(registry.create.bind(registry), MAX_CREATE_TIME)({ deviceId: deviceId }, function (err, deviceInfo) {
        if (err) {
            debug('error creating device: ' + deviceId + ':' + err.toString());
            callback(err);
        }
        else {
            debug('device created: ' + deviceId);
            var cs = azure_iothub_1.ConnectionString.parse(hubConnectionString);
            callback(null, azure_iot_device_1.ConnectionString.createWithSharedAccessKey(cs.HostName, deviceInfo.deviceId, deviceInfo.authentication.symmetricKey.primaryKey));
        }
    });
};
var deleteDevice = function (callback) {
    debug('deleting device: ' + deviceId);
    timeout_1.default(registry.delete.bind(registry), MAX_DELETE_TIME)(deviceId, function (err) {
        if (err) {
            debug('error deleting the test device: ' + err.toString());
        }
        else {
            debug('test device deleted. Exiting.');
        }
        callback();
    });
};
createDevice(function (err, deviceConnectionString) {
    if (err) {
        process.exit(ERROR_EXIT_CODE);
    }
    else {
        var sender_1 = new d2c_sender_1.D2CSender(deviceConnectionString, protocol, SEND_INTERVAL, SEND_TIMEOUT);
        var stopSender_1 = function (callback) {
            timeout_1.default(sender_1.stop.bind(sender_1), MAX_STOP_TIME)(function (err) {
                if (err) {
                    debug('error stopping the sender: ' + err.toString());
                }
                else {
                    debug('sender stopped.');
                }
                callback();
            });
        };
        sender_1.on('error', function (err) {
            debug('d2c_sender failed with error: ' + err.toString());
            deleteDevice(function () {
                process.exit(ERROR_EXIT_CODE);
            });
        });
        var endTimeout_1 = setTimeout(function () {
            debug('end timeout: test completed successfully');
            stopSender_1(function () {
                debug('sender stopped. deleting device');
                deleteDevice(function () {
                    debug('test device deleted from registry. Exiting.');
                    process.exit(OK_EXIT_CODE);
                });
            });
        }, MAX_EXECUTION_TIME);
        debug('starting d2c_sender');
        timeout_1.default(sender_1.start.bind(sender_1), MAX_START_TIME)(function (err) {
            if (err) {
                debug('error starting d2c_sender: ' + err.toString());
                clearTimeout(endTimeout_1);
                deleteDevice(function () {
                    debug('test device deleted. Exiting.');
                    process.exit(ERROR_EXIT_CODE);
                });
            }
            else {
                debug('d2c_sender started');
            }
        });
    }
});
//# sourceMappingURL=iothub_longhaul.js.map