// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;
var Amqp = require('../lib/amqp.js').Amqp;
var Client = require('../lib/client.js').Client;
var Message = require('azure-iot-common').Message;
var errors = require('azure-iot-common').errors;
var SimulatedAmqp = require('./amqp_simulated.js');
var transportSpecificTests = require('./_client_common_testrun.js');

describe('Client', function () {
  describe('#constructor', function () {
    /*Tests_SRS_NODE_IOTHUB_CLIENT_05_001: [The Client constructor shall throw ReferenceError if the transport argument is falsy.]*/
    it('throws when transport is falsy', function () {
      assert.throws(function () {
        return new Client();
      }, ReferenceError, 'transport is \'undefined\'');
    });
  });

  describe('#fromConnectionString', function () {
    var connStr = 'HostName=a.b.c;SharedAccessKeyName=name;SharedAccessKey=key';

    /*Tests_SRS_NODE_IOTHUB_CLIENT_05_002: [The fromConnectionString method shall throw ReferenceError if the connStr argument is falsy.]*/
    it('throws when value is falsy', function () {
      assert.throws(function () {
        return Client.fromConnectionString();
      }, ReferenceError, 'connStr is \'undefined\'');
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_017: [The `fromConnectionString` method shall use the default Transport (Amqp) if the `Transport` optional argument is falsy.]*/
    it('creates an instance of the default transport', function () {
      var client = Client.fromConnectionString(connStr);
      assert.instanceOf(client._transport, Amqp);
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_016: [The `fromConnectionString` method shall use the `Transport` constructor passed as argument to instantiate a transport object if it's not falsy.]*/
    it('uses the transport given as argument', function() {
      var FakeTransport = function (config) {
        assert.isOk(config);
      };

      var client = Client.fromConnectionString(connStr, FakeTransport);
      assert.instanceOf(client._transport, FakeTransport);
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_05_004: [The fromConnectionString method shall return a new instance of the Client object, as by a call to new Client(transport).]*/
    it('returns an instance of Client', function () {
      var client = Client.fromConnectionString(connStr);
      assert.instanceOf(client, Client);
      assert.isOk(client._restApiClient);
    });
  });

  describe('#fromSharedAccessSignature', function () {
    var token = 'SharedAccessSignature sr=hubName.azure-devices.net&sig=signature&skn=keyname&se=expiry';

    /*Tests_SRS_NODE_IOTHUB_CLIENT_05_005: [The fromSharedAccessSignature method shall throw ReferenceError if the sharedAccessSignature argument is falsy.]*/
    it('throws when value is falsy', function () {
      assert.throws(function () {
        return Client.fromSharedAccessSignature();
      }, ReferenceError, 'sharedAccessSignature is \'undefined\'');
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_018: [The `fromSharedAccessSignature` method shall create a new transport instance and pass it a config object formed from the connection string given as argument.]*/
    it('correctly populates the config structure', function() {
      var client = Client.fromSharedAccessSignature(token);
      assert.equal(client._transport._config.host, 'hubName.azure-devices.net');
      assert.equal(client._transport._config.keyName, 'keyname');
      assert.equal(client._transport._config.sharedAccessSignature, token);
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_020: [The `fromSharedAccessSignature` method shall use the default Transport (Amqp) if the `Transport` optional argument is falsy.]*/
    it('creates an instance of the default transport', function () {
      var client = Client.fromSharedAccessSignature(token);
      assert.instanceOf(client._transport, Amqp);
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_019: [The `fromSharedAccessSignature` method shall use the `Transport` constructor passed as argument to instantiate a transport object if it's not falsy.]*/
    it('uses the transport given as argument', function() {
      var FakeTransport = function (config) {
        assert.isOk(config);
      };

      var client = Client.fromSharedAccessSignature(token, FakeTransport);
      assert.instanceOf(client._transport, FakeTransport);
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_05_007: [The fromSharedAccessSignature method shall return a new instance of the Client object, as by a call to new Client(transport).]*/
    it('returns an instance of Client', function () {
      var client = Client.fromSharedAccessSignature(token);
      assert.instanceOf(client, Client);
      assert.isOk(client._restApiClient);
    });
  });

  var goodSendParameters = [
    { obj: new Buffer('foo'), name: 'Buffer' },
    { obj: 'foo', name: 'string' },
    { obj: [], name: 'Array' },
    { obj: new ArrayBuffer(), name: 'ArrayBuffer' }
  ];
  var badSendParameters = [
    { obj: 1, name: 'number' },
    { obj: true, name: 'boolean' },
    { obj: {}, name: 'object' }
  ];

  describe('#send', function () {
    var testSubject;

    beforeEach('prepare test subject', function () {
      testSubject = new Client({}, {});
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_05_013: [The send method shall throw ReferenceError if the deviceId or message arguments are falsy.]*/
    it('throws if deviceId is falsy', function () {
      assert.throws(function () {
        testSubject.send(undefined, {}, () => { });
      }, ReferenceError, 'deviceId is \'undefined\'');
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_05_013: [The send method shall throw ReferenceError if the deviceId or message arguments are falsy.]*/
    it('throws if message is falsy', function () {
      assert.throws(function () {
        testSubject.send('id', undefined, () => { });
      }, ReferenceError, 'message is \'undefined\'');
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_030: [The `send` method shall not throw if the `done` callback is falsy.]*/
    it('returns a Promise done is falsy', function () {
      var simulatedAmqp = new SimulatedAmqp();
      var client = new Client(simulatedAmqp);
      const promise = client.send('id', new Message('msg'));
      assert.instanceOf(promise, Promise);
      promise.catch(console.log);
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_18_016: [The `send` method shall throw an `ArgumentError` if the `message` argument is not of type `azure-iot-common.Message` or `azure-iot-common.Message.BufferConvertible`.]*/
    badSendParameters.forEach(function(testConfig) {
      it('throws if message is of type ' + testConfig.name, function() {
        assert.throws(function () {
          testSubject.send('id', testConfig.obj, () => { });
        }, errors.ArgumentError);
      });
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_05_014: [The `send` method shall convert the `message` object to type `azure-iot-common.Message` if it is not already of type `azure-iot-common.Message`.]*/
    goodSendParameters.forEach(function(testConfig) {
      it('Converts to message if message is of type ' + testConfig.name, function(testCallback) {
        var simulatedAmqp = new SimulatedAmqp();
        var client = new Client(simulatedAmqp);
        sinon.spy(simulatedAmqp, 'send');
        client.send('id', testConfig.obj, function(err, state) {
          assert(!err);
          assert.equal(state.constructor.name, "MessageEnqueued");
          var sentMessage = simulatedAmqp.send.firstCall.args[1];
          assert.deepEqual(sentMessage, new Message(testConfig.obj));
          testCallback();
        });
      });
    });


  });

  describe('#invokeDeviceMethod', function() {
    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_014: [The `invokeDeviceMethod` method shall throw a `ReferenceError` if `deviceId` is `null`, `undefined` or an empty string.]*/
    [undefined, null, ''].forEach(function(badDeviceId) {
      it('throws if \'deviceId\' is \'' + badDeviceId + '\'', function() {
        var client = new Client({}, {});
        assert.throws(function() {
          client.invokeDeviceMethod(badDeviceId, 'method', { foo: 'bar' }, 42, function() {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_006: [The `invokeDeviceMethod` method shall throw a `ReferenceError` if `methodName` is `null`, `undefined` or an empty string.]*/
    [undefined, null, ''].forEach(function(badMethodName) {
      it('throws if \'methodParams.methodName\' is \'' + badMethodName + '\'', function() {
        var client = new Client({}, {});
        assert.throws(function() {
          client.invokeDeviceMethod('deviceId', { methodName: badMethodName, payload: { foo: 'bar' }, timeoutInSeconds: 42 }, function() {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_007: [The `invokeDeviceMethod` method shall throw a `TypeError` if `methodName` is not a `string`.]*/
    [{}, function(){}, 42].forEach(function(badMethodType) {
      it('throws if \'methodParams.methodName\' is of type \'' + badMethodType + '\'', function() {
        var client = new Client({}, {});
        assert.throws(function() {
          client.invokeDeviceMethod('deviceId', { methodName: badMethodType, payload: { foo: 'bar' }, timeoutInSeconds: 42 }, function() {});
        }, TypeError);
      });
    });
  });

  [
    { functionUnderTest: function(client, param, callback) { client.invokeDeviceMethod('deviceId', param, callback); } },
    { functionUnderTest: function(client, param, callback) { client.invokeDeviceMethod('deviceId', 'moduleId', param, callback); } },
  ].forEach(function(testConfig) {
    describe('#invokeDeviceMethod', function() {
      /*Tests_SRS_NODE_IOTHUB_CLIENT_16_009: [The `invokeDeviceMethod` method shall initialize a new instance of `DeviceMethod` with the `methodName` and `timeout` values passed in the arguments.]*/
      /*Tests_SRS_NODE_IOTHUB_CLIENT_16_010: [The `invokeDeviceMethod` method shall use the newly created instance of `DeviceMethod` to invoke the method with the `payload` argument on the device specified with the `deviceid` argument .]*/
      /*Tests_SRS_NODE_IOTHUB_CLIENT_16_013: [The `invokeDeviceMethod` method shall call the `done` callback with a `null` first argument, the result of the method execution in the second argument, and the transport-specific response object as a third argument.]*/
      /*Tests_SRS_NODE_IOTHUB_CLIENT_18_003: [If `moduleIdOrMethodParams` is a string the `invokeDeviceMethod` method shall call `invokeOnModule` on the new `DeviceMethod` instance. ]*/
      it('uses the DeviceMethod client to invoke the method', function(testCallback) {
        var fakeMethodParams = {
          methodName: 'method',
          payload: null,
          timeoutInSeconds: 42
        };

        var fakeResult = { foo: 'bar' };
        var fakeResponse = { statusCode: 200 };
        var fakeRestClient = {
          executeApiCall: function(method, path, headers, body, timeout, callback) {
            callback(null, fakeResult, fakeResponse);
          }
        };
        var client = new Client({}, fakeRestClient);

        testConfig.functionUnderTest(client, fakeMethodParams, function(err, result, response) {
          assert.isNull(err);
          assert.equal(result, fakeResult);
          assert.equal(response, fakeResponse);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_IOTHUB_CLIENT_16_012: [The `invokeDeviceMethod` method shall call the `done` callback with a standard javascript `Error` object if the request failed.]*/
      it('works when payload and timeout are omitted', function(testCallback) {
        var fakeError = new Error('fake error');
        var fakeRestClientFails = {
          executeApiCall: function(method, path, headers, body, timeout, callback) {
            callback(fakeError);
          }
        };
        var client = new Client({}, fakeRestClientFails);

        testConfig.functionUnderTest(client, { methodName: 'method' }, function(err) {
          assert.equal(err, fakeError);
          testCallback();
        });
      });
    });
  });



  describe('#open', function() {
    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_004: [The `disconnect` event shall be emitted when the client is disconnected from the server.]*/
    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_002: [If the transport successfully establishes a connection the `open` method shall subscribe to the `disconnect` event of the transport.]*/
    it('subscribes to the \'disconnect\' event once connected', function(done) {
      var simulatedAmqp = new SimulatedAmqp();
      var client = new Client(simulatedAmqp, {});
      client.open(function() {
        client.on('disconnect', function() {
          done();
        });

        simulatedAmqp.emit('disconnect');
      });
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_05_009: [**When the `open` method completes, the callback function (indicated by the `done` argument) shall be invoked with the following arguments:
      - `err` - standard JavaScript `Error` object (or subclass)]*/
    it('calls the done callback if passed as argument', function(testCallback) {
      var simulatedAmqp = new SimulatedAmqp();
      var client = new Client(simulatedAmqp);
      client.open(testCallback);
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_006: [The `open` method should not throw if the `done` callback is not specified.]*/
    it('doesn\'t throw if the done callback is not passed as argument', function() {
      var simulatedAmqp = new SimulatedAmqp();
      var client = new Client(simulatedAmqp);
      assert.doesNotThrow(function() {
        client.open();
      });
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_05_011: [**Otherwise the argument `err` shall have an `amqpError` property containing implementation-specific response information for use in logging and troubleshooting.]*/
    it('calls the done callback with an error if the transport fails to connect', function (testCallback) {
      var fakeError = new errors.UnauthorizedError('will not retry');
      var fakeTransport = new EventEmitter();
      fakeTransport.connect = sinon.stub().callsArgWith(0, fakeError);
      var client = new Client(fakeTransport);
      client.open(function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });
  });

  describe('#close', function() {
    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_003: [The `close` method shall remove the listener that has been attached to the transport `disconnect` event.]*/
    it('unsubscribes for the \'disconnect\' event when disconnecting', function(done) {
      var simulatedAmqp = new SimulatedAmqp();
      var client = new Client(simulatedAmqp, {});
      var disconnectReceived = false;
      client.open(function() {
        client.on('disconnect', function() {
          disconnectReceived = true;
        });
        client.close(function() {
          simulatedAmqp.emit('disconnect');
          assert.isFalse(disconnectReceived);
          done();
        });
      });
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_05_022: [When the `close` method completes, the callback function (indicated by the done argument) shall be invoked with the following arguments:
      - `err` - standard JavaScript `Error` object (or subclass)]*/
    it('calls the done callback if passed as argument', function(testCallback) {
      var simulatedAmqp = new SimulatedAmqp();
      var client = new Client(simulatedAmqp);
      client.close(testCallback);
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_005: [The `close` method should not throw if the `done` callback is not specified.]*/
    it('doesn\'t throw if the done callback is not passed as argument', function() {
      var simulatedAmqp = new SimulatedAmqp();
      var client = new Client(simulatedAmqp);
      assert.doesNotThrow(function() {
        client.close();
      });
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_05_024: [Otherwise the argument `err` shall have a transport property containing implementation-specific response information for use in logging and troubleshooting.]*/
    it('calls the done callback with an error if the transport fails to disconnect', function (testCallback) {
      var fakeError = new errors.UnauthorizedError('will not retry');
      var fakeTransport = new EventEmitter();
      fakeTransport.disconnect = sinon.stub().callsArgWith(0, fakeError);
      var client = new Client(fakeTransport);
      client.close(function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });
  });

  /*Tests_SRS_NODE_IOTHUB_CLIENT_05_027: [When the `getFeedbackReceiver` method completes, the callback function (indicated by the `done` argument) shall be invoked with the following arguments:
    - `err` - standard JavaScript `Error` object (or subclass): `null` if the operation was successful
    - `receiver` - an `AmqpReceiver` instance: `undefined` if the operation failed.]*/
  /*Tests_SRS_NODE_IOTHUB_CLIENT_16_001: [When the `getFileNotificationReceiver` method completes, the callback function (indicated by the `done` argument) shall be invoked with the following arguments:
    - `err` - standard JavaScript `Error` object (or subclass): `null` if the operation was successful
    - `receiver` - an `AmqpReceiver` instance: `undefined` if the operation failed.]*/
  ['getFeedbackReceiver', 'getFileNotificationReceiver'].forEach(function (getReceiverMethod) {
    describe(getReceiverMethod, function () {
      it('calls ' + getReceiverMethod + ' on the transport', function (testCallback) {
        var fakeTransport = new EventEmitter();
        fakeTransport[getReceiverMethod] = sinon.stub().callsArgWith(0, null, new EventEmitter());
        var client = new Client(fakeTransport);
        client[getReceiverMethod](function (err, recv) {
          assert.isNull(err);
          assert.instanceOf(recv, EventEmitter);
          testCallback();
        });
      });

      it('calls its callback with an error if it the transport fails to provide a feedback receiver', function (testCallback) {
        var fakeError = new errors.UnauthorizedError('will not retry');
        var fakeTransport = new EventEmitter();
        fakeTransport[getReceiverMethod] = sinon.stub().callsArgWith(0, fakeError);
        var client = new Client(fakeTransport);
        client[getReceiverMethod](function (err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });
    });
  });

  describe('setRetryPolicy', function () {
    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_027: [The `setRetryPolicy` method shall throw a `ReferenceError` if the `policy` argument is falsy.]*/
    [null, undefined].forEach(function (badPolicy) {
      it('throws a ReferenceError if the policy is \'' + badPolicy + '\'', function () {
        var client = new Client(new EventEmitter());
        assert.throws(function () {
          client.setRetryPolicy(badPolicy);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_028: [The `setRetryPolicy` method shall throw an `ArgumentError` if the `policy` object does not have a `shouldRetry` method and a `nextRetryTimeout` method.]*/
    it('throws an ArgumentError if the policy does not have a shouldRetry method', function () {
      var badPolicy = { nextRetryTimeout: function () {} };
      var client = new Client(new EventEmitter());
      assert.throws(function () {
        client.setRetryPolicy(badPolicy);
      }, errors.ArgumentError);
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_028: [The `setRetryPolicy` method shall throw an `ArgumentError` if the `policy` object does not have a `shouldRetry` method and a `nextRetryTimeout` method.]*/
    it('throws an ArgumentError if the policy does not have a nextRetryTimeout method', function () {
      var badPolicy = { shouldRetry: function () {} };
      var client = new Client(new EventEmitter());
      assert.throws(function () {
        client.setRetryPolicy(badPolicy);
      }, errors.ArgumentError);
    });

    /*Tests_SRS_NODE_IOTHUB_CLIENT_16_029: [Any operation (e.g. `send`, `getFeedbackReceiver`, etc) initiated after a call to `setRetryPolicy` shall use the policy passed as argument to retry.]*/
    it('uses the new retry policy for all subsequent calls', function (testCallback) {
      var fakeError = new errors.UnauthorizedError('will not retry');
      var fakeRetryPolicy = {
        shouldRetry: sinon.stub().returns(true),
        nextRetryTimeout: sinon.stub().returns(1)
      };
      var fakeTransport = new EventEmitter();
      fakeTransport.connect = sinon.stub().onFirstCall().callsArgWith(0, fakeError)
                                          .onSecondCall().callsFake(function () {
                                            assert.isTrue(fakeRetryPolicy.shouldRetry.calledOnce);
                                            assert.isTrue(fakeRetryPolicy.shouldRetry.calledOnce);
                                            testCallback();
                                          });
      var client = new Client(fakeTransport);
      client.setRetryPolicy(fakeRetryPolicy);
      client.open(function () {});
    });
  });
});

var fakeRegistry = {
  create: function(device, done) { done(); },
  addModule: function(module, done) { done(); },
  delete: function(deviceId, done) { done(); }
};

describe('Over simulated AMQP', function () {
  var opts = {
    transport: function () { return new SimulatedAmqp(); },
    connectionString: process.env.IOTHUB_CONNECTION_STRING,
    registry: fakeRegistry
  };
  transportSpecificTests(opts);
});