// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;
var AmqpReceiver = require('../lib/amqp_receiver.js').AmqpReceiver;
var Message = require('azure-iot-common').Message;

describe('AmqpReceiver', function () {
  var fakeConfig = {
    deviceId: 'fakeDeviceId'
  };

  var fakeAmqpReceiver, fakeAmqpClient, fakeMethodClient;

  beforeEach(function() {
    fakeAmqpReceiver = {
      complete: sinon.spy(),
      reject: sinon.spy(),
      abandon: sinon.spy(),
      on: sinon.spy(),
      removeListener: sinon.spy(),
      listeners: sinon.stub().returns([])
    };

    fakeAmqpClient = {
      getReceiver: function(ep, callback) {
        assert.strictEqual(ep, '/devices/' + fakeConfig.deviceId + '/messages/devicebound');
        callback(null, fakeAmqpReceiver);
      }
    };

    fakeMethodClient = {
      on: sinon.spy(),
      onDeviceMethod: sinon.spy()
    };
  });

  afterEach(function() {
    fakeAmqpReceiver = null;
    fakeAmqpClient = null;
    fakeMethodClient = null;
  });

  describe('#constructor', function() {
    /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_001: [The `AmqpReceiver` constructor shall initialize a new instance of an `AmqpReceiver` object.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_002: [The `AmqpReceiver` object shall inherit from the `EventEmitter` node object.]*/
    it('Initializes a new instance of an AmqpReceiver object', function() {
      assert.doesNotThrow(function() {
        var recv = new AmqpReceiver(fakeConfig, fakeAmqpClient, fakeMethodClient);
        assert.instanceOf(recv, AmqpReceiver);
        assert.instanceOf(recv, EventEmitter);
      });
    });
  });

  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_003: [The `AmqpReceiver` shall forward any new listener of the `message` event to the underlying amqp message receiver.]*/
  describe('#on(\'message\', callback)', function() {
    it('forwards listeners of the message event to the underlying AMQP receiver object', function() {
      var recv = new AmqpReceiver(fakeConfig, fakeAmqpClient, fakeMethodClient);
      var fakeCallback = function() {};
      recv.on('message', fakeCallback);
      assert(fakeAmqpReceiver.on.calledWith('message', fakeCallback));
    });

    it('subscribes to the errorReceived event if the first time the message listener is attached', function() {
      var recv = new AmqpReceiver(fakeConfig, fakeAmqpClient, fakeMethodClient);
      var fakeCallback = function() {};
      recv.on('message', fakeCallback);
      assert(fakeAmqpReceiver.on.calledWith('errorReceived'));
      recv.on('message', fakeCallback);
      assert.strictEqual(fakeAmqpReceiver.on.callCount, 3); // 2 times fo the messages, once for errorReceived
    });

    it('forwards the errorReceived events once set up', function(testCallback) {
      var fakeReceiver = new EventEmitter();
      var fakeAmqpClient = {
        getReceiver: function(ep, callback) {
          callback(null, fakeReceiver);
        }
      };
      var fakeError = new Error('fake error');
      var recv = new AmqpReceiver(fakeConfig, fakeAmqpClient, fakeMethodClient);
      var fakeCallback = function() {};
      recv.on('message', fakeCallback);
      recv.on('errorReceived', function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
      fakeReceiver.emit('errorReceived', fakeError);
    });
  });

  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_008: [The `AmqpReceiver` shall remove any listener of its `message` event from the underlying amqp message receiver.]*/
  describe('#removeListener(\'message\', callback)', function() {
    it('removes the listener on the underlying AMQP receiver', function() {
      var recv = new AmqpReceiver(fakeConfig, fakeAmqpClient, fakeMethodClient);
      var fakeCallback = function() {};
      recv.on('message', fakeCallback);
      recv.removeListener('message', fakeCallback);
      assert.isTrue(fakeAmqpReceiver.removeListener.calledWith('message'));
    });

    it('removes the errorReceived listener if no one is listening to message events', function() {
      var fakeReceiver = new EventEmitter();
      var fakeAmqpClient = {
        getReceiver: function(ep, callback) {
          callback(null, fakeReceiver);
        }
      };
      var recv = new AmqpReceiver(fakeConfig, fakeAmqpClient, fakeMethodClient);
      var fakeCallback1 = function() {};
      var fakeCallback2 = function() {};
      assert.strictEqual(fakeReceiver.listeners('errorReceived').length, 0);
      recv.on('message', fakeCallback1);
      assert.strictEqual(fakeReceiver.listeners('errorReceived').length, 1);
      recv.on('message', fakeCallback2);
      assert.strictEqual(fakeReceiver.listeners('errorReceived').length, 1);
      recv.removeListener('message', fakeCallback1);
      assert.strictEqual(fakeReceiver.listeners('errorReceived').length, 1);
      recv.removeListener('message', fakeCallback2);
      assert.strictEqual(fakeReceiver.listeners('errorReceived').length, 0);
    });
  });

  describe('#on(<others>, callback)', function() {
    it('does not forward event listeners other than message and errorReceived of the message event to the underlying AMQP receiver', function() {
      var recv = new AmqpReceiver(fakeConfig, fakeAmqpClient, fakeMethodClient);
      var fakeCallback = function() {};
      recv.on('foo', fakeCallback);
      assert(fakeAmqpReceiver.on.notCalled);
    });
  });

  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_004: [The `complete` method shall forward the `message` and `callback` arguments to the underlying message receiver.]*/
  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_005: [The `reject` method shall forward the `message` and `callback` arguments to the underlying message receiver.]*/
  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_006: [The `abandon` method shall forward the `message` and `callback` arguments to the underlying message receiver.]*/
  ['complete', 'abandon', 'reject'].forEach(function (methodName) {
    describe('#' + methodName, function() {
      it('forwards the message and callback arguments to the underlying message receiver', function() {
        var recv = new AmqpReceiver(fakeConfig, fakeAmqpClient, fakeMethodClient);
        var fakeCallback = function() {};
        var fakeMessage = new Message('foo');
        recv[methodName](fakeMessage, fakeCallback);
        assert(fakeAmqpReceiver[methodName].calledWith(fakeMessage, fakeCallback));
      });
    });
  });

  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_007: [The `onDeviceMethod` method shall forward the `methodName` and `methodCallback` arguments to the underlying `Amqp[DeviceMethodClient` object.]*/
  describe('#onDeviceMethod', function() {
    it('forwards the message and callback arguments to the underlying message receiver', function() {
      var recv = new AmqpReceiver(fakeConfig, fakeAmqpClient, fakeMethodClient);
      var fakeCallback = function() {};
      var fakeMethodName = 'fakeMethodName';
      recv.onDeviceMethod(fakeMethodName, fakeCallback);
      assert(fakeMethodClient.onDeviceMethod.calledWith(fakeMethodName, fakeCallback));
    });

    it('forwards the errorReceived event if an error is received from a device method link', function(testCallback) {
      var fakeMethodClient = new EventEmitter();
      var recv = new AmqpReceiver(fakeConfig, fakeAmqpClient, fakeMethodClient);
      var fakeError = new Error('fake error');
      var fakeCallback = function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      };
      recv.on('errorReceived', fakeCallback);
      fakeMethodClient.emit('errorReceived', fakeError);
    });
  });
});