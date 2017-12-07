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

var fakeProvisioningHost = 'fakeHost';
var fakeIdScope = 'fakeIdScope';
var fakeRegistrationId = 'fakeRegistrationId';

var fakeResponse = {
  assignedHub: 'fakeHub',
  deviceId: 'fakeDeviceId'
};

describe('X509Registration', function () {
  describe('#register', function () {

    /* Tests_SRS_NODE_DPS_X509_REGISTRATION_18_001: [ `register` shall call `getCertificate` on the security object to acquire the X509 certificate. ] */
    /* Tests_SRS_NODE_DPS_X509_REGISTRATION_18_002: [ `register` shall call `register` on the pollingStateMachine and call `callback` with the result. ] */
    /* Tests_SRS_NODE_DPS_X509_REGISTRATION_18_004: [ `register` shall pass the certificate into the `setAuthentication` method on the transport ] */
    it ('gets an x509 cert and calls registerX509', function(callback) {
      var transport = {
        setAuthentication: sinon.spy(),
      };
      var security = {
        getCertificate: sinon.stub().callsArgWith(0, null, fakeX509Cert),
        getRegistrationId: sinon.stub().returns(fakeRegistrationId)
      };
      var clientObj = new X509Registration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj._pollingStateMachine.register = sinon.stub().callsArgWith(1, null, { registrationState: fakeResponse } );
      clientObj.register(function(err, response) {
        assert.isNotOk(err);
        assert.strictEqual(response, fakeResponse);
        assert(clientObj._pollingStateMachine.register.calledOnce);
        assert.strictEqual(clientObj._pollingStateMachine.register.firstCall.args[0].provisioningHost, fakeProvisioningHost);
        assert.strictEqual(clientObj._pollingStateMachine.register.firstCall.args[0].idScope, fakeIdScope);
        assert.strictEqual(clientObj._pollingStateMachine.register.firstCall.args[0].registrationId, fakeRegistrationId);
        assert(security.getCertificate.calledOnce);
        assert(transport.setAuthentication.calledOnce);
        assert.strictEqual(transport.setAuthentication.firstCall.args[0], fakeX509Cert);
        callback();
      });
    });

    /* Tests_SRS_NODE_DPS_X509_REGISTRATION_18_006: [ If `getCertificate`fails, `register` shall call `callback` with the error ] */
    it ('fails if getCertificate fails', function(callback) {
      var security = {
        getCertificate: sinon.stub().callsArgWith(0, new Error()),
        getRegistrationId: sinon.stub().returns(fakeRegistrationId)
      };
      var transport = {
        setAuthentication: function() {}
      };

      var clientObj = new X509Registration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj.register(function(err, response) {
        assert(security.getCertificate.calledOnce);
        assert.isOk(err);
        callback();
      });
    });

    /* Tests_SRS_NODE_DPS_X509_REGISTRATION_18_005: [ If `register` on the pollingStateMachine fails, `register` shall call `callback` with the error ] */
    it ('fails if register fails', function(callback) {
      var transport = {
        setAuthentication: function() {}
      };
      var security = {
        getCertificate: sinon.stub().callsArgWith(0, null, fakeX509Cert),
        getRegistrationId: sinon.stub().returns(fakeRegistrationId)
      };
      var clientObj = new X509Registration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj._pollingStateMachine.register = sinon.stub().callsArgWith(1, new Error());
      clientObj.register(function(err, response) {
        assert(security.getCertificate.calledOnce);
        assert(clientObj._pollingStateMachine.register.calledOnce);
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
      var clientObj = new X509Registration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj.cancel(function(err) {
        assert.isNotOk(err);
        assert(transport.cancel.calledOnce);
        callback();
      });

    });
  });
});

