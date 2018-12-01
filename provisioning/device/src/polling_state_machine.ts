// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { errors, ErrorCallback, Callback, callbackToPromise, errorCallbackToPromise } from 'azure-iot-common';
import * as machina from 'machina';
import { ProvisioningDeviceConstants } from './constants';
import { PollingTransport, RegistrationRequest, DeviceRegistrationResult } from './interfaces';
import * as dbg from 'debug';
const debug = dbg('azure-iot-provisioning-device:PollingStateMachine');

/**
 * @private
 */
export class PollingStateMachine extends EventEmitter {
  private _fsm: machina.Fsm;
  private _pollingTimer: any;
  private _queryTimer: any;
  private _transport: PollingTransport;
  private _currentOperationCallback: any;

  constructor(transport: PollingTransport) {
    super();

    this._transport = transport;

    this._fsm = new machina.Fsm({
      namespace: 'provisioning-client-polling',
      initialState: 'disconnected',
      states: {
        disconnected: {
          _onEnter: (err, result, response, callback) => {
            if (callback) {
              callback(err, result, response);
            }
          },
          register: (request, callback) => this._fsm.transition('sendingRegistrationRequest', request, callback),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_025: [ If `cancel` is called while disconnected, it shall immediately call its `callback`. ] */
          cancel: (cancelledOpErr, callback) => callback(),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_031: [ If `disconnect` is called while disconnected, it shall immediately call its `callback`. ] */
          disconnect: (callback) => callback()
        },
        idle: {
          _onEnter: (err, result, response, callback) => callback(err, result, response),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_030: [ If `cancel` is called while the transport is connected but idle, it shall immediately call its `callback`. ] */
          cancel: (cancelledOpErr, callback) => callback(),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_032: [ If `disconnect` is called while while the transport is connected but idle, it shall call `PollingTransport.disconnect` and call it's `callback` passing the results of the transport operation. ] */
          disconnect: (callback) => this._fsm.transition('disconnecting', callback),
          register: (request, callback) => this._fsm.transition('sendingRegistrationRequest', request, callback)
        },
        sendingRegistrationRequest: {
          _onEnter: (request, callback) => {
            this._queryTimer = setTimeout(() => {
              /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_036: [ If `PollingTransport.registrationRequest` does not call its callback within `ProvisioningDeviceConstants.defaultTimeoutInterval` ms, register shall with with a `TimeoutError` error. ] */
              if (this._currentOperationCallback === callback) {
                debug('timeout while sending request');
                /* tslint:disable:no-empty */
                this._fsm.handle('cancel', new errors.TimeoutError(), () => { });
              }
            }, ProvisioningDeviceConstants.defaultTimeoutInterval);
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_012: [ `register` shall call `PollingTransport.registrationRequest`. ] */
            this._currentOperationCallback = callback;
            this._transport.registrationRequest(request, (err, result, response, pollingInterval) => {
              clearTimeout(this._queryTimer);
              // Check if the operation is still pending before transitioning.  We might be in a different state now and we don't want to mess that up.
              if (this._currentOperationCallback === callback) {
                this._fsm.transition('responseReceived', err, request, result, response, pollingInterval, callback);
              } else if (this._currentOperationCallback) {
                debug('Unexpected: received unexpected response for cancelled operation');
              }
            });
          },
          cancel: (cancelledOpErr, callback) => this._fsm.transition('cancelling', cancelledOpErr, callback),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_033: [ If `disconnect` is called while in the middle of a `registrationRequest` operation, the operation shall be cancelled and the transport shall be disconnected. ] */
          disconnect: (callback) => {
            this._fsm.handle('cancel', new errors.OperationCancelledError(''), (err) => {
              this._fsm.handle('disconnect', callback);
            });
          },
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
          register: (request, callback) => callback(new errors.InvalidOperationError('another operation is in progress'))
        },
        responseReceived: {
          _onEnter: (err, request, result, response, pollingInterval, callback) => {
            if (err) {
              /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_013: [ If `PollingTransport.registrationRequest` fails, `register` shall fail. ] */
              /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_019: [ If `PollingTransport.queryOperationStatus` fails, `register` shall fail. ] */
              this._fsm.transition('responseError', err, result, response, callback);
            } else {
              debug('received response from service:' + JSON.stringify(result));
              switch (result.status.toLowerCase()) {
                case 'assigned': {
                  this._fsm.transition('responseComplete', result, response, callback);
                  break;
                }
                case 'assigning': {
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_015: [ If `PollingTransport.registrationRequest` succeeds with status==Assigning, it shall emit an 'operationStatus' event and begin polling for operation status requests. ] */
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_021: [ If `PollingTransport.queryOperationStatus` succeeds with status==Assigning, `register` shall emit an 'operationStatus' event and begin polling for operation status requests. ] */
                  this.emit('operationStatus', result);
                  this._fsm.transition('waitingToPoll', request, result.operationId, pollingInterval, callback);
                  break;
                }
                case 'failed': {
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_028: [ If `TransportHandlers.registrationRequest` succeeds with status==Failed, it shall fail with a `DeviceRegistrationFailedError` error ] */
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_029: [ If `TransportHandlers.queryOperationStatus` succeeds with status==Failed, it shall fail with a `DeviceRegistrationFailedError` error ] */
                  let err = new errors.DeviceRegistrationFailedError('registration failed');
                  (err as any).result = result;
                  (err as any).response = response;
                  this._fsm.transition('responseError', err, result, response, callback);
                  break;
                }
                default: {
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_016: [ If `PollingTransport.registrationRequest` succeeds returns with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_022: [ If `PollingTransport.queryOperationStatus` succeeds with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
                  let err = new SyntaxError('status is ' + result.status);
                  (err as any).result = result;
                  (err as any).response = response;
                  this._fsm.transition('responseError', err, result, response, callback);
                  break;
                }
              }
            }
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        responseComplete: {
          _onEnter: (result, response, callback) => {
            this._currentOperationCallback = null;
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_014: [ If `PollingTransport.registrationRequest` succeeds with status==Assigned, it shall emit an 'operationStatus' event and call `callback` with null, the response body, and the protocol-specific result. ] */
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_020: [ If `PollingTransport.queryOperationStatus` succeeds with status==Assigned, `register` shall emit an 'operationStatus' event and complete and pass the body of the response and the protocol-specific result to the `callback`. ] */
            this.emit('operationStatus', result);
            this._fsm.transition('idle', null, result, response, callback);
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        responseError: {
          _onEnter: (err, result, response, callback) => {
            this._currentOperationCallback = null;
            this._fsm.transition('idle', err, result, response, callback);
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        waitingToPoll: {
          _onEnter: (request, operationId, pollingInterval, callback) => {
            debug('waiting for ' + pollingInterval + ' ms');
            this._pollingTimer = setTimeout(() => {
              this._fsm.transition('polling', request, operationId, pollingInterval, callback);
            }, pollingInterval);
          },
          cancel: (cancelledOpErr, callback) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `cancel` shall cause that registration to fail with an `OperationCancelledError`. ] */
            clearTimeout(this._pollingTimer);
            this._pollingTimer = null;
            this._fsm.transition('cancelling', cancelledOpErr, callback);
          },
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_034: [ If `disconnect` is called while the state machine is waiting to poll, the current operation shall be cancelled and the transport shall be disconnected. ] */
          disconnect: (callback) => {
            this._fsm.handle('cancel', new errors.OperationCancelledError(''), (err) => {
              this._fsm.handle('disconnect', callback);
            });
          },
          register: (request, callback) => callback(new errors.InvalidOperationError('another operation is in progress'))
        },
        polling: {
          _onEnter: (request, operationId, pollingInterval, callback) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_037: [ If `PollingTransport.queryOperationStatus` does not call its callback within `ProvisioningDeviceConstants.defaultTimeoutInterval` ms, register shall with with a `TimeoutError` error. ] */
            this._queryTimer = setTimeout(() => {
              debug('timeout while query');
              if (this._currentOperationCallback === callback) {
                /* tslint:disable:no-empty */
                this._fsm.handle('cancel', new errors.TimeoutError(), () => { });
              }
            }, ProvisioningDeviceConstants.defaultTimeoutInterval);
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_018: [ When the polling interval elapses, `register` shall call `PollingTransport.queryOperationStatus`. ] */
            this._transport.queryOperationStatus(request, operationId, (err, result, response, pollingInterval) => {
              clearTimeout(this._queryTimer);
              // Check if the operation is still pending before transitioning.  We might be in a different state now and we don't want to mess that up.
              if (this._currentOperationCallback === callback) {
                this._fsm.transition('responseReceived', err, request, result, response, pollingInterval, callback);
              } else if (this._currentOperationCallback) {
                debug('Unexpected: received unexpected response for cancelled operation');
              }
            });
          },
          cancel: (cancelledOpErr, callback) => this._fsm.transition('cancelling', cancelledOpErr, callback),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_035: [ If `disconnect` is called while in the middle of a `queryOperationStatus` operation, the operation shall be cancelled and the transport shall be disconnected. ] */
          disconnect: (callback) => {
            this._fsm.handle('cancel', new errors.OperationCancelledError(''), (err) => {
              this._fsm.handle('disconnect', callback);
            });
          },
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
          register: (request, callback) => callback(new errors.InvalidOperationError('another operation is in progress'))
        },
        cancelling: {
          _onEnter: (cancelledOpErr, callback) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `cancel` shall cause that registration to fail with an `OperationCancelledError`. ] */
            if (this._currentOperationCallback) {
              let _callback = this._currentOperationCallback;
              this._currentOperationCallback = null;
              process.nextTick(() => _callback(cancelledOpErr));
            }
            this._transport.cancel((cancelErr) => {
              if (cancelErr) {
                debug('error received from transport during cancel:' + cancelErr.toString());
              }
              this._fsm.transition('idle', cancelErr, null, null, callback);
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        disconnecting: {
          _onEnter: (callback) => {
            if (this._pollingTimer) {
              debug('cancelling polling timer');
              clearTimeout(this._pollingTimer);
            }

            if (this._queryTimer) {
              debug('cancelling query timer');
              clearTimeout(this._queryTimer);
            }

            this._transport.disconnect((err) => {
              this._fsm.transition('disconnected', err, null, null, callback);
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        }
      }
    });

    this._fsm.on('transition', (data) => {
      debug('completed transition from ' + data.fromState + ' to ' + data.toState);
    });
  }

  register(request: RegistrationRequest, callback: Callback<DeviceRegistrationResult>): void;
  register(request: RegistrationRequest): Promise<DeviceRegistrationResult>;
  register(request: RegistrationRequest, callback?: Callback<DeviceRegistrationResult>): Promise<DeviceRegistrationResult> | void {
    return callbackToPromise((_callback) => {
      debug('register called for registrationId "' + request.registrationId + '"');
      this._fsm.handle('register', request, _callback);
    }, callback);
  }

  cancel(callback: ErrorCallback): void;
  cancel(): Promise<void>;
  cancel(callback?: ErrorCallback): Promise<void> | void {
    return errorCallbackToPromise((_callback) => {
      debug('cancel called');
      this._fsm.handle('cancel', new errors.OperationCancelledError(''), _callback);
    }, callback);
  }

  disconnect(callback: ErrorCallback): void;
  disconnect(): Promise<void>;
  disconnect(callback?: ErrorCallback): Promise<void> | void {
    return errorCallbackToPromise((_callback) => {
      debug('disconnect called');
      this._fsm.handle('disconnect', _callback);
    }, callback);
  }
}


