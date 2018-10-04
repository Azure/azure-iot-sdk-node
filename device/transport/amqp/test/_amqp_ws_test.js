// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Amqp = require('../lib/amqp.js').Amqp;
var AmqpWs = require('../lib/amqp_ws.js').AmqpWs;
var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;

describe('AmqpWs', function () {
  describe('#constructor', function () {
    it ('extends AMQP', function () {
      var amqpWs = new AmqpWs(new EventEmitter());
      assert.instanceOf(amqpWs, AmqpWs);
      assert.instanceOf(amqpWs, Amqp);
    });
  });

  describe('_getConnectionUri', function () {
    it('generates a websocket URI for the hub', function () {
      var amqpWs = new AmqpWs(new EventEmitter());
      var testConfig = {
        host: 'host.name',
      };

      assert.strictEqual(amqpWs._getConnectionUri(testConfig), 'wss://host.name:443/$iothub/websocket');
    });
  });
});