'use strict';

const Protocol = require('azure-iot-device-mqtt').MqttWs;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;

const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING;
let sendInterval = 0;

function connectHandler () {
  console.log('+Client connected');
  if (!sendInterval) {
    sendMessage();
    // const time = 5 * 1000;
    // sendInterval = setInterval(sendMessage, time);
  }
  console.log('-Client connected');
}

function disconnectHandler () {
  console.log('+Client disconnected');
  client.open().catch((err) => {
    console.error(err.message);
  });
  console.log('-Client disconnected');
}

function messageHandler (msg) {
  console.log('+Client onMessage');
  console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
  client.complete(msg, printResultFor('completed'));
  console.log('-Client onMessage');
}

async function errorHandler (err) {
  console.log('+Client error');
  console.error(err.message);
  console.log('calling DeviceClient.close()');
  await client.close();
  console.log('returned from DeviceClient.closed');
  console.log('-Client error');
}

function sendMessage() {
  // SET A BREAKPOINT AT HERE.
  // ONCE YOU GET BREAK INTO THE DEBUGGER. DISCONNECT NETWORK CABLE AND GO.
  console.log('Please unplug network cable from your device to simulate disconnection');
  const message = generateMessage();
  console.log('Sending message: ' + message.getData());
  client.sendEvent(message, printResultFor('send'));
}

function generateMessage () {
  const windSpeed = 10 + (Math.random() * 4); // range: [10, 14]
  const temperature = 20 + (Math.random() * 10); // range: [20, 30]
  const humidity = 60 + (Math.random() * 20); // range: [60, 80]
  const data = JSON.stringify({ deviceId: 'myFirstDevice', windSpeed: windSpeed, temperature: temperature, humidity: humidity });
  const message = new Message(data);
  message.properties.add('temperatureAlert', (temperature > 28) ? 'true' : 'false');
  return message;
}

// fromConnectionString must specify a transport constructor, coming from any transport package.
let client = Client.fromConnectionString(deviceConnectionString, Protocol);

client.on('connect', connectHandler);
client.on('error', errorHandler);
client.on('disconnect', disconnectHandler);
client.on('message', messageHandler);

client.open()
.catch(err => {
  console.error('Could not connect: ' + err.message);
});


// Helper function to print results in the console
function printResultFor(op) {
  return async function printResult(err, res) {
    if (err) console.log(op + ' status: ' + err.constructor.name);
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}