// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var Registry = require('../lib/registry.js').Registry;
var AmqpWs = require('../lib/amqp_ws.js').AmqpWs;

var transportSpecificTests = require('./_client_common_testrun.js');
console.log('_client_test_integration SERVICE TEST ENV VALUE HAS HOSTNAME AT: ' + process.env.IOTHUB_CONNECTION_STRING.indexOf('HostName'));

describe('Over real AMQP (Default Transport)', function () {
  this.timeout(60000);
  var opts = {
    transport: null,
    connectionString: process.env.IOTHUB_CONNECTION_STRING,
    registry: Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING)
  };
  transportSpecificTests(opts);
});

describe('Over real AMQP over Websockets', function () {
  this.timeout(60000);
  var opts = {
    transport: AmqpWs,
    connectionString: process.env.IOTHUB_CONNECTION_STRING,
    registry: Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING)
  };
  transportSpecificTests(opts);
});
