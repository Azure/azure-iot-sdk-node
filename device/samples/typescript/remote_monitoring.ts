/* eslint-disable security/detect-non-literal-fs-filename */
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// Choose a protocol by uncommenting one of these transports.
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';

import { Client, ConnectionString, Message } from 'azure-iot-device';

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
const deviceConnectionString: string = process.env.IOTHUB_DEVICE_CONNECTION_STRING || '';

if (deviceConnectionString === '') {
  console.log('device connection string not set');
  process.exit(-1);
}

const deviceId = ConnectionString.parse(
  deviceConnectionString
).DeviceId;

// Sensors data
let temperature: number = 50;
let humidity: number = 50;
let externalTemperature: number = 55;

// Create IoT Hub client
const client: Client = Client.fromConnectionString(deviceConnectionString, Protocol);

// Helper function to print results for an operation
function printErrorFor(op: any): (err?: Error) => void {
  return function printError(err?: Error): void {
    if (err) console.log(op + ' error: ' + err.toString());
  };
}

// Helper function to generate random number between min and max
function generateRandomIncrement(): number {
  return Math.random() * 2 - 1;
}

// Send device meta data
const deviceMetaData: any = {
  ObjectType: 'DeviceInfo',
  IsSimulatedDevice: 0,
  Version: '1.0',
  DeviceProperties: {
    DeviceID: deviceId,
    HubEnabledState: 1,
    CreatedTime: '2015-09-21T20:28:55.5448990Z',
    DeviceState: 'normal',
    UpdatedTime: null,
    Manufacturer: 'Contoso Inc.',
    ModelNumber: 'MD-909',
    SerialNumber: 'SER9090',
    FirmwareVersion: '1.10',
    Platform: 'node.js',
    Processor: 'ARM',
    InstalledRAM: '64 MB',
    Latitude: 47.617025,
    Longitude: -122.191285,
  },
  Commands: [
    {
      Name: 'SetTemperature',
      Parameters: [
        {
          Name: 'Temperature',
          Type: 'double',
        },
      ],
    },
    {
      Name: 'SetHumidity',
      Parameters: [
        {
          Name: 'Humidity',
          Type: 'double',
        },
      ],
    },
  ],
};

client.open(function (err?: Error): void {
  if (err) {
    printErrorFor('open error:')(err);
  } else {
    console.log('Sending device metadata:\n' + JSON.stringify(deviceMetaData));
    client.sendEvent(
      new Message(JSON.stringify(deviceMetaData)),
      printErrorFor('send metadata')
    );

    client.on('message', function (msg: any): void {
      console.log('receive data: ' + msg.getData());

      try {
        const command: any = JSON.parse(msg.getData());

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
    const sendInterval: NodeJS.Timer = setInterval(function (): void {
      temperature += generateRandomIncrement();
      externalTemperature += generateRandomIncrement();
      humidity += generateRandomIncrement();

      const data: string = JSON.stringify({
        DeviceID: deviceId,
        Temperature: temperature,
        Humidity: humidity,
        ExternalTemperature: externalTemperature,
      });

      console.log('Sending device event data:\n' + data);
      client.sendEvent(new Message(data), printErrorFor('send event'));
    }, 1000);

    client.on('error', function (err: Error): void {
      printErrorFor('client')(err);

      if (sendInterval) clearInterval(sendInterval);
      client.close(printErrorFor('client.close'));
    });
  }
});
