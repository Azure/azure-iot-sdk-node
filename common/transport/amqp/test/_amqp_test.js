// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Promise = require('bluebird');
var assert = require('chai').assert;
var sinon = require('sinon');
var AmqpMessage = require('../lib/amqp_message.js').AmqpMessage;
var Amqp = require('../lib/amqp.js').Amqp;
var ReceiverLink = require('../lib/receiver_link.js').ReceiverLink;
var results = require('azure-iot-common').results;
var errors = require('azure-iot-common').errors;
var Message = require('azure-iot-common').Message;
var EventEmitter = require('events').EventEmitter;
var uuid = require('uuid');
var amqp10 = require('amqp10');

var cbsReceiveEndpoint = '$cbs';
var cbsSendEndpoint = '$cbs';

describe('Amqp', function () {
  /*Tests_SRS_NODE_COMMON_AMQP_16_042: [The Amqp constructor shall create a new `amqp10.Client` instance and configure it to:
  - not reconnect on failure
  - not reattach sender and receiver links on failure
  - not reestablish sessions on failure]*/
  describe('#policies', function () {
    before(function () {
      sinon.spy(amqp10, 'Client');
    });

    it.skip('sets the connection to not reestablish on failure', function () {
      var amqp = new Amqp();
      void(amqp);
      assert.isFalse(amqp10.Client.firstCall.args[0].session.reestablish.forever);
      assert.strictEqual(amqp10.Client.firstCall.args[0].session.reestablish.retries, 0);
    });

    it.skip('sets the sender link to not reattach on failure', function () {
      var amqp = new Amqp();
      void(amqp);
      assert.isFalse(amqp10.Client.firstCall.args[0].senderLink.reattach.forever);
      assert.strictEqual(amqp10.Client.firstCall.args[0].senderLink.reattach.retries, 0);
    });

    it.skip('sets the receiver link to not reattach on failure', function () {
      var amqp = new Amqp();
      void(amqp);
      assert.isFalse(amqp10.Client.firstCall.args[0].receiverLink.reattach.forever);
      assert.strictEqual(amqp10.Client.firstCall.args[0].receiverLink.reattach.retries, 0);
    });

    it.skip('sets the connection to not reconnect on failure', function () {
      var amqp = new Amqp();
      void(amqp);
      assert.isFalse(amqp10.Client.firstCall.args[0].reconnect.forever);
      assert.strictEqual(amqp10.Client.firstCall.args[0].reconnect.retries, 0);
    });

    after(function () {
      amqp10.Client.restore();
    });
  });

  describe('#connect', function () {
    /*Tests_SRS_NODE_COMMON_AMQP_16_002: [The connect method shall establish a connection with the IoT hub instance and if given as argument call the `done` callback with a null error object in the case of success and a `results.Connected` object.]*/
    /*Tests_SRS_NODE_COMMON_AMQP_06_011: [The `connect` method shall set up a listener for responses to put tokens.]*/
    it('Calls the done callback when successfully connected', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeContext = {connection: fakeConnection};
      sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeContext)});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {fakeSession.emit('session_open', fakeSessionContext)});
      amqp.connect({uri: 'uri'}, function(err, res) {
        if (err) testCallback(err);
        else {
          assert.instanceOf(res, results.Connected);
          testCallback();
        }
      });
    });

    it('Calls the done callback immediately when already connected', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeContext = {connection: fakeConnection};
      sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeContext)});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {fakeSession.emit('session_open', fakeSessionContext)});

      amqp.connect({uri: 'uri'}, function(err, res) {
        if (err) testCallback(err);
        else {
          assert.instanceOf(res, results.Connected);
          assert(amqp._amqpContainer.connect.calledOnce);
          amqp.connect({uri: 'uri'}, function(err, res) {
            if (err) testCallback(err);
            else {
              assert.instanceOf(res, results.Connected);
              assert(amqp._amqpContainer.connect.calledOnce);
            }
          });
          testCallback();
        }
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_003: [If given as an argument, the connect method shall call the `done` callback with a standard `Error` object if the connection fails.]*/
    it('Calls the done callback with an error if connecting fails (disconnected)', function(testCallback) {
      var amqp = new Amqp();
      var fakeContext = {container: amqp._amqpContainer};
      amqp._amqpContainer.error = new Error();
      sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('disconnected', fakeContext)});

      amqp.connect({uri: 'uri'}, function(err) {
        assert.instanceOf(err, Error);
        testCallback();
      });
    });

    it('Calls the done callback with an error if connecting fails (auth error)', function(testCallback) {
      var amqp = new Amqp();
      var fakeContext = {container: amqp._amqpContainer};
      amqp._amqpContainer.error = new Error();
      sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_error', fakeContext)});
      amqp.connect({uri: 'uri'}, function(err) {
        assert.strictEqual(err, amqp._amqpContainer.error);
        testCallback();
      });
    });
  });

  describe('#setDisconnectHandler', function() {
    it('disconnect callback is called when the \'disconnected\' event is emitted while connected', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeConnectionContext)});
      var fakeSession = new EventEmitter();
      fakeSession.name = 'session';
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {fakeSession.emit('session_open', fakeSessionContext)});

      amqp.setDisconnectHandler(function() {
        testCallback();
      });
      amqp.connect({uri: 'uri'}, function () {
        var fakeError = new Error('Connected closed');
        fakeConnection.error = fakeError;
        amqp._amqpConnection.emit('disconnected', fakeConnectionContext);
      });
    });

    it('ignores the disconnected event if already disconnected', function (testCallback) {
      var amqp = new Amqp();
      amqp.setDisconnectHandler(function() {
        assert.fail();
      });
      amqp._amqpContainer.emit('disconnected');
      testCallback();
    });

    it('ignores the disconnected event if fired while connecting', function (testCallback) {
      var amqp = new Amqp();
      var fakeContext = {container: amqp._amqpContainer};
      amqp._amqpContainer.connect = sinon.stub();

      amqp.setDisconnectHandler(function() {
        assert.fail();
      });
      amqp.connect({uri: 'uri'}, function() {});
      amqp._amqpContainer.emit('disconnected', fakeContext);
      testCallback();
    });

    it('ignores the disconnected event if fired while disconnecting', function (testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeConnectionContext)});
      var fakeSession = new EventEmitter();
      fakeSession.name = 'session';
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {fakeSession.emit('session_open', fakeSessionContext)});
      fakeConnection.close = sinon.stub();

      amqp.setDisconnectHandler(function() {
        assert.fail();
      });
      amqp.connect({uri: 'uri'}, () => {
        amqp.disconnect(function () { });
        fakeConnection.error = new Error('connection disconnected');
        amqp._amqpConnection.emit('disconnected', fakeConnectionContext);
        testCallback();
      });
    });
  });

  describe('#disconnect', function() {
    /*Tests_SRS_NODE_COMMON_AMQP_16_034: [The `disconnect` method shall detach all open links before disconnecting the underlying AMQP client.]*/
    it('detaches the CBS endpoints before disconnecting the client', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      var fakeContext = {connection: fakeConnection};
      sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeContext)});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {fakeSession.emit('session_open', fakeSessionContext)});
      fakeConnection.close = () => {};
      sinon.stub(fakeConnection, 'close').callsFake(() => {fakeConnection.emit('connection_close')});

      amqp._cbs = {
        detach: sinon.stub().callsArg(0)
      };

      amqp.connect({uri: 'uri'}, function() {
        amqp.disconnect(function(err) {
          if (err) {
            testCallback(err);
          } else {
            testCallback();
          }
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_034: [The `disconnect` method shall detach all open links before disconnecting the underlying AMQP client.]*/
    it('detaches existing links before disconnecting the client', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      var fakeContext = {connection: fakeConnection};
      sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeContext)});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {fakeSession.emit('session_open', fakeSessionContext)});
      fakeConnection.close = () => {};
      sinon.stub(fakeConnection, 'close').callsFake(() => {fakeConnection.emit('connection_close')});

      var fakeSender = {
        detach: sinon.stub().callsArg(0)
      };
      var fakeReceiver = {
        detach: sinon.stub().callsArg(0)
      };

      amqp.connect({uri: 'uri'}, function() {
        amqp._senders.fake_sender_endpoint = fakeSender;
        amqp._receivers.fake_receiver_endpoint = fakeReceiver;

        amqp.disconnect(function(err) {
          if (err) {
            testCallback(err);
          } else {
            assert(fakeSender.detach.calledOnce);
            assert(fakeReceiver.detach.calledOnce);
            testCallback();
          }
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_004: [The disconnect method shall call the `done` callback when the application/service has been successfully disconnected from the service]*/
    it('calls the done callback if disconnected successfully', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      var fakeContext = {connection: fakeConnection};
      sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeContext)});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {fakeSession.emit('session_open', fakeSessionContext)});
      fakeConnection.close = () => {};
      sinon.stub(fakeConnection, 'close').callsFake(() => {fakeConnection.emit('connection_close')});

      amqp.connect({uri: 'uri'}, function() {
        amqp.disconnect(function(err) {
          if (err) testCallback(err);
          else {
            testCallback();
          }
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_005: [The disconnect method shall call the `done` callback and pass the error as a parameter if the disconnection is unsuccessful]*/
    it('calls the done callback with an error if there\'s an error while disconnecting', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeConnectionContext)});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {fakeSession.emit('session_open', fakeSessionContext)});
      fakeConnection.close = () => {};
      fakeConnection.error = new Error('error while disconnecting')
      sinon.stub(fakeConnection, 'close').callsFake(() => {fakeConnection.emit('connection_error', fakeConnectionContext)});

      amqp.connect({uri: 'uri'}, function() {
        amqp.disconnect(function(err) {
          if (err) {
            assert.instanceOf(err, Error);
            testCallback();
          } else {
            testCallback(new Error('disconnect callback was called without an error'));
          }
        });
      });
    });

    it('immediately calls the callback if already disconnected', function(testCallback) {
      var amqp = new Amqp();
      amqp.disconnect(function(err) {
        assert.isNull(err);
        testCallback();
      });
    });

    it('ignores client errors emitted while disconnecting', function (testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      var fakeContext = {connection: fakeConnection};
      sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeContext)});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {fakeSession.emit('session_open', fakeSessionContext)});
      fakeConnection.close = sinon.stub();

      amqp.setDisconnectHandler(function() {
        assert.fail();
      });
      amqp.connect({uri: 'uri'}, function() {
        amqp.disconnect(function() {});
        amqp._amqpConnection.emit('client:errorReceived', new Error('should be ignored'));
        testCallback();
      });
    });
  });

  describe('#connect using custom SASL', function() {
    it.skip('sets the saslMechanism property in the policyOverride object', function (testCallback) {
      var amqp = new Amqp();
      var connectStub = sinon.stub(amqp._amqp, 'connect').resolves();
      var fakeSaslName = 'FAKE';
      var fakeSaslMechanism = { getInitFrame: function () {}, getResponseFrame: function () {}};

      var config = {
        uri: 'uri',
        saslMechanismName: fakeSaslName,
        saslMechanism: fakeSaslMechanism
      };

      amqp.connect(config, function () {
        assert.strictEqual(connectStub.firstCall.args[1].saslMechanism, fakeSaslName);
        testCallback();
      });
    });

    it.skip('calls registerSaslMechanism on the amqp10 client', function (testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves();
      var registerSaslMechanismStub = sinon.stub(amqp._amqp, 'registerSaslMechanism');
      var fakeSaslName = 'FAKE';
      var fakeSaslMechanism = { getInitFrame: function () {}, getResponseFrame: function () {}};
      var config= {
        uri: 'uri',
        saslMechanismName: fakeSaslName,
        saslMechanism: fakeSaslMechanism
      };

      amqp.connect(config, function () {
        assert.strictEqual(registerSaslMechanismStub.firstCall.args[0], fakeSaslName);
        assert.strictEqual(registerSaslMechanismStub.firstCall.args[1], fakeSaslMechanism);
        testCallback();
      });
    });
  });

  describe('#send', function() {
    it.skip('calls the done callback with a MessageEnqueued result if it successful', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().resolves('message enqueued');

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      amqp.connect({uri: 'uri'}, function() {
        amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err, result) {
          if(!err) {
            assert.instanceOf(result, results.MessageEnqueued);
          }
          testCallback(err);

        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_007: [If send encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
    it.skip('calls the done callback with an Error if creating a sender fails', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().resolves('message enqueued');

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').rejects('failed to create sender');

      amqp.connect({uri: 'uri'}, function() {
        amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err) {
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });

    it.skip('calls the done callback with an Error if the sender fails to send the message', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().rejects('could not send');

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      amqp.connect({uri: 'uri'}, function() {
        amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err) {
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });

    it.skip('Reuses the same sender link if already created', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      var endpointName = 'endpoint';
      sender.send = sinon.stub().resolves('message enqueued');

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      amqp.connect({uri: 'uri'}, function() {
        amqp.send(new Message('message'), endpointName, 'deviceId', function(err, result) {
          if (err) {
            testCallback(err);
          } else {
            assert.instanceOf(result, results.MessageEnqueued);
            assert(amqp._amqp.createSender.calledOnce);
            amqp.send(new Message('message'), endpointName, 'deviceId', function(err, result) {
              if (!err) {
                assert.instanceOf(result, results.MessageEnqueued);
                assert(amqp._amqp.createSender.calledOnce);
              }
              testCallback(err);
            });
          }
        });
      });
    });

    it.skip('does not populate the \'to\' property of the amqp message if not passed', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().resolves('message enqueued');

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      assert.doesNotThrow(function() {
        amqp.connect({uri: 'uri'}, function() {
          amqp.send(new Message('message'), 'endpoint', undefined, function() {
            assert.isUndefined(sender.send.args[0][0].properties.to);
            testCallback();
          });
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_011: [All methods should treat the `done` callback argument as optional and not throw if it is not passed as argument.]*/
    it.skip('does not throw on success if no callback is provided', function() {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().resolves('message enqueued');

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      assert.doesNotThrow(function() {
        amqp.connect({uri: 'uri'}, function() {
          amqp.send(new Message('message'), 'endpoint', 'deviceId');
        });
      });
    });

    it.skip('does not throw on error if no callback is provided', function() {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().rejects('failed to enqueue message');

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      assert.doesNotThrow(function() {
        amqp.connect({uri: 'uri'}, function() {
          amqp.send(new Message('message'), 'endpoint', 'deviceId');
        });
      });
    });
  });

  describe('#getReceiver', function() {
    /*Tests_SRS_NODE_COMMON_AMQP_16_010: [If a receiver for this endpoint doesn't exist, the getReceiver method should create a new AmqpReceiver object and then call the `done` method with the object that was just created as an argument.]*/
    it.skip('calls the done callback with a null Error and a receiver if successful', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createReceiver').resolves(new EventEmitter());

      amqp.connect({uri: 'uri'}, function() {
        amqp.getReceiver('endpoint', function(err, receiver) {
          assert.instanceOf(receiver, ReceiverLink);
          testCallback(err);
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_009: [If a receiver for this endpoint has already been created, the getReceiver method should call the `done` method with the existing instance as an argument.]*/
    it.skip('gets the existing receiver for an endpoint if it was previously created', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createReceiver').resolves(new EventEmitter());

      amqp.connect({uri: 'uri'}, function() {
        amqp.getReceiver('endpoint', function(err, recv1) {
          if (err) {
            testCallback(err);
          } else {
            amqp.getReceiver('endpoint', function(err, recv2) {
              if (err) {
                testCallback(err);
              } else {
                assert.equal(recv1, recv2);
                testCallback();
              }
            });
          }
        });
      });

    });

    it.skip('calls the done callback with an Error if it fails', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createReceiver').rejects(new Error('can not create receiver'));

      amqp.connect({uri: 'uri'}, function() {
        amqp.getReceiver('endpoint', function(err) {
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });
  });

  describe('#putToken', function() {
    it.skip('initializes the CBS endpoints if necessary', function(testCallback) {
      var fakeUuid = uuid.v4();
      var uuidStub = sinon.stub(uuid,'v4');
      uuidStub.onCall(0).returns(fakeUuid);

      var amqp = new Amqp();
      var fakeReceiver = new EventEmitter();
      fakeReceiver.accept = sinon.stub();
      fakeReceiver.forceDetach = function () {};

      var fakeSender = new EventEmitter();
      fakeSender.send = function() {
        return new Promise(function (resolve, reject) {
          void(reject);
          resolve();
          fakeReceiver.emit('message', responseMessage);
        });
      };
      fakeSender.forceDetach = function () {};

      var responseMessage = new AmqpMessage();
      responseMessage.properties = {};
      responseMessage.applicationProperties = {};
      responseMessage.properties.correlationId = fakeUuid;
      responseMessage.applicationProperties['status-code'] = 200;

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(fakeSender);
      sinon.stub(amqp._amqp, 'createReceiver').resolves(fakeReceiver);

      amqp.connect({uri: 'uri'}, function(err) {
        assert(!err);
        amqp.putToken('audience', 'token', function(err) {
          uuid.v4.restore();
          assert.isNull(err);
          assert(amqp._amqp.connect.calledOnce);
          assert(amqp._amqp.createSender.calledWith('$cbs'));
          assert(amqp._amqp.createReceiver.calledWith('$cbs'));
          testCallback();
        });
      });
    });

    it.skip('calls the callback with an error if the AMQP CBS sender link fails to attach', function (testCallback) {
      var amqp = new Amqp();
      var fakeError = new Error('fake error');
      sinon.stub(amqp._amqp, 'connect').resolves();
      var fakeReceiver = new EventEmitter();
      fakeReceiver.forceDetach = function () {};
      sinon.stub(amqp._amqp, 'createSender').rejects(fakeError);
      sinon.stub(amqp._amqp, 'createReceiver').resolves(fakeReceiver);

      amqp.connect({uri: 'uri'}, function(err) {
        assert(!err);
        amqp.putToken('audience', 'token', function(err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });
    });

    it.skip('calls the callback with an error if the AMQP CBS receiver link fails to attach', function (testCallback) {
      var amqp = new Amqp();
      var fakeError = new Error('fake error');
      sinon.stub(amqp._amqp, 'connect').resolves();
      var fakeSender = new EventEmitter();
      fakeSender.detach = sinon.stub().resolves();
      fakeSender.forceDetach = function () {};
      sinon.stub(amqp._amqp, 'createSender').resolves(fakeSender);
      sinon.stub(amqp._amqp, 'createReceiver').rejects(fakeError);

      amqp.connect({uri: 'uri'}, function(err) {
        assert(!err);
        amqp.putToken('audience', 'token', function(err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });
    });
  });

  describe('Links', function() {
    function createFakeLink() {
      var fakeLink = new EventEmitter();
      fakeLink.forceDetach = function() {};
      return fakeLink;
    }

    var fake_generic_endpoint = 'fake_generic_endpoint';
    [
      { amqpFunc: 'attachSenderLink', rheaFunc: 'open_sender', direction: 'target', kindOfLink: 'sender', rheaErrorEvent: 'sender_error', rheaOpenEvent: 'sender_open', rheaDetachEvent: 'sender_close', privateLinkArray: '_senders', fakeLinkObject: createFakeLink() },
      { amqpFunc: 'attachReceiverLink', rheaFunc: 'open_receiver', direction: 'source', kindOfLink: 'receiver', rheaErrorEvent: 'receiver_error', rheaOpenEvent: 'receiver_open', rheaDetachEvent: 'receiver_close', privateLinkArray: '_receivers', fakeLinkObject: createFakeLink() }
    ].forEach(function(testConfig) {
      describe('#' + testConfig.amqpFunc, function() {
        /*Tests_SRS_NODE_COMMON_AMQP_16_012: [The `attachSenderLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_017: [The `attachReceiverLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
        [null, undefined, ''].forEach(function(badEndpoint) {
          it('throws if the endpoint is \'' + badEndpoint + '\'', function() {
            var amqp = new Amqp();
            assert.throws(function() {
              amqp[testConfig.amqpFunc](badEndpoint, null, function() {});
            }, ReferenceError);
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_013: [The `attachSenderLink` method shall call `open_sender` on the `rhea` session object.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_018: [The `attachReceiverLink` method shall call `open_receiver` on the `rhea` session object.]*/
        it('calls ' + testConfig.rheaFunc + ' and passes the endpoint on rhea', function(testCallback) {
          var amqp = new Amqp();
          var fakeConnection = new EventEmitter();
          var fakeRheaConnectionContext = {connection: fakeConnection};
          sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeRheaConnectionContext)});
          var fakeRheaSession = new EventEmitter();
          var fakeRheaSessionContext = {session: fakeRheaSession};
          fakeConnection.create_session = sinon.stub().returns(fakeRheaSession);
          fakeRheaSession.open = () => {};
          sinon.stub(fakeRheaSession, 'open').callsFake(() => {fakeRheaSession.emit('session_open', fakeRheaSessionContext)});
          var fakeRheaLinkContext = {};
          fakeRheaLinkContext[testConfig.kindOfLink] = testConfig.fakeLinkObject;
          fakeRheaSession[testConfig.rheaFunc] = () => {};
          sinon.stub(fakeRheaSession, testConfig.rheaFunc).callsFake(() => {fakeRheaSession.emit(testConfig.rheaOpenEvent, fakeRheaLinkContext)});

          amqp.connect({uri: 'uri'}, function() {
            amqp[testConfig.amqpFunc](fake_generic_endpoint, null, function(err) {
              if (err) { return testCallback(err); }
              //
              // HELP HELP HELP - I'M AT A LOSS ON THIS ASSERT.  WHAT'S IT TESTING?
              //
              assert.isNotTrue(amqp._amqpSession[testConfig.rheaFunc].args[0][1]);
              testCallback();
            });
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_06_003: [The `attachSenderLink` method shall create a policy object that contain link options to be merged if the linkOptions argument is not falsy.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_06_004: [The `attachReceiverLink` method shall create a policy object that contain link options to be merged if the linkOptions argument is not falsy.]*/
        it('sets up the attach properties object with the link properties passed as argument', function(testCallback) {
          var amqp = new Amqp();
          var fakeConnection = new EventEmitter();
          var fakeRheaConnectionContext = {connection: fakeConnection};
          sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeRheaConnectionContext)});
          var fakeRheaSession = new EventEmitter();
          var fakeRheaSessionContext = {session: fakeRheaSession};
          fakeConnection.create_session = sinon.stub().returns(fakeRheaSession);
          fakeRheaSession.open = () => {};
          sinon.stub(fakeRheaSession, 'open').callsFake(() => {fakeRheaSession.emit('session_open', fakeRheaSessionContext)});
          var fakeRheaLinkContext = {};
          fakeRheaLinkContext[testConfig.kindOfLink] = testConfig.fakeLinkObject;
          fakeRheaSession[testConfig.rheaFunc] = () => {};
          sinon.stub(fakeRheaSession, testConfig.rheaFunc).callsFake(() => {fakeRheaSession.emit(testConfig.rheaOpenEvent, fakeRheaLinkContext)});

          var fakeLinkProps = {
            fakeKey: 'fakeValue'
          };

          amqp.connect({uri: 'uri', userAgentString: 'fakeAgent'}, function() {

            /*Tests_SRS_NODE_COMMON_AMQP_16_015: [The `attachSenderLink` method shall call the `done` callback with a `null` error and the link object that was created if the link was attached successfully.]*/
            /*Tests_SRS_NODE_COMMON_AMQP_16_020: [The `attachReceiverLink` method shall call the `done` callback with a `null` error and the link object that was created if the link was attached successfully.]*/
            amqp[testConfig.amqpFunc](fake_generic_endpoint, fakeLinkProps, function() {
              var expectedValue = {
                fakeKey: 'fakeValue',
              };
              expectedValue[testConfig.direction] = fake_generic_endpoint;
              assert.deepEqual(amqp._amqpSession[testConfig.rheaFunc].args[0][0], expectedValue);
              testCallback();
            });
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_016: [The `attachSenderLink` method shall call the `done` callback with an `Error` object if the link object wasn't created successfully.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_021: [The `attachReceiverLink` method shall call the `done` callback with an `Error` object if the link object wasn't created successfully.]*/
        it('calls the done callback with an error if attaching the link failed', function(testCallback) {
          var amqp = new Amqp();
          var fakeError = new Error('failed to create link');
          var fakeConnection = new EventEmitter();
          var fakeRheaConnectionContext = {connection: fakeConnection};
          sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeRheaConnectionContext)});
          var fakeRheaSession = new EventEmitter();
          fakeRheaSession.name = 'session';
          var fakeRheaSessionContext = {session: fakeRheaSession};
          fakeConnection.create_session = sinon.stub().returns(fakeRheaSession);
          fakeRheaSession.open = () => {};
          sinon.stub(fakeRheaSession, 'open').callsFake(() => {fakeRheaSession.emit('session_open', fakeRheaSessionContext)});
          fakeRheaSession[testConfig.rheaFunc] = () => {};
          fakeRheaSession.error = fakeError;
          sinon.stub(fakeRheaSession, testConfig.rheaFunc).callsFake(() => {fakeRheaSession.emit(testConfig.rheaErrorEvent, fakeRheaSessionContext)});

          amqp.connect({uri: 'uri'}, function() {
            amqp[testConfig.amqpFunc](fake_generic_endpoint, null, function(err) {
              assert.strictEqual(fakeError, err);
              testCallback();
            });
          });
        });

        it.skip('calls the done callback with an error if the connection fails while trying to attach the link', function(testCallback) {
          var amqp = new Amqp();
          var fakeError = new Error('failed to create link');
          var fakeConnection = new EventEmitter();
          fakeConnection.name = 'connection';
          var fakeRheaConnectionContext = {connection: fakeConnection};
          sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeRheaConnectionContext)});
          var fakeRheaSession = new EventEmitter();
          fakeRheaSession.name = 'session';
          var fakeRheaSessionContext = {session: fakeRheaSession};
          fakeConnection.create_session = sinon.stub().returns(fakeRheaSession);
          fakeRheaSession.open = () => {};
          sinon.stub(fakeRheaSession, 'open').callsFake(() => {fakeRheaSession.emit('session_open', fakeRheaSessionContext)});
          fakeRheaSession[testConfig.rheaFunc] = sinon.stub();

          amqp.connect({uri: 'uri'}, function() {
            fakeRheaSession.error = fakeError;
            amqp[testConfig.amqpFunc](fake_generic_endpoint, null, function(err) {
              assert.strictEqual(fakeError, err);
              testCallback();
            });
            fakeConnection.error = fakeError;
            amqp._amqpConnection.emit('disconnected', fakeRheaConnectionContext);
          });
        });

        it('subscribe to the detached event and removes it from ' + testConfig.privateLinkArray + ' if it is emitted', function(testCallback) {
          var amqp = new Amqp();
          var fakeConnection = new EventEmitter();
          var fakeRheaConnectionContext = {connection: fakeConnection};
          sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeRheaConnectionContext)});
          var fakeRheaSession = new EventEmitter();
          var fakeRheaSessionContext = {session: fakeRheaSession};
          fakeConnection.create_session = sinon.stub().returns(fakeRheaSession);
          fakeRheaSession.open = () => {};
          sinon.stub(fakeRheaSession, 'open').callsFake(() => {fakeRheaSession.emit('session_open', fakeRheaSessionContext)});
          var fakeRheaLinkContext = {};
          fakeRheaLinkContext[testConfig.kindOfLink] = testConfig.fakeLinkObject;
          testConfig.fakeLinkObject.name = testConfig.kindOfLink;
          fakeRheaSession[testConfig.rheaFunc] = () => {};
          sinon.stub(fakeRheaSession, testConfig.rheaFunc).callsFake(() => {fakeRheaSession.emit(testConfig.rheaOpenEvent, fakeRheaLinkContext)});
          testConfig.fakeLinkObject.remove = sinon.stub();

          amqp.connect({uri: 'uri'}, function() {
            amqp[testConfig.amqpFunc](fake_generic_endpoint, null, function() {
              assert.isDefined(amqp[testConfig.privateLinkArray][fake_generic_endpoint]);
              testConfig.fakeLinkObject.error = new Error();
              testConfig.fakeLinkObject.emit(testConfig.rheaDetachEvent, fakeRheaLinkContext);
              assert.isUndefined(amqp[testConfig.privateLinkArray][fake_generic_endpoint]);
              testCallback();
            });
          });
        });
      });
    });

    [
      { amqpDetachFunc: 'detachSenderLink', amqpAttachFunc: 'attachSenderLink', rheaOpenFunc: 'open_sender', rheaCloseFunc: 'close', direction: 'target', kindOfLink: 'sender', rheaErrorEvent: 'error', rheaOpenEvent: 'sender_open', rheaCloseEvent: 'sender_close', rheaDetachEvent: 'sender_close', privateLinkArray: '_senders', fakeLinkObject: createFakeLink() },
      { amqpDetachFunc: 'detachReceiverLink', amqpAttachFunc: 'attachReceiverLink', rheaOpenFunc: 'open_receiver', rheaCloseFunc: 'close', direction: 'source', kindOfLink: 'receiver', rheaErrorEvent: 'error', rheaOpenEvent: 'receiver_open', rheaCloseEvent: 'receiver_close', rheaDetachEvent: 'receiver_close', privateLinkArray: '_receivers', fakeLinkObject: createFakeLink() }
    ].forEach(function(testConfig) {
      describe('#' + testConfig.amqpDetachFunc, function() {
        /*Tests_SRS_NODE_COMMON_AMQP_16_022: [The `detachSenderLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
        [null, undefined, ''].forEach(function(badEndpoint) {
          it('throws if the endpoint is \'' + badEndpoint + '\'', function() {
            var amqp = new Amqp();
            assert.throws(function() {
              amqp[testConfig.amqpDetachFunc](badEndpoint, null, function() {});
            }, ReferenceError);
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_023: [The `detachSenderLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
        it('calls the \'detach\' method on the link object', function (testCallback) {
          var amqp = new Amqp();
          var fakeConnection = new EventEmitter();
          var fakeRheaConnectionContext = {connection: fakeConnection};
          sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeRheaConnectionContext)});
          var fakeRheaSession = new EventEmitter();
          var fakeRheaSessionContext = {session: fakeRheaSession};
          fakeConnection.create_session = sinon.stub().returns(fakeRheaSession);
          fakeRheaSession.open = () => {};
          sinon.stub(fakeRheaSession, 'open').callsFake(() => {fakeRheaSession.emit('session_open', fakeRheaSessionContext)});
          var fakeRheaLink = new EventEmitter();
          fakeRheaLink.name = 'link';
          var fakeRheaLinkContext = {};
          fakeRheaLinkContext[testConfig.kindOfLink] = fakeRheaLink;
          fakeRheaSession[testConfig.rheaOpenFunc] = () => {};
          sinon.stub(fakeRheaSession, testConfig.rheaOpenFunc).callsFake(() => {fakeRheaSession.emit(testConfig.rheaOpenEvent, fakeRheaLinkContext)});
          fakeRheaLink[testConfig.rheaCloseFunc] = () => {};
          sinon.stub(fakeRheaLink, testConfig.rheaCloseFunc).callsFake(() => {fakeRheaLink.emit(testConfig.rheaCloseEvent, fakeRheaLinkContext)});

          amqp.connect({uri: 'uri'}, function() {
            amqp[testConfig.amqpAttachFunc](fake_generic_endpoint, null, function() {
              /*Tests_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
              amqp[testConfig.amqpDetachFunc](fake_generic_endpoint, function(err) {
                assert(fakeRheaLink[testConfig.rheaCloseFunc].calledOnce);
                testCallback(err);
              });
            });
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_025: [The `detachSenderLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
        it('calls the callback immediately if there\'s no link attached', function (testCallback) {
          var amqp = new Amqp();
          var fakeConnection = new EventEmitter();
          var fakeRheaConnectionContext = {connection: fakeConnection};
          sinon.stub(amqp._amqpContainer, 'connect').callsFake(() => {amqp._amqpContainer.emit('connection_open', fakeRheaConnectionContext)});
          var fakeRheaSession = new EventEmitter();
          var fakeRheaSessionContext = {session: fakeRheaSession};
          fakeConnection.create_session = sinon.stub().returns(fakeRheaSession);
          fakeRheaSession.open = () => {};
          sinon.stub(fakeRheaSession, 'open').callsFake(() => {fakeRheaSession.emit('session_open', fakeRheaSessionContext)});

          amqp.connect({uri: 'uri'}, function() {
            amqp[testConfig.amqpDetachFunc](fake_generic_endpoint, function(err) {
              testCallback(err);
            });
          });
        });

        it('calls the callback immediately if already disconnected', function (testCallback) {
          var amqp = new Amqp();
          /*Tests_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
          amqp[testConfig.amqpDetachFunc](fake_generic_endpoint, function(err) {
            assert.isUndefined(err);
            testCallback();
          });
        });
      });
    });
  });

  [
    { functionName: 'attachSenderLink',   invoke: (amqp, callback) => amqp.attachSenderLink('endpoint', null, callback) },
    { functionName: 'attachReceiverLink', invoke: (amqp, callback) => amqp.attachReceiverLink('endpoint', null, callback) },
    { functionName: 'initializeCBS',      invoke: (amqp, callback) => amqp.initializeCBS(callback) },
    { functionName: 'putToken',           invoke: (amqp, callback) => amqp.putToken('audience', 'token', callback) }
  ].forEach(function(testConfig) {
    it (testConfig.functionName + ' fails with NotConnectedError if not connected', function(callback) {
      var amqp = new Amqp();
      testConfig.invoke(amqp, function(err) {
        assert.instanceOf(err, errors.NotConnectedError);
        callback();
      });
    });
  });
});
