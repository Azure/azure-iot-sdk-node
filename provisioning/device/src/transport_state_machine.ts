// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { errors, X509, SharedAccessSignature } from 'azure-iot-common';
import * as machina from 'machina';
import * as Provisioning from './transport_interface';
import { OperationList } from './operation_list';
import * as dbg from 'debug';
const debug = dbg('azure-device-provisioning:transport-fsm');

export interface TransportHandlers {
  connect(authorization: SharedAccessSignature | X509 | string, callback: (err?: Error) => void): void;
  disconnect(callback: (err?: Error) => void): void;
  registrationRequest(registrationId: string, authorization: SharedAccessSignature | X509 | string, requestBody: any, forceRegistration: boolean, callback: (err?: Error, body?: any, result?: any, pollingInterval?: number) => void): void;
  queryOperationStatus(registrationId: string, operationId: string, callback: (err?: Error, body?: any, result?: any, pollingInterval?: number) => void): void;
  getErrorResult(result: any): any;
}

export class TransportStateMachine extends EventEmitter implements Provisioning.Transport {
  private _fsm: machina.Fsm;
  private _pollingTimer: any;
  private _transport: TransportHandlers;
  private _pendingOperations: OperationList;

  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_001: [ The `constructor` shall accept no arguments ] */
  constructor() {
    super();
  }

  initialize(transport: TransportHandlers): void {
    this._transport = transport;
    this._pendingOperations = new OperationList();

    this._fsm = new machina.Fsm({
      namespace: 'provisioning-transport',
      initialState: 'disconnected',
      states: {
        disconnected: {
          _onEnter: (callback, err, body, result) => {
            this._pollingTimer = null;
            if (callback) {
              callback(err, body, result);
            }
          },
          connect: (authorization, callback) => {
            this._fsm.transition('connecting', callback, authorization);
          },
          register: (callback, registrationId, authorization, requestBody, forceRegistration) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_010: [ `register` shall connect the transport if it is not connected. ] */
            this._fsm.handle('connect', authorization, (err) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.transition('sending_registration_request', callback, registrationId, authorization, requestBody, forceRegistration);
              }
            });
          },
          disconnect: (callback) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_025: [ If `disconnect` is called while disconnected, it shall immediately call its `callback`. ] */
            // nothing to do.
            callback();
          }
        },
        connecting: {
          _onEnter: (callback, authorization) => {
            this._transport.connect(authorization, (err) => {
              if (err) {
                /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_011: [ `register` shall fail if the connection fails. ] */
                this._fsm.transition('disconnecting', callback, err);
              } else {
                this._fsm.transition('connected', callback);
              }
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        connected: {
          _onEnter: (callback, err, body, result) => {
            callback(err, body, result);
          },
          disconnect: (callback) => {
            this._fsm.transition('disconnecting', callback);
          },
          register: (callback, registrationId, authorization, requestBody, forceRegistration) => {
            this._fsm.transition('sending_registration_request', callback, registrationId, authorization, requestBody, forceRegistration);
          },
        },
        sending_registration_request: {
          _onEnter: (callback, registrationId, authorization, requestBody, forceRegistration) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_012: [ `register` shall call `TransportHandlers.registrationRequest`. ] */
            this._pendingOperations.operationStarted(callback);
            this._transport.registrationRequest(registrationId, authorization, requestBody, forceRegistration, (err, body, result, pollingInterval) => {
              // Check if the operation is still pending before transitioning.  We might be in a different state now and we don't want to mess that up.
              if (this._pendingOperations.operationIsStillPending(callback)) {
                this._fsm.transition('response_received', callback, err, registrationId, body, result, pollingInterval);
              }
            });
          },
          disconnect: (callback) => this._fsm.transition('disconnecting', callback),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
          register: (callback) => callback(new errors.InvalidOperationError('another operation is in progress'))
        },
        response_received: {
          _onEnter: (callback, err, registrationId, body, result, pollingInterval) => {
            if (err) {
              /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_013: [ If `TransportHandlers.registrationRequest` fails, `register` shall fail. ] */
              /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_019: [ If `TransportHandlers.queryOperationStatus` fails, `register` shall fail. ] */
              this._fsm.transition('response_error', callback, err);
            } else if (body) {
              debug('received response from service:' + JSON.stringify(body));
              switch (body.status.toLowerCase()) {
                case 'assigned': {
                  this._fsm.transition('response_complete', callback, body, result);
                  break;
                }
                case 'assigning': {
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_015: [ If `TransportHandlers.registrationRequest` succeeds with status==Assigning, it shall emit an 'operationStatus' event and begin polling for operation status requests. ] */
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_021: [ If `TransportHandlers.queryOperationStatus` succeeds with status==Assigning, `register` shall emit an 'operationStatus' event and begin polling for operation status requests. ] */
                  this.emit('operationStatus', body);
                  this._fsm.transition('waiting_to_poll', callback, registrationId, body.operationId, pollingInterval);
                  break;
                }
                default: {
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_016: [ If `TransportHandlers.registrationRequest` succeeds returns with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_022: [ If `TransportHandlers.queryOperationStatus` succeeds with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
                  let err = new SyntaxError('status is ' + body.status);
                  (err as any).result = result;
                  (err as any).body = body;
                  this._fsm.transition('response_error', callback, err, body, result);
                  break;
                }
              }
            } else {  // err == null && body == null
              let err = this._transport.getErrorResult(result);
              (err as any).result = result;
              (err as any).body = body;
              this._fsm.transition('response_error', callback, err, body, result);
            }
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        response_complete: {
          _onEnter: (callback, body, result) => {
            this._pendingOperations.operationEnded(callback);
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_014: [ If `TransportHandlers.registrationRequest` succeeds with status==Assigned, it shall emit an 'operationStatus' event and call `callback` with null, the response body, and the protocol-specific result. ] */
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_020: [ If `TransportHandlers.queryOperationStatus` succeeds with status==Assigned, `register` shall emit an 'operationStatus' event and complete and pass the body of the response and the protocol-spefic result to the `callback`. ] */
            this.emit('operationStatus', body);
            this._fsm.transition('connected', callback, null, body, result);
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        response_error: {
          _onEnter: (callback, err, body, result) => {
            this._pendingOperations.operationEnded(callback);
            if (this._errorIsFatal(err)) {
              this._fsm.transition('disconnecting', callback, err, body, result);
            } else {
              this._fsm.transition('connected', callback, err, body, result);
            }
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        waiting_to_poll: {
          _onEnter: (callback, registrationId, operationId, pollingInterval) => {
            debug('waiting for ' + pollingInterval + ' ms');
            this._pollingTimer = setTimeout(() => {
              this._fsm.transition('polling', callback, registrationId, operationId, pollingInterval);
            }, pollingInterval);
          },
          disconnect: (callback, err, body) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `disconnect` shall cause that registration to fail with an `OperationCancelledError`. ] */
            clearTimeout(this._pollingTimer);
            this._pollingTimer = null;
            this._fsm.transition('disconnecting', callback, err, body);
          },
          register: (callback) => callback(new errors.InvalidOperationError('another operation is in progress'))
        },
        polling: {
          _onEnter: (callback, registrationId, operationId, pollingInterval) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_018: [ When the polling interval elapses, `register` shall call `TransportHandlers.queryOperationStatus`. ] */
            this._transport.queryOperationStatus(registrationId, operationId, (err, body, result, pollingInterval) => {
              // Check if the operation is still pending before transitioning.  We might be in a different state now and we don't want to mess that up.
              if (this._pendingOperations.operationIsStillPending(callback)) {
                this._fsm.transition('response_received', callback, err, registrationId, body, result, pollingInterval);
              }
            });
          },
          disconnect: (callback) => this._fsm.transition('disconnecting', callback),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
          register: (callback) => callback(new errors.InvalidOperationError('another operation is in progress'))
        },
        disconnecting: {
          _onEnter: (callback, err, body, result) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `disconnect` shall cause that registration to fail with an `OperationCancelledError`. ] */
            this._pendingOperations.popAllPendingOperations((callback) => {
              callback(new errors.OperationCancelledError(''));
            });
            this._transport.disconnect((disconnectErr) => {
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

  register(registrationId: string, authorization: string | X509, requestBody: any, forceRegistration: boolean, callback: Provisioning.ResponseCallback): void {
    debug('register called for registrationId "' + registrationId + '"');
    this._fsm.handle('register', callback, registrationId, authorization, requestBody, forceRegistration);
  }

  disconnect(callback: (err: Error) => void): void {
    debug('disconnect called');
    this._fsm.handle('disconnect', callback);
  }

  private _errorIsFatal(err: Error): boolean {
    // TODO: for now, assume all errors are fatal.
    return true;
  }

}

