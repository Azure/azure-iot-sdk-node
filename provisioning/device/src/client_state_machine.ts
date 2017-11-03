// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { errors } from 'azure-iot-common';
import * as machina from 'machina';
import * as Provisioning from './interfaces';
import * as dbg from 'debug';
const debug = dbg('azure-device-provisioning:transport-fsm');

export class  ClientStateMachine extends EventEmitter {
  private _fsm: machina.Fsm;
  private _pollingTimer: any;
  private _transport: Provisioning.TransportHandlers;
  private _currentOperationCallback: any;

  constructor(transport: Provisioning.TransportHandlers) {
    super();

    this._transport = transport;

    this._fsm = new machina.Fsm({
      namespace: 'provisioning-transport',
      initialState: 'disconnected',
      states: {
        disconnected: {
          _onEnter: (callback, err, body, result) => {
            this._currentOperationCallback = null;
            if (callback) {
              callback(err, body, result);
            }
          },
          register: (callback, registrationId, authorization, requestBody, forceRegistration) => {
            this._fsm.transition('sendingRegistrationRequest', callback, registrationId, authorization, requestBody, forceRegistration);
          },
          endSession: (callback) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_025: [ If `endSession` is called while disconnected, it shall immediately call its `callback`. ] */
            // nothing to do.
            callback();
          }
        },
        idle: {
          _onEnter: (callback, err, body, result) => {
            callback(err, body, result);
          },
          endSession: (callback) => {
            this._fsm.transition('endingSession', callback);
          },
          register: (callback, registrationId, authorization, requestBody, forceRegistration) => {
            this._fsm.transition('sendingRegistrationRequest', callback, registrationId, authorization, requestBody, forceRegistration);
          },
        },
        sendingRegistrationRequest: {
          _onEnter: (callback, registrationId, authorization, requestBody, forceRegistration) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_012: [ `register` shall call `TransportHandlers.registrationRequest`. ] */
            this._currentOperationCallback = callback;
            this._transport.registrationRequest(registrationId, authorization, requestBody, forceRegistration, (err, body, result, pollingInterval) => {
              // Check if the operation is still pending before transitioning.  We might be in a different state now and we don't want to mess that up.
              if (this._currentOperationCallback === callback) {
                this._fsm.transition('responseReceived', callback, err, registrationId, body, result, pollingInterval);
              } else if (this._currentOperationCallback) {
                debug('Unexpected: received unexpected response for cancelled operaton');
              }
            });
          },
          endSession: (callback) => this._fsm.transition('endingSession', callback),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
          register: (callback) => callback(new errors.InvalidOperationError('another operation is in progress'))
        },
        responseReceived: {
          _onEnter: (callback, err, registrationId, body, result, pollingInterval) => {
            if (err) {
              /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_013: [ If `TransportHandlers.registrationRequest` fails, `register` shall fail. ] */
              /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_019: [ If `TransportHandlers.queryOperationStatus` fails, `register` shall fail. ] */
              this._fsm.transition('responseError', callback, err);
            } else if (body) {
              debug('received response from service:' + JSON.stringify(body));
              switch (body.status.toLowerCase()) {
                case 'assigned': {
                  this._fsm.transition('responseComplete', callback, body, result);
                  break;
                }
                case 'assigning': {
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_015: [ If `TransportHandlers.registrationRequest` succeeds with status==Assigning, it shall emit an 'operationStatus' event and begin polling for operation status requests. ] */
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_021: [ If `TransportHandlers.queryOperationStatus` succeeds with status==Assigning, `register` shall emit an 'operationStatus' event and begin polling for operation status requests. ] */
                  this.emit('operationStatus', body);
                  this._fsm.transition('waitingToPoll', callback, registrationId, body.operationId, pollingInterval);
                  break;
                }
                default: {
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_016: [ If `TransportHandlers.registrationRequest` succeeds returns with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_022: [ If `TransportHandlers.queryOperationStatus` succeeds with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
                  let err = new SyntaxError('status is ' + body.status);
                  (err as any).result = result;
                  (err as any).body = body;
                  this._fsm.transition('responseError', callback, err, body, result);
                  break;
                }
              }
            } else {  // err == null && body == null
              let err = this._transport.getErrorResult(result);
              (err as any).result = result;
              (err as any).body = body;
              this._fsm.transition('responseError', callback, err, body, result);
            }
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        responseComplete: {
          _onEnter: (callback, body, result) => {
            this._currentOperationCallback = null;
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_014: [ If `TransportHandlers.registrationRequest` succeeds with status==Assigned, it shall emit an 'operationStatus' event and call `callback` with null, the response body, and the protocol-specific result. ] */
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_020: [ If `TransportHandlers.queryOperationStatus` succeeds with status==Assigned, `register` shall emit an 'operationStatus' event and complete and pass the body of the response and the protocol-spefic result to the `callback`. ] */
            this.emit('operationStatus', body);
            this._fsm.transition('idle', callback, null, body, result);
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        responseError: {
          _onEnter: (callback, err, body, result) => {
            this._currentOperationCallback = null;
            if (this._errorIsFatal(err)) {
              this._fsm.transition('endingSession', callback, err, body, result);
            } else {
              this._fsm.transition('idle', callback, err, body, result);
            }
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        waitingToPoll: {
          _onEnter: (callback, registrationId, operationId, pollingInterval) => {
            debug('waiting for ' + pollingInterval + ' ms');
            this._pollingTimer = setTimeout(() => {
              this._fsm.transition('polling', callback, registrationId, operationId, pollingInterval);
            }, pollingInterval);
          },
          endSession: (callback, err, body) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `endSession` shall cause that registration to fail with an `OperationCancelledError`. ] */
            clearTimeout(this._pollingTimer);
            this._pollingTimer = null;
            this._fsm.transition('endingSession', callback, err, body);
          },
          register: (callback) => callback(new errors.InvalidOperationError('another operation is in progress'))
        },
        polling: {
          _onEnter: (callback, registrationId, operationId, pollingInterval) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_018: [ When the polling interval elapses, `register` shall call `TransportHandlers.queryOperationStatus`. ] */
            this._transport.queryOperationStatus(registrationId, operationId, (err, body, result, pollingInterval) => {
              // Check if the operation is still pending before transitioning.  We might be in a different state now and we don't want to mess that up.
              if (this._currentOperationCallback === callback) {
                this._fsm.transition('responseReceived', callback, err, registrationId, body, result, pollingInterval);
              } else if (this._currentOperationCallback) {
                debug('Unexpected: received unexpected response for cancelled operation');
              }
            });
          },
          endSession: (callback) => this._fsm.transition('endingSession', callback),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
          register: (callback) => callback(new errors.InvalidOperationError('another operation is in progress'))
        },
        endingSession: {
          _onEnter: (callback, err, body, result) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `endSession` shall cause that registration to fail with an `OperationCancelledError`. ] */
            if (this._currentOperationCallback) {
              let _callback = this._currentOperationCallback;
              this._currentOperationCallback = null;
              _callback(new errors.OperationCancelledError(''));
            }
            this._transport.endSession((disconnectErr) => {
              if (disconnectErr) {
                debug('error received from transport during disconnection:' + disconnectErr.toString());
              }
              this._fsm.transition('disconnected', callback, err || disconnectErr, body, result);
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        }
      }
    });

    this._fsm.on('transition',  (data) => {
      debug('completed transition from ' + data.fromState + ' to ' + data.toState);
    });
  }

  register(registrationId: string, authorization: Provisioning.Authentication, requestBody: any, forceRegistration: boolean, callback: Provisioning.ResponseCallback): void {
    debug('register called for registrationId "' + registrationId + '"');
    this._fsm.handle('register', callback, registrationId, authorization, requestBody, forceRegistration);
  }

  endSession(callback: (err: Error) => void): void {
    debug('endSession called');
    this._fsm.handle('endSession', callback);
  }

  private _errorIsFatal(err: Error): boolean {
    // TODO: for now, assume all errors are fatal.
    return true;
  }

}

