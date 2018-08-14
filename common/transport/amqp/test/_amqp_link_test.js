var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var ReceiverLink = require('../lib/receiver_link.js').ReceiverLink;
var SenderLink = require('../lib/sender_link.js').SenderLink;
var AmqpMessage = require('../lib/amqp_message.js').AmqpMessage;

describe('AmqpLink implementation unit tests', function() {
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
        it('inherits from EventEmitter', function(testCallback) {
          var link = new testConfig.linkClass('link', {}, new EventEmitter());
          assert.instanceOf(link, EventEmitter);
          testCallback();
        });

        /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_003: [** The `SenderLink` class shall implement the `AmqpLink` interface. **]*/
        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_003: [The `ReceiverLink` class shall implement the `AmqpLink` interface.]*/
        it('implements the AmqpLink interface', function(testCallback) {
          var link = new testConfig.linkClass('link', {}, new EventEmitter());
          assert.isTrue(link.attach && (typeof link.attach === 'function'));
          assert.isTrue(link.detach && (typeof link.attach === 'function'));
          assert.isTrue(link.forceDetach && (typeof link.attach === 'function'));
          testCallback();
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
        it('merged link options utilized during the attach', function(testCallback) {
          var fakeRheaSession = new EventEmitter();
          var fakeRheaLink = new EventEmitter();
          var fakeContext = {};
          var fakeLinkAddress = 'link';
          var fakeLinkOptions = {};
          var fakeOption = {fakeOption: {color: 'red'}};
          fakeLinkOptions[testConfig.direction] = fakeLinkAddress;
          fakeContext[testConfig.kindOfLink] = fakeRheaLink;
          fakeRheaLink.name = 'rheaLink';
          fakeRheaSession[testConfig.openMethod] = () => {};
          sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {process.nextTick( () => {fakeRheaLink.emit(testConfig.rheaOpenEvent, fakeContext)});return fakeRheaLink;});

          var link = new testConfig.linkClass(fakeLinkAddress, fakeOption, fakeRheaSession);
          link.attach(function(err) {
            assert.isNotOk(err);
            var sentArgs = fakeRheaSession[testConfig.openMethod].args[0];
            assert(sentArgs[0][testConfig.direction] === fakeLinkAddress, 'contains the appropriate direction');
            assert(sentArgs[0].fakeOption === fakeOption.fakeOption, 'contains the appropriate fake option');
            testCallback();
          });
        });

        /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_007: [The `attach` method shall immediately invoke the `callback` if already in an attached state.] */
        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_06_001: [The `attach` method shall immediately invoke the `callback` if already in an attached state.] */
        it('does not create a new link if already attached', function (testCallback) {
          var fakeRheaLink = new EventEmitter();
          var fakeLinkAddress = 'link';
          var fakeLinkOptions = {};
          var fakeContext = {};
          fakeContext[testConfig.kindOfLink] = fakeRheaLink;
          fakeLinkOptions[testConfig.direction] = fakeLinkAddress;
          var fakeRheaSession = new EventEmitter();
          fakeRheaSession[testConfig.openMethod] = () => {};
          sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {process.nextTick( () => {fakeRheaLink.emit(testConfig.rheaOpenEvent, fakeContext)});return fakeRheaLink;});

          var link = new testConfig.linkClass(fakeLinkAddress, {}, fakeRheaSession);
          link.attach(function (firstAttachError) {
            assert.isNotOk(firstAttachError,'error is undefined for first attach');
            assert.isTrue(fakeRheaSession[testConfig.openMethod].calledOnce);
            link.attach(function (secondAttachError) {
              assert.isNotOk(secondAttachError, 'error is undefined for second attach');
              assert.isTrue(fakeRheaSession[testConfig.openMethod].calledOnce);
              testCallback();
            });
          });
        });

        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_06_002: [If the `detach` method is invoked on the `ReceiverLink` while still attaching, the ReceiverLink shall detach.  It will indicate the error to the callback for the `detach` as well as the callback to the `attach`.] */
        /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_001: [If the `detach` method is invoked on the `SenderLink` while still attaching, the SenderLink shall detach.  It will indicate the error to the callback for the `detach` as well as the callback to the `attach`.] */
        it('detach while attaching invokes the attach and the detach callbacks with the same error.', function(testCallback) {
          var fakeRheaLink = new EventEmitter();
          var detachError = new Error('fake error');
          var fakeRheaSession = new EventEmitter();
          fakeRheaSession[testConfig.openMethod] = sinon.stub().returns(fakeRheaLink);

          var link = new testConfig.linkClass('link', {}, fakeRheaSession);
          link.attach(function(err) {
            assert.strictEqual(err, detachError);
          });
          link.detach((err) => {
            assert.strictEqual(err, detachError);
            testCallback();
          }, detachError);
        });

        /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_008: [If the `rhea` session fails to create the link the `callback` function shall be called with this error object.]*/
        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_008: [If the `rhea` session fails to create the link the `callback` function shall be called with this error object.]*/
        it('calls the callback with an error if attaching the link fails', function (testCallback) {
          var fakeRheaLink = new EventEmitter();
          var fakeLinkAddress = 'link';
          var fakeError = new Error('fake error');
          var fakeLinkOptions = {};
          var fakeContext = {};
          fakeContext[testConfig.kindOfLink] = fakeRheaLink;
          fakeLinkOptions[testConfig.direction] = fakeLinkAddress;
          var fakeRheaSession = new EventEmitter();
          fakeRheaSession[testConfig.openMethod] = () => {};
          sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {process.nextTick( () => {fakeRheaLink.error = fakeError;fakeRheaLink.emit(testConfig.rheaErrorEvent, fakeContext);fakeRheaLink.error = undefined;fakeRheaLink.emit(testConfig.rheaCloseEvent, fakeContext)});return fakeRheaLink;});

          var link = new testConfig.linkClass('link', null, fakeRheaSession);
          link.attach(function (err) {
            assert.strictEqual(err, fakeError);
            testCallback();
          });
        });

        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_06_003: [If the `forceDetach` method is invoked on the `ReceiverLink` while still attaching, the ReceiverLink shall detach.  With the error supplied to the forceDetach, the `attach` callback will also be invoked.  If the error is NOT falsy it will also be emitted as the argument to the `error` event.] */
        /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_003: [If the `forceDetach` method is invoked on the `SenderLink` while still attaching, the SenderLink shall detach.  With the error supplied to the forceDetach, the `attach` callback will also be invoked.  If the error is NOT falsy it will also be emitted as the argument to the `error` event.] */
        it('forceDetach while attaching invokes the attach callback with an error (if provided) and emits an `error` event with the (potentially) supplied error.', function(testCallback) {
          var fakeRheaLink = new EventEmitter();
          var detachError = new Error('fake error');
          var fakeRheaSession = new EventEmitter();
          fakeRheaSession[testConfig.openMethod] = sinon.stub().returns(fakeRheaLink);

          var link = new testConfig.linkClass('link', {}, fakeRheaSession);
          link.on('error', (err) => {
            assert.strictEqual(err, detachError);
            testCallback();
          });
          link.attach(function(err) {
            assert.strictEqual(err, detachError);
          });
          link.forceDetach(detachError);
        });

        it('forceDetach with no argument while attaching invokes the attach callback with an NO error and emits NO `error` event with NO supplied error.', function(testCallback) {
          var fakeRheaLink = new EventEmitter();
          var fakeRheaSession = new EventEmitter();
          fakeRheaSession[testConfig.openMethod] = sinon.stub().returns(fakeRheaLink);

          var link = new testConfig.linkClass('link', {}, fakeRheaSession);
          link.attach(function(err) {
            assert.isNotOk(err);
            testCallback();
          });
          link.forceDetach();
        });


      });

      describe('#detach', function () {
        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_06_004: [If the `ReceiverLink` is already in the detached state an invocation of `detach` shall immediately invoke the callback with the (potentially) supplied error parameter.] */
        /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_005: [If the `SenderLink` is already in the detached state an invocation of `detach` shall immediately invoke the callback with the (potentially) supplied error parameter.] */
        it('detach while already detached returns immediately', function(testCallback) {
          var fakeRheaSession = new EventEmitter();
          var fakeError = new Error('fakeError');
          var link = new testConfig.linkClass('link', {}, fakeRheaSession);
          link.detach((err) => {
            assert.strictEqual(err, fakeError);
            testCallback();
          }, fakeError);
        });

        /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_009: [The `detach` method shall detach the link created by `rhea`.] */
        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_009: [The `detach` method shall detach the link created by `rhea` object.] */
        it('can detach without prompting from the service will issue a close', function(testCallback) {
          var fakeRheaSession = new EventEmitter();
          var fakeRheaLink = new EventEmitter();
          var fakeContext = {};
          fakeContext[testConfig.kindOfLink] = fakeRheaLink;
          fakeRheaLink.close = () => {};
          fakeRheaLink.remove = sinon.stub();
          sinon.stub(fakeRheaLink, 'close').callsFake(() => {fakeRheaLink.emit(testConfig.rheaCloseEvent, fakeContext)});
          fakeRheaSession[testConfig.openMethod] = ()=> {};
          sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {process.nextTick(() => {fakeRheaLink.emit(testConfig.rheaOpenEvent, fakeContext)});return fakeRheaLink;});

          var link = new testConfig.linkClass('link', {}, fakeRheaSession);
          link.attach(function(err) {
            assert.isNotOk(err, 'attach completes successfully');
            link.detach(function(detachError) {
              assert.isNotOk(detachError, 'detach completed successfully');
              assert(fakeRheaLink.remove.notCalled);
              assert(fakeRheaLink.close.calledOnce, 'close was invoked');
              testCallback();
            });
          });
        });

        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_06_005: [If `forceDetach` invoked while detaching, the detach will be completed with the error supplied to the `forceDetach` or an error indicating that the `detach` was preempted by the `forceDetach`.] */
        /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_009: [If `forceDetach` invoked while detaching, the detach will be completed with the error supplied to the `forceDetach` or an error indicating that the `detach` was preempted by the `forceDetach`.] */
        it('force detach while detaching will do it', function(testCallback) {
          var fakeRheaSession = new EventEmitter();
          var fakeRheaLink = new EventEmitter();
          var fakeContext = {};
          fakeContext[testConfig.kindOfLink] = fakeRheaLink;
          fakeRheaLink.close = sinon.stub();
          fakeRheaLink.remove = sinon.stub();
          fakeRheaSession[testConfig.openMethod] = ()=> {};
          sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {process.nextTick(() => {fakeRheaLink.emit(testConfig.rheaOpenEvent, fakeContext)});return fakeRheaLink;});

          var link = new testConfig.linkClass('link', {}, fakeRheaSession);
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

        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_06_006: [An error occurring during a detach will be indicated in the error result of the `detach`.] */
        /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_010: [An error occurring during a detach will be indicated in the error result of the `detach`.] */
        it('can handle an error event while detaching', function(testCallback) {
          var fakeRheaSession = new EventEmitter();
          var fakeRheaLink = new EventEmitter();
          fakeRheaLink.name = 'rheaLink';
          var fakeContext = {};
          fakeContext[testConfig.kindOfLink] = fakeRheaLink;
          var fakeError = new Error('error while detaching');
          fakeRheaLink.close = sinon.stub();
          fakeRheaSession[testConfig.openMethod] = ()=> {};
          sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {process.nextTick(() => {fakeRheaLink.emit(testConfig.rheaOpenEvent, fakeContext)});return fakeRheaLink;});

          var link = new testConfig.linkClass('link', {}, fakeRheaSession);
          link.attach(function(err) {
            assert.isNotOk(err, 'attach completes successfully');
            link.detach((detachError) => {
              assert.strictEqual(detachError, fakeError, 'detach finished with an error');
              assert(fakeRheaLink.close.calledOnce, 'close invoked');
              testCallback();
            });
            fakeRheaLink.error = fakeError;
            fakeRheaLink.emit(testConfig.rheaErrorEvent, fakeContext);
            fakeRheaLink.error = undefined;
            fakeRheaLink.emit(testConfig.rheaCloseEvent, fakeContext);
          });
        });

        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_06_007: [If `detach` invoked while already detaching, it's callback will be invoked with an error.  Whatever caused the original detaching will proceed.] */
        /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_011: [If `detach` invoked while already detaching, it's callback will be invoked with an error.  Whatever caused the original detaching will proceed.] */
        it('detach while detaching will error the second detach', function(testCallback) {
          var fakeRheaSession = new EventEmitter();
          var fakeRheaLink = new EventEmitter();
          fakeRheaLink.name = 'rheaLink';
          var fakeContext = {};
          fakeContext[testConfig.kindOfLink] = fakeRheaLink;
          fakeRheaLink.close = sinon.stub();
          fakeRheaLink.remove = sinon.stub();
          fakeRheaSession[testConfig.openMethod] = ()=> {};
          sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {process.nextTick(() => {fakeRheaLink.emit(testConfig.rheaOpenEvent, fakeContext)});return fakeRheaLink;});

          var link = new testConfig.linkClass('link', {}, fakeRheaSession);
          link.attach(function(err) {
            assert.isNotOk(err, 'attach completes successfully');
            link.detach((detachError) => { // controlling detach.  Should finish last.
              assert.isNotOk(detachError, 'initiating detach should work regardless of second bad detach');
              assert(fakeRheaLink.close.calledOnce, 'close invoked');
              assert(fakeRheaLink.remove.notCalled, 'remove not invoked');
              testCallback();
            });
            link.detach((err) => {
              assert.instanceOf(err, Error, 'Should have error from second detach');
              assert(fakeRheaLink.close.calledOnce, 'close invoked');
              process.nextTick(() => {fakeRheaLink.emit(testConfig.rheaCloseEvent, fakeContext)})
            });
          });
        });
      });

      describe('forceDetach', function() {
        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_028: [The `forceDetach` method shall return immediately if the link is already detached.]*/
        /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_026: [The `forceDetach` method shall return immediately if the link is already detached.]*/
        it('forceDetach (with or without supplied error) while already detached returns immediately', function(testCallback) {
          var fakeRheaSession = new EventEmitter();
          var fakeError = new Error('fakeError');
          var link = new testConfig.linkClass('link', {}, fakeRheaSession);
          link.forceDetach();
          link.forceDetach(fakeError);
          testCallback();
        });

        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_027: [** The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
        /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_025: [The `forceDetach` method shall call the `remove` method on the underlying `rhea` link object.]*/
        it('calls forceDetach on the underlying link if it is attached', function (testCallback) {
          var fakeRheaLink = new EventEmitter();
          var fakeContext = {};
          fakeContext[testConfig.kindOfLink] = fakeRheaLink;
          fakeRheaLink[testConfig.detachMethod] = sinon.stub();
          fakeRheaLink.remove = sinon.stub();
          var fakeRheaSession = new EventEmitter();
          fakeRheaSession[testConfig.openMethod] = () => {};
          sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {process.nextTick(() => {fakeRheaLink.emit(testConfig.rheaOpenEvent, fakeContext)});return fakeRheaLink;});

          var link = new testConfig.linkClass('link', {}, fakeRheaSession);
          link.attach(function (err) {
            assert.isNotOk(err, 'attach completes successfully');
            link.forceDetach();
            assert(fakeRheaLink[testConfig.detachMethod].notCalled);
            assert(fakeRheaLink.remove.calledOnce);
            testCallback();
          });
        });

        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_06_008: [The `forceDetach` method shall cause an `error` event to be emitted on the `ReceiverLink` if an error is supplied.] */
        /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_004: [The `forceDetach` method shall cause an `error` event to be emitted on the `SenderLink` if an error is supplied..] */
        it('emits an error if forceDetach invoked with an error while in the attached state', function(testCallback) {
          var fakeRheaLink = new EventEmitter();
          var fakeContext = {};
          fakeContext[testConfig.kindOfLink] = fakeRheaLink;
          fakeRheaLink[testConfig.detachMethod] = sinon.stub();
          fakeRheaLink.remove = sinon.stub();
          var fakeRheaSession = new EventEmitter();
          fakeRheaSession[testConfig.openMethod] = () => {};
          sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {process.nextTick(() => {fakeRheaLink.emit(testConfig.rheaOpenEvent, fakeContext)});return fakeRheaLink;});

          var link = new testConfig.linkClass('link', {}, fakeRheaSession);
          link.attach(function (err) {
            assert.isNotOk(err, 'attach completes successfully');
            var fakeForceDetachError = new Error('forceDetachError');
            link.on('error', (err) => {
              assert.strictEqual(err, fakeForceDetachError, 'correct error emitted');
              assert(fakeRheaLink[testConfig.detachMethod].notCalled);
              assert(fakeRheaLink.remove.calledOnce);
              testCallback();
            });
            link.forceDetach(fakeForceDetachError);
          });
        });
      });

      describe('events', function () {
        /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_06_009: [If a `receiver_close` event received with no preceding error, the link shall be closed with no error.] */
        /*Tests_SRS_NODE_AMQP_SENDER_LINK_06_006: [A `sender_close` event with no previous error will simply detach the link.  No error is emitted.] */
        it('close received with no error causes link to detach', function(testCallback) {
          var fakeRheaSession = new EventEmitter();
          var fakeRheaLink = new EventEmitter();
          fakeRheaLink.name = 'rheaLink';
          var fakeContext = {};
          fakeContext[testConfig.kindOfLink] = fakeRheaLink;
          fakeRheaLink.close = sinon.stub();
          fakeRheaLink.remove = sinon.stub();
          fakeRheaSession[testConfig.openMethod] = ()=> {};
          sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {process.nextTick(() => {fakeRheaLink.emit(testConfig.rheaOpenEvent, fakeContext)});return fakeRheaLink;});

          var link = new testConfig.linkClass('link', {}, fakeRheaSession);
          link.attach((err) => {
            assert.isNotOk(err, 'attach completes successfully');
            assert(fakeRheaLink.close.notCalled);
            fakeRheaLink.emit(testConfig.rheaCloseEvent, fakeContext);
            assert(fakeRheaLink.close.calledOnce, 'detach sent');
            assert(fakeRheaLink.remove.notCalled, 'remove not invoked ');
            testCallback();
          });
        });

        it('emits an error to the container of `azure-iot-amqp-base:error-indicated` if the link emits an _error, _close set of events - it REMAINS in the attached state', function(testCallback) {
          var fakeEmittedError = {condition: 'amqp:not-implemented'};
          var fakeRheaLink = new EventEmitter();
          fakeRheaLink.name = 'rheaLink';
          var fakeRheaContainer = new EventEmitter();
          var fakeContext = {};
          fakeContext[testConfig.kindOfLink] = fakeRheaLink;
          fakeContext.container = fakeRheaContainer;
          var fakeRheaSession = new EventEmitter();
          fakeRheaSession[testConfig.openMethod] = ()=> {};
          sinon.stub(fakeRheaSession, testConfig.openMethod).callsFake(() => {process.nextTick(() => {fakeRheaLink.emit(testConfig.rheaOpenEvent, fakeContext)});return fakeRheaLink;});

          var link = new testConfig.linkClass('link', {}, fakeRheaSession);
          link.attach((err) => {
            var containerErrorHandlerInvoked = false;
            assert.isNotOk(err, 'attach completes successfully');
            assert.strictEqual(link._fsm.state, 'attached');
            link._fsm.on('transition', function () {
              testCallback(new Error('should not transition!'));
            });
            fakeRheaContainer.on('azure-iot-amqp-base:error-indicated', (containerError) => {
              assert.isOk(containerError, 'the container did get the emitted error indication');
              containerErrorHandlerInvoked = true;
            });
            fakeRheaLink.error = fakeEmittedError;
            fakeRheaLink.emit(testConfig.rheaErrorEvent, fakeContext);
            fakeRheaLink.error = undefined;
            assert.isFalse(containerErrorHandlerInvoked, 'container error handler needs the close');
            fakeRheaLink.emit(testConfig.rheaCloseEvent, fakeContext);
            assert(containerErrorHandlerInvoked, 'container error handler needs the close');
            testCallback();
          });
        });
      });
    });
  });
});