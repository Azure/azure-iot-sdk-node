// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var PollingStateMachine = require('../lib/polling_state_machine').PollingStateMachine;
var ProvisioningDeviceConstants = require('../lib/constants').ProvisioningDeviceConstants;
var sinon = require('sinon');
var assert = require('chai').assert;
var errors = require('azure-iot-common').errors;

var fakeErrorText = '__FAKE_ERROR__';
var fakeBadStatus = '__FAKE_BAD_STATUS__';
var fakeRequest = {
  requestId: '__FAKE_REGISTRATION_ID__',
  provisioningHost: '__FAKE_HOST__',
  idScope: '__FAKE_SCOPE__'
}
var fakeError = new Error(fakeErrorText);

var waitingForNetworkIo = function () { return sinon.spy(function () { }); };
var registrationRequestReturnsAssigning = function(pollingInterval) { return sinon.stub().callsArgWith(1, null, { status: 'Assigning' }, null, pollingInterval || 0); };
var registrationRequestReturnsAssigned = function() { return sinon.stub().callsArgWith(1, null, { status: 'Assigned' }); };
var registrationRequestReturnsFailed = function() { return sinon.stub().callsArgWith(1, null, { status: 'Failed' }); };
var registrationRequestReturnsFailure = function() { return sinon.stub().callsArgWith(1, new Error(fakeErrorText)); };
var registrationRequestReturnsBadResponse = function() { return sinon.stub().callsArgWith(1, null, { status: fakeBadStatus }); };
var operationStatusReturnsAssigned = function() { return sinon.stub().callsArgWith(2, null, { status: 'Assigned' }); };
var operationStatusReturnsFailed = function() { return sinon.stub().callsArgWith(2, null, { status: 'Failed' }); };
var operationStatusReturnsFailure = function() { return sinon.stub().callsArgWith(2, new Error(fakeErrorText)); };
var operationStatusReturnsBadResponse = function() { return sinon.stub().callsArgWith(2, null, { status: fakeBadStatus }); };
var operationStatusReturnsAssigningThenAssigned = function () {
  var callCount = 0;
  return sinon.spy(function (request, operationId, callback) {
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

describe('polling state machine', function () {
  this.timeout(1000);

  var makeNewMachine = function () {
    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_001: [ The `constructor` shall accept no arguments ] */
    var machine = new PollingStateMachine({
      cancel: sinon.stub().callsArg(0),
      registrationRequest: registrationRequestReturnsAssigned(),
      queryOperationStatus: operationStatusReturnsAssigned(),
      getErrorResult:sinon.stub().callsArg(0),
      disconnect: sinon.stub().callsArg(0)
    });
    return machine;
  };

  var assertNoTransportFunctionsCalled = function (machine) {
    assert.isFalse(machine._transport.cancel.called);
    assert.isFalse(machine._transport.registrationRequest.called);
    assert.isFalse(machine._transport.queryOperationStatus.called);
    assert.isFalse(machine._transport.getErrorResult.called);
  };

  var callRegisterWithDefaultArgs = function (callback) {
    machine.register(fakeRequest, callback);
  };

  var machine;
  beforeEach(function () {
    machine = makeNewMachine();
  });

  describe('register function', function () {

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_012: [ `register` shall call `PollingTransport.registrationRequest`. ] */
    describe('calls registrationRequest', function () {

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_013: [ If `PollingTransport.registrationRequest` fails, `register` shall fail. ] */
      it('and returns failure if it fails', function (testCallback) {
        machine._transport.registrationRequest = registrationRequestReturnsFailure();
        callRegisterWithDefaultArgs(function (err) {
          assert.instanceOf(err, Error);
          assert.strictEqual(err.message, fakeErrorText);
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_014: [ If `PollingTransport.registrationRequest` succeeds with status==Assigned, it shall emit an 'operationStatus' event and  call `callback` with null, the response body, and the protocol-specific result. ] */
      it ('and returns success if it succeeds with status===\'Assigned\'', function (testCallback) {
        callRegisterWithDefaultArgs(function (err,responseBody) {
          assert.oneOf(err, [null, undefined]);
          assert.strictEqual(responseBody.status, 'Assigned');
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_015: [ If `PollingTransport.registrationRequest` succeeds with status==Assigning, it shall emit an 'operationStatus' event and begin polling for operation status requests. ] */
      it('and starts polling if it succeeds with status===\'Assigning\'', function (testCallback) {
        machine._transport.registrationRequest = registrationRequestReturnsAssigning();
        machine._transport.queryOperationStatus = waitingForNetworkIo();
        callRegisterWithDefaultArgs(function () {});
        setTimeout(function () {
          assert(machine._transport.registrationRequest.calledOnce);
          assert(machine._transport.queryOperationStatus.calledOnce);
          machine.disconnect();
          testCallback();
        }, 2);
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_016: [ If `PollingTransport.registrationRequest` succeeds with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
      it('and returns failure if it succeeds with some other status', function (testCallback) {
        machine._transport.registrationRequest = registrationRequestReturnsBadResponse();
        callRegisterWithDefaultArgs(function (err) {
          assert.instanceOf(err, SyntaxError);
          assert.strictEqual(err.message, 'status is ' + fakeBadStatus);
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_028: [ If `PollingTransport.registrationRequest` succeeds with status==Failed, it shall fail with a `DeviceRegistrationFailedError` error ] */
      it('and returns failure if status==Failed', function (testCallback) {
        machine._transport.registrationRequest = registrationRequestReturnsFailed();
        callRegisterWithDefaultArgs(function (err) {
          assert.instanceOf(err, errors.DeviceRegistrationFailedError);
          testCallback();
        });
      });


      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_014: [ If `PollingTransport.registrationRequest` succeeds with status==Assigned, it shall emit an 'operationStatus' event and  call `callback` with null, the response body, and the protocol-specific result. ] */
      it('and fires an operationStatus event if it succeeds', function (testCallback) {
        machine.on('operationStatus', function (body) {
          assert.strictEqual(body.status, 'Assigned');
          testCallback();
        });
        callRegisterWithDefaultArgs(function () { });
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_018: [ When the polling interval elapses, `register` shall call `PollingTransport.queryOperationStatus`. ] */
    describe('then calls queryOperationStatus', function () {
      beforeEach(function () {
        machine._transport.registrationRequest = registrationRequestReturnsAssigning();
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_019: [ If `PollingTransport.queryOperationStatus` fails, `register` shall fail. ] */
      it ('and returns failure if it fails', function (testCallback) {
        machine._transport.queryOperationStatus = operationStatusReturnsFailure();
        callRegisterWithDefaultArgs(function (err) {
          assert(machine._transport.queryOperationStatus.calledOnce);
          assert.instanceOf(err, Error);
          assert.strictEqual(err.message, fakeErrorText);
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_020: [ If `PollingTransport.queryOperationStatus` succeeds with status==Assigned, `register` shall complete and pass the body of the response and the protocol-spefic result to the `callback`. ] */
      it ('and returns success if it succeeds with status===\'Assigned\'', function (testCallback) {
        callRegisterWithDefaultArgs(function (err, responseBody) {
          assert.oneOf(err, [null, undefined]);
          assert.strictEqual(responseBody.status, 'Assigned');
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_021: [ If `PollingTransport.queryOperationStatus` succeeds with status==Assigning, `register` shall emit an 'operationStatus' event and begin polling for operation status requests. ] */
      it ('and continues polling if it succeeds with status===\'Assigning\'', function (testCallback) {
        machine._transport.queryOperationStatus = operationStatusReturnsAssigningThenAssigned();

        callRegisterWithDefaultArgs(function (err, responseBody) {
          assert.oneOf(err, [null, undefined]);
          assert.strictEqual(responseBody.status, 'Assigned');
          assert(machine._transport.queryOperationStatus.calledTwice);
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_022: [ If `PollingTransport.queryOperationStatus` succeeds with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
      it ('and returns failure if it succeeds with some other status', function (testCallback) {
        machine._transport.queryOperationStatus = operationStatusReturnsBadResponse();
        callRegisterWithDefaultArgs(function (err) {
          assert.instanceOf(err, SyntaxError);
          assert.strictEqual(err.message, 'status is ' + fakeBadStatus);
          testCallback();
        });
      });

      it ('and returns failure if status==Failed', function (testCallback) {
        machine._transport.queryOperationStatus = operationStatusReturnsFailed();
        callRegisterWithDefaultArgs(function (err) {
          assert.instanceOf(err, errors.DeviceRegistrationFailedError);
          testCallback();
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_029: [ If `PollingTransport.queryOperationStatus` succeeds with status==Failed, it shall fail with a `DeviceRegistrationFailedError` error ] */

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_021: [ If `PollingTransport.queryOperationStatus` succeeds with status==Assigned, `register` shall emit an 'operationStatus' event and begin polling for operation status requests. ] */
      it ('and fires an operationStatus event if it succeeds', function (testCallback) {
        var handler = sinon.stub();
        machine.on('operationStatus', handler);
        callRegisterWithDefaultArgs(function (err) {
          assert.oneOf(err, [null, undefined]);
          assert(handler.calledTwice);
          testCallback();
        });
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
    it('fails if called while sending the first request', function (testCallback) {
      machine._transport.registrationRequest = waitingForNetworkIo();
      callRegisterWithDefaultArgs(function() {});

      setTimeout(function() {
        callRegisterWithDefaultArgs(function(err) {
          assert.strictEqual(err.constructor.name, 'InvalidOperationError');
          machine.cancel(function() {
            machine.disconnect();
            testCallback();
          });
        });
      }, 10);
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
    it('fails if called while waiting to poll', function (testCallback) {
      machine._transport.registrationRequest = registrationRequestReturnsAssigning(1000);
      callRegisterWithDefaultArgs(function() {});

      setTimeout(function() {
        callRegisterWithDefaultArgs(function(err) {
          assert.strictEqual(err.constructor.name, 'InvalidOperationError');
          machine.cancel(function() {});
          testCallback();
        });
      },10);
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
    it('fails if called while sending an operation status request', function (testCallback) {
      machine._transport.registrationRequest = registrationRequestReturnsAssigning(1);
      machine._transport.queryOperationStatus = waitingForNetworkIo();
      callRegisterWithDefaultArgs(function() {});

      setTimeout(function() {
        callRegisterWithDefaultArgs(function(err) {
          assert.strictEqual(err.constructor.name, 'InvalidOperationError');
          machine.cancel(function() {
            machine.disconnect();
            testCallback();
          });
        });
      },2);
    });
  });

  describe('cancel function', function () {

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_025: [ If `cancel` is called while disconnected, it shall immediately call its `callback`. ] */
    it('does nothing if called while disconnected', function (testCallback) {
      machine.cancel(function(err) {
        assert.oneOf(err, [null, undefined]);
        assert(machine);
        assertNoTransportFunctionsCalled(machine);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_030: [ If `cancel` is called while the transport is connected but idle, it shall immediately call its `callback`. ] */
    it('does nothing if called while idle', function (testCallback) {
      callRegisterWithDefaultArgs(function(err) {
        assert.oneOf(err, [null, undefined]);
        testCallback();
      });
    });

    describe('calls cancel', function () {

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `cancel` shall cause that registration to fail with an `OperationCancelledError`. ] */
      it('and causes register to fail if called while sending the first request', function (testCallback) {
        var registrationErr;
        var registrationCallback;
        machine._transport.registrationRequest = sinon.spy(function (request, callback) {
          registrationCallback = callback;
        });
        callRegisterWithDefaultArgs(function(err) {
          registrationErr = err;
          assert.instanceOf(err, errors.OperationCancelledError);
          assert(machine._transport.registrationRequest.calledOnce);
          assert.isFalse(machine._transport.queryOperationStatus.calledOnce);
        });
        machine.cancel(function() {
          setTimeout(function() {
            registrationCallback();
            assert(!!registrationErr);
            assert(machine._transport.cancel.calledOnce);
            testCallback();
          }, 2);
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `cancel` shall cause that registration to fail with an `OperationCancelledError`. ] */
      it('and causes register to fail if called while waiting to poll', function (testCallback) {
        var registrationErr;
        machine._transport.registrationRequest = registrationRequestReturnsAssigning(1000);
        callRegisterWithDefaultArgs(function(err) {
          registrationErr = err;
          assert.instanceOf(err, errors.OperationCancelledError);
          assert(machine._transport.registrationRequest.calledOnce);
          assert.isFalse(machine._transport.queryOperationStatus.calledOnce);
        });
        process.nextTick(function () {  // wait for us to enter waitingToPoll state
          machine.cancel(function() {
            process.nextTick(function() { // wait for cancelled op's callback to be called
              assert(!!registrationErr);
              assert(machine._transport.cancel.calledOnce);
              testCallback();
            });
          });
        });
      });

      /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `cancel` shall cause that registration to fail with an `OperationCancelledError`. ] */
      it('and causes register to fail if called while sending an operation status request', function (testCallback) {
        var registrationErr;
        machine._transport.registrationRequest = registrationRequestReturnsAssigning();
        machine._transport.queryOperationStatus = sinon.spy(function() {
          machine.cancel(function() {
            setTimeout(function() {
              assert(!!registrationErr);
              assert(machine._transport.cancel.calledOnce);
              machine.disconnect();
              testCallback();
            }, 2);
          });
        });
        callRegisterWithDefaultArgs(function(err) {
          registrationErr = err;
          assert.instanceOf(err, errors.OperationCancelledError);
          assert(machine._transport.registrationRequest.calledOnce);
          assert(machine._transport.queryOperationStatus.calledOnce);
        });
      });
    });
  });

  describe('disconnect function', function () {

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_031: [ If `disconnect` is called while disconnected, it shall immediately call its `callback`. ] */
    it ('does nothing if called while disconnected', function (testCallback) {
      machine._transport.disconnect = sinon.spy(() => assert.fail('transport disconnect should not be called'));

      machine.disconnect(function(err) {
        assert.oneOf(err, [null, undefined]);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_032: [ If `disconnect` is called while while the transport is connected but idle, it shall call `PollingTransport.disconnect` and call it's `callback` passing the results of the transport operation. ] */
    it ('calls transport disconnect if idle', function (testCallback) {
      machine._transport.disconnect = sinon.stub().callsArgWith(0, fakeError);

      callRegisterWithDefaultArgs(function(err) {
        assert.oneOf(err, [null, undefined]);

        machine.disconnect(function(err) {
          assert.strictEqual(err, fakeError);
          assert.isTrue(machine._transport.disconnect.calledOnce);
          testCallback();
        });
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_033: [ If `disconnect` is called while in the middle of a `registrationRequest` operation, the operation shall be cancelled and the transport shall be disconnected. ] */
    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_034: [ If `disconnect` is called while the state machine is waiting to poll, the current operation shall be cancelled and the transport shall be disconnected. ] */
    /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_035: [ If `disconnect` is called while in the middle of a `queryOperationStatus` operation, the operation shall be cancelled and the transport shall be disconnected. ] */
    [
      {
        name: 'registrationRequest',
        preconfigure: () => {
          machine._transport.registrationRequest = sinon.stub();
        },
        assert: () => {
          assert.isTrue(machine._transport.registrationRequest.calledOnce);
          assert.isFalse(machine._transport.queryOperationStatus.called);
        }
      },
      {
        name: 'polling',
        preconfigure: () => {
          machine._transport.registrationRequest = registrationRequestReturnsAssigning(1000);
        },
        assert: () => {
          assert.isTrue(machine._transport.registrationRequest.calledOnce);
          assert.isFalse(machine._transport.queryOperationStatus.called);
        }
      },
      {
        name: 'queryOperationStatus',
        preconfigure: () => {
          machine._transport.registrationRequest = registrationRequestReturnsAssigning();
          machine._transport.queryOperationStatus = sinon.stub();
        },
        assert: () => {
          assert.isTrue(machine._transport.registrationRequest.calledOnce);
          assert.isTrue(machine._transport.queryOperationStatus.calledOnce);
        }

      }
    ].forEach(function(op) {
      it ('cancels ' + op.name + ' and disconnects', function (testCallback) {
        var registerCallbackCalled = false;
        op.preconfigure();

        callRegisterWithDefaultArgs(function(err) {
          assert.instanceOf(err, errors.OperationCancelledError);
          registerCallbackCalled = true;
        });

        setTimeout(function () {
          machine.disconnect(function() {
            process.nextTick(function() {
              assert.isTrue(registerCallbackCalled);
              assert.isTrue(machine._transport.disconnect.calledOnce);
              op.assert();
              testCallback();
            });
          })
        }, 2);
      });
    });
  });

  /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_036: [ If `PollingTransport.registrationRequest` does not call its callback within `ProvisioningDeviceConstants.defaultTimeoutInterval` ms, register shall with with a `TimeoutError` error. ] */
  /* Tests_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_037: [ If `PollingTransport.queryOperationStatus` does not call its callback within `ProvisioningDeviceConstants.defaultTimeoutInterval` ms, register shall with with a `TimeoutError` error. ] */
  describe('timeout', function() {
    [
      {
        name: 'registrationRequest',
        preconfigure: () => {
          machine._transport.registrationRequest = sinon.stub();
        },
        assert: () => {
          assert.isTrue(machine._transport.registrationRequest.calledOnce);
          assert.isFalse(machine._transport.queryOperationStatus.called);
        }
      },
      {
        name: 'queryOperationStatus',
        preconfigure: () => {
          machine._transport.registrationRequest = registrationRequestReturnsAssigning();
          machine._transport.queryOperationStatus = sinon.stub();
        },
        assert: () => {
          assert.isTrue(machine._transport.registrationRequest.calledOnce);
          assert.isTrue(machine._transport.queryOperationStatus.calledOnce);
        }
      }
    ].forEach(function(op) {
      it ('happens if ' + op.name + ' never returns', function (testCallback) {
        var clock = sinon.useFakeTimers();
        var registerCallbackCalled = false;
        op.preconfigure();

        callRegisterWithDefaultArgs(function(err) {
          assert.instanceOf(err, errors.TimeoutError);;
          registerCallbackCalled = true;
        });

        clock.tick(ProvisioningDeviceConstants.defaultTimeoutInterval);
        process.nextTick(function() {
          assert.isTrue(registerCallbackCalled);
          op.assert();
          clock.restore();
          testCallback();
        });
      });
    });
  });
});


