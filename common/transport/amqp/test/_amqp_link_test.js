var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var ReceiverLink = require('../lib/receiver_link.js').ReceiverLink;
var SenderLink = require('../lib/sender_link.js').SenderLink;
var AmqpMessage = require('../lib/amqp_message.js').AmqpMessage;

[
  {
    linkClass: ReceiverLink,
    direction: 'source',
    kindOfLink: 'receiver',
    openMethod: 'open_receiver',
    detachMethod: 'close',
    rheaCloseEvent: 'receiver_close',
    rheaOpenEvent: 'receiver_open',
    rheaDisconnectEvent: 'disconnected',
    rheaErrorEvent: 'receiver_error'
  },
  {
    linkClass: SenderLink,
    direction: 'target',
    kindOfLink: 'sender',
    openMethod: 'open_sender',
    detachMethod: 'close',
    rheaCloseEvent: 'sender_close',
    rheaOpenEvent: 'sender_open',
    rheaDisconnectEvent: 'disconnected',
    rheaErrorEvent: 'sender_error'
  }
].forEach(function (testConfig) {
  describe(testConfig.linkClass.name, function () {
    describe('#constructor', function () {
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_002: [** The `SenderLink` class shall inherit from `EventEmitter`. **]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_002: [The `ReceiverLink` class shall inherit from `EventEmitter`.]*/
      it('inherits from EventEmitter', function () {
        var link = new testConfig.linkClass('link', null, {});
        assert.instanceOf(link, EventEmitter);
      });

      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_003: [** The `SenderLink` class shall implement the `AmqpLink` interface. **]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_003: [The `ReceiverLink` class shall implement the `AmqpLink` interface.]*/
      it('implements the AmqpLink interface', function () {
        var link = new testConfig.linkClass('link', null, {});
        assert.isFunction(link.attach);
        assert.isFunction(link.detach);
      });

      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_001: [** The `SenderLink` internal state machine shall be initialized in the `detached` state. **]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_001: [The `ReceiverLink` internal state machine shall be initialized in the `detached` state.]*/
      it('initializes the internal state machine to a \'detached\' state', function () {
        var link = new testConfig.linkClass('link', null, {});
        assert.strictEqual(link._fsm.state, 'detached');
      });
    });

    describe('#attach', function () {
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_004: [The `attach` method shall use the stored instance of the `rhea` session object to attach a new link object with the combined `linkAddress` and `linkOptions` provided when creating the `SenderLink` instance.]*/
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_022: [The `attach` method shall call the `callback` if the link was successfully attached.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_004: [The `attach` method shall use the stored instance of the `rhea` session object to attach a new link object with the combined `linkAddress` and `linkOptions` provided when creating the `ReceiverLink` instance.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_020: [The `attach` method shall call the `callback` if the link was successfully attached.]*/
      it('attaches a new link using the rhea session object', function (testCallback) {
        var fakeLinkAddress = 'link';
        var fakeLinkOptions = {};
        var fakeContext = {};
        fakeContext[testConfig.kindOfLink] = new EventEmitter();
        fakeLinkOptions[testConfig.direction] = fakeLinkAddress;
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession[testConfig.openMethod] = () => {};
        sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {fakeRheaSession.emit(testConfig.rheaOpenEvent, fakeContext)});

        var link = new testConfig.linkClass(fakeLinkAddress, {}, fakeRheaSession);
        link.attach(function () {
          assert(fakeRheaSession[testConfig.openMethod].calledWith(fakeLinkOptions));
          testCallback();
        });
      });

      it('does not create a new link if already attached', function (testCallback) {
        var fakeLinkAddress = 'link';
        var fakeLinkOptions = {};
        var fakeContext = {};
        fakeContext[testConfig.kindOfLink] = new EventEmitter();
        fakeLinkOptions[testConfig.direction] = fakeLinkAddress;
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession[testConfig.openMethod] = () => {};
        sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {fakeRheaSession.emit(testConfig.rheaOpenEvent, fakeContext)});

        var link = new testConfig.linkClass(fakeLinkAddress, {}, fakeRheaSession);
        link.attach(function () {
          // now successfully attached
          assert.isTrue(fakeRheaSession[testConfig.openMethod].calledOnce);
          link.attach(function () {
            assert.isTrue(fakeRheaSession[testConfig.openMethod].calledOnce); // would be false if createReceiver had been called twice
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_008: [If the `rhea` session fails to create the link the `callback` function shall be called with this error object.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_008: [If the `rhea` session fails to create the link the `callback` function shall be called with this error object.]*/
      it('calls the callback with an error if attaching the link fails', function (testCallback) {
        var fakeLinkAddress = 'link';
        var fakeError = new Error('fake error');
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.name = 'session';
        var fakeRheaSessionContext = {session: fakeRheaSession};
        fakeRheaSession.error = fakeError;
        fakeRheaSession[testConfig.openMethod] = () => {};
        sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {fakeRheaSession.emit(testConfig.rheaErrorEvent, fakeRheaSessionContext)});

        var link = new testConfig.linkClass('link', null, fakeRheaSession);
        link.attach(function (err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_006: [The `SenderLink` object should subscribe to the `sender_close` event of the newly created `rhea` link object.]*/
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_007: [The `SenderLink` object should subscribe to the `error` event of the newly created `rhea` link object.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_006: [The `ReceiverLink` object should subscribe to the `receiver_close` event of the newly created `rhea` link object.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_007: [The `ReceiverLink` object should subscribe to the `error` event of the newly created `rhea` link object.]*/
      it('subscribes to the ' + testConfig.kindOfLink + '_close and ' + testConfig.kindOfLink +  '_error events', function (testCallback) {
        var fakeLinkAddress = 'link';
        var fakeContext = {};
        fakeContext[testConfig.kindOfLink] = new EventEmitter();
        var fakeRheaSession = new EventEmitter();
        sinon.spy(fakeContext[testConfig.kindOfLink], 'on');
        fakeRheaSession[testConfig.openMethod] = () => {};
        sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {fakeRheaSession.emit(testConfig.rheaOpenEvent, fakeContext)});

        var link = new testConfig.linkClass('link', {}, fakeRheaSession);
        link.attach(function () {
          assert(fakeContext[testConfig.kindOfLink].on.calledWith(testConfig.kindOfLink + '_close'));
          assert(fakeContext[testConfig.kindOfLink].on.calledWith(testConfig.kindOfLink + '_error'));
          testCallback();
        });
      });
    });

    describe('#detach', function () {
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_009: [The `detach` method shall detach the link created by `rhea`.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_009: [The `detach` method shall detach the link created by `rhea`.]*/
      it('detaches the link if it is attached', function (testCallback) {
        var fakeContext = {};
        var fakeRheaLink = new EventEmitter();
        fakeContext[testConfig.kindOfLink] = fakeRheaLink;
        fakeRheaLink[testConfig.detachMethod] = () => {};
        sinon.stub(fakeRheaLink, testConfig.detachMethod).callsFake(() => {fakeRheaLink.emit(testConfig.rheaCloseEvent, fakeContext)});
        fakeRheaLink.remove = sinon.stub();
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession[testConfig.openMethod] = () => {};
        sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {fakeRheaSession.emit(testConfig.rheaOpenEvent, fakeContext)});

        var link = new testConfig.linkClass('link', {}, fakeRheaSession);
        link.attach(function () {
          link.detach(function () {
            assert(fakeRheaLink[testConfig.detachMethod].calledOnce);
            assert(fakeRheaLink.remove.notCalled);
            testCallback();
          });
        });
      });

      it('does not do anything if the link is already detached', function (testCallback) {
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession['open_' + testConfig.kindOfLink] = function () { assert.fail('should not try to create a receiver'); };

        var link = new testConfig.linkClass('link', {}, fakeRheaSession);
        link.detach(testCallback);
      });

      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_017: [The `detach` method shall return the state machine to the `detached` state.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_010: [The `detach` method shall return the state machine to the `detached` state.]*/
      it('returns to the detached state if called while attaching', function (testCallback) {
        var fakeRheaLink = new EventEmitter();
        fakeRheaLink[testConfig.detachMethod] = () => {};
        sinon.stub(fakeRheaLink, testConfig.detachMethod).callsFake(() => {fakeRheaLink.emit(testConfig.rheaCloseEvent)});
        fakeRheaLink.forceDetach = sinon.stub();
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession[testConfig.openMethod] = () => {};
        sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {fakeRheaSession.emit(testConfig.rheaOpenEvent)});

        var link = new testConfig.linkClass('link', {}, fakeRheaSession);
        link._fsm.on('transition', function (data) {
          if (data.toState === 'attaching') {
            link.detach();
          } else if (data.toState === 'detached') {
            testCallback();
          }
        });
        link.attach(function () {});
      });

      it('calls the callback with an error if there is an error detaching the underlying rhea object', function (testCallback) {
        var fakeRheaLink = new EventEmitter();
        fakeRheaLink.name = 'link';
        var fakeContext = {};
        fakeContext[testConfig.kindOfLink] = fakeRheaLink;
        var fakeError = new Error('fake error');
        fakeRheaLink[testConfig.detachMethod] = () => {};
        sinon.stub(fakeRheaLink, testConfig.detachMethod).callsFake(() => {fakeRheaLink.error = fakeError; fakeRheaLink.emit(testConfig.rheaErrorEvent, fakeContext)});
        fakeRheaLink.remove = sinon.stub();
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession[testConfig.openMethod] = () => {};
        sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {fakeRheaSession.emit(testConfig.rheaOpenEvent, fakeContext)});

        var link = new testConfig.linkClass('link', {}, fakeRheaSession);
        link.attach(function () {
          link.detach(function (err) {
            assert(fakeRheaLink[testConfig.detachMethod].calledOnce);
            assert(fakeRheaLink.remove.notCalled);
            assert.strictEqual(err, fakeError);
            testCallback();
          });
        });
      });
    });

    describe('forceDetach', function() {
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_028: [The `forceDetach` method shall return immediately if the link is already detached.]*/
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_026: [The `forceDetach` method shall return immediately if the link is already detached.]*/
      it('returns if the link is already detached', function () {
        var fakeRheaLink = new EventEmitter();
        fakeRheaLink[testConfig.detachMethod] = () => {};
        sinon.stub(fakeRheaLink, testConfig.detachMethod).callsFake(() => {fakeRheaLink.emit(testConfig.rheaErrorEvent)});
        fakeRheaLink.remove = sinon.stub();
        var fakeRheaSession = new EventEmitter();

        var link = new testConfig.linkClass('link', {}, fakeRheaSession);
        link.forceDetach();
        assert(fakeRheaLink[testConfig.detachMethod].notCalled);
        assert(fakeRheaLink.remove.notCalled);
      });

      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_027: [** The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_025: [The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
      it('calls forceDetach on the underlying link if it is attached', function (testCallback) {
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {};
        fakeContext[testConfig.kindOfLink] = fakeRheaLink;
        fakeRheaLink[testConfig.detachMethod] = () => {};
        sinon.stub(fakeRheaLink, testConfig.detachMethod).callsFake(() => {fakeRheaLink.emit(testConfig.rheaErrorEvent)});
        fakeRheaLink.remove = sinon.stub();
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession[testConfig.openMethod] = () => {};
        sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {fakeRheaSession.emit(testConfig.rheaOpenEvent, fakeContext)});

        var link = new testConfig.linkClass('link', {}, fakeRheaSession);
        link.attach(function () {
          link.forceDetach();
          assert(fakeRheaLink[testConfig.detachMethod].notCalled);
          assert(fakeRheaLink.remove.calledOnce);
          testCallback();
        });
      });

      it('calls forceDetach on the underlying link if it is attaching and has a link object already', function (testCallback) {
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {};
        fakeContext[testConfig.kindOfLink] = fakeRheaLink;
        fakeRheaLink[testConfig.detachMethod] = () => {};
        sinon.stub(fakeRheaLink, testConfig.detachMethod).callsFake(() => {fakeRheaLink.emit(testConfig.rheaErrorEvent)});
        fakeRheaLink.remove = sinon.stub();
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession[testConfig.openMethod] = () => {};
        sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {fakeRheaSession.emit(testConfig.rheaOpenEvent, fakeContext)});

        sinon.stub(fakeRheaLink, 'on').callsFake(function () {
          link.forceDetach();
          assert(fakeRheaLink[testConfig.detachMethod].notCalled);
          assert(fakeRheaLink.remove.calledOnce);
          testCallback();
        });

        var link = new testConfig.linkClass('link', {}, fakeRheaSession);
        link.attach(function () {});
      });
    });

    describe('events', function () {
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_015: [If a `sender_close` or `sender_error` event is emitted by the `rhea` link object, the `SenderLink` object shall return to the `detached` state.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_011: [If a `receiver_close` or `receiver_error` event is emitted by the `rhea` link object, the `ReceiverLink` object shall return to the `detached` state.]*/
      [
        { name: testConfig.kindOfLink + '_error', payload: new Error('fake error') },
        { name: testConfig.kindOfLink + '_close', payload: new Error('fake error') }
      ].forEach(function (errorEvent) {
        describe(errorEvent.name, function () {
          it('returns to the detached state when the ' + errorEvent.name + ' event is received and emits an error if any', function (testCallback) {
            var fakeRheaLink = new EventEmitter();
            var fakeContext = {};
            fakeContext[testConfig.kindOfLink] = fakeRheaLink;
            fakeRheaLink.name = testConfig.kindOfLink;
            fakeRheaLink.error = errorEvent.payload;
            fakeRheaLink.remove = sinon.stub();
            var fakeRheaSession = new EventEmitter();
            fakeRheaSession[testConfig.openMethod] = () => {};
            sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {fakeRheaSession.emit(testConfig.rheaOpenEvent, fakeContext)});

            var link = new testConfig.linkClass('link', null, fakeRheaSession);
            link.on('error', function (err) {
              assert.strictEqual(err.message, 'fake error');
            });
            link.attach(function () {
              // now successfully attached
              assert.isTrue(fakeRheaSession[testConfig.openMethod].calledOnce);
              fakeRheaLink.emit(errorEvent.name, fakeContext);
              // now detached
              link.attach(function () {
                assert.isTrue(fakeRheaSession[testConfig.openMethod].calledTwice);
                testCallback();
              });
            });
          });
        });
      });
    });
  });
});