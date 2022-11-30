// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
const common = require("azure-iot-common");
const TpmSecurityClient  = require('../dist/tpm').TpmSecurityClient ;
const tss = require("tss.js");
const sinon = require('sinon');
const assert = require('chai').assert;
const crypto = require("crypto");
const equals = require('array-equal');

const fakeEkKey = {
  outPublic: {
    asTpm2B: () => {return Buffer.from('fakeEndorsement');}
  }
};
const fakeCreatedEkKey = {
  outPublic: {
    asTpm2B: () => {return Buffer.from('fakeCreatedEndorsement');},
  },
  handle: TpmSecurityClient._ekPersistentHandle
};
const fakeSrkKey = {
  outPublic: {
    asTpm2B: () => {return Buffer.from('fakeStorageRoot');}
  }
};
const fakeCreatedSrkKey = {
  outPublic: {
    asTpm2B: () => {return Buffer.from('fakeCreatedStorageRoot');},
  },
  handle: TpmSecurityClient._srkPersistentHandle
};
const fakeIdKey = {
  outPublic: {
    asTpm2B: () => {return Buffer.from('fakeIdentity');}
  },
  parameters: { scheme: { hashAlg: 5 } }
};

function testFalsyArg(methodUnderTest, argName, argValue, ExpectedErrorType) {
  const errorName = ExpectedErrorType ? ExpectedErrorType.name : 'Error';
  it('Throws a ' + errorName + ' if \'' + argName + '\' is \'' + JSON.stringify(argValue) + '\' (type:' + typeof(argValue) + ')', function () {
    const tpm = new tss.Tpm();
    const client = new TpmSecurityClient(undefined, tpm);
    assert.throws(function () {
      client[methodUnderTest](argValue, function () {});
    }, ExpectedErrorType);
  });
}


describe('tpm', function () {
  describe('getEndorsementKey', function () {
    it('returns the endorsement key', function (done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_006: [The `getEndorsementKey` function shall query the TPM hardware and return the `endorsementKey` in the callback.] */
      const tpm = new tss.Tpm();
      const connectStub = sinon.stub(tpm, 'connect');
      connectStub.callsArgWith(0);
      const client = new TpmSecurityClient(undefined, tpm);
      const readPublicStub = sinon.stub(tpm, 'ReadPublic');
      readPublicStub.withArgs(TpmSecurityClient._ekPersistentHandle).callsArgWith(1, undefined, fakeEkKey);
      readPublicStub.withArgs(TpmSecurityClient._srkPersistentHandle).callsArgWith(1, undefined, fakeSrkKey);
      readPublicStub.withArgs(TpmSecurityClient._idKeyPersistentHandle).callsArgWith(1, undefined, fakeIdKey);
      client.getEndorsementKey((err, localEk) => {
        assert.deepEqual(localEk, fakeEkKey.outPublic.asTpm2B(), 'Invalid endorsement key returned.');
        done();
      });
    });

    it('handles an error', function (done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_007: [Any errors from interacting with the TPM hardware will cause in SecurityDeviceError to be returned in the err parameter of the callback.] */
      const tpm = new tss.Tpm();
      const connectStub = sinon.stub(tpm, 'connect');
      connectStub.callsArgWith(0);
      const client = new TpmSecurityClient(undefined, tpm);
      const deviceError = new common.errors.SecurityDeviceError('A device Error');
      const createPersistStub = sinon.stub(client,'_createPersistentPrimary');
      createPersistStub.withArgs('EK').callsArgWith(4, deviceError);
      client.getEndorsementKey((err, localEk) => {
        assert.isNotOk(localEk, 'Invalid endorsement key returned.');
        assert.strictEqual(deviceError, err, 'improper error returned.')
        done();
      });
    });

    it('creates an endorsement key if one does not exist', function (done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_017: [If the endorsement key does NOT exist, a new key will be created.] */
      const tpm = new tss.Tpm();
      const connectStub = sinon.stub(tpm, 'connect');
      connectStub.callsArgWith(0);
      const client = new TpmSecurityClient(undefined, tpm);
      const readPublicStub = sinon.stub(tpm, 'ReadPublic');
      readPublicStub.withArgs(TpmSecurityClient._ekPersistentHandle).callsArgWith(1, new tss.TpmError(tss.TPM_RC.BAD_TAG, '', ''));
      readPublicStub.withArgs(TpmSecurityClient._srkPersistentHandle).callsArgWith(1, undefined, fakeSrkKey);
      readPublicStub.withArgs(TpmSecurityClient._idKeyPersistentHandle).callsArgWith(1, undefined, fakeIdKey);
      const createPrimaryStub = sinon.stub(tpm, 'CreatePrimary');
      createPrimaryStub.callsArgWith(5, undefined, fakeCreatedEkKey);
      sinon.stub(tpm, 'EvictControl').callsArg(3);
      sinon.stub(tpm, 'FlushContext').callsArg(1);
      client.getEndorsementKey((err, localEk) => {
        assert.deepEqual(localEk, fakeCreatedEkKey.outPublic.asTpm2B(), 'Invalid endorsement key returned.');
        done();
      });
    });
  });

  describe('getStorageRootKey', function () {
    it('returns the storage root key', function (done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_008: [The `getStorageRootKey` function shall query the TPM hardware and return the `storageRootKey` in the callback.] */
      const tpm = new tss.Tpm();
      const connectStub = sinon.stub(tpm, 'connect');
      connectStub.callsArgWith(0);
      const client = new TpmSecurityClient(undefined, tpm);
      const readPublicStub = sinon.stub(tpm, 'ReadPublic');
      readPublicStub.withArgs(TpmSecurityClient._ekPersistentHandle).callsArgWith(1, undefined, fakeEkKey);
      readPublicStub.withArgs(TpmSecurityClient._srkPersistentHandle).callsArgWith(1, undefined, fakeSrkKey);
      readPublicStub.withArgs(TpmSecurityClient._idKeyPersistentHandle).callsArgWith(1, undefined, fakeIdKey);
      client.getStorageRootKey((err, localSrk) => {
        assert.deepEqual(localSrk, fakeSrkKey.outPublic.asTpm2B(), 'Invalid endorsement key returned.');
        done();
      });
    });

    it('handles an error', function (done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_009: [Any errors from interacting with the TPM hardware will cause in SecurityDeviceError to be returned in the err parameter of the callback.] */
      const tpm = new tss.Tpm();
      const connectStub = sinon.stub(tpm, 'connect');
      connectStub.callsArg(0);
      const client = new TpmSecurityClient(undefined, tpm);
      const deviceError = new common.errors.SecurityDeviceError('A device Error');
      const createPersistStub = sinon.stub(client,'_createPersistentPrimary');
      createPersistStub.withArgs('EK').callsArgWith(4, null, TpmSecurityClient._ekTemplate);
      createPersistStub.withArgs('SRK').callsArgWith(4, deviceError);
      const readPersistStub = sinon.stub(client,'_readPersistentPrimary');
      readPersistStub.withArgs('IDENTITY').callsArgWith(2, null, TpmSecurityClient._srkTemplate)
      client.getStorageRootKey((err, localSrk) => {
        assert.isNotOk(localSrk, 'Invalid storage root key returned.');
        assert.strictEqual(deviceError, err, 'improper error returned.')
        done();
      });
    });

    it('creates a storage root key if one does not exist', function (done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_018: [If the storage root key does NOT exist, a new key will be created.] */
      const tpm = new tss.Tpm();
      const connectStub = sinon.stub(tpm, 'connect');
      connectStub.callsArgWith(0);
      const client = new TpmSecurityClient(undefined, tpm);
      const readPublicStub = sinon.stub(tpm, 'ReadPublic');
      readPublicStub.withArgs(TpmSecurityClient._ekPersistentHandle).callsArgWith(1, undefined, fakeEkKey);
      readPublicStub.withArgs(TpmSecurityClient._srkPersistentHandle).callsArgWith(1, new tss.TpmError(tss.TPM_RC.BAD_TAG, '', ''));
      readPublicStub.withArgs(TpmSecurityClient._idKeyPersistentHandle).callsArgWith(1, undefined, fakeIdKey);
      const createPrimaryStub = sinon.stub(tpm, 'CreatePrimary');
      createPrimaryStub.callsArgWith(5, undefined, fakeCreatedSrkKey);
      sinon.stub(tpm, 'EvictControl').callsArg(3);
      sinon.stub(tpm, 'FlushContext').callsArg(1);
      client.getStorageRootKey((err, localSrk) => {
        assert.deepEqual(localSrk, fakeCreatedSrkKey.outPublic.asTpm2B(), 'Invalid storage root key returned.');
        done();
      });
    });
  });

  describe('signWithIdentity', function () {
    /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_011: [If `dataToSign` is falsy, an ReferenceError will be thrown.] */
    [undefined, null,'', 0].forEach(function (falsyDataToSign) {
      testFalsyArg('signWithIdentity', 'dataToSign', falsyDataToSign, ReferenceError);
    });

    it('must call activateIdentityKey first', function (done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_013: [If `signWithIdentity` is invoked without a previous successful invocation of `activateIdentityKey`, the callback will be invoked with `err` of `InvalidOperationError`.] */
      const tpm = new tss.Tpm();
      const connectStub = sinon.stub(tpm, 'connect');
      connectStub.callsArgWith(0);
      const client = new TpmSecurityClient(undefined, tpm);
      const readPublicStub = sinon.stub(tpm, 'ReadPublic');
      readPublicStub.withArgs(TpmSecurityClient._ekPersistentHandle).callsArgWith(1, undefined, fakeEkKey);
      readPublicStub.withArgs(TpmSecurityClient._srkPersistentHandle).callsArgWith(1, undefined, fakeSrkKey);
      readPublicStub.withArgs(TpmSecurityClient._idKeyPersistentHandle).callsArgWith(1, new tss.TpmError(tss.TPM_RC.BAD_TAG));
      client.signWithIdentity([1], (err) => {
        assert.instanceOf(err, common.errors.InvalidOperationError, 'should indicate invalid operation if active notIdentityKey called first.');
        done();
      });
    });

    it('correctly deals with error during tpm connection', function (done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_013: [If `signWithIdentity` is invoked without a previous successful invocation of `activateIdentityKey`, the callback will be invoked with `err` of `InvalidOperationError`.] */
      const fakeTssTpm = {
        connect: sinon.stub().throws(new Error('connect failed'))
      };

      const client = new TpmSecurityClient('registration', fakeTssTpm);
      client.signWithIdentity([1], (err) => {
        assert.isOk(err, 'should be an error from the connection portion of starting the tpm');
        done();
      });
    });

    it('correctly deals with insufficient capabilities returned by the tpm', function (done) {
      const fakeBadProps = {
        tpmProperty: []
      };
      const tpm = new tss.Tpm();
      const dataToSign = Buffer.from('ab');
      const connectStub = sinon.stub(tpm, 'connect');
      connectStub.callsArgWith(0);
      const client = new TpmSecurityClient(undefined, tpm);
      const readPublicStub = sinon.stub(tpm, 'ReadPublic');
      readPublicStub.withArgs(TpmSecurityClient._ekPersistentHandle).callsArgWith(1, undefined, fakeEkKey);
      readPublicStub.withArgs(TpmSecurityClient._srkPersistentHandle).callsArgWith(1, undefined, fakeSrkKey);
      readPublicStub.withArgs(TpmSecurityClient._idKeyPersistentHandle).callsArgWith(1, undefined, fakeIdKey);
      sinon.stub(client, '_getPropsAndHashAlg').callsArgWith(0, tss.TPM_ALG_ID.SHA256, fakeBadProps);
      client.signWithIdentity(dataToSign, (err) => {
        assert.instanceOf(err, common.errors.SecurityDeviceError, 'should be an error from the signWithIdentity');
        done();
      });
    });

    it('sign data in one hmac operation', function (done) {
      const fakeGoodProps = {
        tpmProperty: [
          {
            property: tss.TPM_PT.INPUT_BUFFER,
            value: 1
          }
        ]
      };
      const dataToSign = Buffer.from('a');
      const hashForEndValue = crypto.createHash('sha256');
      hashForEndValue.update(dataToSign);
      const shaOfDataToSign = hashForEndValue.digest();
      const tpm = new tss.Tpm();
      const connectStub = sinon.stub(tpm, 'connect');
      connectStub.callsArgWith(0);
      const client = new TpmSecurityClient(undefined, tpm);
      const readPublicStub = sinon.stub(tpm, 'ReadPublic');
      readPublicStub.withArgs(TpmSecurityClient._ekPersistentHandle).callsArgWith(1, undefined, fakeEkKey);
      readPublicStub.withArgs(TpmSecurityClient._srkPersistentHandle).callsArgWith(1, undefined, fakeSrkKey);
      readPublicStub.withArgs(TpmSecurityClient._idKeyPersistentHandle).callsArgWith(1, undefined, fakeIdKey);
      sinon.stub(client, '_getPropsAndHashAlg').callsArgWith(0, null, tss.TPM_ALG_ID.SHA256, fakeGoodProps);
      sinon.stub(tpm, 'HMAC').callsFake((handle, dataToSign, alg, signCallback) => {
        const hash = crypto.createHash('sha256');
        hash.update(dataToSign);
        const signature = hash.digest();
        signCallback(null, signature);
      });
      client.signWithIdentity(dataToSign, (err, signedData) => {
        assert.isNotOk(err, 'error is not falsy in the signing');
        assert(equals(signedData, shaOfDataToSign), 'Invalid signed data returned');
        done();
      });
    });

    it('sign data in an HMAC sequence', function (done) {
      const fakeGoodProps = {
        tpmProperty: [
          {
            property: tss.TPM_PT.INPUT_BUFFER,
            value: 1
          }
        ]
      };
      const dataToSign = Buffer.from('abc');
      const hashForEndValue = crypto.createHash('sha256');
      hashForEndValue.update(dataToSign);
      const shaOfDataToSign = hashForEndValue.digest();
      const tpm = new tss.Tpm();
      const client = new TpmSecurityClient(undefined, tpm);
      const connectStub = sinon.stub(tpm, 'connect');
      connectStub.callsArgWith(0);
      const readPublicStub = sinon.stub(tpm, 'ReadPublic');
      readPublicStub.withArgs(TpmSecurityClient._ekPersistentHandle).callsArgWith(1, undefined, fakeEkKey);
      readPublicStub.withArgs(TpmSecurityClient._srkPersistentHandle).callsArgWith(1, undefined, fakeSrkKey);
      readPublicStub.withArgs(TpmSecurityClient._idKeyPersistentHandle).callsArgWith(1, undefined, fakeIdKey);
      sinon.stub(client, '_getPropsAndHashAlg').callsArgWith(0, null, tss.TPM_ALG_ID.SHA256, fakeGoodProps);
      sinon.stub(tpm, 'HMAC_Start').callsFake((handle, signature, alg, startCallback) => {
        const hash = crypto.createHash('sha256');
        startCallback(null, hash);
      });
      const hmacSequenceUpdateStub = sinon.stub(tpm, 'SequenceUpdate').callsFake((hSequence, dataToSign, updateCallback) => {
        hSequence.update(dataToSign);
        updateCallback();
      });
      sinon.stub(tpm, 'SequenceComplete').callsFake((hSequence, dataToSign, completeHandle, completeCallback) => {
        hSequence.update(dataToSign);
        const signature = hSequence.digest();
        const response = {
          result: signature
        };
        completeCallback(null, response);
      });
      client.signWithIdentity(dataToSign, (err, signedData) => {
        assert.isNotOk(err, 'error is not falsy in the signing');
        assert(equals(signedData, shaOfDataToSign), 'Invalid signed data returned');
        assert.isTrue(hmacSequenceUpdateStub.calledTwice, 'Update not invoked correct number of times.');
        done();
      });
    });

  });

  describe('activateIdentityKey', function () {
    [undefined, null,'', 0].forEach(function (falsyIdentityKey) {
      testFalsyArg('activateIdentityKey', 'identityKey', falsyIdentityKey, ReferenceError);
    });
  });

  describe('getRegistrationId', function () {
    /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_003: [If the TpmSecurityClient was given a `registrationId` at creation, that `registrationId` will be returned.] */
    it('returns original id', function (done) {
      const tpm = new tss.Tpm();
      const providedRegistrationClient = new TpmSecurityClient('registration', tpm);
      providedRegistrationClient.getRegistrationId((err, id) => {
        assert.strictEqual(id, 'registration', 'Incorrect registration Id.' );
        done();
      });
    });

    it('returns constructed registration id', function (done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_004: [If not provided, the `registrationId` will be constructed and returned as follows:
        The endorsementKey will be queried.
        The endorsementKey will be hashed utilizing SHA256.
        The resultant digest will be base 32 encoded in conformance with the `RFC4648` specification.
        The resultant string will have terminating `=` characters removed.] */
      const tpm = new tss.Tpm();
      const providedRegistrationClient = new TpmSecurityClient(undefined, tpm);
      sinon.stub(providedRegistrationClient,'getEndorsementKey').callsArgWith(0, null, Buffer.from('registration'));
      providedRegistrationClient.getRegistrationId((err, id) => {
        assert.strictEqual(id, 'fhe4gdqgarivz3mywpiu7wehkguprzfzxru5ja5gpisxyfflph5q', 'Incorrect registration Id.' );
        done();
      });
    });

    it('handles an error', function (done) {
      /*Tests_SRS_NODE_TPM_SECURITY_CLIENT_06_005: [Any errors from interacting with the TPM hardware will cause an InvalidOperationError to be returned in the err parameter of the callback.] */
      const errorFromGetEndorsement = new common.errors.InvalidOperationError('Error from hardware');
      const tpm = new tss.Tpm();
      const providedRegistrationClient = new TpmSecurityClient(undefined, tpm );
      sinon.stub(providedRegistrationClient,'getEndorsementKey').callsArgWith(0, errorFromGetEndorsement, null);
      providedRegistrationClient.getRegistrationId((err, _id) => {
        assert.strictEqual(err, errorFromGetEndorsement, 'Improper error returned');
        done();
      });
    });
  });
});
