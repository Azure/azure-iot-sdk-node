var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var ReceiverLink = require('../lib/receiver_link.js').ReceiverLink;
var SenderLink = require('../lib/sender_link.js').SenderLink;
var AmqpMessage = require('../lib/amqp_message.js').AmqpMessage;

[
  {
    linkClass: ReceiverLink,
    amqp10Method: 'createReceiver'
  },
  {
    linkClass: SenderLink,
    amqp10Method: 'createSender'
  }
].forEach(function(testConfig) {
  describe(testConfig.linkClass.name, function() {
    describe('#constructor', function() {
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_002: [** The `SenderLink` class shall inherit from `EventEmitter`. **]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_002: [The `ReceiverLink` class shall inherit from `EventEmitter`.]*/
      it('inherits from EventEmitter', function() {
        var link = new testConfig.linkClass('link', null, {});
        assert.instanceOf(link, EventEmitter);
      });

      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_003: [** The `SenderLink` class shall implement the `AmqpLink` interface. **]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_003: [The `ReceiverLink` class shall implement the `AmqpLink` interface.]*/
      it('implements the AmqpLink interface', function() {
        var link = new testConfig.linkClass('link', null, {});
        assert.isFunction(link.attach);
        assert.isFunction(link.detach);
      });

      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_001: [** The `SenderLink` internal state machine shall be initialized in the `detached` state. **]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_001: [The `ReceiverLink` internal state machine shall be initialized in the `detached` state.]*/
      it('initializes the internal state machine to a \'detached\' state', function() {
        var link = new testConfig.linkClass('link', null, {});
        assert.strictEqual(link._fsm.state, 'detached');
      });
    });

    describe('#attach', function() {
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_004: [The `attach` method shall use the stored instance of the `amqp10.AmqpClient` object to attach a new link object with the `linkAddress` and `linkOptions` provided when creating the `SenderLink` instance.]*/
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_022: [The `attach` method shall call the `callback` if the link was successfully attached.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_004: [The `attach` method shall use the stored instance of the `amqp10.AmqpClient` object to attach a new link object with the `linkAddress` and `linkOptions` provided when creating the `ReceiverLink` instance.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_020: [The `attach` method shall call the `callback` if the link was successfully attached.]*/
      it('attaches a new link using the amqp10.AmqpClient object', function(testCallback) {
        var fakeLinkAddress = 'link';
        var fakeLinkOptions = {};
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client[testConfig.amqp10Method] = sinon.stub().resolves(new EventEmitter());

        var link = new testConfig.linkClass(fakeLinkAddress, fakeLinkOptions, fakeAmqp10Client);
        link.attach(function() {
          assert(fakeAmqp10Client[testConfig.amqp10Method].calledWith(fakeLinkAddress, fakeLinkOptions));
          testCallback();
        });
      });

      it('does not create a new link if already attached', function(testCallback) {
        var fakeLinkObj = new EventEmitter();
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client[testConfig.amqp10Method] = sinon.stub().resolves(fakeLinkObj);

        var link = new testConfig.linkClass('link', null, fakeAmqp10Client);
        link.attach(function() {
          // now successfully attached
          assert.isTrue(fakeAmqp10Client[testConfig.amqp10Method].calledOnce);
          link.attach(function() {
            assert.isTrue(fakeAmqp10Client[testConfig.amqp10Method].calledOnce); // would be false if createReceiver had been called twice
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_008: [If the `amqp10.AmqpClient` fails to create the link the `callback` function shall be called with this error object.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_008: [If the `amqp10.AmqpClient` fails to create the link the `callback` function shall be called with this error object.]*/
      it('calls the callback with an error if attaching the link fails', function(testCallback) {
        var fakeError = new Error('fake error');
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client[testConfig.amqp10Method] = sinon.stub().rejects(fakeError);

        var link = new testConfig.linkClass('link', null, fakeAmqp10Client);
        link.attach(function(err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_005: [If the `amqp10.AmqpClient` emits an `errorReceived` event during the time the link is attached, the `callback` function shall be called with this error.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_005: [If the `amqp10.AmqpClient` emits an `errorReceived` event during the time the link is attached, the `callback` function shall be called with this error.]*/
      it('calls the callback with an error if the client emits an error while attaching the link', function(testCallback) {
        var fakeError = new Error('fake error');
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client[testConfig.amqp10Method] = function () {
          return new Promise(function(resolve, reject) {
            fakeAmqp10Client.emit('client:errorReceived', fakeError);
            resolve(new EventEmitter());
          });
        };

        var link = new testConfig.linkClass('link', null, fakeAmqp10Client);
        link.attach(function(err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_006: [The `SenderLink` object should subscribe to the `detached` event of the newly created `amqp10` link object.]*/
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_007: [The `SenderLink` object should subscribe to the `errorReceived` event of the newly created `amqp10` link object.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_006: [The `ReceiverLink` object should subscribe to the `detached` event of the newly created `amqp10` link object.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_007: [The `ReceiverLink` object should subscribe to the `errorReceived` event of the newly created `amqp10` link object.]*/
      it('subscribes to the detach and errorReceived events', function(testCallback) {
        var fakeLinkObj = new EventEmitter();
        sinon.spy(fakeLinkObj, 'on');
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client[testConfig.amqp10Method] = sinon.stub().resolves(fakeLinkObj);

        var link = new testConfig.linkClass('link', {}, fakeAmqp10Client);
        link.attach(function() {
          assert(fakeLinkObj.on.calledWith('detached'));
          assert(fakeLinkObj.on.calledWith('errorReceived'));
          testCallback();
        });
      });
    });

    describe('#detach', function() {
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_009: [The `detach` method shall detach the link created by the `amqp10.AmqpClient` underlying object.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_009: [The `detach` method shall detach the link created by the `amqp10.AmqpClient` underlying object.]*/
      it('detaches the link if it is attached', function(testCallback) {
        var fakeLinkObj = new EventEmitter();
        fakeLinkObj.forceDetach = sinon.stub();
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client[testConfig.amqp10Method] = sinon.stub().resolves(fakeLinkObj);

        var link = new testConfig.linkClass('link', {}, fakeAmqp10Client);
        link.attach(function() {
          link.detach();
          assert(fakeLinkObj.forceDetach.calledOnce);
          testCallback();
        });
      });

      it('does not do anything if the link is already detached', function() {
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client[testConfig.amqp10Method] = function () { assert.fail('should not try to create a receiver'); };

        var link = new testConfig.linkClass('link', {}, fakeAmqp10Client);
        link.detach();
      });

      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_017: [The `detach` method shall return the state machine to the `detached` state.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_010: [The `detach` method shall return the state machine to the `detached` state.]*/
      it('returns to the detached state if called while attaching', function(testCallback) {
        var fakeLinkObj = new EventEmitter();
        fakeLinkObj.forceDetach = sinon.stub();
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client[testConfig.amqp10Method] = sinon.stub().resolves(fakeLinkObj);

        var link = new testConfig.linkClass('link', {}, fakeAmqp10Client);
        link._fsm.on('transition', function (data) {
          if (data.toState === 'attaching') {
            link.detach();
          } else if (data.toState === 'detached') {
            testCallback();
          }
        });
        link.attach(function() {});
      });
    });

    describe('events', function() {
      /*Tests_SRS_NODE_AMQP_SENDER_LINK_16_015: [If a `detached` or `errorReceived` event is emitted by the `ampq10` link object, the `SenderLink` object shall return to the `detached` state.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_011: [If a `detached` or `errorReceived` event is emitted by the `ampq10` link object, the `ReceiverLink` object shall return to the `detached` state.]*/
      [
        { name: 'errorReceived', payload: new Error('fake error') },
        { name: 'detached', payload: { closed: true, error: new Error('fake error') } }
      ].forEach(function(errorEvent) {
        describe(errorEvent.name, function() {
          it('returns to the detached state when the ' + errorEvent.name + ' event is received and emits an error if any', function(testCallback) {
            var fakeLinkObj = new EventEmitter();
            fakeLinkObj.forceDetach = function() {};
            var fakeAmqp10Client = new EventEmitter();
            fakeAmqp10Client[testConfig.amqp10Method] = sinon.stub().resolves(fakeLinkObj);

            var link = new testConfig.linkClass('link', null, fakeAmqp10Client);
            link.on('error', function (err) {
              assert.strictEqual(err.message, 'fake error');
            });
            link.attach(function() {
              // now successfully attached
              assert.isTrue(fakeAmqp10Client[testConfig.amqp10Method].calledOnce);
              fakeLinkObj.emit(errorEvent.name, errorEvent.payload);
              // now detached
              link.attach(function() {
                assert.isTrue(fakeAmqp10Client[testConfig.amqp10Method].calledTwice);
                testCallback();
              });
            });
          });
        });
      });
    });
  });
});