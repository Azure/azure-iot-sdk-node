// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;
var AmqpReceiver = require('../lib/amqp.js').Amqp;
var Message = require('azure-iot-common').Message;

var FakeAmqp = require('./_fake_amqp.js').FakeAmqp;

describe('AmqpReceiver', function () {
  var fakeConfig = {
    deviceId: 'fakeDeviceId'
  };

  var fakeMethodClient;

  beforeEach(function() {
    fakeMethodClient = {
      on: sinon.spy(),
      onDeviceMethod: sinon.spy(),
      attach: sinon.stub().callsArg(0)
    };
  });

  afterEach(function() {
    fakeMethodClient = null;
  });

  describe('#constructor', function() {
    /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_001: [The `Amqp` constructor shall implement the `Receiver` interface.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_002: [The `Amqp` object shall inherit from the `EventEmitter` node object.]*/
    it('Initializes a new instance of an AmqpReceiver object', function() {
      assert.doesNotThrow(function() {
        var recv = new AmqpReceiver(fakeConfig);
        assert.instanceOf(recv, AmqpReceiver);
        assert.instanceOf(recv, EventEmitter);
      });
    });

    it('forwards the errorReceived event if an error is received from a device method link', function(testCallback) {
      var fakeMethodClient = new EventEmitter();
      var recv = new AmqpReceiver(fakeConfig);
      var fakeError = new Error('fake error');
      var fakeCallback = function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      };
      recv.on('errorReceived', fakeCallback);
      recv._deviceMethodClient.emit('error', fakeError);
    });
  });

  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_003: [The `Amqp` object shall listen to the `message` and error events of the underlying `ReceiverLink` object when it has listeners on its `message` event.]*/
  describe('#on(\'message\', callback)', function() {
    it('subscribes to the message and error events of the underlying AMQP SenderLink object', function() {
      var recv = new AmqpReceiver(fakeConfig);
      var fakeReceiverLink = new EventEmitter();
      sinon.spy(fakeReceiverLink, 'on');
      recv._amqp = new FakeAmqp();
      sinon.stub(recv._amqp, 'attachReceiverLink').callsArgWith(2, null, fakeReceiverLink);
      recv.on('message', function () {});
      assert(fakeReceiverLink.on.calledWith('message'));
      assert(fakeReceiverLink.on.calledWith('error'));
    });

    it('forwards \'message\' events to all listeners once set up', function (testCallback) {
      var recv1messageReceived = false;
      var recv2messageReceived = false;
      var testMessage = new Message('foo');
      var recv = new AmqpReceiver(fakeConfig);
      var fakeReceiverLink = new EventEmitter();
      recv._amqp = new FakeAmqp();
      sinon.stub(recv._amqp, 'attachReceiverLink').callsArgWith(2, null, fakeReceiverLink);
      recv.on('message', function (msg) {
        assert.strictEqual(msg, testMessage);
        recv1messageReceived = true;
        if (recv1messageReceived && recv2messageReceived) {
          testCallback();
        }
      });
      recv.on('message', function (msg) {
        assert.strictEqual(msg, testMessage);
        recv2messageReceived = true;
        if (recv1messageReceived && recv2messageReceived) {
          testCallback();
        }
      });

      fakeReceiverLink.emit('message', testMessage);
    });

    // skipped for now because the client cannot handle this. will reenable with the retry logic.
    it.skip('emits an errorReceived event if an error is received on the C2D link', function (testCallback) {
      var testError = new Error('test');
      var recv = new AmqpReceiver(fakeConfig);
      var fakeReceiverLink = new EventEmitter();
      recv._amqp = new FakeAmqp();
      sinon.stub(recv._amqp, 'attachReceiverLink').callsArgWith(2, null, fakeReceiverLink);
      recv.on('message', function (msg) {});
      recv.on('errorReceived', function (err) {
        assert.strictEqual(err, testError);
        testCallback();
      });

      fakeReceiverLink.emit('error', testError);
    });
  });

  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_008: [The `Amqp` object shall remove the listeners on `message` and `error` events of the underlying `ReceiverLink` when no-one is listening to its own `message` event.]*/
  describe('#removeListener(\'message\', callback)', function() {
    it('removes the \'message\' and \'error\' listeners and detaches the underlying AMQP receiver if no one is listening', function() {
      var recv = new AmqpReceiver(fakeConfig);
      var fakeReceiverLink = new EventEmitter();
      fakeReceiverLink.detach = sinon.stub().callsArg(0);
      sinon.stub(fakeReceiverLink, 'removeListener');
      recv._amqp = new FakeAmqp();
      sinon.stub(recv._amqp, 'attachReceiverLink').callsArgWith(2, null, fakeReceiverLink);
      var fakeCallback = function() {};
      recv.on('message', fakeCallback);
      recv.removeListener('message', fakeCallback);
      assert.isTrue(fakeReceiverLink.removeListener.calledWith('message'));
      assert.isTrue(fakeReceiverLink.removeListener.calledWith('error'));
      assert.isTrue(fakeReceiverLink.detach.calledOnce);
    });
  });

  describe('#on(<others>, callback)', function () {
    it('does not forward event listeners other than message and errorReceived of the message event to the underlying AMQP receiver', function () {
      var recv = new AmqpReceiver(fakeConfig);
      var fakeReceiverLink = new EventEmitter();
      sinon.spy(fakeReceiverLink, 'on');
      recv._amqp = new FakeAmqp();
      sinon.stub(recv._amqp, 'attachReceiverLink').callsArgWith(2, null, fakeReceiverLink);
      recv.on('foo', function () {});
      assert(fakeReceiverLink.on.notCalled);
      assert(recv._amqp.attachReceiverLink.notCalled);
    });
  });

  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_004: [The `complete` method shall forward the `message` argument to the underlying message receiver.]*/
  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_005: [The `reject` method shall forward the `message` argument to the underlying message receiver.]*/
  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_006: [The `abandon` method shall forward the `message` argument to the underlying message receiver.]*/
  ['complete', 'abandon', 'reject'].forEach(function (methodName) {
    describe('#' + methodName, function () {
      it('calls the underlying message receiver settlement method with the message argument', function(testCallback) {
        var recv = new AmqpReceiver(fakeConfig);
        var fakeReceiverLink = new EventEmitter();
        fakeReceiverLink[methodName] = sinon.stub().callsArg(1);
        sinon.stub(fakeReceiverLink, 'removeListener');
        recv._amqp = new FakeAmqp();
        sinon.stub(recv._amqp, 'attachReceiverLink').callsArgWith(2, null, fakeReceiverLink);
        var fakeMessage = new Message('foo');
        recv.on('message', function () {});
        recv[methodName](fakeMessage, function () {
          assert(fakeReceiverLink[methodName].calledWith(fakeMessage));
          testCallback();
        });
      });
    });
  });

  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_007: [The `onDeviceMethod` method shall forward the `methodName` and `methodCallback` arguments to the underlying `Amqp[DeviceMethodClient` object.]*/
  describe('#onDeviceMethod', function() {
    it('forwards the message and callback arguments to the underlying message receiver', function() {
      var recv = new AmqpReceiver(fakeConfig);
      sinon.spy(recv._deviceMethodClient, 'onDeviceMethod');
      var fakeCallback = function() {};
      var fakeMethodName = 'fakeMethodName';
      recv.onDeviceMethod(fakeMethodName, fakeCallback);
      assert(recv._deviceMethodClient.onDeviceMethod.calledWith(fakeMethodName, fakeCallback));
    });

    it('emits an errorReceived event with the error if the links fail to connect initially', function (testCallback) {
      var fakeMethodClient = new EventEmitter();
      var fakeError = new Error('fake error');
      var recv = new AmqpReceiver(fakeConfig);
      sinon.stub(recv._deviceMethodClient, 'onDeviceMethod');
      sinon.stub(recv._deviceMethodClient, 'attach').callsArgWith(0, fakeError);

      var fakeCallback = function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      };

      recv.on('errorReceived', fakeCallback);
      recv.onDeviceMethod('fakeMethod', function () {});
      recv._deviceMethodClient.emit('error', fakeError);
    });
  });
});