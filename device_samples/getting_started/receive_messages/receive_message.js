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
const logRed = '\x1b[31m%s\x1b[0m';
let client = null;

function main() {
    // open a connection to the device
    const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING ?? '';
    
    // make sure we have a connection string before we can continue
    if (deviceConnectionString === null || deviceConnectionString === undefined) {
        console.error(logRed, 'Missing device connection string');
        process.exit(0);
    }
    
    client = Client.fromConnectionString(deviceConnectionString, Protocol);
    client.open(onConnect);
}

function onConnect(err) {
    if(!!err) {
        console.error(logRed, 'Could not connect: ' + err.message);
    } else {
        console.log('Connected to device. Registering message handler.');
        client.on('message', handleMessage);        
        console.log('Ready to recieve messages...');
    }
}

function handleMessage(msg) {
    console.log(logYellow, `\nReceived C2D message:`);
    console.log(` message: ${msg.data.toString().trim()}`);
    console.log(` properties: ${JSON.stringify(msg.properties.propertyList)}`);   
}

// get the app rolling
main();