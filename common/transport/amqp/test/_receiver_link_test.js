var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var errors = require('azure-iot-common').errors;
var ReceiverLink = require('../lib/receiver_link.js').ReceiverLink;
var AmqpMessage = require('../lib/amqp_message.js').AmqpMessage;

/*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_013: [The `accept` method shall use the link created by the underlying `amqp10.AmqpClient` to settle the specified `message` with IoT hub by accepting it.]*/
/*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_015: [The `complete` method shall call the `accept` method with the same arguments (it is here for backward compatibility purposes only).]*/
/*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_016: [The `reject` method shall use the link created by the underlying `amqp10.AmqpClient` to settle the specified `message` with IoT hub by rejecting it.]*/
/*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_018: [The `abandon` method shall use the link created by the underlying `amqp10.AmqpClient` to settle the specified `message` with IoT hub by abandoning it.]*/



describe('ReceiverLink', function() {
  [{
    recvLinkMethod: 'accept',
    amqp10LinkMethod: 'accept'
  },
  {
    recvLinkMethod: 'complete',
    amqp10LinkMethod: 'accept'
  },
  {
    recvLinkMethod: 'reject',
    amqp10LinkMethod: 'reject'
  },
  {
    recvLinkMethod: 'abandon',
    amqp10LinkMethod: 'release'
  },
  ].forEach(function (testConfig) {
    describe(testConfig.recvLinkMethod, function() {
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_021: [The `accept` method shall throw if the `message` argument is falsy.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_021: [The `reject` method shall throw if the `message` argument is falsy.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_021: [The `abandon` method shall throw if the `message` argument is falsy.]*/
      [undefined, null].forEach(function (falsyMessage) {
        it('throws a ReferenceError if the message object is \'' +  + '\'', function() {
          var link = new ReceiverLink('link', {}, {});
          assert.throws(function(){
            link[testConfig.recvLinkMethod](falsyMessage, function() {});
          }, ReferenceError);
        });
      });

      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_013: [The `accept` method shall use the link created by the underlying `amqp10.AmqpClient` to settle the specified `message` with IoT hub by accepting it.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_015: [The `complete` method shall call the `accept` method with the same arguments (it is here for backward compatibility purposes only).]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_016: [The `reject` method shall use the link created by the underlying `amqp10.AmqpClient` to settle the specified `message` with IoT hub by rejecting it.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_018: [The `abandon` method shall use the link created by the underlying `amqp10.AmqpClient` to settle the specified `message` with IoT hub by abandoning it.]*/
      it(testConfig.amqp10LinkMethod + 's the message passed as argument and calls the callback if successful', function(testCallback) {
        var fakeMessage = new AmqpMessage({});
        fakeMessage.transportObj = {};
        var fakeLinkObj = new EventEmitter();
        fakeLinkObj[testConfig.amqp10LinkMethod] = sinon.stub().resolves();
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client.createReceiver = sinon.stub().resolves(fakeLinkObj);

        var link = new ReceiverLink('link', {}, fakeAmqp10Client);
        link.attach(function() {
          link[testConfig.recvLinkMethod](fakeMessage, function() {
            assert(fakeLinkObj[testConfig.amqp10LinkMethod].calledWith(fakeMessage.transportObj));
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_014: [If the state machine is not in the `attached` state, the `accept` method shall immediately fail with a `DeviceMessageLockLostError`.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_017: [If the state machine is not in the `attached` state, the `reject` method shall immediately fail with a `DeviceMessageLockLostError`.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_019: [If the state machine is not in the `attached` state, the `abandon` method shall immediately fail with a `DeviceMessageLockLostError`.]*/
      it('calls the callback with a DeviceLockLostError if the state detached', function(testCallback) {
        var fakeMessage = new AmqpMessage({});
        fakeMessage.transportObj = {};

        var link = new ReceiverLink('link', {}, new EventEmitter());
        link[testConfig.recvLinkMethod](fakeMessage, function(err) {
          assert.instanceOf(err, errors.DeviceMessageLockLostError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_014: [If the state machine is not in the `attached` state, the `accept` method shall immediately fail with a `DeviceMessageLockLostError`.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_017: [If the state machine is not in the `attached` state, the `reject` method shall immediately fail with a `DeviceMessageLockLostError`.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_019: [If the state machine is not in the `attached` state, the `abandon` method shall immediately fail with a `DeviceMessageLockLostError`.]*/
      it('calls the callback with a DeviceLockLostError if called while the state is attaching', function(testCallback) {
        var fakeMessage = new AmqpMessage({});
        fakeMessage.transportObj = {};
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client.createReceiver = function () { return new Promise(function() {}); };

        var link = new ReceiverLink('link', {}, fakeAmqp10Client);
        link.attach(); // stuck in "attaching" state now
        link[testConfig.recvLinkMethod](fakeMessage, function(err) {
          assert.instanceOf(err, errors.DeviceMessageLockLostError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_022: [** The `accept` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageCompleted` object if a callback is specified.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_023: [** The `reject` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageRejected` object if a callback is specified.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_024: [** The `abandon` method shall work whether a `callback` is specified or not, and call the callback with a `result.MessageAbandoned` object if a callback is specified.]*/
      it('doesn\'t crash if no callback is provided', function() {
        var fakeMessage = new AmqpMessage({});
        fakeMessage.transportObj = {};
        var fakeLinkObj = new EventEmitter();
        fakeLinkObj[testConfig.amqp10LinkMethod] = sinon.stub().resolves();
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client.createReceiver = sinon.stub().resolves(fakeLinkObj);

        var link = new ReceiverLink('link', {}, fakeAmqp10Client);
        link.attach(function() {
          link[testConfig.recvLinkMethod](fakeMessage);
          assert(fakeLinkObj[testConfig.amqp10LinkMethod].calledWith(fakeMessage.transportObj));
        });
      });
    });
  });

  describe('events', function() {
    describe('message', function() {
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_012: [If a `message` event is emitted by the `amqp10` link object, the `ReceiverLink` object shall emit a `message` event with the same content.]*/
      it('attaches the link when subscribing to the \'message\' event', function() {
        var fakeLinkObj = new EventEmitter();
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client.createReceiver = sinon.stub().resolves(fakeLinkObj);
        var link = new ReceiverLink('link', {}, fakeAmqp10Client);
        link.on('message', function() {});
        assert(fakeAmqp10Client.createReceiver.calledOnce);
      });

      it('emits an error if attaching the link fails while subscribing to the \'message\' event', function(testCallback) {
        var fakeError = new Error('fake error');
        var fakeLinkObj = new EventEmitter();
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client.createReceiver = sinon.stub().rejects(fakeError);
        var link = new ReceiverLink('link', {}, fakeAmqp10Client);
        link.on('error', function(err) {
          assert(fakeAmqp10Client.createReceiver.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
        link.on('message', function() {});
      });

      it('subscribes to the underlying amqp10 link events', function(testCallback) {
        var fakeLinkObj = new EventEmitter();
        sinon.spy(fakeLinkObj, 'on');
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client.createReceiver = sinon.stub().resolves(fakeLinkObj);
        var link = new ReceiverLink('link', {}, fakeAmqp10Client);
        link.on('message', function() {});
        link.on('message', function() {});
        assert(fakeAmqp10Client.createReceiver.calledOnce);
        link._fsm.on('transition', function (transitionData) {
          if (transitionData.toState === 'attached') {
            assert(fakeLinkObj.on.calledWith('detached'));
            assert(fakeLinkObj.on.calledWith('errorReceived'));
            assert(fakeLinkObj.on.calledWith('message'));
            testCallback();
          }
        });
      });

      it('detaches the link if there are no subscribers left on the \'message\' event', function(testCallback) {
        var fakeLinkObj = new EventEmitter();
        sinon.spy(fakeLinkObj, 'on');
        fakeLinkObj.forceDetach = sinon.spy();
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client.createReceiver = sinon.stub().resolves(fakeLinkObj);
        var link = new ReceiverLink('link', {}, fakeAmqp10Client);
        var listener1 = function() {};
        var listener2 = function() {};
        link.on('message', listener1);
        link.on('message', listener2);
        assert(fakeAmqp10Client.createReceiver.calledOnce);
        link._fsm.on('transition', function (transitionData) {
          if (transitionData.toState === 'attached') {
            link.removeListener('message', listener1);
            assert(fakeLinkObj.forceDetach.notCalled);
            link.removeListener('message', listener2);
          } else if (transitionData.toState === 'detached') {
            assert(fakeLinkObj.forceDetach.calledOnce);
            testCallback();
          }
        });
      });

      it('forwards the message event if subscribed', function(testCallback) {
        var amqpMessage = new AmqpMessage('');
        amqpMessage.properties = {};
        var fakeLinkObj = new EventEmitter();
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client.createReceiver = sinon.stub().resolves(fakeLinkObj);
        var link = new ReceiverLink('link', {}, fakeAmqp10Client);
        link.attach(function() {
          link.on('message', function(msg) {
            assert.strictEqual(msg.transportObj, amqpMessage);
            testCallback();
          });
          fakeLinkObj.emit('message', amqpMessage);
        });
      });

      it('emits an error event if errorReceived is emitted by the underlying link', function(testCallback) {
        var fakeError = new Error('fake error');
        var fakeLinkObj = new EventEmitter();
        fakeLinkObj.forceDetach = function() {};
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client.createReceiver = sinon.stub().resolves(fakeLinkObj);
        var link = new ReceiverLink('link', {}, fakeAmqp10Client);
        link.attach(function() {
          link.on('error', function(err) {
            assert.strictEqual(err, fakeError);
            testCallback();
          });
          fakeLinkObj.emit('errorReceived', fakeError);
        });
      });

      it('emits an error event if the underlying link is detached with an error', function(testCallback) {
        var fakeError = new Error('fake error');
        var fakeLinkObj = new EventEmitter();
        fakeLinkObj.forceDetach = function() {};
        var fakeAmqp10Client = new EventEmitter();
        fakeAmqp10Client.createReceiver = sinon.stub().resolves(fakeLinkObj);
        var link = new ReceiverLink('link', {}, fakeAmqp10Client);
        link.attach(function() {
          link.on('error', function(err) {
            assert.strictEqual(err, fakeError);
            testCallback();
          });
          fakeLinkObj.emit('detached', { closed: true, error: fakeError });
        });
      });
    });
  });
});