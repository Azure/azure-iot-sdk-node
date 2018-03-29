// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var Message = require('azure-iot-common').Message;
var ServiceReceiver = require('../lib/service_receiver.js').ServiceReceiver;

describe('ServiceReceiver', function () {
  describe('constructor', function () {
    /*Tests_SRS_NODE_SERVICE_RECEIVER_16_001: [The constructor shall subscribe to the `message` event of the `ReceiverLink` object passed as argument.]*/
    /*Tests_SRS_NODE_SERVICE_RECEIVER_16_002: [The constructor shall subscribe to the `error` event of the `ReceiverLink` object passed as argument.]*/
    it('subscribes to the \'message\' and \'error\' events of the ReceiverLink passed as argument', function () {
      var fakeLink = new EventEmitter();
      sinon.spy(fakeLink, 'on');
      var receiver = new ServiceReceiver(fakeLink);
      assert.isTrue(fakeLink.on.calledTwice);
      assert.isTrue(fakeLink.on.calledWith('message'));
      assert.isTrue(fakeLink.on.calledWith('error'));
    });

    /*Tests_SRS_NODE_SERVICE_RECEIVER_16_006: [The `ServiceReceiver` class shall convert any `AmqpMessage` received with the `message` event from the `ReceiverLink` object into `Message` objects and emit a `message` event with that newly created `Message` object for argument.]*/
    it('translates then forwards the message events', function(testCallback) {
      var fakeLink = new EventEmitter();
      sinon.spy(fakeLink, 'on');
      var receiver = new ServiceReceiver(fakeLink);
      var fakeAmqpMessage = {
        body: 'foo'
      };
      receiver.on('message', function (msg) {
        assert.instanceOf(msg, Message);
        assert.strictEqual(msg.transportObj, fakeAmqpMessage);
        testCallback();
      });

      fakeLink.emit('message', fakeAmqpMessage);
    });

    /*Tests_SRS_NODE_SERVICE_RECEIVER_16_007: [Any error event received from the `ReceiverLink` object shall be forwarded as is.]*/
    it('forwards the error events', function (testCallback) {
      var fakeLink = new EventEmitter();
      sinon.spy(fakeLink, 'on');
      var receiver = new ServiceReceiver(fakeLink);
      var fakeError = new Error('fake');
      receiver.on('error', function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });

      fakeLink.emit('error', fakeError);
    });
  });

  /*Tests_SRS_NODE_SERVICE_RECEIVER_16_003: [The `complete` method shall call the `complete` method on the `ReceiverLink` object and pass it the `AmqpMessage` stored within the `transportObj` property of the `Message` object as well as the `done` callback passed as argument.]*/
  /*Tests_SRS_NODE_SERVICE_RECEIVER_16_004: [The `abandon` method shall call the `abandon` method on the `ReceiverLink` object and pass it the `AmqpMessage` stored within the `transportObj` property of the `Message` object as well as the `done` callback passed as argument.]*/
  /*Tests_SRS_NODE_SERVICE_RECEIVER_16_005: [The `reject` method shall call the `reject` method on the `ReceiverLink` object and pass it the `AmqpMessage` stored within the `transportObj` property of the `Message` object as well as the `done` callback passed as argument.]*/
  ['abandon', 'complete', 'reject'].forEach(function (methodName) {
    describe('#' + methodName, function () {
      it('calls the \'' + methodName + '\' method on the link object and passes it the AmqpMessage and the callback', function () {
        var fakeLink = new EventEmitter();
        fakeLink[methodName] = sinon.stub().callsArg(1);
        var receiver = new ServiceReceiver(fakeLink);
        var fakeMessage = new Message();
        fakeMessage.transportObj = {};
        var fakeCallback = function () {};
        receiver[methodName](fakeMessage, fakeCallback);
        assert.isTrue(fakeLink[methodName].calledWith(fakeMessage.transportObj, fakeCallback));
      });
    });
  });

  describe('forceDetach', function () {
    /*Tests_SRS_NODE_SERVICE_RECEIVER_16_009: [The `forceDetach` method shall call the `forceDetach` method on the `ReceiverLink` object and pass it its `err` argument.]*/
    it('calls forceDetach on the ReceiverLink with the error', function () {
      var fakeLink = new EventEmitter();
      fakeLink.forceDetach = sinon.stub();
      var receiver = new ServiceReceiver(fakeLink);
      var fakeError = new Error('fake');
      receiver.forceDetach(fakeError);
      assert.isTrue(fakeLink.forceDetach.calledWith(fakeError));
    });
  });

  describe('detach', function () {
    /*Tests_SRS_NODE_SERVICE_RECEIVER_16_008: [The `detach` method shall call the `detach` method on the `ReceiverLink` object and pass it its `callback` argument.]*/
    it('calls detach on the ReceiverLink with the callback', function () {
      var fakeLink = new EventEmitter();
      fakeLink.detach = sinon.stub();
      var receiver = new ServiceReceiver(fakeLink);
      var fakeCallback = function () {};
      receiver.detach(fakeCallback);
      assert.isTrue(fakeLink.detach.calledWith(fakeCallback));
    });
  });
});
