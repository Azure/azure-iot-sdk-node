// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const ConnectionString = require('azure-iot-device').ConnectionString;
const Message = require('azure-iot-device').Message;

import * as deviceMetaData from './remote_monitoring_config.json';


// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
const deviceConnectionString = process.env.DEVICE_CONNECTION_STRING;
deviceMetaData.DeviceProperties.DeviceID = ConnectionString.parse(deviceConnectionString).DeviceId;

console.log('Creating IoT Device Client');
const client = Client.fromConnectionString(deviceConnectionString, Protocol);

// Sensors data
let temperature = 50;
let humidity = 50;
let externalTemperature = 55;


// Helper function to print results for an operation
function printErrorFor(op) {
  return function printError(err) {
    if (err) console.log(op + ' error: ' + err.toString());
  };
}

// Helper function to generate random number between min and max
const generateRandomIncrement = () => {
  return ((Math.random() * 2) - 1);
};

const onMessageCallback = async (msg) => {
    console.log('receive data ' + msg.getData());
    try {
        let command = JSON.parse(msg.getData());
        if (command.Name === 'SetTemperature') {
            temperature = command.Parameters.Temperature;
            console.log('New temperature set to :' + temperature + 'F');
        }
        await client.complete(msg);
    }
    catch (err) {
        console.error('Parse received message error:' + err);
    }
};

const onErrorCallback = sendInterval => async(err) => {
    printErrorFor('client')(err);
    if (sendInterval) clearInterval(sendInterval);
    await client.close();
};

const run = async () => {
    console.log('Opening connection to IoT Hub.');
    await client.open();
    
    console.log('Sending device metadata:\n' + JSON.stringify(deviceMetaData));
    await client.sendEvent(new Message(JSON.stringify(deviceMetaData)));
    
    client.on('message', onMessageCallback);
    
    
    // start event data send routing
    let sendInterval = setInterval(function () {
        temperature += generateRandomIncrement();
        externalTemperature += generateRandomIncrement();
        humidity += generateRandomIncrement();
        
        let data = JSON.stringify({
            'DeviceID': deviceId,
            'Temperature': temperature,
            'Humidity': humidity,
            'ExternalTemperature': externalTemperature
        });
        console.log('Sending device event data:\n' + data);
        client.sendEvent(new Message(data), printErrorFor('send event'));
    }, 1000);   

    client.on('error', onErrorCallback(sendInterval));
    
};

run();


