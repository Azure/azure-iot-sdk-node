var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var errors = require('azure-iot-common').errors;
var ReceiverLink = require('../lib/receiver_link.js').ReceiverLink;
var AmqpMessage = require('../lib/amqp_message.js').AmqpMessage;

/*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_013: [The `accept` method shall use the link created by the underlying `rhea` to settle the specified `message` with IoT hub by accepting it.]*/
/*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_015: [The `complete` method shall call the `accept` method with the same arguments (it is here for backward compatibility purposes only).]*/
/*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_016: [The `reject` method shall use the link created by the underlying `rhea` to settle the specified `message` with IoT hub by rejecting it.]*/
/*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_018: [The `abandon` method shall use the link created by the underlying `rhea` to settle the specified `message` with IoT hub by abandoning it.]*/



describe('ReceiverLink', function() {
  [{
    recvLinkMethod: 'accept',
    rheaLinkMethod: 'accept'
  },
  {
    recvLinkMethod: 'complete',
    rheaLinkMethod: 'accept'
  },
  {
    recvLinkMethod: 'reject',
    rheaLinkMethod: 'reject'
  },
  {
    recvLinkMethod: 'abandon',
    rheaLinkMethod: 'release'
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

      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_013: [The `accept` method shall use the link created by the underlying `rhea` to settle the specified `message` with IoT hub by accepting it.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_015: [The `complete` method shall call the `accept` method with the same arguments (it is here for backward compatibility purposes only).]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_016: [The `reject` method shall use the link created by the underlying `rhea` to settle the specified `message` with IoT hub by rejecting it.]*/
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_018: [The `abandon` method shall use the link created by the underlying `rhea` to settle the specified `message` with IoT hub by abandoning it.]*/
      it(testConfig.rheaLinkMethod + 's the message passed as argument and calls the callback if successful', function(testCallback) {
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {receiver: fakeRheaLink};
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_receiver = () => {};
        sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {fakeRheaSession.emit('receiver_open', fakeContext)});

        var fakeMessage = new AmqpMessage({});
        var delivery = {};
        delivery[testConfig.rheaLinkMethod] = sinon.stub();
        var context = {
          message: fakeMessage,
          delivery: delivery
        };

        var link = new ReceiverLink('link', {}, fakeRheaSession);
        link.attach(function() {
          fakeRheaLink.emit('message', context);
          link[testConfig.recvLinkMethod](fakeMessage, function() {
            assert(delivery[testConfig.rheaLinkMethod].calledOnce);
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
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {receiver: fakeRheaLink};
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_receiver = sinon.stub();
        var fakeMessage = new AmqpMessage({});

        var link = new ReceiverLink('link', {}, fakeRheaSession);
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
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {receiver: fakeRheaLink};
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_receiver = () => {};
        sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {fakeRheaSession.emit('receiver_open', fakeContext)});

        var fakeMessage = new AmqpMessage({});
        var delivery = {};
        delivery[testConfig.rheaLinkMethod] = sinon.stub();
        var context = {
          message: fakeMessage,
          delivery: delivery
        };

        var link = new ReceiverLink('link', {}, fakeRheaSession);
        link.attach(function() {
          fakeRheaLink.emit('message', context);
          link[testConfig.recvLinkMethod](fakeMessage);
          assert(delivery[testConfig.rheaLinkMethod].calledOnce);
        });
      });
    });
  });

  describe('events', function() {
    describe('message', function() {
      /*Tests_SRS_NODE_AMQP_RECEIVER_LINK_16_012: [If a `message` event is emitted by the `rhea` link object, the `ReceiverLink` object shall emit a `message` event with the same content.]*/
      it('attaches the link when subscribing to the \'message\' event', function() {
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {receiver: fakeRheaLink};
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_receiver = () => {};
        sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {fakeRheaSession.emit('receiver_open', fakeContext)});

        var link = new ReceiverLink('link', {}, fakeRheaSession);
        link.on('message', function() {});
        assert(fakeRheaSession.open_receiver.calledOnce);
      });

      it('emits an error if attaching the link fails while subscribing to the \'message\' event', function(testCallback) {
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {receiver: fakeRheaLink};
        var fakeRheaSession = new EventEmitter();
        var fakeError = new Error('fake error');
        fakeRheaSession.open_receiver = () => {};
        sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {fakeRheaSession.emit('error', fakeError)});

        var link = new ReceiverLink('link', {}, fakeRheaSession);
        link.on('error', function(err) {
          assert(fakeRheaSession.open_receiver.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
        link.on('message', function() {});
      });

      it('subscribes to the underlying rhea link events', function(testCallback) {
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {receiver: fakeRheaLink};
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_receiver = () => {};
        sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {fakeRheaSession.emit('receiver_open', fakeContext)});
        sinon.spy(fakeRheaLink, 'on');

        var link = new ReceiverLink('link', {}, fakeRheaSession);
        link._fsm.on('transition', function (transitionData) {
          if (transitionData.toState === 'attached') {
            assert(fakeRheaLink.on.calledWith('receiver_close'));
            assert(fakeRheaLink.on.calledWith('disconnected'));
            assert(fakeRheaLink.on.calledWith('error'));
            assert(fakeRheaLink.on.calledWith('message'));
          }
        });
        link.on('message', function() {});
        link.on('message', function() {});
        assert(fakeRheaSession.open_receiver.calledOnce);
        testCallback();
      });

      it('detaches the link if there are no subscribers left on the \'message\' event', function(testCallback) {
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {receiver: fakeRheaLink};
        fakeRheaLink.close_receiver = () => {};
        sinon.stub(fakeRheaLink, 'close_receiver').callsFake(() => {fakeRheaLink.emit('receiver_close')});
        fakeRheaLink.remove = sinon.stub();
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_receiver = () => {};
        sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {fakeRheaSession.emit('receiver_open', fakeContext)});

        var link = new ReceiverLink('link', {}, fakeRheaSession);
        var listener1 = function() {};
        var listener2 = function() {};
        link._fsm.on('transition', function (transitionData) {
          if (transitionData.toState === 'attached') {
            link.on('message', listener2);
            assert(fakeRheaSession.open_receiver.calledOnce);
            link.removeListener('message', listener1);
            assert(fakeRheaLink.close_receiver.notCalled);
            assert(fakeRheaLink.remove.notCalled);
            link.removeListener('message', listener2);
          } else if (transitionData.toState === 'detached') {
            assert(fakeRheaLink.close_receiver.calledOnce);
            assert(fakeRheaLink.remove.notCalled);
            testCallback();
          }
        });
        link.on('message', listener1);
      });

      it('forwards the message event if subscribed', function(testCallback) {
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {receiver: fakeRheaLink};
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_receiver = () => {};
        sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {fakeRheaSession.emit('receiver_open', fakeContext)});

        var amqpMessage = new AmqpMessage('');
        amqpMessage.message_id = 'hello';
        var delivery = {};
        delivery['accept'] = sinon.stub();
        var context = {
          message: amqpMessage,
          delivery: delivery
        };

        var link = new ReceiverLink('link', {}, fakeRheaSession);
        link.attach(function() {
          link.on('message', function(msg) {
            assert.strictEqual(msg, amqpMessage);
            testCallback();
          });
          fakeRheaLink.emit('message', context);
        });
      });

      it('emits an error event if errorReceived is emitted by the underlying link', function(testCallback) {
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {receiver: fakeRheaLink};
        fakeRheaLink.remove = sinon.stub();
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_receiver = () => {};
        sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {fakeRheaSession.emit('receiver_open', fakeContext)});

        var fakeError = new Error('fake error');

        var link = new ReceiverLink('link', {}, fakeRheaSession);
        link.attach(function() {
          link.on('error', function(err) {
            assert.strictEqual(err, fakeError);
            assert(fakeRheaLink.remove.calledOnce,'remove called once')
            testCallback();
          });
          fakeRheaLink.emit('error', fakeError);
        });
      });

      it('emits an error event if the underlying link is detached with an error', function(testCallback) {
        var fakeRheaLink = new EventEmitter();
        var fakeContext = {receiver: fakeRheaLink};
        fakeRheaLink.remove = sinon.stub();
        var fakeRheaSession = new EventEmitter();
        fakeRheaSession.open_receiver = () => {};
        sinon.stub(fakeRheaSession, 'open_receiver').callsFake(() => {fakeRheaSession.emit('receiver_open', fakeContext)});

        var fakeError = new Error('fake error');

        var link = new ReceiverLink('link', {}, fakeRheaSession);
        link.attach(function() {
          link.on('error', function(err) {
            assert.strictEqual(err, fakeError);
            testCallback();
          });
          fakeRheaLink.emit('receiver_close', fakeError);
        });
      });
    });
  });
});