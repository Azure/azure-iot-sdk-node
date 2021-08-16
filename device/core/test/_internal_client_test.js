// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var uuid = require('uuid');
var fs = require('fs');
var util = require('util')
var EventEmitter = require('events').EventEmitter;
var SimulatedHttp = require('./http_simulated.js');
var FakeTransport = require('./fake_transport.js');
var clientTests = require('./_client_common_testrun.js');
var results = require('azure-iot-common').results;
var errors = require('azure-iot-common').errors;
var Message = require('azure-iot-common').Message;
var NoRetry = require('azure-iot-common').NoRetry;
var SharedAccessKeyAuthenticationProvider = require('../dist/sak_authentication_provider').SharedAccessKeyAuthenticationProvider;
var SharedAccessSignatureAuthenticationProvider = require('../dist/sas_authentication_provider').SharedAccessSignatureAuthenticationProvider;
var Twin = require('../dist/twin').Twin;
var DeviceClient = require('../dist/device_client').Client;
var ModuleClient = require('../dist/module_client').ModuleClient;
var ClientPropertyCollection = require('../dist/pnp/properties').ClientPropertyCollection;

[ModuleClient, DeviceClient].forEach(function (ClientCtor) {
  describe(ClientCtor.name, function () {
    var sharedKeyConnectionString = 'HostName=host;DeviceId=id;SharedAccessKey=key';
    describe('#constructor', function () {
      /*Tests_SRS_NODE_DEVICE_CLIENT_05_001: [The InternalClient constructor shall throw ReferenceError if the transport argument is falsy.]*/
      /*Tests_SRS_NODE_MODULE_CLIENT_05_001: [The InternalClient constructor shall throw ReferenceError if the transport argument is falsy.]*/
      it('throws if transport arg is falsy', function () {
        [null, undefined, '', 0].forEach(function (transport) {
          assert.throws(function () {
            return new ClientCtor(transport);
          }, ReferenceError, 'transport is \'' + transport + '\'');
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_41_001: [A `connect` event will be emitted when a `connected` event is received from the transport.]*/
      it('emits `connect` when a connected event is received from the transport', function (testCallback) {
        const dummyTransport = new FakeTransport();
        var client = new ClientCtor(dummyTransport);
        client.on('connect', testCallback);
        dummyTransport.emit('connected');
      });
    });

    describe('#fromConnectionString', function () {
      /*Tests_SRS_NODE_DEVICE_CLIENT_05_003: [The fromConnectionString method shall throw ReferenceError if the connStr argument is falsy.]*/
      /*Tests_SRS_NODE_MODULE_CLIENT_05_003: [The fromConnectionString method shall throw ReferenceError if the connStr argument is falsy.]*/
      it('throws if connStr arg is falsy', function () {
        [null, undefined, '', 0].forEach(function (value) {
          assert.throws(function () {
            return ClientCtor.fromConnectionString(value);
          }, ReferenceError, 'connStr is \'' + value + '\'');
        });
      });

      /*Tests_SRS_NODE_DEVICE_CLIENT_16_087: [The `fromConnectionString` method shall create a new `SharedAccessKeyAuthorizationProvider` object with the connection string passed as argument if it contains a SharedAccessKey parameter and pass this object to the transport constructor. ]*/
      /*Tests_SRS_NODE_MODULE_CLIENT_16_087: [The `fromConnectionString` method shall create a new `SharedAccessKeyAuthorizationProvider` object with the connection string passed as argument if it contains a SharedAccessKey parameter and pass this object to the transport constructor. ]*/
      it('creates a SharedAccessKeyAuthorizationProvider and passes it to the transport', function (testCallback) {
        ClientCtor.fromConnectionString(sharedKeyConnectionString, function (authProvider) {
          assert.instanceOf(authProvider, SharedAccessKeyAuthenticationProvider);
          testCallback();
        });
      });

      it('throws if modelId is provided but the transport is neither Mqtt nor MqttWs', function () {
        assert.throws(function () {
          ClientCtor.fromConnectionString(sharedKeyConnectionString, FakeTransport, "dtmi:com:example:TemperatureController;1");
        }, errors.InvalidOperationError, "Azure IoT Plug and Play features are only compatible with Mqtt and MqttWs transports.");
      });

      it('does not throw if modelId is provided and the transport is Mqtt', function () {
        assert.doesNotThrow(function () {
          function Mqtt() {
            FakeTransport.call(this);
          }
          util.inherits(Mqtt, FakeTransport);          
          ClientCtor.fromConnectionString(sharedKeyConnectionString, Mqtt, "dtmi:com:example:TemperatureController;1");
        });
      });

      it('does not throw if modelId is provided and the transport is MqttWs', function () {
        assert.doesNotThrow(function () {
          function MqttWs() {
            FakeTransport.call(this);
          }
          util.inherits(MqttWs, FakeTransport); 
          ClientCtor.fromConnectionString(sharedKeyConnectionString, MqttWs, "dtmi:com:example:TemperatureController;1");
        });
      });

      it('calls setModelId on the transport if modelId is provided', function () {
        function Mqtt() {
          FakeTransport.call(this);
          this.setModelId = sinon.stub();
        }
        util.inherits(Mqtt, FakeTransport);
        var client = ClientCtor.fromConnectionString(sharedKeyConnectionString, Mqtt, "dtmi:com:example:TemperatureController;1");
        assert.isTrue(client._transport.setModelId.calledOnceWith("dtmi:com:example:TemperatureController;1"))
      });
    });

    describe('#fromSharedAccessSignature', function () {
      var sharedAccessSignature = '"SharedAccessSignature sr=hubName.azure-devices.net/devices/deviceId&sig=s1gn4tur3&se=1454204843"';
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_029: [The fromSharedAccessSignature method shall throw a ReferenceError if the sharedAccessSignature argument is falsy.] */
      /*Tests_SRS_NODE_MODULE_CLIENT_16_029: [The fromSharedAccessSignature method shall throw a ReferenceError if the sharedAccessSignature argument is falsy.] */
      [null, undefined, '', 0].forEach(function (value) {
        it('throws if sharedAccessSignature arg is \'' + value + '\'', function () {
          assert.throws(function () {
            return ClientCtor.fromSharedAccessSignature(value);
          }, ReferenceError, 'sharedAccessSignature is \'' + value + '\'');
        });
      });

      it('creates a SharedAccessSignatureAuthorizationProvider and passes it to the transport', function (testCallback) {
        ClientCtor.fromSharedAccessSignature(sharedAccessSignature, function (authProvider) {
          assert.instanceOf(authProvider, SharedAccessSignatureAuthenticationProvider);
          testCallback();
        });
      });

      it('throws if modelId is provided but the transport is neither Mqtt nor MqttWs', function () {
        assert.throws(function () {
          ClientCtor.fromSharedAccessSignature(sharedAccessSignature, FakeTransport, "dtmi:com:example:TemperatureController;1");
        }, errors.InvalidOperationError, "Azure IoT Plug and Play features are only compatible with Mqtt and MqttWs transports.");
      });

      it('does not throw if modelId is provided and the transport is Mqtt', function () {
        assert.doesNotThrow(function () {
          function Mqtt() {
            FakeTransport.call(this);
          }
          util.inherits(Mqtt, FakeTransport);          
          ClientCtor.fromSharedAccessSignature(sharedAccessSignature, Mqtt, "dtmi:com:example:TemperatureController;1");
        });
      });

      it('does not throw if modelId is provided and the transport is MqttWs', function () {
        assert.doesNotThrow(function () {
          function MqttWs() {
            FakeTransport.call(this);
          }
          util.inherits(MqttWs, FakeTransport); 
          ClientCtor.fromSharedAccessSignature(sharedAccessSignature, MqttWs, "dtmi:com:example:TemperatureController;1");
        });
      });

      it('calls setModelId on the transport if modelId is provided', function () {
        function Mqtt() {
          FakeTransport.call(this);
          this.setModelId = sinon.stub();
        }
        util.inherits(Mqtt, FakeTransport);
        var client = ClientCtor.fromSharedAccessSignature(sharedAccessSignature, Mqtt, "dtmi:com:example:TemperatureController;1");
        assert.isTrue(client._transport.setModelId.calledOnceWith("dtmi:com:example:TemperatureController;1"))
      });
    });

    describe('#fromAuthenticationProvider', function () {
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_089: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `authenticationProvider` argument is falsy.]*/
      /*Tests_SRS_NODE_MODULE_CLIENT_16_089: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `authenticationProvider` argument is falsy.]*/
      [null, undefined].forEach(function (badAuthProvider) {
        it('throws if the authenticationProvider is \'' + badAuthProvider + '\'', function () {
          assert.throws(function () {
            return ClientCtor.fromAuthenticationProvider(badAuthProvider, function () { });
          }, ReferenceError);
        });
      });

      /*Tests_SRS_NODE_DEVICE_CLIENT_16_092: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `transportCtor` argument is falsy.]*/
      /*Tests_SRS_NODE_MODULE_CLIENT_16_092: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `transportCtor` argument is falsy.]*/
      [null, undefined].forEach(function (badTransportCtor) {
        it('throws if the transportCtor is \'' + badTransportCtor + '\'', function () {
          assert.throws(function () {
            return ClientCtor.fromAuthenticationProvider({}, badTransportCtor);
          }, ReferenceError);
        });
      });

      /*Tests_SRS_NODE_DEVICE_CLIENT_16_090: [The `fromAuthenticationProvider` method shall pass the `authenticationProvider` object passed as argument to the transport constructor.]*/
      /*Tests_SRS_NODE_MODULE_CLIENT_16_090: [The `fromAuthenticationProvider` method shall pass the `authenticationProvider` object passed as argument to the transport constructor.]*/
      it('passes the authenticationProvider to the transport', function () {
        var fakeAuthProvider = {};
        var fakeTransportCtor = sinon.stub().returns(new EventEmitter());
        ClientCtor.fromAuthenticationProvider(fakeAuthProvider, fakeTransportCtor);
        assert.isTrue(fakeTransportCtor.calledWith(fakeAuthProvider));
      });

      it('throws if modelId is provided but the transport is neither Mqtt nor MqttWs', function () {
        assert.throws(function () {
          ClientCtor.fromAuthenticationProvider({}, FakeTransport, "dtmi:com:example:TemperatureController;1");
        }, errors.InvalidOperationError, "Azure IoT Plug and Play features are only compatible with Mqtt and MqttWs transports.");
      });

      it('does not throw if modelId is provided and the transport is Mqtt', function () {
        assert.doesNotThrow(function () {
          function Mqtt() {
            FakeTransport.call(this);
          }
          util.inherits(Mqtt, FakeTransport);          
          ClientCtor.fromAuthenticationProvider({}, Mqtt, "dtmi:com:example:TemperatureController;1");
        });
      });

      it('does not throw if modelId is provided and the transport is MqttWs', function () {
        assert.doesNotThrow(function () {
          function MqttWs() {
            FakeTransport.call(this);
          }
          util.inherits(MqttWs, FakeTransport); 
          ClientCtor.fromAuthenticationProvider({}, MqttWs, "dtmi:com:example:TemperatureController;1");
        });
      });

      it('calls setModelId on the transport if modelId is provided', function () {
        function Mqtt() {
          FakeTransport.call(this);
          this.setModelId = sinon.stub();
        }
        util.inherits(Mqtt, FakeTransport);
        var client = ClientCtor.fromAuthenticationProvider({}, Mqtt, "dtmi:com:example:TemperatureController;1");
        assert.isTrue(client._transport.setModelId.calledOnceWith("dtmi:com:example:TemperatureController;1"))
      });
    });

    describe('#setTransportOptions', function () {
      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_021: [The ‘setTransportOptions’ method shall call the ‘setOptions’ method on the transport object.]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_022: [The ‘done’ callback shall be invoked with a null error object and a ‘TransportConfigured’ object once the transport has been configured.]*/
      it('calls the setOptions method on the transport object and gives it the options parameter', function (done) {
        var testOptions = { foo: 42 };
        var dummyTransport = new FakeTransport();
        sinon.stub(dummyTransport, 'setOptions').callsFake(function (options, callback) {
          assert.equal(options.http.receivePolicy, testOptions);
          callback(null, new results.TransportConfigured());
        });

        var client = new ClientCtor(dummyTransport);
        client.setTransportOptions(testOptions, function (err, result) {
          if (err) {
            done(err);
          } else {
            assert.equal(result.constructor.name, 'TransportConfigured');
            done();
          }
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_023: [The ‘done’ callback shall be invoked with a standard javascript Error object and no result object if the transport could not be configued as requested.]*/
      it('calls the \'done\' callback with an error object if setOptions failed', function (done) {
        var dummyTransport = new FakeTransport();
        sinon.stub(dummyTransport, 'setOptions').callsFake(function (options, callback) {
          var err = new Error('fail');
          callback(err);
        });

        var client = new ClientCtor(dummyTransport);
        client.setTransportOptions({ foo: 42 }, function (err) {
          assert.isNotNull(err);
          done();
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_024: [The ‘setTransportOptions’ method shall throw a ‘ReferenceError’ if the options object is falsy] */
      [null, undefined, '', 0].forEach(function (option) {
        it('throws a ReferenceError if options is ' + option, function () {
          var client = new ClientCtor(new FakeTransport());
          assert.throws(function () {
            client.setTransportOptions(option, function () { });
          }, ReferenceError);
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_025: [The ‘setTransportOptions’ method shall throw a ‘NotImplementedError’ if the transport doesn’t implement a ‘setOption’ method.]*/
      it('throws a NotImplementedError if the setOptions method is not implemented on the transport', function () {
        var client = new ClientCtor(new EventEmitter());

        assert.throws(function () {
          client.setTransportOptions({ foo: 42 }, function () { });
        }, errors.NotImplementedError);
      });
    });

    describe('#setOptions', function () {
      beforeEach(function() {
        fs.writeFileSync('aziotfakepemfile', 'ca cert');
      });
      afterEach(function() {
        fs.unlinkSync('aziotfakepemfile');
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_06_001: [The `setOptions` method shall assume the `ca` property is the name of an already existent file and it will attempt to read that file as a pem into a string value and pass the string to config object `ca` property.  Otherwise, it is assumed to be a pem string.] */
      it('sets CA cert with contents of file if provided', function (testCallback) {
        var fakeBaseClient = new FakeTransport();
        fakeBaseClient.setOptions = sinon.stub().callsArg(1);
        var fakeMethodClient = {}
        fakeMethodClient.setOptions = sinon.stub();
        var client = new ClientCtor(fakeBaseClient);
        client._methodClient = fakeMethodClient;
        client.setOptions({ ca: 'aziotfakepemfile' }, function(err) {
          assert.isNotOk(err);
          assert(fakeBaseClient.setOptions.called);
          assert.strictEqual(fakeBaseClient.setOptions.firstCall.args[0].ca, 'ca cert');
          testCallback();
        });
      });

      it('sets CA cert with contents of provided string', function (testCallback) {
        var fakeBaseClient = new FakeTransport();
        fakeBaseClient.setOptions = sinon.stub().callsArg(1);
        var fakeMethodClient = {}
        fakeMethodClient.setOptions = sinon.stub();
        var client = new ClientCtor(fakeBaseClient);
        client._methodClient = fakeMethodClient;
        client.setOptions({ ca: 'ca cert' }, function(err) {
          assert.isNotOk(err);
          assert(fakeBaseClient.setOptions.called);
          assert.strictEqual(fakeBaseClient.setOptions.firstCall.args[0].ca, 'ca cert');
          testCallback();
        });
      });

      it('productInfo properly sets string', function (done) {
        var testOptions = { productInfo: 'test'};
        var dummyTransport = new FakeTransport();
        sinon.stub(dummyTransport, 'setOptions').callsFake(function (options, callback) {
          assert.strictEqual(options.productInfo, testOptions.productInfo);
          callback(null, new results.TransportConfigured());
        });

        var client = new ClientCtor(dummyTransport);
        client.setOptions(testOptions, function (err, results) {
          if (err) {
            done(err);
          } else {
            done();
          }
        });
      });
    });

    describe('#open', function () {
      /* Tests_SRS_NODE_INTERNAL_CLIENT_12_001: [The open function shall call the transport’s connect function, if it exists.] */
      it('calls connect on the transport if the method exists', function (done) {
        var client = new ClientCtor(new FakeTransport());
        client.open(function (err, result) {
          if (err) {
            done(err);
          } else {
            assert.equal(result.constructor.name, 'Connected');
            done();
          }
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_045: [If the transport successfully establishes a connection the `open` method shall subscribe to the `disconnect` event of the transport.]*/
      it('subscribes to the \'disconnect\' event once connected', function (done) {
        var transport = new FakeTransport();
        var client = new ClientCtor(transport);
        client.open(function () {
          client.on('disconnect', function () {
            done();
          });

          transport.emit('disconnect');
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_064: [The `open` method shall call the `openCallback` immediately with a null error object and a `results.Connected()` object if called while renewing the shared access signature.]*/
      it('calls the callback without trying connect while updating the shared access signature', function (testCallback) {
        var transport = new FakeTransport();
        sinon.spy(transport, 'connect');
        sinon.stub(transport, 'updateSharedAccessSignature').callsFake(function (sas, callback) {
          this._updateSasCallback = callback; // will store the callback but not call it, blocking the state machine in the 'updating_sas' state.
        });

        var unblockUpdateSas = function () {
          transport._updateSasCallback(null, new results.SharedAccessSignatureUpdated()); // unblock the state machine and calls the stored callback.
        };

        var client = new ClientCtor(transport);
        client.blobUploadClient = { updateSharedAccessSignature: function () { } };

        client.open(function (err) {
          if (err) {
            testCallback(err);
          } else {
            assert.isTrue(transport.connect.calledOnce);
            client.updateSharedAccessSignature('newsas');
            client.open(testCallback);
            assert.isTrue(transport.connect.calledOnce);
            unblockUpdateSas();
          }
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_061: [The `open` method shall not throw if the `openCallback` callback has not been provided.]*/
      it('doesn\'t throw if the callback hasn\'t been passed as argument', function () {
        var transport = new FakeTransport();
        var client = new ClientCtor(transport);
        assert.doesNotThrow(function () {
          client.open();
        });
      });
    });

    describe('#close', function () {
      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_001: [The close function shall call the transport’s disconnect function if it exists.] */
      it('calls disconnect on the transport if the method exists', function (done) {
        var transport = new FakeTransport();
        sinon.stub(transport, 'disconnect').callsFake(function () {
          done();
        });
        var client = new ClientCtor(transport);
        client.open(function () {
          client.close();
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_046: [** The `disconnect` method shall remove the listener that has been attached to the transport `disconnect` event.]*/
      it('unsubscribes for the \'disconnect\' event when disconnecting', function (done) {
        var transport = new FakeTransport();
        var client = new ClientCtor(transport);
        var disconnectReceived = false;
        client.open(function () {
          client.on('disconnect', function () {
            disconnectReceived = true;
          });
          client.close(function () {
            transport.emit('disconnect');
            assert.isFalse(disconnectReceived);
            done();
          });
        });
      });

      /*Test_SRS_NODE_INTERNAL_CLIENT_16_001: [The `close` function shall call the transport's `disconnect` function if it exists.]*/
      it('disconnects the transport if called while updating the shared access signature', function (testCallback) {
        var transport = new FakeTransport();
        sinon.stub(transport, 'updateSharedAccessSignature').callsFake(function () {
          // will not call the callback, leaving the state machine in the 'updating_sas' state.
        });
        sinon.spy(transport, 'disconnect');

        var client = new ClientCtor(transport);
        client.blobUploadClient = { updateSharedAccessSignature: function () { } };
        client.open(function () {
          client.updateSharedAccessSignature('newSas');
          client.close(function () {
            assert.isTrue(transport.disconnect.called);
            testCallback();
          });
        });
      });

      /*Test_SRS_NODE_INTERNAL_CLIENT_16_001: [The `close` function shall call the transport's `disconnect` function if it exists.]*/
      it('closes the transport when called while connecting', function (testCallback) {
        var transport = new FakeTransport();
        sinon.stub(transport, 'connect').callsFake(function () {
          // will not call the callback, leaving the state machine in the 'CONNECTING' state
        });

        var client = new ClientCtor(transport);
        client.open();
        client.close(testCallback);
      });
    });

    ['sendEvent', 'sendEventBatch', 'complete', 'reject', 'abandon'].forEach(function (funcName) {
      describe('#' + funcName, function () {
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_051: [The `sendEventBatch` method shall not throw if the `sendEventBatchCallback` is not passed.]*/
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_047: [The `sendEvent` method shall not throw if the `sendEventCallback` is not passed.]*/
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_067: [The `complete` method shall not throw if the `completeCallback` is not passed.]*/
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_071: [The `reject` method shall not throw if the `rejectCallback` is not passed.]*/
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_075: [The `abandon` method shall not throw if the `abandonCallback` is not passed.]*/
        it('doesn\'t throw if no callback is given and the method exists on the transport', function () {
          var transport = new FakeTransport();
          var client = new ClientCtor(transport);
          client.open(function () {
            assert.doesNotThrow(function () {
              client[funcName]('message');
            });
          });
        });
      });
    });

    describe('#on(\'error\')', function () {
      // errors right now bubble up through the transport disconnect handler.
      // ultimately we would like to get rid of that disconnect event and rely on the error event instead
      it.skip('forwards transport errors into a disconnect event', function (testCallback) {
        var fakeError = new Error('fake');
        var dummyTransport = new FakeTransport();
        var client = new ClientCtor(dummyTransport);
        client.setRetryPolicy(new NoRetry());
        client.on('disconnect', function (err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        });

        dummyTransport.emit('error', fakeError);
      });
    });

    [
      { methodName: 'complete', expectedResultCtor: 'MessageCompleted' },
      { methodName: 'reject', expectedResultCtor: 'MessageRejected' },
      { methodName: 'abandon', expectedResultCtor: 'MessageAbandoned' }
    ].forEach(function (testConfig) {
      describe('#' + testConfig.methodName, function () {
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_016: [The ‘complete’ method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_018: [The ‘reject’ method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_017: [The ‘abandon’ method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
        [undefined, null, '', 0].forEach(function (message) {
          it('throws if message is \'' + message + '\'', function () {
            var client = new ClientCtor(new FakeTransport());
            assert.throws(function () {
              client[testConfig.methodName](message, function () { });
            }, ReferenceError);
          });
        });

        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_007: [The ‘complete’ method shall call the ‘complete’ method of the transport with the message as an argument]*/
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_010: [The ‘reject’ method shall call the ‘reject’ method of the transport with the message as an argument]*/
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_013: [The ‘abandon’ method shall call the ‘abandon’ method of the transport with the message as an argument]*/
        it('calls the ' + testConfig.methodName + ' method on the transport with the message as an argument', function () {
          var dummyTransport = new FakeTransport();
          sinon.spy(dummyTransport, testConfig.methodName);

          var client = new ClientCtor(dummyTransport);
          var message = new Message();
          client[testConfig.methodName](message, function () { });
          assert(client._transport[testConfig.methodName].calledOnce);
          assert(client._transport[testConfig.methodName].calledWith(message));
        });

        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_008: [The ‘done’ callback shall be called with a null error object and a ‘MessageCompleted’ result once the transport has completed the message.]*/
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_011: [The ‘done’ callback shall be called with a null error object and a ‘MessageRejected’ result once the transport has rejected the message.]*/
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_014: [The ‘done’ callback shall be called with a null error object and a ‘Messageabandoned’ result once the transport has abandoned the message.]*/
        it('calls the done callback with a null error object and a result', function (done) {
          var client = new ClientCtor(new FakeTransport());
          var message = new Message();
          client[testConfig.methodName](message, function (err, res) {
            if (err) {
              done(err);
            } else {
              assert.equal(res.constructor.name, testConfig.expectedResultCtor);
              done();
            }
          });
        });

        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_009: [The ‘done’ callback shall be called with a standard javascript Error object and no result object if the transport could not complete the message.]*/
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_012: [The ‘done’ callback shall be called with a standard javascript Error object and no result object if the transport could not reject the message.]*/
        /*Tests_SRS_NODE_INTERNAL_CLIENT_16_015: [The ‘done’ callback shall be called with a standard javascript Error object and no result object if the transport could not abandon the message.]*/
        it('calls the done callback with an error if the transport fails to complete the message', function (done) {
          var testError = new Error('fake error');
          var dummyTransport = new FakeTransport();
          sinon.stub(dummyTransport, [testConfig.methodName]).callsFake(function (message, callback) {
            callback(testError);
          });

          var client = new ClientCtor(dummyTransport);
          var message = new Message();
          client[testConfig.methodName](message, function (err) {
            assert.strictEqual(err, testError);
            done();
          });
        });
      });
    });

    describe('#updateSharedAccessSignature', function () {
      var DummyBlobUploadClient = function () { };
      DummyBlobUploadClient.prototype.updateSharedAccessSignature = function () { };

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_031: [The updateSharedAccessSignature method shall throw a ReferenceError if the sharedAccessSignature parameter is falsy.]*/
      [undefined, null, '', 0].forEach(function (sas) {
        it('throws a ReferenceError if sharedAccessSignature is \'' + sas + '\'', function () {
          var client = new ClientCtor(new FakeTransport());
          assert.throws(function () {
            client.updateSharedAccessSignature(sas, function () { });
          }, ReferenceError);
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_032: [The updateSharedAccessSignature method shall call the updateSharedAccessSignature method of the transport currently in use with the sharedAccessSignature parameter.]*/
      it('calls the transport `updateSharedAccessSignature` method with the sharedAccessSignature parameter', function () {
        var dummyTransport = new FakeTransport();
        sinon.spy(dummyTransport, 'updateSharedAccessSignature');

        var client = new ClientCtor(dummyTransport, null, null);
        var sas = 'sas';
        client.updateSharedAccessSignature(sas, function () { });
        assert(dummyTransport.updateSharedAccessSignature.calledOnce);
        assert(dummyTransport.updateSharedAccessSignature.calledWith(sas));
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_035: [The updateSharedAccessSignature method shall call the `done` callback with an error object if an error happened while renewing the token.]*/
      it('Calls the `done` callback with an error object if an error happened', function (done) {
        var dummyTransport = new FakeTransport();
        sinon.stub(dummyTransport, 'updateSharedAccessSignature').callsFake(function (sas, callback) {
          callback(new Error('foo'));
        });

        var client = new ClientCtor(dummyTransport, null, null);
        client.updateSharedAccessSignature('sas', function (err) {
          assert.isOk(err);
          done();
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_036: [The updateSharedAccessSignature method shall call the `done` callback with a null error object and a result of type SharedAccessSignatureUpdated if the token was updated successfully.]*/
      it('Calls the `done` callback with a null error object and a SharedAccessSignatureUpdated result', function (done) {
        var client = new ClientCtor(new FakeTransport(), null, null);
        client.updateSharedAccessSignature('sas', function (err, res) {
          if (err) {
            done(err);
          } else {
            assert.equal(res.constructor.name, 'SharedAccessSignatureUpdated');
            done();
          }
        });
      });
    });

    describe('getTwin', function () {
      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_094: [If this is the first call to `getTwin` the method shall instantiate a new `Twin` object  and pass it the transport currently in use.]*/
      it('creates the device twin correctly', function (testCallback) {
        var transport = new FakeTransport();
        sinon.spy(transport, 'getTwin');
        var client = new ClientCtor(transport);
        client.getTwin(function (err, twin) {
          assert.instanceOf(twin, Twin);
          assert.isTrue(transport.getTwin.calledOnce);
          testCallback();
        });
      });

      it('reuses the existing twin', function (testCallback) {
        var client = new ClientCtor(new FakeTransport());
        client.getTwin(function (err, firstTwin) {
          client.getTwin(function (err, secondTwin) {
            assert.strictEqual(firstTwin, secondTwin);
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_095: [The `getTwin` method shall call the `get()` method on the `Twin` object currently in use and pass it its `done` argument for a callback.]*/
      it('Calls the get() method on the Twin', function (testCallback) {
        var client = new ClientCtor(new FakeTransport());
        client.getTwin(function (err, twin) {
          sinon.spy(twin, 'get');
          client.getTwin(function () {
            assert.isTrue(twin.get.calledOnce);
            testCallback();
          });
        });
      });
    });

    describe('getClientProperties', function () {
      it('Calls the client\'s getTwin method and calls the callback with the correct result', async function() {
        const client = new ClientCtor(new FakeTransport());
        sinon.spy(client, 'getTwin');
        const properties = await new Promise((resolve, reject) => {
          client.getClientProperties((err, properties) => {
            err ? reject(err) : resolve(properties);
          });
        });
        assert(
          client.getTwin.calledOnce,
          `Expected getTwin() call count of 1, got call count of ${client.getTwin.callCount}`
        );
        assert.deepEqual(properties.reportedFromDevice.backingObject, {fake: 'fakeReported'});
        assert.deepEqual(properties.writablePropertiesRequests.backingObject, {fake: 'fakeDesired'});
      });

      it('Calls the client\'s getTwin method and returns a promise with the correct result', async function() {
        const client = new ClientCtor(new FakeTransport());
        sinon.spy(client, 'getTwin');
        const properties = await client.getClientProperties();
        assert(
          client.getTwin.calledOnce,
          `Expected getTwin() call count of 1, got call count of ${client.getTwin.callCount}`
        );
        assert.deepEqual(properties.reportedFromDevice.backingObject, {fake: 'fakeReported'});
        assert.deepEqual(properties.writablePropertiesRequests.backingObject, {fake: 'fakeDesired'});
      });

      it('Calls the callback with an error if getTwin() fails', async function() {
        const client = new ClientCtor(new FakeTransport());
        client.getTwin = (callback) => {callback(new Error('This is a fake error'))};
        await new Promise((resolve, reject) => {
          client.getClientProperties((err, properties) => {
            err ? resolve(err) : reject(new Error('Expected getClientProperties to fail, but it succeeded'));
          });
        });
      });

      it('Rejects if getTwin() fails', async function() {
        const client = new ClientCtor(new FakeTransport());
        client.getTwin = (callback) => {callback(new Error('This is a fake error'))};        
        try {
          await client.getClientProperties();
        } catch(e){
          return;
        }
        assert.fail('Expected getClientProperties to fail, but it succeeded.');
      });
    });

    describe('onWritablePropertyUpdateRequest', function () {
      it('registers a callback that gets called if there was already a desired property update before the callback was registered', function(testCallback) {
        const client = new ClientCtor(new FakeTransport());
        client.onWritablePropertyUpdateRequest((properties) => {
          try {
            assert.deepEqual(properties.backingObject, {fake: 'fakeDesired'});
            testCallback();
          } catch (err) {
            testCallback(err);
          }
        });
      });

      it('registers a callback that gets called when a new desired property is received', function (testCallback) {
        let transport = new FakeTransport();
        const client = new ClientCtor(transport);
        let called = false;
        client.onWritablePropertyUpdateRequest((properties) => {
          try {
            if (called) {
              assert.deepEqual(properties.backingObject, {key: 'value'});
              testCallback();
              return;
            }
            assert.deepEqual(properties.backingObject, {fake: 'fakeDesired'});
            called = true;
          } catch (err) {
            testCallback(err);
          }
        });
        setImmediate(() => {
          transport.emit('twinDesiredPropertiesUpdate', {key: 'value'});
        });
      });

      it('emits an error event if getTwin() fails', function (testCallback) {
        const client = new ClientCtor(new FakeTransport());
        client.getTwin = (callback) => {callback(new Error('This is a fake error'))};   
        client.on('error', () => {testCallback()});
        client.onWritablePropertyUpdateRequest(() => {});
      });
    });

    describe('updateClientProperties', function () {
      it('calls _updateReportedProperties with the correct payload and invokes the callback on success', async function() {
        const client = new ClientCtor(new FakeTransport());
        const twin = await client.getTwin();
        sinon.spy(twin, '_updateReportedProperties');
        await new Promise((resolve, reject) => {
          client.updateClientProperties(new ClientPropertyCollection({key: "value"}), (err) => {
            try {
              assert.isNotOk(err);
              assert(
                twin._updateReportedProperties.calledOnce,
                `Expected _updateReportedProperties() call count of 1, got call count of ${twin._updateReportedProperties.callCount}`
              );
              assert.deepEqual(twin._updateReportedProperties.args[0][0], {key: "value"});
              resolve();
            } catch (err) {
              reject(err);
            }
          });
        });
      });

      it('calls _updateReportedProperties with the correct payload and resolves the promise on success', async function() {
        const client = new ClientCtor(new FakeTransport());
        const twin = await client.getTwin();
        sinon.spy(twin, '_updateReportedProperties');
        await client.updateClientProperties(new ClientPropertyCollection({key: "value"}));
        assert(
          twin._updateReportedProperties.calledOnce,
          `Expected _updateReportedProperties() call count of 1, got call count of ${twin._updateReportedProperties.callCount}`
        );
        assert.deepEqual(twin._updateReportedProperties.args[0][0], {key: "value"});
      });

      it('Calls the callback with an error if _updateReportedProperties() fails', async function() {
        const client = new ClientCtor(new FakeTransport());
        const twin = await client.getTwin();
        twin._updateReportedProperties = (state, callback) => {callback(new Error('this is a fake error'))};
        await new Promise((resolve, reject) => {
          client.updateClientProperties(new ClientPropertyCollection({key: "value"}), (err) => {
            err ? resolve(err) : reject(new Error('Expected updateClientProperties to fail, but it succeeded'));
          });
        });
      });

      it('Rejects if _updateReportedProperties() fails', async function() {
        const client = new ClientCtor(new FakeTransport());
        const twin  = await client.getTwin();
        twin._updateReportedProperties = (state, callback) => {callback(new Error('this is a fake error'))};
        try {
          await client.updateClientProperties(new ClientPropertyCollection({key: "value"}));
        } catch(e){
          return;
        }
        assert.fail('Expected updateClientProperties to fail, but it succeeded.');
      });

      it('Calls the callback with an error if getTwin() fails', async function() {
        const client = new ClientCtor(new FakeTransport());
        client.getTwin = (callback) => {callback(new Error('This is a fake error'))};
        await new Promise((resolve, reject) => {
          client.updateClientProperties(new ClientPropertyCollection({key: "value"}), (err) => {
            err ? resolve(err) : reject(new Error('Expected updateClientProperties to fail, but it succeeded'));
          });
        });
      });

      it('Rejects if getTwin() fails', async function() {
        const client = new ClientCtor(new FakeTransport());
        client.getTwin = (callback) => {callback(new Error('This is a fake error'))};        
        try {
          await client.updateClientProperties(new ClientPropertyCollection({key: "value"}));
        } catch(e){
          return;
        }
        assert.fail('Expected updateClientProperties to fail, but it succeeded.');
      });
    });

    describe('setRetryPolicy', function () {
      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_083: [The `setRetryPolicy` method shall throw a `ReferenceError` if the policy object is falsy.]*/
      [null, undefined, ''].forEach(function (badPolicy) {
        it('throws a ReferenceError if policy is \'' + badPolicy + '\'', function () {
          var client = new ClientCtor(new EventEmitter());
          assert.throws(function () {
            client.setRetryPolicy(badPolicy);
          }, ReferenceError);
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_084: [The `setRetryPolicy` method shall throw an `ArgumentError` if the policy object doesn't have a `shouldRetry` method.]*/
      it('throws an ArgumentError if the policy does not have a shouldRetry method', function () {
        var client = new ClientCtor(new EventEmitter());
        var badPolicy = {
          nextRetryTimeout: function () { }
        };
        assert.throws(function () {
          client.setRetryPolicy(badPolicy);
        }, errors.ArgumentError);
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_085: [The `setRetryPolicy` method shall throw an `ArgumentError` if the policy object doesn't have a `nextRetryTimeout` method.]*/
      it('throws an ArgumentError if the policy does not have a nextRetryTimeout method', function () {
        var client = new ClientCtor(new EventEmitter());
        var badPolicy = {
          shouldRetry: function () { }
        };
        assert.throws(function () {
          client.setRetryPolicy(badPolicy);
        }, errors.ArgumentError);
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_086: [Any operation happening after a `setRetryPolicy` call should use the policy set during that call.]*/
      it('uses the new retry policy for the next operation', function (testCallback) {
        var testPolicy = {
          shouldRetry: sinon.stub().returns(false),
          nextRetryTimeout: sinon.stub().returns(-1)
        };
        var fakeTransport = new EventEmitter();
        fakeTransport.sendEvent = sinon.stub().callsArgWith(1, new results.MessageEnqueued());

        var client = new ClientCtor(fakeTransport);
        client.setRetryPolicy(testPolicy);
        client.sendEvent(new Message('foo'), function () {
          assert.isTrue(testPolicy.shouldRetry.calledOnce);
          assert.isTrue(testPolicy.nextRetryTimeout.notCalled); //shouldRetry being false...
          assert.isTrue(fakeTransport.sendEvent.calledOnce);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_096: [The `setRetryPolicy` method shall call the `setRetryPolicy` method on the twin if it is set and pass it the `policy` object.]*/
      it('updates the twin retry policy', function (testCallback) {
        var newPolicy = {
          shouldRetry: function () { },
          nextRetryTimeout: function () { }
        };

        var fakeTransport = new EventEmitter();
        fakeTransport.getTwin = sinon.stub().callsArgWith(0, null, new Twin(fakeTransport, {}, 0));

        var client = new ClientCtor(fakeTransport);
        client.getTwin(function (err, twin) {
          sinon.spy(twin, 'setRetryPolicy');
          client.setRetryPolicy(newPolicy);
          assert.isTrue(twin.setRetryPolicy.calledOnce);
          assert.isTrue(twin.setRetryPolicy.calledWith(newPolicy));
          testCallback();
        });
      });
    });

    describe('transport.on(\'disconnect\') handler', function () {
      var fakeTransport, fakeRetryPolicy;
      beforeEach(function () {
        fakeRetryPolicy = {
          shouldRetry: function () { return true; },
          nextRetryTimeout: function () { return 1; }
        };

        fakeTransport = new EventEmitter();
        fakeTransport.enableC2D = sinon.stub().callsArg(0);
        fakeTransport.enableTwinDesiredPropertiesUpdates = sinon.stub().callsArg(0);
        fakeTransport.getTwin = sinon.stub().callsArgWith(0, null, new Twin(fakeTransport, fakeRetryPolicy));
      });

      /*Tests_SRS_NODE_DEVICE_CLIENT_16_098: [If the transport emits a `disconnect` event while the client is subscribed to desired properties updates the retry policy shall be used to reconnect and re-enable the feature using the transport `enableMethods` method.]*/
      it('reenables device methods after being disconnected if Twin desired properties updates were enabled', function () {
        var client = new ClientCtor(fakeTransport);
        client.setRetryPolicy(fakeRetryPolicy);
        client.getTwin(function (err, twin) {
          twin.on('properties.desired', function () { });
          assert.isTrue(fakeTransport.enableTwinDesiredPropertiesUpdates.calledOnce);
          fakeTransport.emit('disconnect', new errors.TimeoutError()); // timeouts can be retried
          assert.isTrue(fakeTransport.enableTwinDesiredPropertiesUpdates.calledTwice);
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_101: [If the retry policy fails to reestablish the twin desired properties updates functionality a `disconnect` event shall be emitted with a `results.Disconnected` object.]*/
      it('emits a disconnect event if reenabling twin desired properties updates fails', function (testCallback) {
        var fakeError = new Error('fake');
        var client = new ClientCtor(fakeTransport);
        client.on('disconnect', function (err) {
          assert.instanceOf(err, results.Disconnected);
          assert.strictEqual(err.transportObj, fakeError);
          testCallback();
        });

        client.setRetryPolicy(fakeRetryPolicy);
        client.getTwin(function (err, twin) {
          twin.on('properties.desired', function () { });
          client._twin._maxOperationTimeout = 1;
          assert.isTrue(fakeTransport.enableTwinDesiredPropertiesUpdates.calledOnce);
          fakeTransport.enableTwinDesiredPropertiesUpdates = sinon.stub().callsArgWith(0, fakeError);
          fakeTransport.emit('disconnect', new errors.TimeoutError()); // timeouts can be retried
        });
      });
    });

    describe('sendTelemetry', function () {
      [42, {}, true].forEach(function (val) {
        it(`throws if the second parameter is neither a function nor a string (${typeof val})`, function () {
          var client = new ClientCtor(new EventEmitter());
          assert.throws(function () {
            client.sendTelemetry({temperature: '42'}, val);
          }, TypeError, 'The second parameter to sendTelemetry must be a function (sendTelemetryCallback) or string (componentName)');
        });
      });

      [42, {}, true, 'string'].forEach(function (val) {
        it(`throws if the third parameter is not a function (${typeof val})`, function () {
          var client = new ClientCtor(new EventEmitter());
          assert.throws(function () {
            client.sendTelemetry({temperature: '42'}, "thermostat1", val);
          }, TypeError, 'Callback has to be a Function');
        });
      });

      it('correctly populates a Message, calls sendEvent, and returns a Promise if no component or callback is specified', function (testCallback) {
        var payload = {temperature: 42};
        var client = new ClientCtor(new EventEmitter());
        client.sendEvent = (message, callback) => {
          try {
            assert.strictEqual(message.contentEncoding, 'utf-8');
            assert.strictEqual(message.contentType, 'application/json');
            assert.strictEqual(message.data, JSON.stringify(payload));
            assert.isUndefined(message.properties.getValue('$.sub'));
            assert.isUndefined(callback);
          } catch (err) {
            return Promise.reject(err);
          }
          return Promise.resolve(new results.MessageEnqueued());
        }
        client.sendTelemetry(payload).then(
          function () {
            testCallback();
          }).catch(testCallback);
      });

      it('correctly populates a Message, calls sendEvent if a component, and returns a Promise is specified but no callback is specified', function (testCallback) {
        var payload = {temperature: 42};
        var component = 'thermostat1'
        var client = new ClientCtor(new EventEmitter());
        client.sendEvent = (message, callback) => {
          try {
            assert.strictEqual(message.contentEncoding, 'utf-8');
            assert.strictEqual(message.contentType, 'application/json');
            assert.strictEqual(message.data, JSON.stringify(payload));
            assert.strictEqual(message.properties.getValue('$.sub'), component);
            assert.isUndefined(callback);
          } catch (err) {
            return Promise.reject(err);
          }
          return Promise.resolve(new results.MessageEnqueued());
        }
        client.sendTelemetry(payload, 'thermostat1').then(
          function () {
            testCallback();
          }).catch(testCallback);
      });

      it('correctly populates a Message, calls sendEvent, and calls the callback if no component is specified but a callback is specified', function (testCallback) {
        var payload = {temperature: 42};
        var telemetryCallback = (err) => {
          testCallback(err);
        };
        var client = new ClientCtor(new EventEmitter());
        client.sendEvent = (message, callback) => {
          try {
            assert.strictEqual(message.contentEncoding, 'utf-8');
            assert.strictEqual(message.contentType, 'application/json');
            assert.strictEqual(message.data, JSON.stringify(payload));
            assert.isUndefined(message.properties.getValue('$.sub'));
            assert.strictEqual(callback, telemetryCallback);
          } catch (err) {
            return process.nextTick(() => {callback(err)});
          }
          process.nextTick(() => {callback(undefined, new results.MessageEnqueued())});
        }
        client.sendTelemetry(payload, telemetryCallback);
      });

      it('correctly populates a Message, calls sendEvent, and calls the callback if a component and callback is specified', function (testCallback) {
        var payload = {temperature: 42};
        var component = 'thermostat1'
        var telemetryCallback = (err) => {
          testCallback(err);
        };
        var client = new ClientCtor(new EventEmitter());
        client.sendEvent = (message, callback) => {
          try {
            assert.strictEqual(message.contentEncoding, 'utf-8');
            assert.strictEqual(message.contentType, 'application/json');
            assert.strictEqual(message.data, JSON.stringify(payload));
            assert.strictEqual(message.properties.getValue('$.sub'), component);
            assert.strictEqual(callback, telemetryCallback);
          } catch (err) {
            return process.nextTick(() => {callback(err)});
          }
          process.nextTick(() => {callback(undefined, new results.MessageEnqueued())});
        }
        client.sendTelemetry(payload, component, telemetryCallback);
      });
    });

    describe('onCommand', function () {
      [42, {}, true, () => {}].forEach(function (val) {
        it(`throws if the first argument is not a string (${typeof val})`, function () {
          var client = new ClientCtor(new EventEmitter());
          assert.throws(function () {
            client.onCommand(val, () => {});
          }, TypeError, 'First argument must be a string');
          assert.throws(function () {
            client.onCommand(val, "fakeCommand", () => {});
          }, TypeError, 'First argument must be a string');
        });
      });

      [42, {}, true].forEach(function (val) {
        it(`throws if second argument is neither a function nor a string (${typeof val})`, function () {
          var client = new ClientCtor(new EventEmitter());
          assert.throws(function () {
            client.onCommand("fakeCommand", val);
          }, TypeError, 'Second argument must be a string (commandName) or function (callback)');
          assert.throws(function () {
            client.onCommand("fakeComponent", val, () => {});
          }, TypeError, 'Second argument must be a string (commandName) or function (callback)');
        });
      });

      [42, {}, true, "string"].forEach(function (val) {
        it(`throws if the third argument is not a function (${typeof val})`, function () {
          var client = new ClientCtor(new EventEmitter());
          assert.throws(function () {
            client.onCommand("fakeComponent", "fakeCommand", val);
          }, TypeError, 'callback must be a function');
        });
      });

      it('calls _onDeviceMethod with the correct method name if there is no component', function () {
        var client = new ClientCtor(new EventEmitter());
        client._onDeviceMethod = (methodName) => {
          assert.strictEqual(methodName, "fakeCommand");
        };
        client.onCommand("fakeCommand", () => {});
      });

      it('calls _onDeviceMethod with the correct method name if there is a component', function () {
        var client = new ClientCtor(new EventEmitter());
        client._onDeviceMethod = (methodName) => {
          assert.strictEqual(methodName, "fakeComponent*fakeCommand");
        };
        client.onCommand("fakeComponent", "fakeCommand", () => {});
      });

      it('registers a callback that gets called with the correct request info when the specified command is invoked (no component)', function (testCallback) {
        var transport = new FakeTransport();
        transport.onDeviceMethod = (function (methodName, callback) {
          this.on(methodName, () => {
            callback({
              methods: {
                methodName: methodName
              },
              requestId: "fakeId",
              properties: {},
              body: Buffer.from('{"fake": "body"}')
            });
          });
        }).bind(transport);
        var client = new ClientCtor(transport);
        client.onCommand("fakeCommand", (request, _response) => {
          try {
            assert.strictEqual(request.requestId, "fakeId");
            assert.strictEqual(request.commandName, "fakeCommand"),
            assert.isUndefined(request.componentName);
            assert.deepEqual(request.payload, JSON.parse('{"fake": "body"}'));
          } catch (err) {
            testCallback(err);
            return;
          }
          testCallback();
        });
        transport.emit("fakeCommand");
      });

      it('registers a callback that gets called with the correct request info when the specified command is invoked (with component)', function (testCallback) {
        var transport = new FakeTransport();
        transport.onDeviceMethod = (function (methodName, callback) {
          this.on(methodName, () => {
            callback({
              methods: {
                methodName: methodName
              },
              requestId: "fakeId",
              properties: {},
              body: Buffer.from('{"fake": "body"}')
            });
          });
        }).bind(transport);
        var client = new ClientCtor(transport);
        client.onCommand("fakeComponent", "fakeCommand", (request, _response) => {
          try {
            assert.strictEqual(request.requestId, "fakeId");
            assert.strictEqual(request.commandName, "fakeCommand"),
            assert.strictEqual(request.componentName, "fakeComponent");
            assert.deepEqual(request.payload, JSON.parse('{"fake": "body"}'));
          } catch (err) {
            testCallback(err);
            return;
          }
          testCallback();
        });
        transport.emit("fakeComponent*fakeCommand");
      });

      it('registers a callback that can correctly send a response when the specified command is invoked (promisified, with component, with payload)', function (testCallback) {
        var transport = new FakeTransport();
        transport.onDeviceMethod = (function (methodName, callback) {
          this.on(methodName, () => {
            callback({
              methods: {
                methodName: methodName
              },
              requestId: "fakeId",
              properties: {},
              body: Buffer.from('{"fake": "body"}')
            });
          });
        }).bind(transport);
        transport.sendMethodResponse = function (response, callback) {
          try {
            assert.strictEqual(response.requestId, "fakeId");
            assert.isTrue(response.isResponseComplete);
            assert.strictEqual(response.status, 200);
            assert.deepEqual(response.payload, {fake: "payload"})
          } catch (err) {
            callback(err);
            return;
          }
          callback();
        }
        var client = new ClientCtor(transport);
        client.onCommand("fakeComponent", "fakeCommand", (_request, response) => {
          response.send(200, {fake: "payload"}).then(testCallback).catch(testCallback);
        });
        transport.emit("fakeComponent*fakeCommand");
      });

      it('registers a callback that can correctly send a response when the specified command is invoked (callback, no component, no payload)', function (testCallback) {
        var transport = new FakeTransport();
        transport.onDeviceMethod = (function (methodName, callback) {
          this.on(methodName, () => {
            callback({
              methods: {
                methodName: methodName
              },
              requestId: "fakeId",
              properties: {},
              body: Buffer.from('{"fake": "body"}')
            });
          });
        }).bind(transport);
        transport.sendMethodResponse = function (response, callback) {
          try {
            assert.strictEqual(response.requestId, "fakeId");
            assert.isTrue(response.isResponseComplete);
            assert.strictEqual(response.status, 200);
            assert.isNotOk(response.payload)
          } catch (err) {
            callback(err);
            return;
          }
          callback();
        }
        var client = new ClientCtor(transport);
        client.onCommand("fakeCommand", (_request, response) => {
          response.send(200, (err) => {
            testCallback(err);
          });
        });
        transport.emit("fakeCommand");
      });
    });
  });
});

describe('Over simulated HTTPS', function () {
  var registry = {
    create: function (deviceId, done) {
      done(null, {
        deviceId: deviceId,
        authentication: {
          symmetricKey: {
            primaryKey: uuid.v4()
          }
        }
      });
    },
    delete: function (deviceId, done) { done(); }
  };

  clientTests.sendEventTests(DeviceClient, SimulatedHttp, registry);
  clientTests.sendEventBatchTests(DeviceClient, SimulatedHttp, registry);

  // disabling the tests on the ModuleClient with SimulatedHttp for now because:
  // - modules don't support HTTP
  // - modules don't support x509
  // we should refactor this whole test suite to be more configurable for each client
  // or get rid of it since it sortof duplicates the e2e tests at this point

  // clientTests.sendEventTests(ModuleClient, SimulatedHttp, registry);
  // clientTests.sendEventBatchTests(ModuleClient, SimulatedHttp, registry);
  // clientTests.sendOutputEventTests(ModuleClient, SimulatedHttp, registry);
  // clientTests.sendOutputEventBatchTests(ModuleClient, SimulatedHttp, registry);
});
