/* eslint-disable security/detect-non-literal-fs-filename */
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

"use strict";

const debug = require("debug")("device");
const Protocol = require("azure-iot-device-mqtt").Mqtt;
const Client = require("azure-iot-device").Client;
const fs = require("fs");

const deviceConnectionString =
  "HostName=localhost;DeviceId=alpha;SharedAccessKey=FakeAccessKey";
const Message = require("azure-iot-device").Message;

const filePath = "dataOutput.log";

let sendInterval;
let responseTime = {};
let messageNumber = 0;
let keepaliveValue = 20; // keepalive value in seconds

function disconnectHandler() {
  debug("disconnectHandler");
  clearInterval(sendInterval);
  // client.removeAllListeners();
  client.open().catch((err) => {
    console.error(err.message);
  });
}

function messageHandler(msg) {
  debug(`Id: ${msg.messageId} Body: ${msg.data}`);
  client.complete(msg, printResultFor("completed"));
}

function generateMessage() {
  const message = new Message(
    JSON.stringify({ temperature: Math.random() * 100 })
  );
  return message;
}

function errorCallback(err) {
  debug("errorCallback");
  console.error(err.message);
  client.open().catch((err) => {
    console.error("Could not connect: " + err.message);
  });
}

function connectCallback() {
  debug("device connected");
  // setInterval(() => {
  //   const message = generateMessage();
  //   client.sendEvent(message, (e) => {
  //     if (e) {
  //       console.error('Error on sendEvent: ', e);
  //     } else {
  //       debug('Message sent successfully')
  //     }
  //   })
  // }, 2000);
}

// fromConnectionString must specify a transport constructor, coming from any transport package.
let client = Client.fromConnectionString(deviceConnectionString, Protocol);
client.setOptions({ keepalive: keepaliveValue });
client.on("connect", connectCallback);
client.on("error", errorCallback);
client.on("disconnect", disconnectHandler);
client.on("message", messageHandler);

client.open().catch((err) => {
  console.error("Could not connect: " + err.message);
});

// Helper function to print results in the console
function logResultFor(op, messageNumber) {
  return function printResult(err, res) {
    if (err) debug(`${op} error: ${err.toString()}\n`);
    if (res) {
      responseTime[messageNumber] = new Date().getTime();
      const metrics = {
        messageNumber: messageNumber,
        responseTime: responseTime[messageNumber],
      };
      fs.appendFile(filePath, JSON.stringify(metrics) + "\n", function (err) {
        if (err) throw err;
        debug("file written!");
      });
      process.send({
        messageNumber: messageNumber,
        responseTime: responseTime[messageNumber],
      });
      debug(`${op} status: ${res.constructor.name}\n`);
    }
  };
}

function printResultFor(op) {
  return function printResult(err, res) {
    if (err) debug(`${op} error: ${err.toString()}\n`);
    if (res) {
      debug(`${op} status: ${res.constructor.name}\n`);
      process.send({ messageAckedOnDevice: true });
    }
  };
}

process.on("SIGINT", () => {
  process.exit();
});

process.on("message", (m) => {
  debug("message received on child ", m);
  if (m["sendPingMessage"]) {
    const message = generateMessage();
    client.sendEvent(message, printResultFor("send"));
  } else if (m["sendMessages"]) {
    for (let i = 0; i < m.sendMessages; i++) {
      debug("sending message ", messageNumber);
      const message = generateMessage();
      debug(`Sending message: ${message.getData()}`);
      responseTime[messageNumber] = new Date().getTime();
      client.sendEvent(message, logResultFor("send", messageNumber));
      messageNumber++;
    }
  } else if (m["setKeepAlive"]) {
    debug("setting keepalive ", m.setKeepAlive);
    keepaliveValue = m.setKeepAlive;
  }
});
