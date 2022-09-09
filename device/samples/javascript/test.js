'use strict';

const Protocol = require('azure-iot-device-mqtt').MqttWs;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const debug = require('debug');
debug.enable('*');

const deviceConnectionString = "HostName=vishnureddy-test-hub.azure-devices.net;DeviceId=vishnureddy-test;SharedAccessKey=DcpxkbpxNlG/Z8wEOEyZPpCIpTSwvj/MNHmaEE7elLo=";
const client = Client.fromConnectionString(deviceConnectionString, Protocol);


async function errorHandler(err) {
  console.log(`Entered errorHandler with err ${err}`);
  await client.close();
  console.log('Client closed');
}

async function disconnectHandler() {
  console.log('Entered disconnectHandler');
  await client.close();
  console.log('Client closed');
}

client.on('error', errorHandler);
client.on('disconnect', disconnectHandler);
client.on('message', () => {})
console.log('e')

// async function main() {
//   await client.open();
//   client._transport._mqtt._mqttClient.on('close', () => console.log('CLOSE FIRED'));
//   console.log('Client connected');
// }

// main().catch(err => {
//   console.error(err.message);
//   process.exit(1);
// })