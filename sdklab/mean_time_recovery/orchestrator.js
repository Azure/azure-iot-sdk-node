// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

"use strict";

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
  let childServer, childDevice;

  function deviceReceiveMessage() {
    return new Promise((res, rej) => {
      const callback = (m) => {
        debug("in the deviceReceiveMessage callback");
        if (m.responseTime) {
          res(m);
        }
      };
      childDevice.on("message", callback);
      setTimeout(() => {
        childDevice.removeListener("message", callback);
        rej();
      }, 5000);
    });
  }

  childServer = fork("aedes_server.js");

  childServer.on("error", (code) => {
    debug(`childServer error ${code}`);
  });

  childServer.on("close", (code) => {
    debug(`childServer closed with code ${code}`);
  });

  wait(1000);

  childDevice = fork("device.js");
  childDevice.on("close", (code) => {
    debug(`childDevice closed with code ${code}`);
  });

  childDevice.on("message", (m) => {
    debug(`PARENT got message from childDevice: ${JSON.stringify(m)}`);
  });

  childDevice.send({ setKeepAlive: 20 }); // set the keepAlive on the Device
  await wait(500);

  for (let i = 0; i < 3; i++) {
    debug("have device send message to server to ensure connection");
    await new Promise((res, rej) => {
      debug("in the promise");
      const callback = (m) => {
        debug(`PARENT got message from childDevice: ${JSON.stringify(m)}`);
        if (m.messageAckedOnDevice) {
          debug("resolving promise");
          res();
        }
      };
      childDevice.on("message", callback);
      childDevice.send({ sendPingMessage: true });
      setTimeout(() => {
        childDevice.removeListener("message", callback);
        rej();
      }, 5000);
    }); // wait for 1 seconds
    debug("killing childServer");
    childServer.kill();
    debug("initiate sendEvent on childDevice");
    childDevice.send({ sendMessages: 1 });
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
    await wait(5 * 1000); // wait for 5 seconds
  }
}

if (typeof require !== "undefined" && require.main === module) {
  main();
}
