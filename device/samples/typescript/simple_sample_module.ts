/* eslint-disable security/detect-non-literal-fs-filename */
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// Choose a protocol by uncommenting one of these transports.
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';

import { ModuleClient, Message } from 'azure-iot-device';

ModuleClient.fromEnvironment(
  Protocol,
  function (err?: Error, client?: ModuleClient): void {
    if (err || !client) {
      console.error('Could not create client: ' + ((err) ? (err.toString()) : ('no client returned')));
      process.exit(-1);
    } else {
      console.log('got client');

      client.on('error', function (err: Error): void {
        console.error(err.message);
      });

      client.open(function (err?: Error): void {
        if (err) {
          console.error('Could not connect: ' + err.message);
        } else {
          console.log('Client connected');

          // Act on input messages to the module.
          client.on(
            'inputMessage',
            function (inputName: string, msg: any): void {
              client.complete(msg, printResultFor('completed'));

              if (inputName === 'deviceControl') {
                const messageBody = JSON.parse(msg.getBytes.toString('ascii'));
                console.log(
                  'deviceControl message received: enable = ' +
                    messageBody.enabled
                );
              } else {
                console.log(
                  'unknown inputMessage received on input ' + inputName
                );
                console.log(msg.getBytes.toString('ascii'));
              }
            }
          );

          // Create a message and send it every two seconds
          setInterval(function (): void {
            const temperature = 20 + Math.random() * 10; // range: [20, 30]
            const temperatureAlert = temperature > 28 ? 'true' : 'false';
            const data = JSON.stringify({
              deviceId: 'myFirstDevice',
              temperature: temperature,
              temperatureAlert: temperatureAlert,
            });
            const message = new Message(data);
            console.log('Sending message: ' + message.getData());
            client.sendOutputEvent(
              'temperature',
              message,
              printResultFor('sendOutputEvent')
            );
          }, 2000);
        }
      });
    }
  }
);

// Helper function to print results in the console
function printResultFor(op: any): (err?: Error, res?: any) => void {
  return function printResult(err?: Error, res?: any): void {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}
