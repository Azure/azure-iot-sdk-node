// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var SaslTpm = require('../lib/sasl_tpm').SaslTpm;
var assert = require('chai').assert;
var Builder = require('buffer-builder');

describe( 'SaslTpm', function () {
  this.timeout(100);
  var fakeBuffer1 = new Buffer('__FAKE_BUFFER_NUMBER_1__');
  var fakeBuffer2 = new Buffer('__FAKE_BUFFER_NUMBER_2_WITH_EXTRA_STUFF__');
  var fakeBuffer3 = new Buffer('__FAKE_BUFFER_NUMBER_3_WITH_EVEN_MORE_EXTRA_STUFF__');
  var fakeIdScope = '__IDSCOPE__';
  var fakeRegistrationId = '__REQUEST_ID__';
  var fakeEndorsementKey = new Buffer('__FAKE_ENDORSEMENT_KEY__');
  var fakeStorageRootKey = new Buffer('__FAKE_STORAGE_ROOT_KEY__');
  var emptyChallengeResponse = Buffer.from([0]);
  var fakeError = new Error('__FAKE_ERROR_TEXT__');
  var fakeSasToken = '__FAKE_SAS_TOKEN__';

  var fakeInit = new Builder()
    .appendUInt8(0)
    .appendString(fakeIdScope)
    .appendUInt8(0)
    .appendString(fakeRegistrationId)
    .appendUInt8(0)
    .appendBuffer(fakeEndorsementKey)
    .get();
  var fakeFirstResponse = new Builder()
    .appendUInt8(0)
    .appendBuffer(fakeStorageRootKey)
    .get();

  var challengeFromBuffer = function(firstByte, buffer) {
    return [
      {
        value: Buffer.concat([Buffer.from([firstByte]), buffer])
      }
    ];
  };

  describe('#getInitFrame', function() {
  it ('returns a promise that resolves to the intialization object', function(callback) {
    /*Tests_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_001: [ The `SaslTpm` constructor shall accept the following parameters:
      `idScope` - the idScope for the provisioning service instance
      `registrationId` - the registrationId for the device being registered
      `endorsementKey` - the endorsement key which was acquired from the TPM
      `storageRootKey` - the storage root key which was acquired from the TPM
      `getSasToken` - The callback to call when the challenge has been completed and the caller needs to formulate the response. ] */
    var sasl = new SaslTpm(fakeIdScope, fakeRegistrationId, fakeEndorsementKey, fakeStorageRootKey, function() {});

    /*Tests_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_002: [ `getInitFrame` shall return a promise that resolves to an object with the following members:
      `mechanism` - Must be 'TPM'
      `initialResponse` - The inital frame contents
      `hostname` - the hostName ] */
    sasl.getInitFrame().then(function(contents) {
        assert.strictEqual(contents.mechanism, 'TPM');
        assert.deepEqual(contents.initialResponse, fakeInit);
        assert.strictEqual(contents.hostname, fakeIdScope + '/registrations/' + fakeRegistrationId);
        callback();
      });
    });
  });

  describe('#getResponseFrame', function() {
    /*Tests_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_003: [ If `getResponseFrame` is called with a 1 byte challenge, it shall resolve with the the initial response that was passed into the constructor. ] */
    it ('resolves to the initial response on first call', function(callback) {
      var sasl = new SaslTpm(fakeIdScope, fakeRegistrationId, fakeEndorsementKey, fakeStorageRootKey, function() {});
      sasl.getResponseFrame(challengeFromBuffer(1, new Buffer('')))
        .then(function(response) {
          assert.deepEqual(response, {response: fakeFirstResponse});
          callback();
        });
    });

    /*Tests_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_004: [ If `getResponseFrame` is called with a first byte that has 1 in the most significant bit, it shall append the challenge to the full challenge buffer ] */
    /*Tests_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_005: [ If `getResponseFrame` is called with a first byte that has 11 in the most significant bits, it shall call the challenge callback with the full challenge buffer ] */
    it ('appends to the challenge buffer, and calls the challenge callback when the 2 high bits are 11', function(callback) {
      var sasl = new SaslTpm(fakeIdScope, fakeRegistrationId, fakeEndorsementKey, fakeStorageRootKey, function(challenge) {
      assert.deepEqual(challenge, fakeBuffer1);
        callback();
      });

      sasl.getResponseFrame(challengeFromBuffer(0xc0, fakeBuffer1));
    });

    /*Tests_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_004: [ If `getResponseFrame` is called with a first byte that has 1 in the most significant bit, it shall append the challenge to the full challenge buffer ] */
    it ('appends to the challenge buffer and resolves to an empty buffer when the 2 high bits are 10', function(callback) {
      var sasl = new SaslTpm(fakeIdScope, fakeRegistrationId, fakeEndorsementKey, fakeStorageRootKey,  function(challenge) {
        assert.deepEqual(challenge, Buffer.concat([fakeBuffer1, fakeBuffer2, fakeBuffer3]));
        callback();
      });

      sasl.getResponseFrame(challengeFromBuffer(0x80, fakeBuffer1))
        .then(function(response) {
          assert.deepEqual(response, {response: emptyChallengeResponse});
        }).then(function() {
          return sasl.getResponseFrame(challengeFromBuffer(0x80, fakeBuffer2));
        }).then(function(response) {
          assert.deepEqual(response, {response: emptyChallengeResponse});
        }).then(function() {
          sasl.getResponseFrame(challengeFromBuffer(0xc0, fakeBuffer3));
        });
    });

    /*Tests_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_006: [ If `ChallengeResponseCallback` is called without passing an error, the final `getResponseFrame` promise shall be resolved. ] */
    it ('resolves the final getResponseFrame promise when the ChallengeResponseCallback callback is called without error', function(callback) {
      var sasl = new SaslTpm(fakeIdScope, fakeRegistrationId, fakeEndorsementKey, fakeStorageRootKey,  function(challenge, getSasTokenCallback) {
        getSasTokenCallback(null, fakeSasToken);
      });

      var sasTokenResponse = new Builder()
        .appendUInt8(0)
        .appendString(fakeSasToken)
        .get();

      sasl.getResponseFrame(challengeFromBuffer(0xc0, fakeBuffer1))
        .then(function(response) {
          assert.deepEqual(response.response, sasTokenResponse);
          callback();
        });
    });

    /*Tests_SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_007: [ If `ChallengeResponseCallback` is called with an error, the final `getResponseFrame` promise shall be rejected. ] */
    it ('rejects the final getResponseFrame promise when the ChallengeResponseCallback callback is called with an error', function(callback) {
      var sasl = new SaslTpm(fakeIdScope, fakeRegistrationId, fakeEndorsementKey, fakeStorageRootKey, function(challenge, getSasTokenCallback) {
        getSasTokenCallback(fakeError);
      });

      sasl.getResponseFrame(challengeFromBuffer(0xc0, fakeBuffer1))
        .catch(function(err) {
          assert.strictEqual(err, fakeError);
          callback();
        });
    });

  });
});
