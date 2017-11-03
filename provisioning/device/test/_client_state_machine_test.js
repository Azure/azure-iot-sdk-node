// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var ClientStateMachine = require('../lib/client_state_machine').ClientStateMachine;
var sinon = require('sinon');
var assert = require('chai').assert;

var fakeErrorText = '__FAKE_ERROR__';
var fakeRegistrationId = '__FAKE_REGISTRATION_ID__';
var fakeAuth = '__FAKE_AUTH__';
var fakeRequestBody = { fake: true };
var fakeBadStatus = '__FAKE_BAD_STATUS__';

var waitingForNetworkIo = function () { return sinon.spy(function () { }); };
var registrationRequestReturnsAssigning = function (pollingInterval) { return sinon.spy(function (registrationId, auth, body, force, callback) { callback(null, { status: 'Assigning' }, null, pollingInterval || 0); }); };
var registrationRequestReturnsAssigned = function () { return sinon.spy(function (registrationId, auth, body, force, callback) { callback(null, { status: 'Assigned' }); }); };
var registrationRequestReturnsFailure = function () { return sinon.spy(function (registrationId, auth, body, force, callback) { callback(new Error(fakeErrorText)); }); };
var registrationRequestReturnsBadResponse = function () { return sinon.spy(function (registrationId, auth, body, force, callback) { callback(null, { status: fakeBadStatus }); }); };
var operationStatusReturnsAssigned = function () { return sinon.spy(function (registrationId, operationId, callback) { callback(null, { status: 'Assigned' } ); }); };
var operationStatusReturnsFailure = function () { return sinon.spy(function (registrationId, operationId, callback) { callback(new Error(fakeErrorText)); }); };
var operationStatusReturnsBadResponse = function () { return sinon.spy(function (registrationId, operationId, callback) { callback(null, { status: fakeBadStatus }); }); };
var operationStatusReturnsAssigningThenAssigned = function () {
  var callCount = 0;
  return sinon.spy(function (registrationId, operationId, callback) {
    callCount++;
    if (callCount === 1) {
      callback(null, { status: 'Assigning' }, null, 0);
    } else if (callCount === 2) {
      callback(null, { status: 'Assigned' });
    } else {
      assert(false, 'second status query returned Assigned.  There should not be a third status query');
    }
  });
};

describe('state machine', function () {
  this.timeout(1000);

  var makeNewMachine = function () {
    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_001: [ The `constructor` shall accept no arguments ] */
    var machine = new ClientStateMachine({
      endSession: sinon.stub().callsArg(0),
      registrationRequest: registrationRequestReturnsAssigned(),
      queryOperationStatus: operationStatusReturnsAssigned(),
      getErrorResult:sinon.stub().callsArg(0)
    });
    return machine;
  };

  var assertNoTransportFunctionsCalled = function (machine) {
    assert.isFalse(machine._transport.endSession.called);
    assert.isFalse(machine._transport.registrationRequest.called);
    assert.isFalse(machine._transport.queryOperationStatus.called);
    assert.isFalse(machine._transport.getErrorResult.called);
  };

  var callRegisterWithDefaultArgs = function (callback) {
    machine.register(fakeRegistrationId, fakeAuth, fakeRequestBody, false, callback);
  };

  var machine;
  beforeEach(function () {
    machine = makeNewMachine();
  });

  describe('register function', function () {

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_012: [ `register` shall call `TransportHandlers.registrationRequest`. ] */
    describe('calls registrationRequest', function () {

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_013: [ If `TransportHandlers.registrationRequest` fails, `register` shall fail. ] */
      it ('and returns failure if it fails', function (testCallback) {
        machine._transport.registrationRequest = registrationRequestReturnsFailure();
        callRegisterWithDefaultArgs(function (err) {
          assert(!!err);
          assert.equal(err.constructor.name, 'Error');
          assert.equal(err.message, fakeErrorText);
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_014: [ If `TransportHandlers.registrationRequest` succeeds with status==Assigned, it shall emit an 'operationStatus' event and  call `callback` with null, the response body, and the protocol-specific result. ] */
      it ('and returns success if it succeeds with status===\'Assigned\'', function (testCallback) {
        callRegisterWithDefaultArgs(function (err,responseBody) {
          assert(!err);
          assert.equal(responseBody.status, 'Assigned');
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_015: [ If `TransportHandlers.registrationRequest` succeeds with status==Assigning, it shall emit an 'operationStatus' event and begin polling for operation status requests. ] */
      it ('and starts polling if it succeeds with status===\'Assigning\'', function (testCallback) {
        machine._transport.registrationRequest = registrationRequestReturnsAssigning();
        machine._transport.queryOperationStatus = waitingForNetworkIo();
        callRegisterWithDefaultArgs(function () {
          assert(false, 'register should never complete in this test');
        });
        setTimeout(function () {
          assert(machine._transport.registrationRequest.calledOnce);
          assert(machine._transport.queryOperationStatus.calledOnce);
          testCallback();
        }, 2);
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_016: [ If `TransportHandlers.registrationRequest` succeeds with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
      it ('and returns failure if it succeeds with some other status', function (testCallback) {
        machine._transport.registrationRequest = registrationRequestReturnsBadResponse();
        callRegisterWithDefaultArgs(function (err) {
          assert(!!err);
          assert.equal(err.constructor.name, 'SyntaxError');
          assert.equal(err.message, 'status is ' + fakeBadStatus);
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_014: [ If `TransportHandlers.registrationRequest` succeeds with status==Assigned, it shall emit an 'operationStatus' event and  call `callback` with null, the response body, and the protocol-specific result. ] */
      it ('and fires an operationStatus event if it succeeds', function (testCallback) {
        machine.on('operationStatus', function (body) {
          assert.equal(body.status, 'Assigned');
          testCallback();
        });
        callRegisterWithDefaultArgs(function () { });
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_018: [ When the polling interval elapses, `register` shall call `TransportHandlers.queryOperationStatus`. ] */
    describe('then calls queryOperationStatus', function () {
      beforeEach(function () {
        machine._transport.registrationRequest = registrationRequestReturnsAssigning();
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_019: [ If `TransportHandlers.queryOperationStatus` fails, `register` shall fail. ] */
      it ('and returns failure if it fails', function (testCallback) {
        machine._transport.queryOperationStatus = operationStatusReturnsFailure();
        callRegisterWithDefaultArgs(function (err) {
          assert(machine._transport.queryOperationStatus.calledOnce);
          assert(!!err);
          assert.equal(err.constructor.name, 'Error');
          assert.equal(err.message, fakeErrorText);
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_020: [ If `TransportHandlers.queryOperationStatus` succeeds with status==Assigned, `register` shall complete and pass the body of the response and the protocol-spefic result to the `callback`. ] */
      it ('and returns success if it succeeds with status===\'Assigned\'', function (testCallback) {
        callRegisterWithDefaultArgs(function (err, responseBody) {
          assert(!err);
          assert.equal(responseBody.status, 'Assigned');
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_021: [ If `TransportHandlers.queryOperationStatus` succeeds with status==Assigning, `register` shall emit an 'operationStatus' event and begin polling for operation status requests. ] */
      it ('and continues polling if it succeeds with status===\'Assigning\'', function (testCallback) {
        machine._transport.queryOperationStatus = operationStatusReturnsAssigningThenAssigned();

        callRegisterWithDefaultArgs(function (err, responseBody) {
          assert(!err);
          assert.equal(responseBody.status, 'Assigned');
          assert(machine._transport.queryOperationStatus.calledTwice);
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_022: [ If `TransportHandlers.queryOperationStatus` succeeds with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
      it ('and returns failure if it succeeds with some other status', function (testCallback) {
        machine._transport.queryOperationStatus = operationStatusReturnsBadResponse();
        callRegisterWithDefaultArgs(function (err) {
          assert(!!err);
          assert.equal(err.constructor.name, 'SyntaxError');
          assert.equal(err.message, 'status is ' + fakeBadStatus);
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_021: [ If `TransportHandlers.queryOperationStatus` succeeds with status==Assigned, `register` shall emit an 'operationStatus' event and begin polling for operation status requests. ] */
      it ('and fires an operationStatus event if it succeeds', function (testCallback) {
        var handler = sinon.stub();
        machine.on('operationStatus', handler);
        callRegisterWithDefaultArgs(function (err) {
          assert(!err);
          assert(handler.calledTwice);
          testCallback();
        });
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
    it ('fails if called while sending the first request', function (testCallback) {
      machine._transport.registrationRequest = waitingForNetworkIo();
      callRegisterWithDefaultArgs(function() {
        assert(false, 'register should never complete in this test');
      });

      setTimeout(function() {
        callRegisterWithDefaultArgs(function(err) {
          assert.equal(err.constructor.name, 'InvalidOperationError');
          testCallback();
        });
      },10);
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
    it ('fails if called while waiting to poll', function (testCallback) {
      machine._transport.registrationRequest = registrationRequestReturnsAssigning(1000);
      callRegisterWithDefaultArgs(function() {
        assert(false, 'register should never complete in this test');
      });

      setTimeout(function() {
        callRegisterWithDefaultArgs(function(err) {
          assert.equal(err.constructor.name, 'InvalidOperationError');
          testCallback();
        });
      },10);
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
    if ('fails if called while sending an operation status request', function (testCallback) {
      machine._transport.registrationRequest = registrationRequestReturnsAssigning();
      machine._transport.queryOperationStatus = waitingForNetworkIo();
      callRegisterWithDefaultArgs(function() {
        assert(false, 'register should never complete in this test');
      });

      setTimeout(function() {
        callRegisterWithDefaultArgs(function(err) {
          assert.equal(err.constructor.name, 'InvalidOperationError');
          testCallback();
        });
      },10);
    });
  });

  describe('endSession function', function () {

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_025: [ If `endSession` is called while disconnected, it shall immediately call its `callback`. ] */
    it ('does nothing if called while disconnected', function (testCallback) {
      machine.endSession(function(err) {
        assert(!err);
        assert(machine);
        assertNoTransportFunctionsCalled(machine);
        testCallback();
      });
    });

    describe('calls endSession', function () {

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_026: [ `endSession` shall call `endSession` of it's called while the transport is connected. ] */
      it ('if called while connected', function (testCallback) {
        callRegisterWithDefaultArgs(function(err) {
          assert(!err);
          assert.isFalse(machine._transport.endSession.called);
          machine._transport.endSession(function(err) {
            assert(!err);
            assert(machine._transport.endSession.calledOnce);
            testCallback();
          });
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `endSession` shall cause that registration to fail with an `OperationCancelledError`. ] */
      it ('and causes register to fail if called while sending the first request', function (testCallback) {
        var registrationErr;
        var registrationCallback;
        machine._transport.registrationRequest = sinon.spy(function (registrationId, authorization, requestBody, forceRegistration, callback) {
          registrationCallback = callback;
        });
        callRegisterWithDefaultArgs(function(err) {
          registrationErr = err;
          assert(!!err);
          assert.equal(err.constructor.name, 'OperationCancelledError');
          assert(machine._transport.registrationRequest.calledOnce);
          assert.isFalse(machine._transport.queryOperationStatus.calledOnce);
        });
        setTimeout(function () {
          machine.endSession(function() {
            registrationCallback();
            assert(!!registrationErr);
            assert(machine._transport.endSession.calledOnce);
            testCallback();
          });
        }, 2);
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `endSession` shall cause that registration to fail with an `OperationCancelledError`. ] */
      it ('and causes register to fail if called while waiting to poll', function (testCallback) {
        var registrationErr;
        machine._transport.registrationRequest = registrationRequestReturnsAssigning(1000);
        callRegisterWithDefaultArgs(function(err) {
          registrationErr = err;
          assert(!!err);
          assert.equal(err.constructor.name, 'OperationCancelledError');
          assert(machine._transport.registrationRequest.calledOnce);
          assert.isFalse(machine._transport.queryOperationStatus.calledOnce);
        });
        setTimeout(function () {
          machine.endSession(function() {
            assert(!!registrationErr);
            assert(machine._transport.endSession.calledOnce);
            testCallback();
          });
        }, 2);
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `endSession` shall cause that registration to fail with an `OperationCancelledError`. ] */
      it ('and causes register to fail if called while sending an operation status request', function (testCallback) {
        var registrationErr;
        var registrationCallback;
	      machine._transport.registrationRequest = registrationRequestReturnsAssigning();
        machine._transport.queryOperationStatus = sinon.spy(function (registrationId, operationId, callback) {
          registrationCallback = callback;
        });
        callRegisterWithDefaultArgs(function(err) {
          registrationErr = err;
          assert(!!err);
          assert.equal(err.constructor.name, 'OperationCancelledError');
          assert(machine._transport.registrationRequest.calledOnce);
          assert(machine._transport.queryOperationStatus.calledOnce);
        });
        setTimeout(function () {
          machine.endSession(function() {
            registrationCallback();
            assert(!!registrationErr);
            assert(machine._transport.endSession.calledOnce);
            testCallback();
          });
        }, 2);
      });
    });
  });

});

