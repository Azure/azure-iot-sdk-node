var EventEmitter = require('events').EventEmitter;
var uuid = require('uuid');
var assert = require('chai').assert;
var sinon = require('sinon');

var errors = require('azure-iot-common').errors;
var Message = require('azure-iot-common').Message;
var AmqpMessage = require('../lib/amqp_message.js').AmqpMessage;

var CBS = require('../lib/amqp_cbs.js').ClaimsBasedSecurityAgent;

describe('ClaimsBasedSecurityAgent', function() {
  describe('#attach', function() {
    /*Tests_SRS_NODE_AMQP_CBS_16_006: [If given as an argument, the `attach` method shall call `callback` with a standard `Error` object if any link fails to attach.]*/
    it('calls its callback with an error if can NOT establish a sender link', function(testCallback) {
      var testError = new Error();
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);
      cbs._senderLink.attach = sinon.stub().callsArgWith(0,testError);
      cbs.attach(function(err) {
        assert.strictEqual(err, testError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_AMQP_CBS_16_006: [If given as an argument, the `attach` method shall call `callback` with a standard `Error` object if any link fails to attach.]*/
    it('calls its callback with an error if can NOT establish a receiver link', function(testCallback) {
      var testError = new Error();
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);
      cbs._senderLink.attach = sinon.stub().callsArg(0);
      cbs._senderLink.detach = sinon.stub().callsArg(0);
      cbs._receiverLink.attach = sinon.stub().callsArgWith(0, testError);
      cbs.attach(function(err) {
        assert.strictEqual(err, testError);
        assert(cbs._senderLink.detach.calledOnce, 'sender is detached if receiver fails to attach');
        testCallback();
      });
    });

    /*Tests_SRS_NODE_AMQP_CBS_16_007: [If given as an argument, the `attach` method shall call `callback` with a `null` error object if successful.]*/
    it('calls its callback with no error if successful', function(testCallback) {
      var fakeRheaSession = new EventEmitter();
      var cbs = new CBS(fakeRheaSession);
      var fakeRheaLink = new EventEmitter();
      var fakeContext = {receiver: fakeRheaLink};
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('receiver_open', fakeContext)});return fakeRheaLink;});
      cbs._senderLink.attach = sinon.stub().callsArg(0);
      cbs._senderLink.detach = sinon.stub().callsArg(0);
      cbs._receiverLink.on = sinon.spy();
      cbs._receiverLink.attach = sinon.stub().callsArgWith(0);
      cbs._receiverLink.detach = sinon.stub().callsArgWith(0);

      cbs.attach(function(err) {
        /*Tests_SRS_NODE_AMQP_CBS_16_003: [`attach` shall attach the sender link.]*/
        assert(cbs._senderLink.attach.calledOnce);
        /*Tests_SRS_NODE_AMQP_CBS_16_004: [`attach` shall attach the receiver link.]*/
        assert(cbs._receiverLink.attach.calledOnce);
        /*Tests_SRS_NODE_AMQP_CBS_16_005: [The `attach` method shall set up a listener for responses to put tokens on the `message` event of the receiver link.]*/
        assert(cbs._receiverLink.on.calledWith('message'));
        assert.isUndefined(err);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_AMQP_CBS_16_007: [If given as an argument, the `attach` method shall call `callback` with a `null` error object if successful.]*/
    it('calls the callback immediately if links are already attached', function(testCallback) {
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);

      var fakeRheaLink = new EventEmitter();
      var fakeContext = {receiver: fakeRheaLink};
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('receiver_open', fakeContext)});return fakeRheaLink;});
      cbs._senderLink.attach = sinon.stub().callsArg(0);
      cbs._senderLink.detach = sinon.stub().callsArg(0);
      cbs._receiverLink.attach = sinon.stub().callsArgWith(0);
      cbs._receiverLink.detach = sinon.stub().callsArgWith(0);

      cbs.attach(function() {
        assert(cbs._senderLink.attach.calledOnce);
        assert(cbs._receiverLink.attach.calledOnce);
        cbs.attach(function() {
          assert(cbs._senderLink.attach.calledOnce);
          assert(cbs._receiverLink.attach.calledOnce);
          testCallback();
        });
      });
    });
  });

  describe('#detach', function() {
    it('Returns immediately and does not throw if already detached', function(testCallback) {
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);
      cbs.detach(testCallback);
    });

    /*Tests_SRS_NODE_AMQP_CBS_16_008: [`detach` shall detach both sender and receiver links and return the state machine to the `detached` state.]*/
    it('detaches the links if they are attached', function(testCallback) {
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);

      var fakeRheaLink = new EventEmitter();
      //
      // We create the open_receiver stub because the receiver always gets an active listener when
      // the CBS attach method is invoked.
      //
      var fakeContext = {receiver: fakeRheaLink};
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {process.nextTick( () => {fakeRheaLink.emit('receiver_open', fakeContext)});return fakeRheaLink;});
      cbs._senderLink.attach = sinon.stub().callsArg(0);
      cbs._senderLink.detach = sinon.stub().callsArg(0);
      cbs._senderLink.forceDetach = sinon.stub();

      cbs._receiverLink.attach = sinon.stub().callsArgWith(0);
      cbs._receiverLink.detach = sinon.stub().callsArgWith(0);
      cbs._receiverLink.forceDetach = sinon.stub();

      cbs.attach(function () {
        assert(cbs._senderLink.attach.calledOnce);
        assert(cbs._receiverLink.attach.calledOnce);
        cbs.detach(function () {
          assert(cbs._senderLink.detach.calledOnce);
          assert(cbs._receiverLink.detach.calledOnce);
          assert(cbs._senderLink.forceDetach.notCalled);
          assert(cbs._receiverLink.forceDetach.notCalled);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_AMQP_CBS_16_008: [`detach` shall detach both sender and receiver links and return the state machine to the `detached` state.]*/
    it('works if called when links are being attached', function(testCallback) {
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);

      var fakeRheaReceiverLink = new EventEmitter();
      var fakeRheaSenderLink = new EventEmitter();
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      fakeRheaSenderLink.close = () => {};
      sinon.stub(fakeRheaSenderLink, 'close').callsFake(() => {
        fakeRheaSenderLink.emit('sender_close', fakeSenderContext);
      });
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });
      var amqpSenderDetachSpy = sinon.spy(cbs._senderLink, 'detach');
      var amqpReceiverDetachSpy = sinon.spy(cbs._receiverLink, 'detach');
      cbs._senderLink.forceDetach = sinon.stub();
      cbs._receiverLink.forceDetach = sinon.stub();

      cbs._senderLink._fsm.on('transition', function (data) {
        if (data.toState === 'attached') {
          cbs.detach(function () {
            assert(fakeRheaSession.open_sender.calledOnce, 'open sender not called once');
            assert(amqpSenderDetachSpy.calledOnce, 'detach NOT invoked on amqp SenderLink');
            assert(amqpReceiverDetachSpy.calledOnce, 'detach NOT invoked on amqp SenderLink');
            assert(cbs._senderLink.forceDetach.notCalled, 'force detach invoked on amqp SenderLink');
            assert(cbs._receiverLink.forceDetach.notCalled, 'force detach invoked on amqp ReceiverLink');
            testCallback();
          });
        }
      });
      cbs.attach(function() {});
    });
  });

  describe('#forceDetach', function () {
    /*Tests_SRS_NODE_AMQP_CBS_16_021: [The `forceDetach()` method shall return immediately if no link is attached.]*/
    it('does not do anything if the CBS state machine is already detached', function () {
      var cbs = new CBS({});
      assert.doesNotThrow(function () {
        cbs.forceDetach();
      });
    });

    /*Tests_SRS_NODE_AMQP_CBS_16_022: [The `forceDetach()` method shall call `forceDetach()` on all attached links.]*/
    it('forcefully detach the links if attached', function (testCallback) {
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);

      var fakeRheaReceiverLink = new EventEmitter();
      var fakeRheaSenderLink = new EventEmitter();
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaReceiverLink.remove = sinon.stub();
      fakeRheaSenderLink.remove = sinon.stub();
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });
      var amqpSenderForceDetachSpy = sinon.spy(cbs._senderLink, 'forceDetach');
      var amqpReceiverForceDetachSpy = sinon.spy(cbs._receiverLink, 'forceDetach');
      cbs._senderLink.detach = sinon.stub();
      cbs._receiverLink.detach = sinon.stub();

      cbs.attach(function () {
        assert(fakeRheaSession.open_sender.calledOnce, 'open sender NOT called once');
        assert(fakeRheaSession.open_receiver.calledOnce, 'open receiver NOT called once');
        cbs.forceDetach();
        assert(amqpSenderForceDetachSpy.calledOnce);
        assert(amqpReceiverForceDetachSpy.calledOnce);
        assert(cbs._senderLink.detach.notCalled);
        assert(cbs._senderLink.detach.notCalled);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_AMQP_CBS_16_022: [The `forceDetach()` method shall call `forceDetach()` on all attached links.]*/
    it('forcefully detach attached links if called while attaching', function (testCallback) {
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);

      var fakeRheaReceiverLink = new EventEmitter();
      var fakeRheaSenderLink = new EventEmitter();
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaReceiverLink.remove = sinon.stub();
      fakeRheaSenderLink.remove = sinon.stub();
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });
      var amqpSenderForceDetachSpy = sinon.spy(cbs._senderLink, 'forceDetach');
      var amqpReceiverForceDetachSpy = sinon.spy(cbs._receiverLink, 'forceDetach');
      cbs._senderLink.detach = sinon.stub();
      cbs._receiverLink.detach = sinon.stub();

      sinon.stub(fakeRheaReceiverLink, "on").callsFake(function (eventName) {
        if (eventName === 'message') {
          // sender is attached, receiver is attaching since we're registering for messages. good time to trigger a fake forceDetach
          assert(fakeRheaSession.open_sender.calledOnce, 'open sender NOT called once');
          assert(fakeRheaSession.open_receiver.calledOnce, 'open receiver NOT called once');
          cbs.forceDetach();
          assert(amqpSenderForceDetachSpy.calledOnce);
          assert(amqpReceiverForceDetachSpy.calledOnce);
          assert(cbs._senderLink.detach.notCalled);
          assert(cbs._senderLink.detach.notCalled);
          testCallback();
        }
      });
      cbs.attach(function () {});
    });
  });

  describe('#putToken', function() {
    [undefined, null, ''].forEach(function (badAudience){
      /*Tests_SRS_NODE_AMQP_CBS_16_009: [The `putToken` method shall throw a ReferenceError if the `audience` argument is falsy.]*/
      it('throws if audience is \'' + badAudience +'\'', function () {
        var cbs = new CBS({});
        assert.throws(function () {
          cbs.putToken(badAudience, 'sas', function () {});
        }, ReferenceError, '');
      });
    });

    [undefined, null, ''].forEach(function (badToken){
      /*Tests_SRS_NODE_AMQP_CBS_16_010: [The `putToken` method shall throw a ReferenceError if the `token` argument is falsy.]*/
      it('throws if sasToken is \'' + badToken +'\'', function () {
        var cbs = new CBS({});
        assert.throws(function () {
          cbs.putToken('audience', badToken, function () {});
        }, ReferenceError, '');
      });
    });

    it('attaches the CBS links if necessary and then succeeds', function(testCallback) {
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);

      var fakeRheaSenderLink = new EventEmitter();
      fakeRheaSenderLink.sendable = sinon.stub().returns(true);
      fakeRheaSenderLink.send = sinon.stub().returns({settled: true});
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      fakeRheaSenderLink.send = () => {};
      var fakeRheaReceiverLink = new EventEmitter();
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      sinon.stub(fakeRheaSenderLink, 'send').callsFake((messageBeingSent) => {
        var fakeDeliveryObject = {settled: true};
        var responseMessage = new AmqpMessage();
        responseMessage.properties = {};
        responseMessage.application_properties = {};
        responseMessage.correlation_id = messageBeingSent.message_id;
        responseMessage.application_properties['status-code'] = 200;
        process.nextTick(() => {
          fakeReceiverContext.message = responseMessage;
          fakeRheaReceiverLink.emit('message', fakeReceiverContext);
        });
        return fakeDeliveryObject;
      });
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });
      var amqpReceiverAttachSpy = sinon.spy(cbs._receiverLink, 'attach');
      var amqpSenderAttachSpy = sinon.spy(cbs._senderLink, 'attach');
      cbs._receiverLink.accept = sinon.stub();

      assert.isFalse(amqpSenderAttachSpy.called, 'amqp SenderLink is attached');
      assert.isFalse(amqpReceiverAttachSpy.called, 'amqp ReceiverLink is attached');
      assert.isFalse(fakeRheaSession.open_sender.called, 'senders prior to the putToken');
      assert.isFalse(fakeRheaSession.open_receiver.called, 'senders prior to the putToken');
      cbs.putToken('audience', 'token', function(err) {
        assert.isNotOk(err, 'the put token succeeded');
        assert(amqpSenderAttachSpy.calledOnce, 'amqp SenderLink attach NOT called once');
        assert(amqpReceiverAttachSpy.calledOnce, 'amqp ReceiverLink attach NOT called once');
        assert(fakeRheaSenderLink.send.calledOnce, 'rhea send NOT called once');
        assert(fakeRheaSession.open_sender.calledOnce, 'more than one sender created');
        assert(fakeRheaSession.open_receiver.calledOnce, 'more than one receiver created');
        testCallback();
      });
    });

    it('fails if it cannot attach the CBS links', function(testCallback) {
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);
      var fakeError = new Error('fake error');

      cbs._senderLink.detach = sinon.stub().callsArg(0);
      cbs._receiverLink.detach = sinon.stub().callsArg(0);
      var fakeRheaSenderLink = new EventEmitter();
      fakeRheaSenderLink.sendable = sinon.stub().returns(true);
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      var fakeRheaReceiverLink = new EventEmitter();
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.error = fakeError;
          fakeRheaReceiverLink.emit('receiver_error', fakeReceiverContext);
          fakeRheaReceiverLink.error = undefined;
          fakeRheaReceiverLink.emit('receiver_close', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });

      cbs.putToken('audience', 'token', function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    it('succeeds even if called while the link are being attached', function(testCallback) {
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);

      var fakeRheaSenderLink = new EventEmitter();
      fakeRheaSenderLink.sendable = sinon.stub().returns(true);
      fakeRheaSenderLink.send = sinon.stub().returns({settled: true});
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      fakeRheaSenderLink.send = () => {};
      var fakeRheaReceiverLink = new EventEmitter();
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      sinon.stub(fakeRheaSenderLink, 'send').callsFake((messageBeingSent) => {
        var fakeDeliveryObject = {settled: true};
        var responseMessage = new AmqpMessage();
        responseMessage.properties = {};
        responseMessage.application_properties = {};
        responseMessage.correlation_id = messageBeingSent.message_id;
        responseMessage.application_properties['status-code'] = 200;
        process.nextTick(() => {
          fakeReceiverContext.message = responseMessage;
          fakeRheaReceiverLink.emit('message', fakeReceiverContext);
        });
        return fakeDeliveryObject;
      });
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaSession.open_receiver = sinon.stub().returns(fakeRheaReceiverLink);
      cbs._receiverLink.accept = sinon.stub();

      cbs.attach();
      cbs.putToken('audience', 'token', function(err) {
        testCallback(err);
      });
      process.nextTick( () => {
        fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
      });
    });

    it('creates a timer if this is the first pending put token operation', function(testCallback) {
      this.clock = sinon.useFakeTimers();
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);

      var fakeRheaSenderLink = new EventEmitter();
      fakeRheaSenderLink.sendable = sinon.stub().returns(true);
      fakeRheaSenderLink.send = sinon.stub().returns({settled: true});
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      fakeRheaSenderLink.send = () => {};
      var fakeRheaReceiverLink = new EventEmitter();
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      sinon.stub(fakeRheaSenderLink, 'send').callsFake((messageBeingSent) => {
        var fakeDeliveryObject = {settled: true};
        var responseMessage = new AmqpMessage();
        responseMessage.properties = {};
        responseMessage.application_properties = {};
        responseMessage.correlation_id = messageBeingSent.message_id;
        responseMessage.application_properties['status-code'] = 200;
        process.nextTick(() => {
          fakeReceiverContext.message = responseMessage;
          fakeRheaReceiverLink.emit('message', fakeReceiverContext);
        });
        return fakeDeliveryObject;
      });
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });
      cbs._receiverLink.accept = sinon.stub();

      var spyRemoveExpiredPutTokens = sinon.spy(cbs, '_removeExpiredPutTokens');
      cbs.attach(function(err) {
        assert.isNotOk(err, 'initialization passed');
        cbs._putToken.numberOfSecondsToTimeout = 120;
        cbs._putToken.putTokenTimeOutExaminationInterval = 10000;
        cbs.putToken('audience','sasToken', function () {});
        this.clock.tick(9999);
        assert.isTrue(spyRemoveExpiredPutTokens.notCalled, ' removeExpiredPutTokens should not have been called.');
        this.clock.tick(2);
        assert.isTrue(spyRemoveExpiredPutTokens.calledOnce, ' removeExpiredPutTokens should have been called once.');
        clearTimeout(cbs._putToken.timeoutTimer);
        this.clock.restore();
        testCallback();
      }.bind(this));
    });

    it('Two putTokens in succession still causes only one invocation of the timer callback', function(testCallback) {
      this.clock = sinon.useFakeTimers();
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);

      var fakeRheaSenderLink = new EventEmitter();
      fakeRheaSenderLink.sendable = sinon.stub().returns(true);
      fakeRheaSenderLink.send = sinon.stub().returns({settled: true});
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      fakeRheaSenderLink.send = () => {};
      var fakeRheaReceiverLink = new EventEmitter();
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      sinon.stub(fakeRheaSenderLink, 'send').callsFake((messageBeingSent) => {
        var fakeDeliveryObject = {settled: true};
        var responseMessage = new AmqpMessage();
        responseMessage.properties = {};
        responseMessage.application_properties = {};
        responseMessage.correlation_id = messageBeingSent.message_id;
        responseMessage.application_properties['status-code'] = 200;
        process.nextTick(() => {
          fakeReceiverContext.message = responseMessage;
          fakeRheaReceiverLink.emit('message', fakeReceiverContext);
        });
        return fakeDeliveryObject;
      });
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });
      cbs._receiverLink.accept = sinon.stub();

      var spyRemoveExpiredPutTokens = sinon.spy(cbs, '_removeExpiredPutTokens');
      cbs.attach(function(err) {
        assert.isNotOk(err, 'initialization passed');
        cbs._putToken.numberOfSecondsToTimeout = 120;
        cbs._putToken.putTokenTimeOutExaminationInterval = 10000;
        cbs.putToken('audience','sasToken', function () {});
        this.clock.tick(500);
        assert.isTrue(spyRemoveExpiredPutTokens.notCalled, ' removeExpiredPutTokens should not have been called.');
        cbs.putToken('audience1','sasToken2', function () {});
        this.clock.tick(500);
        assert.isTrue(spyRemoveExpiredPutTokens.notCalled, ' removeExpiredPutTokens should not have been called.');
        this.clock.tick(8999);
        assert.isTrue(spyRemoveExpiredPutTokens.notCalled, ' removeExpiredPutTokens should not have been called.');
        this.clock.tick(6000);
        assert.isTrue(spyRemoveExpiredPutTokens.calledOnce, ' removeExpiredPutTokens should have been called once.');
        clearTimeout(cbs._putToken.timeoutTimer);
        this.clock.restore();
        testCallback();
      }.bind(this));
    });

    /*SRS_NODE_AMQP_CBS_16_011: [The `putToken` method shall construct an amqp message that contains the following application properties:
    ```
    'operation': 'put-token'
    'type': 'servicebus.windows.net:sastoken'
    'name': <audience>
    ```
    and system properties of
    ```
    'to': '$cbs'
    'messageId': <uuid>
    'reply_to': 'cbs'
    ```
    and a body containing `<sasToken>`.]*/
    /*Tests_SRS_NODE_AMQP_CBS_16_012: [The `putToken` method shall send this message over the `$cbs` sender link.]*/
    it('sends a put token operation', function(testCallback) {
      var fakeUuids = [uuid.v4()];
      var uuidStub = sinon.stub(uuid,'v4');
      uuidStub.onCall(2).returns(fakeUuids[0]);
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);
      var responseMessage = {};

      var fakeRheaSenderLink = new EventEmitter();
      fakeRheaSenderLink.sendable = sinon.stub().returns(true);
      fakeRheaSenderLink.send = sinon.stub().returns({settled: true});
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      fakeRheaSenderLink.send = () => {};
      var fakeRheaReceiverLink = new EventEmitter();
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      sinon.stub(fakeRheaSenderLink, 'send').callsFake((messageBeingSent) => {
        var fakeDeliveryObject = {settled: true};
        responseMessage = new AmqpMessage();
        responseMessage.properties = {};
        responseMessage.application_properties = {};
        responseMessage.correlation_id = messageBeingSent.message_id;
        responseMessage.application_properties['status-code'] = 200;
        process.nextTick(() => {
          fakeReceiverContext.message = responseMessage;
          fakeRheaReceiverLink.emit('message', fakeReceiverContext);
        });
        return fakeDeliveryObject;
      });
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });
      cbs._receiverLink.accept = sinon.stub();

      cbs.attach(function(err) {
        assert.isNotOk(err, 'initialization passed');
        cbs.putToken('myAudience', 'my token');
        uuid.v4.restore();
        assert.equal(fakeRheaSenderLink.send.args[0][0].application_properties.operation, 'put-token', 'operation application property not equal');
        assert.equal(fakeRheaSenderLink.send.args[0][0].application_properties.type, 'servicebus.windows.net:sastoken', 'type application property not equal');
        assert.equal(fakeRheaSenderLink.send.args[0][0].application_properties.name, 'myAudience', 'name application property not equal');
        assert.equal(fakeRheaSenderLink.send.args[0][0].to, '$cbs', 'to application property not equal');
        //
        // NOTE NOTE: The most likely reason this would fail is that the an change in the number
        // of uuid.v4 calls were made.
        //
        assert.equal(fakeRheaSenderLink.send.args[0][0].message_id, fakeUuids[0], 'messageId n property not equal');
        assert.equal(fakeRheaSenderLink.send.args[0][0].reply_to, 'cbs', 'reply_to property not equal');
        assert.isTrue(fakeRheaSenderLink.send.args[0][0].body === 'my token', 'body of put token not the sas token');
        clearTimeout(cbs._putToken.timeoutTimer);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_AMQP_CBS_16_013: [The `putToken` method shall call `callback` (if supplied) if the `send` generates an error such that no response from the service will be forthcoming.]*/
    it('sends two put tokens erroring the second , ensuring the first remains', function(testCallback) {
      var fakeUuids = [uuid.v4(), uuid.v4()];
      var uuidStub = sinon.stub(uuid,'v4');
      uuidStub.onCall(2).returns(fakeUuids[0]);
      uuidStub.onCall(3).returns(fakeUuids[1]);

      var fakeRheaSession = new EventEmitter();
      var sendCounts = 0;

      var cbs = new CBS(fakeRheaSession);

      var fakeRheaSenderLink = new EventEmitter();
      fakeRheaSenderLink.sendable = sinon.stub().returns(true);
      fakeRheaSenderLink.send = sinon.stub().returns({settled: true});
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      fakeRheaSenderLink.send = () => {};
      var fakeRheaReceiverLink = new EventEmitter();
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      sinon.stub(fakeRheaSenderLink, 'send').callsFake(() => {
        sendCounts++;
        var fakeDeliveryObject = {settled: sendCounts === 1, id: sendCounts};
        if (sendCounts !== 1) {
          process.nextTick(() => {
            fakeRheaSenderLink.emit('rejected', {delivery: {id: 2, remote_state: {error: {condition: 'rejected'}}}, sender: fakeRheaSenderLink})
          });
        }
        return fakeDeliveryObject;
      });
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });
      cbs._receiverLink.accept = sinon.stub();

      cbs.attach(function(err) {
        assert.isNotOk(err, 'initialization passed');
        cbs.putToken('first audience', 'first token', function () {
          assert.fail('This callback for the first put token should not have been called');
        });
        cbs.putToken('second audience', 'second token', function (err) {
          assert(err, 'error not returned on second send');
          //
          // Make sure that the first put token is still outstanding.
          //
          assert.equal(cbs._putToken.outstandingPutTokens.length, 1, 'outstanding token array length' );
          assert.equal(cbs._putToken.outstandingPutTokens[0].correlationId, fakeUuids[0], 'outstanding token correlation id ');
          clearTimeout(cbs._putToken.timeoutTimer);
          testCallback();
        });
        uuid.v4.restore();
      });
    });

    /*Tests_SRS_NODE_AMQP_CBS_16_014: [The `putToken` method will time out the put token operation if no response is returned within a configurable number of seconds.]*/
    /*Tests_SRS_NODE_AMQP_CBS_16_015: [The `putToken` method will invoke the `callback` (if supplied) with an error object if the put token operation timed out.]*/
    it('Three put tokens, two timeout initially, third later', function(testCallback) {
      this.clock = sinon.useFakeTimers();
      var fakeUuids = [uuid.v4(), uuid.v4(), uuid.v4()];
      var uuidStub = sinon.stub(uuid,'v4');
      uuidStub.onCall(2).returns(fakeUuids[0]);
      uuidStub.onCall(3).returns(fakeUuids[1]);
      uuidStub.onCall(4).returns(fakeUuids[2]);

      this.clock = sinon.useFakeTimers();
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);

      var fakeRheaSenderLink = new EventEmitter();
      fakeRheaSenderLink.sendable = sinon.stub().returns(true);
      fakeRheaSenderLink.send = sinon.stub().returns({settled: true});
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      var fakeRheaReceiverLink = new EventEmitter();
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      fakeRheaSenderLink.send = sinon.stub.returns({settled: true});
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });
      cbs._receiverLink.accept = sinon.stub();

      cbs.attach(function(err) {
        assert.isNotOk(err, 'initialization passed');
        cbs._putToken.numberOfSecondsToTimeout = 120;
        cbs._putToken.putTokenTimeOutExaminationInterval = 10000;
        cbs.putToken('first audience', 'first token', function (err) {
          assert.instanceOf(err, errors.TimeoutError);
          //
          // There should only be one outstanding put token when this first put token is timed out.
          //
          assert.equal(cbs._putToken.outstandingPutTokens.length, 1, 'For the first put token call back invocation outstanding remaining ');
          assert.equal(cbs._putToken.outstandingPutTokens[0].correlationId, fakeUuids[2], 'For the first put token callback the outstanding correlation id. ');
        });
        this.clock.tick(5000); // 5 seconds between first and second
        cbs.putToken('second audience', 'second token', function (err) {
          assert.instanceOf(err, errors.TimeoutError);
          //
          // There should only be one outstanding put token when this second put token is timed out.
          //
          assert.equal(cbs._putToken.outstandingPutTokens.length, 1, 'For the second put token call back invocation outstanding remaining ');
          assert.equal(cbs._putToken.outstandingPutTokens[0].correlationId, fakeUuids[2], 'For the second put token callback the outstanding correlation id. ');
        });
        this.clock.tick(30000); // 30 seconds more till the third
        cbs.putToken('third audience', 'third token', function (err) {
          assert.instanceOf(err, errors.TimeoutError);
          //
          // There should be no outstanding put token when this put token is timed out.
          //
          assert.equal(cbs._putToken.outstandingPutTokens.length, 0, 'For the third put token call back invocation outstanding remaining ');
          this.clock.restore();
          testCallback();
        }.bind(this));
        this.clock.tick(100000); // 100 seconds more should have resulted in timeouts for the first two.
        process.nextTick(function () {
          this.clock.tick(40000); // 40 seconds more should have resulted in timeouts for the third.
        }.bind(this));
        uuid.v4.restore();
      }.bind(this));
    });

    /*Tests_SRS_NODE_AMQP_CBS_16_019: [A put token response of 200 will invoke `putTokenCallback` with null parameters.]*/
    it('Three put tokens, first and third timeout eventually, second completes successfully', function(testCallback) {
      this.clock = sinon.useFakeTimers();
      var fakeUuids = [uuid.v4(), uuid.v4(), uuid.v4()];
      var uuidStub = sinon.stub(uuid,'v4');
      uuidStub.onCall(2).returns(fakeUuids[0]);
      uuidStub.onCall(3).returns(fakeUuids[1]);
      uuidStub.onCall(4).returns(fakeUuids[2]);

      this.clock = sinon.useFakeTimers();
      var fakeRheaSession = new EventEmitter();

      var cbs = new CBS(fakeRheaSession);

      var fakeRheaSenderLink = new EventEmitter();
      fakeRheaSenderLink.sendable = sinon.stub().returns(true);
      fakeRheaSenderLink.send = sinon.stub().returns({settled: true});
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      var fakeRheaReceiverLink = new EventEmitter();
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      fakeRheaSenderLink.send = sinon.stub.returns({settled: true});
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });
      cbs._receiverLink.accept = sinon.stub();
      var responseMessage = new AmqpMessage();
      responseMessage.properties = {};
      responseMessage.application_properties = {};
      responseMessage.correlation_id = fakeUuids[1];
      responseMessage.application_properties['status-code'] = 200;

      cbs.attach(function(err) {
        assert.isNotOk(err, 'initialization passed');
        cbs._putToken.numberOfSecondsToTimeout = 120;
        cbs._putToken.putTokenTimeOutExaminationInterval = 10000;
        cbs.putToken('first audience', 'first token', function (err) {
          assert.instanceOf(err, errors.TimeoutError);
          //
          // There should only be one outstanding put token when this first put token is timed out.
          //
          assert.equal(cbs._putToken.outstandingPutTokens.length, 1, 'For the first put token call back invocation outstanding remaining ');
          assert.equal(cbs._putToken.outstandingPutTokens[0].correlationId, fakeUuids[2], 'For the second put token callback the first outstanding correlation id. ');
        });
        this.clock.tick(20000); // 20 seconds between first and second
        cbs.putToken('second audience', 'second token', function (err, putTokenResult) {
          assert.isNotOk(err,'The error object passed');
          assert.isNotOk(putTokenResult,'The result object passed');
          //
          // There should be two outstanding put token when this second put token succeeds.
          //
          assert.equal(cbs._putToken.outstandingPutTokens.length, 2, 'For the second put token call back invocation outstanding remaining ');
          assert.equal(cbs._putToken.outstandingPutTokens[0].correlationId, fakeUuids[0], 'For the second put token callback the first outstanding correlation id. ');
          assert.equal(cbs._putToken.outstandingPutTokens[1].correlationId, fakeUuids[2], 'For the second put token callback the second outstanding correlation id. ');
        });
        this.clock.tick(30000); // 30 seconds more till the third.  We are at 50 seconds from the start of the first put token.
        cbs.putToken('third audience', 'third token', function (err) {
          assert.instanceOf(err, errors.TimeoutError);
          //
          // There should be no outstanding put token when this put token is timed out.
          //
          assert.equal(cbs._putToken.outstandingPutTokens.length, 0, 'For the third put token call back invocation outstanding remaining ');
          assert(cbs._receiverLink.accept.calledOnce);
          this.clock.restore();
          testCallback();
        }.bind(this));
        this.clock.tick(40000); // Let them sit in the outstanding list for a bit.  We should be at 1 minute 30 seconds at this point.
        process.nextTick(function () {
          //
          // Emit a put token response which should complete the second put token.
          //
          fakeReceiverContext.message = responseMessage;
          fakeRheaReceiverLink.emit('message', fakeReceiverContext);
          this.clock.tick(10000); // Move forward a bit We should be at 1 minute 40 seconds after the start of the first put token.
          process.nextTick(function () {
            assert.equal(cbs._putToken.outstandingPutTokens.length, 2, 'First time stop after completing the second put token');
            assert.equal(cbs._putToken.outstandingPutTokens[0].correlationId, fakeUuids[0], 'First time stop - the first outstanding correlation id. ');
            assert.equal(cbs._putToken.outstandingPutTokens[1].correlationId, fakeUuids[2], 'First time stop - the second outstanding correlation id. ');
            //
            // At this point the second put token is done.  Move forward enough time to complete the first put token
            //
            this.clock.tick(30000); // Move forward 30 seconds. We should be at 2 minutes 20 seconds after the start of the first put token.
            process.nextTick(function () {
              assert.equal(cbs._putToken.outstandingPutTokens.length, 1, 'Second time stop after completing the second put token');
              assert.equal(cbs._putToken.outstandingPutTokens[0].correlationId, fakeUuids[2], 'Second time stop - the third put token should be remaining.');
              //
              // At this point the first put token is done (timed out).  Move forward enough time to complete the third put token.
              //
              this.clock.tick(60000); // Move forward 60 seconds. We should be at 3 minutes 20 seconds after the start of the first put token.  This should time out the third put token
            }.bind(this));
          }.bind(this));
        }.bind(this));
        uuid.v4.restore();
      }.bind(this));
    });

    /*Tests_SRS_NODE_AMQP_CBS_16_018: [A put token response not equal to 200 will invoke `putTokenCallback` with an error object of UnauthorizedError.]*/
    it('Status result not equal to 200 completes the put token with an error.', function(testCallback) {
      var fakeRheaSession = new EventEmitter();
      var cbs = new CBS(fakeRheaSession);

      var fakeRheaSenderLink = new EventEmitter();
      fakeRheaSenderLink.sendable = sinon.stub().returns(true);
      fakeRheaSenderLink.send = () => {};
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      var fakeRheaReceiverLink = new EventEmitter();
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      sinon.stub(fakeRheaSenderLink, 'send').callsFake((messageBeingSent) => {
        var fakeDeliveryObject = {settled: true};
        var responseMessage = new AmqpMessage();
        responseMessage.properties = {};
        responseMessage.application_properties = {};
        responseMessage.correlation_id = messageBeingSent.message_id;
        responseMessage.application_properties['status-description'] = 'cryptic message';
        responseMessage.application_properties['status-code'] = 201;
        process.nextTick(() => {
          fakeReceiverContext.message = responseMessage;
          fakeRheaReceiverLink.emit('message', fakeReceiverContext);
        });
        return fakeDeliveryObject;
      });
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });
      cbs._receiverLink.accept = sinon.stub();

      cbs.attach(function(err) {
        assert.isNotOk(err, 'initialization passed');
        cbs.putToken('audience', 'token', function (err, putTokenResult) {
          assert.instanceOf(err, errors.UnauthorizedError);
          assert.isNotOk(putTokenResult,'The result object passed');
          assert.equal(cbs._putToken.outstandingPutTokens.length, 0, 'For put token call nothing should be outstanding.');
          assert(cbs._receiverLink.accept.calledOnce);
          testCallback();
        });
      }.bind(this));
    });

    it('Do a put token with no callback that completes successfully', function(testCallback) {
      var fakeRheaSession = new EventEmitter();
      var cbs = new CBS(fakeRheaSession);

      var responseMessage = {};
      var fakeRheaSenderLink = new EventEmitter();
      fakeRheaSenderLink.sendable = sinon.stub().returns(true);
      fakeRheaSenderLink.send = () => {};
      var fakeSenderContext = {sender: fakeRheaSenderLink};
      var fakeRheaReceiverLink = new EventEmitter();
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink};
      sinon.stub(fakeRheaSenderLink, 'send').callsFake((messageBeingSent) => {
        var fakeDeliveryObject = {settled: true};
        responseMessage = new AmqpMessage();
        responseMessage.properties = {};
        responseMessage.application_properties = {};
        responseMessage.correlation_id = messageBeingSent.message_id;
        responseMessage.application_properties['status-code'] = 200;
        return fakeDeliveryObject;
      });
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });
      cbs._receiverLink.accept = sinon.stub();

      cbs.attach(function(err) {
        assert.isNotOk(err, 'initialization passed');
        cbs.putToken('first audience', 'first token');
        assert.equal(cbs._putToken.outstandingPutTokens.length, 1, 'Should be one put token outstanding.');
        //
        // Emit a put token response which should complete the put token.
        //
        fakeReceiverContext.message = responseMessage;
        fakeRheaReceiverLink.emit('message', fakeReceiverContext);
        process.nextTick(function () {
          assert.equal(cbs._putToken.outstandingPutTokens.length, 0, 'First time stop all should be done');
          assert(cbs._receiverLink.accept.calledOnce);
          testCallback();
        }.bind(this));
      }.bind(this));
    });
  });

  describe('#events', function() {
    /*Tests_SRS_NODE_AMQP_CBS_06_001: [If in the attached state, either the sender or the receiver links gets an error, an error of `azure-iot-amqp-base:error-indicated` will have been indicated on the container object and the cbs will remain in the attached state.  The owner of the cbs MUST detach.] */
    it('remains in the attached state when error emitted to container from link', function(testCallback) {
      var fakeRheaSession = new EventEmitter();
      var cbs = new CBS(fakeRheaSession);
      var fakeAmqpError = {condition: 'fakeAmqpError'};
      var fakeContainer = new EventEmitter();
      var detachErrorIndiciated = false;
      fakeContainer.on('azure-iot-amqp-base:error-indicated', (err) => {
        detachErrorIndicated = true;
        assert(err.condition, 'error indicated not an amqp error');
        assert.strictEqual(err.condition, fakeAmqpError.condition, 'incorrect amqp error indicated');
      });

      var fakeRheaSenderLink = new EventEmitter();
      fakeRheaSenderLink.sendable = sinon.stub().returns(true);
      fakeRheaSenderLink.send = () => {};
      var fakeSenderContext = {sender: fakeRheaSenderLink, container: fakeContainer, session: fakeRheaSession};
      var fakeRheaReceiverLink = new EventEmitter();
      var fakeReceiverContext = {receiver: fakeRheaReceiverLink, container: fakeContainer, session: fakeRheaSession};
      fakeRheaSession.open_sender = () => {};
      sinon.stub(fakeRheaSession, 'open_sender').callsFake(() => {
        process.nextTick( () => {
          fakeRheaSenderLink.emit('sender_open', fakeSenderContext);
        });
        return fakeRheaSenderLink;
      });
      fakeRheaSession.open_receiver = () => {};
      sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {
        process.nextTick( () => {
          fakeRheaReceiverLink.emit('receiver_open', fakeReceiverContext);
        });
        return fakeRheaReceiverLink;
      });
      cbs._receiverLink.accept = sinon.stub();

      cbs.attach(function(err) {
        assert.isNotOk(err, 'error was indicated on the attach');
        assert.strictEqual(cbs._fsm.state, 'attached', 'cbs state machine in an improper state');
        fakeRheaSenderLink.error = fakeAmqpError;
        fakeRheaSenderLink.emit('sender_error', fakeSenderContext);
        fakeRheaSenderLink.error = undefined;
        fakeRheaSenderLink.emit('sender_close', fakeSenderContext);
        assert(detachErrorIndicated, 'No error indicated to container');
        assert.strictEqual(cbs._fsm.state, 'attached', 'cbs state machine improperly transitioned from attach');
        testCallback();
      });
    });
  });
});
