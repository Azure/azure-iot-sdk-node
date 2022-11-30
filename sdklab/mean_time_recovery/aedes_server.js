// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// This is all fairly simple MQTT broker code. Even the extra event handlers are not necessary beyond giving some debugs. All it's doing is acting as a dumb broker that receives and acknowledges packets.

"use strict";

const fs = require("fs");
const aedes = require("aedes")();
const debug = require("debug")("aedes_server");

const port = 8883;

const options = {
  key: fs.readFileSync("./key.pem"),
  cert: fs.readFileSync("./certificate.pem"),
};

const server = require("tls").createServer(options, aedes.handle);

server.listen(port, function () {
  debug(`server started and listening on port ${port}`);
});

aedes.on("clientError", function (client, err) {
  debug("client error", client.id, err.message, err.stack);
});

aedes.on("connectionError", function (client, err) {
  debug("client error", client, err.message, err.stack);
});

aedes.on("publish", function (packet, client) {
  if (packet && packet.payload) {
    debug(`publish packet: ${packet.payload.toString()}`);
  }
  if (client) {
    debug(`message from client ${client.id}`);
  }
});

aedes.on("subscribe", function (subscriptions, client) {
  if (client) {
    debug(
      `subscribe from client ${JSON.stringify(subscriptions)} ${client.id}`
    );
  }
});

aedes.on("client", function (client) {
  debug(`new client ${client.id}`);
});
