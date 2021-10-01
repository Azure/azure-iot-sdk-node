// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { Client, Message } from 'azure-iot-device';
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';

// Uncomment one of these transports and then change it in fromConnectionString to test other transports
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';
// import { Amqp as Protocol } from 'azure-iot-device-amqp'
// import { Http as Protocol } from 'azure-iot-device-http';

// String SharedAccessSignature in the following formats:
// "SharedAccessSignature sr=<iothub_host_name>/devices/<device_id>&sig=<signature>&se=<expiry>"
const sas: string = process.env.IOTHUB_SAS || '';

if (sas === '') {
  console.log('device SharedAccessSignature string not set');
  process.exit(-1);
}

// fromSharedAccessSignature must specify a transport constructor, coming from any transport package.
const client: Client = Client.fromSharedAccessSignature(sas, Protocol);

let connectCallback = function (err: Error): void {
  if (err) {
    console.error('Could not connect: ' + err);
  } else {
    console.log('Client connected');
    client.on('message', function (msg: any): void {
      console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
      // When using MQTT the following line is a no-op.
      client.complete(msg, printResultFor('completed'));
      // The AMQP and HTTP transports also have the notion of completing, rejecting or abandoning the message.
      // When completing a message, the service that sent the C2D message is notified that the message has been processed.
      // When rejecting a message, the service that sent the C2D message is notified that the message won't be processed by the device. the method to use is client.reject(msg, callback).
      // When abandoning the message, IoT Hub will immediately try to resend it. The method to use is client.abandon(msg, callback).
      // MQTT is simpler: it accepts the message by default, and doesn't support rejecting or abandoning a message.
    });

    // Create a message and send it to the IoT Hub every second
    let sendInterval: NodeJS.Timer = setInterval(function (): void {
      let windSpeed: number = 10 + (Math.random() * 4); // range: [10, 14]
      let temperature: number = 20 + (Math.random() * 10); // range: [20, 30]
      let humidity: number = 60 + (Math.random() * 20); // range: [60, 80]
      let data: string = JSON.stringify({ deviceId: 'myFirstDevice', windSpeed: windSpeed, temperature: temperature, humidity: humidity });
      let message: Message = new Message(data);
      message.properties.add('temperatureAlert', (temperature > 28) ? 'true' : 'false');
      console.log('Sending message: ' + message.getData());
      client.sendEvent(message, printResultFor('send'));
    }, 2000);

    client.on('error', function (err: Error): void {
      console.error(err.message);
    });

    client.on('disconnect', function (): void {
      clearInterval(sendInterval);
      client.removeAllListeners();
      client.open(connectCallback);
    });
  }
};

client.open(connectCallback);

// Helper function to print results in the console
function printResultFor(op: any): (err: Error, res: any) => void {
  return function printResult(err: Error, res: any): void {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}
