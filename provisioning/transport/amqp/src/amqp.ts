// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { EventEmitter } from 'events';

import * as machina from 'machina';
import * as dbg from 'debug';
import * as uuid from 'uuid';
import * as async from 'async';
const debug = dbg('azure-device-provisioning-amqp:Amqp');

// tslint:disable-next-line:no-var-requires
const CLIENT_VERSION = 'azure-iot-provisioning-device/' + require('../package.json').version;
const API_VERSION = '2017-11-15';

import { X509 } from 'azure-iot-common';
import { ProvisioningTransportOptions, X509ProvisioningTransport, RegistrationRequest, RegistrationResult, PollingStateMachine, PollingTransportHandlers, ProvisioningDeviceConstants } from 'azure-iot-provisioning-device';
import { TpmProvisioningTransport, TpmRegistrationInfo, TpmRegistrationResult, TpmChallenge } from 'azure-iot-provisioning-device';
import { Amqp as Base, SenderLink, ReceiverLink, AmqpMessage } from 'azure-iot-amqp-base';

class MessagePropertyNames {
    // tslint:disable:variable-name
    static OperationType: string = 'iotdps-operation-type';
    static OperationId: string = 'iotdps-operation-id';
    static Status: string = 'iotdps-status';
    static ForceRegistration: string = 'iotdps-forceRegistration';
    // tslint:enable:variable-name
}

class DeviceOperations {
    // tslint:disable:variable-name
    static Register: string = 'iotdps-register';
    static GetRegistration: string = 'iotdps-get-registration';
    static GetOperationStatus: string = 'iotdps-get-operationstatus';
    // tslint:enable:variable-name
}

export class Amqp extends EventEmitter implements X509ProvisioningTransport, TpmProvisioningTransport, PollingTransportHandlers {
  private _amqpBase: Base;
  private _idScope: string;
  private _config: ProvisioningTransportOptions = {};
  private _registrationStateMachine: PollingStateMachine;
  private _amqpStateMachine: machina.Fsm;

  // AMQP links used during registration.
  private _receiverLink: ReceiverLink;
  private _senderLink: SenderLink;

  private _operations: {
    [key: string]: (err: Error, result?: RegistrationResult) => void;
  } = {};

  constructor(amqpBase?: Base) {
    super();
    this._amqpBase = amqpBase || new Base(true, CLIENT_VERSION);
    this._config.pollingInterval = ProvisioningDeviceConstants.defaultPollingInterval;
    this._config.timeoutInterval = ProvisioningDeviceConstants.defaultTimeoutInterval;

    this._registrationStateMachine = new PollingStateMachine(this);

    this._registrationStateMachine.on('operationStatus', (eventBody) => {
      this.emit('operationStatus', eventBody);
    });

    const amqpErrorListener = (err) => this._amqpStateMachine.handle('amqpError', err);

    const responseHandler = (msg) => {
      debug('got message with correlationId: ' + msg.correlationId);
      const registrationResult = JSON.parse(msg.data);
      if (this._operations[msg.correlationId]) {
        this._operations[msg.correlationId](null, registrationResult);
      } else {
        debug('ignoring message with unknown correlationId');
      }
    };

    this._amqpStateMachine = new machina.Fsm({
      namespace: 'provisioning-amqp',
      initialState: 'disconnected',
      states: {
        disconnected: {
          _onEnter: (err, registrationResult, callback) => {
            if (callback) {
              callback(err, registrationResult);
            } else if (err) {
              this.emit('error', err);
            }
          },
          registerX509: (request, authentication, callback) => {
            this._amqpStateMachine.transition('connecting', request, authentication, (err) => {
              if (err) {
                callback(err);
              } else {
                this._amqpStateMachine.handle('registerX509', request, authentication, callback);
              }
            });
          },
          getAuthenticationChallenge: () => {
            // TODO
          },
          registrationRequest: (request, requestBody, callback) => {
            // TODO: this only works for x509
            this._amqpStateMachine.transition('connecting', (err) => {
              if (err) {
                this._amqpStateMachine.transition('disconnected', err, null, callback);
              } else {
                this._amqpStateMachine.handle('registrationRequest', request, requestBody, callback);
              }
            });
          },
          queryOperationStatus: (request, operationId, callback) => {
            // TODO: this only works for x509
            this._amqpStateMachine.transition('connecting', (err) => {
              if (err) {
                this._amqpStateMachine.transition('disconnected', err, null, callback);
              } else {
                this._amqpStateMachine.handle('queryOperationStatus', request, operationId, callback);
              }
            });
          },
          sendMessage: (requestMessage, callback) => {
            // TODO: this only works for x509
            this._amqpStateMachine.transition('connecting', (err) => {
              if (err) {
                this._amqpStateMachine.transition('disconnected', err, null, callback);
              } else {
                this._amqpStateMachine.handle('sendMessage', requestMessage, callback);
              }
            });
          },
          cancel: (callback) => callback()
        },
        connecting: {
          _onEnter: (request, authentication, callback) => {
            this._amqpBase.connect('amqps://' + request.provisioningHost, authentication, (err) => {
              if (err) {
                this._amqpStateMachine.transition('disconnected', err, null, callback);
              } else {
                const linkEndpoint = this._idScope + '/registrations/' + request.registrationId;
                const linkOptions = {
                  attach: {
                    properties: {
                      'com.microsoft:api-version' : API_VERSION,
                      'com.microsoft:client-version': CLIENT_VERSION
                    }
                  }
                };

                this._amqpBase.attachReceiverLink(linkEndpoint, linkOptions, (err, receiverLink) => {
                  if (err) {
                    this._amqpStateMachine.transition('disconnecting', err, null, callback);
                  } else {
                    this._receiverLink = receiverLink;
                    this._receiverLink.on('error', amqpErrorListener);
                    this._receiverLink.on('message', responseHandler);
                    this._amqpBase.attachSenderLink(linkEndpoint, linkOptions, (err, senderLink) => {
                      if (err) {
                        this._amqpStateMachine.transition('disconnecting', err, null, callback);
                      } else {
                        this._senderLink = senderLink;
                        this._senderLink.on('error', amqpErrorListener);
                        this._amqpStateMachine.transition('connected', callback);
                      }
                    });
                  }
                });
              }
            });
          },
          cancel: (callback) => this._amqpStateMachine.transition('disconnecting', null, null, callback),
          '*': () => this._amqpStateMachine.deferUntilTransition()
        },
        connected: {
          _onEnter: (callback) => callback(),
          registerX509: (request, authentication, callback) => this._amqpStateMachine.transition('registering', request, authentication, callback),
          cancel: (callback) => this._amqpStateMachine.transition('disconnecting', null, null, callback)
        },
        registering: {
          _onEnter: (request, authentication, callback) => {
            this._registrationStateMachine.register(request, { 'registrationId' : request.registrationId }, (err, registrationResult) => {
              this._amqpStateMachine.transition('disconnecting', err, registrationResult, callback);
            });
          },
          registrationRequest: (request, requestBody, callback) => {
            let requestMessage = new AmqpMessage();
            requestMessage.body = '';
            requestMessage.applicationProperties = {};
            requestMessage.properties = {};
            requestMessage.applicationProperties[MessagePropertyNames.OperationType] = DeviceOperations.Register;
            requestMessage.applicationProperties[MessagePropertyNames.ForceRegistration] = !!request.forceRegistration;
            requestMessage.properties.correlationId = uuid.v4();

            debug('initial registration request: ' + JSON.stringify(requestMessage));

            this._amqpStateMachine.handle('sendMessage', requestMessage, callback);
          },
          queryOperationStatus: (request, operationId, callback) => {
            let requestMessage = new AmqpMessage();
            requestMessage.body = '';
            requestMessage.applicationProperties = {};
            requestMessage.properties = {};
            requestMessage.applicationProperties[MessagePropertyNames.OperationType] = DeviceOperations.GetOperationStatus;
            requestMessage.applicationProperties[MessagePropertyNames.OperationId] = operationId;
            requestMessage.properties.correlationId = uuid.v4();

            debug('registration status request: ' + JSON.stringify(requestMessage));

            this._amqpStateMachine.handle('sendMessage', requestMessage, callback);
          },
          sendMessage: (requestMessage, callback) => {
            debug('saving requestMessage with correlationId: ' + requestMessage.properties.correlationId);
            this._operations[requestMessage.properties.correlationId] = callback;

            this._senderLink.send(requestMessage, (err) => {
              if (err) {
                this._amqpStateMachine.transition('disconnecting', err, null, callback);
              } else {
                debug('registration request sent');
              }
            });
          },
          amqpError: (err) => {
            this._amqpStateMachine.transition('disconnecting', err);
          },
          cancel: (callback) => {
            this._registrationStateMachine.cancel((err) => {
              this._amqpStateMachine.transition('disconnecting', err, null, callback);
            });
          }
        },
        disconnecting: {
          _onEnter: (err, registrationResult, callback) => {
            let finalError = err;
            async.series([
              (callback) => {
                if (this._senderLink) {
                  const tmpLink = this._senderLink;
                  this._senderLink = null;

                  if (finalError) {
                    tmpLink.removeListener('error', amqpErrorListener);
                    tmpLink.forceDetach(finalError);
                    callback();
                  } else {
                    tmpLink.detach((err) => {
                      finalError = finalError || err;
                      tmpLink.removeListener('error', amqpErrorListener);
                      callback();
                    });
                  }
                } else {
                  callback();
                }
              },
              (callback) => {
                if (this._receiverLink) {
                  const tmpLink = this._receiverLink;
                  this._receiverLink = null;

                  if (finalError) {
                    tmpLink.removeListener('error', amqpErrorListener);
                    tmpLink.removeListener('message', responseHandler);
                    tmpLink.forceDetach(finalError);
                    callback();
                  } else {
                    tmpLink.detach((err) => {
                      finalError = finalError || err;
                      tmpLink.removeListener('error', amqpErrorListener);
                      tmpLink.removeListener('message', responseHandler);
                      callback();
                    });
                  }
                } else {
                  callback();
                }
              },
              (callback) => {
                this._amqpBase.disconnect((err) => {
                  finalError = finalError || err;
                  callback();
                });
              }
            ], () => {
              this._amqpStateMachine.transition('disconnected', finalError, registrationResult, callback);
            });
          },
          '*': () => this._amqpStateMachine.deferUntilTransition()
        }
      }
    });

    this._amqpStateMachine.on('transition', (data) => debug('AMQP State Machine: ' + data.fromState + ' -> ' + data.toState + ' (' + data.action + ')'));
  }

  setTransportOptions(options: ProvisioningTransportOptions): void {
    [
      'pollingInterval',
      'provisioningHost',
      'timeoutInterval'
    ].forEach((optionName) => {
      if (options.hasOwnProperty(optionName)) {
        this._config[optionName] = options[optionName];
      }
    });
  }

  /* X509ProvisioningTransport implementation */
  registerX509(request: RegistrationRequest, auth: X509, callback: (err?: Error, registrationResult?: RegistrationResult, body?: any, result?: any) => void): void {
    this._idScope = request.idScope;
    this._amqpStateMachine.handle('registerX509', request, auth, callback);
  }


  /* TpmProvisioningTransport implementation */
  getAuthenticationChallenge(registrationInfo: TpmRegistrationInfo, callback: (err?: Error, tpmChallenge?: TpmChallenge) => void): void {
    this._amqpStateMachine.handle('getAuthenticationChallenge', registrationInfo, callback);
  }

  register(registrationInfo: TpmRegistrationInfo, sasToken: string, callback: (err?: Error, result?: TpmRegistrationResult) => void): void {
    this._amqpStateMachine.handle('registerTPM', registrationInfo, sasToken, callback);
  }

  cancel(callback: (err?: Error) => void): void {
    this._amqpStateMachine.handle('cancel', callback);
  }

  /* PollingTransportHandler Implementation */
  registrationRequest(request: RegistrationRequest, requestBody: any, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void {
    this._amqpStateMachine.handle('registrationRequest', request, requestBody, callback);
  }

  queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void {
    this._amqpStateMachine.handle('queryOperationStatus', request, operationId, callback);
  }

  endSession(callback: (err?: Error) => void): void {
    this._amqpStateMachine.handle('cancel', callback);
  }
}
