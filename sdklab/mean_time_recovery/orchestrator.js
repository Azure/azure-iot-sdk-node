// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

"use strict";

// eslint-disable-next-line security/detect-child-process
const { fork } = require("child_process");
const fs = require("fs");
const debug = require("debug")("orchestrator");
fs.createWriteStream("dataOutput.log"); // this just clears the file essentially...

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  let childServer;
  let childDevice;

  function deviceReceiveMessage() {
    // This returns a promise to wait on the response by the device, by setting up a
    // listener on the childDevice process. The childDevice should send a message to
    // the orchestrator when its message has been acked, so once the message is received the promise will be resolved.
    return new Promise((res, rej) => {
      const callback = (m) => {
        debug("in the deviceReceiveMessage callback");
        if (m.responseTime) {
          res(m);
        }
      };
      childDevice.on("message", callback);
      setTimeout(() => { //DevSkim: reviewed DS172411 on 2022-11-30
        childDevice.removeListener("message", callback);
        rej();
      }, 5000);
    });
  }

  function haveDeviceSendTestMessageToBroker(childDevice) {
    // this tells the device that it should send a message to the broker, just to make
    // sure they're both working. If there is no response from the broker,
    // then this should timeout and reject the promise.
    return new Promise((res, rej) => {
      const callback = (m) => {
        debug(`PARENT got message from childDevice: ${JSON.stringify(m)}`);
        if (m.messageAckedOnDevice) {
          debug("resolving promise");
          res();
        }
      };
      childDevice.on("message", callback);
      childDevice.send({ sendPingMessage: true });
      setTimeout(() => { //DevSkim: reviewed DS172411 on 2022-11-30
        childDevice.removeListener("message", callback);
        rej();
      }, 5000);
    });
  }

  function setupChildServer() {
    const childServer = fork("aedes_server.js");
    childServer.on("error", (code) => {
      debug(`childServer error ${code}`);
    });
    childServer.on("close", (code) => {
      debug(`childServer closed with code ${code}`);
    });
    return childServer;
  }

  function setupChildDevice() {
    const childDevice = fork("device.js");
    childDevice.on("close", (code) => {
      debug(`childDevice closed with code ${code}`);
    });

    childDevice.on("message", (m) => {
      debug(`PARENT got message from childDevice: ${JSON.stringify(m)}`);
    });

    const childDeviceKeepAlive = 20;
    debug("setting keepAlive on childDevice to", childDeviceKeepAlive);
    childDevice.send({ setKeepAlive: childDeviceKeepAlive }); // set the keepAlive on the Device
    return childDevice;
  }

  childServer = setupChildServer();

  await wait(500);

  childDevice = setupChildDevice();

  await wait(500);

  for (let i = 0; i < 5; i++) {
    debug("have device send message to server to ensure connection");
    await haveDeviceSendTestMessageToBroker(childDevice);
    debug("killing childServer");
    childServer.kill();
    debug("initiate sendEvent on childDevice");
    childDevice.send({ sendMessages: 1 });
    debug("waiting for 10 seconds");
    await wait(10 * 1000); // wait for 10 seconds
    debug("restarting server");
    const responseTimePromise = deviceReceiveMessage();
    childServer = fork("aedes_server.js");
    childServer.on("close", (code) => {
      debug(`childServer closed with code ${code}`);
    });
    const timeServerBackOnline = new Date().getTime();
    const fulfilled = await responseTimePromise;
    debug(fulfilled);
    const metrics = {
      messageNumber: fulfilled.messageNumber,
      responseTime: fulfilled.responseTime - timeServerBackOnline,
    };
    fs.appendFile("dataOutput.log", JSON.stringify(metrics) + "\n", function (
      err
    ) {
      if (err) throw err;
      debug("file written!");
    });
    await wait(5 * 1000); // some time for things to reset between iterations.
  }
}

if (typeof require !== "undefined" && require.main === module) {
  main();
}
