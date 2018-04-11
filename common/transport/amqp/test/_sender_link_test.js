var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var SenderLink = require('../lib/sender_link.js').SenderLink;
var AmqpMessage = require('../lib/amqp_message.js').AmqpMessage;

describe('SenderLink', function() {
  describe('#attach', function() {
    it('fails messages in the queue with its own error if the link cannot be attached', function (testCallback) {
      var fakeRheaSession = new EventEmitter();
      var fakeContext = {session: fakeRheaSession};
      fakeRheaSession.name = 'session';
      fakeRheaSession.open_sender = sinon.stub();

      var fakeError = new Error('fake error');

      var link = new SenderLink('link', {}, fakeRheaSession);
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
      fakeRheaSession.error = fakeError;
      fakeRheaSession.emit('sender_error', fakeContext);
    });
  });

  describe('#send', function() {
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_011: [If the state machine is not in the `attached` state, the `SenderLink` object shall attach the link first and then send the message.]*/
    it('automatically attaches the link if it is detached', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.send = sinon.stub().returns({id: 1});
      fakeRheaLink.sendable = sinon.stub().returns(true);
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {fakeRheaSession.emit('sender_open', fakeContext)});

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.send(new AmqpMessage(''), function() {
        assert(fakeRheaSession.open_sender.calledOnce);
        assert(fakeRheaLink.send.calledOnce);
        testCallback();
      });
      fakeRheaLink.emit('accepted', {delivery: {id: 1}});
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_010: [The `send` method shall use the link created by the underlying `rhea` to send the specified `message` to the IoT hub.]*/
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_013: [If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`.]*/
    it('sends the message passed as argument and calls the callback if successful', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.send = sinon.stub().returns({id: 1});
      fakeRheaLink.sendable = sinon.stub().returns(true);
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {fakeRheaSession.emit('sender_open', fakeContext)});
      var fakeMessage = new AmqpMessage('');
      fakeMessage.message_id = 'hello';

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function() {
        link.send(fakeMessage, function(err, result) {
          assert(fakeRheaLink.send.calledWith(fakeMessage));
          assert.isNotOk(err, 'error returned');
          assert.equal(result.constructor.name, 'MessageEnqueued');
          testCallback();
        });
        fakeRheaLink.emit('accepted', {delivery: {id: 1}});
      });
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_019: [While the link isn't attached, the messages passed to the `send` method shall be queued.]*/
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_020: [When the link gets attached, the messages shall be sent in the order they were queued.]*/
    it('queues messages and send them in order when the link is attached', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      var deliveryIndex = 1;
      fakeRheaLink.send = sinon.stub().returns({id: deliveryIndex++});
      fakeRheaLink.sendable = sinon.stub().returns(true);
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = sinon.stub();

      var fakeMessage1 = new AmqpMessage({});
      var fakeMessage2 = new AmqpMessage({});

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function() {}); // Will be stuck in attaching until unlockResolve is called.
      link.send(fakeMessage1, function() {});
      link.send(fakeMessage2, function() {
        assert(fakeRheaLink.send.firstCall.calledWith(fakeMessage1));
        assert(fakeRheaLink.send.secondCall.calledWith(fakeMessage2));
        testCallback();
      });
      fakeRheaSession.emit('sender_open', fakeContext);
      fakeRheaLink.emit('accepted', {delivery: {id: 1}});
      fakeRheaLink.emit('accepted', {delivery: {id: 2}});
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_014: [If the link is detached while a message is being sent, the `callback` shall be called with an `Error` object describing the AMQP error that caused the detach to happen in the first place.]*/
    ['sender_error', 'sender_close'].forEach(function(eventToEmit) {
      it('calls the callback with the first error if the \`rhea\` link emits \'' + eventToEmit + '\' while the message is being sent', function(testCallback) {
        var fakeMessage = new AmqpMessage({});
        var fakeEmittedError = new Error('fake emitted failure');
        var fakeRheaSendLink = new EventEmitter();
        var fakeContext = {sender: fakeRheaSendLink};
        fakeRheaSendLink.remove = sinon.stub();
        fakeRheaSendLink.close = sinon.stub();
        fakeRheaSendLink.send = sinon.stub().returns({id: 1});
        fakeRheaSendLink.sendable = sinon.stub().returns(true);
        fakeRheaSendLink.name = 'sender';
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_sender = () => {};
        sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {fakeRheaSession.emit('sender_open', fakeContext)});

        var link = new SenderLink('link', {}, fakeRheaSession);
        link.attach(function() {
          fakeRheaSendLink.error = fakeEmittedError;
          link.send(fakeMessage, function(err) {
            assert(fakeRheaSendLink.remove.calledOnce);
            assert(fakeRheaSendLink.close.notCalled);
            assert.strictEqual(err, fakeEmittedError);
            testCallback();
          });
          fakeRheaSendLink.emit(eventToEmit, fakeContext);
        });
      });
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_021: [If the link fails to attach and there are messages in the queue, the callback for each message shall be called with the error that caused the detach in the first place.]*/
    ['sender_error', 'sender_close'].forEach(function(eventToEmit) {
      it('calls the callback with the error if the \`rhea\` link fails to attach, and the session emits \'' + eventToEmit + '\' while the message is queued', function(testCallback) {
        var fakeMessage1 = new AmqpMessage({});
        var fakeMessage2 = new AmqpMessage({});
        var fakeMessage1Completed = false;
        var fakeEmittedError = new Error('fake emitted failure');
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.name = 'session';
        var fakeRheaContext = {session: fakeRheaSession};
        fakeRheaSession.open_sender = sinon.stub();

        var link = new SenderLink('link', {}, fakeRheaSession);
        link.attach(function() {});
        fakeRheaSession.error = fakeEmittedError;
        link.send(fakeMessage1, function(err) {
          assert.strictEqual(err, fakeEmittedError);
          fakeMessage1Completed = true;
        });
        link.send(fakeMessage2, function(err) {
          assert.strictEqual(err, fakeEmittedError);
          assert(fakeMessage1Completed,'first message completed');
          testCallback();
        });
        fakeRheaSession.emit(eventToEmit, fakeRheaContext);
      });
    });

  });
});