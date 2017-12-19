// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var common = require("azure-iot-common");
var TpmSecurityClient  = require('../lib/tpm').TpmSecurityClient ;
var tss = require("tss.js");
var sinon = require('sinon');

var assert = require('chai').assert;

var fakeSimpleTpmClient = {
  allowErrors: () => {return this},
  connect: (callback) => {callback();},
  ReadPublic: (handle, callback) => {
    callback(null,null);
  },
  fakeSimpleTpmClient: () => {},
  getLastResponseCode: () => {
    return tss.TPM_RC.SUCCESS;
  }

}
function testFalsyArg(methodUnderTest, argName, argValue, ExpectedErrorType) {
  var errorName = ExpectedErrorType ? ExpectedErrorType.name : 'Error';
  it('Throws a ' + errorName + ' if \'' + argName + '\' is \'' + JSON.stringify(argValue) + '\' (type:' + typeof(argValue) + ')', function() {
    var client = new TpmSecurityClient(null, fakeSimpleTpmClient);
    assert.throws(function() {
      client[methodUnderTest](argValue, function() {});
    }, ExpectedErrorType);
  });
}


describe('tpm', function () {

  describe('getEndorsementKey', function() {
    it('returns the endorsement key', function(done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_006: [The `getEndorsementKey` function shall query the TPM hardware and return the `endorsementKey` in the callback.] */
      var client = new TpmSecurityClient(undefined, fakeSimpleTpmClient );
      var persistStub = sinon.stub(client,'_createPersistentPrimary');
      persistStub.withArgs('EK').callsArgWith(4, null, TpmSecurityClient._ekTemplate);
      persistStub.withArgs('SRK').callsArgWith(4, null, TpmSecurityClient._srkTemplate);
      client.getEndorsementKey((err, localEk) => {
        assert.deepEqual(localEk, TpmSecurityClient._ekTemplate.asTpm2B(), 'Invalid endorsement key returned.');
        done();
      });
    });

    it('handles an error', function(done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_007: [Any errors from interacting with the TPM hardware will cause in SecurityDeviceError to be returned in the err parameter of the callback.] */
      var client = new TpmSecurityClient(undefined, fakeSimpleTpmClient );
      var deviceError = new common.errors.SecurityDeviceError('A device Error');
      var persistStub = sinon.stub(client,'_createPersistentPrimary');
      persistStub.withArgs('EK').callsArgWith(4, deviceError);
      client.getEndorsementKey((err, localEk) => {
        assert.isNotOk(localEk, 'Invalid endorsement key returned.');
        assert.strictEqual(deviceError, err, 'improper error returned.')
        done();
      });
    });


  });

  describe('getStorageRootKey', function() {
    it('returns the storage root key', function(done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_008: [The `getStorageRootKey` function shall query the TPM hardware and return the `storageRootKey` in the callback.] */
      var client = new TpmSecurityClient(undefined, fakeSimpleTpmClient );
      var persistStub = sinon.stub(client,'_createPersistentPrimary');
      persistStub.withArgs('EK').callsArgWith(4, null, TpmSecurityClient._ekTemplate);
      persistStub.withArgs('SRK').callsArgWith(4, null, TpmSecurityClient._srkTemplate);
      client.getStorageRootKey((err, localSrk) => {
        assert.deepEqual(localSrk, TpmSecurityClient._srkTemplate.asTpm2B(), 'Invalid storage root key returned.');
        done();
      });
    });

    it('handles an error', function(done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_009: [Any errors from interacting with the TPM hardware will cause in SecurityDeviceError to be returned in the err parameter of the callback.] */
      var client = new TpmSecurityClient(undefined, fakeSimpleTpmClient );
      var deviceError = new common.errors.SecurityDeviceError('A device Error');
      var persistStub = sinon.stub(client,'_createPersistentPrimary');
      persistStub.withArgs('EK').callsArgWith(4, null, TpmSecurityClient._ekTemplate);
      persistStub.withArgs('SRK').callsArgWith(4, deviceError);
      client.getStorageRootKey((err, localSrk) => {
        assert.isNotOk(localSrk, 'Invalid storage root key returned.');
        assert.strictEqual(deviceError, err, 'improper error returned.')
        done();
      });
    });
  });

  describe('signWithIdentity', function() {
    [undefined, null,'', 0].forEach(function(falsyDataToSign) {
      testFalsyArg('signWithIdentity', 'dataToSign', falsyDataToSign, ReferenceError);
    });

    it.only('must call activateSymmetricIdentity first', function() {
      var client = new TpmSecurityClient('registration', fakeSimpleTpmClient);

      var activateStub = sinon.stub(client,'_activateSymmetricIdentity')
      activateStub.callsFake((callback) => {this._idKeyPub = null;callback(null,1)});
      assert.throws(client.signWithIdentity([1], (errorFromIdentity, signResult) => {}), common.errors.ArgumentError);
    });
  });

  describe('activateSymmetricIdentity', function() {
    [undefined, null,'', 0].forEach(function(falsyIdentityKey) {
      testFalsyArg('activateSymmetricIdentity', 'identityKey', falsyIdentityKey, ReferenceError);
    });
  });

  describe('getRegistrationId', function() {
    /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_003: [If the TpmSecurityClient was given a `registrationId` at creation, that `registrationId` will be returned.] */
    it('returns original id', function(done) {
      var providedRegistrationClient = new TpmSecurityClient('registration', fakeSimpleTpmClient );
      providedRegistrationClient.getRegistrationId((err, id) => {
        assert.strictEqual(id, 'registration', 'Incorrect registration Id.' );
        done();
      });
    });

    it('returns constructed registration id', function(done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_004: [If not provided, the `registrationId` will be constructed and returned as follows:
        The endorsementKey will be queried.
        The endorsementKey will be hashed utilizing SHA256.
        The resultant digest will be base 32 encoded in conformance with the `RFC4648` specification.
        The resultant string will have terminating `=` characters removed.] */
      var providedRegistrationClient = new TpmSecurityClient(undefined, fakeSimpleTpmClient );
      sinon.stub(providedRegistrationClient,'getEndorsementKey').callsArgWith(0, null, 'registration');
      providedRegistrationClient.getRegistrationId((err, id) => {
        assert.strictEqual(id, 'vfn2bxtbqwc3pcflozty5reiunt5qm4ztk4ulrszujmqj3zbei2a', 'Incorrect registration Id.' );
        done();
      });
    });

    it('handles an error', function(done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_005: [Any errors from interacting with the TPM hardware will cause an InvalidOperationError to be returned in the err parameter of the callback.] */
      var errorFromGetEndorsement = new common.errors.InvalidOperationError('Error from hardware');
      var providedRegistrationClient = new TpmSecurityClient(undefined, fakeSimpleTpmClient );
      sinon.stub(providedRegistrationClient,'getEndorsementKey').callsArgWith(0, errorFromGetEndorsement, null);
      providedRegistrationClient.getRegistrationId((err, id) => {
        assert.strictEqual(err, errorFromGetEndorsement, 'Improper error returned');
        done();
      });
    });

  });

});

