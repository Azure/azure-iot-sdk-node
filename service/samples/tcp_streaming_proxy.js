// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var websocket = require('websocket-stream')
var ServiceClient = require('azure-iothub').Client;
var net = require('net');

var streamInit = {
  streamName: 'TestStream',
  contentType: 'text/plain',
  contentEncoding: 'utf-8',
  connectTimeoutInSeconds: 30,
  responseTimeoutInSeconds: 30,
  payload: undefined
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
    console.log('Got websocket - creating local server on port ' + process.env.PROXY_PORT);
    var proxyServer = net.createServer(function (socket) {
      socket.on('end', function () {
        console.log('client disconnected');
        process.exit(0);
      })

      socket.pipe(ws);
      ws.pipe(socket);
    });

    proxyServer.on('error', function (err) {
      console.error('error on the proxy server socket: ' + err.toString());
      process.exit(-1);
    })

    proxyServer.listen(process.env.PROXY_PORT, function () {
      console.log('listening on port: ' + process.env.PROXY_PORT + '...');
    })
  }
});