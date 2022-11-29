/* eslint-disable security/detect-non-literal-fs-filename */
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// Choose a protocol by uncommenting one of these transports.
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';

import { Client } from 'azure-iot-device';

let client: Client;

function main(): void {
  // open a connection to the device
  const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING || '';

  if (deviceConnectionString === '') {
    console.log('device connection string has not been set');
    process.exit(-1);
  }

  client = Client.fromConnectionString(deviceConnectionString, Protocol);
  client.open(onConnect);
}

function onConnect(err?: Error, _result1?: any): void {
  if (err) {
    console.error('Could not connect: ' + err.message);
  } else {
    console.log('Connected to device. Registering handlers for methods.');

    // register handlers for all the method names we are interested in
    client.onDeviceMethod('getDeviceLog', onGetDeviceLog);
    client.onDeviceMethod('lockDoor', onLockDoor);
  }
}

function onGetDeviceLog(request: any, response: any): void {
  printDeviceMethodRequest(request);

  // Implement actual logic here.

  // complete the response
  response.send(200, 'example payload', function (err: Error): void {
    if (err) {
      console.error('An error ocurred when sending a method response:\n' + err.toString());
    } else {
      console.log('Response to method "%s" sent successfully.', request.methodName);
    }
  });
}

function onLockDoor(request: any, response: any): void {
  printDeviceMethodRequest(request);

  // Implement actual logic here.

  // complete the response
  response.send(200, function (err: Error): void {
    if (err) {
      console.error('An error ocurred when sending a method response:\n' + err.toString());
    } else {
      console.log('Response to method "%s" sent successfully.', request.methodName);
    }
  });
}

function printDeviceMethodRequest(request: any): void {
  // print method name
  console.log('Received method call for method "%s"', request.methodName);

  // if there's a payload just do a default console log on it
  if (request.payload) {
    console.log('Payload:\n' + request.payload);
  }
}

// get the app rolling
main();
