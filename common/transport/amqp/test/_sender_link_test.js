const EventEmitter = require('events').EventEmitter;
const assert = require('chai').assert;
const sinon = require('sinon');
const SenderLink = require('../dist/sender_link.js').SenderLink;
const AmqpMessage = require('../dist/amqp_message.js').AmqpMessage;

describe('SenderLink', function () {

  describe('#attach', function () {
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_018: [If an error happened that caused the link to be detached while trying to attach the link or send a message, the `callback` for this function shall be called with that error.]*/
    it('fails messages in the queue with its own error if the link cannot be attached', function (testCallback) {
      const fakeRheaSession = new EventEmitter();
      const fakeRheaLink = new EventEmitter();
      fakeRheaLink.name = 'rheaSendLink';
      fakeRheaSession.open_sender = sinon.stub().returns(fakeRheaLink);
      const fakeError = new Error('fake error');
      const fakeContext = { sender: fakeRheaLink };
      fakeRheaLink.error = fakeError;

      const link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function (err) {
        assert.strictEqual(err, fakeError);
      });
      link.send(new AmqpMessage(''), function (err) {
        assert.strictEqual(err, fakeError);
      });
      link.send(new AmqpMessage(''), function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
      fakeRheaLink.emit('sender_error', fakeContext);
      fakeRheaLink.emit('sender_close', fakeContext);
    });
  });

  describe('#detach', function () {
    it('while detaching will process a send acceptance', function (testCallback) {
      const fakeRheaLink = new EventEmitter();
      fakeRheaLink.name = 'rheaSendLink';
      const fakeContext = { sender: fakeRheaLink };
      fakeRheaLink.close = sinon.stub();
      fakeRheaLink.send = sinon.stub().returns({ id: 1 });
      fakeRheaLink.sendable = sinon.stub().returns(true);
      const fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});
      const fakeMessage = new AmqpMessage('');
      fakeMessage.message_id = 'hello';

      const link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function (err) {
        assert.isNotOk(err, 'attach completes successfully');
        link.send(fakeMessage, function (err, result) {
          assert(fakeRheaLink.send.calledWith(fakeMessage));
          assert.isNotOk(err, 'error not indicated on send');
          assert.equal(result.constructor.name, 'MessageEnqueued');
          fakeRheaLink.emit('sender_close', fakeContext);
        });
        link.detach(function (detachError) {
          assert(fakeRheaLink.send.calledOnce,'send completed before detach');
          assert.isNotOk(detachError, 'detach completed successfully');
          assert(fakeRheaLink.close.calledOnce, 'close was invoked');
          testCallback();
        });
        fakeRheaLink.emit('accepted', { delivery: { id: 42 }, sender: fakeRheaLink }); // For grins throw in a spurious acceptance
        fakeRheaLink.emit('accepted', { delivery: { id: 1 }, sender: fakeRheaLink });
      });
    });
  });

  describe('#events', function () {
    it('handles the `sendable` event from `rhea`', function (testCallback) {
      const fakeRheaLink = new EventEmitter();
      const fakeContext = { sender: fakeRheaLink };
      fakeRheaLink.sendable = sinon.stub();
      fakeRheaLink.sendable.onSecondCall().returns(true);
      fakeRheaLink.sendable.returns(false);
      fakeRheaLink.has_credit = sinon.stub().returns(true)
      fakeRheaLink.send = sinon.stub().returns({ id: 1 });
      const fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});

      const link = new SenderLink('link', {}, fakeRheaSession);
      link.attach((err) => {
        assert.isNotOk(err, 'attach completes successfully');
        assert(fakeRheaLink.sendable.notCalled,'checks for ability to send messages when entering the attached state.'); // blocked by queue check.
        assert(fakeRheaLink.send.notCalled, 'has no message to send');
        link.send(new AmqpMessage('fake message')); // Sendable called once at this point
        fakeRheaLink.emit('sendable', fakeContext);
        assert(fakeRheaLink.sendable.calledTwice,'handled the sendable event'); //blocked by queue check.
        assert(fakeRheaLink.send.calledOnce);
        testCallback();
      });

    });
  });

  describe('#send', function () {
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_011: [If the state machine is not in the `attached` state, the `SenderLink` object shall attach the link first and then send the message.]*/
    it('automatically attaches the link if it is detached', function (testCallback) {
      const fakeRheaLink = new EventEmitter();
      const fakeContext = { sender: fakeRheaLink };
      fakeRheaLink.name = 'rheaSenderLink';
      fakeRheaLink.send = () => {};
      sinon.stub(fakeRheaLink, 'send').callsFake(() => {process.nextTick(() => {fakeRheaLink.emit('accepted', { delivery: { id: 1 }, sender: fakeRheaLink })}); return { id: 1 }});
      fakeRheaLink.sendable = sinon.stub().returns(true);
      const fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});

      const link = new SenderLink('link', {}, fakeRheaSession);
      link.send(new AmqpMessage(''), function () {
        assert(fakeRheaSession.open_sender.calledOnce);
        assert(fakeRheaLink.send.calledOnce);
        testCallback();
      });
    });

    // Bugfix for https://github.com/Azure/azure-iot-sdk-node/issues/569
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_027: [If the state machine is not in the attached state and the link is force-detached before successfully attaching , the send callback shall be called with the error passed to forceDetach]*/
    it('does not throw if the link is forceDetached while auto-attaching and fails the send operation with the error provided by forceDetach', function (testCallback) {
      const fakeError = new Error('fake');
      const fakeRheaLink = new EventEmitter();
      fakeRheaLink.name = 'rheaSenderLink';
      const fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = sinon.stub().returns(fakeRheaLink);

      const link = new SenderLink('link', {}, fakeRheaSession);
      link.send(new AmqpMessage(''), function (err) {
        assert(fakeRheaSession.open_sender.calledOnce);
        assert.strictEqual(err, fakeError);
        testCallback();
      });

      link.forceDetach(fakeError);
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_010: [The `send` method shall use the link created by the underlying `rhea` to send the specified `message` to the IoT hub.]*/
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_013: [If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`.]*/
    it('sends the message passed as argument and calls the callback if successful', function (testCallback) {
      const fakeRheaLink = new EventEmitter();
      fakeRheaLink.name = 'rheaSenderLink';
      const fakeContext = { sender: fakeRheaLink };
      fakeRheaLink.send = () => {};
      sinon.stub(fakeRheaLink, 'send').callsFake(() => {process.nextTick(() => {fakeRheaLink.emit('accepted', { delivery: { id: 1 }, sender: fakeRheaLink })}); return { id: 1 }});
      fakeRheaLink.sendable = sinon.stub().returns(true);
      const fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});
      const fakeMessage = new AmqpMessage('');
      fakeMessage.message_id = 'hello';

      const link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function () {
        link.send(fakeMessage, function (err, result) {
          assert(fakeRheaLink.send.calledWith(fakeMessage));
          assert.isNotOk(err, 'error returned');
          assert.equal(result.constructor.name, 'MessageEnqueued');
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_008: [Handles sending messages that can be settled on send.] */
    it('sends a message that is settled on send', function (testCallback) {
      const fakeRheaLink = new EventEmitter();
      const fakeContext = { sender: fakeRheaLink };
      fakeRheaLink.send = sinon.stub().returns({ id: 1, settled: true });
      fakeRheaLink.sendable = sinon.stub().returns(true);
      const fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});
      const fakeMessage = new AmqpMessage('');
      fakeMessage.message_id = 'hello';

      const link = new SenderLink('link', null, fakeRheaSession);
      link.attach(function () {
        link.send(fakeMessage, function (err, result) {
          assert(fakeRheaLink.send.calledWith(fakeMessage));
          assert.isNotOk(err, 'error returned');
          assert.equal(result.constructor.name, 'MessageEnqueued');
          testCallback();
        });
      });
    });

    it('handles settle on send with no callback', function (testCallback) {
      const fakeRheaLink = new EventEmitter();
      const fakeContext = { sender: fakeRheaLink };
      fakeRheaLink.send = sinon.stub().returns({ id: 1, settled: true });
      fakeRheaLink.sendable = sinon.stub().returns(true);
      const fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});
      const fakeMessage = new AmqpMessage('');
      fakeMessage.message_id = 'hello';

      const link = new SenderLink('link', null, fakeRheaSession);
      link.attach(function () {
        link.send(fakeMessage);
        assert(fakeRheaLink.send.calledWith(fakeMessage));
        testCallback();
      });
    });

    ['accepted', 'rejected', 'released'].forEach( (testConfig) => {
      it('handles spurious send completions for ' + testConfig, function (testCallback) {
        const fakeRheaLink = new EventEmitter();
        fakeRheaLink.name = 'rheaSenderLink';
        const fakeContext = { sender: fakeRheaLink };
        fakeRheaLink.sendable = sinon.stub().returns(true);
        const fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_sender = () => {};
        sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});

        const link = new SenderLink('link', null, fakeRheaSession);
        link.attach(function () {
          fakeRheaLink.emit(testConfig, { delivery: { id: 42, remote_state: { error: { condition: testConfig } } }, sender: fakeRheaLink });
          testCallback();
        });
      });
    });

    ['accepted', 'rejected', 'released'].forEach( (testConfig) => {
      it('handles send completions with no callback with ' + testConfig, function (testCallback) {
        const fakeRheaLink = new EventEmitter();
        fakeRheaLink.name = 'rheaSenderLink';
        const fakeContext = { sender: fakeRheaLink };
        fakeRheaLink.send = sinon.stub().returns({ id: 1 });
        fakeRheaLink.sendable = sinon.stub().returns(true);
        const fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_sender = () => {};
        sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});
        const fakeMessage = new AmqpMessage('');
        fakeMessage.message_id = 'hello';

        const link = new SenderLink('link', null, fakeRheaSession);
        link.attach(function () {
          link.send(fakeMessage);
          assert(fakeRheaLink.send.calledOnce, 'message sent');
          fakeRheaLink.emit(testConfig, { delivery: { id: 1, remote_state: { error: { condition: testConfig } } }, sender: fakeRheaLink });
          testCallback();
        });
      });
    });


    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_012: [If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service.] */
    ['rejected', 'released'].forEach(function (testConfig) {
      it('sends the message passed as argument and calls the callback with ' + testConfig, function (testCallback) {
        const fakeRheaLink = new EventEmitter();
        fakeRheaLink.name = 'rheaSenderLink';
        const fakeContext = { sender: fakeRheaLink };
        fakeRheaLink.send = () => {};
        sinon.stub(fakeRheaLink, 'send').callsFake(() => {process.nextTick(() => {fakeRheaLink.emit(testConfig, { delivery: { id: 1, remote_state: { error: { condition: testConfig } } }, sender: fakeRheaLink })}); return { id: 1 }});
        fakeRheaLink.sendable = sinon.stub().returns(true);
        const fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_sender = () => {};
        sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});
        const fakeMessage = new AmqpMessage('');
        fakeMessage.message_id = 'hello';

        const link = new SenderLink('link', {}, fakeRheaSession);
        link.attach(function () {
          link.send(fakeMessage, function (err) {
            assert(fakeRheaLink.send.calledWith(fakeMessage));
            assert.isOk(err, 'error returned');
            assert.equal(err.condition, testConfig);
            testCallback();
          });
        });
      });
    });


    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_019: [While the link isn't attached, the messages passed to the `send` method shall be queued.] */
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_020: [When the link gets attached, the messages shall be sent in the order they were queued.] */
    it('queues messages and send them in order when the link is attached', function (testCallback) {
      const fakeRheaLink = new EventEmitter();
      fakeRheaLink.name = 'rheaSenderLink';
      const fakeContext = { sender: fakeRheaLink };
      let deliveryIndex = 1;
      fakeRheaLink.send = () => {};
      sinon.stub(fakeRheaLink, 'send').callsFake(() => {let id = deliveryIndex++;process.nextTick(() => {fakeRheaLink.emit('accepted', { delivery: { id: id }, sender: fakeRheaLink })}); return { id: id }});
      fakeRheaLink.sendable = sinon.stub().returns(true);
      const fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {return fakeRheaLink;});

      const fakeMessage1 = new AmqpMessage({});
      const fakeMessage2 = new AmqpMessage({});

      const link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function () {}); // Will be stuck in attaching until send_open event is emitted.
      link.send(fakeMessage1, function () {});
      link.send(fakeMessage2, function () {
        assert(fakeRheaLink.send.firstCall.calledWith(fakeMessage1));
        assert(fakeRheaLink.send.secondCall.calledWith(fakeMessage2));
        testCallback();
      });
      fakeRheaLink.emit('sender_open', fakeContext);
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_016: [If an error happened that caused the link to be detached, the sender link shall call emit an `azure-iot-amqp-base:error-indicated` event with that error.]*/
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_014: [If the link is detached while a message is being sent, the `callback` shall be called with an `Error` object describing the AMQP error that caused the detach to happen in the first place.] */
    it('calls the callback with the first error if the `rhea` link emits sender_error while the message is being sent', function (testCallback) {
      const fakeMessage = new AmqpMessage({});
      const fakeEmittedError = new Error('fake emitted failure');
      const fakeRheaSendLink = new EventEmitter();
      fakeRheaSendLink.name = 'rheaSenderLink';
      const fakeRheaContainer = new EventEmitter();
      const fakeErrorContext = { sender: fakeRheaSendLink };
      const fakeOpenContext = { sender: fakeRheaSendLink };
      fakeRheaSendLink.remove = sinon.stub();
      fakeRheaSendLink.detach = sinon.stub();
      fakeRheaSendLink.close = sinon.stub();
      fakeRheaSendLink.send = sinon.stub().returns({ id: 1 });
      fakeRheaSendLink.sendable = sinon.stub().returns(true);
      const fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaSendLink.emit('sender_open', fakeOpenContext)});return fakeRheaSendLink;});

      const link = new SenderLink('link', {}, fakeRheaSession);
      const fakeCloseContext = { sender: fakeRheaSendLink, container: fakeRheaContainer };
      fakeRheaContainer.on('azure-iot-amqp-base:error-indicated', (err) => {
        link.detach(() => {}, err);
      });
      link.attach(function () {
        link.send(fakeMessage, function (err) {
          assert(fakeRheaSendLink.close.calledOnce);
          assert(fakeRheaSendLink.remove.notCalled);
          assert(fakeRheaSendLink.detach.notCalled);
          assert.strictEqual(err, fakeEmittedError);
          testCallback();
        });
        fakeRheaSendLink.error = fakeEmittedError;
        fakeRheaSendLink.emit('sender_error', fakeErrorContext);
        fakeRheaSendLink.error = undefined;
        fakeRheaSendLink.emit('sender_close', fakeCloseContext);
      });
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_021: [If the link fails to attach and there are messages in the queue, the callback for each message shall be called with the error that caused the detach in the first place.]*/
    it('calls the callback with the error if the `rhea` link fails to attach', function (testCallback) {
      const fakeEmittedError = new Error('fake emitted failure');
      const fakeRheaSendLink = new EventEmitter();
      fakeRheaSendLink.name = 'rheaSendLink';
      const fakeErrorContext = { sender: fakeRheaSendLink };
      const fakeCloseContext = { sender: fakeRheaSendLink };
      const fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').returns(fakeRheaSendLink);

      const link = new SenderLink('link', {}, fakeRheaSession);
      const fakeMessage1 = new AmqpMessage({});
      const fakeMessage2 = new AmqpMessage({});
      let fakeMessage1Completed = false;

      link.attach(function () {});
      link.send(fakeMessage1, function (err) {
        assert.strictEqual(err, fakeEmittedError);
        fakeMessage1Completed = true;
      });
      link.send(fakeMessage2, function (err) {
        assert.strictEqual(err, fakeEmittedError);
        assert(fakeMessage1Completed,'first message completed');
        testCallback();
      });
      fakeRheaSendLink.error = fakeEmittedError;
      fakeRheaSendLink.emit('sender_error', fakeErrorContext);
      fakeRheaSendLink.error = undefined;
      fakeRheaSendLink.emit('sender_close', fakeCloseContext);
    });

  });
});
