// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

require('es5-shim');
var Protocol = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;

var client = null;

function main() {
    // open a connection to the device
    var deviceConnectionString = process.env.DEVICE_CONNECTION_STRING;
    client = Client.fromConnectionString(deviceConnectionString, Protocol);
    client.open(onConnect);
}

function onConnect(err) {
    if(!!err) {
        console.error('Could not connect: ' + err.message);
    } else {
        console.log('Connected to device. Registering handlers for methods.');

        // register handlers for all the method names we are interested in
        client.onDeviceMethod('getDeviceLog', onGetDeviceLog);
        client.onDeviceMethod('lockDoor', onLockDoor);
    }
}

function onGetDeviceLog(request, response) {
    printDeviceMethodRequest(request);

    // Implement actual logic here.

    // complete the response
    response.send(200, 'example payload', function(err) {
        if(!!err) {
            console.error('An error ocurred when sending a method response:\n' +
                err.toString());
        } else {
            console.log('Response to method \'' + request.methodName +
                '\' sent successfully.' );
        }
    });
}

function onLockDoor(request, response) {
    printDeviceMethodRequest(request);

    // Implement actual logic here.

    // complete the response
    response.send(200, function(err) {
        if(!!err) {
            console.error('An error ocurred when sending a method response:\n' +
                err.toString());
        } else {
            console.log('Response to method \'' + request.methodName +
                '\' sent successfully.' );
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