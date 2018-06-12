// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var EventEmitter = require('events');
var assert = require('chai').assert;
var errors = require('azure-iot-common').errors;
var sinon = require('sinon');
var ModuleClient = require('../lib/module_client').ModuleClient;
var IotEdgeAuthenticationProvider = require('../lib/iotedge_authentication_provider').IotEdgeAuthenticationProvider;

describe('ModuleClient', function() {
  describe('#fromEnvironment', function() {
    // Tests_SRS_NODE_MODULE_CLIENT_13_026: [ The fromEnvironment method shall throw a ReferenceError if the transportCtor argument is falsy. ]
    [null, undefined].forEach(function(badTransport) {
      it('throws if the transportCtor is falsy', function() {
        assert.throws(function() {
          return ModuleClient.fromEnvironment(badTransport);
        }, ReferenceError);
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
          var client = ModuleClient.fromEnvironment(function() {});
          assert.strictEqual(client, 42);
          assert.strictEqual(stub.called, true);
          assert.strictEqual(stub.args[0][0], 'cs');
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
        it('throws if env var ' + requiredVars[index] + ' is not defined', function() {
          assert.throws(function() {
            ModuleClient.fromEnvironment(function() {});
          }, errors.ReferenceError);
        });
      });
    });

    // Tests_SRS_NODE_MODULE_CLIENT_13_030: [ The value for the environment variable IOTEDGE_AUTHSCHEME must be SasToken. ]
    describe('check IOTEDGE_AUTHSCHEME', function() {
      var requiredVars = ['IOTEDGE_WORKLOADURI', 'IOTEDGE_DEVICEID', 'IOTEDGE_MODULEID', 'IOTEDGE_IOTHUBHOSTNAME', 'IOTEDGE_MODULEGENERATIONID'];

      beforeEach(function() {
        for (var index = 0; index < requiredVars.length; index++) {
          process.env[requiredVars[index]] = '42';
        }
      });

      afterEach(function() {
        // delete all the vars
        for (var index = 0; index < requiredVars.length; index++) {
          delete process.env[requiredVars[index]];
        }
        delete process.env['IOTEDGE_AUTHSCHEME'];
      });

      it('throws if value is not SasToken', function() {
        assert.throws(function() {
          process.env['IOTEDGE_AUTHSCHEME'] = 'NotSasToken';
          ModuleClient.fromEnvironment(function() {});
        }, errors.ReferenceError);
      });
    });

    describe('check create', function() {
      var env = [
        ['IOTEDGE_WORKLOADURI', 'unix:///var/run/iotedge.w.sock'],
        ['IOTEDGE_DEVICEID', 'd1'],
        ['IOTEDGE_MODULEID', 'm1'],
        ['IOTEDGE_IOTHUBHOSTNAME', 'host1'],
        ['IOTEDGE_AUTHSCHEME', 'SasToken'],
        ['IOTEDGE_GATEWAYHOSTNAME', 'gwhost'],
        ['IOTEDGE_MODULEGENERATIONID', 'g1']
      ];

      beforeEach(function() {
        env.forEach(function(e) {
          process.env[e[0]] = e[1];
        });
      });

      afterEach(function() {
        env.forEach(function(e) {
          delete process.env[e[0]];
        });
      });

      // Tests_SRS_NODE_MODULE_CLIENT_13_032: [ The fromEnvironment method shall create a new IotEdgeAuthenticationProvider object and pass this to the transport constructor. ]
      // Tests_SRS_NODE_MODULE_CLIENT_13_031: [ The fromEnvironment method shall return a new instance of the ModuleClient object. ]
      it('creates IotEdgeAuthenticationProvider', function() {
        var transportStub = sinon.stub().returns(new EventEmitter());
        var client = ModuleClient.fromEnvironment(transportStub);
        assert.strictEqual(transportStub.called, true);
        var provider = transportStub.args[0][0];
        assert.isOk(provider);
        assert.strictEqual(provider._authConfig.workloadUri, 'unix:///var/run/iotedge.w.sock');
        assert.strictEqual(provider._authConfig.deviceId, 'd1');
        assert.strictEqual(provider._authConfig.moduleId, 'm1');
        assert.strictEqual(provider._authConfig.iothubHostName, 'host1');
        assert.strictEqual(provider._authConfig.authScheme, 'SasToken');
        assert.strictEqual(provider._authConfig.gatewayHostName, 'gwhost');
        assert.strictEqual(provider._authConfig.generationId, 'g1');
        assert.instanceOf(provider, IotEdgeAuthenticationProvider);
        assert.instanceOf(client, ModuleClient);
      });
    });
  });
});
