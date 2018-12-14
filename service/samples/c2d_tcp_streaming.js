// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var websocket = require('websocket-stream')
var ServiceClient = require('azure-iothub').Client;

var streamInit = {
  streamName: 'TestStream',
  connectTimeoutInSeconds: 30,
  responseTimeoutInSeconds: 30,
}

var client = ServiceClient.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);

console.log('initiating stream');
client.initiateStream(process.env.STREAMING_TARGET_DEVICE, streamInit, function(err, result) {
  if (err) {
    console.error(err.toString());
    process.exit(-1);
  } else {
    console.log(JSON.stringify(result, null, 2));

    var ws = websocket(result.uri, { headers: { 'Authorization': 'Bearer ' + result.authorizationToken} });
    process.stdin.pipe(ws);
    ws.pipe(process.stdout);
  }
});