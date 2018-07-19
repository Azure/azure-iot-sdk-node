var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var SenderLink = require('../lib/sender_link.js').SenderLink;
var AmqpMessage = require('../lib/amqp_message.js').AmqpMessage;

describe('SenderLink', function() {
  describe('#constructor', function () {
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_002: [** The `SenderLink` class shall inherit from `EventEmitter`.] */
    it('inherits from the EventEmitter class', function(testCallback) {
      var link = new SenderLink('link', {}, new EventEmitter());
      assert.isTrue(link instanceof EventEmitter);
      testCallback();
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_003: [** The `SenderLink` class shall implement the `AmqpLink` interface.] */
    it('inherits from the EventEmitter class', function(testCallback) {
      var link = new SenderLink('link', {}, new EventEmitter());
      assert.isTrue(link.attach && (typeof link.attach === 'function'));
      assert.isTrue(link.detach && (typeof link.attach === 'function'));
      assert.isTrue(link.forceDetach && (typeof link.attach === 'function'));
      testCallback();
    });

  });

  describe('#attach', function() {
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_004: [The `attach` method shall use the stored instance of the `rhea` session object to attach a new link object with the combined `linkAddress` and `linkOptions` provided when creating the `SenderLink` instance.] */
    it('merged link options utilized during the attach', function(testCallback) {
      var fakeTarget = 'fakeTarget';
      var fakeOption = {fakeOption: {color: 'red'}};
      var fakeRheaSession = new EventEmitter();
      var fakeRheaLink = new EventEmitter();
      fakeRheaSession.open_sender = sinon.stub().returns(fakeRheaLink);
      var fakeContext = {sender: {fakeRheaLink, name: 'someName'}};

      var link = new SenderLink(fakeTarget, fakeOption, fakeRheaSession);
      link.attach(function(err) {
        assert.isNotOk(err);
        var sentArgs = fakeRheaSession.open_sender.args[0];
        assert(sentArgs[0].target === fakeTarget, 'contains the appropriate target');
        assert(sentArgs[0].fakeOption === fakeOption.fakeOption, 'contains the appropriate fake option');
        testCallback();
      });
      fakeRheaLink.emit('sender_open', fakeContext);
    });

    it('attach while attached immediately invokes callback', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.close = sinon.stub();
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach((err) => {
        assert.isNotOk(err, 'attach completes successfully');
        link.attach((err) => {
          assert.isNotOk(err, 'second attach completes successfully');
          testCallback();
        });
      });
    });


    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_022: [The `attach` method shall call the `callback` if the link was successfully attached.] */
    it('calls the attach callback on successfully attaching the link.', function(testCallback) {
      var fakeRheaSendLink = new EventEmitter();
      var fakeOpenContext = {sender: fakeRheaSendLink};
      fakeRheaSendLink.name = 'sender';
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaSendLink.emit('sender_open', fakeOpenContext)});return fakeRheaSendLink;});

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function(err) {
        assert.isNotOk(err,'no error from the attach');
        testCallback();
      });
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_001: [If the `detach` method is invoked on the `SenderLink` while still attaching, the SenderLink shall detach.  It will indicate the error to the callback for the `detach` as well as the callback to the `attach`.] */
    it('detach while attaching invokes the attach and the detach callbacks with the same error.', function(testCallback) {
      var fakeRheaSendLink = new EventEmitter();
      var detachError = new Error('fake error');
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = sinon.stub().returns(fakeRheaSendLink);

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function(err) {
        assert.strictEqual(err, detachError);
      });
      link.detach((err) => {
        assert.strictEqual(err, detachError);
        testCallback();
      }, detachError);
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_003: [If the `forceDetach` method is invoked on the `SenderLink` while still attaching, the SenderLink shall detach.  It will indicate the error to the callback to the `attach`.] */
    it('forceDetach while attaching invokes the attach callback with an error (if provided) and emits an `error` event with the (potentially) supplied error.', function(testCallback) {
      var fakeRheaSendLink = new EventEmitter();
      var detachError = new Error('fake error');
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = sinon.stub().returns(fakeRheaSendLink);

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.on('error', (err) => {
        assert.strictEqual(err, detachError);
        testCallback();
      });
      link.attach(function(err) {
        assert.strictEqual(err, detachError);
      });
      link.forceDetach(detachError);
    });

    it('forceDetach while attaching invokes the attach callback with an NO error and emits NO `error` event with NO supplied error.', function(testCallback) {
      var fakeRheaSendLink = new EventEmitter();
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = sinon.stub().returns(fakeRheaSendLink);

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function(err) {
        assert.isNotOk(err);
        testCallback();
      });
      link.forceDetach();
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_018: [If an error happened that caused the link to be detached while trying to attach the link or send a message, the `callback` for this function shall be called with that error.]*/
    it('fails messages in the queue with its own error if the link cannot be attached', function (testCallback) {
      var fakeRheaSession = new EventEmitter();
      var fakeRheaLink = new EventEmitter();
      fakeRheaSession.open_sender = sinon.stub().returns(fakeRheaLink);
      var fakeError = new Error('fake error');
      var fakeContext = {sender: {fakeRheaLink, name: 'someName', error: fakeError}};


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
      fakeRheaLink.emit('sender_error', fakeContext);
      fakeRheaLink.emit('sender_close', fakeContext);
    });
  });

  describe('#detach', function() {
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_005: [If the `SenderLink` is already in the detached state an invocation of `detach` shall immediately invoke the callback with the (potentially) supplied error parameter.] */
    it('detach while already detached returns immediately', function(testCallback) {
      var fakeRheaSession = new EventEmitter();
      var fakeError = new Error('fakeError');
      fakeRheaSession.open_sender = () => {};
      var link = new SenderLink('link', {}, fakeRheaSession);
      link.detach((err) => {
        assert.strictEqual(err, fakeError);
        testCallback();
      }, fakeError);
    })

    it('can detach without prompting from the service will issue a close', function(testCallback) {
      var fakeRheaSession = new EventEmitter();
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.close = () => {};
      sinon.stub(fakeRheaLink, 'close').callsFake(() => {process.nextTick(() => {fakeRheaLink.emit('sender_close', fakeContext)})});
      fakeRheaSession.open_sender = ()=> {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick(() => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function(err) {
        assert.isNotOk(err, 'attach completes successfully');
        link.detach(function(detachError) {
          assert.isNotOk(detachError, 'detach completed successfully');
          assert(fakeRheaLink.close.calledOnce, 'close was invoked');
          testCallback();
        });
      });
    });

    it('while detaching will process a send acceptance', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.close = sinon.stub();
      fakeRheaLink.send = sinon.stub().returns({id: 1});
      fakeRheaLink.sendable = sinon.stub().returns(true);
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});
      var fakeMessage = new AmqpMessage('');
      fakeMessage.message_id = 'hello';

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function(err) {
        assert.isNotOk(err, 'attach completes successfully');
        link.send(fakeMessage, function(err, result) {
          assert(fakeRheaLink.send.calledWith(fakeMessage));
          assert.isNotOk(err, 'error not indicated on send');
          assert.equal(result.constructor.name, 'MessageEnqueued');
          fakeRheaLink.emit('sender_close', fakeContext);
        });
        link.detach(function(detachError) {
          assert(fakeRheaLink.send.calledOnce,'send completed before detach');
          assert.isNotOk(detachError, 'detach completed successfully');
          assert(fakeRheaLink.close.calledOnce, 'close was invoked');
          testCallback();
        });
        fakeRheaLink.emit('accepted', {delivery: {id: 42 }, sender: {fakeRheaLink,name: 'someName'}}); // For grins throw in a spurious acceptance
        fakeRheaLink.emit('accepted', {delivery: {id: 1 }, sender: {fakeRheaLink,name: 'someName'}});
      });
    });

    it('force detach while detaching will do it', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.close = sinon.stub();
      fakeRheaLink.remove = sinon.stub();
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function(err) {
        assert.isNotOk(err, 'attach completes successfully');
        link.detach((detachError) => {
          assert.isOk(detachError, 'initiating detach should error because the force stopped it');
          assert(fakeRheaLink.remove.calledOnce, 'remove invoked');
          assert(fakeRheaLink.close.calledOnce, 'close invoked');
          testCallback();
        });
        link.forceDetach();
      });
    });

    it('can handle an error event while detaching', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      var fakeError = new Error('error while detaching');
      fakeRheaLink.close = sinon.stub();
      fakeRheaLink.remove = sinon.stub();
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function(err) {
        assert.isNotOk(err, 'attach completes successfully');
        link.detach((detachError) => {
          assert.strictEqual(detachError, fakeError, 'detach finished with an error');
          assert(fakeRheaLink.close.calledOnce, 'close invoked');
          testCallback();
        });
        fakeRheaLink.emit('sender_error', {sender: {fakeRheaLink, name: 'someName', error: fakeError}});
        fakeRheaLink.emit('sender_close', fakeContext);
      });
    });

    it('detach while detaching will error the second detach', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.close = sinon.stub();
      fakeRheaLink.remove = sinon.stub();
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function(err) {
        assert.isNotOk(err, 'attach completes successfully');
        link.detach((detachError) => { // controlling detach.  Should finish last.
          assert.isNotOk(detachError, 'initiating detach should work regardless of second bad detach');
          assert(fakeRheaLink.close.calledOnce, 'close invoked');
          testCallback();
        });
        link.detach((err) => {
          assert.instanceOf(err, Error, 'Should have error from second detach');
          assert(fakeRheaLink.close.calledOnce, 'close invoked');
          process.nextTick(() => {fakeRheaLink.emit('sender_close', fakeContext)})
        });
      });
    });
  });

  describe('#forceDetach', function() {
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_026: [The `forceDetach` method shall return immediately if the link is already detached.]*/
    it('forceDetach (with or without supplied error) while already detached returns immediately', function(testCallback) {
      var fakeRheaSession = new EventEmitter();
      var fakeError = new Error('fakeError');
      var link = new SenderLink('link', {}, fakeRheaSession);
      link.forceDetach();
      link.forceDetach(fakeError);
      testCallback();
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_004: [The `forceDetach` method shall cause an `error` event to be emitted on the `SenderLink`.] */
    it('emits an error if forceDetach invoked while in the attached state', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.remove = sinon.stub();
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach((err) => {
        var fakeForceDetachError = new Error('forceDetachError');
        assert.isNotOk(err, 'attach completes successfully');
        link.on('error', (err) => {
          assert.strictEqual(err, fakeForceDetachError, 'correct error emitted');
          testCallback();
        });
        link.forceDetach(fakeForceDetachError);
      });
    });
  });

  describe('#events', function() {
    /*Codes_SRS_NODE_AMQP_SENDER_LINK_06_006: [A `sender_close` event with no previous error will simply detach the link.  No error is emitted.] */
    it('close received with no error causes link to detach', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.close = sinon.stub();
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach((err) => {
        assert.isNotOk(err, 'attach completes successfully');
        assert(fakeRheaLink.close.notCalled);
        fakeRheaLink.emit('sender_close', fakeContext);
        assert(fakeRheaLink.close.calledOnce,'detach sent')
        testCallback();
      });
    });

    it('handles the `sendable` event from `rhea`', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.sendable = sinon.stub();
      fakeRheaLink.sendable.onSecondCall().returns(true);
      fakeRheaLink.sendable.returns(false);
      fakeRheaLink.send = sinon.stub().returns({id: 1});
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});

      var link = new SenderLink('link', {}, fakeRheaSession);
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

  describe('#send', function() {
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_011: [If the state machine is not in the `attached` state, the `SenderLink` object shall attach the link first and then send the message.]*/
    it('automatically attaches the link if it is detached', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.send = () => {};
      sinon.stub(fakeRheaLink, 'send').callsFake(() => {process.nextTick(() => {fakeRheaLink.emit('accepted', {delivery: {id: 1 }, sender: {name: 'someName'}})}); return {id: 1}});
      fakeRheaLink.sendable = sinon.stub().returns(true);
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.send(new AmqpMessage(''), function() {
        assert(fakeRheaSession.open_sender.calledOnce);
        assert(fakeRheaLink.send.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_010: [The `send` method shall use the link created by the underlying `rhea` to send the specified `message` to the IoT hub.]*/
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_013: [If the message is successfully sent, the `callback` shall be called with a first parameter (error) set to `null` and a second parameter of type `MessageEnqueued`.]*/
    it('sends the message passed as argument and calls the callback if successful', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.send = () => {};
      sinon.stub(fakeRheaLink, 'send').callsFake(() => {process.nextTick(() => {fakeRheaLink.emit('accepted', {delivery: {id: 1 }, sender: {name: 'someName'}})}); return {id: 1}});
      fakeRheaLink.sendable = sinon.stub().returns(true);
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});
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
      });
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_008: [Handles sending messages that can be settled on send.] */
    it('sends a message that is settled on send', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.send = sinon.stub().returns({id: 1, settled: true});
      fakeRheaLink.sendable = sinon.stub().returns(true);
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});
      var fakeMessage = new AmqpMessage('');
      fakeMessage.message_id = 'hello';

      var link = new SenderLink('link', null, fakeRheaSession);
      link.attach(function() {
        link.send(fakeMessage, function(err, result) {
          assert(fakeRheaLink.send.calledWith(fakeMessage));
          assert.isNotOk(err, 'error returned');
          assert.equal(result.constructor.name, 'MessageEnqueued');
          testCallback();
        });
      });
    });

    it('handles settle on send with no callback', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      fakeRheaLink.send = sinon.stub().returns({id: 1, settled: true});
      fakeRheaLink.sendable = sinon.stub().returns(true);
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});
      var fakeMessage = new AmqpMessage('');
      fakeMessage.message_id = 'hello';

      var link = new SenderLink('link', null, fakeRheaSession);
      link.attach(function() {
        link.send(fakeMessage);
        assert(fakeRheaLink.send.calledWith(fakeMessage));
        testCallback();
      });
    });

    ['accepted', 'rejected', 'released'].forEach( (testConfig) => {
      it('handles spurious send completions for ' + testConfig, function(testCallback) {
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {sender: fakeRheaLink};
        fakeRheaLink.sendable = sinon.stub().returns(true);
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_sender = () => {};
        sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});

        var link = new SenderLink('link', null, fakeRheaSession);
        link.attach(function() {
          fakeRheaLink.emit(testConfig, {delivery: {id: 42, remote_state: {error: {condition: testConfig}}}, sender: {name: 'someName'}});
          testCallback();
        });
      });
    });

    ['accepted', 'rejected', 'released'].forEach( (testConfig) => {
      it('handles send completions with no callback with ' + testConfig, function(testCallback) {
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {sender: fakeRheaLink};
        var fakeContext = {sender: fakeRheaLink};
        fakeRheaLink.send = sinon.stub().returns({id: 1});
        fakeRheaLink.sendable = sinon.stub().returns(true);
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_sender = () => {};
        sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});
        var fakeMessage = new AmqpMessage('');
        fakeMessage.message_id = 'hello';

        var link = new SenderLink('link', null, fakeRheaSession);
        link.attach(function() {
          link.send(fakeMessage);
          assert(fakeRheaLink.send.calledOnce, 'message sent');
          fakeRheaLink.emit(testConfig, {delivery: {id: 1, remote_state: {error: {condition: testConfig}}}, sender: {name: 'someName'}});
          testCallback();
        });
      });
    });


    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_012: [If the message cannot be sent the `callback` shall be called with an `Error` object describing the AMQP error reported by the service.] */
    ['rejected', 'released'].forEach(function(testConfig) {
      it('sends the message passed as argument and calls the callback with ' + testConfig, function(testCallback) {
        this.timeout(120000);
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {sender: fakeRheaLink};
        fakeRheaLink.send = () => {};
        sinon.stub(fakeRheaLink, 'send').callsFake(() => {process.nextTick(() => {fakeRheaLink.emit(testConfig, {delivery: {id: 1, remote_state: {error: {condition: testConfig}}}, sender: {name: 'someName'}})}); return {id: 1}});
        fakeRheaLink.sendable = sinon.stub().returns(true);
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_sender = () => {};
        sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('sender_open', fakeContext)});return fakeRheaLink;});
        var fakeMessage = new AmqpMessage('');
        fakeMessage.message_id = 'hello';

        var link = new SenderLink('link', {}, fakeRheaSession);
        link.attach(function() {
          link.send(fakeMessage, function(err) {
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
    it('queues messages and send them in order when the link is attached', function(testCallback) {
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {sender: fakeRheaLink};
      var deliveryIndex = 1;
      fakeRheaLink.send = () => {};
      sinon.stub(fakeRheaLink, 'send').callsFake(() => {let id = deliveryIndex++;process.nextTick(() => {fakeRheaLink.emit('accepted', {delivery: {id: id }, sender: {name: 'someName'}})}); return {id: id}});
      fakeRheaLink.sendable = sinon.stub().returns(true);
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {return fakeRheaLink;});

      var fakeMessage1 = new AmqpMessage({});
      var fakeMessage2 = new AmqpMessage({});

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function() {}); // Will be stuck in attaching until send_open event is emitted.
      link.send(fakeMessage1, function() {});
      link.send(fakeMessage2, function() {
        assert(fakeRheaLink.send.firstCall.calledWith(fakeMessage1));
        assert(fakeRheaLink.send.secondCall.calledWith(fakeMessage2));
        testCallback();
      });
      fakeRheaLink.emit('sender_open', fakeContext);
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_016: [If an error happened that caused the link to be detached, the sender link shall call emit an `azure-iot-amqp-base:error-indicated` event with that error.]*/
    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_014: [If the link is detached while a message is being sent, the `callback` shall be called with an `Error` object describing the AMQP error that caused the detach to happen in the first place.] */
    it('calls the callback with the first error if the \`rhea\` link emits sender_error while the message is being sent', function(testCallback) {
      var fakeMessage = new AmqpMessage({});
      var fakeEmittedError = new Error('fake emitted failure');
      var fakeRheaSendLink = new EventEmitter();
      var fakeRheaContainer = new EventEmitter();
      var fakeErrorContext = {sender: {name: 'someName', error: fakeEmittedError}};
      var fakeOpenContext = {sender: fakeRheaSendLink};
      fakeRheaSendLink.remove = sinon.stub();
      fakeRheaSendLink.detach = sinon.stub();
      fakeRheaSendLink.close = sinon.stub();
      fakeRheaSendLink.send = sinon.stub().returns({id: 1});
      fakeRheaSendLink.sendable = sinon.stub().returns(true);
      fakeRheaSendLink.name = 'sender';
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {process.nextTick( () => {fakeRheaSendLink.emit('sender_open', fakeOpenContext)});return fakeRheaSendLink;});

      var link = new SenderLink('link', {}, fakeRheaSession);
      var fakeCloseContext = {sender: fakeRheaSendLink, container: fakeRheaContainer};
      fakeRheaContainer.on('azure-iot-amqp-base:error-indicated', (err) => {
        link.detach(() => {}, err);
      });
      link.attach(function() {
        link.send(fakeMessage, function(err) {
          assert(fakeRheaSendLink.close.calledOnce);
          assert(fakeRheaSendLink.remove.notCalled);
          assert(fakeRheaSendLink.detach.notCalled);
          assert.strictEqual(err, fakeEmittedError);
          testCallback();
        });
        fakeRheaSendLink.emit('sender_error', fakeErrorContext);
        fakeRheaSendLink.emit('sender_close', fakeCloseContext);
      });
    });

    /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_021: [If the link fails to attach and there are messages in the queue, the callback for each message shall be called with the error that caused the detach in the first place.]*/
    it('calls the callback with the error if the \`rhea\` link fails to attach', function(testCallback) {
      var fakeEmittedError = new Error('fake emitted failure');
      var fakeRheaSendLink = new EventEmitter();
      var fakeErrorContext = {sender: {name: 'someName', error: fakeEmittedError}};
      var fakeCloseContext = {sender: {name: 'someName'}};
      fakeRheaSendLink.name = 'sender';
      var fakeRheaSession = new EventEmitter();
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').returns(fakeRheaSendLink);

      var link = new SenderLink('link', {}, fakeRheaSession);
      var fakeMessage1 = new AmqpMessage({});
      var fakeMessage2 = new AmqpMessage({});
      var fakeMessage1Completed = false;

      var link = new SenderLink('link', {}, fakeRheaSession);
      link.attach(function() {});
      link.send(fakeMessage1, function(err) {
        assert.strictEqual(err, fakeEmittedError);
        fakeMessage1Completed = true;
      });
      link.send(fakeMessage2, function(err) {
        assert.strictEqual(err, fakeEmittedError);
        assert(fakeMessage1Completed,'first message completed');
        testCallback();
      });
      fakeRheaSendLink.emit('sender_error', fakeErrorContext);
      fakeRheaSendLink.emit('sender_close', fakeCloseContext);
    });

  });
});