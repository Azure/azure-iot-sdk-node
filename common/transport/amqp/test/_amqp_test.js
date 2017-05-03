// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Promise = require('bluebird');
var assert = require('chai').assert;
var sinon = require('sinon');
require('sinon-as-promised');
var Amqp = require('../lib/amqp.js').Amqp;
var AmqpReceiver = require('../lib/amqp_receiver.js').AmqpReceiver;
var results = require('azure-iot-common').results;
var errors = require('azure-iot-common').errors;
var Message = require('azure-iot-common').Message;
var EventEmitter = require('events').EventEmitter;
var uuid = require('uuid');

var cbsReceiveEndpoint = '$cbs';
var cbsSendEndpoint = '$cbs';

describe('Amqp', function () {
  describe('#connect', function () {
    /* Tests_SRS_NODE_COMMON_AMQP_06_002: [The connect method shall throw a ReferenceError if the uri parameter has not been supplied.] */
    [undefined, null, ''].forEach(function (badUri){
      it('throws if uri is \'' + badUri +'\'', function () {
        var newClient = new Amqp();
        assert.throws(function () {
          newClient.connect(badUri);
        }, ReferenceError, '');
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_002: [The connect method shall establish a connection with the IoT hub instance and if given as argument call the `done` callback with a null error object in the case of success and a `results.Connected` object.]*/
    /*Tests_SRS_NODE_COMMON_AMQP_06_011: [The `connect` method shall set up a listener for responses to put tokens.]*/
    it('Calls the done callback when successfully connected', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      amqp.connect('uri', null, function(err, res) {
        if (err) testCallback(err);
        else {
          assert.instanceOf(res, results.Connected);
          testCallback();
        }
      });
    });

    it('Calls the done callback immediately when already connected', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').rejects('amqp10.client.connect should not be called');
      amqp._connected = true;
      amqp.connect('uri', null, function(err, res) {
        if (err) testCallback(err);
        else {
          assert.instanceOf(res, results.Connected);
          testCallback();
        }
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_003: [If given as an argument, the connect method shall call the `done` callback with a standard `Error` object if the connection fails.]*/
    it('Calls the done callback with an error if connecting fails (disconnected)', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').rejects('connection failed');
      amqp.connect('uri', null, function(err) {
        assert.instanceOf(err, Error);
        testCallback();
      });
    });

    it('Calls the done callback with an error if connecting fails (auth error)', function(testCallback) {
      var amqp = new Amqp();
      var testError = new Error();
      sinon.stub(amqp._amqp, 'connect', function() {
        return new Promise(function (resolve, reject) {
          amqp._amqp.emit('client:errorReceived', testError);
          reject(new Error('cannot connect'));
        });
      });
      amqp.connect('uri', null, function(err) {
        assert.strictEqual(err, testError);
        testCallback();
      });
    });
  });

  describe('#setDisconnectHandler', function() {
    it('disconnect callback is called when the \'connection:closed\' event is emitted', function(testCallback) {
      var amqp = new Amqp();
      amqp.setDisconnectHandler(function() {
        testCallback();
      });

      amqp._amqp.emit('connection:closed');
    });
  });

  describe('#disconnect', function() {
    /*Tests_SRS_NODE_COMMON_AMQP_16_034: [The `disconnect` method shall detach all open links before disconnecting the underlying AMQP client.]*/
    it('detaches existing links before disconnecting the client', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'disconnect').resolves();
      var fakeSender = {
        detach: sinon.stub().resolves()
      };
      var fakeReceiver = {
        _amqpReceiver: {
          detach: sinon.stub().resolves()
        }
      };
      amqp._senders.fake_sender_endpoint = fakeSender;
      amqp._receivers.fake_receiver_endpoint = fakeReceiver;

      amqp.disconnect(function(err) {
        if (err) {
          testCallback(err);
        } else {
          assert(fakeSender.detach.calledOnce);
          assert(fakeReceiver._amqpReceiver.detach.calledOnce);
          testCallback();
        }
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_004: [The disconnect method shall call the `done` callback when the application/service has been successfully disconnected from the service]*/
    it('calls the done callback if disconnected successfully', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'disconnect').resolves();
      amqp.disconnect(function(err) {
        if (err) testCallback(err);
        else {
          testCallback();
        }
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_005: [The disconnect method shall call the `done` callback and pass the error as a parameter if the disconnection is unsuccessful]*/
    it('calls the done callback with an error if there\'s an error while disconnecting', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'disconnect').rejects('disconnection error');
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

  describe('#send', function() {
    it('calls the done callback with an error if not connected', function(testCallback) {
      var amqp = new Amqp();
      amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err) {
        assert.instanceOf(err, Error);
        testCallback();
      });
    });

    it('calls the done callback with a MessageEnqueued result if it successful', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().resolves('message enqueued');

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      amqp.connect('uri', null, function() {
        amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err, result) {
          if(!err) {
            assert.instanceOf(result, results.MessageEnqueued);
          }
          testCallback(err);

        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_007: [If send encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
    it('calls the done callback with an Error if creating a sender fails', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().resolves('message enqueued');

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').rejects('failed to create sender');

      amqp.connect('uri', null, function() {
        amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err) {
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });

    it('calls the done callback with an Error if the sender fails to send the message', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().rejects('could not send');

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      amqp.connect('uri', null, function() {
        amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err) {
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });

    it('Reuses the same sender link if already created', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      var endpointName = 'endpoint';
      sender.send = sinon.stub().resolves('message enqueued');
      amqp._senders[endpointName] = sender;

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').rejects('createSender should not be called');

      amqp.connect('uri', null, function() {
        amqp.send(new Message('message'), endpointName, 'deviceId', function(err, result) {
          if (!err) {
            assert.instanceOf(result, results.MessageEnqueued);
          }
          testCallback(err);
        });
      });
    });

    it('does not populate a the \'to\' property of the amqp message if not passed', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().resolves('message enqueued');

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      assert.doesNotThrow(function() {
        amqp.connect('uri', null, function() {
          amqp.send(new Message('message'), 'endpoint', undefined, function() {
            assert.isUndefined(sender.send.args[0][0].properties.to);
            testCallback();
          });
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_011: [All methods should treat the `done` callback argument as optional and not throw if it is not passed as argument.]*/
    it('does not throw on success if no callback is provided', function() {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().resolves('message enqueued');

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      assert.doesNotThrow(function() {
        amqp.connect('uri', null, function() {
          amqp.send(new Message('message'), 'endpoint', 'deviceId');
        });
      });
    });

    it('does not throw on error if no callback is provided', function() {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().rejects('failed to enqueue message');

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      assert.doesNotThrow(function() {
        amqp.connect('uri', null, function() {
          amqp.send(new Message('message'), 'endpoint', 'deviceId');
        });
      });
    });
  });

  describe('#getReceiver', function() {
    /*Tests_SRS_NODE_COMMON_AMQP_16_010: [If a receiver for this endpoint doesn't exist, the getReceiver method should create a new AmqpReceiver object and then call the `done` method with the object that was just created as an argument.]*/
    it('calls the done callback with a null Error and a receiver if successful', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createReceiver').resolves('receiver');

      amqp.connect('uri', null, function() {
        amqp.getReceiver('endpoint', function(err, receiver) {
          assert.instanceOf(receiver, AmqpReceiver);
          testCallback(err);
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_009: [If a receiver for this endpoint has already been created, the getReceiver method should call the `done` method with the existing instance as an argument.]*/
    it('gets the existing receiver for an endpoint if it was previously created', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createReceiver').resolves(new AmqpReceiver('fake'));

      amqp.connect('uri', null, function() {
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

    it('calls the done callback with an Error if it fails', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createReceiver').rejects(new Error('cannt create receiver'));

      amqp.connect('uri', null, function() {
        amqp.getReceiver('endpoint', function(err) {
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });
  });

  describe('#initializeCBS', function() {
    /*Tests_SRS_NODE_COMMON_AMQP_06_019: [If given as an argument, the `initializeCBS` method shall call `initializeCBSCallback` with a standard `Error` object if the link/listener establishment fails.]*/
    it('Calls initializeCBSCallback with an error if can NOT establish a sender link', function(testCallback) {
      var amqp = new Amqp();
      var testError = new Error();
      sinon.stub(amqp, 'attachSenderLink').callsArgWith(2, testError);
      amqp._connected = true;
      amqp.initializeCBS(function(err) {
        assert.strictEqual(err, testError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_06_019: [If given as an argument, the `initializeCBS` method shall call `initializeCBSCallback` with a standard `Error` object if the link/listener establishment fails.]*/
    it('Calls initializeCBSCallback with an error if can NOT establish a receiver link', function(testCallback) {
      var amqp = new Amqp();
      var testError = new Error();
      sinon.stub(amqp, 'attachSenderLink').callsArgWith(2, null);
      sinon.stub(amqp, 'attachReceiverLink').callsArgWith(2, testError);
      amqp._connected = true;
      amqp.initializeCBS(function(err) {
        assert.strictEqual(err, testError);
        testCallback();
      });
    });

    it('returns NotConnectedError if client not connnected', function(testCallback) {
      var amqp = new Amqp();
      amqp.initializeCBS(function(err) {
        assert.instanceOf(err, errors.NotConnectedError);
        testCallback();
      });

    });

    /*Tests_SRS_NODE_COMMON_AMQP_06_020: [If given as an argument, the `initializeCBS` method shall call `initializeCBSCallback` with a null error object if successful.]*/
    it('Calls initializeCBSCallback with a null error object if successful', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp, 'attachSenderLink').callsArgWith(2, null);
      sinon.stub(amqp, 'attachReceiverLink').callsArgWith(2, null);

      amqp._receivers[cbsReceiveEndpoint] = new EventEmitter();
      amqp._senders[cbsSendEndpoint] = new EventEmitter();
      amqp._connected = true;
      amqp.initializeCBS(function(err) {
        assert.strictEqual(err, null);
        testCallback();
      });
    });


  });

  describe('#putToken', function() {
    [undefined, null, ''].forEach(function (badAudience){
      /*Tests_SRS_NODE_COMMON_AMQP_06_016: [The `putToken` method shall throw a ReferenceError if the `audience` argument is falsy.]*/
      it('throws if audience is \'' + badAudience +'\'', function () {
        var newClient = new Amqp();
        assert.throws(function () {
          newClient.putToken(badAudience, 'sas', function () {});
        }, ReferenceError, '');
      });
    });

    [undefined, null, ''].forEach(function (badToken){
      /*Tests_SRS_NODE_COMMON_AMQP_06_017: [The `putToken` method shall throw a ReferenceError if the `token` argument is falsy.]*/
      it('throws if sasToken is \'' + badToken +'\'', function () {
        var newClient = new Amqp();
        assert.throws(function () {
          newClient.putToken('audience', badToken, function () {});
        }, ReferenceError, '');
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_06_018: [The `putToken` method shall call the `putTokenCallback` callback (if provided) with a `NotConnectedError` object if the amqp client is not connected when the method is called.]*/
    it('calls the putTokenCallback with a NotConnectedError if the client is not connected', function(testCallback) {
      var amqp = new Amqp();
      amqp.putToken('audience', 'sasToken', function(err) {
        assert.instanceOf(err, errors.NotConnectedError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_06_022: [The `putToken` method shall call the `putTokenCallback` callback (if provided) with a `NotConnectedError` object if the `initializeCBS` has NOT been invoked.]*/
    it('calls the putTokenCallback with a NotConnectedError if initializeCBS not invoked', function(testCallback) {
      var amqp = new Amqp();
      amqp._connected = true;
      amqp.putToken('audience', 'sasToken', function(err) {
        assert.instanceOf(err, errors.NotConnectedError);
        testCallback();
      });
    });

    it('creates a timer if this is the first pending put token operation', function(testCallback) {
      this.clock = sinon.useFakeTimers();
      var amqp = new Amqp();
      var cbsSender = new EventEmitter();
      var cbsReceiver = new EventEmitter();
      cbsSender.send = sinon.stub().resolves('message enqueued');
      sinon.stub(amqp._amqp, 'createReceiver').resolves(cbsReceiver);
      sinon.stub(amqp._amqp, 'createSender').resolves(cbsSender);
      amqp._connected = true;
      var spyRemoveExpiredPutTokens = sinon.spy(amqp, '_removeExpiredPutTokens');
      amqp.initializeCBS(function(err) {
        assert.isNotOk(err, 'initalization passed');
        amqp._putToken.numberOfSecondsToTimeout = 120;
        amqp._putToken.putTokenTimeOutExaminationInterval = 10000;
        amqp.putToken('audience','sasToken', function () {});
        this.clock.tick(9999);
        assert.isTrue(spyRemoveExpiredPutTokens.notCalled, ' removeExpiredPutTokens should not have been called.');
        this.clock.tick(2);
        assert.isTrue(spyRemoveExpiredPutTokens.calledOnce, ' removeExpiredPutTokens should have been called once.');
        clearTimeout(amqp._putToken.timeoutTimer);
        this.clock.restore();
        testCallback();
      }.bind(this));
    });

    it('Two putTokens in succession still causes only one invocation of the timer callback', function(testCallback) {
      this.clock = sinon.useFakeTimers();
      var amqp = new Amqp();
      var cbsSender = new EventEmitter();
      var cbsReceiver = new EventEmitter();
      cbsSender.send = sinon.stub().resolves('message enqueued');
      sinon.stub(amqp._amqp, 'createReceiver').resolves(cbsReceiver);
      sinon.stub(amqp._amqp, 'createSender').resolves(cbsSender);
      amqp._connected = true;
      var spyRemoveExpiredPutTokens = sinon.spy(amqp, '_removeExpiredPutTokens');
      amqp.initializeCBS(function(err) {
        assert.isNotOk(err, 'initalization passed');
        amqp._putToken.numberOfSecondsToTimeout = 120;
        amqp._putToken.putTokenTimeOutExaminationInterval = 10000;
        amqp.putToken('audience','sasToken', function () {});
        this.clock.tick(500);
        assert.isTrue(spyRemoveExpiredPutTokens.notCalled, ' removeExpiredPutTokens should not have been called.');
        amqp.putToken('audience1','sasToken2', function () {});
        this.clock.tick(500);
        assert.isTrue(spyRemoveExpiredPutTokens.notCalled, ' removeExpiredPutTokens should not have been called.');
        this.clock.tick(8999);
        assert.isTrue(spyRemoveExpiredPutTokens.notCalled, ' removeExpiredPutTokens should not have been called.');
        this.clock.tick(6000);
        assert.isTrue(spyRemoveExpiredPutTokens.calledOnce, ' removeExpiredPutTokens should have been called once.');
        clearTimeout(amqp._putToken.timeoutTimer);
        this.clock.restore();
        testCallback();
      }.bind(this));
    });

    /*Tests_SRS_NODE_COMMON_AMQP_06_005: [The `putToken` method shall construct an amqp message that contains the following application properties:
    'operation': 'put-token'
    'type': 'servicebus.windows.net:sastoken'
    'name': <audience>

    and system properties of

    'to': '$cbs'
    'messageId': <uuid>
    'reply_to': 'cbs']

    and a body containing <sasToken>. */
    /*Tests_SRS_NODE_COMMON_AMQP_06_015: [The `putToken` method shall send this message over the `$cbs` sender link.]*/
    it('sends a put token operation', function(testCallback) {
      var fakeUuids = [uuid.v4()];
      var uuidStub = sinon.stub(uuid,'v4');
      var amqp = new Amqp();
      uuidStub.onCall(0).returns(fakeUuids[0]);
      var cbsSender = new EventEmitter();
      var cbsReceiver = new EventEmitter();
      cbsSender.send = sinon.stub().resolves('message enqueued');
      sinon.stub(amqp._amqp, 'createReceiver').resolves(cbsReceiver);
      sinon.stub(amqp._amqp, 'createSender').resolves(cbsSender);
      amqp._connected = true;
      amqp.initializeCBS(function(err) {
        assert.isNotOk(err, 'initalization passed');
        amqp.putToken('myaudience', 'my token');
        uuid.v4.restore();
        assert.equal(cbsSender.send.args[0][0].applicationProperties.operation, 'put-token', 'operation application property not equal');
        assert.equal(cbsSender.send.args[0][0].applicationProperties.type, 'servicebus.windows.net:sastoken', 'type application property not equal');
        assert.equal(cbsSender.send.args[0][0].applicationProperties.name, 'myaudience', 'name application property not equal');
        assert.equal(cbsSender.send.args[0][0].properties.to, '$cbs', 'to application property not equal');
        assert.equal(cbsSender.send.args[0][0].properties.messageId, fakeUuids[0], 'messageId n property not equal');
        assert.equal(cbsSender.send.args[0][0].properties.reply_to, 'cbs', 'reply_to property not equal');
        assert.isTrue(cbsSender.send.args[0][0].body === 'my token', 'body of put token not the sas token');
        clearTimeout(amqp._putToken.timeoutTimer);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_06_006: [The `putToken` method shall call `putTokenCallback` (if supplied) if the `send` generates an error such that no response from the service will be forthcoming.]*/
    it('sends two put tokens erroring the second , ensuring the first remains', function(testCallback) {
      var fakeUuids = [uuid.v4(), uuid.v4()];
      var uuidStub = sinon.stub(uuid,'v4');
      uuidStub.onCall(0).returns(fakeUuids[0]);
      uuidStub.onCall(1).returns(fakeUuids[1]);
      var amqp = new Amqp();
      var cbsSender = new EventEmitter();
      var cbsReceiver = new EventEmitter();
      cbsSender.send = sinon.stub().resolves('message enqueued');
      sinon.stub(amqp._amqp, 'createReceiver').resolves(cbsReceiver);
      sinon.stub(amqp._amqp, 'createSender').resolves(cbsSender);
      amqp._connected = true;

      amqp.initializeCBS(function(err) {
        assert.isNotOk(err, 'initalization passed');
        amqp.putToken('first audience', 'first token', function () {
          assert.fail('This callback for the first put token should not have been called');
        });
        cbsSender.send = sinon.stub().rejects('could not send');
        amqp.putToken('second audience', 'second token', function (err) {
          assert.instanceOf(err, Error);
          //
          // Make sure that the first put token is still outstanding.
          //
          assert.equal(amqp._putToken.outstandingPutTokens.length, 1, 'outstanding token array length' );
          assert.equal(amqp._putToken.outstandingPutTokens[0].correlationId, fakeUuids[0], 'outstanding token correlation id ');
          clearTimeout(amqp._putToken.timeoutTimer);
          testCallback();
        });
        uuid.v4.restore();
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_06_007: [ The `putToken` method will time out the put token operation if no response is returned within a configurable number of seconds.]*/
    /*Tests_SRS_NODE_COMMON_AMQP_06_008: [ The `putToken` method will invoke the `putTokenCallback` (if supplied) with an error object if the put token operation timed out. ]*/
    it('Three put tokens, two timeout initially, third later', function(testCallback) {
      this.clock = sinon.useFakeTimers();
      var fakeUuids = [uuid.v4(), uuid.v4(), uuid.v4()];
      var uuidStub = sinon.stub(uuid,'v4');
      uuidStub.onCall(0).returns(fakeUuids[0]);
      uuidStub.onCall(1).returns(fakeUuids[1]);
      uuidStub.onCall(2).returns(fakeUuids[2]);
      var amqp = new Amqp();
      var cbsSender = new EventEmitter();
      var cbsReceiver = new EventEmitter();
      cbsSender.send = sinon.stub().resolves('message enqueued');
      sinon.stub(amqp._amqp, 'createReceiver').resolves(cbsReceiver);
      sinon.stub(amqp._amqp, 'createSender').resolves(cbsSender);
      amqp._connected = true;

      amqp.initializeCBS(function(err) {
        assert.isNotOk(err, 'initalization passed');
        amqp._putToken.numberOfSecondsToTimeout = 120;
        amqp._putToken.putTokenTimeOutExaminationInterval = 10000;
        amqp.putToken('first audience', 'first token', function (err) {
          assert.instanceOf(err, errors.TimeoutError);
          //
          // There should only be one outstanding put token when this first put token is timed out.
          //
          assert.equal(amqp._putToken.outstandingPutTokens.length, 1, 'For the first put token call back invocation outstanding remaining ');
          assert.equal(amqp._putToken.outstandingPutTokens[0].correlationId, fakeUuids[2], 'For the first put token callback the outstanding correlation id. ');
        });
        this.clock.tick(5000); // 5 seconds between first and second
        amqp.putToken('second audience', 'second token', function (err) {
          assert.instanceOf(err, errors.TimeoutError);
          //
          // There should only be one outstanding put token when this second put token is timed out.
          //
          assert.equal(amqp._putToken.outstandingPutTokens.length, 1, 'For the second put token call back invocation outstanding remaining ');
          assert.equal(amqp._putToken.outstandingPutTokens[0].correlationId, fakeUuids[2], 'For the second put token callback the outstanding correlation id. ');
        });
        this.clock.tick(30000); // 30 seconds more till the third
        amqp.putToken('third audience', 'third token', function (err) {
          assert.instanceOf(err, errors.TimeoutError);
          //
          // There should be no outstanding put token when this put token is timed out.
          //
          assert.equal(amqp._putToken.outstandingPutTokens.length, 0, 'For the third put token call back invocation outstanding remaining ');
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

    /*Tests_SRS_NODE_COMMON_AMQP_06_013: [A put token response of 200 will invoke `putTokenCallback` with null parameters.]*/
    it('Three put tokens, first and third timeout eventually, second completes successfully', function(testCallback) {
      this.clock = sinon.useFakeTimers();
      var fakeUuids = [uuid.v4(), uuid.v4(), uuid.v4()];
      var uuidStub = sinon.stub(uuid,'v4');
      var amqp = new Amqp();
      uuidStub.onCall(0).returns(fakeUuids[0]);
      uuidStub.onCall(1).returns(fakeUuids[1]);
      uuidStub.onCall(2).returns(fakeUuids[2]);
      var cbsSender = new EventEmitter();
      var cbsReceiver = new EventEmitter();
      cbsSender.send = sinon.stub().resolves('message enqueued');
      sinon.stub(amqp._amqp, 'createReceiver').resolves(cbsReceiver);
      sinon.stub(amqp._amqp, 'createSender').resolves(cbsSender);
      var responseMessage = new Message();
      responseMessage.correlationId = fakeUuids[1];
      responseMessage.properties.add('status-code', 200);
      amqp._connected = true;

      amqp.initializeCBS(function(err) {
        assert.isNotOk(err, 'initalization passed');
        amqp._receivers[cbsReceiveEndpoint].complete = sinon.spy();
        amqp._putToken.numberOfSecondsToTimeout = 120;
        amqp._putToken.putTokenTimeOutExaminationInterval = 10000;
        amqp.putToken('first audience', 'first token', function (err) {
          assert.instanceOf(err, errors.TimeoutError);
          //
          // There should only be one outstanding put token when this first put token is timed out.
          //
          assert.equal(amqp._putToken.outstandingPutTokens.length, 1, 'For the first put token call back invocation outstanding remaining ');
          assert.equal(amqp._putToken.outstandingPutTokens[0].correlationId, fakeUuids[2], 'For the second put token callback the first outstanding correlation id. ');
        });
        this.clock.tick(20000); // 20 seconds between first and second
        amqp.putToken('second audience', 'second token', function (err, putTokenResult) {
          assert.isNotOk(err,'The error object passed');
          assert.isNotOk(putTokenResult,'The result object passed');
          //
          // There should be two outstanding put token when this second put token succeeds.
          //
          assert.equal(amqp._putToken.outstandingPutTokens.length, 2, 'For the second put token call back invocation outstanding remaining ');
          assert.equal(amqp._putToken.outstandingPutTokens[0].correlationId, fakeUuids[0], 'For the second put token callback the first outstanding correlation id. ');
          assert.equal(amqp._putToken.outstandingPutTokens[1].correlationId, fakeUuids[2], 'For the second put token callback the second outstanding correlation id. ');
        });
        this.clock.tick(30000); // 30 seconds more till the third.  We are at 50 seconds from the start of the first put token.
        amqp.putToken('third audience', 'third token', function (err) {
          assert.instanceOf(err, errors.TimeoutError);
          //
          // There should be no outstanding put token when this put token is timed out.
          //
          assert.equal(amqp._putToken.outstandingPutTokens.length, 0, 'For the third put token call back invocation outstanding remaining ');
          assert(amqp._receivers[cbsReceiveEndpoint].complete.calledOnce);
          this.clock.restore();
          testCallback();
        }.bind(this));
        this.clock.tick(40000); // Let them sit in the outstanding list for a bit.  We should be at 1 minute 30 seconds at this point.
        process.nextTick(function () {
          //
          // Emit a put token response which should complete the second put token.
          //
          amqp._receivers[cbsReceiveEndpoint].emit('message',responseMessage);
          this.clock.tick(10000); // Move forward a bit We should be at 1 minute 40 seconds after the start of the first put token.
          process.nextTick(function () {
            assert.equal(amqp._putToken.outstandingPutTokens.length, 2, 'First time stop after completing the second put token');
            assert.equal(amqp._putToken.outstandingPutTokens[0].correlationId, fakeUuids[0], 'First time stop - the first outstanding correlation id. ');
            assert.equal(amqp._putToken.outstandingPutTokens[1].correlationId, fakeUuids[2], 'First time stop - the second outstanding correlation id. ');
            //
            // At this point the second put token is done.  Move forward enough time to complete the first put token
            //
            this.clock.tick(30000); // Move forward 30 seconds. We should be at 2 minutes 20 seconds after the start of the first put token.
            process.nextTick(function () {
              assert.equal(amqp._putToken.outstandingPutTokens.length, 1, 'Second time stop after completing the second put token');
              assert.equal(amqp._putToken.outstandingPutTokens[0].correlationId, fakeUuids[2], 'Second time stop - the third put token should be remaining.');
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

    /*Tests_SRS_NODE_COMMON_AMQP_06_014: [A put token response not equal to 200 will invoke `putTokenCallback` with an error object of UnauthorizedError.]*/
    it('Status result not equal to 200 completes the put token with an error.', function(testCallback) {
      var fakeUuids = [uuid.v4()];
      var uuidStub = sinon.stub(uuid,'v4');
      uuidStub.onCall(0).returns(fakeUuids[0]);
      var amqp = new Amqp();
      var cbsSender = new EventEmitter();
      var cbsReceiver = new EventEmitter();
      cbsSender.send = sinon.stub().resolves('message enqueued');
      sinon.stub(amqp._amqp, 'createReceiver').resolves(cbsReceiver);
      sinon.stub(amqp._amqp, 'createSender').resolves(cbsSender);
      amqp._connected = true;
      var responseMessage = new Message();
      responseMessage.correlationId = fakeUuids[0];
      responseMessage.properties.add('status-code', 201);
      responseMessage.properties.add('status-description', 'cryptic message');

      amqp.initializeCBS(function(err) {
        assert.isNotOk(err, 'initalization passed');
        amqp._receivers[cbsReceiveEndpoint].complete = sinon.spy();
        amqp.putToken('audience', 'token', function (err, putTokenResult) {
          assert.instanceOf(err, errors.UnauthorizedError);
          assert.isNotOk(putTokenResult,'The result object passed');
          assert.equal(amqp._putToken.outstandingPutTokens.length, 0, 'For put token call nothing should be outstanding.');
          assert(amqp._receivers[cbsReceiveEndpoint].complete.calledOnce);
          uuid.v4.restore();
          testCallback();
        });
        amqp._receivers[cbsReceiveEndpoint].emit('message',responseMessage);
      }.bind(this));
    });

    it('Do a put token with no callback that completes successfully', function(testCallback) {
      var fakeUuids = [uuid.v4()];
      var uuidStub = sinon.stub(uuid,'v4');
      uuidStub.onCall(0).returns(fakeUuids[0]);
      var amqp = new Amqp();
      var cbsSender = new EventEmitter();
      var cbsReceiver = new EventEmitter();
      cbsSender.send = sinon.stub().resolves('message enqueued');
      sinon.stub(amqp._amqp, 'createReceiver').resolves(cbsReceiver);
      sinon.stub(amqp._amqp, 'createSender').resolves(cbsSender);
      amqp._connected = true;
      var responseMessage = new Message();
      responseMessage.correlationId = fakeUuids[0];
      responseMessage.properties.add('status-code', 200);

      amqp.initializeCBS(function(err) {
        assert.isNotOk(err, 'initalization passed');
        amqp._receivers[cbsReceiveEndpoint].complete = sinon.spy();
        amqp.putToken('first audience', 'first token');
        assert.equal(amqp._putToken.outstandingPutTokens.length, 1, 'Should be one put token outstanding.');
        //
        // Emit a put token response which should complete the put token.
        //
        amqp._receivers[cbsReceiveEndpoint].emit('message',responseMessage);
        process.nextTick(function () {
          assert.equal(amqp._putToken.outstandingPutTokens.length, 0, 'First time stop all should be done');
          assert(amqp._receivers[cbsReceiveEndpoint].complete.calledOnce);
          uuid.v4.restore();
          testCallback();
        }.bind(this));
      }.bind(this));
    });

  });

  describe('Links', function() {
    var fake_generic_endpoint = 'fake_generic_endpoint';
    [
      {amqpFunc: 'attachSenderLink', amqp10Func: 'createSender', privateLinkArray: '_senders', fakeLinkObject: { send: function() {} }},
      {amqpFunc: 'attachReceiverLink', amqp10Func: 'createReceiver', privateLinkArray: '_receivers', fakeLinkObject: { endpoint: fake_generic_endpoint }},
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

        /*Tests_SRS_NODE_COMMON_AMQP_16_032: [The `attachSenderLink` method shall call the `done` callback with a `NotConnectedError` object if the amqp client is not connected when the method is called.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_033: [The `attachReceiverLink` method shall call the `done` callback with a `NotConnectedError` object if the amqp client is not connected when the method is called.]*/
        it('calls the done callback with a NotConnectedError if the client is not connected', function(testCallback) {
          var amqp = new Amqp();
          amqp[testConfig.amqpFunc](fake_generic_endpoint, null, function(err) {
            assert.instanceOf(err, errors.NotConnectedError);
            testCallback();
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_013: [The `attachSenderLink` method shall call `createSender` on the `amqp10` client object.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_018: [The `attachReceiverLink` method shall call `createReceiver` on the `amqp10` client object.]*/
        it('calls ' + testConfig.amqp10Func + ' and passes the endpoint on amqp10.AmqpClient', function(testCallback) {
          var amqp = new Amqp();
          sinon.stub(amqp._amqp, 'connect').resolves('connected');
          sinon.stub(amqp._amqp, testConfig.amqp10Func).resolves(testConfig.fakeLinkObject);
          amqp.connect('uri', null, function() {
            amqp[testConfig.amqpFunc](fake_generic_endpoint, null, function(err, result) {
              assert.isNull(err);
              assert.isNotTrue(amqp._amqp[testConfig.amqp10Func].args[0][1]);
              assert.isOk(result);
              assert.strictEqual(result, amqp[testConfig.privateLinkArray][fake_generic_endpoint]);
              testCallback();
            });
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_06_003: [The `attachSenderLink` method shall create a policy object that contain link options to be merged if the linkOptions argument is not falsy.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_06_004: [The `attachReceiverLink` method shall create a policy object that contain link options to be merged if the linkOptions argument is not falsy.]*/
        it('sets up the attach properties object with the link properties passed as argument', function(testCallback) {
          var amqp = new Amqp();
          var fakeLinkProps = {
            fakeKey: 'fakeValue'
          };

          sinon.stub(amqp._amqp, 'connect').resolves('connected');
          sinon.stub(amqp._amqp, testConfig.amqp10Func).resolves(testConfig.fakeLinkObject);
          amqp.connect('uri', null, function() {
            /*Tests_SRS_NODE_COMMON_AMQP_16_015: [The `attachSenderLink` method shall call the `done` callback with a `null` error and the link object that was created if the link was attached successfully.]*/
            /*Tests_SRS_NODE_COMMON_AMQP_16_020: [The `attachReceiverLink` method shall call the `done` callback with a `null` error and the link object that was created if the link was attached successfully.]*/
            amqp[testConfig.amqpFunc](fake_generic_endpoint, fakeLinkProps, function() {
              assert.deepEqual(amqp._amqp[testConfig.amqp10Func].args[0][1], { fakeKey: 'fakeValue'});
              testCallback();
            });
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_016: [The `attachSenderLink` method shall call the `done` callback with an `Error` object if the link object wasn't created successfully.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_021: [The `attachReceiverLink` method shall call the `done` callback with an `Error` object if the link object wasn't created successfully.]*/
        it('calls the done callback with an error if attaching the link failed', function(testCallback) {
          var amqp = new Amqp();
          var fakeError = new Error('failed to create link');
          sinon.stub(amqp._amqp, 'connect').resolves('connected');
          sinon.stub(amqp._amqp, testConfig.amqp10Func).rejects(fakeError);
          amqp.connect('uri', null, function() {
            amqp[testConfig.amqpFunc](fake_generic_endpoint, null, function(err) {
              assert.strictEqual(fakeError, err.amqpError);
              testCallback();
            });
          });
        });

        it('calls the done callback with an error if the connection fails while trying to attach the link', function(testCallback) {
          var amqp = new Amqp();
          var fakeError = new Error('failed to create sender');
          sinon.stub(amqp._amqp, 'connect').resolves('connected');
          sinon.stub(amqp._amqp, testConfig.amqp10Func).resolves(testConfig.fakeLinkObject);
          amqp.connect('uri', null, function() {
            amqp[testConfig.amqpFunc](fake_generic_endpoint, null, function(err) {
              assert.strictEqual(fakeError, err);
              testCallback();
            });

            amqp._amqp.emit('client:errorReceived', fakeError);
          });
        });
      });
    });

    describe('#detachSenderLink', function() {
      /*Tests_SRS_NODE_COMMON_AMQP_16_022: [The `detachSenderLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
      [null, undefined, ''].forEach(function(badEndpoint) {
        it('throws if the endpoint is \'' + badEndpoint + '\'', function() {
          var amqp = new Amqp();
          assert.throws(function() {
            amqp.detachSenderLink(badEndpoint, null, function() {});
          }, ReferenceError);
        });
      });

      /*Tests_SRS_NODE_COMMON_AMQP_16_023: [The `detachSenderLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
      it('calls the \'detach\' method on the link object', function (testCallback) {
        var fakeLink = {
          detach: function () { return new Promise(function() {}); }
        };
        sinon.stub(fakeLink, 'detach').resolves();

        var amqp = new Amqp();
        amqp._senders[fake_generic_endpoint] = fakeLink;
        /*Tests_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
        amqp.detachSenderLink(fake_generic_endpoint, function(err) {
          assert.isUndefined(err);
          assert.isUndefined(amqp._senders[fake_generic_endpoint]);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_COMMON_AMQP_16_025: [The `detachSenderLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
      it('calls the callback immediately if there\'s no link attached', function (testCallback) {
        var fakeLink = {
          detach: function () { return new Promise(function() {}); }
        };
        sinon.stub(fakeLink, 'detach').resolves();

        var amqp = new Amqp();
        assert.isUndefined(amqp._senders[fake_generic_endpoint]);
        amqp.detachSenderLink(fake_generic_endpoint, function(err) {
          assert.isUndefined(err);
          assert.isUndefined(amqp._senders[fake_generic_endpoint]);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_COMMON_AMQP_16_026: [The `detachSenderLink` method shall call the `done` callback with an `Error` object if there was an error while detaching the link.]*/
      it('calls the callback with an error if detaching the link causes an error', function (testCallback) {
        var fakeError = new Error('failed to detach');
        var fakeLink = {
          detach: function () { return new Promise(function() {}); }
        };
        sinon.stub(fakeLink, 'detach').rejects(fakeError);

        var amqp = new Amqp();
        amqp._senders[fake_generic_endpoint] = fakeLink;
        amqp.detachSenderLink(fake_generic_endpoint, function(err) {
          assert.strictEqual(fakeError, err);
          assert.isUndefined(amqp._senders[fake_generic_endpoint]);
          testCallback();
        });
      });
    });

    describe('#detachReceiverLink', function() {
      /*Tests_SRS_NODE_COMMON_AMQP_16_027: [The `detachReceiverLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
      [null, undefined, ''].forEach(function(badEndpoint) {
        it('throws if the endpoint is \'' + badEndpoint + '\'', function() {
          var amqp = new Amqp();
          assert.throws(function() {
            amqp.detachReceiverLink(badEndpoint, null, function() {});
          }, ReferenceError);
        });
      });

      /*Tests_SRS_NODE_COMMON_AMQP_16_028: [The `detachReceiverLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
      it('calls the \'detach\' method on the link object', function (testCallback) {
        var fakeLink = {
          _amqpReceiver: {
            detach: function () { return new Promise(function() {}); }
          }
        };
        sinon.stub(fakeLink._amqpReceiver, 'detach').resolves();

        var amqp = new Amqp();
        amqp._receivers[fake_generic_endpoint] = fakeLink;
        /*Tests_SRS_NODE_COMMON_AMQP_16_029: [The `detachReceiverLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
        amqp.detachReceiverLink(fake_generic_endpoint, function(err) {
          assert.isUndefined(err);
          assert.isUndefined(amqp._receivers[fake_generic_endpoint]);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_COMMON_AMQP_16_030: [The `detachReceiverLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
      it('calls the callback immediately if there\'s no link attached', function (testCallback) {
        var amqp = new Amqp();
        assert.isUndefined(amqp._receivers[fake_generic_endpoint]);
        amqp.detachReceiverLink(fake_generic_endpoint, function(err) {
          assert.isUndefined(err);
          assert.isUndefined(amqp._receivers[fake_generic_endpoint]);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_COMMON_AMQP_16_031: [The `detachReceiverLink` method shall call the `done` callback with an `Error` object if there was an error while detaching the link.]*/
      it('calls the callback with an error if detaching the link causes an error', function (testCallback) {
        var fakeError = new Error('failed to detach');
        var fakeLink = {
          _amqpReceiver: {
            detach: function () { return new Promise(function() {}); }
          }
        };
        sinon.stub(fakeLink._amqpReceiver, 'detach').rejects(fakeError);

        var amqp = new Amqp();
        amqp._receivers[fake_generic_endpoint] = fakeLink;
        amqp.detachReceiverLink(fake_generic_endpoint, function(err) {
          assert.strictEqual(fakeError, err);
          assert.isUndefined(amqp._receivers[fake_generic_endpoint]);
          testCallback();
        });
      });
    });
  });
});