// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var fs = require('fs');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var FakeTransport = require('./fake_transport.js');
var Message = require('azure-iot-common').Message;
var ModuleClient = require('../lib/module_client').ModuleClient;
var errors = require('azure-iot-common').errors;
var results = require('azure-iot-common').results;
var ModuleClient = require('../lib/module_client').ModuleClient;
var IotEdgeAuthenticationProvider = require('../lib/iotedge_authentication_provider').IotEdgeAuthenticationProvider;
var SharedAccessKeyAuthenticationProvider = require('../lib/sak_authentication_provider').SharedAccessKeyAuthenticationProvider;
var SharedAccessSignature = require('azure-iot-common').SharedAccessSignature;

describe('ModuleClient', function () {
  var sharedKeyConnectionString = 'HostName=host;DeviceId=id;ModuleId=modId;SharedAccessKey=key';
  var sharedAccessSignature = '"SharedAccessSignature sr=hubName.azure-devices.net/devices/deviceId/modules/moduleId&sig=s1gn4tur3&se=1454204843"';

  describe('#fromConnectionString', function () {
    /*Tests_SRS_NODE_MODULE_CLIENT_05_006: [The fromConnectionString method shall return a new instance of the ModuleClient object, as by a call to new ModuleClient(new Transport(...)).]*/
    it('returns an instance of ModuleClient', function () {
      var client = ModuleClient.fromConnectionString(sharedKeyConnectionString, FakeTransport);
      assert.instanceOf(client, ModuleClient);
    });
  });


  describe('#fromSharedAccessSignature', function () {
    /*Tests_SRS_NODE_MODULE_CLIENT_16_030: [The fromSharedAccessSignature method shall return a new instance of the ModuleClient object] */
    it('returns an instance of ModuleClient', function () {
      var client = ModuleClient.fromSharedAccessSignature(sharedAccessSignature, FakeTransport);
      assert.instanceOf(client, ModuleClient);
    });
  });

  describe('#fromAuthenticationProvider', function () {
    /*Tests_SRS_NODE_MODULE_CLIENT_16_091: [The `fromAuthenticationProvider` method shall return a `ModuleClient` object configured with a new instance of a transport created using the `transportCtor` argument.]*/
    it('returns an instance of ModuleClient', function () {
      var client = ModuleClient.fromAuthenticationProvider({}, FakeTransport);
      assert.instanceOf(client, ModuleClient);
      assert.instanceOf(client._transport, FakeTransport);
    });
  });

  describe('#fromEnvironment', function () {
    // Tests_SRS_NODE_MODULE_CLIENT_13_033: [ The fromEnvironment method shall throw a ReferenceError if the callback argument is not a function. ]
    ['not a function', 20].forEach(function (badCallback) {
      it('throws if callback is falsy or not a function', function () {
        assert.throws(function () {
          return ModuleClient.fromEnvironment(null, badCallback);
        }, TypeError);
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_033: [ The fromEnvironment method shall return a Promise if the callback argument is falsy. ]
    [null, undefined].forEach(function (badCallback) {
      it('returns a Promise if callback is falsy or not a function', function () {
        const result = ModuleClient.fromEnvironment(null, badCallback);
        assert.instanceOf(result, Promise);
        result.catch(_ => {});
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_026: [ The fromEnvironment method shall invoke callback with a ReferenceError if the transportCtor argument is falsy. ]
    [null, undefined].forEach(function (badTransport) {
      it('fails if the transportCtor is falsy', function () {
        ModuleClient.fromEnvironment(badTransport, function (err) {
          assert.instanceOf(err, ReferenceError);
        });
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_028: [ The fromEnvironment method shall delegate to ModuleClient.fromConnectionString if an environment variable called EdgeHubConnectionString or IotHubConnectionString exists. ]
    ['EdgeHubConnectionString', 'IotHubConnectionString'].forEach(function (envName) {
      describe('calls ModuleClient.fromConnectionString', function () {
        var stub;
        beforeEach(function () {
          stub = sinon.stub(ModuleClient, 'fromConnectionString').returns(42);
          process.env[envName] = 'cs';
        });

        afterEach(function () {
          stub.restore();
          delete process.env[envName];
        });

        it('if env ' + envName + ' is defined', function () {
          ModuleClient.fromEnvironment(function () {}, function (err, client) {
            assert.isNotOk(err);
            assert.strictEqual(client, 42);
            assert.strictEqual(stub.called, true);
            assert.strictEqual(stub.args[0][0], 'cs');
          });
        });
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_034: [ If the client is running in a non-edge mode and an environment variable named EdgeModuleCACertificateFile exists then its file contents shall be set as the CA cert for the transport via the transport's setOptions method passing in the CA as the value for the ca property in the options object. ]
    ['EdgeHubConnectionString', 'IotHubConnectionString'].forEach(function (envName) {
      describe('sets CA cert in non-edge mode', function () {
        var spy;
        var fsstub;
        var fakeConnStr = 'HostName=fake.azure-devices.net;DeviceId=deviceId;ModuleId=moduleId;SharedAccessKey=key';

        var transport = new EventEmitter();
        transport.setOptions = sinon.stub().callsArg(1);

        beforeEach(function () {
          spy = sinon.spy(ModuleClient, 'fromConnectionString');
          process.env[envName] = fakeConnStr;
          process.env.EdgeModuleCACertificateFile = '/path/to/ca/cert/file';
          fsstub = sinon.stub(fs, 'readFile').callsArgWith(2, null, 'ca cert');
        });

        afterEach(function () {
          spy.restore();
          fsstub.restore();
          delete process.env[envName];
          delete process.env['EdgeModuleCACertificateFile'];
        });

        it('if env ' + envName + ' is defined', function (testCallback) {
          ModuleClient.fromEnvironment(function (authProvider) {
            assert.instanceOf(authProvider, SharedAccessKeyAuthenticationProvider);
            return transport;
          }, function (err, client) {
            assert.isNotOk(err);
            assert.instanceOf(client, ModuleClient);
            assert.strictEqual(spy.called, true);
            assert.strictEqual(spy.args[0][0], fakeConnStr);
            assert.strictEqual(fsstub.called, true);
            assert.strictEqual(fsstub.args[0][0], '/path/to/ca/cert/file');
            assert.strictEqual(fsstub.args[0][1], 'utf8');
            assert.strictEqual(transport.setOptions.called, true);
            assert.strictEqual(transport.setOptions.args[0][0].ca, 'ca cert');
            testCallback();
          });
        });
      });

      describe('fails if CA cert fs read fails', function () {
        var fsstub;
        beforeEach(function () {
          process.env[envName] = 'cs';
          process.env.EdgeModuleCACertificateFile = '/path/to/ca/cert/file';
          fsstub = sinon.stub(fs, 'readFile').callsArgWith(2, 'whoops');
        });

        afterEach(function () {
          fsstub.restore();
          delete process.env[envName];
          delete process.env['EdgeModuleCACertificateFile'];
        });

        it('if env ' + envName + ' is defined', function () {
          ModuleClient.fromEnvironment(function () {
            assert.fail("Transport constructor should not have been called.");
          }, function (err) {
            assert.isOk(err);
            assert.strictEqual(err, 'whoops');
          });
        });
      });


      describe('fails if calling setOptions on transport fails', function () {
        var spy;
        var fsstub;
        var fakeConnStr = 'HostName=fake.azure-devices.net;DeviceId=deviceId;ModuleId=moduleId;SharedAccessKey=key';
        var fakeError = new Error('fake');

        var transport = new EventEmitter();
        transport.setOptions = sinon.stub().callsArgWith(1, fakeError);

        beforeEach(function () {
          spy = sinon.spy(ModuleClient, 'fromConnectionString');
          process.env[envName] = fakeConnStr;
          process.env.EdgeModuleCACertificateFile = '/path/to/ca/cert/file';
          fsstub = sinon.stub(fs, 'readFile').callsArgWith(2, null, 'ca cert');
        });

        afterEach(function () {
          spy.restore();
          fsstub.restore();
          delete process.env[envName];
          delete process.env['EdgeModuleCACertificateFile'];
        });

        it('if env ' + envName + ' is defined', function (testCallback) {
          ModuleClient.fromEnvironment(function (authProvider) {
            assert.instanceOf(authProvider, SharedAccessKeyAuthenticationProvider);
            return transport;
          }, function (err, client) {
            assert.strictEqual(err, fakeError);
            assert.isUndefined(client);
            testCallback();
          });
        });
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_029: [ If environment variables EdgeHubConnectionString and IotHubConnectionString do not exist then the following environment variables must be defined: IOTEDGE_WORKLOADURI, IOTEDGE_DEVICEID, IOTEDGE_MODULEID, IOTEDGE_IOTHUBHOSTNAME, IOTEDGE_AUTHSCHEME and IOTEDGE_MODULEGENERATIONID. ]
    describe('validates required env vars', function () {
      var requiredVars = [
        'IOTEDGE_WORKLOADURI',
        'IOTEDGE_DEVICEID',
        'IOTEDGE_MODULEID',
        'IOTEDGE_IOTHUBHOSTNAME',
        'IOTEDGE_AUTHSCHEME',
        'IOTEDGE_MODULEGENERATIONID'
      ];
      var varIndex = 0;

      beforeEach(function () {
        // add a value for all vars in requiredVars to the environment except
        // for the one at varIndex
        for (var index = 0; index < requiredVars.length; index++) {
          if (index !== varIndex) {
            process.env[requiredVars[index]] = '42';
          }
        }
        varIndex++;
      });

      afterEach(function () {
        // delete all the vars
        for (var index = 0; index < requiredVars.length; index++) {
          delete process.env[requiredVars[index]];
        }
      });

      requiredVars.forEach(function (_, index) {
        it('fails if env var ' + requiredVars[index] + ' is not defined', function () {
          ModuleClient.fromEnvironment(function () {}, function (err) {
            assert.isOk(err);
            assert.instanceOf(err, ReferenceError);
          });
        });
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_030: [ The value for the environment variable IOTEDGE_AUTHSCHEME must be sasToken. ]
    describe('check IOTEDGE_AUTHSCHEME', function () {
      var requiredVars = ['IOTEDGE_WORKLOADURI', 'IOTEDGE_DEVICEID', 'IOTEDGE_MODULEID', 'IOTEDGE_IOTHUBHOSTNAME', 'IOTEDGE_MODULEGENERATIONID'];

      var getTrustBundleStub;
      var createWithSigningFunctionStub;

      beforeEach(function () {
        for (var index = 0; index < requiredVars.length; index++) {
          process.env[requiredVars[index]] = '42';
        }
        process.env['IOTEDGE_WORKLOADURI'] = 'http://iotedged';

        getTrustBundleStub = sinon.stub(IotEdgeAuthenticationProvider.prototype, 'getTrustBundle')
          .callsArgWith(0, null, 'ca cert');

        createWithSigningFunctionStub = sinon.stub(SharedAccessSignature, 'createWithSigningFunction')
          .callsArgWith(3, null, 'sas token');
      });

      afterEach(function () {
        // delete all the vars
        for (var index = 0; index < requiredVars.length; index++) {
          delete process.env[requiredVars[index]];
        }
        delete process.env['IOTEDGE_AUTHSCHEME'];
        delete process.env['IOTEDGE_WORKLOADURI'];

        getTrustBundleStub.restore();
        createWithSigningFunctionStub.restore();
      });

      it('fails if value is not sasToken', function () {
        process.env['IOTEDGE_AUTHSCHEME'] = 'NotSasToken';
        ModuleClient.fromEnvironment(function () {}, function (err) {
          assert.isOk(err);
          assert.instanceOf(err, ReferenceError);
        });
      });

      it('auth scheme value is case insensitive', function () {
        process.env['IOTEDGE_AUTHSCHEME'] = 'SASTOKEN';
        ModuleClient.fromEnvironment(function (provider) {
          assert.strictEqual(provider._authConfig.authScheme, 'SASTOKEN');
          return {
            on: function () {},
            setOptions: function () {}
          };
        }, function (err, client) {
          assert.isNotOk(err);
          assert.isOk(client);
        });
      });
    });

    describe('check create', function () {
      var env = [
        ['IOTEDGE_WORKLOADURI', 'unix:///var/run/iotedge.w.sock'],
        ['IOTEDGE_DEVICEID', 'd1'],
        ['IOTEDGE_MODULEID', 'm1'],
        ['IOTEDGE_IOTHUBHOSTNAME', 'host1'],
        ['IOTEDGE_AUTHSCHEME', 'sasToken'],
        ['IOTEDGE_GATEWAYHOSTNAME', 'gwhost'],
        ['IOTEDGE_MODULEGENERATIONID', 'g1']
      ];

      var getTrustBundleStub;
      var createWithSigningFunctionStub;

      beforeEach(function () {
        env.forEach(function (e) {
          process.env[e[0]] = e[1];
        });

        getTrustBundleStub = sinon.stub(IotEdgeAuthenticationProvider.prototype, 'getTrustBundle')
          .callsArgWith(0, null, 'ca cert');

        createWithSigningFunctionStub = sinon.stub(SharedAccessSignature, 'createWithSigningFunction')
          .callsArgWith(3, null, 'sas token');
      });

      afterEach(function () {
        env.forEach(function (e) {
          delete process.env[e[0]];
        });

        getTrustBundleStub.restore();
        createWithSigningFunctionStub.restore();
      });

      // Tests_SRS_NODE_MODULE_CLIENT_13_032: [ The fromEnvironment method shall create a new IotEdgeAuthenticationProvider object and pass this to the transport constructor. ]
      // Tests_SRS_NODE_MODULE_CLIENT_13_031: [ The fromEnvironment method shall invoke the callback with a new instance of the ModuleClient object. ]
      it('creates IotEdgeAuthenticationProvider', function (testCallback) {
        var transport = {
          on: sinon.stub(),
          setOptions: sinon.stub()
        };
        var transportStub = sinon.stub().returns(transport);
        ModuleClient.fromEnvironment(transportStub, function (err, client) {
          assert.isNotOk(err);
          assert.strictEqual(transportStub.called, true);
          var provider = transportStub.args[0][0];
          assert.isOk(provider);
          assert.strictEqual(provider._authConfig.workloadUri, 'unix:///var/run/iotedge.w.sock');
          assert.strictEqual(provider._authConfig.deviceId, 'd1');
          assert.strictEqual(provider._authConfig.moduleId, 'm1');
          assert.strictEqual(provider._authConfig.iothubHostName, 'host1');
          assert.strictEqual(provider._authConfig.authScheme, 'sasToken');
          assert.strictEqual(provider._authConfig.gatewayHostName, 'gwhost');
          assert.strictEqual(provider._authConfig.generationId, 'g1');
          assert.instanceOf(provider, IotEdgeAuthenticationProvider);
          assert.instanceOf(client, ModuleClient);

          testCallback();
        });
      });
    });

    describe('trust bundle', function () {
      var env = [
        ['IOTEDGE_WORKLOADURI', 'unix:///var/run/iotedge.w.sock'],
        ['IOTEDGE_DEVICEID', 'd1'],
        ['IOTEDGE_MODULEID', 'm1'],
        ['IOTEDGE_IOTHUBHOSTNAME', 'host1'],
        ['IOTEDGE_AUTHSCHEME', 'sasToken'],
        ['IOTEDGE_GATEWAYHOSTNAME', 'gwhost'],
        ['IOTEDGE_MODULEGENERATIONID', 'g1']
      ];

      var getTrustBundleStub;
      var createWithSigningFunctionStub;

      beforeEach(function () {
        env.forEach(function (e) {
          process.env[e[0]] = e[1];
        });

        getTrustBundleStub = sinon.stub(IotEdgeAuthenticationProvider.prototype, 'getTrustBundle')
          .callsArgWith(0, null, 'ca cert');

        createWithSigningFunctionStub = sinon.stub(SharedAccessSignature, 'createWithSigningFunction')
          .callsArgWith(3, null, 'sas token');
      });

      afterEach(function () {
        env.forEach(function (e) {
          delete process.env[e[0]];
        });

        getTrustBundleStub.restore();
        createWithSigningFunctionStub.restore();
      });

      // Tests_SRS_NODE_MODULE_CLIENT_13_035: [ If the client is running in edge mode then the IotEdgeAuthenticationProvider.getTrustBundle method shall be invoked to retrieve the CA cert and the returned value shall be set as the CA cert for the transport via the transport's setOptions method passing in the CA value for the ca property in the options object. ]
      it('sets cert on transport', function (testCallback) {
        var transport = {
          on: sinon.stub(),
          setOptions: sinon.stub()
        };
        var transportStub = sinon.stub().returns(transport);
        ModuleClient.fromEnvironment(transportStub, function (err, client) {
          assert.isNotOk(err);
          assert.strictEqual(transportStub.called, true);
          var provider = transportStub.args[0][0];
          assert.isOk(provider);
          assert.strictEqual(getTrustBundleStub.called, true);
          assert.strictEqual(transport.setOptions.called, true);
          assert.strictEqual(transport.setOptions.args[0][0].ca, 'ca cert');
          assert.strictEqual(provider._authConfig.workloadUri, 'unix:///var/run/iotedge.w.sock');
          assert.strictEqual(provider._authConfig.deviceId, 'd1');
          assert.strictEqual(provider._authConfig.moduleId, 'm1');
          assert.strictEqual(provider._authConfig.iothubHostName, 'host1');
          assert.strictEqual(provider._authConfig.authScheme, 'sasToken');
          assert.strictEqual(provider._authConfig.gatewayHostName, 'gwhost');
          assert.strictEqual(provider._authConfig.generationId, 'g1');
          assert.instanceOf(provider, IotEdgeAuthenticationProvider);
          assert.instanceOf(client, ModuleClient);

          testCallback();
        });
      });
    });

    describe('trust bundle', function () {
      var env = [
        ['IOTEDGE_WORKLOADURI', 'unix:///var/run/iotedge.w.sock'],
        ['IOTEDGE_DEVICEID', 'd1'],
        ['IOTEDGE_MODULEID', 'm1'],
        ['IOTEDGE_IOTHUBHOSTNAME', 'host1'],
        ['IOTEDGE_AUTHSCHEME', 'sasToken'],
        ['IOTEDGE_GATEWAYHOSTNAME', 'gwhost'],
        ['IOTEDGE_MODULEGENERATIONID', 'g1']
      ];

      var getTrustBundleStub;
      var createWithSigningFunctionStub;

      beforeEach(function () {
        env.forEach(function (e) {
          process.env[e[0]] = e[1];
        });

        getTrustBundleStub = sinon.stub(IotEdgeAuthenticationProvider.prototype, 'getTrustBundle')
          .callsArgWith(0, 'whoops');

        createWithSigningFunctionStub = sinon.stub(SharedAccessSignature, 'createWithSigningFunction')
          .callsArgWith(3, null, 'sas token');
      });

      afterEach(function () {
        env.forEach(function (e) {
          delete process.env[e[0]];
        });

        getTrustBundleStub.restore();
        createWithSigningFunctionStub.restore();
      });

      it('fails if getTrustBundle fails', function (testCallback) {
        var transport = {
          on: sinon.stub(),
          setOptions: sinon.stub()
        };
        var transportStub = sinon.stub().returns(transport);
        ModuleClient.fromEnvironment(transportStub, function (err, client) {
          assert.isOk(err);
          assert.strictEqual(err, 'whoops');
          assert.strictEqual(getTrustBundleStub.called, true);

          testCallback();
        });
      });
    });
  });

  ['sendOutputEvent', 'sendOutputEventBatch'].forEach(function (funcName) {
    describe('#' + funcName, function () {
      /*Tests_SRS_NODE_MODULE_CLIENT_18_019: [The `sendOutputEvent` method shall not throw if the `callback` is not passed. ]*/
      /*Tests_SRS_NODE_MODULE_CLIENT_18_022: [The `sendOutputEventBatch` method shall not throw if the `callback` is not passed. ]*/
      it('doesn\'t throw if no callback is given and the method exists on the transport', function () {
        var transport = new FakeTransport();
        var client = new ModuleClient(transport);
        client.open(function () {
          assert.doesNotThrow(function () {
            client[funcName]('message');
          });
        });
      });
    });
  });

  describe('#invokeMethod', function () {
    /*Test_SRS_NODE_MODULE_CLIENT_16_093: [`invokeMethod` shall throw a `ReferenceError` if the `deviceId` argument is falsy.]*/
    [undefined, null, ''].forEach(function (badDeviceId) {
      it('throws a ReferenceError if deviceId is \'' + badDeviceId + '\'', function () {
        var transport = new FakeTransport();
        var client = new ModuleClient(transport);
        assert.throws(function () {
          client.invokeMethod(badDeviceId, 'moduleId', {
            methodName: 'method'
          }, function () {});
        }, ReferenceError);
      });
    });

    /*Test_SRS_NODE_MODULE_CLIENT_16_094: [`invokeMethod` shall throw a `ReferenceError` if the `moduleIdOrMethodParams` argument is falsy.]*/
    [undefined, null, ''].forEach(function (badModuleId) {
      it('throws a ReferenceError if moduleIdOrMethodParams is \'' + badModuleId + '\'', function () {
        var transport = new FakeTransport();
        var client = new ModuleClient(transport);
        assert.throws(function () {
          client.invokeMethod('deviceId', badModuleId, {
            methodName: 'method'
          }, function () {});
        }, ReferenceError);
      });
    });

    [undefined, null, ''].forEach(function (badModuleId) {
      it('throws a ReferenceError if moduleIdOrMethodParams is \'' + badModuleId + '\'', function () {
        var transport = new FakeTransport();
        var client = new ModuleClient(transport);
        assert.throws(function () {
          client.invokeMethod('deviceId', badModuleId, function () {});
        }, ReferenceError);
      });
    });

    /*Test_SRS_NODE_MODULE_CLIENT_16_095: [`invokeMethod` shall throw a `ReferenceError` if the `deviceId` and `moduleIdOrMethodParams` are strings and the `methodParamsOrCallback` argument is falsy.]*/
    [undefined, null, ''].forEach(function (badParams) {
      it('throws a ReferenceError if moduleIdOrMethodParams is \'' + badParams + '\'', function () {
        var transport = new FakeTransport();
        var client = new ModuleClient(transport);
        assert.throws(function () {
          client.invokeMethod('deviceId', 'moduleId', badParams, function () {});
        }, ReferenceError);
      });
    });

    /*Test_SRS_NODE_MODULE_CLIENT_16_096: [`invokeMethod` shall throw a `ArgumentError` if the `methodName` property of the `MethodParams` argument is falsy.]*/
    [undefined, null, ''].forEach(function (badMethodName) {
      it('throws a ReferenceError if methodParams.methodName is \'' + badMethodName + '\'', function () {
        var transport = new FakeTransport();
        var client = new ModuleClient(transport);
        assert.throws(function () {
          client.invokeMethod('deviceId', 'moduleId', {
            methodName: badMethodName
          }, function () {});
        }, errors.ArgumentError);
      });
    });

    it('calls MethodClient.invokeMethod with the proper arguments when the target is a device', function () {
      var transport = new FakeTransport();
      var fakeMethodClient = {
        invokeMethod: sinon.stub()
      };
      var fakeMethodParams = {
        methodName: 'methodName'
      };
      var client = new ModuleClient(transport, fakeMethodClient);
      client.invokeMethod('deviceId', fakeMethodParams, function () {});
      assert.isTrue(fakeMethodClient.invokeMethod.calledOnce);
      assert.isTrue(fakeMethodClient.invokeMethod.calledWith('deviceId', null, fakeMethodParams));
    });

    /*Test_SRS_NODE_MODULE_CLIENT_16_097: [`invokeMethod` shall call the `invokeMethod` API of the `MethodClient` API that was created for the `ModuleClient` instance.]*/
    it('calls MethodClient.invokeMethod with the proper arguments when the target is a module', function () {
      var transport = new FakeTransport();
      var fakeMethodClient = {
        invokeMethod: sinon.stub()
      };
      var fakeMethodParams = {
        methodName: 'methodName'
      };
      var client = new ModuleClient(transport, fakeMethodClient);
      client.invokeMethod('deviceId', 'moduleId', fakeMethodParams, (_) => {});
      assert.isTrue(fakeMethodClient.invokeMethod.calledOnce);
      assert.isTrue(fakeMethodClient.invokeMethod.calledWith('deviceId', 'moduleId', fakeMethodParams));
    });
  });

  describe('#on(\'inputMessage\')', function () {
    /*Tests_SRS_NODE_MODULE_CLIENT_18_012: [ The `inputMessage` event shall be emitted when an inputMessage is received from the IoT Hub service. ]*/
    it('emits a message event when a message is received', function (done) {
      var fakeTransport = new FakeTransport();
      var client = new ModuleClient(fakeTransport);
      client.on('inputMessage', function (inputName, msg) {
        /*Tests_SRS_NODE_MODULE_CLIENT_18_013: [ The `inputMessage` event parameters shall be the inputName for the message and a `Message` object. ]*/
        assert.strictEqual(inputName, 'fakeInputName');
        assert.strictEqual(msg.constructor.name, 'Message');
        done();
      });

      fakeTransport.emit('inputMessage', 'fakeInputName', new Message());
    });
  });

  [{
    eventName: 'inputMessage',
    enableFunc: 'enableInputMessages',
    disableFunc: 'disableInputMessages'
  }].forEach(function (testConfig) {
    describe('#on(\'' + testConfig.eventName + '\')', function () {
      /*Tests_SRS_NODE_MODULE_CLIENT_18_014: [ The client shall start listening for messages from the service whenever there is a listener subscribed to the `inputMessage` event. ]*/
      it('starts listening for messages when a listener subscribes to the message event', function () {
        var fakeTransport = new FakeTransport();
        sinon.spy(fakeTransport, testConfig.enableFunc);
        var client = new ModuleClient(fakeTransport);

        // Calling 'on' twice to make sure it's called only once on the receiver.
        // It works because the test will fail if the test callback is called multiple times, and it's called for every time the testConfig.eventName event is subscribed on the receiver.
        client.on(testConfig.eventName, function () {});
        client.on(testConfig.eventName, function () {});
        assert.isTrue(fakeTransport[testConfig.enableFunc].calledOnce);
      });

      /*Tests_SRS_NODE_MODULE_CLIENT_18_015: [ The client shall stop listening for messages from the service whenever the last listener unsubscribes from the `inputMessage` event. ]*/
      it('stops listening for messages when the last listener has unsubscribed', function (testCallback) {
        var fakeTransport = new FakeTransport();
        sinon.spy(fakeTransport, testConfig.enableFunc);
        sinon.spy(fakeTransport, testConfig.disableFunc);
        sinon.spy(fakeTransport, 'removeAllListeners');

        var client = new ModuleClient(fakeTransport);
        var listener1 = function () {};
        var listener2 = function () {};
        client.on(testConfig.eventName, listener1);
        client.on(testConfig.eventName, listener2);

        process.nextTick(function () {
          client.removeListener(testConfig.eventName, listener1);
          assert.isTrue(fakeTransport[testConfig.disableFunc].notCalled);
          client.removeListener(testConfig.eventName, listener2);
          assert(fakeTransport[testConfig.disableFunc].calledOnce);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_MODULE_CLIENT_18_017: [ The client shall emit an `error` if connecting the transport fails while subscribing to `inputMessage` events. ]*/
      it('emits an error if it fails to start listening for messages', function (testCallback) {
        var fakeTransport = new FakeTransport();
        var fakeError = new Error('fake');
        sinon.stub(fakeTransport, testConfig.enableFunc).callsFake(function (callback) {
          callback(fakeError);
        });
        var client = new ModuleClient(fakeTransport);
        client.on('error', function (err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        })

        client.on(testConfig.eventName, function () {});
        assert.isTrue(fakeTransport[testConfig.enableFunc].calledOnce);
      });

      /*Tests_SRS_NODE_MODULE_CLIENT_16_097: [The client shall emit an `error` if connecting the transport fails while unsubscribing to `inputMessage` events.]*/
      it('emits an error if it fails to stop listening for messages', function (testCallback) {
        var fakeTransport = new FakeTransport();
        var fakeError = new Error('fake');
        sinon.spy(fakeTransport, testConfig.enableFunc);
        sinon.stub(fakeTransport, testConfig.disableFunc).callsFake(function (callback) {
          callback(fakeError);
        });
        var client = new ModuleClient(fakeTransport);
        client.on('error', function (err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        })

        client.on(testConfig.eventName, function () {});
        assert.isTrue(fakeTransport[testConfig.enableFunc].calledOnce);
        client.removeAllListeners(testConfig.eventName);
        assert.isTrue(fakeTransport[testConfig.disableFunc].calledOnce);
      });
    });
  });

  describe('#setOptions', function () {
    var fakeMethodClient = {
      setOptions: sinon.stub()
    };

    /*Tests_SRS_NODE_MODULE_CLIENT_16_042: [The `setOptions` method shall throw a `ReferenceError` if the options object is falsy.]*/
    [null, undefined].forEach(function (options) {
      it('throws is options is ' + options, function () {
        var client = new ModuleClient(new EventEmitter(), fakeMethodClient);
        assert.throws(function () {
          client.setOptions(options, function () {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_MODULE_CLIENT_16_043: [The `done` callback shall be invoked no parameters when it has successfully finished setting the client and/or transport options.]*/
    it('calls the done callback with no parameters when it has successfully configured the transport', function (done) {
      var client = new ModuleClient(new FakeTransport(), fakeMethodClient);
      client.setOptions({}, done);
    });

    /*Tests_SRS_NODE_MODULE_CLIENT_16_044: [The `done` callback shall be invoked with a standard javascript `Error` object and no result object if the client could not be configured as requested.]*/
    it('calls the done callback with an error when it failed to configured the transport', function (done) {
      var failingTransport = new FakeTransport();
      sinon.stub(failingTransport, 'setOptions').callsFake(function (options, done) {
        done(new Error('dummy error'));
      });

      var client = new ModuleClient(failingTransport, fakeMethodClient);
      client.setOptions({}, function (err) {
        assert.instanceOf(err, Error);
        done();
      });
    });

    /*Tests_SRS_NODE_MODULE_CLIENT_16_098: [The `setOptions` method shall call the `setOptions` method with the `options` argument on the `MethodClient` object of the `ModuleClient`.]*/
    it('calls setOptions on the MethodClient', function () {
      var methodClient = {
        setOptions: sinon.stub()
      };
      var fakeOptions = {};
      var client = new ModuleClient(new FakeTransport(), methodClient);
      client.setOptions(fakeOptions);
      assert.isTrue(methodClient.setOptions.calledOnce);
      assert.isTrue(methodClient.setOptions.calledWith(fakeOptions));
    });
  });


  describe('#onMethod', function () {
    var FakeMethodTransport = function (config) {
      EventEmitter.call(this);
      this.config = config;

      this.connect = function (callback) {
        callback(null, new results.Connected());
      }

      this.disconnect = function (callback) {
        callback(null, new results.Disconnected());
      }

      // causes a mock method event to be raised
      this.emitMethodCall = function (methodName) {
        this.emit('method_' + methodName, {
          methods: {
            methodName: methodName
          },
          body: JSON.stringify(''),
          requestId: '42'
        });
      };

      this.onDeviceMethod = function (methodName, callback) {
        this.on('method_' + methodName, callback);
      };

      this.sendMethodResponse = function (response, done) {
        response = response;
        if (!!done && typeof (done) === 'function') {
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

    // Tests_SRS_NODE_MODULE_CLIENT_13_020: [ onMethod shall throw a ReferenceError if methodName is falsy. ]
    [undefined, null].forEach(function (methodName) {
      it('throws ReferenceError when methodName is "' + methodName + '"', function () {
        var transport = new FakeMethodTransport();
        var client = new ModuleClient(transport);
        assert.throws(function () {
          client.onMethod(methodName, function () {});
        }, ReferenceError);
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_024: [ onMethod shall throw a TypeError if methodName is not a string. ]
    [new Date(), 42].forEach(function (methodName) {
      it('throws TypeError when methodName is "' + methodName + '"', function () {
        var transport = new FakeMethodTransport();
        var client = new ModuleClient(transport);
        assert.throws(function () {
          client.onMethod(methodName, function () {});
        }, TypeError);
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_022: [ onMethod shall throw a ReferenceError if callback is falsy. ]
    [undefined, null].forEach(function (callback) {
      it('throws ReferenceError when callback is "' + callback + '"', function () {
        var transport = new FakeMethodTransport();
        var client = new ModuleClient(transport);
        assert.throws(function () {
          client.onMethod('doSomeTests', callback);
        }, ReferenceError);
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_025: [ onMethod shall throw a TypeError if callback is not a Function. ]
    ['not_a_function', 42].forEach(function (callback) {
      it('throws ReferenceError when callback is "' + callback + '"', function () {
        var transport = new FakeMethodTransport();
        var client = new ModuleClient(transport);
        assert.throws(function () {
          client.onMethod('doSomeTests', callback);
        }, TypeError);
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_001: [ The onMethod method shall cause the callback function to be invoked when a cloud-to-device method invocation signal is received from the IoT Hub service. ]
    it('calls callback when C2D method call arrives', function (done) {
      // setup
      var transport = new FakeMethodTransport();
      var client = new ModuleClient(transport);
      client.open(function () {
        client.onMethod('firstMethod', function () {}); // This will connect the method receiver
        client.onMethod('reboot', function () {
          done();
        });
      });
      2

      // test
      transport.emitMethodCall('reboot');
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_003: [ The client shall start listening for method calls from the service whenever there is a listener subscribed for a method callback. ]
    it('registers callback on transport when a method event is subscribed to', function () {
      // setup
      var transport = new FakeMethodTransport();
      var client = new ModuleClient(transport);
      var callback = sinon.spy();
      transport.on('newListener', callback);

      // test
      client.onMethod('reboot', function () {});

      // assert
      assert.isTrue(callback.withArgs('method_reboot').calledOnce);

      // cleanup
      transport.removeListener('newListener', callback);
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_023: [ onMethod shall throw an Error if a listener is already subscribed for a given method call. ]
    it('throws if a listener is already subscribed for a method call', function () {
      // setup
      var transport = new FakeMethodTransport();
      var client = new ModuleClient(transport);
      client.onMethod('reboot', function () {});

      // test
      // assert
      assert.throws(function () {
        client.onMethod('reboot', function () {});
      });
    });

    it('emits an error if the transport fails to enable the methods feature', function (testCallback) {
      var transport = new FakeMethodTransport();
      var fakeError = new Error('fake');
      sinon.stub(transport, 'enableMethods').callsFake(function (callback) {
        callback(fakeError);
      });
      var client = new ModuleClient(transport);
      client.on('error', function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      })
      client.onMethod('firstMethod', function () {}); // This will connect the method receiver
    });
  });

  describe('transport.on(\'disconnect\') handler', function () {
    var fakeTransport, fakeRetryPolicy;
    beforeEach(function () {
      fakeRetryPolicy = {
        shouldRetry: function () {
          return true;
        },
        nextRetryTimeout: function () {
          return 1;
        }
      };

      fakeTransport = new EventEmitter();
      fakeTransport.enableMethods = sinon.stub().callsArg(0);
      fakeTransport.onDeviceMethod = sinon.stub();
    });

    /*Tests_SRS_NODE_MODULE_CLIENT_16_099: [If the transport emits a `disconnect` event while the client is subscribed to direct methods the retry policy shall be used to reconnect and re-enable the feature using the transport `enableTwinDesiredPropertiesUpdates` method.]*/
    it('reenables device methods after being disconnected if methods were enabled', function () {
      var client = new ModuleClient(fakeTransport);
      client.setRetryPolicy(fakeRetryPolicy);
      client.onMethod('method', function () {});
      assert.isTrue(fakeTransport.enableMethods.calledOnce);
      fakeTransport.emit('disconnect', new errors.TimeoutError()); // timeouts can be retried
      assert.isTrue(fakeTransport.enableMethods.calledTwice);
    });

    /*Tests_SRS_NODE_MODULE_CLIENT_16_100: [If the retry policy fails to reestablish the direct methods functionality a `disconnect` event shall be emitted with a `results.Disconnected` object.]*/
    it('emits a disconnect event if reenabling methods fails', function (testCallback) {
      var fakeError = new Error('fake');
      var client = new ModuleClient(fakeTransport);
      client.on('disconnect', function (err) {
        assert.instanceOf(err, results.Disconnected);
        assert.strictEqual(err.transportObj, fakeError);
        testCallback();
      });

      client.setRetryPolicy(fakeRetryPolicy);
      client._maxOperationTimeout = 1;
      client.onMethod('method', function () {});
      assert.isTrue(fakeTransport.enableMethods.calledOnce);
      fakeTransport.enableMethods = sinon.stub().callsArgWith(0, fakeError);
      fakeTransport.emit('disconnect', new errors.TimeoutError()); // timeouts can be retried
    });
  });
});