// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var EventEmitter = require('events').EventEmitter;
var uuid = require('uuid');
var assert = require('chai').assert;
var sinon = require('sinon');

var Message = require('azure-iot-common').Message;
var Amqp = require('../lib/amqp.js').Amqp;
var AmqpTwinClient = require('../lib/amqp_twin_client.js').AmqpTwinClient;
var errors = require('azure-iot-common').errors;
var results = require('azure-iot-common').results;
var endpoint = require('azure-iot-common').endpoint;
var AuthenticationType = require('azure-iot-common').AuthenticationType;

describe('Amqp', function () {
  var transport = null;
  var receiver = null;
  var sender = null;
  var fakeBaseClient = null;
  var fakeTokenAuthenticationProvider = null;
  var fakeX509AuthenticationProvider = null;

  var testMessage = new Message();
  testMessage._transportObj = {};
  var testCallback = function () { };
  var configWithSSLOptions = { host: 'hub.host.name', deviceId: 'deviceId', x509: 'some SSL options' };
  var simpleSas = 'SharedAccessSignature sr=foo&sig=123&se=123';
  var configWithSAS = { host: 'hub.host.name', deviceId: 'deviceId', sharedAccessSignature: simpleSas};

  beforeEach(function () {
    sender = new EventEmitter();
    sender.send = sinon.stub().callsArgWith(1, null, new results.MessageEnqueued());
    sender.detach = sinon.stub().callsArg(0);
    sender.forceDetach = sinon.stub();
    sinon.spy(sender, 'on');
    sinon.spy(sender, 'removeListener');

    receiver = new EventEmitter();
    receiver.complete = sinon.stub().callsArgWith(1, new results.MessageCompleted());
    receiver.reject = sinon.stub().callsArgWith(1, new results.MessageRejected());
    receiver.abandon = sinon.stub().callsArgWith(1, new results.MessageAbandoned());
    receiver.detach = sinon.stub().callsArg(0);
    receiver.forceDetach = sinon.stub();
    sinon.spy(receiver, 'on');
    sinon.spy(receiver, 'removeListener');

    fakeBaseClient = {
      connect: sinon.stub().callsArgWith(2, null, new results.Connected()),
      disconnect: sinon.stub().callsArgWith(0, null, new results.Disconnected()),
      initializeCBS: sinon.stub().callsArgWith(0, null),
      putToken: sinon.stub().callsArgWith(2, null),
      getReceiver: sinon.stub().callsArgWith(1, null, receiver),
      attachSenderLink: sinon.stub().callsArgWith(2, null, sender),
      attachReceiverLink: sinon.stub().callsArgWith(2, null, receiver),
      detachSenderLink: sinon.stub().callsArg(1),
      detachReceiverLink: sinon.stub().callsArg(1),
      setDisconnectHandler: sinon.stub(),
      send: sinon.stub().callsArgWith(3, null, new results.MessageEnqueued())
    };

    fakeTokenAuthenticationProvider = new EventEmitter();
    fakeTokenAuthenticationProvider.type = AuthenticationType.Token;
    fakeTokenAuthenticationProvider.getDeviceCredentials = sinon.stub().callsArgWith(0, null, configWithSAS);
    fakeTokenAuthenticationProvider.updateSharedAccessSignature = sinon.stub();
    sinon.spy(fakeTokenAuthenticationProvider, 'on');

    fakeX509AuthenticationProvider = {
      type: AuthenticationType.X509,
      getDeviceCredentials: function (callback) {
        callback(null, configWithSSLOptions);
      },
      setX509Options: sinon.stub()
    };

    transport = new Amqp(fakeTokenAuthenticationProvider, fakeBaseClient);
  });

  afterEach(function () {
    transport = null;
    receiver = null;
    sender = null;
    fakeBaseClient = null;
  });

  describe('#constructor', function () {
    /*Codes_SRS_NODE_DEVICE_AMQP_16_056: [If the `authenticationProvider` object passed to the `Amqp` constructor has a `type` property which value is set to `AuthenticationType.Token` the `Amqp` constructor shall subscribe to the `newTokenAvailable` event of the `authenticationProvider` object.]*/
    it('subscribes to the newTokenAvailable event if the AuthenticationProvider has its type property set to AuthenticationType.Token', function () {
      assert.isTrue(fakeTokenAuthenticationProvider.on.calledOnce);
    });

    it('does not subscribe to the newTokenAvailable event if the authenticationProvider is x509', function () {
      fakeX509AuthenticationProvider.on = sinon.stub();
      var amqp = new Amqp(fakeX509AuthenticationProvider, fakeBaseClient);
      assert.isTrue(fakeX509AuthenticationProvider.on.notCalled);
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_16_057: [If a `newTokenAvailable` event is emitted by the `authenticationProvider` object passed as an argument to the constructor, a `putToken` operation shall be initiated with the new shared access signature if the amqp connection is already connected.]*/
    it('initiates a putToken when a newTokenAvailable event is received', function (testCallback) {
      var newSas = 'SharedAccessSignature sr=new&sig=456&se=456';
      transport.connect(function () {
        assert.isTrue(fakeBaseClient.putToken.calledOnce)
        fakeTokenAuthenticationProvider.emit('newTokenAvailable', { sharedAccessSignature: newSas });
        assert.isTrue(fakeBaseClient.putToken.calledTwice);
        assert.strictEqual(fakeBaseClient.putToken.secondCall.args[1], newSas);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_16_058: [If the `putToken` operation initiated upon receiving a `newTokenAvailable` event fails, a `disconnect` event shall be emitted with the error from the failed `putToken` operation.]*/
    it('emits a disconnect event if the putToken operation initiated from a newTokenAvailable event fails', function (testCallback) {
      var newSas = 'SharedAccessSignature sr=new&sig=456&se=456';
      var fakeError = new Error('fake');
      transport.on('disconnect', function (err) {
        assert.isTrue(fakeBaseClient.putToken.calledOnce);
        assert.strictEqual(err.amqpError, fakeError);
        testCallback();
      });
      transport.connect(function () {
        fakeBaseClient.putToken = sinon.stub().callsArgWith(2, fakeError);
        fakeTokenAuthenticationProvider.emit('newTokenAvailable', { sharedAccessSignature: newSas });
      });
    })
  });

  describe('Direct Methods', function () {
    describe('#sendMethodResponse', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_019: [The `sendMethodResponse` shall throw a `ReferenceError` if the `methodResponse` object is falsy.]*/
      [null, undefined].forEach(function (badResponse) {
        it('throws a ReferenceError if the methodResponse object is \'' + badResponse + '\'', function () {
          assert.throws(function () {
            transport.sendMethodResponse(badResponse, function () {});
          }, ReferenceError);
        });
      });

      it('calls the callback with a NotConnectedError if the device is disconnected', function (testCallback) {
        var fakeMethodResponse = { status: 200, payload: null, requestId: uuid.v4() };
        transport.sendMethodResponse(fakeMethodResponse, function (err) {
          assert.instanceOf(err, errors.NotConnectedError);
          testCallback();
        });
      });

      it('calls the callback with a NotConnectedError if the device is connecting', function (testCallback) {
        var fakeMethodResponse = { status: 200, payload: null, requestId: uuid.v4() };
        fakeBaseClient.connect = sinon.stub();
        transport.connect();
        transport.sendMethodResponse(fakeMethodResponse, function (err) {
          assert.instanceOf(err, errors.NotConnectedError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_020: [The `sendMethodResponse` response shall call the `AmqpDeviceMethodClient.sendMethodResponse` method with the arguments that were given to it.]*/
      it('calls the `sendMethodResponse` method on the AmqpDeviceMethodClient object', function (testCallback) {
        var fakeMethodResponse = { status: 200, payload: null, requestId: uuid.v4() };
        var fakeCallback = function () {};
        sinon.spy(transport._deviceMethodClient, 'sendMethodResponse');

        transport.connect(function () {
          transport.sendMethodResponse(fakeMethodResponse, fakeCallback);
          assert.isTrue(transport._deviceMethodClient.sendMethodResponse.calledWith(fakeMethodResponse));
          testCallback();
        });
      });

      it('fails if called disconnecting', function (testCallback) {
        var fakeMethodResponse = { status: 200, payload: null, requestId: uuid.v4() };
        var disconnectCallback;
        fakeBaseClient.disconnect = sinon.stub().callsFake(function (done) {
          disconnectCallback = done;
        });

        transport.connect(function () {
          assert(fakeBaseClient.connect.calledOnce);
          transport.disconnect(function () {});
          transport.sendMethodResponse(fakeMethodResponse, function (err) {
            assert.instanceOf(err, errors.NotConnectedError);
            testCallback();
          });
          disconnectCallback();
        });
      });
    });

    describe('#onDeviceMethod', function () {
      it('registers the callback and connects the transport if already connected and authenticated', function (testCallback) {
        var fakeMethodRequest = {
          requestId: 'foo',
          payload: { key: 'value' },
          methodName: 'fakeMethod'
        }

        transport.connect(function () {
          transport.onDeviceMethod(fakeMethodRequest.methodName, function () {
            testCallback();
          });
          transport._deviceMethodClient.emit('method_' + fakeMethodRequest.methodName, fakeMethodRequest);
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_024: [An `errorReceived` event shall be emitted by the `Amqp` object if an error is received on any of the `AmqpDeviceMethodClient` links.]*/
      it('emits an error event when the receiver emits an errorReceived event', function (testCallback) {
        var fakeError = new Error('fake error');
        transport.on('error', function (err) {
          assert.strictEqual(err.innerError, fakeError);
          assert.instanceOf(err, errors.DeviceMethodsDetachedError);
          testCallback();
        });

        transport.connect(function () {
          transport.onDeviceMethod('testMethod', function () {});
          transport._deviceMethodClient.emit('error', fakeError);
        });
      });
    });

    describe('enableMethods', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_038: [The `enableMethods` method shall connect and authenticate the transport if it is disconnected.]*/
      it('connects the transport if it is disconnected', function (testCallback) {
        transport.enableMethods(function () {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          assert(fakeBaseClient.attachSenderLink.calledWith(transport._deviceMethodClient._methodEndpoint));
          assert(fakeBaseClient.attachReceiverLink.calledWith(transport._deviceMethodClient._methodEndpoint));
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_038: [The `enableMethods` method shall connect and authenticate the transport if it is disconnected.]*/
      it('calls the callback with an error if the transport fails to connect', function (testCallback) {
        fakeBaseClient.connect = sinon.stub().callsArgWith(2, new Error('fake error'));
        transport.enableMethods(function (err) {
          assert(fakeBaseClient.connect.calledOnce);
          assert.instanceOf(err, Error);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_038: [The `enableMethods` method shall connect and authenticate the transport if it is disconnected.]*/
      it('calls the callback with an error if the transport fails to initialize the CBS links', function (testCallback) {
        fakeBaseClient.initializeCBS = sinon.stub().callsArgWith(0, new Error('fake error'));
        transport.enableMethods(function (err) {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert.instanceOf(err, Error);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_038: [The `enableMethods` method shall connect and authenticate the transport if it is disconnected.]*/
      it('calls the callback with an error if the transport fails to make a new putToken request on the CBS links', function (testCallback) {
        fakeBaseClient.putToken = sinon.stub().callsArgWith(2, new Error('fake error'));
        transport.enableMethods(function (err) {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          assert.instanceOf(err, Error);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_039: [The `enableMethods` method shall attach the method links and call its `callback` once these are successfully attached.]*/
      it('attaches the method links', function (testCallback) {
        transport.connect(function () {
          assert(fakeBaseClient.attachReceiverLink.notCalled);
          transport.enableMethods(function () {
            assert(fakeBaseClient.attachSenderLink.calledWith(transport._deviceMethodClient._methodEndpoint));
            assert(fakeBaseClient.attachReceiverLink.calledWith(transport._deviceMethodClient._methodEndpoint));
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_040: [The `enableMethods` method shall call its `callback` with an `Error` if the transport fails to connect, authenticate or attach method links.]*/
      it('calls its callback with an Error if attaching the method links fails', function (testCallback) {
        var fakeError = new Error('fake failed to attach');
        transport._deviceMethodClient.attach = sinon.stub().callsArgWith(0, fakeError);
        transport.connect(function () {
          assert(fakeBaseClient.attachReceiverLink.notCalled);
          transport.enableMethods(function (err) {
            assert.isTrue(transport._deviceMethodClient.attach.calledOnce);
            assert.strictEqual(err, fakeError);
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_041: [Any `error` event received on any of the links used for device methods shall trigger the emission of an `error` event by the transport, with an argument that is a `MethodsDetachedError` object with the `innerError` property set to that error.]*/
      it('emits a DeviceMethodsDetachedError with an innerError property if the link fails after being established correctly', function (testCallback) {
        var fakeError = new Error('fake twin receiver link error');
        transport.on('error', function (err) {
          assert.instanceOf(err, errors.DeviceMethodsDetachedError);
          assert.strictEqual(err.innerError, fakeError);
          testCallback();
        });

        transport.connect(function () {
          assert(fakeBaseClient.attachReceiverLink.notCalled);
          transport.enableMethods(function () {
            assert(fakeBaseClient.attachReceiverLink.calledWith(transport._deviceMethodClient._methodEndpoint));
            receiver.emit('error', fakeError);
          });
        });
      });
    });

    describe('disableMethods', function (testCallback) {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_044: [The `disableMethods` method shall call its `callback` immediately if the transport is already disconnected.]*/
      it('calls the callback immediately if the transport is disconnected', function (testCallback) {
        transport.disableMethods(function (err) {
          assert.isNotOk(err);
          assert(receiver.detach.notCalled);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_042: [The `disableMethods` method shall call `detach` on the device method links and call its callback when these are successfully detached.]*/
      it('detaches the methods links', function (testCallback) {
        transport._deviceMethodClient.detach = sinon.stub().callsArg(0);
        transport.connect(function () {
          assert(fakeBaseClient.attachReceiverLink.notCalled);
          transport.enableMethods(function () {
            assert(fakeBaseClient.attachSenderLink.calledWith(transport._deviceMethodClient._methodEndpoint));
            assert(fakeBaseClient.attachReceiverLink.calledWith(transport._deviceMethodClient._methodEndpoint));
            transport.disableMethods(function () {
              assert(transport._deviceMethodClient.detach.calledOnce);
              testCallback();
            });
          });
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_043: [The `disableMethods` method shall call its `callback` with an `Error` if it fails to detach the device method links.]*/
      it('calls its callback with an Error if an error happens while detaching the methods links', function (testCallback) {
        transport._deviceMethodClient.detach = sinon.stub().callsArgWith(0, new Error('fake detach error'));
        transport.connect(function () {
          assert(fakeBaseClient.attachReceiverLink.notCalled);
          transport.enableMethods(function () {
            assert(fakeBaseClient.attachSenderLink.calledWith(transport._deviceMethodClient._methodEndpoint));
            assert(fakeBaseClient.attachReceiverLink.calledWith(transport._deviceMethodClient._methodEndpoint));
            transport.disableMethods(function (err) {
              assert(transport._deviceMethodClient.detach.calledOnce);
              assert.instanceOf(err, Error);
              testCallback();
            });
          });
        });
      });
    });
  });

  describe('Connectivity', function () {
    describe('#connect', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_054: [The `connect` method shall get the current credentials by calling `getDeviceCredentials` on the `AuthenticationProvider` object passed to the constructor as an argument.]*/
      it('calls getCredentials on the AuthenticationProvider', function (testCallback) {
        transport.connect(function () {
          assert.isTrue(fakeTokenAuthenticationProvider.getDeviceCredentials.called);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_055: [The `connect` method shall call its callback with an error if the callback passed to the `getDeviceCredentials` method is called with an error.]*/
      it('calls getCredentials on the AuthenticationProvider', function (testCallback) {
        var fakeError = new Error('fake');
        fakeTokenAuthenticationProvider.getDeviceCredentials = sinon.stub().callsArgWith(0, fakeError);
        transport.connect(function (err) {
          assert.isTrue(fakeTokenAuthenticationProvider.getDeviceCredentials.calledOnce);
          assert.strictEqual(err.amqpError, fakeError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_008: [The `done` callback method passed in argument shall be called if the connection is established]*/
      it('calls done if connection established using SSL', function () {
        var transport = new Amqp(fakeX509AuthenticationProvider);
        sinon.stub(transport._amqp,'connect').callsArgWith(2,null);
        transport.connect(function(err) {
          assert.isNotOk(err);
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_009: [The `done` callback method passed in argument shall be called with an error object if the connection fails]*/
      it('calls done with an error if connection failed', function () {
        var transport = new Amqp(fakeX509AuthenticationProvider);
        sinon.stub(transport._amqp,'connect').callsArgWith(2,new errors.UnauthorizedError('cryptic'));
        transport.connect(function(err) {
          assert.isOk(err);
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_06_005: [If x509 authentication is NOT being utilized then `initializeCBS` shall be invoked.]*/
      /*Tests_SRS_NODE_DEVICE_AMQP_06_008: [If `initializeCBS` is not successful then the client will remain disconnected and the callback will be called with an error per SRS_NODE_DEVICE_AMQP_16_009.]*/
      it('Invokes initializeCBS if NOT using x509 - initialize fails and disconnects', function () {
        var testError = new errors.NotConnectedError('fake error');
        fakeBaseClient.initializeCBS = sinon.stub().callsArgWith(0, testError);
        transport.connect(function(err) {
          assert.instanceOf(err, Error);
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_06_006: [If `initializeCBS` is successful, `putToken` shall be invoked If `initializeCBS` is successful, `putToken` shall be invoked with the first parameter audience, created from the sr of the sas signature, the next parameter of the actual sas, and a callback.]*/
      /*Tests_SRS_NODE_DEVICE_AMQP_06_009: [If `putToken` is not successful then the client will remain disconnected and the callback will be called with an error per SRS_NODE_DEVICE_AMQP_16_009.]*/
      it('Invokes putToken - puttoken fails and disconnects', function () {
        var testError = new errors.NotConnectedError('fake error');
        fakeBaseClient.putToken = sinon.stub().callsArgWith(2, testError);
        transport.connect(function(err) {
          assert.instanceOf(err, Error);
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_008: [The `done` callback method passed in argument shall be called if the connection is established]*/
      it('Connect calls done when using sas', function () {
        transport.connect(function (err, result) {
          assert.isNotOk(err);
          assert.instanceOf(result, results.Connected);
        });
      });

      it('calls the callback immediately if already connected and authenticated', function (testCallback) {
        transport.connect(function (err, result) {
          assert.instanceOf(result, results.Connected);
          assert(fakeBaseClient.connect.calledOnce);
          transport.connect(function (err, result) {
            assert.instanceOf(result, results.Connected);
            // shouldn't have been called twice.
            assert(fakeBaseClient.connect.calledOnce);
            testCallback();
          });
        });
      });

      it('defers the call if already connecting', function (testCallback) {
        var connectErr = new Error('cannot connect');
        var connectCallback;
        fakeBaseClient.connect = sinon.stub().callsFake(function (uri, options, done) {
          connectCallback = done;
        });

        transport.connect(function (err) {
          assert.strictEqual(err.amqpError, connectErr);
          fakeBaseClient.connect = sinon.stub().callsArgWith(2, null, new results.Connected());
        });

        // now blocked in "connecting" state
        transport.connect(function (err, result) {
          assert.instanceOf(result, results.Connected);
          assert(fakeBaseClient.connect.calledOnce, 'the second stub for connect has not been called');
          testCallback();
        });

        connectCallback(connectErr);
      });

      it('defers the call if already connected and authenticating', function (testCallback) {
        var connectErr = new Error('cannot connect');
        var authCallback;
        fakeBaseClient.initializeCBS = sinon.stub().callsFake(function (done) {
          authCallback = done;
        });

        transport.connect(function (err) {
          fakeBaseClient.initializeCBS = sinon.stub().callsArgWith(0, null);
        });

        // now blocked in "authenticating" state
        transport.connect(function (err, result) {
          assert.instanceOf(result, results.Connected);
          assert(fakeBaseClient.connect.calledOnce, 'the second stub for connect has not been called');
          testCallback();
        });

        authCallback();
      });

      it('defers the call if disconnecting', function (testCallback) {
        var disconnectCallback;
        fakeBaseClient.disconnect = sinon.stub().callsFake(function (done) {
          disconnectCallback = done;
        });

        transport.connect(function () {
          assert(fakeBaseClient.connect.calledOnce);
          transport.disconnect(function (done) {
            disconnectCallback = done;
          });

          // now blocked in "connecting" state
          transport.connect(function (err, result) {
            assert.instanceOf(result, results.Connected);
            assert(fakeBaseClient.connect.calledTwice);
            testCallback();
          });

          disconnectCallback();
        });
      });
    });

    describe('#disconnect', function () {
      describe('if disconnected already:', function () {
        /*Tests_SRS_NODE_DEVICE_AMQP_16_010: [The `done` callback method passed in argument shall be called when disconnected.]*/
        it('calls the callback immediately if a callback is specified', function (testCallback) {
          transport.disconnect(function (err, result) {
            assert.isNull(err);
            assert.instanceOf(result, results.Disconnected);
            testCallback();
          });
        });

        it('does not crash if no callback is specified', function () {
          assert.doesNotThrow(function () {
            transport.disconnect();
          });
        });
      });

      describe('if called while connecting:', function () {
        it('is deferred until connecting fails', function (testCallback) {
          var connectErr = new Error('cannot connect');
          var connectCallback;
          fakeBaseClient.connect = sinon.stub().callsFake(function (uri, options, done) {
            // will block in "connecting" state since the callback isn't called.
            // calling connectCallback will unblock it.
            connectCallback = done;
          });

          transport.connect(function (err) {
            assert.strictEqual(err.amqpError, connectErr);
            fakeBaseClient.connect = sinon.stub().callsArgWith(2, null, new results.Connected());
          });

          transport.disconnect(function (err, result) {
            assert.instanceOf(result, results.Disconnected);
            assert(fakeBaseClient.connect.calledOnce);
            assert(fakeBaseClient.disconnect.calledOnce);
            testCallback();
          });

          connectCallback(connectErr);
        });

        it('is deferred until connecting succeeds', function (testCallback) {
          var connectErr = new Error('cannot connect');
          var connectCallback;
          fakeBaseClient.connect = sinon.stub().callsFake(function (uri, options, done) {
            connectCallback = done;
          });

          transport.connect(function (err, result) {
            assert.isNull(err);
            assert.instanceOf(result, results.Connected);
            fakeBaseClient.connect = sinon.stub().callsArgWith(2, null, new results.Connected());
          });

          // now blocked in "connecting" state
          transport.disconnect(function (err, result) {
            assert.isNull(err);
            assert.instanceOf(result, results.Disconnected);
            assert(fakeBaseClient.connect.calledOnce);
            assert(fakeBaseClient.disconnect.calledOnce);
            testCallback();
          });

          connectCallback(null, new results.Connected());
        });
      });

      describe('if called while connected:', function () {
        /*Tests_SRS_NODE_DEVICE_AMQP_16_022: [The `disconnect` method shall detach all attached links.]*/
        it('detaches the C2D link if it is attached', function (testCallback) {
          transport.connect(function () {
            transport.on('message', function () {});
            transport.enableC2D(function () {
              transport.disconnect(function (err, result) {
                assert.isTrue(receiver.removeListener.calledWith('message'));
                assert.isTrue(receiver.removeListener.calledWith('error'));
                assert.isTrue(receiver.detach.calledOnce);
                testCallback();
              });
            });
          });
        });

        /*Tests_SRS_NODE_DEVICE_AMQP_16_022: [The `disconnect` method shall detach all attached links.]*/
        it('detaches the D2C link if it is attached', function (testCallback) {
          transport.connect(function () {
            transport.sendEvent(new Message('foo'), function () {
              transport.disconnect(function (err, result) {
                assert.isTrue(sender.removeListener.calledWith('error'));
                assert.isTrue(sender.detach.calledOnce);
                testCallback();
              });
            });
          });
        });

        /*Tests_SRS_NODE_DEVICE_AMQP_16_011: [The `done` callback method passed in argument shall be called with an error object if disconnecting fails.]*/
        it('forwards the detach error of the D2C link', function (testCallback) {
          var fakeError = new Error('fake detach failure');
          sender.detach = sinon.stub().callsArgWith(0, fakeError);
          transport.connect(function () {
            transport.sendEvent(new Message('foo'), function () {
              transport.disconnect(function (err) {
                assert.isTrue(sender.removeListener.calledWith('error'));
                assert.isTrue(sender.detach.calledOnce);
                assert.strictEqual(err.amqpError, fakeError);
                testCallback();
              });
            });
          });

        });

        it('disconnects the AMQP transport', function (testCallback) {
          transport.connect(function () {
            transport.disconnect(function (err, result) {
              assert.instanceOf(result, results.Disconnected);
              assert(fakeBaseClient.connect.calledOnce);
              assert(fakeBaseClient.disconnect.calledOnce);
              testCallback();
            });
          });
        });

        /*Tests_SRS_NODE_DEVICE_AMQP_16_011: [The `done` callback method passed in argument shall be called with an error object if disconnecting fails.]*/
        it('calls the callback with an error if disconnecting the transport generates an error', function (testCallback) {
          var fakeError = new Error('fake');
          fakeBaseClient.disconnect = sinon.stub().callsArgWith(0, fakeError);
          transport.connect(function () {
            transport.disconnect(function (err) {
              assert.strictEqual(err.amqpError, fakeError);
              testCallback();
            });
          })
        });
      });

      describe('if called while disconnecting already:', function () {
        it('defers until the previous call to disconnect is done', function (testCallback) {
          var disconnectCallback;
          fakeBaseClient.disconnect = sinon.stub().callsFake(function (callback) {
            disconnectCallback = callback;
          });

          transport.connect(function () {
            transport.disconnect(function (err, result) {
              assert.instanceOf(result, results.Disconnected);
              assert(fakeBaseClient.connect.calledOnce);
              assert(fakeBaseClient.disconnect.calledOnce);
            });
            transport.disconnect(function () {
              assert(fakeBaseClient.disconnect.calledOnce);
              testCallback();
            });
            disconnectCallback(null, new results.Disconnected());
          });
        });
      });
    });

    describe('#updateSharedAccessSignature', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_015: [The `updateSharedAccessSignature` method shall save the new shared access signature given as a parameter to its configuration.]*/
      /*Tests_SRS_NODE_DEVICE_AMQP_06_011: [The `updateSharedAccessSignature` method shall call the `done` callback with a null error object and a SharedAccessSignatureUpdated object as a result, indicating the client does NOT need to reestablish the transport connection.]*/
      /*Tests_SRS_NODE_DEVICE_AMQP_06_010: [If the AMQP connection is established, the `updateSharedAccessSignature` method shall call the amqp transport `putToken` method with the first parameter `audience`, created from the `sr` of the shared access signature, the actual shared access signature, and a callback.]*/
      it('saves sharedAccessSignature and trigger a putToken operation that succeeds and does not require reconnecting', function (testCallback) {
        transport.connect(function () {
          transport.updateSharedAccessSignature(simpleSas, function (err, result) {
            assert.isTrue(fakeTokenAuthenticationProvider.updateSharedAccessSignature.calledWith(simpleSas));
            assert.isNotOk(err);
            assert.isFalse(result.needToReconnect);
            testCallback();
          });
        });
      });

      it('calls the callback with an error if the putToken operation fails while connected', function (testCallback) {
        var testError = new Error('fake error');
        var firstPutTokenSucceeded = false;
        fakeBaseClient.putToken = sinon.stub().callsFake(function (token, audience, callback) {
          if (!firstPutTokenSucceeded) {
            firstPutTokenSucceeded = true;
            callback();
          } else {
            callback(testError);
          }
        });

        transport.connect(function () {
          transport.updateSharedAccessSignature(simpleSas, function (err) {
            assert.instanceOf(err, Error);
            assert.strictEqual(err.amqpError, testError);
            testCallback();
          });
        });
      });

      it('updates the shared access signature but results in a single putToken if called while connecting but not authenticated yet', function (testCallback) {
        var connectCallback;
        fakeBaseClient.connect = sinon.stub().callsFake(function (uri, options, callback) {
          connectCallback = callback;
        });
        transport.connect(function () {
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          testCallback();
        });
        // now blocked in "connecting" state

        transport.updateSharedAccessSignature(simpleSas, function (err, result) {
          assert.isTrue(fakeTokenAuthenticationProvider.updateSharedAccessSignature.calledWith(simpleSas));
          assert.isNotOk(err);
          assert.isFalse(result.needToReconnect);
        });

        connectCallback(null, new results.Connected());
      });

      it('updates the shared access signature but results in a second putToken if called while authenticating', function (testCallback) {
        var authCallback;
        fakeBaseClient.putToken = sinon.stub().callsFake(function (token, audience, callback) {
          authCallback = callback;
        });
        transport.connect(function () {
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          fakeBaseClient.putToken = sinon.stub().callsArgWith(2, null);
        });
        // now blocked in "authenticating" state

        transport.updateSharedAccessSignature(simpleSas, function (err, result) {
          assert.isTrue(fakeTokenAuthenticationProvider.updateSharedAccessSignature.calledWith(simpleSas));
          assert.isNotOk(err);
          assert.isFalse(result.needToReconnect);
          assert(fakeBaseClient.putToken.calledOnce);
          testCallback();
        });

        authCallback(null, new results.Connected());
      });

      it('updates the shared access signature but does not try to connect if called while disconnecting', function (testCallback) {
        var disconnectCallback;
        fakeBaseClient.disconnect = sinon.stub().callsFake(function (done) {
          disconnectCallback = done;
        });

        transport.connect(function () {
          assert(fakeBaseClient.connect.calledOnce);
          transport.disconnect(function () {});
          transport.updateSharedAccessSignature(simpleSas, function (err, result) {
            assert.isTrue(fakeTokenAuthenticationProvider.updateSharedAccessSignature.calledWith(simpleSas));
            assert.isNotOk(err);
            assert.isFalse(result.needToReconnect);
            assert(fakeBaseClient.connect.calledOnce);
            testCallback();
          });
          disconnectCallback();
        });
      });

      it('updates the shared access signature but does not try to connect if called while disconnected', function (testCallback) {
        transport.updateSharedAccessSignature(simpleSas, function (err, result) {
          assert.isTrue(fakeTokenAuthenticationProvider.updateSharedAccessSignature.calledWith(simpleSas));
          assert.isNotOk(err);
          assert.isFalse(result.needToReconnect);
          assert.isTrue(fakeBaseClient.initializeCBS.notCalled);
          assert.isTrue(fakeBaseClient.putToken.notCalled);
          testCallback();
        });
      });
    });

    describe('#setOptions', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_06_001: [The `setOptions` method shall throw a ReferenceError if the `options` parameter has not been supplied.]*/
      [undefined, null, ''].forEach(function (badOptions){
        it('throws if options is \'' + badOptions +'\'', function () {
          assert.throws(function () {
            transport.setOptions(badOptions);
          }, ReferenceError, '');
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_06_002: [If `done` has been specified the `setOptions` method shall call the `done` callback with no arguments when successful.]*/
      it('calls the done callback with no arguments', function (done) {
        var x509transport = new Amqp(fakeX509AuthenticationProvider, fakeBaseClient);
        x509transport.setOptions({cert: 'cert', key: 'key' }, done);
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_06_003: [`setOptions` should not throw if `done` has not been specified.]*/
      it('does not throw if `done` is not specified', function () {
        assert.doesNotThrow(function () {
        var x509transport = new Amqp(fakeX509AuthenticationProvider, fakeBaseClient);
        x509transport.setOptions({});
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_053: [The `setOptions` method shall throw an `InvalidOperationError` if the method is called while using token-based authentication.]*/
      it('throws an InvalidOperationError if called on an transport using token-based authentication', function () {
        assert.throws(function () {
          transport.setOptions({ cert: 'cert' });
        }, errors.InvalidOperationError);
      });
    });
  });

  describe('D2C', function () {
    describe('#sendEvent', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_024: [The `sendEvent` method shall connect and authenticate the transport if necessary.]*/
      it('automatically connects the transport if necessary', function (testCallback) {
        transport.sendEvent(new Message('test'), function () {
          assert(fakeBaseClient.connect.calledOnce);
          testCallback();
        });
      });

      it('forwards the error if connecting fails while trying to send a message', function (testCallback) {
        var fakeError = new Error('failed to connect');
        fakeBaseClient.connect = sinon.stub().callsArgWith(2, fakeError);

        transport.sendEvent(new Message('test'), function (err) {
          assert(fakeBaseClient.connect.calledOnce);
          assert.strictEqual(err.amqpError, fakeError);
          testCallback();
        });
      });

      it('sends the message even if called while the transport is connecting', function (testCallback) {
        var connectCallback;
        fakeBaseClient.connect = sinon.stub().callsFake(function (uri, options, done) {
          // this will block in the 'connecting' state since the callback is not called.
          // calling connectCallback will unblock.
          connectCallback = done;
        });

        transport.connect(function () {});

        transport.sendEvent(new Message('test'), function () {
          assert(fakeBaseClient.connect.calledOnce);
          testCallback();
        });

        connectCallback(null, new results.Connected());
      });

      it('sends the message even if called while the transport is authenticating', function (testCallback) {
        var authCallback;
        fakeBaseClient.putToken = sinon.stub().callsFake(function (audience, token, done) {
          // this will block in the 'authenticating' state since the callback is not called.
          // calling authCallback will unblock.
          authCallback = done;
        });

        transport.connect(function () {});

        transport.sendEvent(new Message('test'), function () {
          assert(fakeBaseClient.connect.calledOnce);
          testCallback();
        });

        authCallback(null, new results.Connected());
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_025: [The `sendEvent` method shall create and attach the d2c link if necessary.]*/
      it('attaches the messaging link on first send, then reuses it', function (testCallback) {
        transport.sendEvent(new Message('test'), function () {
          assert(fakeBaseClient.attachSenderLink.calledOnce);
          assert(sender.on.calledOnce);
          transport.sendEvent(new Message('test2'), function () {
            assert(fakeBaseClient.attachSenderLink.calledOnce);
            assert(sender.send.calledTwice);
            testCallback();
          });
        });
      });

      // This is being skipped because the error is not forwarded.
      // Since we can reattach the link every time we send and surface the error at that time, I'm not sure it's useful to surface this to the client. it's just a transport-level thing at that point.
      // If something is really bad and unrecoverable the failure will happen on the next sendEvent.
      it.skip('forwards errors from the D2C link', function (testCallback) {
        var fakeError = new Error('fake');
        transport.on('errorReceived', function (err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        });

        transport.sendEvent(new Message('test'), function (err) {
          sender.emit('error', fakeError);
        });
      });

      it('tries to reconnect to send the message if the transport is disconnecting', function (testCallback) {
        var disconnectCallback;
        fakeBaseClient.disconnect = sinon.stub().callsFake(function (done) {
          disconnectCallback = done;
        });

        transport.connect(function () {
          assert(fakeBaseClient.connect.calledOnce);
          transport.disconnect(function () {});
          transport.sendEvent(new Message('test'), function () {
            assert(fakeBaseClient.connect.calledTwice);
            testCallback();
          });

          disconnectCallback(null, new results.Connected());
        });
      });

      it('calls the callback with an error if attaching the link fails', function (testCallback) {
        var fakeError = new Error('fake');
        fakeBaseClient.attachSenderLink = sinon.stub().callsArgWith(2, fakeError);
        transport.sendEvent(new Message('test'), function (err) {
          assert.strictEqual(err.amqpError, fakeError);
          testCallback();
        });
      });

      it('calls the callback with an error if sending the message fails', function (testCallback) {
        var fakeError = new Error('fake');
        sender.send = sinon.stub().callsArgWith(1, fakeError);
        transport.sendEvent(new Message('test'), function (err) {
          assert.strictEqual(err.amqpError, fakeError);
          testCallback();
        });
      });

      it('registers an error event handler on the d2c link', function (testCallback) {
        transport.sendEvent(new Message('test'), function (err) {
          assert.isTrue(sender.on.calledWith('error'));
          assert.doesNotThrow(function () {
            sender.emit('error', new Error());
          });
          testCallback();
        });
      });
    });

    describe('#sendEventBatch', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_052: [The `sendEventBatch` method shall throw a `NotImplementedError`.]*/
      it('throws an NotImplementedError', function () {
        assert.throws(function () {
          transport.sendEventBatch([], function() {});
        }, errors.NotImplementedError);
      });
    });
  });

  describe('C2D', function () {
    describe('#complete', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_013: [The ‘complete’ method shall call the ‘complete’ method of the receiver object and pass it the message and the callback given as parameters.] */
      it('calls the receiver `complete` method', function (testCallback) {
        transport.connect(function () {
          transport.on('message', function () {});
          transport.enableC2D(function () {
            transport.complete(testMessage, function () {
              assert(receiver.complete.calledWith(testMessage));
              testCallback();
            });
          });
        });
      });

      it('immediately fails with a DeviceMessageLockLost error if the transport is disconnected', function (testCallback) {
        transport.complete(new Message('test'), function (err) {
          assert.instanceOf(err, errors.DeviceMessageLockLostError);
          testCallback();
        });
      });
    });

    describe('#reject', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_014: [The ‘reject’ method shall call the ‘reject’ method of the receiver object and pass it the message and the callback given as parameters.] */
      it('calls the receiver `reject` method', function (testCallback) {
        transport.connect(function () {
          transport.on('message', function () {});
          transport.enableC2D(function () {
            transport.reject(testMessage, function () {
              assert(receiver.reject.calledWith(testMessage));
              testCallback();
            });
          });
        });
      });

      it('immediately fails with a DeviceMessageLockLost error if the transport is disconnected', function (testCallback) {
        transport.reject(new Message('test'), function (err) {
          assert.instanceOf(err, errors.DeviceMessageLockLostError);
          testCallback();
        });
      });
    });

    describe('#abandon', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_012: [The ‘abandon’ method shall call the ‘abandon’ method of the receiver object and pass it the message and the callback given as parameters.] */
      it('calls the receiver `abandon` method', function (testCallback) {
        transport.connect(function () {
          transport.on('message', function () {});
          transport.enableC2D(function () {
            transport.abandon(testMessage, function () {
              assert(receiver.abandon.calledWith(testMessage));
              testCallback();
            });
          });
        });
      });

      it('immediately fails with a DeviceMessageLockLost error if the transport is disconnected', function (testCallback) {
        transport.abandon(new Message('test'), function (err) {
          assert.instanceOf(err, errors.DeviceMessageLockLostError);
          testCallback();
        });
      });
    });

    describe('enableC2D', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_031: [The `enableC2D` method shall connect and authenticate the transport if it is disconnected.]*/
      it('connects the transport if it is disconnected', function (testCallback) {
        transport.enableC2D(function () {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.attachReceiverLink.calledWith(transport._c2dEndpoint));
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_032: [The `enableC2D` method shall attach the C2D link and call its `callback` once it is successfully attached.]*/
      it('attaches the C2D link', function (testCallback) {
        transport.connect(function () {
          assert(fakeBaseClient.attachReceiverLink.notCalled);
          transport.enableC2D(function () {
            assert(fakeBaseClient.attachReceiverLink.calledWith(transport._c2dEndpoint));
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_033: [The `enableC2D` method shall call its `callback` with an `Error` if the transport fails to connect, authenticate or attach link.]*/
      it('calls its callback with an Error if connecting the transport fails', function (testCallback) {
        fakeBaseClient.connect = sinon.stub().callsArgWith(2, new Error('fake failed to connect'));
        transport.enableC2D(function (err) {
          assert(fakeBaseClient.connect.calledOnce);
          assert.instanceOf(err, Error);
          testCallback();
        });
      });

      it('calls its callback with an Error if attaching the C2D link fails', function (testCallback) {
        fakeBaseClient.attachReceiverLink = sinon.stub().callsArgWith(2, new Error('fake failed to attach'));
        transport.connect(function () {
          assert(fakeBaseClient.attachReceiverLink.notCalled);
          transport.enableC2D(function (err) {
            assert(fakeBaseClient.attachReceiverLink.calledWith(transport._c2dEndpoint));
            assert.instanceOf(err, Error);
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_034: [Any `error` event received on the C2D link shall trigger the emission of an `error` event by the transport, with an argument that is a `C2DDetachedError` object with the `innerError` property set to that error.]*/
      // disabled until the client supports it
      it('emits a CloudToDeviceDetachedError with an innerError property if the link fails after being established correctly', function (testCallback) {
        var fakeError = new Error('fake C2D receiver link error');
        transport.on('error', function (err) {
          assert.instanceOf(err, errors.CloudToDeviceDetachedError);
          assert.strictEqual(err.innerError, fakeError);
          testCallback();
        });

        transport.connect(function () {
          assert(fakeBaseClient.attachReceiverLink.notCalled);
          transport.enableC2D(function () {
            assert(fakeBaseClient.attachReceiverLink.calledWith(transport._c2dEndpoint));
            receiver.emit('error', fakeError);
          });
        });
      });

      it('forwards messages to the client once connected and authenticated', function (testCallback) {
        var fakeMessage = new Message('fake');

        transport.on('message', function (msg) {
          assert.strictEqual(msg, fakeMessage);
          testCallback();
        });

        transport.connect(function () {
          transport.enableC2D(function () {
            receiver.emit('message', fakeMessage);
          });
        });
      });
    });

    describe('disableC2D', function (testCallback) {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_037: [The `disableC2D` method shall call its `callback` immediately if the transport is already disconnected.]*/
      it('calls the callback immediately if the transport is disconnected', function (testCallback) {
        transport.disableC2D(function (err) {
          assert.isNotOk(err);
          assert(receiver.detach.notCalled);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_035: [The `disableC2D` method shall call `detach` on the C2D link and call its callback when it is successfully detached.]*/
      it('detaches the C2D link', function (testCallback) {
        transport.connect(function () {
          assert(fakeBaseClient.attachReceiverLink.notCalled);
          transport.enableC2D(function () {
            assert(fakeBaseClient.attachReceiverLink.calledWith(transport._c2dEndpoint));
            transport.disableC2D(function () {
              assert(receiver.detach.calledOnce);
              testCallback();
            });
          });
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_036: [The `disableC2D` method shall call its `callback` with an `Error` if it fails to detach the C2D link.]*/
      it('calls its callback with an Error if an error happens while detaching the C2D link', function (testCallback) {
        receiver.detach = sinon.stub().callsArgWith(0, new Error('fake detach error'));
        transport.connect(function () {
          assert(fakeBaseClient.attachReceiverLink.notCalled);
          transport.enableC2D(function () {
            assert(fakeBaseClient.attachReceiverLink.calledWith(transport._c2dEndpoint));
            transport.disableC2D(function (err) {
              assert(receiver.detach.calledOnce);
              assert.instanceOf(err, Error);
              testCallback();
            });
          });
        });
      });
    });
  });

  describe('Twin', function () {
    describe('#sendTwinRequest', function () {
      it('connects the transport if necessary', function (testCallback) {
        transport.sendTwinRequest('POST', '/properties/reported', { temp: 42 }, {}, function () {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          testCallback();
        });
      });

      it('waits until connected and authenticated if called while connecting', function (testCallback) {
        var connectCallback;
        fakeBaseClient.connect = sinon.stub().callsFake(function (uri, options, callback) {
          connectCallback = callback;
        });

        transport.connect(function () {});
        transport.sendTwinRequest('POST', '/properties/reported', { temp: 42 }, {}, function () {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          testCallback();
        });
        connectCallback(null, new results.Connected());
      });

      it('waits until connected and authenticated if called while authenticating', function (testCallback) {
        var authCallback;
        fakeBaseClient.putToken = sinon.stub().callsFake(function (uri, options, callback) {
          authCallback = callback;
        });

        transport.connect(function () {});
        transport.sendTwinRequest('POST', '/properties/reported', { temp: 42 }, {}, function () {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          testCallback();
        });

        authCallback();
      });

      it('calls its callback with an error if connecting the transport fails', function (testCallback) {
        var testError = new Error('failed to connect');
        fakeBaseClient.connect = sinon.stub().callsArgWith(2, testError);

        transport.sendTwinRequest('POST', '/properties/reported', { temp: 42 }, {}, function (err) {
          assert(fakeBaseClient.connect.calledOnce);
          assert.strictEqual(err.amqpError, testError);
          testCallback();
        });
      });

      it('calls its callback with an error if authentication fails to initialize CBS', function (testCallback) {
        var testError = new Error('failed to authenticate');
        fakeBaseClient.initializeCBS = sinon.stub().callsArgWith(0, testError);

        transport.sendTwinRequest('POST', '/properties/reported', { temp: 42 }, {}, function (err) {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert.strictEqual(err.amqpError, testError);
          testCallback();
        });
      });

      it('calls its callback with an error if authentication fails to do a CBS putToken operation', function (testCallback) {
        var testError = new Error('failed to authenticate');
        fakeBaseClient.putToken = sinon.stub().callsArgWith(2, testError);

        transport.sendTwinRequest('POST', '/properties/reported', { temp: 42 }, {}, function (err) {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          assert.strictEqual(err.amqpError, testError);
          testCallback();
        });
      });

      it('calls its callback with an error if the twin client fails to send the request', function (testCallback) {
        var testError = new Error('failed to send');
        sender.send = sinon.stub().callsArgWith(1, testError);

        transport.sendTwinRequest('POST', '/properties/reported', { temp: 42 }, {}, function (err) {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          assert(fakeBaseClient.attachReceiverLink.calledOnce);
          assert(fakeBaseClient.attachSenderLink.calledOnce);
          assert.strictEqual(err.amqpError, testError);
          testCallback();
        });
      });

      it('tries to reconnect to send the message if the transport is disconnecting', function (testCallback) {
        var disconnectCallback;

        fakeBaseClient.disconnect = sinon.stub().callsFake(function (done) {
          disconnectCallback = done;
        });

        transport.connect(function () {
          assert(fakeBaseClient.connect.calledOnce);
            assert(fakeBaseClient.initializeCBS.calledOnce);
            assert(fakeBaseClient.putToken.calledOnce);
          transport.disconnect(function () {});
          transport.sendTwinRequest('POST', '/properties/reported', { temp: 42 }, {}, function () {
            assert(fakeBaseClient.connect.calledTwice);
            assert(fakeBaseClient.initializeCBS.calledTwice);
            assert(fakeBaseClient.putToken.calledTwice);
            assert(fakeBaseClient.attachReceiverLink.calledOnce);
            assert(fakeBaseClient.attachSenderLink.calledOnce);
            testCallback();
          });

          disconnectCallback(null, new results.Connected());
        });
      });
    });

    describe('#getTwinReceiver', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_06_033: [ The `getTwinReceiver` method shall throw an `ReferenceError` if done is falsy.]*/
      it('throws if done is falsy', function() {
        assert.throws(function() {
          transport.getTwinReceiver();
        }, ReferenceError);
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_026: [The `getTwinReceiver` method shall call the `done` callback with a `null` error argument and the `AmqpTwinClient` instance currently in use.]*/
      it('calls done when complete', function(done) {
        transport.getTwinReceiver(done);
      });

      it('only creates one twin receiver object', function(done) {
        transport.getTwinReceiver(function(err, receiver1) {
          assert.isNull(err);
          assert.instanceOf(receiver1, AmqpTwinClient);
          transport.getTwinReceiver(function(err, receiver2) {
            assert.isNull(err);
            assert.strictEqual(receiver1, receiver2);
            done();
          });
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_027: [The `getTwinReceiver` method shall connect and authenticate the AMQP connection if necessary.]*/
      it('connects and authenticates the transport if disconnected', function (testCallback) {
        transport.getTwinReceiver(function () {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          testCallback();
        });
      });

      it('defers until connected and authenticated if called while connecting', function (testCallback) {
        var connectCallback;
        fakeBaseClient.connect = sinon.stub().callsFake(function (uri, sslOptions, callback) {
          connectCallback = callback;
        });

        transport.connect(function () {});
        // blocked in the 'connecting' state
        transport.getTwinReceiver(function () {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          testCallback();
        });

        assert(fakeBaseClient.connect.calledOnce);
        assert(fakeBaseClient.initializeCBS.notCalled);
        assert(fakeBaseClient.putToken.notCalled);
        connectCallback();
      });

      it('defers until authenticated if called while authenticating', function (testCallback) {
        var authCallback;
        fakeBaseClient.initializeCBS = sinon.stub().callsFake(function (callback) {
          authCallback = callback;
        });

        transport.connect(function () {});
        // blocked in the 'authenticating' state
        transport.getTwinReceiver(function () {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          testCallback();
        });

        assert(fakeBaseClient.connect.calledOnce);
        assert(fakeBaseClient.initializeCBS.calledOnce);
        assert(fakeBaseClient.putToken.notCalled);
        authCallback();
      });

      it('tries to reconnect if called while disconnecting', function (testCallback) {
        var disconnectCallback;
        fakeBaseClient.disconnect = sinon.stub().callsFake(function (callback) {
          disconnectCallback = callback;
        });

        transport.connect(function () {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);

          transport.disconnect(function () {});
          assert(fakeBaseClient.disconnect.calledOnce);

          transport.getTwinReceiver(function () {
            assert(fakeBaseClient.connect.calledTwice);
            assert(fakeBaseClient.initializeCBS.calledTwice);
            assert(fakeBaseClient.putToken.calledTwice);
            testCallback();
          });

          disconnectCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_028: [The `getTwinReceiver` method shall call the `done` callback with the corresponding error if the transport fails connect or authenticate the AMQP connection.]*/
      it('calls the callback with an error if the transport fails to connect', function (testCallback) {
        var fakeError = new Error('test');
        fakeBaseClient.connect = sinon.stub().callsArgWith(2, fakeError);
        transport.getTwinReceiver(function (err, recv) {
          assert.strictEqual(err.amqpError, fakeError);
          assert.isUndefined(recv);
          testCallback();
        });
      });

      it('calls the callback with an error if the transport fails to authenticate', function (testCallback) {
        var fakeError = new Error('test');
        fakeBaseClient.putToken = sinon.stub().callsArgWith(2, fakeError);
        transport.getTwinReceiver(function (err, recv) {
          assert.strictEqual(err.amqpError, fakeError);
          assert.isUndefined(recv);
          testCallback();
        });
      });
    });

    describe('enableTwin', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_045: [The `enableTwin` method shall connect and authenticate the transport if it is disconnected.]*/
      it('connects the transport if it is disconnected', function (testCallback) {
        transport.enableTwin(function () {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          assert(fakeBaseClient.attachSenderLink.calledWith(transport._twinClient._endpoint));
          assert(fakeBaseClient.attachReceiverLink.calledWith(transport._twinClient._endpoint));
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_047: [The `enableTwin` method shall call its `callback` with an `Error` if the transport fails to connect, authenticate or attach twin links.]*/
      it('calls the callback with an error if the transport fails to connect', function (testCallback) {
        fakeBaseClient.connect = sinon.stub().callsArgWith(2, new Error('fake error'));
        transport.enableTwin(function (err) {
          assert(fakeBaseClient.connect.calledOnce);
          assert.instanceOf(err, Error);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_047: [The `enableTwin` method shall call its `callback` with an `Error` if the transport fails to connect, authenticate or attach twin links.]*/
      it('calls the callback with an error if the transport fails to initialize the CBS links', function (testCallback) {
        fakeBaseClient.initializeCBS = sinon.stub().callsArgWith(0, new Error('fake error'));
        transport.enableTwin(function (err) {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert.instanceOf(err, Error);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_047: [The `enableTwin` method shall call its `callback` with an `Error` if the transport fails to connect, authenticate or attach twin links.]*/
      it('calls the callback with an error if the transport fails to make a new putToken request on the CBS links', function (testCallback) {
        fakeBaseClient.putToken = sinon.stub().callsArgWith(2, new Error('fake error'));
        transport.enableTwin(function (err) {
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          assert.instanceOf(err, Error);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_046: [The `enableTwin` method shall attach the twin links and call its `callback` once these are successfully attached.]*/
      it('attaches the twin links', function (testCallback) {
        transport.connect(function () {
          assert(fakeBaseClient.attachReceiverLink.notCalled);
          transport.enableTwin(function () {
            assert(fakeBaseClient.attachSenderLink.calledWith(transport._twinClient._endpoint));
            assert(fakeBaseClient.attachReceiverLink.calledWith(transport._twinClient._endpoint));
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_048: [Any `error` event received on any of the links used for twin shall trigger the emission of an `error` event by the transport, with an argument that is a `TwinDetachedError` object with the `innerError` property set to that error.]*/
      it('calls its callback with an Error if attaching the twin receiver link fails', function (testCallback) {
        transport._twinClient.attach = sinon.stub().callsArgWith(0, new Error('fake failed to attach'));
        transport.connect(function () {
          transport.enableTwin(function (err) {
            assert(transport._twinClient.attach.calledOnce);
            assert.instanceOf(err, Error);
            testCallback();
          });
        });
      });

      it('emits a TwinDetachedError with an innerError property if the link fails after being established correctly', function (testCallback) {
        var fakeError = new Error('fake twin receiver link error');
        transport.on('error', function (err) {
          assert.instanceOf(err, errors.TwinDetachedError);
          assert.strictEqual(err.innerError, fakeError);
          testCallback();
        });

        transport.connect(function () {
          transport.enableTwin(function () {
            transport._twinClient.emit('error', fakeError);
          });
        });
      });
    });

    describe('disableTwin', function (testCallback) {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_051: [The `disableTwin` method shall call its `callback` immediately if the transport is already disconnected.]*/
      it('calls the callback immediately if the transport is disconnected', function (testCallback) {
        transport.disableTwin(function (err) {
          assert.isNotOk(err);
          assert(receiver.detach.notCalled);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_049: [The `disableTwin` method shall call `detach` on the twin links and call its callback when these are successfully detached.]*/
      it('detaches the twin links', function (testCallback) {
        transport._twinClient.detach = sinon.stub().callsArg(0);
        transport.connect(function () {
          assert(fakeBaseClient.attachReceiverLink.notCalled);
          transport.enableTwin(function () {
            assert(fakeBaseClient.attachSenderLink.calledWith(transport._twinClient._endpoint));
            assert(fakeBaseClient.attachReceiverLink.calledWith(transport._twinClient._endpoint));
            transport.disableTwin(function () {
              assert(transport._twinClient.detach.calledOnce);
              testCallback();
            });
          });
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_050: [The `disableTwin` method shall call its `callback` with an `Error` if it fails to detach the twin links.]*/
      it('calls its callback with an Error if an error happens while detaching the twin links', function (testCallback) {
        transport._twinClient.detach = sinon.stub().callsArgWith(0, new Error('fake detach error'));
        transport.connect(function () {
          assert(fakeBaseClient.attachReceiverLink.notCalled);
          transport.enableTwin(function () {
            assert(fakeBaseClient.attachSenderLink.calledWith(transport._twinClient._endpoint));
            assert(fakeBaseClient.attachReceiverLink.calledWith(transport._twinClient._endpoint));
            transport.disableTwin(function (err) {
              assert(transport._twinClient.detach.calledOnce);
              assert.instanceOf(err, Error);
              testCallback();
            });
          });
        });
      });
    });
  });
});