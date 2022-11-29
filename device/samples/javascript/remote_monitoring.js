// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// Choose a protocol by uncommenting one of these transports.
const Protocol = require('azure-iot-device-mqtt').Mqtt;
// const Protocol = require('azure-iot-device-amqp').Amqp;
// const Protocol = require('azure-iot-device-http').Http;
// const Protocol = require('azure-iot-device-mqtt').MqttWs;
// const Protocol = require('azure-iot-device-amqp').AmqpWs;

const Client = require('azure-iot-device').Client;
const ConnectionString = require('azure-iot-device').ConnectionString;
const Message = require('azure-iot-device').Message;

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING;
const deviceId = ConnectionString.parse(deviceConnectionString).DeviceId;

// Sensors data
let temperature = 50;
let humidity = 50;
let externalTemperature = 55;

// Create IoT Hub client
const client = Client.fromConnectionString(deviceConnectionString, Protocol);

// Helper function to print results for an operation
function printErrorFor(op) {
  return function printError(err) {
    if (err) console.log(op + ' error: ' + err.toString());
  };
}

// Helper function to generate random number between min and max
function generateRandomIncrement() {
  return ((Math.random() * 2) - 1);
}

// Send device meta data
const deviceMetaData = {
  'ObjectType': 'DeviceInfo',
  'IsSimulatedDevice': 0,
  'Version': '1.0',
  'DeviceProperties': {
    'DeviceID': deviceId,
    'HubEnabledState': 1,
    'CreatedTime': '2015-09-21T20:28:55.5448990Z',
    'DeviceState': 'normal',
    'UpdatedTime': null,
    'Manufacturer': 'Contoso Inc.',
    'ModelNumber': 'MD-909',
    'SerialNumber': 'SER9090',
    'FirmwareVersion': '1.10',
    'Platform': 'node.js',
    'Processor': 'ARM',
    'InstalledRAM': '64 MB',
    'Latitude': 47.617025,
    'Longitude': -122.191285
  },
  'Commands': [{
    'Name': 'SetTemperature',
    'Parameters': [{
      'Name': 'Temperature',
      'Type': 'double'
    }]
  },
    {
      'Name': 'SetHumidity',
      'Parameters': [{
        'Name': 'Humidity',
        'Type': 'double'
      }]
    }]
};

// eslint-disable-next-line security/detect-non-literal-fs-filename
client.open(function (err) {
  if (err) {
    printErrorFor('open')(err);
  } else {
    console.log('Sending device metadata:\n' + JSON.stringify(deviceMetaData));
    client.sendEvent(new Message(JSON.stringify(deviceMetaData)), printErrorFor('send metadata'));

    client.on('message', function (msg) {
      console.log('receive data: ' + msg.getData());

      try {
        const command = JSON.parse(msg.getData());
        if (command.Name === 'SetTemperature') {
          temperature = command.Parameters.Temperature;
          console.log('New temperature set to :' + temperature + 'F');
        }

        client.complete(msg, printErrorFor('complete'));
      } catch (err) {
        printErrorFor('parse received message')(err);
      }
    });

    // start event data send routing
    const sendInterval = setInterval(function () {
      temperature += generateRandomIncrement();
      externalTemperature += generateRandomIncrement();
      humidity += generateRandomIncrement();

      const data = JSON.stringify({
        'DeviceID': deviceId,
        'Temperature': temperature,
        'Humidity': humidity,
        'ExternalTemperature': externalTemperature
      });

      console.log('Sending device event data:\n' + data);
      client.sendEvent(new Message(data), printErrorFor('send event'));
    }, 1000);

    client.on('error', function (err) {
      printErrorFor('client')(err);
      if (sendInterval) clearInterval(sendInterval);
      client.close(printErrorFor('client.close'));
    });
  }
});
