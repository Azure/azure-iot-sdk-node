// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var SimulatedHttp = require('./http_simulated.js');
var FakeTransport = require('./fake_transport.js');
var clientTests = require('./_client_common_testrun.js');
var results = require('azure-iot-common').results;
var errors = require('azure-iot-common').errors;
var Message = require('azure-iot-common').Message;
var NoRetry = require('azure-iot-common').NoRetry;
var SharedAccessKeyAuthenticationProvider = require('../lib/sak_authentication_provider').SharedAccessKeyAuthenticationProvider;
var SharedAccessSignatureAuthenticationProvider = require('../lib/sas_authentication_provider').SharedAccessSignatureAuthenticationProvider;
var Twin = require('../lib/twin').Twin;
var DeviceClient = require('../lib/device_client').Client;
var ModuleClient = require('../lib/module_client').ModuleClient;

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
        return ClientCtor.fromAuthenticationProvider(fakeAuthProvider, fakeTransportCtor);
        assert.isTrue(fakeTransportCtor.calledWith(fakeAuthProvider));
      });
    });

    describe('#setTransportOptions', function () {
      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_021: [The ‘setTransportOptions’ method shall call the ‘setOptions’ method on the transport object.]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_022: [The ‘done’ callback shall be invoked with a null error object and a ‘TransportConfigured’ object nce the transport has been configured.]*/
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

        var client = new ClientCtor(dummyTransport, null, new DummyBlobUploadClient());
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

        var client = new ClientCtor(dummyTransport, null, new DummyBlobUploadClient());
        client.updateSharedAccessSignature('sas', function (err) {
          assert.isOk(err);
          done();
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_036: [The updateSharedAccessSignature method shall call the `done` callback with a null error object and a result of type SharedAccessSignatureUpdated if the token was updated successfully.]*/
      it('Calls the `done` callback with a null error object and a SharedAccessSignatureUpdated result', function (done) {
        var client = new ClientCtor(new FakeTransport(), null, new DummyBlobUploadClient());
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
  });
});

describe('Over simulated HTTPS', function () {
  var registry = {
    create: function (deviceId, done) {
      done(null, {
        deviceId: deviceId,
        authentication: {
          symmetricKey: {
            primaryKey: 'key=='
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
