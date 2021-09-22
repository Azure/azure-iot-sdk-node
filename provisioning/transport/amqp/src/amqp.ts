// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { EventEmitter } from 'events';

import * as machina from 'machina';
import * as dbg from 'debug';
import * as uuid from 'uuid';
import * as async from 'async';
const debug = dbg('azure-iot-provisioning-device-amqp:Amqp');
const debugErrors = dbg('azure-iot-provisioning-device-amqp:Amqp:Errors');

import { X509, errors } from 'azure-iot-common';
import { ProvisioningTransportOptions, X509ProvisioningTransport, TpmProvisioningTransport, SymmetricKeyProvisioningTransport, RegistrationRequest, RegistrationResult, ProvisioningDeviceConstants } from 'azure-iot-provisioning-device';
import { DeviceRegistration } from 'azure-iot-provisioning-device';
import { Amqp as Base, SenderLink, ReceiverLink, AmqpMessage, AmqpBaseTransportConfig, translateError, AmqpTransportError } from 'azure-iot-amqp-base';
import { GetSasTokenCallback, SaslTpm } from './sasl_tpm';
import { message as rheaMessage } from 'rhea';
/**
 * @private
 */
enum MessagePropertyNames {
    OperationType = 'iotdps-operation-type',
    OperationId = 'iotdps-operation-id',
    Status = 'iotdps-status',
    ForceRegistration = 'iotdps-forceRegistration',
    retryAfter = 'retry-after'
  }

/**
 * @private
 */
enum DeviceOperations {
    Register = 'iotdps-register',
    GetRegistration = 'iotdps-get-registration',
    GetOperationStatus = 'iotdps-get-operationstatus'
}

/**
 * Transport used to provision a device over AMQP.
 */
export class Amqp extends EventEmitter implements X509ProvisioningTransport, TpmProvisioningTransport, SymmetricKeyProvisioningTransport {
  private _amqpBase: Base;
  private _config: ProvisioningTransportOptions = {};
  private _amqpStateMachine: machina.Fsm;
  private _x509Auth: X509;
  private _sas: string;
  private _endorsementKey: Buffer;
  private _storageRootKey: Buffer;
  private _customSaslMechanism: SaslTpm;
  private _getSasTokenCallback: GetSasTokenCallback;

  // AMQP links used during registration.
  private _receiverLink: ReceiverLink;
  private _senderLink: SenderLink;


  private _operations: {
    [key: string]: (err?: Error, result?: RegistrationResult, transportResponse?: AmqpMessage, pollingInterval?: number) => void;
  } = {};

  /**
   * @private
   */
  constructor(amqpBase?: Base) {
    super();
    this._amqpBase = amqpBase || new Base(true);
    this._config.pollingInterval = ProvisioningDeviceConstants.defaultPollingInterval;

    const amqpErrorListener = (err) => this._amqpStateMachine.handle('amqpError', err);

    const responseHandler = (msg) => {
      debug('got message with correlation_id: ' + msg.correlation_id);
      /*Codes_SRS_NODE_PROVISIONING_AMQP_16_007: [The `registrationRequest` method shall call its callback with a `RegistrationResult` object parsed from the body of the response message which `correlation_id` matches the `correlation_id` of the request message sent on the sender link.]*/
      /*Codes_SRS_NODE_PROVISIONING_AMQP_16_017: [The `queryOperationStatus` method shall call its callback with a `RegistrationResult` object parsed from the body of the response message which `correlation_id` matches the `correlation_id` of the request message sent on the sender link.]*/
      const registrationResult = JSON.parse(msg.body.content);
      if (this._operations[msg.correlation_id]) {
        debug('Got the registration/operationStatus message we were looking for.');
        const requestCallback = this._operations[msg.correlation_id];
        delete this._operations[msg.correlation_id];
        let retryAfterInMilliseconds: number;
        /*Codes_SRS_NODE_PROVISIONING_AMQP_06_010: [If the amqp response to a request contains the application property`retry-after`, it will be interpreted as the number of seconds that should elapse before the next attempted operation.  Otherwise default.] */
        if (msg.application_properties && msg.application_properties[MessagePropertyNames.retryAfter]) {
          retryAfterInMilliseconds = Number(msg.application_properties[MessagePropertyNames.retryAfter]) * 1000;
          debug('registration/operation retry after value of: ' + msg.application_properties[MessagePropertyNames.retryAfter]);
        } else {
          debug('registration/operation retry after value defaulting.');
          retryAfterInMilliseconds = this._config.pollingInterval;
        }
        requestCallback(null, registrationResult, msg, retryAfterInMilliseconds);
      } else {
        debug('ignoring message with unknown correlation_id');
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
          registrationRequest: (request, correlationId, callback) => {
            this._operations[correlationId] = callback;
            this._amqpStateMachine.transition('connectingX509OrSymmetricKey', request, (err) => {
              if (err) {
                delete this._operations[correlationId];
                callback(err);
              } else {
                this._amqpStateMachine.handle('registrationRequest', request, correlationId, callback);
              }
            });
          },
          queryOperationStatus: (request, correlationId, operationId, callback) => {
            this._operations[correlationId] = callback;
            this._amqpStateMachine.transition('connectingX509OrSymmetricKey', request, (err) => {
              if (err) {
                delete this._operations[correlationId];
                callback(err);
              } else {
                this._amqpStateMachine.handle('queryOperationStatus', request, correlationId, operationId, callback);
              }
            });
          },
          getAuthenticationChallenge: (request, callback) => this._amqpStateMachine.transition('connectingTpm', request, callback),
          /*Codes_SRS_NODE_PROVISIONING_AMQP_18_017: [ `respondToAuthenticationChallenge` shall call `callback` with an `InvalidOperationError` if called before calling `getAuthenticationChallenge`. ]*/
          respondToAuthenticationChallenge: (_request, _sasToken, callback) => callback(new errors.InvalidOperationError('Cannot respond to challenge while disconnected.')),
          /*Codes_SRS_NODE_PROVISIONING_AMQP_18_003: [ `cancel` shall call its callback immediately if the AMQP connection is disconnected. ] */
          cancel: (callback) => callback(),
          /*Codes_SRS_NODE_PROVISIONING_AMQP_16_022: [`disconnect` shall call its callback immediately if the AMQP connection is disconnected.]*/
          disconnect: (callback) => callback()
        },
        connectingX509OrSymmetricKey: {
          _onEnter: (request, callback) => {
            /*Codes_SRS_NODE_PROVISIONING_AMQP_16_002: [The `registrationRequest` method shall connect the AMQP client with the certificate and key given in the `auth` parameter of the previously called `setAuthentication` method.]*/
            /*Codes_SRS_NODE_PROVISIONING_AMQP_16_012: [The `queryOperationStatus` method shall connect the AMQP client with the certificate and key given in the `auth` parameter of the previously called `setAuthentication` method. **]**]*/
            let config: AmqpBaseTransportConfig = {
              uri: this._getConnectionUri(request),
              sslOptions: this._x509Auth,
              userAgentString: ProvisioningDeviceConstants.userAgent
            };
            /*Codes_SRS_NODE_PROVISIONING_AMQP_99_001: [The `registrationRequest` method shall connect the AMQP client with the agent given in the `webSocketAgent` parameter of the previously called `setTransportOptions` method.]*/
            config.sslOptions = config.sslOptions || {};
            config.sslOptions.agent = this._config.webSocketAgent;
            if (this._sas) {
              /*Codes_SRS_NODE_PROVISIONING_AMQP_06_002: [** The `registrationRequest` method shall connect the amqp client, if utilizing the passed in sas from setSharedAccessSignature, shall in the connect options set the username to:
                ```
                <scopeId>/registrations/<registrationId>
                ```
                and shall set the password to the passed in sas token.
                ] */
              config.policyOverride = {
                username: request.idScope + '/registrations/' + request.registrationId,
                password: this._sas
              };
            }
            this._amqpBase.connect(config, (err) => {
              if (err) {
                debugErrors('_amqpBase.connect failed');
                debugErrors(err);
                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_008: [The `registrationRequest` method shall call its callback with an error if the transport fails to connect.]*/
                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_018: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to connect.]*/
                this._amqpStateMachine.transition('disconnected', err, null, callback);
              } else {
                this._amqpStateMachine.transition('attachingLinks', request, callback);
              }
            });
          },
          /*Codes_SRS_NODE_PROVISIONING_AMQP_18_005: [ `cancel` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
          cancel: (callback) => {
            this._cancelAllOperations();
            this._amqpStateMachine.transition('disconnecting', null, null, callback);
          },
          /*Codes_SRS_NODE_PROVISIONING_AMQP_18_009: [ `disconnect` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
          disconnect: (callback) => {
            this._cancelAllOperations();
            this._amqpStateMachine.transition('disconnecting', null, null, callback);
          },
          '*': () => this._amqpStateMachine.deferUntilTransition()
        },

        connectingTpm: {
          _onEnter: (request, callback) => this._getAuthChallenge(request, callback),

          respondToAuthenticationChallenge: (request, sasToken, callback) => {
            let completionCompleteHandler = this._amqpStateMachine.on('tpmConnectionComplete', (err) => {
              completionCompleteHandler.off();
              if (err) {
                /*Codes_SRS_NODE_PROVISIONING_AMQP_18_019: [ `respondToAuthenticationChallenge` shall call `callback` with an Error object if the connection has a failure. ]*/
                this._amqpStateMachine.transition('disconnected', err, null, callback);
              } else {
                /*Codes_SRS_NODE_PROVISIONING_AMQP_18_020: [ `respondToAuthenticationChallenge` shall attach sender and receiver links if the connection completes successfully. ]*/
                this._amqpStateMachine.transition('attachingLinks', request, callback);
              }
            });

            this._respondToAuthChallenge(sasToken);
          },

          tpmConnectionComplete: (err) => {
            this._amqpStateMachine.emit('tpmConnectionComplete', err);
          },

          /*Codes_SRS_NODE_PROVISIONING_AMQP_18_005: [ `cancel` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
          cancel: (callback) => {
            this._cancelAllOperations();
            this._amqpStateMachine.transition('disconnecting', null, null, callback);
          },
          /*Codes_SRS_NODE_PROVISIONING_AMQP_18_009: [ `disconnect` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
          disconnect: (callback) => {
            this._cancelAllOperations();
            this._amqpStateMachine.transition('disconnecting', null, null, callback);
          },
          '*': () => this._amqpStateMachine.deferUntilTransition()
        },

        attachingLinks: {
          _onEnter: (request, callback) => {
            const linkEndpoint = request.idScope + '/registrations/' + request.registrationId;
            const linkOptions = {
              properties: {
                'com.microsoft:api-version' : ProvisioningDeviceConstants.apiVersion
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
                debugErrors('_amqpBase.attachReceiverLink failed');
                debugErrors(err);
                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_010: [The `registrationRequest` method shall call its callback with an error if the transport fails to attach the receiver link.]*/
                /*Codes_SRS_NODE_PROVISIONING_AMQP_16_020: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to attach the receiver link.]*/
                /*Codes_SRS_NODE_PROVISIONING_AMQP_18_022: [ `respondToAuthenticationChallenge` shall call its callback passing an `Error` object if the transport fails to attach the receiver link. ]*/
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
                    debugErrors('_amqpBase.attachSenderLink failed');
                    debugErrors(err);
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_16_009: [The `registrationRequest` method shall call its callback with an error if the transport fails to attach the sender link.]*/
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_16_019: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to attach the sender link.]*/
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_021: [ `respondToAuthenticationChallenge` shall call its callback passing an `Error` object if the transport fails to attach the sender link. ]*/
                    this._amqpStateMachine.transition('disconnecting', err, null, callback);
                  } else {
                    this._senderLink = senderLink;
                    this._senderLink.on('error', amqpErrorListener);
                    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_023: [ `respondToAuthenticationChallenge` shall call its callback passing `null` if the AMQP connection is established and links are attached. ]*/
                    this._amqpStateMachine.transition('connected', callback);
                  }
                });
              }
            });
          },
          /*Codes_SRS_NODE_PROVISIONING_AMQP_18_005: [ `cancel` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
          cancel: (callback) => {
            this._cancelAllOperations();
            this._amqpStateMachine.transition('disconnecting', null, null, callback);
          },
          /*Codes_SRS_NODE_PROVISIONING_AMQP_18_009: [ `disconnect` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
          disconnect: (callback) => {
            this._cancelAllOperations();
            this._amqpStateMachine.transition('disconnecting', null, null, callback);
          },
          '*': () => this._amqpStateMachine.deferUntilTransition()
        },
        connected: {
          _onEnter: (callback) => callback(),
          registrationRequest: (request, correlationId, callback) => {

            /*Codes_SRS_NODE_PROVISIONING_AMQP_16_005: [The `registrationRequest` method shall send a message on the previously attached sender link with a `correlation_id` set to a newly generated UUID and the following application properties:
            ```
            iotdps-operation-type: iotdps-register;
            iotdps-forceRegistration: <true or false>;
            ```
            ]*/

            let requestMessage = new AmqpMessage();
            /*Codes_SRS_NODE_PROVISIONING_AMQP_06_003: [ The `registrationRequest` will send a body in the message which contains a stringified JSON object with a `registrationId` property.] */
            let requestBody: DeviceRegistration = {registrationId: request.registrationId};
            /*Codes_SRS_NODE_PROVISIONING_AMQP_06_004: [The `registrationRequest` will, if utilizing TPM attestation, send a `tpm` property with the endorsement and storage key in the JSON body.] */
            if (this._endorsementKey) {
              requestBody.tpm = {endorsementKey: this._endorsementKey.toString('base64')};
              if (this._storageRootKey) {
                requestBody.tpm.storageRootKey = this._storageRootKey.toString('base64');
              }
            }
            /*Codes_SRS_NODE_PROVISIONING_AMQP_06_005: [The `registrationRequest` will, if utilizing custom allocation data, send a `payload` property in the JSON body.] */
            if (request.payload) {
              requestBody.payload = request.payload;
            }
            requestMessage.body = rheaMessage.data_section(Buffer.from(JSON.stringify(requestBody)));
            requestMessage.application_properties = {};
            requestMessage.application_properties[MessagePropertyNames.OperationType] = DeviceOperations.Register;
            requestMessage.application_properties[MessagePropertyNames.ForceRegistration] = !!request.forceRegistration;
            requestMessage.correlation_id = correlationId;

            debug('initial registration request: ' + JSON.stringify(requestMessage));
            this._operations[requestMessage.correlation_id] = callback;
            this._senderLink.send(requestMessage, (err) => {
              if (err) {
                delete this._operations[requestMessage.correlation_id];
                const translatedError = translateError('registration failure', err);
                /*Codes_SRS_NODE_PROVISIONING_AMQP_06_007: [If the `registrationRequest` send request is rejected with an `InternalError` or `ThrottlingError`, the result.status value will be set with `registering` and the callback will be invoked with *no* error object.] */
                if ((translatedError instanceof errors.InternalServerError) || ((translatedError as AmqpTransportError) instanceof errors.ThrottlingError)) {
                  debugErrors('retryable error on registration: ' + err.name);
                  let retryAfterInMilliseconds: number;
                  /*Codes_SRS_NODE_PROVISIONING_AMQP_06_009: [If the `registrationRequest` rejection error contains the info property`retry-after`, it will be interpreted as the number of seconds that should elapse before the next attempted operation.  Otherwise default.] */
                  if ((err as any).info && (err as any).info[MessagePropertyNames.retryAfter]) {
                    retryAfterInMilliseconds = Number(((err as any).info[MessagePropertyNames.retryAfter] as string)) * 1000;
                  } else {
                    retryAfterInMilliseconds = this._config.pollingInterval;
                  }
                  callback(null, {status: 'registering'}, null, retryAfterInMilliseconds);
                } else {
                  debugErrors('non-retryable error on registration: ' + err);
                  /*Codes_SRS_NODE_PROVISIONING_AMQP_16_011: [The `registrationRequest` method shall call its callback with an error if the transport fails to send the request message.]*/
                  callback(err);
                }
              } else {
                debug('registration request sent with correlation_id: ' + requestMessage.correlation_id);
              }
            });
          },
          queryOperationStatus: (_request, correlationId, operationId, callback) => {

            /*Codes_SRS_NODE_PROVISIONING_AMQP_16_015: [The `queryOperationStatus` method shall send a message on the pre-attached sender link with a `correlation_id` set to a newly generated UUID and the following application properties:
            ```
            iotdps-operation-type: iotdps-get-operationstatus;
            iotdps-operation-id: <operationId>;
            ```*/
            let requestMessage = new AmqpMessage();
            requestMessage.body = '';
            requestMessage.application_properties = {};
            requestMessage.application_properties[MessagePropertyNames.OperationType] = DeviceOperations.GetOperationStatus;
            requestMessage.application_properties[MessagePropertyNames.OperationId] = operationId;
            requestMessage.correlation_id = correlationId;

            debug('registration status request: ' + JSON.stringify(requestMessage));
            this._operations[requestMessage.correlation_id] = callback;
            this._senderLink.send(requestMessage, (err) => {
              if (err) {
                delete this._operations[requestMessage.correlation_id];
                const translatedError = translateError('query operation status failure', err);
                /*Codes_SRS_NODE_PROVISIONING_AMQP_06_006: [If the `queryOperationStatus` send request is rejected with an `InternalError` or `ThrottlingError`, the result.status value will be set with `assigning` and the callback will be invoked with *no* error object.] */
                if ((translatedError instanceof errors.InternalServerError) || ((translatedError as AmqpTransportError) instanceof errors.ThrottlingError)) {
                  debugErrors('retryable error on queryOperationStatus: ' + err);
                  let retryAfterInMilliseconds: number;
                  /*Codes_SRS_NODE_PROVISIONING_AMQP_06_008: [If the `queryOperationsStatus` rejection error contains the info property`retry-after`, it will be interpreted as the number of seconds that should elapse before the next attempted operation.  Otherwise default.] */
                  if ((err as any).info && (err as any).info[MessagePropertyNames.retryAfter]) {
                    retryAfterInMilliseconds = Number(((err as any).info[MessagePropertyNames.retryAfter] as string)) * 1000;
                  } else {
                    retryAfterInMilliseconds = this._config.pollingInterval;
                  }
                  callback(null, {status: 'assigning', operationId: operationId}, null, retryAfterInMilliseconds);
                } else {
                  debugErrors('non-retryable error on queryOperationStatus: ' + err);
                  /*Codes_SRS_NODE_PROVISIONING_AMQP_16_021: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to send the request message.]*/
                  callback(err);
                }
              } else {
                debug('registration status request sent with correlation_id: ' + requestMessage.correlation_id);
              }
            });
          },
          amqpError: (err) => {
            this._amqpStateMachine.transition('disconnecting', err);
          },
          cancel: (callback) => {
            /*Codes_SRS_NODE_PROVISIONING_AMQP_18_004: [ `cancel` shall call its callback immediately if the AMQP connection is connected but idle. ] */
            /*Codes_SRS_NODE_PROVISIONING_AMQP_18_006: [ `cancel` shall cause a `registrationRequest` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
            /*Codes_SRS_NODE_PROVISIONING_AMQP_18_007: [ `cancel` shall cause a `queryOperationStatus` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
            /*Codes_SRS_NODE_PROVISIONING_AMQP_18_008: [ `cancel` shall not disconnect the AMQP transport. ] */
            this._cancelAllOperations();
            callback();
          },
          disconnect: (callback) => {
            /*Codes_SRS_NODE_PROVISIONING_AMQP_18_001: [ `disconnect` shall cause a `registrationRequest` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
            /*Codes_SRS_NODE_PROVISIONING_AMQP_18_002: [ `disconnect` shall cause a `queryOperationStatus` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
            this._cancelAllOperations();
            this._amqpStateMachine.transition('disconnecting', null, null, callback);
          }
        },
        disconnecting: {
          _onEnter: (err, registrationResult, callback) => {
            /*Codes_SRS_NODE_PROVISIONING_AMQP_16_023: [`disconnect` shall detach the sender and receiver links and disconnect the AMQP connection.]*/
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
              /*Codes_SRS_NODE_PROVISIONING_AMQP_16_024: [`disconnect` shall call its callback with no arguments if all detach/disconnect operations were successful.]*/
              /*Codes_SRS_NODE_PROVISIONING_AMQP_16_025: [`disconnect` shall call its callback with the error passed from the first unsuccessful detach/disconnect operation if one of those fail.]*/
              this._amqpStateMachine.transition('disconnected', finalError, registrationResult, callback);
            });
          },
          '*': () => this._amqpStateMachine.deferUntilTransition()
        }
      }
    });

    this._amqpStateMachine.on('transition', (data) => debug('AMQP State Machine: ' + data.fromState + ' -> ' + data.toState + ' (' + data.action + ')'));
    this._amqpStateMachine.on('handling', (data) => debug('AMQP State Machine: handling ' + data.inputType));
  }

  /**
   * @private
   */
  setTransportOptions(options: ProvisioningTransportOptions): void {
    [
      'pollingInterval',
      'webSocketAgent'
    ].forEach((optionName) => {
      if (options.hasOwnProperty(optionName)) {
        this._config[optionName] = options[optionName];
      }
    });
  }

  /**
   * @private
   */
  setAuthentication(auth: X509): void {
    /*Codes_SRS_NODE_PROVISIONING_AMQP_16_001: [The certificate and key passed as properties of the `auth` argument shall be used to connect to the Device Provisioning Service endpoint, when a registration request or registration operation status request are made.]*/
    this._x509Auth = auth;
  }

  /**
   * @private
   */
  setSharedAccessSignature(sas: string): void {
    /*Codes_SRS_NODE_PROVISIONING_AMQP_06_001: [ The sas passed shall be saved into the current transport object. ] */
    this._sas = sas;
  }

  /**
   * @private
   */
  registrationRequest(request: RegistrationRequest, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void {
    let correlationId: string = uuid.v4();
    this._amqpStateMachine.handle('registrationRequest', request, correlationId, callback);
  }

  /**
   * @private
   */
  queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, responseBody?: any, result?: any, pollingInterval?: number) => void): void {
    let correlationId: string = uuid.v4();
    this._amqpStateMachine.handle('queryOperationStatus', request, correlationId, operationId, callback);
  }

  /**
   * @private
   */
  /*Codes_SRS_NODE_PROVISIONING_AMQP_18_010: [ The `endorsementKey` and `storageRootKey` passed into `setTpmInformation` shall be used when getting the authentication challenge from the AMQP service. ]*/
  setTpmInformation(endorsementKey: Buffer, storageRootKey: Buffer): void {
    this._endorsementKey = endorsementKey;
    this._storageRootKey = storageRootKey;
  }

  /**
   * @private
   */
  getAuthenticationChallenge(request: RegistrationRequest, callback: (err: Error, tpmChallenge?: Buffer) => void): void {
    this._amqpStateMachine.handle('getAuthenticationChallenge', request, callback);
  }

  /**
   * @private
   */
  respondToAuthenticationChallenge(request: RegistrationRequest, sasToken: string, callback: (err?: Error) => void): void {
    this._amqpStateMachine.handle('respondToAuthenticationChallenge', request, sasToken, callback);
  }

  /**
   * @private
   */
  cancel(callback: (err?: Error) => void): void {
    this._amqpStateMachine.handle('cancel', callback);
  }

  /**
   * @private
   */
  disconnect(callback: (err?: Error) => void): void {
    this._amqpStateMachine.handle('disconnect', callback);
  }

  /**
   * @private
   */
  protected _getConnectionUri(request: RegistrationRequest): string {
    return 'amqps://' + request.provisioningHost;
  }

  /**
   * @private
   */
  private _cancelAllOperations(): void {
    debug('cancelling all operations');
    for (let op in this._operations) {
      debug('cancelling ' + op);
      let callback = this._operations[op];
      delete this._operations[op];
      process.nextTick(() => {
        callback(new errors.OperationCancelledError());
      });
    }
  }

  private _getAuthChallenge(request: RegistrationRequest, callback: (err: Error, tpmChallenge?: Buffer) => void): void {
    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_012: [ `getAuthenticationChallenge` shall send the challenge to the AMQP service using a hostname of "<idScope>/registrations/<registrationId>". ]*/
    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_013: [ `getAuthenticationChallenge` shall send the initial buffer for the authentication challenge in the form "<0><idScope><0><registrationId><0><endorsementKey>" where <0> is a zero byte. ]*/
    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_014: [ `getAuthenticationChallenge` shall send the initial response to the AMQP service in the form  "<0><storageRootKey>" where <0> is a zero byte. ]*/
    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_011: [ `getAuthenticationChallenge` shall initiate connection with the AMQP client using the TPM SASL mechanism. ]*/
    this._customSaslMechanism = new SaslTpm(request.idScope, request.registrationId, this._endorsementKey, this._storageRootKey, (challenge, getSasTokenCallback) => {
      this._getSasTokenCallback = getSasTokenCallback;
      /*Codes_SRS_NODE_PROVISIONING_AMQP_18_015: [ `getAuthenticationChallenge` shall call `callback` passing `null` and the challenge buffer after the challenge has been received from the service. ]*/
      callback(null, challenge);
    });

    const config: AmqpBaseTransportConfig = {
      uri: this._getConnectionUri(request),
      saslMechanismName: this._customSaslMechanism.name,
      saslMechanism: this._customSaslMechanism,
      userAgentString: ProvisioningDeviceConstants.userAgent
    };
    this._amqpBase.connect(config, (err) => {
      this._amqpStateMachine.handle('tpmConnectionComplete', err);
    });
  }

  private _respondToAuthChallenge(sasToken: string): void {
    /*Codes_SRS_NODE_PROVISIONING_AMQP_18_018: [ `respondToAuthenticationChallenge` shall respond to the auth challenge to the service in the form "<0><sasToken>" where <0> is a zero byte. ]*/
    this._getSasTokenCallback(null, sasToken);
  }
}





