// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var TransportStateMachine = require('../lib/transport_state_machine').TransportStateMachine;
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
    var machine = new TransportStateMachine();
    machine.initialize({
      connect: sinon.stub().callsArg(0),
      disconnect: sinon.stub().callsArg(0),
      registrationRequest: registrationRequestReturnsAssigned(),
      queryOperationStatus: operationStatusReturnsAssigned(),
      getErrorResult:sinon.stub().callsArg(0)
    });
    return machine;
  };

  var clearTransportCallCount = function (machine) {
    machine._transport.connect.reset();
    machine._transport.disconnect.reset();
    machine._transport.registrationRequest.reset();
    machine._transport.queryOperationStatus.reset();
    machine._transport.getErrorResult.reset();
  };

  var assertNoTransportFunctionsCalled = function (machine) {
    assert.isFalse(machine._transport.connect.called);
    assert.isFalse(machine._transport.disconnect.called);
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

describe('connect function', function () {

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_002: [ `connect` shall call `TransportHandlers.connect`. ] */
    it ('calls TransportHandlers.connect', function (testCallback) {
      machine.connect(function (err) {
        assert(machine._transport.connect.calledOnce);
        assert(!err);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_003: [ If `TransportHandlers.connect` fails, then `connect` shall fail. ] */
    it ('fails and disconnects if TransportHandlers.connect fails', function (testCallback) {
      machine._transport.connect = sinon.stub().callsArgWith(0, new Error(fakeErrorText));
      machine.connect(function (err) {
        assert(machine._transport.connect.calledOnce);
        assert(machine._transport.disconnect.calledOnce);
        assert(!!err);
        assert.equal(err.constructor.name, 'Error');
        assert.equal(err.message, fakeErrorText);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_004: [ If the transport is already connected, then `connect` shall do nothing and call the `callback` immediately. ] */
    it ('does nothing if called while connected', function (testCallback) {
      machine.connect(function (err) {
        assert(machine._transport.connect.calledOnce);
        assert(!err);
        // connect is in our stack so we can't clear the call count.  Move to the nextTick to run on a cleaner stack.
        process.nextTick(function() {
          clearTransportCallCount(machine);
          machine.connect(function (err) {
            assert(!err);
            assertNoTransportFunctionsCalled(machine);
            testCallback();
          });
        });
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_005: [ If `connect` is called while a connection is in progress, it shall wait for that connection to complete before calling `callback`. ] */
    it ('doesn\'t complete until connection is complete if called while connecting', function (testCallback) {
      var firstConnectionCallback;
      machine._transport.connect = function (callback) { firstConnectionCallback = callback; };

      var firstConnectionComplete = false, secondConnectionComplete = false;
      machine.connect(function () { firstConnectionComplete = true; });
      machine.connect(function () { secondConnectionComplete = true; });
      assert(!firstConnectionComplete);
      assert(!secondConnectionComplete);

      firstConnectionCallback();
      assert(firstConnectionComplete && secondConnectionComplete);
      testCallback();
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_006: [ If `connect` is called while the transport is executing the first registration request, it shall do nothing and call `callback` immediately. ] */
    it ('does nothing if called while executing first request', function (testCallback) {
      machine._transport.registrationRequest = waitingForNetworkIo();
      machine.register(fakeRegistrationId, fakeAuth, fakeRequestBody, false, function () {
      });
      assert(machine._transport.registrationRequest.calledOnce); // make sure it looks like we've started executing the first request
      clearTransportCallCount(machine);
      machine.connect(function (err) {
        assert(!err);
        assertNoTransportFunctionsCalled(machine);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_007: [ If `connect` is called while the transport is waiting between operation status queries, it shall do nothing and call `callback` immediately. ] */
    it ('does nothing if called while waiting to poll', function (testCallback) {
      machine._transport.registrationRequest = registrationRequestReturnsAssigning(1000);
      machine._transport.queryOperationStatus = waitingForNetworkIo();
      machine.register(fakeRegistrationId, fakeAuth, fakeRequestBody, false, function () {});
      assert(machine._transport.registrationRequest.calledOnce);
      assert.isFalse(machine._transport.queryOperationStatus.called);
      clearTransportCallCount(machine);
      machine.connect(function (err) {
        assert(!err);
        assertNoTransportFunctionsCalled(machine);
        machine._transport.disconnect(function() {});
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_008: [ If `connect` is called while the transport is executing an operation status query, it shall do nothing and call `callback` immediately. ] */
    it ('does nothing if called while executing operationStatus request', function (testCallback) {
      machine._transport.registrationRequest = registrationRequestReturnsAssigning();
      machine._transport.queryOperationStatus = waitingForNetworkIo();
      machine.register(fakeRegistrationId, fakeAuth, fakeRequestBody, false, function () {});
      setTimeout(function() {
        assert(machine._transport.registrationRequest.calledOnce);
        assert(machine._transport.queryOperationStatus.calledOnce);
        clearTransportCallCount(machine);
        machine.connect(function (err) {
          assert(!err);
          assertNoTransportFunctionsCalled(machine);
          machine._transport.disconnect(function() {
            testCallback();
          });
        });
      }, 2);
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_009: [ If `connect` is called while the transport is disconnecting, it shall wait for the disconnection to complete, then initiate the connection. ] */
    it ('waits for disconnect to complete and then reconnects if called while disconnecting', function (testCallback) {
      var disconnectCallback;
      machine._transport.disconnect = sinon.spy(function (callback) { disconnectCallback = callback; });
      machine.connect(function (err) {
        assert(!err);

        machine.disconnect();
        assert(machine._transport.disconnect.calledOnce);

        var disconnectCompleted = false;
        machine.connect(function (err) {
          assert(machine._transport.connect.calledTwice);
          assert(disconnectCompleted);
          assert(!err);
          testCallback();
        });

        disconnectCompleted = true;
        disconnectCallback();
      });
    });
  });

  describe('register function', function () {

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_010: [ `register` shall `connect` the transport if it is not connected. ] */
    it ('connects if necessary', function (testCallback) {
      assert.isFalse(machine._transport.connect.called);
      callRegisterWithDefaultArgs(function (err) {
        assert(!err);
        assert(machine._transport.connect.called);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_011: [ `register` shall fail if the connection fails. ] */
    it ('fails if connect fails', function (testCallback) {
      machine._transport.connect = function (callback) {
        callback(new Error(fakeErrorText));
      };
      callRegisterWithDefaultArgs(function (err) {
        assert(!!err);
        assert.equal(err.constructor.name, 'Error');
        assert.equal(err.message, fakeErrorText);
        testCallback();
      });
    });

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

  describe('disconnect function', function () {

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_025: [ If `disconnect` is called while disconnected, it shall immediately call its `callback`. ] */
    it ('does nothing if called while disconnected', function (testCallback) {
      machine.disconnect(function(err) {
        assert(!err);
        assert(machine);
        assertNoTransportFunctionsCalled(machine);
        testCallback();
      });
    });

    describe('calls disconnect', function () {

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_026: [ `disconnect` shall call `disconnect` of it's called while the transport is connected. ] */
      it ('if called while connected', function (testCallback) {
        machine.connect(function () {
          assert.isFalse(machine._transport.disconnect.called);
          machine._transport.disconnect(function(err) {
            assert(!err);
            assert(machine._transport.disconnect.calledOnce);
            testCallback();
          });
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `disconnect` shall cause that registration to fail with an `OperationCancelledError`. ] */
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
          assert(machine._transport.connect.calledOnce);
          assert(machine._transport.registrationRequest.calledOnce);
          assert.isFalse(machine._transport.queryOperationStatus.calledOnce);
        });
        setTimeout(function () {
          machine.disconnect(function() {
            registrationCallback();
            assert(!!registrationErr);
            assert(machine._transport.disconnect.calledOnce);
            testCallback();
          });
        }, 2);
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `disconnect` shall cause that registration to fail with an `OperationCancelledError`. ] */
      it ('and causes register to fail if called while waiting to poll', function (testCallback) {
        var registrationErr;
        machine._transport.registrationRequest = registrationRequestReturnsAssigning(1000);
        callRegisterWithDefaultArgs(function(err) {
          registrationErr = err;
          assert(!!err);
          assert.equal(err.constructor.name, 'OperationCancelledError');
          assert(machine._transport.connect.calledOnce);
          assert(machine._transport.registrationRequest.calledOnce);
          assert.isFalse(machine._transport.queryOperationStatus.calledOnce);
        });
        setTimeout(function () {
          machine.disconnect(function() {
            assert(!!registrationErr);
            assert(machine._transport.disconnect.calledOnce);
            testCallback();
          });
        }, 2);
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `disconnect` shall cause that registration to fail with an `OperationCancelledError`. ] */
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
          assert(machine._transport.connect.calledOnce);
          assert(machine._transport.registrationRequest.calledOnce);
          assert(machine._transport.queryOperationStatus.calledOnce);
        });
        setTimeout(function () {
          machine.disconnect(function() {
            registrationCallback();
            assert(!!registrationErr);
            assert(machine._transport.disconnect.calledOnce);
            testCallback();
          });
        }, 2);
      });
    });
  });

});

