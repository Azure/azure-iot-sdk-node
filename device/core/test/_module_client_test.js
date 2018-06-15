// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var ModuleClient = require('../lib/module_client').ModuleClient;
var IotEdgeAuthenticationProvider = require('../lib/iotedge_authentication_provider').IotEdgeAuthenticationProvider;
var SharedAccessSignature = require('azure-iot-common').SharedAccessSignature;

describe('ModuleClient', function() {
  describe('#fromEnvironment', function() {
    // Tests_SRS_NODE_MODULE_CLIENT_13_033: [ The fromEnvironment method shall throw a ReferenceError if the callback argument is falsy or is not a function. ]
    [null, undefined, 'not a function', 20].forEach(function(badCallback) {
      it('throws if callback is falsy or not a function', function() {
        assert.throws(function() {
          return ModuleClient.fromEnvironment(null, badCallback);
        }, ReferenceError);
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_026: [ The fromEnvironment method shall invoke callback with a ReferenceError if the transportCtor argument is falsy. ]
    [null, undefined].forEach(function(badTransport) {
      it('fails if the transportCtor is falsy', function() {
        ModuleClient.fromEnvironment(badTransport, function(err) {
          assert.instanceOf(err, ReferenceError);
        });
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_028: [ The fromEnvironment method shall delegate to ModuleClient.fromConnectionString if an environment variable called EdgeHubConnectionString or IotHubConnectionString exists. ]
    ['EdgeHubConnectionString', 'IotHubConnectionString'].forEach(function(envName) {
      describe('calls ModuleClient.fromConnectionString', function() {
        var stub;
        beforeEach(function() {
          stub = sinon.stub(ModuleClient, 'fromConnectionString').returns(42);
          process.env[envName] = 'cs';
        });

        afterEach(function() {
          stub.restore();
          delete process.env[envName];
        });

        it('if env ' + envName + ' is defined', function() {
          ModuleClient.fromEnvironment(function() {}, function(err, client) {
            assert.isNotOk(err);
            assert.strictEqual(client, 42);
            assert.strictEqual(stub.called, true);
            assert.strictEqual(stub.args[0][0], 'cs');
          });
        });
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_034: [ If the client is running in a non-edge mode and an environment variable named EdgeModuleCACertificateFile exists then its value shall be set as the CA cert for the transport via the transport's setOptions method passing in the CA as the value for the ca property in the options object. ]
    ['EdgeHubConnectionString', 'IotHubConnectionString'].forEach(function(envName) {
      describe('sets CA cert in non-edge mode', function() {
        var stub;
        
        var transport = {
          setOptions: function() {}
        };
        var setOptionsStub = sinon.stub(transport, 'setOptions');

        beforeEach(function() {
          stub = sinon.stub(ModuleClient, 'fromConnectionString')
            .callsArgWith(1, 'auth provider')
            .returns(42);
          process.env[envName] = 'cs';
          process.env.EdgeModuleCACertificateFile = 'ca cert';
        });

        afterEach(function() {
          stub.restore();
          delete process.env[envName];
          delete process.env['EdgeModuleCACertificateFile'];
        });

        it('if env ' + envName + ' is defined', function() {
          ModuleClient.fromEnvironment(function(authProvider) {
            assert.strictEqual(authProvider, 'auth provider');
            return transport;
          }, function(err, client) {
            assert.isNotOk(err);
            assert.strictEqual(client, 42);
            assert.strictEqual(stub.called, true);
            assert.strictEqual(stub.args[0][0], 'cs');
            assert.strictEqual(setOptionsStub.called, true);
            assert.strictEqual(setOptionsStub.args[0][0].ca, 'ca cert');
          });
        });
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_029: [ If environment variables EdgeHubConnectionString and IotHubConnectionString do not exist then the following environment variables must be defined: IOTEDGE_WORKLOADURI, IOTEDGE_DEVICEID, IOTEDGE_MODULEID, IOTEDGE_IOTHUBHOSTNAME, IOTEDGE_AUTHSCHEME and IOTEDGE_MODULEGENERATIONID. ]
    describe('validates required env vars', function() {
      var requiredVars = [
        'IOTEDGE_WORKLOADURI',
        'IOTEDGE_DEVICEID',
        'IOTEDGE_MODULEID',
        'IOTEDGE_IOTHUBHOSTNAME',
        'IOTEDGE_AUTHSCHEME',
        'IOTEDGE_MODULEGENERATIONID'
      ];
      var varIndex = 0;

      beforeEach(function() {
        // add a value for all vars in requiredVars to the environment except
        // for the one at varIndex
        for (var index = 0; index < requiredVars.length; index++) {
          if (index !== varIndex) {
            process.env[requiredVars[index]] = '42';
          }
        }
        varIndex++;
      });

      afterEach(function() {
        // delete all the vars
        for (var index = 0; index < requiredVars.length; index++) {
          delete process.env[requiredVars[index]];
        }
      });

      requiredVars.forEach(function(_, index) {
        it('fails if env var ' + requiredVars[index] + ' is not defined', function() {
          ModuleClient.fromEnvironment(function() {}, function(err) {
            assert.isOk(err);
            assert.instanceOf(err, ReferenceError);
          });
        });
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_030: [ The value for the environment variable IOTEDGE_AUTHSCHEME must be sasToken. ]
    describe('check IOTEDGE_AUTHSCHEME', function() {
      var requiredVars = ['IOTEDGE_WORKLOADURI', 'IOTEDGE_DEVICEID', 'IOTEDGE_MODULEID', 'IOTEDGE_IOTHUBHOSTNAME', 'IOTEDGE_MODULEGENERATIONID'];

      var getTrustBundleStub;
      var createWithSigningFunctionStub;

      beforeEach(function() {
        for (var index = 0; index < requiredVars.length; index++) {
          process.env[requiredVars[index]] = '42';
        }
        process.env['IOTEDGE_WORKLOADURI'] = 'http://iotedged';

        getTrustBundleStub = sinon.stub(IotEdgeAuthenticationProvider.prototype, 'getTrustBundle')
          .callsArgWith(0, null, 'ca cert');

        createWithSigningFunctionStub = sinon.stub(SharedAccessSignature, 'createWithSigningFunction')
          .callsArgWith(3, null, 'sas token');
      });

      afterEach(function() {
        // delete all the vars
        for (var index = 0; index < requiredVars.length; index++) {
          delete process.env[requiredVars[index]];
        }
        delete process.env['IOTEDGE_AUTHSCHEME'];
        delete process.env['IOTEDGE_WORKLOADURI'];

        getTrustBundleStub.restore();
        createWithSigningFunctionStub.restore();
      });

      it('fails if value is not sasToken', function() {
        process.env['IOTEDGE_AUTHSCHEME'] = 'NotSasToken';
        ModuleClient.fromEnvironment(function() {}, function(err) {
          assert.isOk(err);
          assert.instanceOf(err, ReferenceError);
        });
      });

      it('auth scheme value is case insensitive', function() {
        process.env['IOTEDGE_AUTHSCHEME'] = 'SASTOKEN';
        ModuleClient.fromEnvironment(function(provider) {
          assert.strictEqual(provider._authConfig.authScheme, 'SASTOKEN');
          return {
            on: function() {},
            setOptions: function() {}
          };
        }, function(err, client) {
          assert.isNotOk(err);
          assert.isOk(client);
        });
      });
    });

    describe('check create', function() {
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

      beforeEach(function() {
        env.forEach(function(e) {
          process.env[e[0]] = e[1];
        });

        getTrustBundleStub = sinon.stub(IotEdgeAuthenticationProvider.prototype, 'getTrustBundle')
          .callsArgWith(0, null, 'ca cert');

        createWithSigningFunctionStub = sinon.stub(SharedAccessSignature, 'createWithSigningFunction')
          .callsArgWith(3, null, 'sas token');
      });

      afterEach(function() {
        env.forEach(function(e) {
          delete process.env[e[0]];
        });

        getTrustBundleStub.restore();
        createWithSigningFunctionStub.restore();
      });

      // Tests_SRS_NODE_MODULE_CLIENT_13_032: [ The fromEnvironment method shall create a new IotEdgeAuthenticationProvider object and pass this to the transport constructor. ]
      // Tests_SRS_NODE_MODULE_CLIENT_13_031: [ The fromEnvironment method shall invoke the callback with a new instance of the ModuleClient object. ]
      it('creates IotEdgeAuthenticationProvider', function(testCallback) {
        var transport = {
          on: sinon.stub(),
          setOptions: sinon.stub()
        };
        var transportStub = sinon.stub().returns(transport);
        ModuleClient.fromEnvironment(transportStub, function(err, client) {
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

    describe('trust bundle', function() {
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
  
      beforeEach(function() {
        env.forEach(function(e) {
          process.env[e[0]] = e[1];
        });

        getTrustBundleStub = sinon.stub(IotEdgeAuthenticationProvider.prototype, 'getTrustBundle')
          .callsArgWith(0, null, 'ca cert');

        createWithSigningFunctionStub = sinon.stub(SharedAccessSignature, 'createWithSigningFunction')
          .callsArgWith(3, null, 'sas token');
      });
  
      afterEach(function() {
        env.forEach(function(e) {
          delete process.env[e[0]];
        });

        getTrustBundleStub.restore();
        createWithSigningFunctionStub.restore();
      });
  
      // Tests_SRS_NODE_MODULE_CLIENT_13_035: [ If the client is running in edge mode then the IotEdgeAuthenticationProvider.getTrustBundle method shall be invoked to retrieve the CA cert and the returned value shall be set as the CA cert for the transport via the transport's setOptions method passing in the CA value for the ca property in the options object. ]
      it('sets cert on transport', function(testCallback) {
        var transport = {
          on: sinon.stub(),
          setOptions: sinon.stub()
        };
        var transportStub = sinon.stub().returns(transport);
        ModuleClient.fromEnvironment(transportStub, function(err, client) {
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

    describe('trust bundle', function() {
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
  
      beforeEach(function() {
        env.forEach(function(e) {
          process.env[e[0]] = e[1];
        });

        getTrustBundleStub = sinon.stub(IotEdgeAuthenticationProvider.prototype, 'getTrustBundle')
          .callsArgWith(0, 'whoops');
        
        createWithSigningFunctionStub = sinon.stub(SharedAccessSignature, 'createWithSigningFunction')
          .callsArgWith(3, null, 'sas token');
      });
  
      afterEach(function() {
        env.forEach(function(e) {
          delete process.env[e[0]];
        });

        getTrustBundleStub.restore();
        createWithSigningFunctionStub.restore();
      });
  
      it('fails if getTrustBundle fails', function(testCallback) {
        var transport = {
          on: sinon.stub(),
          setOptions: sinon.stub()
        };
        var transportStub = sinon.stub().returns(transport);
        ModuleClient.fromEnvironment(transportStub, function(err, client) {
          assert.isOk(err);
          assert.strictEqual(err, 'whoops');
          assert.strictEqual(getTrustBundleStub.called, true);

          testCallback();
        });
      });
    });
  });
});
