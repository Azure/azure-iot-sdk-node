// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { errors, X509, SharedAccessSignature } from 'azure-iot-common';
import * as machina from 'machina';
import * as Provisioning from './transport_interface';
import * as dbg from 'debug';
const debug = dbg('azure-device-provisioning:transport-fsm');

export interface TransportHandlers {
  _doConnectForFsm(callback: (err?: Error) => void): void;
  _doDisconnectForFsm(callback: (err?: Error) => void): void;
  _doFirstRegistrationRequestForFsm(registrationId: string, authorization: SharedAccessSignature | X509 | string, requestBody: any, forceRegistration: boolean, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void;
  _doOperationStatusQueryForFsm(registrationId: string, operationId: string, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void;
  _getErrorFromResultForFsm(result: any): any;
}

export class TransportStateMachine extends EventEmitter implements Provisioning.Transport, TransportHandlers{
  protected _apiVersion: string = '2017-08-31-preview';
  private _fsm: machina.Fsm;
  private _pollingTimer: any;
  private _registrationCallback: Provisioning.ResponseCallback;

  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_001: [ The `constructor` shall accept no arguments ] */
  constructor() {
    super();

    this._fsm = new machina.Fsm({
      namespace: 'Provisioning',
      initialState: 'disconnected',
      states: {
        disconnected: {
          _onEnter: (callback, err) => {
            debug('entering disconnected state');
            this._pollingTimer = null;
            this._registrationCallback = null;
            if (callback) {
              callback(err);
            }
          },
          connect: (callback) => {
            this._fsm.transition('connecting', callback);
          },
          register: (callback, registrationId, authorization, requestBody, forceRegistration) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_010: [ `register` shall `connect` the transport if it is not connected. ] */
            this._fsm.handle('connect', (err) => {
              if (err) {
                this._fsm.transition('disconnecting', callback, err);
              } else {
                this._fsm.transition('sendingRegistrationReqest', callback, registrationId, authorization, requestBody, forceRegistration);
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
          _onEnter: (callback) => {
            debug('entering connecting state');
            debug('calling transport _doConnectForFsm');
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_002: [ `connect` shall call `_doConnectForFsm`. ] */
            this._doConnectForFsm((err) => {
              /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_003: [ If `_doConnectForFsm` fails, then `connect` shall fail. ] */
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
            debug('entering connected state');
            callback(err, body, result);
          },
          connect: (callback) => {
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_004: [ If the transport is already connected, then `connect` shall do nothing and call the `callback` immediately. ] */
            // nothing to do.
            callback();
          },
          disconnect: (callback) => {
            this._fsm.transition('disconnecting', callback);
          },
          register: (callback, registrationId, authorization, requestBody, forceRegistration) => {
            this._fsm.transition('sendingRegistrationRequest', callback, registrationId, authorization, requestBody, forceRegistration);
          },
        },
        sendingRegistrationReqest: {
          _onEnter: (callback, registrationId, authorization, requestBody, forceRegistration) => {
            debug('entering sendingRegistrationRequest state');
            this._registrationCallback = callback;
            debug('calling transport _doFirstRegistrationRequestForFsm');
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_012: [ `register` shall call `_doFirstRegistrationRequestForFsm`. ] */
            this._doFirstRegistrationRequestForFsm(registrationId, authorization, requestBody, forceRegistration, (err, responseBody, result, pollingInterval) => {
              if (this._registrationInProgress()) { // make sure we weren't cancelled before doing something with the response
                if (err) {
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_013: [ If the registration request fails, `register` shall fail. ] */
                  this._fsm.transition('connected', callback, err);
                } else {
                  this._handleOperationStatusResponse(registrationId, responseBody, result, pollingInterval, callback);
                }
              }
            });
          },
          disconnect: (callback) => this._fsm.transition('disconnecting', callback),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_006: [ If `connect` is called while the transport is executing the first registration request, it shall do nothing and call `callback` immediately. ] */
          connect: (callback) => callback(),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
          register: (callback) => callback(new errors.InvalidOperationError('another operation is in progress'))
        },
        waiting_to_poll: {
          _onEnter: (callback, registrationId, operationId, pollingInterval) => {
            debug('entering waitingToPoll state');
            debug('waiting for ' + pollingInterval + ' ms');
            this._pollingTimer = setTimeout(() => {
              this._fsm.transition('polling', callback, registrationId, operationId, pollingInterval);
            }, pollingInterval);
          },
          disconnect: (callback, err, responseBody) => this._fsm.transition('disconnecting', callback, err, responseBody),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_007: [ If `connect` is called while the transport is waiting between operation status queries, it shall do nothing and call `callback` immediately. ] */
          connect: (callback) => callback(),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
          register: (callback) => callback(new errors.InvalidOperationError('another operation is in progress'))
        },
        polling: {
          _onEnter: (callback, registrationId, operationId, pollingInterval) => {
            debug('entering polling state');
            debug('calling transport _doOperationStatusQueryForFsm');
              /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_018: [ When the polling interval elapses, `register` shall call `_doOperationStatusQueryForFsm`. ] */
              this._doOperationStatusQueryForFsm(registrationId, operationId, (err, result, body, pollingInterval) => {
              if (this._registrationInProgress()) { // make sure we weren't cancelled before doing something with the response
                if (err) {
                  /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_019: [ If `_doOperationStatusQueryForFsm` fails, `register` shall fail. ] */
                  this._fsm.transition('connected', callback, err);
                } else {
                  this._handleOperationStatusResponse(registrationId, result, body, pollingInterval, callback);
                }
              }
            });
          },
          disconnect: (callback) => this._fsm.transition('disconnecting', callback),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_008: [ If `connect` is called while the transport is executing an operation status query, it shall do nothing and call `callback` immediately. ] */
          connect: (callback) => callback(),
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_024: [ If `register` is called while a different request is in progress, it shall fail with an `InvalidOperationError`. ] */
          register: (callback) => callback(new errors.InvalidOperationError('another operation is in progress'))
        },
        disconnecting: {
          _onEnter: (callback, err) => {
            debug('entering disconnecting state');
            /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_027: [ If a registration is in progress, `disconnect` shall cause that registration to fail with an `OperationCancelledError`. ] */
            this._cancelCurrentOperation((cancelErr) => {
              // log any errors, which are extremely unlikely, but continue disconnecting.
              if (cancelErr) {
                debug('error received from transport during disconnection (1):' + cancelErr.toString());
              }
              debug('calling transport _doDisconnectForFsm');
              /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_026: [ `disconnect` shall call `_doDisconnectForFsm` of it's called while the transport is connected. ] */
              this._doDisconnectForFsm((disconnectErr) => {
                if (disconnectErr) {
                  debug('error received from transport during disconnection (2):' + cancelErr.toString());
                }
                this._fsm.transition('disconnected', callback, err);
              });
            });
          },
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_009: [ If `connect` is called while the transport is disconnecting, it shall wait for the disconnection to complete, then initiate the connection. ] */
          '*': () => this._fsm.deferUntilTransition()
        }
      }
    });
  }

  /* istanbul ignore next */
  _doConnectForFsm(callback: (err?: Error) => void): void {
    throw new errors.NotImplementedError('_doConnectForFsm not implemented in this transport');
  }

  /* istanbul ignore next */
  _doDisconnectForFsm(callback: (err?: Error) => void): void {
    throw new errors.NotImplementedError('_doDisconnectForFsm not implemented in this transport');
  }

  /* istanbul ignore next */
  _doFirstRegistrationRequestForFsm(registrationId: string, authorization: SharedAccessSignature | X509 | string, requestBody: any, forceRegistration: boolean, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void {
    throw new errors.NotImplementedError('_doFirstRegistrationRequestForFsm not implemented in this transport');
  }

  /* istanbul ignore next */
  _doOperationStatusQueryForFsm(registrationId: string, operationId: string, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void {
    throw new errors.NotImplementedError('_doOperationStatusQueryForFsm not implemented in this transport');
  }

  /* istanbul ignore next */
  _getErrorFromResultForFsm(result: any): any {
    throw new errors.NotImplementedError('_getErrorFromResultForFsm not implemented in this transport');
  }


  connect(callback: (err?: Error) => void): void {
    debug('connect called');
    this._fsm.handle('connect', callback);
  }

  register(registrationId: string, authorization: string | X509, requestBody: any, forceRegistration: boolean, callback: Provisioning.ResponseCallback): void {
    debug('register called for registrationId "' + registrationId + '"');
    this._fsm.handle('register', callback, registrationId, authorization, requestBody, forceRegistration);
  }

  disconnect(callback: (err: Error) => void): void {
    debug('disconnect called');
    this._fsm.handle('disconnect', callback);
  }

  private _cancelCurrentOperation(callback: (err?: Error) => void): void {
    if (this._pollingTimer != null) {
      debug('_cancelCurrentOperation: stopping polling timer');
      clearTimeout(this._pollingTimer);
      this._pollingTimer = null;
    }

    if (this._registrationInProgress()) {
      debug('_cancelCurrentOperation: operation is in progress.  Cancelling.');
      let _callback = this._registrationCallback;
      this._registrationCallback = null;
      _callback(new errors.OperationCancelledError());
    }

    callback();
  }
  private _handleOperationStatusResponse(registrationId: string,  responseBody: any, result: any, pollingInterval: number, callback: any): void {
    if (responseBody) {
      debug('received response from service:' + JSON.stringify(responseBody));
      switch (responseBody.status.toLowerCase()) {
        case 'assigned': {
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_017: [ If the registration request returns a successful, `register` shall emit an 'operationStatus' event passing the body of the response. ] */
          this.emit('operationStatus', responseBody);
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_014: [ If the registration request returns with status==assigned, it shall call `callback` with null, the response body, and the protocol-specific result. ] */
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_020: [ If `_doOperationStatusQueryForFsm` succeeds with status==Assigned, `register` shall complete and pass the body of the response and the protocol-spefic result to the `callback`. ] */
          this._fsm.transition('connected', callback, null, responseBody, result);
          break;
        }
        case 'assigning': {
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_023: [ If `_doOperationStatusQueryForFsm` succeeds, `register` shall emit an 'operationStatus' event passing the body of the response. ] */
          this.emit('operationStatus', responseBody);
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_015: [ If the registration request returns with status==Assigning, it shall begin polling for operation status requests. ] */
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_021: [ If `_doOperationStatusQueryForFsm` succeeds with status==Assigned, `register` shall begin another polling interval. ] */
          this._fsm.transition('waiting_to_poll', callback, registrationId, responseBody.operationId, pollingInterval);
          break;
        }
        default: {
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_016: [ If the registration request returns with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
          /* Codes_SRS_NODE_PROVISIONING_TRANSPORT_STATE_MACHINE_18_022: [ If `_doOperationStatusQueryForFsm` succeeds with an unknown status, `register` shall fail with a `SyntaxError` and pass the response body and the protocol-specific result to the `callback`. ] */
          let err = new SyntaxError('status is ' + responseBody.status);
          (err as any).Result = result;
          (err as any).ResponseBody = responseBody;
          this._fsm.transition('connected', callback, err);
          break;
        }
      }
    } else {
      let err = this._getErrorFromResultForFsm(result);
      (err as any).Result = result;
      (err as any).ResponseBody = responseBody;
      this._fsm.transition('connected', callback, err, responseBody, result);
    }
  }


  private _registrationInProgress(): boolean {
    return (this._registrationCallback != null);
  }
}

