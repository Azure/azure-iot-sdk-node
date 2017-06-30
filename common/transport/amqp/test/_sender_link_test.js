var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var SenderLink = require('../lib/sender_link.js').SenderLink;
var AmqpMessage = require('../lib/amqp_message.js').AmqpMessage;

describe('SenderLink', function() {
  describe('#attach', function() {
    it('fails messages in the queue with its own error if the link cannot be attached', function (testCallback) {
      var fakeLinkObj = new EventEmitter();
      var fakeError = new Error('fake error');
      var fakeAmqp10Client = new EventEmitter();
      var message1Failed = false;
      var message2Failed = false;
      var unlockReject = null;
      fakeAmqp10Client.createSender = function () {
        return new Promise(function (resolve, reject) {
          unlockReject = reject; // will lock the state machine into 'attaching' until we can reject.
        });
      };

      var link = new SenderLink('link', {}, fakeAmqp10Client);
      link.attach(function(err) {
        assert.isTrue(message1Failed);
        assert.isTrue(message2Failed);
        assert.strictEqual(err, fakeError);
      });
      link.send(new AmqpMessage(''), function (err) {
        message1Failed = true;
        assert.strictEqual(err, fakeError);
      });
      link.send(new AmqpMessage(''), function (err) {
        message2Failed = true;
        assert.strictEqual(err, fakeError);
        testCallback();
      });
      unlockReject(fakeError);
    });
  });

  describe('#send', function() {
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_011: [If the state machine is not in the `attached` state, the `SenderLink` object shall attach the link first and then send the message.]*/
    it('automatically attaches the link if it is detached', function(testCallback) {
      var fakeLinkObj = new EventEmitter();
      fakeLinkObj.send = sinon.stub().resolves();
      var fakeAmqp10Client = new EventEmitter();
      fakeAmqp10Client.createSender = sinon.stub().resolves(fakeLinkObj);

      var link = new SenderLink('link', {}, fakeAmqp10Client);
      link.send(new AmqpMessage(''), function() {
        assert(fakeAmqp10Client.createSender.calledOnce);
        assert(fakeLinkObj.send.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_010: [The `send` method shall use the link created by the underlying `amqp10.AmqpClient` to send the specified `message` to the IoT hub.]*/
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_013: [If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`.]*/
    it('sends the message passed as argument and calls the callback if successful', function(testCallback) {
      var fakeMessage = new AmqpMessage({});
      var fakeLinkObj = new EventEmitter();
      fakeLinkObj.send = sinon.stub().resolves();
      var fakeAmqp10Client = new EventEmitter();
      fakeAmqp10Client.createSender = sinon.stub().resolves(fakeLinkObj);

      var link = new SenderLink('link', {}, fakeAmqp10Client);
      link.attach(function() {
        link.send(fakeMessage, function() {
          assert(fakeLinkObj.send.calledWith(fakeMessage));
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_019: [While the link isn't attached, the messages passed to the `send` method shall be queued.]*/
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_020: [When the link gets attached, the messages shall be sent in the order they were queued.]*/
    it('queues messages and send them in order when the link is attached', function(testCallback) {
      var fakeMessage1 = new AmqpMessage({});
      var fakeMessage2 = new AmqpMessage({});
      var fakeLinkObj = new EventEmitter();
      var unlockResolve = null;
      fakeLinkObj.send = sinon.stub().resolves();
      var fakeAmqp10Client = new EventEmitter();
      fakeAmqp10Client.createSender = function() {
        return new Promise(function(resolve, reject) {
          unlockResolve = resolve;
        });
      };

      var link = new SenderLink('link', {}, fakeAmqp10Client);
      link.attach(function() {}); // Will be stuck in attaching until unlockResolve is called.
      link.send(fakeMessage1, function() {});
      link.send(fakeMessage2, function() {
        assert(fakeLinkObj.send.firstCall.calledWith(fakeMessage1));
        assert(fakeLinkObj.send.secondCall.calledWith(fakeMessage2));
        testCallback();
      });
      unlockResolve(fakeLinkObj);
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_012: [If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service.]*/
    it('calls the callback with an error if the amqp10 link fails to send the message', function(testCallback) {
      var fakeMessage = new AmqpMessage({});
      var fakeLinkObj = new EventEmitter();
      var fakeError = new Error('fake send failure');
      fakeLinkObj.send = sinon.stub().rejects(fakeError);
      var fakeAmqp10Client = new EventEmitter();
      fakeAmqp10Client.createSender = sinon.stub().resolves(fakeLinkObj);

      var link = new SenderLink('link', {}, fakeAmqp10Client);
      link.attach(function() {
        link.send(fakeMessage, function(err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_014: [If the link is detached while a message is being sent, the `callback` shall be called with an `Error` object describing the AMQP error that caused the detach to happen in the first place.]*/
    it('calls the callback with the first error if the amqp10 link emits an error while the message is being sent', function(testCallback) {
      var fakeMessage = new AmqpMessage({});
      var fakeEmittedError = new Error('fake emitted failure');
      var fakeRejectionError = new Error('fake rejected failure');
      var unlockReject;
      var fakeLinkObj = new EventEmitter();
      fakeLinkObj.forceDetach = sinon.spy();
      fakeLinkObj.send = function() {
        return new Promise(function(resolve, reject) {
          unlockReject = reject;
        });
      };
      var fakeAmqp10Client = new EventEmitter();
      fakeAmqp10Client.createSender = sinon.stub().resolves(fakeLinkObj);

      var link = new SenderLink('link', {}, fakeAmqp10Client);
      link.attach(function() {
        link.send(fakeMessage, function(err) {
          assert(fakeLinkObj.forceDetach.calledOnce);
          assert.strictEqual(err, fakeEmittedError);
          testCallback();
        });

        fakeLinkObj.emit('errorReceived', fakeEmittedError);
        unlockReject(fakeRejectionError);
      });
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_021: [If the link fails to attach and there are messages in the queue, the callback for each message shall be called with the error that caused the detach in the first place.]*/
  });
});