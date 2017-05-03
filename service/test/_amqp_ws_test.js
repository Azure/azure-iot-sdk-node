// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var Amqp = require('../lib/amqp.js').Amqp;
var AmqpWs = require('../lib/amqp_ws.js').AmqpWs;
var assert = require('chai').assert;
var sinon = require('sinon');

describe('AmqpWs', function() {
  describe('#constructor', function() {
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_WS_16_002: [`AmqpWs` should inherit from `Amqp`.]*/
    it('inherits from `Amqp`', function() {
      var amqpWs = new AmqpWs({
        host: 'host',
        hubName: 'hubName',
        keyName: 'keyName',
        sharedAccessSignature: 'sas'
      });

      assert.instanceOf(amqpWs, Amqp);
    });
  });

  describe('#connect', function() {
    it('calls the connect method on the base AMQP object with the correct URL', function() {
      var testConfig = {
        host: 'host',
        hubName: 'hubName',
        keyName: 'keyName',
        sharedAccessSignature: 'sas'
      };

      var amqpWs = new AmqpWs(testConfig);

      sinon.spy(amqpWs._amqp, 'connect');
      amqpWs.connect(function(){});
      assert.strictEqual(amqpWs._amqp.connect.args[0][0].indexOf('wss://'), 0);
      assert(amqpWs._amqp.connect.args[0][0].indexOf('$iothub/websocket') > 0);
    });
  });
});
