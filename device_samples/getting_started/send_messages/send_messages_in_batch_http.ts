// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { clientFromConnectionString } from 'azure-iot-device-http';
import { Client, Message } from 'azure-iot-device';

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
const deviceConnectionString: string = process.env.IOTHUB_DEVICE_CONNECTION_STRING ?? '';
const logRed: string = '\x1b[31m%s\x1b[0m';

// make sure we have a connection string before we can continue
if (deviceConnectionString === '' || deviceConnectionString === undefined) {
  console.error(logRed, 'Missing device connection string');
  process.exit(0);
}

const client: Client = clientFromConnectionString(deviceConnectionString);

// Create three messages to send to IoT hub as a batch.
const messages: Message[] = [
  new Message(JSON.stringify("message one")),
  new Message(JSON.stringify("message two")),
  new Message(JSON.stringify("message three")),
];

console.log('Sending ' + messages.length + ' events in a batch');
client.sendEventBatch(messages, printResultFor('Send'));

function printResultFor(op: any): (err: any, res: any) => void {
  return function printResult(err: any, res: any): void {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.transportObj.statusCode + ' ' + res.transportObj.statusMessage);
  };
}
