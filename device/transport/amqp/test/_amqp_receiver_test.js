// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;
var AmqpReceiver = require('../lib/amqp.js').Amqp;
var AmqpMessage = require('azure-iot-amqp-base').AmqpMessage;
var Message = require('azure-iot-common').Message;
var errors = require('azure-iot-common').errors;

var FakeAmqp = require('./_fake_amqp.js').FakeAmqp;

describe('AmqpReceiver', function () {
  var fakeConfig = {
    deviceId: 'fakeDeviceId',
    sharedAccessSignature: 'SharedAccessSignature sr=bad&sig=XLU2ibNOYBbld3FpFIOHbPZv3Thp4wfK%2BcqZpJz66hE%3D&skn=keyName&se=1474440492'
  };

  var fakeMethodClient;
  var fakeAuthenticationProvider;
  var fakeAmqpBaseClient = {
    connect: sinon.stub().callsArg(1),
    setDisconnectHandler: sinon.stub(),
    initializeCBS: sinon.stub().callsArg(0),
    putToken: sinon.stub().callsArg(2)
  };

  beforeEach(function() {
    fakeMethodClient = {
      on: sinon.spy(),
      onDeviceMethod: sinon.spy(),
      attach: sinon.stub().callsArg(0)
    };

    fakeAuthenticationProvider = {
      getDeviceCredentials: function (callback) {
        callback(null, fakeConfig);
      },
      updateSharedAccessSignature: sinon.stub()
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
        var recv = new AmqpReceiver(fakeAuthenticationProvider);
        assert.instanceOf(recv, AmqpReceiver);
        assert.instanceOf(recv, EventEmitter);
      });
    });

    it('forwards the errorReceived event if an error is received from a device method link', function(testCallback) {
      var fakeMethodClient = new EventEmitter();
      var recv = new AmqpReceiver(fakeAuthenticationProvider, fakeAmqpBaseClient);
      var fakeError = new Error('fake error');
      var fakeCallback = function(err) {
        assert.strictEqual(err.innerError, fakeError);
        assert.instanceOf(err, errors.DeviceMethodsDetachedError);
        testCallback();
      };
      recv.connect(function () {
        recv.on('error', fakeCallback);
        recv._deviceMethodClient.emit('error', fakeError);
      });
    });
  });

  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_003: [The `Amqp` object shall listen to the `message` and error events of the underlying `ReceiverLink` object when it has listeners on its `message` event.]*/
  describe('#on(\'message\', callback)', function() {
    it('forwards \'message\' events to all listeners once set up', function (testCallback) {
      var recv1messageReceived = false;
      var recv2messageReceived = false;
      var testMessage = new AmqpMessage();
      var recv = new AmqpReceiver(fakeAuthenticationProvider);
      var fakeReceiverLink = new EventEmitter();
      recv._amqp = new FakeAmqp();
      sinon.stub(recv._amqp, 'attachReceiverLink').callsArgWith(2, null, fakeReceiverLink);
      recv.on('message', function (msg) {
        assert.instanceOf(msg, Message);
        assert.strictEqual(msg.transportObj, testMessage);
        recv1messageReceived = true;
        if (recv1messageReceived && recv2messageReceived) {
          testCallback();
        }
      });
      recv.on('message', function (msg) {
        assert.instanceOf(msg, Message);
        assert.strictEqual(msg.transportObj, testMessage);
        recv2messageReceived = true;
        if (recv1messageReceived && recv2messageReceived) {
          testCallback();
        }
      });

      recv.enableC2D(function () {
        fakeReceiverLink.emit('message', testMessage);
      });
    });

    it('emits an errorReceived event if an error is received on the C2D link', function (testCallback) {
      var testError = new Error('test');
      var recv = new AmqpReceiver(fakeAuthenticationProvider);
      var fakeReceiverLink = new EventEmitter();
      recv._amqp = new FakeAmqp();
      sinon.stub(recv._amqp, 'attachReceiverLink').callsArgWith(2, null, fakeReceiverLink);
      recv.on('message', function (msg) {});
      recv.on('error', function (err) {
        assert.strictEqual(err.innerError, testError);
        assert.instanceOf(err, errors.CloudToDeviceDetachedError);
        testCallback();
      });

      recv.enableC2D(function () {
        fakeReceiverLink.emit('error', testError);
      });
    });
  });

  describe('#on(<others>, callback)', function () {
    it('does not forward event listeners other than message and errorReceived of the message event to the underlying AMQP receiver', function () {
      var recv = new AmqpReceiver(fakeAuthenticationProvider);
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
        var recv = new AmqpReceiver(fakeAuthenticationProvider);
        var fakeReceiverLink = new EventEmitter();
        fakeReceiverLink[methodName] = sinon.stub().callsArg(1);
        sinon.stub(fakeReceiverLink, 'removeListener');
        recv._amqp = new FakeAmqp();
        sinon.stub(recv._amqp, 'attachReceiverLink').callsArgWith(2, null, fakeReceiverLink);
        var fakeMessage = new Message('foo');
        fakeMessage.transportObj = {};
        recv.on('message', function () {});
        recv.enableC2D(function () {
          recv[methodName](fakeMessage, function () {
            assert(fakeReceiverLink[methodName].calledWith(fakeMessage.transportObj));
            testCallback();
          });
        });
      });
    });
  });

  /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_007: [The `onDeviceMethod` method shall forward the `methodName` and `methodCallback` arguments to the underlying `AmqpDeviceMethodClient` object.]*/
  describe('#onDeviceMethod', function() {
    it('forwards the message and callback arguments to the underlying message receiver', function(testCallback) {
      var recv = new AmqpReceiver(fakeAuthenticationProvider);
      recv._amqp = new FakeAmqp();
      var fakeCallback = function() {};
      var fakeMethodName = 'fakeMethodName';
      recv.connect(function () {
        sinon.spy(recv._deviceMethodClient, 'onDeviceMethod');
        recv.onDeviceMethod(fakeMethodName, fakeCallback);
        assert(recv._deviceMethodClient.onDeviceMethod.calledWith(fakeMethodName, fakeCallback));
        testCallback();
      });
    });

    it('emits an error event with the error if the links fail to connect initially', function (testCallback) {
      var fakeMethodClient = new EventEmitter();
      var fakeError = new Error('fake error');
      var recv = new AmqpReceiver(fakeAuthenticationProvider, fakeAmqpBaseClient);

      var errorCallback = function (err) {
        assert.strictEqual(err.innerError, fakeError);
        assert.instanceOf(err, errors.DeviceMethodsDetachedError);
        recv.removeListener('error', errorCallback);
        testCallback();
      };

      recv.connect(function () {
        sinon.stub(recv._deviceMethodClient, 'onDeviceMethod');
        sinon.stub(recv._deviceMethodClient, 'attach').callsArgWith(0, fakeError);
        recv.on('error', errorCallback);
        recv.onDeviceMethod('fakeMethod', function () {});
        recv._deviceMethodClient.emit('error', fakeError);
      });
    });
  });
});