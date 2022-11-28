// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Amqp = require('../dist/amqp.js').Amqp;
const AmqpWs = require('../dist/amqp_ws.js').AmqpWs;
const EventEmitter = require('events').EventEmitter;
const assert = require('chai').assert;

describe('AmqpWs', function () {
  describe('#constructor', function () {
    it ('extends AMQP', function () {
      const amqpWs = new AmqpWs(new EventEmitter());
      assert.instanceOf(amqpWs, AmqpWs);
      assert.instanceOf(amqpWs, Amqp);
    });
  });

  describe('_getConnectionUri', function () {
    it('generates a websocket URI for the hub', function () {
      const amqpWs = new AmqpWs(new EventEmitter());
      const testConfig = {
        host: 'host.name',
      };

      assert.strictEqual(amqpWs._getConnectionUri(testConfig), 'wss://host.name:443/$iothub/websocket');
    });
  });
});
