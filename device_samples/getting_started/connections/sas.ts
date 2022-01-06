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
const logRed: string = '\x1b[31m%s\x1b[0m';

// make sure we have a connection string before we can continue
if (sas === '' || sas === undefined) {
  console.error(logRed, 'Missing Shared Access Signature (SAS)');
  process.exit(0);
}

// fromSharedAccessSignature must specify a transport constructor, coming from any transport package.
const client: Client = Client.fromSharedAccessSignature(sas, Protocol);
const message: Message = new Message(JSON.stringify({ deviceId: 'my-first-device', temperature: 20 + Math.random() * 10, }));

// open client connection
client.open().catch((err: Error) => {
  console.error(logRed, 'Could not connect: ' + err.message);
  process.exit(0);
});
console.log('Client connection: Open');

// send a messge
console.log('Sending message: ' + message.getData());
client.sendEvent(message, printResultFor('Send'));

// close client connection
client.close().catch((err: Error) => {
  console.error(logRed, 'Could not close connection: ' + err.message);
});
console.log("Client connection: Closed");

// exit process
process.exit(0);

// helper function to print results in the console
function printResultFor(op: any): (err: any, res: any) => void {
  return function printResult(err: any, res: any): void {
    if (err) console.log(logRed, op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}

