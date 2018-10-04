// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var EventEmitter = require('events').EventEmitter;
var uuid = require('uuid');
var assert = require('chai').assert;
var sinon = require('sinon');

var AmqpMessage = require('azure-iot-amqp-base').AmqpMessage;
var Message = require('azure-iot-common').Message;
var Amqp = require('../lib/amqp.js').Amqp;
var errors = require('azure-iot-common').errors;
var results = require('azure-iot-common').results;
var AuthenticationType = require('azure-iot-common').AuthenticationType;

describe('Amqp', function () {
  var transport = null;
  var receiver = null;
  var sender = null;
  var fakeBaseClient = null;
  var disconnectHandler = null;
  var fakeTokenAuthenticationProvider = null;
  var fakeX509AuthenticationProvider = null;
  var fakeX509ModuleAuthenticationProvider = null;

  var testMessage = new Message();
  testMessage.transportObj = {};
  var configWithSSLOptions = { host: 'hub.host.name', deviceId: 'deviceId', x509: 'some SSL options' };
  var configWithModule = { host: 'hub.host.name', deviceId: 'deviceId', moduleId: 'moduleId', x509: 'some SSL options' }
  var simpleSas = 'SharedAccessSignature sr=foo&sig=123&se=123';
  var configWithSAS = { host: 'hub.host.name', deviceId: 'deviceId', sharedAccessSignature: simpleSas};
  var configWithGatewayHostName = { gatewayHostName: 'gateway.host', deviceId: 'deviceId', sharedAccessSignature: simpleSas};

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
      connect: sinon.stub().callsArgWith(1, null, new results.Connected()),
      disconnect: sinon.stub().callsArgWith(0, null, new results.Disconnected()),
      initializeCBS: sinon.stub().callsArgWith(0, null),
      putToken: sinon.stub().callsArgWith(2, null),
      getReceiver: sinon.stub().callsArgWith(1, null, receiver),
      attachSenderLink: sinon.stub().callsArgWith(2, null, sender),
      attachReceiverLink: sinon.stub().callsArgWith(2, null, receiver),
      detachSenderLink: sinon.stub().callsArg(1),
      detachReceiverLink: sinon.stub().callsArg(1),
      setDisconnectHandler: sinon.stub().callsFake(function (handler) { disconnectHandler = handler; }),
      send: sinon.stub().callsArgWith(3, null, new results.MessageEnqueued())
    };

    fakeTokenAuthenticationProvider = new EventEmitter();
    fakeTokenAuthenticationProvider.type = AuthenticationType.Token;
    fakeTokenAuthenticationProvider.getDeviceCredentials = sinon.stub().callsArgWith(0, null, configWithSAS);
    fakeTokenAuthenticationProvider.updateSharedAccessSignature = sinon.stub();
    fakeTokenAuthenticationProvider.stop = sinon.stub();
    sinon.spy(fakeTokenAuthenticationProvider, 'on');

    fakeX509AuthenticationProvider = {
      type: AuthenticationType.X509,
      getDeviceCredentials: function (callback) {
        callback(null, configWithSSLOptions);
      },
      setX509Options: sinon.stub()
    };

    fakeX509ModuleAuthenticationProvider = {
      type: AuthenticationType.X509,
      getDeviceCredentials: function (callback) {
        callback(null, configWithModule);
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
      void(amqp);
      assert.isTrue(fakeX509AuthenticationProvider.on.notCalled);
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_16_057: [If a `newTokenAvailable` event is emitted by the `authenticationProvider` object passed as an argument to the constructor, a `putToken` operation shall be initiated with the new shared access signature if the amqp connection is already connected.]*/
    it('initiates a putToken when a newTokenAvailable event is received', function (testCallback) {
      var newSas = 'SharedAccessSignature sr=new&sig=456&se=456';
      transport.connect(function () {
        assert.isTrue(fakeBaseClient.putToken.calledOnce);
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
    });
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
        };

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
        fakeBaseClient.connect = sinon.stub().callsArgWith(1, new Error('fake error'));
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

    describe('disableMethods', function () {
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

      /*Tests_SRS_NODE_DEVICE_AMQP_13_002: [ The connect method shall set the CA cert on the options object when calling the underlying connection object's connect method if it was supplied. ]*/
      it('sets CA cert if provided', function (testCallback) {
        transport.setOptions({ ca: 'ca cert' });
        transport.connect(function (err) {
          assert.isNotOk(err);
          assert(fakeBaseClient.connect.called);
          assert.strictEqual(fakeBaseClient.connect.firstCall.args[0].sslOptions.ca, 'ca cert');
          testCallback();
        });
      });

      it('sets gateway host name if provided', function (testCallback) {
        fakeTokenAuthenticationProvider.getDeviceCredentials = sinon.stub().callsArgWith(0, null, configWithGatewayHostName);
        transport.connect(function (err) {
          assert.isNotOk(err);
          assert(fakeBaseClient.connect.called);
          assert.strictEqual(fakeBaseClient.connect.firstCall.args[0].uri, 'amqps://' + configWithGatewayHostName.gatewayHostName);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_008: [The `done` callback method passed in argument shall be called if the connection is established]*/
      it('calls done if connection established using SSL', function () {
        fakeBaseClient.connect = sinon.stub().callsArgWith(1,null);
        transport.connect(function(err) {
          assert.isNotOk(err);
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_009: [The `done` callback method passed in argument shall be called with an error object if the connection fails]*/
      it('calls done with an error if connection failed', function () {
        fakeBaseClient.connect = sinon.stub().callsArgWith(1,new errors.UnauthorizedError('cryptic'));
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
      it('Invokes putToken - putToken fails and disconnects', function () {
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
        fakeBaseClient.connect = sinon.stub().callsFake(function (config, done) {
          connectCallback = done;
        });

        transport.connect(function (err) {
          assert.strictEqual(err.amqpError, connectErr);
          fakeBaseClient.connect = sinon.stub().callsArgWith(1, null, new results.Connected());
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
        var authCallback;
        fakeBaseClient.initializeCBS = sinon.stub().callsFake(function (done) {
          authCallback = done;
        });

        transport.connect(function () {
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
          fakeBaseClient.connect = sinon.stub().callsFake(function (config, done) {
            // will block in "connecting" state since the callback isn't called.
            // calling connectCallback will unblock it.
            connectCallback = done;
          });

          transport.connect(function (err) {
            assert.strictEqual(err.amqpError, connectErr);
            fakeBaseClient.connect = sinon.stub().callsArgWith(1, null, new results.Connected());
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
          var connectCallback;
          fakeBaseClient.connect = sinon.stub().callsFake(function (config, done) {
            connectCallback = done;
          });

          transport.connect(function (err, result) {
            assert.isNull(err);
            assert.instanceOf(result, results.Connected);
            fakeBaseClient.connect = sinon.stub().callsArgWith(1, null, new results.Connected());
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
              transport.disconnect(function () {
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
              transport.disconnect(function () {
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

        it('disconnects the Twin client', function (testCallback) {
          sinon.spy(transport._twinClient, 'detach');
          transport.connect(function () {
            transport.disconnect(function () {
              assert.isTrue(transport._twinClient.detach.calledOnce);
              testCallback();
            });
          });
        });

        it('calls the disconnect callback with an error if the Twin client encounters an error while detaching', function (testCallback) {
          var fakeError = new Error('fake');
          sinon.stub(transport._twinClient, 'detach').callsFake(function(callback) { callback(fakeError); });
          transport.connect(function () {
            transport.disconnect(function (err) {
              assert.isTrue(transport._twinClient.detach.calledOnce);
              assert.instanceOf(err, Error);
              assert.strictEqual(err.amqpError, fakeError);
              testCallback();
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
          });
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

      /*Tests_SRS_NODE_DEVICE_AMQP_16_083: [When the `amqp` client is disconnected and if token-based authentication is used the `stop` method of the `AuthenticationProvider` shall be called.]*/
      it('calls stop on the authentication provider if using token authentication', function (testCallback) {
        transport.connect(function () {});
        transport.disconnect(function () {
          assert.isTrue(fakeTokenAuthenticationProvider.stop.calledTwice); // once when instantiated, once when disconnected
          testCallback();
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
        fakeBaseClient.connect = sinon.stub().callsFake(function (config, callback) {
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

      /*Tests_SRS_NODE_DEVICE_AMQP_13_001: [ The setOptions method shall save the options passed in. ]*/
      it('saves options', function () {
        transport.setOptions({ ca: 'ca cert' });
        assert.strictEqual(transport._options.ca, 'ca cert');
      });
    });

    describe('on(\'disconnect\')', function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_080: [if the handler specified in the `setDisconnectHandler` call is called while the `Amqp` object is disconnected, the call shall be ignored.]*/
      it('ignores the event if already disconnected', function () {
        transport.on('error', function () {
          assert.fail();
        });

        disconnectHandler(new Error());
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_081: [if the handler specified in the `setDisconnectHandler` call is called while the `Amqp` object is connecting or authenticating, the connection shall be stopped and an `disconnect` event shall be emitted with the error translated to a transport-agnostic error.]*/
      it('emits a disconnect event if called while connecting', function (testCallback) {
        var fakeError = new Error('disconnected');
        fakeBaseClient.connect = sinon.stub();

        transport.on('disconnect', function (err) {
          assert.strictEqual(err.amqpError, fakeError);
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.disconnect.calledOnce);
          testCallback();
        });
        transport.connect(function () {});

        disconnectHandler(fakeError);
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_081: [if the handler specified in the `setDisconnectHandler` call is called while the `Amqp` object is connecting or authenticating, the connection shall be stopped and an `disconnect` event shall be emitted with the error translated to a transport-agnostic error.]*/
      it('emits an error event if called while authenticating', function (testCallback) {
        var fakeError = new Error('disconnected');
        fakeBaseClient.putToken = sinon.stub();

        transport.on('disconnect', function (err) {
          assert.strictEqual(err.amqpError, fakeError);
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.disconnect.calledOnce);
          testCallback();
        });
        transport.connect(function () {});

        disconnectHandler(fakeError);
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_082: [if the handler specified in the `setDisconnectHandler` call is called while the `Amqp` object is connected, the connection shall be disconnected and an `disconnect` event shall be emitted with the error translated to a transport-agnostic error.]*/
      it('emits an error event if called while connected and authenticated', function (testCallback) {
        var fakeError = new Error('disconnected');
        transport.on('disconnect', function (err) {
          assert.strictEqual(err.amqpError, fakeError);
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.disconnect.calledOnce);
          testCallback();
        });

        transport.connect(function () {});

        disconnectHandler(fakeError);
      });
    });
  });



  [{
    functionUnderTest: 'sendEvent',
    invokeFunction: function(msg, callback) { transport.sendEvent(msg, callback); },
    expectedOutputName: null
  },
  {
    functionUnderTest: 'sendOutputEvent',
    invokeFunction: function(msg, callback) { transport.sendOutputEvent('_fake_output', msg, callback); },
    expectedOutputName: '_fake_output'
  }].forEach(function(testConfig) {
    describe('#' + testConfig.functionUnderTest, function () {
      /*Tests_SRS_NODE_DEVICE_AMQP_16_024: [The `sendEvent` method shall connect and authenticate the transport if necessary.]*/
      /*Tests_SRS_NODE_DEVICE_AMQP_18_005: [The `sendOutputEvent` method shall connect and authenticate the transport if necessary.]*/
      it('automatically connects the transport if necessary', function (testCallback) {
        testConfig.invokeFunction(new Message('test'), function () {
          assert(fakeBaseClient.connect.calledOnce);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_18_009: [If `sendOutputEvent` encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
      it('forwards the error if connecting fails while trying to send a message', function (testCallback) {
        var fakeError = new Error('failed to connect');
        fakeBaseClient.connect = sinon.stub().callsArgWith(1, fakeError);

        testConfig.invokeFunction(new Message('test'), function (err) {
          assert(fakeBaseClient.connect.calledOnce);
          assert.strictEqual(err.amqpError, fakeError);
          testCallback();
        });
      });

      it('sends the message even if called while the transport is connecting', function (testCallback) {
        var connectCallback;
        fakeBaseClient.connect = sinon.stub().callsFake(function (config, done) {
          // this will block in the 'connecting' state since the callback is not called.
          // calling connectCallback will unblock.
          connectCallback = done;
        });

        transport.connect(function () {});

        testConfig.invokeFunction(new Message('test'), function () {
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

        testConfig.invokeFunction(new Message('test'), function () {
          assert(fakeBaseClient.connect.calledOnce);
          testCallback();
        });

        authCallback(null, new results.Connected());
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_025: [The `sendEvent` method shall create and attach the d2c link if necessary.]*/
      /*Tests_SRS_NODE_DEVICE_AMQP_18_006: [The `sendOutputEvent` method shall create and attach the d2c link if necessary.]*/
      it('attaches the messaging link on first send, then reuses it', function (testCallback) {
        testConfig.invokeFunction(new Message('test'), function () {
          assert(fakeBaseClient.attachSenderLink.calledOnce);
          assert(sender.on.calledOnce);
          testConfig.invokeFunction(new Message('test2'), function () {
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

        testConfig.invokeFunction(new Message('test'), function () {
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
          testConfig.invokeFunction(new Message('test'), function () {
            assert(fakeBaseClient.connect.calledTwice);
            testCallback();
          });

          disconnectCallback(null, new results.Connected());
        });
      });

      it('calls the callback with an error if attaching the link fails', function (testCallback) {
        var fakeError = new Error('fake');
        fakeBaseClient.attachSenderLink = sinon.stub().callsArgWith(2, fakeError);
        testConfig.invokeFunction(new Message('test'), function (err) {
          assert.strictEqual(err.amqpError, fakeError);
          testCallback();
        });
      });

      it('calls the callback with an error if sending the message fails', function (testCallback) {
        var fakeError = new Error('fake');
        sender.send = sinon.stub().callsArgWith(1, fakeError);
        testConfig.invokeFunction(new Message('test'), function (err) {
          assert.strictEqual(err.amqpError, fakeError);
          testCallback();
        });
      });

      it('registers an error event handler on the d2c link', function (testCallback) {
        testConfig.invokeFunction(new Message('test'), function () {
          assert.isTrue(sender.on.calledWith('error'));
          assert.doesNotThrow(function () {
            sender.emit('error', new Error());
          });
          testCallback();
        });
      });


      /*Tests_SRS_NODE_DEVICE_AMQP_16_002: [The `sendEvent` method shall construct an AMQP request using the message passed in argument as the body of the message.]*/
      /*Tests_SRS_NODE_DEVICE_AMQP_16_003: [The `sendEvent` method shall call the `done` callback with a null error object and a MessageEnqueued result object when the message has been successfully sent.]*/
      /*Tests_SRS_NODE_DEVICE_AMQP_18_007: [The `sendOutputEvent` method shall construct an AMQP request using the message passed in argument as the body of the message.]*/
      /*Tests_SRS_NODE_DEVICE_AMQP_18_012: [The `sendOutputEvent` method  shall set the application property "iothub-outputname" on the message to the `outputName`.]*/
      /*Tests_SRS_NODE_DEVICE_AMQP_18_008: [The `sendOutputEvent` method shall call the `done` callback with a null error object and a MessageEnqueued result object when the message has been successfully sent.]*/
      it('constructs a request correctly and succeeds correctly', function (testCallback) {
        testConfig.invokeFunction(new Message('test'), function (err, result) {
          var sentMsg = sender.send.firstCall.args[0];
          assert.instanceOf(sentMsg, AmqpMessage);
          assert.instanceOf(result, results.MessageEnqueued);
          assert.strictEqual(sentMsg.body.content.toString(), 'test');
          if (testConfig.expectedOutputName) {
            assert.strictEqual(sentMsg.application_properties['iothub-outputname'], testConfig.expectedOutputName);
          }
          testCallback(err);
        });
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
              assert(receiver.complete.calledWith(testMessage.transportObj));
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
              assert(receiver.reject.calledWith(testMessage.transportObj));
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
              assert(receiver.abandon.calledWith(testMessage.transportObj));
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

    /*Tests_SRS_NODE_DEVICE_AMQP_18_010: [The `enableInputMessages` method shall enable C2D messages]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_18_011: [The `disableInputMessages` method shall disable C2D messages]*/
    [{
      enableFunc: 'enableC2D',
      disableFunc: 'disableC2D'
    },{
      enableFunc: 'enableInputMessages',
      disableFunc: 'disableInputMessages'
    }].forEach(function(testConfig) {
      describe(testConfig.enableFunc, function () {
        /*Tests_SRS_NODE_DEVICE_AMQP_16_031: [The `enableC2D` method shall connect and authenticate the transport if it is disconnected.]*/
        it('connects the transport if it is disconnected', function (testCallback) {
          transport[testConfig.enableFunc](function () {
            assert(fakeBaseClient.connect.calledOnce);
            assert(fakeBaseClient.attachReceiverLink.calledWith(transport._c2dEndpoint));
            testCallback();
          });
        });

        /*Tests_SRS_NODE_DEVICE_AMQP_16_032: [The `enableC2D` method shall attach the C2D link and call its `callback` once it is successfully attached.]*/
        it('attaches the C2D link', function (testCallback) {
          transport.connect(function () {
            assert(fakeBaseClient.attachReceiverLink.notCalled);
            transport[testConfig.enableFunc](function () {
              assert(fakeBaseClient.attachReceiverLink.calledWith(transport._c2dEndpoint));
              testCallback();
            });
          });
        });

        /*Tests_SRS_NODE_DEVICE_AMQP_16_033: [The `enableC2D` method shall call its `callback` with an `Error` if the transport fails to connect, authenticate or attach link.]*/
        it('calls its callback with an Error if connecting the transport fails', function (testCallback) {
        fakeBaseClient.connect = sinon.stub().callsArgWith(1, new Error('fake failed to connect'));
          transport[testConfig.enableFunc](function (err) {
            assert(fakeBaseClient.connect.calledOnce);
            assert.instanceOf(err, Error);
            testCallback();
          });
        });

        it('calls its callback with an Error if attaching the C2D link fails', function (testCallback) {
          fakeBaseClient.attachReceiverLink = sinon.stub().callsArgWith(2, new Error('fake failed to attach'));
          transport.connect(function () {
            assert(fakeBaseClient.attachReceiverLink.notCalled);
            transport[testConfig.enableFunc](function (err) {
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
            transport[testConfig.enableFunc](function () {
              assert(fakeBaseClient.attachReceiverLink.calledWith(transport._c2dEndpoint));
              receiver.emit('error', fakeError);
            });
          });
        });

        it('forwards messages to the client once connected and authenticated', function (testCallback) {
          var fakeMessage = new AmqpMessage();

          transport.on('message', function (msg) {
            assert.instanceOf(msg, Message);
            assert.strictEqual(msg.transportObj, fakeMessage);
            testCallback();
          });

          transport.connect(function () {
            transport[testConfig.enableFunc](function () {
              receiver.emit('message', fakeMessage);
            });
          });
        });
      });

      describe(testConfig.disableFunc, function () {
        /*Tests_SRS_NODE_DEVICE_AMQP_16_037: [The `disableC2D` method shall call its `callback` immediately if the transport is already disconnected.]*/
        it('calls the callback immediately if the transport is disconnected', function (testCallback) {
          transport[testConfig.disableFunc](function (err) {
            assert.isNotOk(err);
            assert(receiver.detach.notCalled);
            testCallback();
          });
        });

        /*Tests_SRS_NODE_DEVICE_AMQP_16_035: [The `disableC2D` method shall call `detach` on the C2D link and call its callback when it is successfully detached.]*/
        it('detaches the C2D link', function (testCallback) {
          transport.connect(function () {
            assert(fakeBaseClient.attachReceiverLink.notCalled);
            transport[testConfig.enableFunc](function () {
              assert(fakeBaseClient.attachReceiverLink.calledWith(transport._c2dEndpoint));
              transport[testConfig.disableFunc](function () {
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
            transport[testConfig.enableFunc](function () {
              assert(fakeBaseClient.attachReceiverLink.calledWith(transport._c2dEndpoint));
              transport[testConfig.disableFunc](function (err) {
                assert(receiver.detach.calledOnce);
                assert.instanceOf(err, Error);
                testCallback();
              });
            });
          });
        });
      });
    });
  });

  describe('Twin', function () {
    function testStateMachine(methodName, methodUnderTest) {
      describe('#' + methodName, function () {
        /*Tests_SRS_NODE_DEVICE_AMQP_16_059: [The `getTwin` method shall connect and authenticate the transport if it is disconnected.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_065: [The `updateTwinReportedProperties` method shall connect and authenticate the transport if it is disconnected.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_071: [The `enableTwinDesiredPropertiesUpdates` method shall connect and authenticate the transport if it is disconnected.]*/
        it('connects the transport if necessary', function () {
          methodUnderTest(function () {});
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
        });

        it('waits until connected and authenticated if called while connecting', function () {
          var connectCallback;
          fakeBaseClient.connect = sinon.stub().callsFake(function (config, callback) {
            connectCallback = callback;
          });

          transport.connect(function () {});
          methodUnderTest(function () {});
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.notCalled);
          assert(fakeBaseClient.putToken.notCalled);
          assert(sender.send.notCalled);
          connectCallback(null, new results.Connected());
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          assert(sender.send.calledOnce);
        });

        it('waits until connected and authenticated if called while authenticating', function () {
          var authCallback;
          fakeBaseClient.putToken = sinon.stub().callsFake(function (uri, options, callback) {
            authCallback = callback;
          });

          transport.connect(function () {});
          methodUnderTest(function () {});
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          assert(sender.send.notCalled);
          authCallback();
          assert(sender.send.calledOnce);
        });

        /*Tests_SRS_NODE_DEVICE_AMQP_16_060: [The `getTwin` method shall call its callback with an error if connecting fails.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_066: [The `updateTwinReportedProperties` method shall call its callback with an error if connecting fails.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_072: [The `enableTwinDesiredPropertiesUpdates` method shall call its callback with an error if connecting fails.]*/
        it('calls its callback with an error if connecting the transport fails', function (testCallback) {
          var testError = new Error('failed to connect');
          fakeBaseClient.connect = sinon.stub().callsArgWith(1, testError);

          methodUnderTest(function (err) {
            assert(fakeBaseClient.connect.calledOnce);
            assert.strictEqual(err.amqpError, testError);
            testCallback();
          });
        });

        /*Tests_SRS_NODE_DEVICE_AMQP_16_061: [The `getTwin` method shall call its callback with an error if authenticating fails.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_067: [The `updateTwinReportedProperties` method shall call its callback with an error if authenticating fails.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_073: [The `enableTwinDesiredPropertiesUpdates` method shall call its callback with an error if authenticating fails.]*/
        it('calls its callback with an error if authentication fails to initialize CBS', function (testCallback) {
          var testError = new Error('failed to authenticate');
          fakeBaseClient.initializeCBS = sinon.stub().callsArgWith(0, testError);

          methodUnderTest(function (err) {
            assert(fakeBaseClient.connect.calledOnce);
            assert(fakeBaseClient.initializeCBS.calledOnce);
            assert.strictEqual(err.amqpError, testError);
            testCallback();
          });
        });

        /*Tests_SRS_NODE_DEVICE_AMQP_16_061: [The `getTwin` method shall call its callback with an error if authenticating fails.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_067: [The `updateTwinReportedProperties` method shall call its callback with an error if authenticating fails.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_073: [The `enableTwinDesiredPropertiesUpdates` method shall call its callback with an error if authenticating fails.]*/
        it('calls its callback with an error if authentication fails to do a CBS putToken operation', function (testCallback) {
          var testError = new Error('failed to authenticate');
          fakeBaseClient.putToken = sinon.stub().callsArgWith(2, testError);

          methodUnderTest(function (err) {
            assert(fakeBaseClient.connect.calledOnce);
            assert(fakeBaseClient.initializeCBS.calledOnce);
            assert(fakeBaseClient.putToken.calledOnce);
            assert.strictEqual(err.amqpError, testError);
            testCallback();
          });
        });

        /*Tests_SRS_NODE_DEVICE_AMQP_16_062: [The `getTwin` method shall call the `getTwin` method on the `AmqpTwinClient` instance created by the constructor.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_064: [The `getTwin` method shall call its callback with a `null` error parameter and the result of the `AmqpTwinClient.getTwin` method if it succeeds.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_063: [The `getTwin` method shall call its callback with and error if the call to `AmqpTwinClient.getTwin` fails.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_068: [The `updateTwinReportedProperties` method shall call the `updateTwinReportedProperties` method on the `AmqpTwinClient` instance created by the constructor.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_069: [The `updateTwinReportedProperties` method shall call its callback with and error if the call to `AmqpTwinClient.updateTwinReportedProperties` fails.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_070: [The `updateTwinReportedProperties` method shall call its callback with a `null` error parameter and the result of the `AmqpTwinClient.updateTwinReportedProperties` method if it succeeds.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_074: [The `enableTwinDesiredPropertiesUpdates` method shall call the `enableTwinDesiredPropertiesUpdates` method on the `AmqpTwinClient` instance created by the constructor.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_075: [The `enableTwinDesiredPropertiesUpdates` method shall call its callback with and error if the call to `AmqpTwinClient.enableTwinDesiredPropertiesUpdates` fails.]*/
        /*Tests_SRS_NODE_DEVICE_AMQP_16_076: [The `enableTwinDesiredPropertiesUpdates` method shall call its callback with no arguments if the call to `AmqpTwinClient.enableTwinDesiredPropertiesUpdates` succeeds.]*/
        it('calls its callback with an error if the twin client fails to send the request', function (testCallback) {
          var testError = new Error('failed to send');
          sender.send = sinon.stub().callsArgWith(1, testError);

          methodUnderTest(function (err) {
            assert(fakeBaseClient.connect.calledOnce);
            assert(fakeBaseClient.initializeCBS.calledOnce);
            assert(fakeBaseClient.putToken.calledOnce);
            assert(fakeBaseClient.attachReceiverLink.calledOnce);
            assert(fakeBaseClient.attachSenderLink.calledOnce);
            assert.strictEqual(err.amqpError, testError);
            testCallback();
          });
        });

        it('tries to reconnect to send the message if the transport is disconnecting', function () {
          var disconnectCallback;

          fakeBaseClient.disconnect = sinon.stub().callsFake(function (done) {
            disconnectCallback = done;
          });

          methodUnderTest(function () {});
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);
          assert(sender.send.calledOnce);

          transport.disconnect(function () {});

          methodUnderTest(function () {});
          assert(fakeBaseClient.connect.calledOnce);
          assert(fakeBaseClient.initializeCBS.calledOnce);
          assert(fakeBaseClient.putToken.calledOnce);

          disconnectCallback(null, new results.Disconnected());

          assert(fakeBaseClient.connect.calledTwice);
          assert(fakeBaseClient.initializeCBS.calledTwice);
          assert(fakeBaseClient.putToken.calledTwice);
          assert(fakeBaseClient.attachReceiverLink.calledTwice);
          assert(fakeBaseClient.attachSenderLink.calledTwice);
        });
      });
    }

    testStateMachine('getTwin', function (callback) {
      transport.getTwin(callback);
    });

    testStateMachine('updateTwinReportedProperties', function (callback) {
      transport.updateTwinReportedProperties({ fake: 'patch' }, callback);
    });

    testStateMachine('enableTwinDesiredPropertiesUpdates', function (callback) {
      transport.enableTwinDesiredPropertiesUpdates(callback);
    });

    describe('#disableTwinDesiredPropertiesUpdates', function () {
      it('calls its callback immediately if the amqp client is disconnected', function (testCallback) {
        transport.disableTwinDesiredPropertiesUpdates(function () {
          assert.isTrue(fakeBaseClient.connect.notCalled);
          assert.isTrue(fakeBaseClient.initializeCBS.notCalled);
          assert.isTrue(fakeBaseClient.putToken.notCalled);
          assert.isTrue(fakeBaseClient.attachReceiverLink.notCalled);
          assert.isTrue(fakeBaseClient.attachSenderLink.notCalled);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_AMQP_16_077: [The `disableTwinDesiredPropertiesUpdates` method shall call the `disableTwinDesiredPropertiesUpdates` method on the `AmqpTwinClient` instance created by the constructor.]*/
      /*Tests_SRS_NODE_DEVICE_AMQP_16_078: [The `disableTwinDesiredPropertiesUpdates` method shall call its callback with and error if the call to `AmqpTwinClient.disableTwinDesiredPropertiesUpdates` fails.]*/
      /*Tests_SRS_NODE_DEVICE_AMQP_16_079: [The `disableTwinDesiredPropertiesUpdates` method shall call its callback no arguments if the call to `AmqpTwinClient.disableTwinDesiredPropertiesUpdates` succeeds.]*/
      it('calls disableTwinDesiredPropertiesUpdates on the twin client', function (testCallback) {
        transport._twinClient.disableTwinDesiredPropertiesUpdates = sinon.stub().callsArg(0);
        transport.enableTwinDesiredPropertiesUpdates(function () {});
        transport.disableTwinDesiredPropertiesUpdates(function () {
          assert.isTrue(transport._twinClient.disableTwinDesiredPropertiesUpdates.calledOnce);
          testCallback();
        });
      });
    });

    describe('on(\'twinDesiredPropertiesUpdate\')', function () {
      it('emits a twinDesiredPropertiesUpdate if it receives a twinDesiredPropertiesUpdate from the twin client', function (testCallback) {
        var fakePatch = { fake : 'patch' };
        transport.on('twinDesiredPropertiesUpdate', function (patch) {
          assert.strictEqual(patch, fakePatch);
          testCallback();
        });

        transport._twinClient.emit('twinDesiredPropertiesUpdate', fakePatch);
      });
    });

    describe('on(\'error\')', function () {
      it('emits a TwinDetachedError if it receives an error from the twin client', function (testCallback) {
        var fakeError = new Error('fake');
        transport.on('error', function (err) {
          assert.instanceOf(err, errors.TwinDetachedError);
          assert.strictEqual(err.innerError, fakeError);
          testCallback();
        });

        transport._twinClient.emit('error', fakeError);
      });
    });
  });

  /*Tests_SRS_NODE_DEVICE_AMQP_18_013: [If `amqp` receives a message on the C2D link, it shall emit a "message" event with the message as the event parameter.]*/
  describe('on(\'message\')', function () {
    it('calls the message handler when message received', function (testCallback) {
      var testText = '__TEST_TEXT__';
      transport.connect(function () {
        transport.on('message', function (msg) {
          assert.strictEqual(msg.data.toString(), testText);
          testCallback();
        });
        transport.enableC2D(function (err) {
          assert(!err);
          receiver.emit('message', AmqpMessage.fromMessage(new Message(testText)));
        });
      });
    });
  });

  /*Tests_SRS_NODE_DEVICE_AMQP_18_014: [If `amqp` receives a message on the input message link, it shall emit an "inputMessage" event with the value of the annotation property "x-opt-input-name" as the first parameter and the agnostic message as the second parameter.]*/
  describe('on(\'inputMessage\')', function () {
    it('calls the message handler when message received', function (testCallback) {
      var testText = '__TEST_TEXT__';
      var testInputName = '__INPUT__';
      var amqp = new Amqp(fakeX509ModuleAuthenticationProvider, fakeBaseClient);

      amqp.connect(function () {
        amqp.on('inputMessage', function (inputName, msg) {
          assert.strictEqual(inputName, testInputName);
          assert.strictEqual(msg.data.toString(), testText);
          testCallback();
        });
        amqp.enableInputMessages(function (err) {
          assert(!err);
          var amqpMessage = AmqpMessage.fromMessage(new Message(testText));
          amqpMessage.message_annotations = { 'x-opt-input-name': testInputName };
          receiver.emit('message', amqpMessage);
        });
      });
    });
  });

  /*Tests_SRS_NODE_DEVICE_AMQP_16_052: [The `sendEventBatch` method shall throw a `NotImplementedError`.]*/
  /*Tests_SRS_NODE_DEVICE_AMQP_18_004: [`sendOutputEventBatch` shall throw a `NotImplementedError`.]*/
  [
    'sendEventBatch',
    'sendOutputEventBatch'
  ].forEach(function (methodName) {
    describe('#' + methodName, function () {
      it('throws a NotImplementedError', function () {
        assert.throws(function () {
          transport[methodName]();
        }, errors.NotImplementedError);
      });
    });
  });
});

