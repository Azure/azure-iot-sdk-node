// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var Client = require('../lib/client.js').Client;
var DiagnosticClient = require('../lib/client_diagnostic.js').DiagnosticClient;
var DiagnosticPropertyData = require('../lib/client_diagnostic.js').DiagnosticPropertyData;
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
      let result = 0;
      for (let i = 0; i < 5; i++) {
        result += clientDiagnostic.shouldAddDiagnosticInfo() ? 1 : 0;
      }
      assert.equal(result, 5);
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_01_004: [The shouldAddDiagnosticInfo shall always return false if diagSamplingPercentage is set to 0.]*/
    it('return false if diagSamplingPercentage set to 0', function () {
      let clientDiagnostic = new DiagnosticClient();
      clientDiagnostic.setDiagSamplingPercentage(0);
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
      assert.instanceOf(message.diagnosticPropertyData, DiagnosticPropertyData);
    });

    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_01_007: [The addDiagnosticInfoIfNecessary shall not add property to message if shouldAddDiagnosticInfo return false.]*/
    it('shall not add property to message if shouldAddDiagnosticInfo return false', function () {
      let clientDiagnostic = new DiagnosticClient();
      sinon.stub(clientDiagnostic, 'shouldAddDiagnosticInfo').returns(false);
      let message = new Message();
      clientDiagnostic.addDiagnosticInfoIfNecessary(message);
      assert.isNull(message.diagnosticPropertyData);
    });
  });
});

describe('DiagnosticPropertyData', function () {
  let fakeDiagnosticId = '12345678';
  let fakeDiagnosticTime = '1234567890.123';
  describe('#constructor', function () {
    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_02_001: [The DiagnosticPropertyData constructor throws if diagnosticId or diagnosticCreationTimeUtc is not valid.]*/
    it('throws if diagnosticId or diagnosticCreationTimeUtc is not valid', function () {
      let invalidValues = [null, undefined, ''];
      for (let value of invalidValues) {
        assert.throws(function () {
          new DiagnosticPropertyData(value, value);
        }, errors.ArgumentError);
      }
    });
  });

  describe('#setDiagnosticId', function () {
    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_02_002: [The setDiagnosticId shall throw if value is invalid.]*/
    it('throw if value is invalid', function () {
      let property = new DiagnosticPropertyData(fakeDiagnosticId, fakeDiagnosticTime);
      let invalidValues = [null, undefined, ''];
      for (let value of invalidValues) {
        assert.throws(function () {
          property.setDiagnosticId(value);
        }, errors.ArgumentError);
      }
    });
  });

  describe('#setDiagnosticCreationTimeUtc', function () {
    /*Tests_SRS_NODE_DEVICE_CLIENT_DIAGNOSTIC_02_003: [The setDiagnosticCreationTimeUtc shall throw if value is invalid.]*/
    it('throw if value is invalid', function () {
      let property = new DiagnosticPropertyData(fakeDiagnosticId, fakeDiagnosticTime);
      let invalidValues = [null, undefined, ''];
      for (let value of invalidValues) {
        assert.throws(function () {
          property.setDiagnosticCreationTimeUtc(value);
        }, errors.ArgumentError);
      }
    });
  });
});