// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const clientFromConnectionString = require('azure-iot-device-http').clientFromConnectionString;
const Message = require('azure-iot-device').Message;

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING ?? '';
const logRed = '\x1b[31m%s\x1b[0m';

// make sure we have a connection string before we can continue
if (deviceConnectionString === null || deviceConnectionString === undefined) {
  console.error(logRed, 'Missing device connection string');
  process.exit(0);
}

const client = clientFromConnectionString(deviceConnectionString);

// Create three messages to send to IoT hub as a batch.
const messages = [
  new Message(JSON.stringify("message one")),
  new Message(JSON.stringify("message two")),
  new Message(JSON.stringify("message three")),
];

console.log('Sending ' + messages.length + ' events in a batch');

client.sendEventBatch(messages, (err, res) => {
  if (res) console.log('Send status: ' + res.constructor.name); 
  if (err) console.log(logRed, op + ' error: ' + err.toString());
  process.exit(0);
});