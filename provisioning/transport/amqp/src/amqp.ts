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
// TODO: use apiVersion and userAgent from constants.ts
import { X509 } from 'azure-iot-common';
import { ProvisioningTransportOptions, X509ProvisioningTransport, RegistrationRequest, RegistrationResult, ProvisioningDeviceConstants } from 'azure-iot-provisioning-device';
import { Amqp as Base, SenderLink, ReceiverLink, AmqpMessage } from 'azure-iot-amqp-base';

enum MessagePropertyNames {
    OperationType = 'iotdps-operation-type',
    OperationId = 'iotdps-operation-id',
    Status = 'iotdps-status',
    ForceRegistration = 'iotdps-forceRegistration'
}

enum DeviceOperations {
    Register = 'iotdps-register',
    GetRegistration = 'iotdps-get-registration',
    GetOperationStatus = 'iotdps-get-operationstatus'
}

export class Amqp extends EventEmitter implements X509ProvisioningTransport {
  private _amqpBase: Base;
  private _config: ProvisioningTransportOptions = {};
  private _amqpStateMachine: machina.Fsm;
  private _x509Auth: X509;

  // AMQP links used during registration.
  private _receiverLink: ReceiverLink;
  private _senderLink: SenderLink;

  private _operations: {
    [key: string]: (err?: Error, result?: RegistrationResult, transportResponse?: AmqpMessage, pollingInterval?: number) => void;
  } = {};

  constructor(amqpBase?: Base) {
    super();
    this._amqpBase = amqpBase || new Base(true, ProvisioningDeviceConstants.userAgent);
    this._config.pollingInterval = ProvisioningDeviceConstants.defaultPollingInterval;
    this._config.timeoutInterval = ProvisioningDeviceConstants.defaultTimeoutInterval;

    const amqpErrorListener = (err) => this._amqpStateMachine.handle('amqpError', err);

    const responseHandler = (msg) => {
      debug('got message with correlationId: ' + msg.correlationId);
      /*Codes_SRS_NODE_PROVISIONING_AMQP_16_007: [The `registrationRequest` method shall call its callback with a `RegistrationResult` object parsed from the body of the response message which `correlationId` matches the `correlationId` of the request message sent on the sender link.]*/
      /*Codes_SRS_NODE_PROVISIONING_AMQP_16_017: [The `queryOperationStatus` method shall call its callback with a `RegistrationResult` object parsed from the body of the response message which `correlationId` matches the `correlationId` of the request message sent on the sender link.]*/
      const registrationResult = JSON.parse(msg.data);
      if (this._operations[msg.correlationId]) {
        this._operations[msg.correlationId](null, registrationResult, msg, this._config.pollingInterval);
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
          registrationRequest: (request, callback) => {
            // TODO: this only works for x509
            this._amqpStateMachine.transition('connecting', request, (err) => {
              if (err) {
                callback(err);
              } else {
                this._amqpStateMachine.handle('registrationRequest', request, callback);
              }
            });
          },
          queryOperationStatus: (request, operationId, callback) => {
            // TODO: this only works for x509
            this._amqpStateMachine.transition('connecting', request, (err) => {
              if (err) {
                callback(err);
              } else {
                this._amqpStateMachine.handle('queryOperationStatus', request, operationId, callback);
              }
            });
          },
          /*Codes_SRS_NODE_PROVISIONING_AMQP_16_022: [`cancel` shall call its callback immediately if the AMQP connection is disconnected.]*/
          cancel: (callback) => callback()
        },
        connecting: {
          _onEnter: (request, callback) => {
            /*Codes_SRS_NODE_PROVISIONING_AMQP_16_002: [The `registrationRequest` method shall connect the AMQP client with the certificate and key given in the `auth` parameter of the previously called `setAuthentication` method.]*/
            /*Codes_SRS_NODE_PROVISIONING_AMQP_16_012: [The `queryOperationStatus` method shall connect the AMQP client with the certificate and key given in the `auth` parameter of the previously called `setAuthentication` method. **]**]*/
            this._amqpBase.connect('amqps://' + request.provisioningHost, this._x509Auth, (err) => {
              if (err) {
                debug('_amqpBase.connect failed');
                debug(err);
                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_008: [The `registrationRequest` method shall call its callback with an error if the transport fails to connect.]*/
                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_018: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to connect.]*/
                this._amqpStateMachine.transition('disconnected', err, null, callback);
              } else {
                const linkEndpoint = request.idScope + '/registrations/' + request.registrationId;
                const linkOptions = {
                  attach: {
                    properties: {
                      'com.microsoft:api-version' : ProvisioningDeviceConstants.apiVersion,
                      'com.microsoft:client-version': ProvisioningDeviceConstants.userAgent
                    }
                  }
                };

                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_004: [The `registrationRequest` method shall attach a receiver link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
                ```
                com.microsoft:api-version: <API_VERSION>
                com.microsoft:client-version: <CLIENT_VERSION>
                ```]*/
                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_014: [The `queryOperationStatus` method shall attach a receiver link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
                ```
                com.microsoft:api-version: <API_VERSION>
                com.microsoft:client-version: <CLIENT_VERSION>
                ```*/
                this._amqpBase.attachReceiverLink(linkEndpoint, linkOptions, (err, receiverLink) => {
                  if (err) {
                    debug('_amqpBase.attachReceiverLink failed');
                    debug(err);
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_16_010: [The `registrationRequest` method shall call its callback with an error if the transport fails to attach the receiver link.]*/
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_16_020: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to attach the receiver link.]*/
                    this._amqpStateMachine.transition('disconnecting', err, null, callback);
                  } else {
                    this._receiverLink = receiverLink;
                    this._receiverLink.on('error', amqpErrorListener);
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_16_006: [The `registrationRequest` method shall listen for the response on the receiver link and accept it when it comes.]*/
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_16_016: [The `queryOperationStatus` method shall listen for the response on the receiver link and accept it when it comes.]*/
                    this._receiverLink.on('message', responseHandler);

                    /*Codes_SRS_NODE_PROVISIONING_AMQP_16_003: [The `registrationRequest` method shall attach a sender link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
                    ```
                    com.microsoft:api-version: <API_VERSION>
                    com.microsoft:client-version: <CLIENT_VERSION>
                    ```]*/
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_16_013: [The `queryOperationStatus` method shall attach a sender link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
                    ```
                    com.microsoft:api-version: <API_VERSION>
                    com.microsoft:client-version: <CLIENT_VERSION>
                    ```*/
                    this._amqpBase.attachSenderLink(linkEndpoint, linkOptions, (err, senderLink) => {
                      if (err) {
                        debug('_amqpBase.attachSenderLink failed');
                        debug(err);
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_16_009: [The `registrationRequest` method shall call its callback with an error if the transport fails to attach the sender link.]*/
                        /*Codes_SRS_NODE_PROVISIONING_AMQP_16_019: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to attach the sender link.]*/
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
          /*Codes_SRS_NODE_PROVISIONING_AMQP_16_023: [`cancel` shall detach the sender and receiver links and disconnect the AMQP connection.]*/
          cancel: (callback) => this._amqpStateMachine.transition('disconnecting', null, null, callback),
          '*': () => this._amqpStateMachine.deferUntilTransition()
        },
        connected: {
          _onEnter: (callback) => callback(),
          registrationRequest: (request, callback) => {

            /*Codes_SRS_NODE_PROVISIONING_AMQP_16_005: [The `registrationRequest` method shall send a message on the previously attached sender link with a `correlationId` set to a newly generated UUID and the following application properties:
            ```
            iotdps-operation-type: iotdps-register;
            iotdps-forceRegistration: <true or false>;
            ```
            ]*/
            let requestMessage = new AmqpMessage();
            requestMessage.body = '';
            requestMessage.applicationProperties = {};
            requestMessage.properties = {};
            requestMessage.applicationProperties[MessagePropertyNames.OperationType] = DeviceOperations.Register;
            requestMessage.applicationProperties[MessagePropertyNames.ForceRegistration] = !!request.forceRegistration;
            requestMessage.properties.correlationId = uuid.v4();

            debug('initial registration request: ' + JSON.stringify(requestMessage));
            this._operations[requestMessage.properties.correlationId] = callback;
            this._senderLink.send(requestMessage, (err) => {
              if (err) {
                this._operations[requestMessage.properties.correlationId] = undefined;
                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_011: [The `registrationRequest` method shall call its callback with an error if the transport fails to send the request message.]*/
                callback(err, null, null, this._config.pollingInterval);
              } else {
                debug('registration request sent with correlationId: ' + requestMessage.properties.correlationId);
              }
            });
          },
          queryOperationStatus: (request, operationId, callback) => {
            /*Codes_SRS_NODE_PROVISIONING_AMQP_16_015: [The `queryOperationStatus` method shall send a message on the pre-attached sender link with a `correlationId` set to a newly generated UUID and the following application properties:
            ```
            iotdps-operation-type: iotdps-get-operationstatus;
            iotdps-operation-id: <operationId>;
            ```*/
            let requestMessage = new AmqpMessage();
            requestMessage.body = '';
            requestMessage.applicationProperties = {};
            requestMessage.properties = {};
            requestMessage.applicationProperties[MessagePropertyNames.OperationType] = DeviceOperations.GetOperationStatus;
            requestMessage.applicationProperties[MessagePropertyNames.OperationId] = operationId;
            requestMessage.properties.correlationId = uuid.v4();

            debug('registration status request: ' + JSON.stringify(requestMessage));
            this._operations[requestMessage.properties.correlationId] = callback;
            this._senderLink.send(requestMessage, (err) => {
              if (err) {
                this._operations[requestMessage.properties.correlationId] = undefined;
                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_021: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to send the request message.]*/
                callback(err, null, null, this._config.pollingInterval);
              } else {
                debug('registration status request sent with correlationId: ' + requestMessage.properties.correlationId);
              }
            });
          },
          amqpError: (err) => {
            this._amqpStateMachine.transition('disconnecting', err);
          },
          cancel: (callback) => this._amqpStateMachine.transition('disconnecting', null, null, callback),
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
              /*Codes_SRS_NODE_PROVISIONING_AMQP_16_024: [`cancel` shall call its callback with no arguments if all detach/disconnect operations were successful.]*/
              /*Codes_SRS_NODE_PROVISIONING_AMQP_16_025: [`cancel` shall call its callback with the error passed from the first unsuccessful detach/disconnect operation if one of those fail.]*/
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
      'timeoutInterval'
    ].forEach((optionName) => {
      if (options.hasOwnProperty(optionName)) {
        this._config[optionName] = options[optionName];
      }
    });
  }

  setAuthentication(auth: X509): void {
    /*Codes_SRS_NODE_PROVISIONING_AMQP_16_001: [The certificate and key passed as properties of the `auth` argument shall be used to connect to the Device Provisioning Service endpoint, when a registration request or registration operation status request are made.]*/
    this._x509Auth = auth;
  }

  registrationRequest(request: RegistrationRequest, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void {
    this._amqpStateMachine.handle('registrationRequest', request, callback);
  }

  queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void {
    this._amqpStateMachine.handle('queryOperationStatus', request, operationId, callback);
  }

  cancel(callback: (err?: Error) => void): void {
    this._amqpStateMachine.handle('cancel', callback);
  }
}
