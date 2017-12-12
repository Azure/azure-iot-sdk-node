// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var Client = require('../lib/client.js').Client;
var DiagnosticClient = require('../lib/client_diagnostic.js').DiagnosticClient;
var Diagnostics = require('../lib/client_diagnostic.js').Diagnostics;
var errors = require('azure-iot-common').errors;
var Message = require('azure-iot-common').Message;

describe('DiagnosticClient', function () {
  let sharedKeyConnectionString = 'HostName=host;DeviceId=id;SharedAccessKey=key';
  describe('#constructor', function () {
    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_01_001: [The DiagnosticClient constructor shall set diagSamplingPercentage and currentMessageNumber to 0.]*/
    it('set diagSamplingPercentage and currentMessageNumber to 0', function () {
      let clientDiagnostic = new DiagnosticClient();
      assert.equal(clientDiagnostic.diagSamplingPercentage, 0);
      assert.equal(clientDiagnostic.currentMessageNumber, 0);
    });
  });

  describe('#setDiagSamplingPercentage', function () {
    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_01_002: [The setDiagSamplingPercentage shall throw if type is not number.]*/
    it('throw if percentage is not number', function () {
      let clientDiagnostic = new DiagnosticClient();

      assert.throws(function () {
        clientDiagnostic.setDiagSamplingPercentage('fake value');
      }, errors.ArgumentError);
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_01_008: [The setDiagSamplingPercentage shall throw if type is not integer.]*/
    it('throw if percentage is not integer', function () {
      let clientDiagnostic = new DiagnosticClient();

      assert.throws(function () {
        clientDiagnostic.setDiagSamplingPercentage(1.5);
      }, errors.ArgumentError);
    });
  });

  describe('#shouldAddDiagnosticInfo', function () {
    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_01_003: [The shouldAddDiagnosticInfo shall always return true if diagSamplingPercentage is set to 100.]*/
    it('return true if diagSamplingPercentage set to 100', function () {
      let clientDiagnostic = new DiagnosticClient();
      clientDiagnostic.setDiagSamplingPercentage(100);
      clientDiagnostic.diagEnabled = true;
      let result = 0;
      for (let i = 0; i < 5; i++) {
        result += clientDiagnostic.shouldAddDiagnosticInfo() ? 1 : 0;
      }
      assert.equal(result, 5);
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_01_008: [The shouldAddDiagnosticInfo shall always return false if diagEnabled is set to false.]*/
    it('return false if diagEnabled set to false', function () {
      let clientDiagnostic = new DiagnosticClient();
      clientDiagnostic.setDiagSamplingPercentage(0);
      let result = 0;
      for (let i = 0; i < 5; i++) {
        result += clientDiagnostic.shouldAddDiagnosticInfo() ? 1 : 0;
      }
      assert.equal(result, 0);
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_01_004: [The shouldAddDiagnosticInfo shall always return false if diagSamplingPercentage is set to 0.]*/
    it('return false if diagSamplingPercentage set to 0', function () {
      let clientDiagnostic = new DiagnosticClient();
      clientDiagnostic.setDiagSamplingPercentage(0);
      clientDiagnostic.diagEnabled = true;
      let result = 0;
      for (let i = 0; i < 5; i++) {
        result += clientDiagnostic.shouldAddDiagnosticInfo() ? 1 : 0;
      }
      assert.equal(result, 0);
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_01_005: [The shouldAddDiagnosticInfo shall return value related to diagSamplingPercentage.]*/
    it('return value related to diagSamplingPercentage', function () {
      let clientDiagnostic = new DiagnosticClient();
      clientDiagnostic.setDiagSamplingPercentage(50);
      clientDiagnostic.diagEnabled = true;
      let result = 0;
      for (let i = 0; i < 10; i++) {
        result += clientDiagnostic.shouldAddDiagnosticInfo() ? 1 : 0;
      }
      assert.equal(result, 5);
    });
  });

  describe('#addDiagnosticInfoIfNecessary', function () {
    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_01_006: [The addDiagnosticInfoIfNecessary shall add property to message.]*/
    it('add property to message', function () {
      let clientDiagnostic = new DiagnosticClient();
      sinon.stub(clientDiagnostic, 'shouldAddDiagnosticInfo').returns(true);
      let message = new Message();
      clientDiagnostic.addDiagnosticInfoIfNecessary(message);
      assert.instanceOf(message.diagnostics, Diagnostics);
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_01_007: [The addDiagnosticInfoIfNecessary shall not add property to message if shouldAddDiagnosticInfo return false.]*/
    it('shall not add property to message if shouldAddDiagnosticInfo return false', function () {
      let clientDiagnostic = new DiagnosticClient();
      sinon.stub(clientDiagnostic, 'shouldAddDiagnosticInfo').returns(false);
      let message = new Message();
      clientDiagnostic.addDiagnosticInfoIfNecessary(message);
      assert.isNull(message.diagnostics);
    });
  });

  describe('#onDesiredTwinUpdate', function () {
    it('shall set diagEnabled and sampling rate', function () {
      let clientDiagnostic = new DiagnosticClient();
      let fakeTwin = {
        properties: {
          reported: {
            update: sinon.spy()
          }
        }
      }
      clientDiagnostic.onDesiredTwinUpdate(fakeTwin, {
        diag_enable: 'true',
        diag_sample_rate: 50,
      });
      assert.equal(clientDiagnostic.diagEnabled, true);
      assert.equal(clientDiagnostic.diagSamplingPercentage, 50);
    });

    it('shall report updated settings', function () {
      let clientDiagnostic = new DiagnosticClient();
      let fakeTwin = {
        properties: {
          reported: {
            update: sinon.spy()
          }
        }
      }
      clientDiagnostic.onDesiredTwinUpdate(fakeTwin, {
        diag_enable: 'true',
        diag_sample_rate: 50,
      });
      assert.isTrue(fakeTwin.properties.reported.update.calledWith({
        diag_enable: true,
        diag_sample_rate: 50,
        diag_error: ''
      }));
    });

    it('shall not change settings or report if desired twin does not contain diagnostic keys', function () {
      let clientDiagnostic = new DiagnosticClient();
      let fakeTwin = {
        properties: {
          reported: {
            update: sinon.spy()
          }
        }
      }
      clientDiagnostic.onDesiredTwinUpdate(fakeTwin, {
        otherthings: 'abcde'
      });
      assert.equal(clientDiagnostic.diagEnabled, false);
      assert.equal(clientDiagnostic.diagSamplingPercentage, 0);
      assert.isTrue(fakeTwin.properties.reported.update.notCalled);
    });

    it('shall report error if desired twin is invalid', function () {
      let clientDiagnostic = new DiagnosticClient();
      let fakeTwin = {
        properties: {
          reported: {
            update: sinon.spy()
          }
        }
      }
      clientDiagnostic.onDesiredTwinUpdate(fakeTwin, {
        diag_enable: 'true',
        diag_sample_rate: 101,
      });
      assert.deepEqual(fakeTwin.properties.reported.update.args[0][0], {
        diag_enable: true,
        diag_sample_rate: 0,
        diag_error: 'Value of diag_sample_rate is invalid:Sampling percentage should be [0,100] '
      });
    });
  });
});
