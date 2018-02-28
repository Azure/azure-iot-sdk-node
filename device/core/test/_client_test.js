// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var stream = require('stream');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Client = require('../lib/client.js').Client;
var SimulatedHttp = require('./http_simulated.js');
var FakeTransport = require('./fake_transport.js');
var clientTests = require('./_client_common_testrun.js');
var results = require('azure-iot-common').results;
var errors = require('azure-iot-common').errors;
var Message = require('azure-iot-common').Message;
var NoRetry = require('azure-iot-common').NoRetry;
var SharedAccessKeyAuthenticationProvider = require('../lib/sak_authentication_provider').SharedAccessKeyAuthenticationProvider;
var SharedAccessSignatureAuthenticationProvider = require('../lib/sas_authentication_provider').SharedAccessSignatureAuthenticationProvider;
var X509AuthenticationProvider = require('../lib/x509_authentication_provider').X509AuthenticationProvider;

describe('Client', function () {
  var sharedKeyConnectionString = 'HostName=host;DeviceId=id;SharedAccessKey=key';
  describe('#constructor', function () {
    /*Tests_SRS_NODE_DEVICE_CLIENT_05_001: [The Client constructor shall throw ReferenceError if the transport argument is falsy.]*/
    it('throws if transport arg is falsy', function () {
      [null, undefined, '', 0].forEach(function (transport) {
        assert.throws(function () {
          return new Client(transport);
        }, ReferenceError, 'transport is \'' + transport + '\'');
      });
    });

    it('throws if a connection string is passed', function () {
      assert.throws(function () {
        return new Client(EventEmitter, 'fakeconnectionstring');
      }, errors.InvalidOperationError);
    })
  });

  describe('#fromConnectionString', function () {

    /*Tests_SRS_NODE_DEVICE_CLIENT_05_003: [The fromConnectionString method shall throw ReferenceError if the connStr argument is falsy.]*/
    it('throws if connStr arg is falsy', function () {
      [null, undefined, '', 0].forEach(function (value) {
        assert.throws(function () {
          return Client.fromConnectionString(value);
        }, ReferenceError, 'connStr is \'' + value + '\'');
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_05_006: [The fromConnectionString method shall return a new instance of the Client object, as by a call to new Client(new Transport(...)).]*/
    it('returns an instance of Client', function () {
      var client = Client.fromConnectionString(sharedKeyConnectionString, FakeTransport);
      assert.instanceOf(client, Client);
    });

    it('doesn\'t try to renew the SAS token when using x509', function (testCallback) {
      this.clock = sinon.useFakeTimers();
      var clock = this.clock;

      var x509ConnectionString = 'HostName=host;DeviceId=id;x509=true';
      var client = new Client.fromConnectionString(x509ConnectionString, FakeTransport);
      assert.instanceOf(client, Client);

      sinon.stub(client._transport, 'updateSharedAccessSignature').callsFake(function () {
        clock.restore();
        testCallback(new Error('updateSharedAccessSignature should not have been called'));
      });

      this.clock.tick(3600000); // 1 hour: this should trigger the call to renew the SAS token.
      clock.restore();
      testCallback();
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_087: [The `fromConnectionString` method shall create a new `SharedAccessKeyAuthorizationProvider` object with the connection string passed as argument if it contains a SharedAccessKey parameter and pass this object to the transport constructor. ]*/
    it('creates a SharedAccessKeyAuthorizationProvider and passes it to the transport', function (testCallback) {
      var client = Client.fromConnectionString(sharedKeyConnectionString, function (authProvider) {
        assert.instanceOf(authProvider, SharedAccessKeyAuthenticationProvider);
        testCallback();
      })
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_093: [The `fromConnectionString` method shall create a new `X509AuthorizationProvider` object with the connection string passed as argument if it contains an X509 parameter and pass this object to the transport constructor.]*/
    it('creates a X509AuthenticationProvider and passes it to the transport', function (testCallback) {
      var x509ConnectionString = 'HostName=host;DeviceId=id;x509=true';
      var client = Client.fromConnectionString(x509ConnectionString, function (authProvider) {
        assert.instanceOf(authProvider, X509AuthenticationProvider);
        testCallback();
      })
    });
  });

  describe('#fromSharedAccessSignature', function () {
    var sharedAccessSignature = '"SharedAccessSignature sr=hubName.azure-devices.net/devices/deviceId&sig=s1gn4tur3&se=1454204843"';
    /*Tests_SRS_NODE_DEVICE_CLIENT_16_029: [The fromSharedAccessSignature method shall throw a ReferenceError if the sharedAccessSignature argument is falsy.] */
    it('throws if sharedAccessSignature arg is falsy', function () {
      [null, undefined, '', 0].forEach(function (value) {
        assert.throws(function () {
          return Client.fromSharedAccessSignature(value);
        }, ReferenceError, 'sharedAccessSignature is \'' + value + '\'');
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_030: [The fromSharedAccessSignature method shall return a new instance of the Client object] */
    it('returns an instance of Client', function () {
      var client = Client.fromSharedAccessSignature(sharedAccessSignature, FakeTransport);
      assert.instanceOf(client, Client);
    });

    it('creates a SharedAccessSignatureAuthorizationProvider and passes it to the transport', function (testCallback) {
      var client = Client.fromSharedAccessSignature(sharedAccessSignature, function (authProvider) {
        assert.instanceOf(authProvider, SharedAccessSignatureAuthenticationProvider);
        testCallback();
      });
    });
  });

  describe('#fromAuthenticationProvider', function () {
    /*Tests_SRS_NODE_DEVICE_CLIENT_16_089: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `authenticationProvider` argument is falsy.]*/
    [null, undefined].forEach(function (badAuthProvider) {
      it('throws if the authenticationProvider is falsy', function () {
        assert.throws(function () {
          return Client.fromAuthenticationProvider(badAuthProvider, function () {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_092: [The `fromAuthenticationProvider` method shall throw a `ReferenceError` if the `transportCtor` argument is falsy.]*/
    [null, undefined].forEach(function (badTransportCtor) {
      it('throws if the transportCtor is falsy', function () {
        assert.throws(function () {
          return Client.fromAuthenticationProvider({}, badTransportCtor);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_090: [The `fromAuthenticationProvider` method shall pass the `authenticationProvider` object passed as argument to the transport constructor.]*/
    it('passes the authenticationProvider to the transport', function () {
      var fakeAuthProvider = {};
      var fakeTransportCtor = sinon.stub().returns(new EventEmitter());
      return Client.fromAuthenticationProvider(fakeAuthProvider, fakeTransportCtor);
      assert.isTrue(fakeTransportCtor.calledWith(fakeAuthProvider));
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_091: [The `fromAuthenticationProvider` method shall return a `Client` object configured with a new instance of a transport created using the `transportCtor` argument.]*/
    it('returns an instance of Client', function () {
      var client = Client.fromAuthenticationProvider({}, FakeTransport);
      assert.instanceOf(client, Client);
    })
  });

  describe('#setTransportOptions', function () {
    /*Tests_SRS_NODE_DEVICE_CLIENT_16_021: [The ‘setTransportOptions’ method shall call the ‘setOptions’ method on the transport object.]*/
    /*Tests_SRS_NODE_DEVICE_CLIENT_16_022: [The ‘done’ callback shall be invoked with a null error object and a ‘TransportConfigured’ object nce the transport has been configured.]*/
    it('calls the setOptions method on the transport object and gives it the options parameter', function (done) {
      var testOptions = { foo: 42 };
      var dummyTransport = new FakeTransport();
      sinon.stub(dummyTransport, 'setOptions').callsFake(function (options, callback) {
        assert.equal(options.http.receivePolicy, testOptions);
        callback(null, new results.TransportConfigured());
      });

      var client = new Client(dummyTransport);
      client.setTransportOptions(testOptions, function (err, result) {
        if (err) {
          done(err);
        } else {
          assert.equal(result.constructor.name, 'TransportConfigured');
          done();
        }
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_023: [The ‘done’ callback shall be invoked with a standard javascript Error object and no result object if the transport could not be configued as requested.]*/
    it('calls the \'done\' callback with an error object if setOptions failed', function (done) {
      var dummyTransport = new FakeTransport();
      sinon.stub(dummyTransport, 'setOptions').callsFake(function (options, callback) {
        var err = new Error('fail');
        callback(err);
      });

      var client = new Client(dummyTransport);
      client.setTransportOptions({ foo: 42 }, function (err) {
        assert.isNotNull(err);
        done();
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_024: [The ‘setTransportOptions’ method shall throw a ‘ReferenceError’ if the options object is falsy] */
    [null, undefined, '', 0].forEach(function (option) {
      it('throws a ReferenceError if options is ' + option, function () {
        var client = new Client(new FakeTransport());
        assert.throws(function () {
          client.setTransportOptions(option, function () { });
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_025: [The ‘setTransportOptions’ method shall throw a ‘NotImplementedError’ if the transport doesn’t implement a ‘setOption’ method.]*/
    it('throws a NotImplementedError if the setOptions method is not implemented on the transport', function () {
      var client = new Client(new EventEmitter());

      assert.throws(function () {
        client.setTransportOptions({ foo: 42 }, function () { });
      }, errors.NotImplementedError);
    });
  });

  describe('#setOptions', function() {
    /*Tests_SRS_NODE_DEVICE_CLIENT_16_042: [The `setOptions` method shall throw a `ReferenceError` if the options object is falsy.]*/
    [null, undefined].forEach(function(options) {
      it('throws is options is ' + options, function() {
        var client = new Client(new EventEmitter());
        assert.throws(function () {
          client.setOptions(options, function () { });
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_043: [The `done` callback shall be invoked no parameters when it has successfully finished setting the client and/or transport options.]*/
    it('calls the done callback with no parameters when it has successfully configured the transport', function(done) {
      var client = new Client(new FakeTransport());
      client.setOptions({}, done);
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_044: [The `done` callback shall be invoked with a standard javascript `Error` object and no result object if the client could not be configured as requested.]*/
    it('calls the done callback with an error when it failed to configured the transport', function(done) {
      var failingTransport = new FakeTransport();
      sinon.stub(failingTransport, 'setOptions').callsFake(function (options, done) {
        done(new Error('dummy error'));
      });

      var client = new Client(failingTransport);
      client.setOptions({}, function(err) {
        assert.instanceOf(err, Error);
        done();
      });
    });
  });

  describe('#uploadToBlob', function() {
    /*Tests_SRS_NODE_DEVICE_CLIENT_16_037: [The `uploadToBlob` method shall throw a `ReferenceError` if `blobName` is falsy.]*/
    [undefined, null, ''].forEach(function (blobName) {
      it('throws a ReferenceError if \'blobName\' is ' + blobName + '\'', function() {
        var client = new Client(new EventEmitter(), null, {});
        assert.throws(function() {
          client.uploadToBlob(blobName, new stream.Readable(), 42, function() {});
        });
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_038: [The `uploadToBlob` method shall throw a `ReferenceError` if `stream` is falsy.]*/
    [undefined, null, ''].forEach(function (stream) {
      it('throws a ReferenceError if \'stream\' is ' + stream + '\'', function() {
        var client = new Client(new EventEmitter(), null, {});
        assert.throws(function() {
          client.uploadToBlob('blobName', stream, 42, function() {});
        });
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_039: [The `uploadToBlob` method shall throw a `ReferenceError` if `streamLength` is falsy.]*/
    [undefined, null, '', 0].forEach(function (streamLength) {
      it('throws a ReferenceError if \'streamLength\' is ' + streamLength + '\'', function() {
        var client = new Client(new EventEmitter(), null, {});
        assert.throws(function() {
          client.uploadToBlob('blobName', new stream.Readable(), streamLength, function() {});
        });
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_040: [The `uploadToBlob` method shall call the `done` callback with an `Error` object if the upload fails.]*/
    it('calls the done callback with an Error object if the upload fails', function(done) {
      var DummyBlobUploader = function () {
        this.uploadToBlob = function(blobName, stream, streamLength, callback) {
          callback(new Error('fake error'));
        };
      };

      var client = new Client(new EventEmitter(), null, new DummyBlobUploader());
      client.uploadToBlob('blobName', new stream.Readable(), 42, function(err) {
        assert.instanceOf(err, Error);
        done();
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_041: [The `uploadToBlob` method shall call the `done` callback no parameters if the upload succeeds.]*/
    it('calls the done callback with no parameters if the upload succeeded', function (done) {
      var DummyBlobUploader = function () {
        this.uploadToBlob = function(blobName, stream, streamLength, callback) {
          callback();
        };
      };

      var client = new Client(new EventEmitter(), null, new DummyBlobUploader());
      client.uploadToBlob('blobName', new stream.Readable(), 42, done);
    });
  });

  describe('#open', function () {
    /* Tests_SRS_NODE_DEVICE_CLIENT_12_001: [The open function shall call the transport’s connect function, if it exists.] */
    it('calls connect on the transport if the method exists', function (done) {
      var client = new Client(new FakeTransport());
      client.open(function (err, result) {
        if (err) {
          done(err);
        } else {
          assert.equal(result.constructor.name, 'Connected');
          done();
        }
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_045: [If the transport successfully establishes a connection the `open` method shall subscribe to the `disconnect` event of the transport.]*/
    it('subscribes to the \'disconnect\' event once connected', function(done) {
      var transport = new FakeTransport();
      var client = new Client(transport);
      client.open(function() {
        client.on('disconnect', function() {
          done();
        });

        transport.emit('disconnect');
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_064: [The `open` method shall call the `openCallback` immediately with a null error object and a `results.Connected()` object if called while renewing the shared access signature.]*/
    it('calls the callback without trying connect while updating the shared access signature', function(testCallback) {
      var transport = new FakeTransport();
      sinon.spy(transport, 'connect');
      sinon.stub(transport, 'updateSharedAccessSignature').callsFake(function(sas, callback) {
        this._updateSasCallback = callback; // will store the callback but not call it, blocking the state machine in the 'updating_sas' state.
      });

      var unblockUpdateSas = function() {
        transport._updateSasCallback(null, new results.SharedAccessSignatureUpdated()); // unblock the state machine and calls the stored callback.
      };

      var client = new Client(transport);
      client.blobUploadClient = { updateSharedAccessSignature: function() {} };

      client.open(function(err) {
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

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_061: [The `open` method shall not throw if the `openCallback` callback has not been provided.]*/
    it('doesn\'t throw if the callback hasn\'t been passed as argument', function() {
      var transport = new FakeTransport();
      var client = new Client(transport);
      assert.doesNotThrow(function() {
        client.open();
      });
    });
  });

  describe('#close', function () {
    /*Tests_SRS_NODE_DEVICE_CLIENT_16_001: [The close function shall call the transport’s disconnect function if it exists.] */
    it('calls disconnect on the transport if the method exists', function (done) {
      var transport = new FakeTransport();
      sinon.stub(transport, 'disconnect').callsFake(function() {
        done();
      });
      var client = new Client(transport);
      client.open(function() {
        client.close();
      });
    });

    it('calls the callback immediately if the client is already disconnected', function(testCallback) {
      var transport = new FakeTransport();
      sinon.stub(transport, 'disconnect').callsFake(function() {
        assert.fail();
      });
      var client = new Client(transport);
      client.close(testCallback());
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_046: [** The `disconnect` method shall remove the listener that has been attached to the transport `disconnect` event.]*/
    it('unsubscribes for the \'disconnect\' event when disconnecting', function(done) {
      var transport = new FakeTransport();
      var client = new Client(transport);
      var disconnectReceived = false;
      client.open(function() {
        client.on('disconnect', function() {
          disconnectReceived = true;
        });
        client.close(function() {
          transport.emit('disconnect');
          assert.isFalse(disconnectReceived);
          done();
        });
      });
    });

    /*Test_SRS_NODE_DEVICE_CLIENT_16_001: [The `close` function shall call the transport's `disconnect` function if it exists.]*/
    it('disconnects the transport if called while updating the shared access signature', function(testCallback){
      var transport = new FakeTransport();
      sinon.stub(transport, 'updateSharedAccessSignature').callsFake(function() {
        // will not call the callback, leaving the state machine in the 'updating_sas' state.
      });
      sinon.spy(transport, 'disconnect');

      var client = new Client(transport);
      client.blobUploadClient = { updateSharedAccessSignature: function() {} };
      client.open(function() {
        client.updateSharedAccessSignature('newSas');
        client.close(function() {
          assert.isTrue(transport.disconnect.called);
          testCallback();
        });
      });
    });

    /*Test_SRS_NODE_DEVICE_CLIENT_16_001: [The `close` function shall call the transport's `disconnect` function if it exists.]*/
    it('closes the transport when called while connecting', function(testCallback) {
      var transport = new FakeTransport();
      sinon.stub(transport, 'connect').callsFake(function() {
        // will not call the callback, leaving the state machine in the 'CONNECTING' state
      });

      var client = new Client(transport);
      client.open();
      client.close(testCallback);
    });
  });

  ['sendEvent', 'sendEventBatch', 'complete', 'reject', 'abandon', 'sendOutputEvent', 'sendOutputEventBatch'].forEach(function(funcName) {
    describe('#' + funcName, function() {
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_051: [The `sendEventBatch` method shall not throw if the `sendEventBatchCallback` is not passed.]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_047: [The `sendEvent` method shall not throw if the `sendEventCallback` is not passed.]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_067: [The `complete` method shall not throw if the `completeCallback` is not passed.]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_071: [The `reject` method shall not throw if the `rejectCallback` is not passed.]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_075: [The `abandon` method shall not throw if the `abandonCallback` is not passed.]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_18_019: [The `sendOutputEvent` method shall not throw if the `callback` is not passed. ]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_18_022: [The `sendOutputEventBatch` method shall not throw if the `callback` is not passed. ]*/
      it('doesn\'t throw if no callback is given and the method exists on the transport', function() {
        var transport = new FakeTransport();
        var client = new Client(transport);
        client.open(function() {
          assert.doesNotThrow(function() {
            client[funcName]('message');
          });
        });
      });
    });
  });

  describe('#onDeviceMethod', function() {
    var FakeMethodTransport = function(config) {
      EventEmitter.call(this);
      this.config = config;

      this.connect = function (callback) {
        callback(null, new results.Connected());
      }

      this.disconnect = function (callback) {
        callback(null, new results.Disconnected());
      }

      // causes a mock method event to be raised
      this.emitMethodCall = function(methodName) {
        this.emit('method_' + methodName, {
          methods: { methodName: methodName },
          body: JSON.stringify(''),
          requestId: '42'
        });
      };

      this.onDeviceMethod = function(methodName, callback) {
        this.on('method_' + methodName, callback);
      };

      this.sendMethodResponse = function(response, done) {
        response = response;
        if(!!done && typeof(done) === 'function') {
          done(null);
        }
      };

      this.enableMethods = function (callback) {
        callback();
      };

      this.disableMethods = function (callback) {
        callback();
      };
    };
    util.inherits(FakeMethodTransport, EventEmitter);

    // Tests_SRS_NODE_DEVICE_CLIENT_13_020: [ onDeviceMethod shall throw a ReferenceError if methodName is falsy. ]
    [undefined, null].forEach(function (methodName) {
      it('throws ReferenceError when methodName is "' + methodName + '"', function() {
        var transport = new FakeMethodTransport();
        var client = new Client(transport);
        assert.throws(function() {
          client.onDeviceMethod(methodName, function() {});
        }, ReferenceError);
      });
    });

    // Tests_SRS_NODE_DEVICE_CLIENT_13_024: [ onDeviceMethod shall throw a TypeError if methodName is not a string. ]
    [new Date(), 42].forEach(function (methodName) {
      it('throws TypeError when methodName is "' + methodName + '"', function() {
        var transport = new FakeMethodTransport();
        var client = new Client(transport);
        assert.throws(function() {
          client.onDeviceMethod(methodName, function() {});
        }, TypeError);
      });
    });

    // Tests_SRS_NODE_DEVICE_CLIENT_13_022: [ onDeviceMethod shall throw a ReferenceError if callback is falsy. ]
    [undefined, null].forEach(function (callback) {
      it('throws ReferenceError when callback is "' + callback + '"', function() {
        var transport = new FakeMethodTransport();
        var client = new Client(transport);
        assert.throws(function() {
          client.onDeviceMethod('doSomeTests', callback);
        }, ReferenceError);
      });
    });

    // Tests_SRS_NODE_DEVICE_CLIENT_13_025: [ onDeviceMethod shall throw a TypeError if callback is not a Function. ]
    ['not_a_function', 42].forEach(function (callback) {
      it('throws ReferenceError when callback is "' + callback + '"', function() {
        var transport = new FakeMethodTransport();
        var client = new Client(transport);
        assert.throws(function() {
          client.onDeviceMethod('doSomeTests', callback);
        }, TypeError);
      });
    });

    // Tests_SRS_NODE_DEVICE_CLIENT_13_001: [ The onDeviceMethod method shall cause the callback function to be invoked when a cloud-to-device method invocation signal is received from the IoT Hub service. ]
    it('calls callback when C2D method call arrives', function(done) {
      // setup
      var transport = new FakeMethodTransport();
      var client = new Client(transport);
      client.open(function() {
        client.onDeviceMethod('firstMethod', function() {}); // This will connect the method receiver
        client.onDeviceMethod('reboot', function() {
          done();
        });
      });

      // test
      transport.emitMethodCall('reboot');
    });

    // Tests_SRS_NODE_DEVICE_CLIENT_13_003: [ The client shall start listening for method calls from the service whenever there is a listener subscribed for a method callback. ]
    it('registers callback on transport when a method event is subscribed to', function() {
      // setup
      var transport = new FakeMethodTransport();
      var client = new Client(transport);
      var callback = sinon.spy();
      transport.on('newListener', callback);

      // test
      client.onDeviceMethod('reboot', function(){});

      // assert
      assert.isTrue(callback.withArgs('method_reboot').calledOnce);

      // cleanup
      transport.removeListener('newListener', callback);
    });

    // Tests_SRS_NODE_DEVICE_CLIENT_13_023: [ onDeviceMethod shall throw an Error if a listener is already subscribed for a given method call. ]
    it('throws if a listener is already subscribed for a method call', function() {
      // setup
      var transport = new FakeMethodTransport();
      var client = new Client(transport);
      client.onDeviceMethod('reboot', function(){});

      // test
      // assert
      assert.throws(function() {
        client.onDeviceMethod('reboot', function(){});
      });
    });

    it('emits an error if the transport fails to enable the methods feature', function (testCallback) {
      var transport = new FakeMethodTransport();
      var fakeError = new Error('fake');
      sinon.stub(transport, 'enableMethods').callsFake(function (callback) { callback(fakeError); });
      var client = new Client(transport);
      client.on('error', function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      })
      client.onDeviceMethod('firstMethod', function() {}); // This will connect the method receiver
    });
  });

  describe('#on(\'message\')', function () {
    /*Tests_SRS_NODE_DEVICE_CLIENT_16_002: [The ‘message’ event shall be emitted when a cloud-to-device message is received from the IoT Hub service.]*/
    it('emits a message event when a message is received', function (done) {
      var dummyTransport = new FakeTransport();
      var client = new Client(dummyTransport);
      client.on('message', function(msg) {
        /*Tests_SRS_NODE_DEVICE_CLIENT_16_003: [The ‘message’ event parameter shall be a ‘Message’ object.]*/
        assert.equal(msg.constructor.name, 'Message');
        done();
      });

      dummyTransport.emit('message', new Message());
    });
  });

  describe('#on(\'inputMessage\')', function () {
    /*Tests_SRS_NODE_DEVICE_CLIENT_18_012: [ The `inputMessage` event shall be emitted when an inputMessage is received from the IoT Hub service. ]*/
    it('emits a message event when a message is received', function (done) {
      var dummyTransport = new FakeTransport();
      var client = new Client(dummyTransport);
      client.on('inputMessage', function(inputName,msg) {
        /*Tests_SRS_NODE_DEVICE_CLIENT_18_013: [ The `inputMessage` event parameters shall be the inputName for the message and a `Message` object. ]*/
        assert.strictEqual(inputName, 'fakeInputName');
        assert.strictEqual(msg.constructor.name, 'Message');
        done();
      });

      dummyTransport.emit('inputMessage', 'fakeInputName', new Message());
    });
  });


  [
    {
      eventName: 'message',
      enableFunc: 'enableC2D',
      disableFunc: 'disableC2D'
    },
    {
      eventName: 'inputMessage',
      enableFunc: 'enableInputMessages',
      disableFunc: 'disableInputMessages'
    }
  ].forEach(function(testConfig) {
    describe('#on(\'' + testConfig.eventName + '\')', function () {

      /*Tests_SRS_NODE_DEVICE_CLIENT_16_004: [The client shall start listening for messages from the service whenever there is a listener subscribed to the ‘message’ event.]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_18_014: [ The client shall start listening for messages from the service whenever there is a listener subscribed to the `inputMessage` event. ]*/
      it('starts listening for messages when a listener subscribes to the message event', function () {
        var dummyTransport = new FakeTransport();
        sinon.spy(dummyTransport, testConfig.enableFunc);
        var client = new Client(dummyTransport);

        // Calling 'on' twice to make sure it's called only once on the receiver.
        // It works because the test will fail if the test callback is called multiple times, and it's called for every time the testConfig.eventName event is subscribed on the receiver.
        client.on(testConfig.eventName, function () { });
        client.on(testConfig.eventName, function () { });
        assert.isTrue(dummyTransport[testConfig.enableFunc].calledOnce);
      });

      /*Tests_SRS_NODE_DEVICE_CLIENT_16_005: [The client shall stop listening for messages from the service whenever the last listener unsubscribes from the ‘message’ event.]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_18_015: [ The client shall stop listening for messages from the service whenever the last listener unsubscribes from the `inputMessage` event. ]*/
      it('stops listening for messages when the last listener has unsubscribed', function (testCallback) {
        var dummyTransport = new FakeTransport();
        sinon.spy(dummyTransport, testConfig.enableFunc);
        sinon.spy(dummyTransport, testConfig.disableFunc);
        sinon.spy(dummyTransport, 'removeAllListeners');

        var client = new Client(dummyTransport);
        var listener1 = function () { };
        var listener2 = function () { };
        client.on(testConfig.eventName, listener1);
        client.on(testConfig.eventName, listener2);

        process.nextTick(function() {
          client.removeListener(testConfig.eventName, listener1);
          assert.isTrue(dummyTransport[testConfig.disableFunc].notCalled);
          client.removeListener(testConfig.eventName, listener2);
          assert(dummyTransport[testConfig.disableFunc].calledOnce);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_CLIENT_16_066: [ The client shall emit an error if connecting the transport fails while subscribing to message events ]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_18_017: [ The client shall emit an `error` if connecting the transport fails while subscribing to `inputMessage` events. ]*/
      it('emits an error if it fails to start listening for messages', function (testCallback) {
        var dummyTransport = new FakeTransport();
        var fakeError = new Error('fake');
        sinon.stub(dummyTransport, testConfig.enableFunc).callsFake(function (callback) { callback(fakeError); });
        var client = new Client(dummyTransport);
        client.on('error', function (err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        })

        // Calling 'on' twice to make sure it's called only once on the receiver.
        // It works because the test will fail if the test callback is called multiple times, and it's called for every time the testConfig.eventName event is subscribed on the receiver.
        client.on(testConfig.eventName, function () { });
        assert.isTrue(dummyTransport[testConfig.enableFunc].calledOnce);
      });

      /*Tests_SRS_NODE_DEVICE_CLIENT_16_066: [ The client shall emit an error if connecting the transport fails while subscribing to message events ]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_18_017: [ The client shall emit an `error` if connecting the transport fails while subscribing to `inputMessage` events. ]*/
      it('emits an error if it fails to stop listening for messages', function (testCallback) {
        var dummyTransport = new FakeTransport();
        var fakeError = new Error('fake');
        sinon.spy(dummyTransport, testConfig.enableFunc);
        sinon.stub(dummyTransport, testConfig.disableFunc).callsFake(function (callback) { callback(fakeError); });
        var client = new Client(dummyTransport);
        client.on('error', function (err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        })

        client.on(testConfig.eventName, function () { });
        assert.isTrue(dummyTransport[testConfig.enableFunc].calledOnce);
        client.removeAllListeners(testConfig.eventName);
        assert.isTrue(dummyTransport[testConfig.disableFunc].calledOnce);
      });
    });
  });

  describe('#on(\'error\')', function () {
    // errors right now bubble up through the transport disconnect handler.
    // ultimately we would like to get rid of that disconnect event and rely on the error event instead
    it.skip('forwards transport errors into a disconnect event', function (testCallback) {
      var fakeError = new Error('fake');
      var dummyTransport = new FakeTransport();
      var client = new Client(dummyTransport);
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
  ].forEach(function(testConfig) {
    describe('#' + testConfig.methodName, function () {
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_016: [The ‘complete’ method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_018: [The ‘reject’ method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_017: [The ‘abandon’ method shall throw a ReferenceError if the ‘message’ parameter is falsy.] */
      [undefined, null, '', 0].forEach(function (message) {
        it('throws if message is \'' + message + '\'', function () {
          var client = new Client(new FakeTransport());
          assert.throws(function () {
            client[testConfig.methodName](message, function () { });
          }, ReferenceError);
        });
      });

      /*Tests_SRS_NODE_DEVICE_CLIENT_16_007: [The ‘complete’ method shall call the ‘complete’ method of the transport with the message as an argument]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_010: [The ‘reject’ method shall call the ‘reject’ method of the transport with the message as an argument]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_013: [The ‘abandon’ method shall call the ‘abandon’ method of the transport with the message as an argument]*/
      it('calls the ' + testConfig.methodName + ' method on the transport with the message as an argument', function () {
        var dummyTransport = new FakeTransport();
        sinon.spy(dummyTransport, testConfig.methodName);

        var client = new Client(dummyTransport);
        var message = new Message();
        client[testConfig.methodName](message, function () { });
        assert(client._transport[testConfig.methodName].calledOnce);
        assert(client._transport[testConfig.methodName].calledWith(message));
      });

      /*Tests_SRS_NODE_DEVICE_CLIENT_16_008: [The ‘done’ callback shall be called with a null error object and a ‘MessageCompleted’ result once the transport has completed the message.]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_011: [The ‘done’ callback shall be called with a null error object and a ‘MessageRejected’ result once the transport has rejected the message.]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_014: [The ‘done’ callback shall be called with a null error object and a ‘Messageabandoned’ result once the transport has abandoned the message.]*/
      it('calls the done callback with a null error object and a result', function (done) {
        var client = new Client(new FakeTransport());
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

      /*Tests_SRS_NODE_DEVICE_CLIENT_16_009: [The ‘done’ callback shall be called with a standard javascript Error object and no result object if the transport could not complete the message.]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_012: [The ‘done’ callback shall be called with a standard javascript Error object and no result object if the transport could not reject the message.]*/
      /*Tests_SRS_NODE_DEVICE_CLIENT_16_015: [The ‘done’ callback shall be called with a standard javascript Error object and no result object if the transport could not abandon the message.]*/
      it('calls the done callback with an error if the transport fails to complete the message', function (done) {
        var testError = new Error('fake error');
        var dummyTransport = new FakeTransport();
        sinon.stub(dummyTransport, [testConfig.methodName]).callsFake(function (message, callback) {
          callback(testError);
        });

        var client = new Client(dummyTransport);
        var message = new Message();
        client[testConfig.methodName](message, function (err) {
          assert.strictEqual(err, testError);
          done();
        });
      });
    });
  });

  describe('#updateSharedAccessSignature', function () {
    var DummyBlobUploadClient = function() {};
    DummyBlobUploadClient.prototype.updateSharedAccessSignature = function() {};

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_031: [The updateSharedAccessSignature method shall throw a ReferenceError if the sharedAccessSignature parameter is falsy.]*/
    [undefined, null, '', 0].forEach(function (sas) {
      it('throws a ReferenceError if sharedAccessSignature is \'' + sas + '\'', function () {
        var client = new Client(new FakeTransport());
        assert.throws(function () {
          client.updateSharedAccessSignature(sas, function () { });
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_032: [The updateSharedAccessSignature method shall call the updateSharedAccessSignature method of the transport currently in use with the sharedAccessSignature parameter.]*/
    it('calls the transport `updateSharedAccessSignature` method with the sharedAccessSignature parameter', function () {
      var dummyTransport = new FakeTransport();
      sinon.spy(dummyTransport, 'updateSharedAccessSignature');

      var client = new Client(dummyTransport, null, new DummyBlobUploadClient());
      var sas = 'sas';
      client.updateSharedAccessSignature(sas, function () { });
      assert(dummyTransport.updateSharedAccessSignature.calledOnce);
      assert(dummyTransport.updateSharedAccessSignature.calledWith(sas));
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_035: [The updateSharedAccessSignature method shall call the `done` callback with an error object if an error happened while renewing the token.]*/
    it('Calls the `done` callback with an error object if an error happened', function (done) {
      var dummyTransport = new FakeTransport();
      sinon.stub(dummyTransport, 'updateSharedAccessSignature').callsFake(function (sas, callback) {
        callback(new Error('foo'));
      });

      var client = new Client(dummyTransport, null, new DummyBlobUploadClient());
      client.updateSharedAccessSignature('sas', function (err) {
        assert.isOk(err);
        done();
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_036: [The updateSharedAccessSignature method shall call the `done` callback with a null error object and a result of type SharedAccessSignatureUpdated if the token was updated successfully.]*/
    it('Calls the `done` callback with a null error object and a SharedAccessSignatureUpdated result', function (done) {
      var client = new Client(new FakeTransport(), null, new DummyBlobUploadClient());
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

  describe('getTwin', function() {
    it('creates the device twin correctly', function(done) {
      var client = new Client(new FakeTransport());

      /* Tests_SRS_NODE_DEVICE_CLIENT_18_001: [** The `getTwin` method shall call the `azure-iot-device-core!Twin.fromDeviceClient` method to create the device client object. **]** */
      var fakeTwin = {
        fromDeviceClient: function(obj, innerDone) {
          /* Tests_SRS_NODE_DEVICE_CLIENT_18_002: [** The `getTwin` method shall pass itself as the first parameter to `fromDeviceClient` and it shall pass the `done` method as the second parameter. **]**  */
          assert.equal(obj, client);
          assert.equal(innerDone, done);
          done();
        }
      };

      /* Tests_SRS_NODE_DEVICE_CLIENT_18_003: [** The `getTwin` method shall use the second parameter (if it is not falsy) to call `fromDeviceClient` on. **]**    */
     client.getTwin(done, fakeTwin);
    });
  });

  describe('setRetryPolicy', function() {
    /*Tests_SRS_NODE_DEVICE_CLIENT_16_083: [The `setRetryPolicy` method shall throw a `ReferenceError` if the policy object is falsy.]*/
    [null, undefined, ''].forEach(function(badPolicy) {
      it('throws a ReferenceError if policy is \'' + badPolicy + '\'', function() {
        var client = new Client(new EventEmitter());
        assert.throws(function() {
          client.setRetryPolicy(badPolicy);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_084: [The `setRetryPolicy` method shall throw an `ArgumentError` if the policy object doesn't have a `shouldRetry` method.]*/
    it('throws an ArgumentError if the policy does not have a shouldRetry method', function() {
      var client = new Client(new EventEmitter());
      var badPolicy = {
        nextRetryTimeout: function() {}
      };
      assert.throws(function() {
        client.setRetryPolicy(badPolicy);
      }, errors.ArgumentError);
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_085: [The `setRetryPolicy` method shall throw an `ArgumentError` if the policy object doesn't have a `nextRetryTimeout` method.]*/
    it('throws an ArgumentError if the policy does not have a nextRetryTimeout method', function() {
      var client = new Client(new EventEmitter());
      var badPolicy = {
        shouldRetry: function () {}
      };
      assert.throws(function() {
        client.setRetryPolicy(badPolicy);
      }, errors.ArgumentError);
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_16_086: [Any operation happening after a `setRetryPolicy` call should use the policy set during that call.]*/
    it('uses the new retry policy for the next operation', function (testCallback) {
      var testPolicy = {
        shouldRetry: sinon.stub().returns(false),
        nextRetryTimeout: sinon.stub().returns(-1)
      };
      var fakeTransport = new EventEmitter();
      fakeTransport.sendEvent = sinon.stub().callsArgWith(1, new results.MessageEnqueued());

      var client = new Client(fakeTransport);
      client.setRetryPolicy(testPolicy);
      client.sendEvent(new Message('foo'), function() {
        assert.isTrue(testPolicy.shouldRetry.calledOnce);
        assert.isTrue(testPolicy.nextRetryTimeout.notCalled); //shouldRetry being false...
        assert.isTrue(fakeTransport.sendEvent.calledOnce);
        testCallback();
      });
    });
  });
});

describe('Over simulated HTTPS', function () {
  var registry = {
    create: function(deviceId, done) {
      done(null, {
        deviceId: deviceId,
        authentication: {
          symmetricKey: {
            primaryKey: 'key=='
          }
        }
      });
    },
    delete: function(deviceId, done) { done(); }
  };

  clientTests.sendEventTests(SimulatedHttp, registry);
  clientTests.sendEventBatchTests(SimulatedHttp, registry);
  clientTests.sendOutputEventTests(SimulatedHttp, registry);
  clientTests.sendOutputEventBatchTests(SimulatedHttp, registry);
});

