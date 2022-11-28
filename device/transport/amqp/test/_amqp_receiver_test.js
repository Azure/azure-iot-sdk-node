// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const EventEmitter = require('events').EventEmitter;
const AmqpReceiver = require('../dist/amqp.js').Amqp;
const AmqpMessage = require('azure-iot-amqp-base').AmqpMessage;
const Message = require('azure-iot-common').Message;
const errors = require('azure-iot-common').errors;

const FakeAmqp = require('./_fake_amqp.js').FakeAmqp;

describe('AmqpReceiver', function () {
  const fakeConfig = {
    deviceId: 'fakeDeviceId',
    sharedAccessSignature: 'SharedAccessSignature sr=bad&sig=XLU2ibNOYBbld3FpFIOHbPZv3Thp4wfK%2BcqZpJz66hE%3D&skn=keyName&se=1474440492'
  };

  let fakeAuthenticationProvider;
  const fakeAmqpBaseClient = {
    connect: sinon.stub().callsArg(1),
    setDisconnectHandler: sinon.stub(),
    initializeCBS: sinon.stub().callsArg(0),
    putToken: sinon.stub().callsArg(2)
  };

  beforeEach(function () {

    fakeAuthenticationProvider = {
      getDeviceCredentials: function (callback) {
        callback(null, fakeConfig);
      },
      updateSharedAccessSignature: sinon.stub()
    };
  });

  afterEach(function () {
    fakeAuthenticationProvider = null;
  });

  describe('#constructor', function () {
    /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_001: [The `Amqp` constructor shall implement the `Receiver` interface.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_RECEIVER_16_002: [The `Amqp` object shall inherit from the `EventEmitter` node object.]*/
    it('Initializes a new instance of an AmqpReceiver object', function () {
      assert.doesNotThrow(function () {
        const recv = new AmqpReceiver(fakeAuthenticationProvider);
        assert.instanceOf(recv, AmqpReceiver);
        assert.instanceOf(recv, EventEmitter);
      });
    });

    it('forwards the errorReceived event if an error is received from a device method link', function (testCallback) {
      const recv = new AmqpReceiver(fakeAuthenticationProvider, fakeAmqpBaseClient);
      const fakeError = new Error('fake error');
      const fakeCallback = function (err) {
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
  describe('#on(\'message\', callback)', function () {
    it('forwards \'message\' events to all listeners once set up', function (testCallback) {
      let recv1messageReceived = false;
      let recv2messageReceived = false;
      const testMessage = new AmqpMessage();
      const recv = new AmqpReceiver(fakeAuthenticationProvider);
      const fakeReceiverLink = new EventEmitter();
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
      const testError = new Error('test');
      const recv = new AmqpReceiver(fakeAuthenticationProvider);
      const fakeReceiverLink = new EventEmitter();
      recv._amqp = new FakeAmqp();
      sinon.stub(recv._amqp, 'attachReceiverLink').callsArgWith(2, null, fakeReceiverLink);
      recv.on('message', function (_msg) {});
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
      const recv = new AmqpReceiver(fakeAuthenticationProvider);
      const fakeReceiverLink = new EventEmitter();
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
      it('calls the underlying message receiver settlement method with the message argument', function (testCallback) {
        const recv = new AmqpReceiver(fakeAuthenticationProvider);
        const fakeReceiverLink = new EventEmitter();
        fakeReceiverLink[methodName] = sinon.stub().callsArg(1);
        sinon.stub(fakeReceiverLink, 'removeListener');
        recv._amqp = new FakeAmqp();
        sinon.stub(recv._amqp, 'attachReceiverLink').callsArgWith(2, null, fakeReceiverLink);
        const fakeMessage = new Message('foo');
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
  describe('#onDeviceMethod', function () {
    it('forwards the message and callback arguments to the underlying message receiver', function (testCallback) {
      const recv = new AmqpReceiver(fakeAuthenticationProvider);
      recv._amqp = new FakeAmqp();
      const fakeCallback = function () {};
      const fakeMethodName = 'fakeMethodName';
      recv.connect(function () {
        sinon.spy(recv._deviceMethodClient, 'onDeviceMethod');
        recv.onDeviceMethod(fakeMethodName, fakeCallback);
        assert(recv._deviceMethodClient.onDeviceMethod.calledWith(fakeMethodName, fakeCallback));
        testCallback();
      });
    });

    it('emits an error event with the error if the links fail to connect initially', function (testCallback) {
      const fakeError = new Error('fake error');
      const recv = new AmqpReceiver(fakeAuthenticationProvider, fakeAmqpBaseClient);

      const errorCallback = function (err) {
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
