// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// Choose a protocol by uncommenting one of these transports.
const Protocol = require('azure-iot-device-mqtt').Mqtt;
// var Protocol = require('azure-iot-device-amqp').Amqp;
// var Protocol = require('azure-iot-device-http').Http;
// var Protocol = require('azure-iot-device-mqtt').MqttWs;
// var Protocol = require('azure-iot-device-amqp').AmqpWs;

require('es5-shim');
const Client = require('azure-iot-device').Client;
let client = null;

function main() {
    // open a connection to the device
    const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING || '';
    
    // make sure we have a connection string before we can continue
    if (deviceConnectionString === null || deviceConnectionString === undefined) {
        console.error('\x1b[31m%s\x1b[0m', 'Missing device connection string');
        process.exit(0);
    }
    
    client = Client.fromConnectionString(deviceConnectionString, Protocol);
    client.open(onConnect);
}

function onConnect(err) {
    if(!!err) {
        console.error('\x1b[31m%s\x1b[0m', 'Could not connect: ' + err.message);
    } else {
        console.log('Connected to device. Registering handlers for methods.');
        // register handlers for all the method names we are interested in
        client.onDeviceMethod('getDeviceLog', onGetDeviceLog);
        client.onDeviceMethod('fanOn', onFanOn);
        client.onDeviceMethod('fanOff', onFanOff);
        console.log('Ready to recieve method invocation...');
    }
}

function onGetDeviceLog(request, response) {
    printDeviceMethodRequest(request);

    // Implement actual logic here.

    // complete the response
    response.send(200, 'example payload', function(err) {
        if(!!err) {
            console.error('\x1b[31m%s\x1b[0m', 'An error ocurred when sending a method response:\n' + err.toString());
        } else {
            console.log('Response to method \'' + request.methodName + '\' sent successfully.' );
        }
    });
}

function onFanOn(request, response) {
    printDeviceMethodRequest(request);

    // Implement actual logic here.

    // complete the response
    response.send(200, function(err) {
        if(!!err) {
            console.error('\x1b[31m%s\x1b[0m', 'An error ocurred when sending a method response:\n' + err.toString());
        } else {
            console.log('Response to method \'' + request.methodName + '\' sent successfully.' );
        }
    });
}

function onFanOff(request, response) {
    printDeviceMethodRequest(request);

    // Implement actual logic here.

    // complete the response
    response.send(200, function(err) {
        if(!!err) {
            console.error('\x1b[31m%s\x1b[0m', 'An error ocurred when sending a method response:\n' + err.toString());
        } else {
            console.log('Response to method \'' + request.methodName + '\' sent successfully.' );
        }
    });
}

function printDeviceMethodRequest(request) {
    // print method name
    console.log('Received method call for method \'' + request.methodName + '\'');

    // if there's a payload just do a default console log on it
    if(!!(request.payload)) {
        console.log('Payload:\n' + request.payload);
    }
}

// get the app rolling
main();