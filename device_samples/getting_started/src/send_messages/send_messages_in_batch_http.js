// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const clientFromConnectionString = require('azure-iot-device-http').clientFromConnectionString;
const Message = require('azure-iot-device').Message;

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING;

// make sure we have a connection string before we can continue
if (deviceConnectionString === null || deviceConnectionString === undefined) {
  console.error('\x1b[31m%s\x1b[0m', 'Missing device connection string');
  process.exit(0);
}

const client = clientFromConnectionString(deviceConnectionString);

// Create two messages and send them to the IoT hub as a batch.
const data = [
  { id: 1, message: 'message one' },
  { id: 2, message: 'message two' },
  { id: 2, message: 'message three' }
];

let messages = [];

data.forEach(function (value) {
  messages.push(new Message(JSON.stringify(value)));
});

console.log('Sending ' + messages.length + ' events in a batch');
client.sendEventBatch(messages, (err, res) => {
  if (res) console.log('Send status: ' + res.constructor.name); 
  if (err) console.log('\x1b[31m%s\x1b[0m', op + ' error: ' + err.toString());
  process.exit(0);
});