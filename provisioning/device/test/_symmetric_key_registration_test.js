// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var sinon = require('sinon');
var assert = require('chai').assert;

var SymmetricKeyRegistration = require('../lib/symmetric_registration').SymmetricKeyRegistration;

var fakeProvisioningHost = 'fakeHost';
var fakeIdScope = 'fakeIdScope';
var fakeRegistrationId = 'fakeRegistrationId';
var fakeSasToken = 'a fake token';

var fakeResponse = {
  assignedHub: 'fakeHub',
  deviceId: 'fakeDeviceId'
};

describe('Symmetric Key Registration', function () {
  describe('#register', function () {

    /* Tests_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_006: [ `register` shall call the `getRegistrationId` method on the security object to acquire the registration id. ] */
    it('gets the registration id', function(callback) {
      var transport = {
        setSharedAccessSignature: sinon.spy(),
      };
      var security = {
        createSharedAccessSignature: sinon.stub().callsArgWith(1, null, fakeSasToken),
        getRegistrationId: sinon.stub().callsArgWith(0, null, fakeRegistrationId)
      };
      var clientObj = new SymmetricKeyRegistration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj._pollingStateMachine.register = sinon.stub().callsArgWith(1, null, { registrationState: fakeResponse } );
      clientObj._pollingStateMachine.disconnect = sinon.stub().callsArgWith(0,null);
      clientObj.register(function(err, response) {
        assert.isNotOk(err);
        assert.strictEqual(response, fakeResponse);
        assert(security.getRegistrationId.calledOnce);
        assert.strictEqual(clientObj._pollingStateMachine.register.firstCall.args[0].registrationId, fakeRegistrationId);
        callback();
      });
    });

    /* Tests_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_008: [ `register` shall invoke `createSharedAccessSignature` method on the security object to acquire a sas token object. ] */
    it('shall invoke createSharedAccessSignature', function(callback) {
      var transport = {
        setSharedAccessSignature: sinon.spy(),
      };
      var security = {
        createSharedAccessSignature: sinon.stub().callsArgWith(1, null, fakeSasToken),
        getRegistrationId: sinon.stub().callsArgWith(0, null, fakeRegistrationId)
      };
      var clientObj = new SymmetricKeyRegistration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj._pollingStateMachine.register = sinon.stub().callsArgWith(1, null, { registrationState: fakeResponse } );
      clientObj._pollingStateMachine.disconnect = sinon.stub().callsArgWith(0,null);
      clientObj.register(function(err, response) {
        assert.isNotOk(err);
        assert.strictEqual(response, fakeResponse);
        assert(security.createSharedAccessSignature.calledOnce);
        assert(security.createSharedAccessSignature.firstCall.args[0],fakeIdScope);
        callback();
      });
    });

    /* Tests_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_004: [ `register` shall pass the SAS into the `setSharedAccessSignature` method on the transport. ] */
    it('setSharedAccessSignature shall be invoked', function(callback) {
      var transport = {
        setSharedAccessSignature: sinon.spy(),
      };
      var security = {
        createSharedAccessSignature: sinon.stub().callsArgWith(1, null, fakeSasToken),
        getRegistrationId: sinon.stub().callsArgWith(0, null, fakeRegistrationId)
      };
      var clientObj = new SymmetricKeyRegistration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj._pollingStateMachine.register = sinon.stub().callsArgWith(1, null, { registrationState: fakeResponse } );
      clientObj._pollingStateMachine.disconnect = sinon.stub().callsArgWith(0,null);
      clientObj.register(function(err, response) {
        assert.isNotOk(err);
        assert.strictEqual(response, fakeResponse);
        assert(transport.setSharedAccessSignature.calledOnce);
        assert(transport.setSharedAccessSignature.calledWith(fakeSasToken));
        callback();
      });
    });

    /* Tests_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_005: [ `register` shall call `register` on the polling state machine object. ] */
    it('invokes the polling register state machine', function(callback) {
      var transport = {
        setSharedAccessSignature: sinon.spy(),
      };
      var security = {
        createSharedAccessSignature: sinon.stub().callsArgWith(1, null, fakeSasToken),
        getRegistrationId: sinon.stub().callsArgWith(0, null, fakeRegistrationId)
      };
      var clientObj = new SymmetricKeyRegistration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj._pollingStateMachine.register = sinon.stub().callsArgWith(1, null, { registrationState: fakeResponse } );
      clientObj._pollingStateMachine.disconnect = sinon.stub().callsArgWith(0,null);
      clientObj.register(function(err, response) {
        assert.isNotOk(err);
        assert(clientObj._pollingStateMachine.register.calledOnce);
        assert.strictEqual(clientObj._pollingStateMachine.register.firstCall.args[0].provisioningHost, fakeProvisioningHost);
        assert.strictEqual(clientObj._pollingStateMachine.register.firstCall.args[0].idScope, fakeIdScope);
        assert.strictEqual(clientObj._pollingStateMachine.register.firstCall.args[0].registrationId, fakeRegistrationId);
        callback();
      });
    });

    /* Tests_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_011: [ Otherwise `register` shall invoke the `_callback` with the resultant `registrationState` as the second argument. ] */
    it('registers and gets the appropriate response', function(callback) {
      var transport = {
        setSharedAccessSignature: sinon.spy(),
      };
      var security = {
        createSharedAccessSignature: sinon.stub().callsArgWith(1, null, fakeSasToken),
        getRegistrationId: sinon.stub().callsArgWith(0, null, fakeRegistrationId)
      };
      var clientObj = new SymmetricKeyRegistration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj._pollingStateMachine.register = sinon.stub().callsArgWith(1, null, { registrationState: fakeResponse } );
      clientObj._pollingStateMachine.disconnect = sinon.stub().callsArgWith(0,null);
      clientObj.register(function(err, response) {
        assert.isNotOk(err);
        assert.strictEqual(response, fakeResponse);
        callback();
      });
    });


    /* Tests_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_007: [ If the `getRegistrationId` fails, the `register` shall call the `_callback` with the error. ] */
    it('fails if getRegistrationId fails', function(callback) {
      var getRegistrationIdError = new Error('registrationIdError');
      var transport = {
        setSharedAccessSignature: sinon.spy(),
      };
      var security = {
        createSharedAccessSignature: sinon.stub().callsArgWith(1, null, fakeSasToken),
        getRegistrationId: sinon.stub().callsArgWith(0, getRegistrationIdError)
      };
      var clientObj = new SymmetricKeyRegistration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj.register(function(err, response) {
        assert.isOk(err);
        assert(security.getRegistrationId.calledOnce);
        assert.strictEqual(getRegistrationIdError, err);
        callback();
      });
    });

    /* Tests_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_009: [ If the `createSharedAccessSignature` fails, the `register` shall call the `_callback` with the error. ] */
    it('fails if createSharedAccessSignature fails', function(callback) {
      var transport = {
        setSharedAccessSignature: sinon.spy(),
      };
      var fakeError = new Error('got a token create Error');
      var security = {
        createSharedAccessSignature: sinon.stub().callsArgWith(1, fakeError),
        getRegistrationId: sinon.stub().callsArgWith(0, null, fakeRegistrationId)
      };
      var clientObj = new SymmetricKeyRegistration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj.register(function(err, response) {
        assert.isOk(err);
        assert(security.createSharedAccessSignature.calledOnce);
        assert.strictEqual(fakeError, err);
        callback();
      });
    });

    /* Tests_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_010: [ if the polling register returns an error, the `register` shall invoke the `_callback` with that error. ] */
    it('fails if register fails', function(callback) {
      var transport = {
        setSharedAccessSignature: sinon.spy(),
      };
      var security = {
        createSharedAccessSignature: sinon.stub().callsArgWith(1, null, fakeSasToken),
        getRegistrationId: sinon.stub().callsArgWith(0, null, fakeRegistrationId)
      };
      var fakeError = new Error('got a register Error');
      var clientObj = new SymmetricKeyRegistration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj._pollingStateMachine.register = sinon.stub().callsArgWith(1, fakeError);
      clientObj._pollingStateMachine.disconnect = sinon.stub().callsArgWith(0,null);
      clientObj.register(function(err, response) {
        assert.isOk(err);
        assert.strictEqual(fakeError, err);
        callback();
      });
    });

    /* Tests_SRS_NODE_DPS_SYMMETRIC_REGISTRATION_06_010: [ if the polling register returns an error, the `register` shall invoke the `_callback` with that error. ] */
    it('disconnect failure does NOT affect results', function(callback) {
      var transport = {
        setSharedAccessSignature: sinon.spy(),
      };
      var security = {
        createSharedAccessSignature: sinon.stub().callsArgWith(1, null, fakeSasToken),
        getRegistrationId: sinon.stub().callsArgWith(0, null, fakeRegistrationId)
      };
      var fakeError = new Error('got a disconnect Error');
      var clientObj = new SymmetricKeyRegistration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj._pollingStateMachine.register = sinon.stub().callsArgWith(1, null, { registrationState: fakeResponse } );
      clientObj._pollingStateMachine.disconnect = sinon.stub().callsArgWith(0,fakeError);
      clientObj.register(function(err, response) {
        assert.isNotOk(err);
        assert(clientObj._pollingStateMachine.disconnect.calledOnce);
        callback();
      });
    });
  });

  describe('#cancel', function () {
    /* Tests_SRS_NODE_DPS_X509_REGISTRATION_18_003: [ `cancel` shall call `cancel` on the transport object. ] */
    it('calls cancel on the transport with successful result', function(callback) {
      var transport = {
        cancel: sinon.stub().callsArgWith(0, null)
      };
      var security = {};
      var clientObj = new SymmetricKeyRegistration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj.cancel(function(err) {
        assert.isNotOk(err);
        assert(transport.cancel.calledOnce);
        callback();
      });
    });

    it('calls cancel on the transport with error result', function(callback) {
      var fakeError = new Error('cancel error')
      var transport = {
        cancel: sinon.stub().callsArgWith(0, fakeError)
      };
      var security = {};
      var clientObj = new SymmetricKeyRegistration(fakeProvisioningHost, fakeIdScope, transport, security);
      clientObj.cancel(function(err) {
        assert(transport.cancel.calledOnce);
        assert.isOk(err);
        assert.strictEqual(err, fakeError);
        callback();
      });
    });


  });
});