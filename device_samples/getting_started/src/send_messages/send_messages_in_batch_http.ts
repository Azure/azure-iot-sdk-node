// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { clientFromConnectionString } from 'azure-iot-device-http';
import { Client, Message } from 'azure-iot-device';

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
const deviceConnectionString: string = process.env.IOTHUB_DEVICE_CONNECTION_STRING || '';

// make sure we have a connection string before we can continue
if (deviceConnectionString === '' || deviceConnectionString === undefined) {
  console.error('\x1b[31m%s\x1b[0m', 'Missing device connection string');
  process.exit(0);
}

const client: Client = clientFromConnectionString(deviceConnectionString);

// Create two messages and send them to the IoT hub as a batch.
const data: { id: number; message: string }[] = [
  { id: 1, message: 'message one' },
  { id: 2, message: 'message two' },
  { id: 2, message: 'message three' }
];

const messages: any[] = [];

data.forEach(function (value: { id: number; message: string }): void {
  messages.push(new Message(JSON.stringify(value)));
});

console.log('Sending ' + messages.length + ' events in a batch');
client.sendEventBatch(messages, printResultFor('Send'));

function printResultFor(op: any): (err: any, res: any) => void {
  return function printResult(err: any, res: any): void {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.transportObj.statusCode + ' ' + res.transportObj.statusMessage);
  };
}
