// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');

var TpmRegistration = require('../lib/tpm_registration.js').TpmRegistration;

describe('TpmRegistration', function () {
  describe('#register', function () {
    var fakeSecurityClient, fakeProvisioningTransport;

    var fakeProvisioningHost = 'fake_host';
    var fakeIdScope = 'fake idScope';
    var fakeEndorsementKey = 'fakeEndorsementKey';
    var fakeStorageRootKey = 'fakeStorageRootKey';
    var fakeSignedData = 'fakeSignedData';
    var fakeRegistrationId = 'fakeRegistrationId';
    var fakeRequest = {
      requestId: fakeRegistrationId,
      provisioningHost: fakeProvisioningHost,
      idScope: fakeIdScope
    }

    var fakeTpmChallenge = Buffer.from('fakeSessionKey','base64');

    var fakeTpmRegistrationResult = {
      registrationState: {
        tpm: {
          authenticationKey: 'fakeSymmetricKey'
        }
      }
    };

    var tpmReg;

    beforeEach(function () {
      fakeSecurityClient = {
        getEndorsementKey: sinon.stub().callsArgWith(0, null, fakeEndorsementKey),
        getStorageRootKey: sinon.stub().callsArgWith(0, null, fakeStorageRootKey),
        signWithIdentity: sinon.stub().callsArgWith(1, null, fakeSignedData),
        activateIdentityKey: sinon.stub().callsArg(1),
        getRegistrationId: sinon.stub().callsArgWith(0, null, fakeRegistrationId),
        cancel: sinon.stub().callsArg(0)
      };

      fakeProvisioningTransport = {
        getAuthenticationChallenge: sinon.stub().callsArgWith(1, null, fakeTpmChallenge),
        setTpmInformation: sinon.stub(),
        respondToAuthenticationChallenge: sinon.stub().callsArgWith(2, null),
        disconnect: sinon.stub().callsArg(0),
        cancel: sinon.stub().callsArg(0)
      };

      tpmReg = new TpmRegistration(fakeProvisioningHost, fakeIdScope, fakeProvisioningTransport, fakeSecurityClient);
      tpmReg._pollingStateMachine.register = sinon.stub().callsArgWith(1, null, fakeTpmRegistrationResult);
    });

    /*Tests_SRS_NODE_DPS_TPM_REGISTRATION_16_001: [The `register` method shall get the endorsement key by calling `getEndorsementKey` on the `TpmSecurityClient` object passed to the constructor.]*/
    it('calls getEndorsementKey on the TpmSecurityClient', function (testCallback) {
      tpmReg.register(function () {
        assert.isTrue(fakeSecurityClient.getEndorsementKey.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DPS_TPM_REGISTRATION_16_002: [The `register` method shall get the storage root key by calling `getStorageRootKey` on the `TpmSecurityClient` object passed to the constructor.]*/
    it('calls getStorageRootKey on the TpmSecurityClient', function (testCallback) {
      tpmReg.register(function () {
        assert.isTrue(fakeSecurityClient.getStorageRootKey.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DPS_TPM_REGISTRATION_16_003: [The `register` method shall initiate the authentication flow with the device provisioning service by calling the `getAuthenticationChallenge` method of the `TpmProvisioningTransport` object passed to the constructor with an object with the following properties:
    - `registrationId`: a unique identifier computed from the endorsement key
    - `provisioningHost`: the host address of the dps instance
    - `idScope`: the `idscope` value obtained from the azure portal for this instance.
    - a callback that will handle either an error or a `Buffer` object containing a session key to be used later in the authentication process.]*/
    it('calls getAuthenticationChallenge on the TpmProvisioningTransport', function (testCallback) {
      tpmReg.register(function () {
        assert.isTrue(fakeProvisioningTransport.getAuthenticationChallenge.calledOnce);
        var authArg = fakeProvisioningTransport.getAuthenticationChallenge.firstCall.args[0];
        assert.strictEqual(authArg.idScope, fakeIdScope);
        assert.strictEqual(authArg.provisioningHost, fakeProvisioningHost);
        assert.strictEqual(authArg.registrationId, fakeRegistrationId);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DPS_TPM_REGISTRATION_16_004: [The `register` method shall store the session key in the TPM by calling the `activateIdentityKey` method of the `TpmSecurityClient` object passed to the constructor with the following arguments:
    - `sessionKey`: the session key returned by the previous call to `TpmProvisioningTransport.getAuthenticationChallenge`
    - a callback that will handle an optional error if the operation fails.]*/
    it('calls activateIdentityKey on the TpmSecurityClient with the session key', function (testCallback) {
      tpmReg.register(function () {
        assert.isTrue(fakeSecurityClient.activateIdentityKey.calledTwice);
        assert.strictEqual(fakeSecurityClient.activateIdentityKey.firstCall.args[0], fakeTpmChallenge);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DPS_TPM_REGISTRATION_16_007: [The `register` method shall start the actual registration process by calling the `register` method on the `TpmProvisioningTransport` object passed to the constructor with the following parameters:
    - `sasToken`: the SAS token generated according to `SRS_NODE_DPS_TPM_REGISTRATION_16_006`
    - `registrationInfo`: an object with the following properties `endorsementKey`, `storageRootKey`, `registrationId` and their previously set values.
    - a callback that will handle an optional error and a `result` object containing the IoT hub name, device id and symmetric key for this device.]*/
    it('calls register on the TpmProvisioningTransport', function (testCallback) {
      tpmReg.register(function () {
        assert.isTrue(tpmReg._pollingStateMachine.register.calledOnce);
        var authArg = fakeProvisioningTransport.getAuthenticationChallenge.firstCall.args[0];
        assert.strictEqual(authArg.idScope, fakeIdScope);
        assert.strictEqual(authArg.provisioningHost, fakeProvisioningHost);
        assert.strictEqual(authArg.registrationId, fakeRegistrationId);

        // TODO: SAS token format test could be improved (see SRS_NODE_DPS_TPM_REGISTRATION_16_005 and SRS_NODE_DPS_TPM_REGISTRATION_16_006)
        assert.isString(fakeProvisioningTransport.respondToAuthenticationChallenge.firstCall.args[1]);
        testCallback();
      });
    });

    it ('fails if pollingStateMachine.register fails', function(testCallback) {
      tpmReg._pollingStateMachine.register = function(request, callback) { callback (new Error()); };
      tpmReg.register(function(err) {
        assert.instanceOf(err, Error);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DPS_TPM_REGISTRATION_16_008: [When the callback for the registration process is called, the `register` method shall store the symmetric key within the TPM by calling the `activateIdentityKey` method of the `TpmSecurityClient` object passed to the constructor with the following arguments:
    - `symmetricKey`: the symmetric key returned by the previous call to `TpmProvisioningTransport.getAuthenticationChallenge`
    - a callback that will handle an optional error if the operation fails.]*/
    it('calls the activateIdentityKey method on the TpmSecurityClient with the actual symmetric key when the registration is successful', function (testCallback) {
      tpmReg.register(function () {
        assert.isTrue(fakeSecurityClient.activateIdentityKey.calledTwice);
        assert.deepEqual(fakeSecurityClient.activateIdentityKey.secondCall.args[0], Buffer.from(fakeTpmRegistrationResult.registrationState.tpm.authenticationKey, 'base64'));
        testCallback();
      });
    });


    /*Tests_SRS_NODE_DPS_TPM_REGISTRATION_16_009: [Once the symmetric key has been stored, the `register` method shall call its own callback with a `null` error object and a `TpmRegistrationResult` object containing the information that the `TpmProvisioningTransport` returned once the registration was successful.]*/
    it('calls the register callback once the registration is successful', function (testCallback) {
      tpmReg.register(function (err, result) {
        assert.isNull(err);
        assert.strictEqual(result.symmetricKey, fakeTpmRegistrationResult.symmetricKey);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
    [
       { methodName: 'getEndorsementKey', stub: sinon.stub().callsArgWith(0, new Error('failed')) },
       { methodName: 'getStorageRootKey', stub: sinon.stub().callsArgWith(0, new Error('failed')) },
       { methodName: 'signWithIdentity', stub: sinon.stub().callsArgWith(1, new Error('failed')) },
       { methodName: 'activateIdentityKey', stub: sinon.stub().callsArgWith(1, new Error('failed')) }
    ].forEach(function (testConfig) {
      it('calls the register callback with an error if TpmSecurityClient.' + testConfig.methodName + ' fails', function (testCallback) {
        fakeSecurityClient[testConfig.methodName] = testConfig.stub;
        tpmReg.register(function (err, result) {
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });

    [
      { methodName: 'getAuthenticationChallenge', stub: sinon.stub().callsArgWith(1, new Error('failed')) },
      { methodName: 'respondToAuthenticationChallenge', stub: sinon.stub().callsArgWith(2, new Error('failed')) }
   ].forEach(function (testConfig) {
     it('calls the register callback with an error if TpmProvisioningTransport.' + testConfig.methodName + ' fails', function (testCallback) {
       fakeProvisioningTransport[testConfig.methodName] = testConfig.stub;
       tpmReg.register(function (err, result) {
         assert.instanceOf(err, Error);
         testCallback();
       });
     });
   });
  });

  describe('#cancel', function () {

  });
});