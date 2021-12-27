// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// Choose a protocol by uncommenting one of these transports.
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';

import { Client, Message } from 'azure-iot-device';

// String SharedAccessSignature in the following formats:
//  "SharedAccessSignature sr=<iothub_host_name>/devices/<device_id>&sig=<signature>&se=<expiry>"
const sas: string = process.env.IOTHUB_SAS || '';

// make sure we have a connection string before we can continue
if (sas === '' || sas === undefined) {
  console.error('\x1b[31m%s\x1b[0m', 'Missing Shared Access Signature (SAS)');
  process.exit(0);
}

function generateMessage() {
  const data: string = JSON.stringify({
    deviceId: 'my-first-device',
    temperature: 20 + Math.random() * 10,
  });
  return new Message(data);
}

// fromSharedAccessSignature must specify a transport constructor, coming from any transport package.
const client: Client = Client.fromSharedAccessSignature(sas, Protocol);
const message: Message = generateMessage();

// open client connection
client.open().catch((err: Error) => {
  console.error('\x1b[31m%s\x1b[0m', 'Could not connect: ' + err.message);
  process.exit(0);
});
console.log('Client connection: Open');

// send a messge
console.log('Sending message: ' + message.getData());
client.sendEvent(message, printResultFor('Send'));

// close client connection
client.close().catch((err: Error) => {
  console.error('\x1b[31m%s\x1b[0m', 'Could not close connection: ' + err.message);
});
console.log("Client connection: Closed");

// exit process
process.exit(0);

// helper function to print results in the console
function printResultFor(op: any): (err: any, res: any) => void {
  return function printResult(err: any, res: any): void {
    if (err) console.log('\x1b[31m%s\x1b[0m', op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}

