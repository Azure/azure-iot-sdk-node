// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var sinon = require('sinon');
var assert = require('chai').assert;

var X509Registration = require('../lib/x509_registration').X509Registration;

var fakeX509Cert = {
  cert: 'fake_cert',
  key: 'fake_key'
};

var fakeRequest = {
  requestId: 'fakeRegistrationId',
  provisioningHost: 'fakeHost',
  idScope: 'fakeIdScope'
};

var fakeResponse = {
  assignedHub: 'fakeHub',
  deviceId: 'fakeDeviceId'
};

describe('X509Registration', function () {
  describe('#register', function () {

    /* Tests_SRS_NODE_DPS_X509_REGISTRATION_18_001: [ `register` shall call `getCertificate` on the security object to acquire the X509 certificate. ] */
    /* Tests_SRS_NODE_DPS_X509_REGISTRATION_18_002: [ `register` shall call `registerX509` on the transport object and call it's callback with the result of the transport operation. ] */
    it ('gets an x509 cert and calls registerX509', function(callback) {
      var transport = {
        registerX509: sinon.spy(function(request, auth, callback) { callback(null, fakeResponse); })
      };
      var security = {
        getCertificate: sinon.spy(function(callback) { callback(null, fakeX509Cert); })
      };
      var clientObj = new X509Registration(transport, security);
      clientObj.register(fakeRequest, function(err, response) {
        assert.isNotOk(err);
        assert.strictEqual(response, fakeResponse);
        assert(security.getCertificate.calledOnce);
        assert.strictEqual(transport.registerX509.getCall(0).args[0], fakeRequest);
        assert.strictEqual(transport.registerX509.getCall(0).args[1], fakeX509Cert);
        callback();
      });
    });

    it ('fails if getCertificate fails', function(callback) {
      var security = {
        getCertificate: sinon.spy(function(callback) { callback(new Error()); })
      };
      var clientObj = new X509Registration({}, security);
      clientObj.register(fakeRequest, function(err, response) {
        assert(security.getCertificate.calledOnce);
        assert.isOk(err);
        callback();
      });
    });

    it ('fails if registerX509 fails', function(callback) {
      var transport = {
        registerX509: sinon.spy(function(request, auth, callback) { callback(new Error()); })
      };
      var security = {
        getCertificate: sinon.spy(function(callback) { callback(null, fakeX509Cert); })
      };
      var clientObj = new X509Registration(transport, security);
      clientObj.register(fakeRequest, function(err, response) {
        assert(security.getCertificate.calledOnce);
        assert(transport.registerX509.calledOnce);
        assert.isOk(err);
        callback();
      });
    });
  });

  describe('#cancel', function () {
    /* Tests_SRS_NODE_DPS_X509_REGISTRATION_18_003: [ `cancel` shall call `cancel` on the transport object. ] */
    it ('calls cancel on the transport', function(callback) {
      var transport = {
        cancel: sinon.stub().callsArgWith(0, null)
      };
      var security = {};
      var clientObj = new X509Registration(transport, security);
      clientObj.cancel(function(err) {
        assert.isNotOk(err);
        assert(transport.cancel.calledOnce);
        callback();
      });

    });
  });
});

