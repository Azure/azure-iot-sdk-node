// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var sinon = require('sinon');
var assert = require('chai').assert;
var errors = require('azure-iot-common').errors;

var ProvisioningDeviceClient = require('../index.js').ProvisioningDeviceClient;

var fakeX509Security = {
  getCertificate: function() {},
  getCertificateChain: function() {}
};

var fakeTpmSecurity = {
  getEndorsementKey:function() {},
  getStorageRootKey:function() {},
  signWithIdentity:function() {},
  activateIdentityKey:function() {},
  cancel:function() {}
};

var fakeInvalidSecurity = {};

var fakeX509Transport = {
  setTransportOptions: function() {},
  endSession: function() {},
  registerX509: function() {}
};

var fakeTpmTransport = {
  getAuthenticationChallenge: function() {},
  register: function() {},
  cancel: function() {}
};


describe('ProvisioningDeviceClient', function () {
  describe('#create', function () {


      /* Tests_SRS_PROVISIONING_CLIENT_18_001: [ If `securityClient` supports x509 security and the `transport` supports x509 authentication, then `crate` shall return an `X509Registration` object. ] */
      it ('correctly returns an X509Registration object', function() {
        var client = ProvisioningDeviceClient.create(fakeX509Transport, fakeX509Security);
        assert.strictEqual(client.constructor.name, 'X509Registration' )
      });

      /* Tests_SRS_PROVISIONING_CLIENT_18_002: [ If `securityClient` supports x509 security and the `transport` does not support x509 authentication, then `crate` shall throw a `ArgumentError` exepction. ] */
      it ('throws when passed an x509 security object and non-x509 transport', function() {
        assert.throws(function() {
          ProvisioningDeviceClient.create(fakeX509Transport, fakeTpmSecurity);
        }, errors.ArgumentError);
      });

      /* Tests_SRS_PROVISIONING_CLIENT_18_003: [ If `securityClient` supports TPM security and the `transport` supports TPM authentication, then `create` shall return a `TpmRegistration` object. ] */
      it ('correctly returns an TpmRegistrationObject', function() {
        var client = ProvisioningDeviceClient.create(fakeTpmTransport, fakeTpmSecurity);
        assert.equal(client.constructor.name, 'TpmRegistration' )
      });

      /* Tests_SRS_PROVISIONING_CLIENT_18_004: [ If `securityClient` supports TPM security and the `transport` does not support TPM authentication, then `crate` shall throw a `ArgumentError` exepction. ] */
      it ('throws when passed a TPM security object and non-TPM transport', function() {
        assert.throws(function() {
          ProvisioningDeviceClient.create(fakeTpmTransport, fakeX509Security);
        }, errors.ArgumentError);
      });

      /* Tests_SRS_PROVISIONING_CLIENT_18_005: [ If `securityClient` does not support X509 or TPM security, then `create` shall show an `ArgumentError` exception. ] */
      it ('throws when passed an invalid securityClient object', function() {
        assert.throws(function() {
          ProvisioningDeviceClient.create(fakeTpmTransport, fakeInvalidSecurity);
        }, errors.ArgumentError);
      });
    });
  });