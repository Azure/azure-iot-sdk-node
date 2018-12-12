import { EventEmitter } from 'events';
import * as machina from 'machina';
import * as dbg from 'debug';
const debug = dbg('azure-iot-provisioning-device:TpmRegistration');
import { anHourFromNow, Callback, callbackToPromise, ErrorCallback, errorCallbackToPromise } from 'azure-iot-common';
import { RegistrationClient, RegistrationResult } from './interfaces';
import { TpmProvisioningTransport, TpmSecurityClient, TpmRegistrationInfo } from './interfaces';
import { PollingStateMachine } from './polling_state_machine';

/**
 * @private
 */
export class TpmRegistration extends EventEmitter implements RegistrationClient {
  private _fsm: machina.Fsm;
  private _transport: TpmProvisioningTransport;
  private _securityClient: TpmSecurityClient;
  private _provisioningHost: string;
  private _idScope: string;
  private _pollingStateMachine: PollingStateMachine;

  constructor(provisioningHost: string, idScope: string, transport: TpmProvisioningTransport, securityClient: TpmSecurityClient) {
    super();
    this._transport = transport;
    this._securityClient = securityClient;
    this._provisioningHost = provisioningHost;
    this._idScope = idScope;
    this._pollingStateMachine = new PollingStateMachine(transport);

    this._fsm = new machina.Fsm({
      namespace: 'tpm-registration',
      initialState: 'notStarted',
      states: {
        notStarted: {
          _onEnter: (err, callback) => {
            if (callback) {
              callback(err);
            } else if (err) {
              this.emit('error', err);
            }
          },
          register: (request, callback) => this._fsm.transition('authenticating', request, callback),
          cancel: (callback) => callback()
        },
        authenticating: {
          _onEnter: (registrationInfo, registerCallback) => {
            /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_001: [The `register` method shall get the endorsement key by calling `getEndorsementKey` on the `TpmSecurityClient` object passed to the constructor.]*/
            this._securityClient.getEndorsementKey((err, ek) => {
              if (err) {
                debug('failed to get endorsement key from TPM security client: ' + err.toString());
                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                this._fsm.transition('notStarted', err, registerCallback);
              } else {
                registrationInfo.endorsementKey = ek;
                this._securityClient.getRegistrationId((err, registrationId) => {
                  if (err) {
                    debug('failed to get registrationId from TPM security client: ' + err.toString());
                    this._fsm.transition('notStarted', err, registerCallback);
                  } else {
                    registrationInfo.request.registrationId = registrationId;
                    this._fsm.handle('getStorageRootKey', registrationInfo, registerCallback);
                  }
                });
              }
            });
          },
          getStorageRootKey: (registrationInfo, registerCallback) => {
            /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_002: [The `register` method shall get the storage root key by calling `getStorageRootKey` on the `TpmSecurityClient` object passed to the constructor.]*/
            this._securityClient.getStorageRootKey((err, srk) => {
              if (err) {
                debug('failed to get storage root key from TPM security client: ' + err.toString());
                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                this._fsm.transition('notStarted', err, registerCallback);
              } else {
                registrationInfo.storageRootKey = srk;
                this._fsm.handle('getTpmChallenge', registrationInfo, registerCallback);
              }
            });
          },
          getTpmChallenge: (registrationInfo, registerCallback) => {

            this._transport.setTpmInformation(registrationInfo.endorsementKey, registrationInfo.storageRootKey);
            /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_003: [The `register` method shall initiate the authentication flow with the device provisioning service by calling the `getAuthenticationChallenge` method of the `TpmProvisioningTransport` object passed to the constructor with an object with the following properties:
            - `registrationId`: a unique identifier computed from the endorsement key
            - `provisioningHost`: the host address of the dps instance
            - `idScope`: the `idscope` value obtained from the azure portal for this instance.
            - a callback that will handle either an error or a `Buffer` object containing a session key to be used later in the authentication process.]*/
            this._transport.getAuthenticationChallenge(registrationInfo.request, (err, tpmChallenge) => {
              if (err) {
                debug('failed to get sessionKey from provisioning service: ' + err.toString());
                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                this._fsm.transition('notStarted', err, registerCallback);
              } else {
                this._fsm.handle('activateSessionKey', tpmChallenge, registrationInfo, registerCallback);
              }
            });
          },
          activateSessionKey: (tpmChallenge, registrationInfo, registerCallback) => {
            /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_004: [The `register` method shall store the session key in the TPM by calling the `activateIdentityKey` method of the `TpmSecurityClient` object passed to the constructor with the following arguments:
            - `sessionKey`: the session key returned by the previous call to `TpmProvisioningTransport.getAuthenticationChallenge`
            - a callback that will handle an optional error if the operation fails.]*/
            this._securityClient.activateIdentityKey(tpmChallenge, (err) => {
              if (err) {
                debug('failed to activate the sessionKey: ' + err.toString());
                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                this._fsm.transition('notStarted', err, registerCallback);
              } else {
                this._fsm.handle('createRegistrationSas', registrationInfo, registerCallback);
              }
            });
          },
          createRegistrationSas: (registrationInfo, registerCallback) => {
            this._createRegistrationSas(registrationInfo, (err, sasToken) => {
              if (err) {
                debug('failed to get sign the initial authentication payload with the sessionKey: ' + err.toString());
                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                this._fsm.transition('notStarted', err, registerCallback);
              } else {
                this._fsm.transition('respondToAuthenticationChallenge', registrationInfo, sasToken, registerCallback);
              }
            });
          },
          cancel: (callback) => {
            /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_011: [The `cancel` method shall interrupt the ongoing registration process.]*/
            this._transport.cancel((err) => {
              if (err) {
                debug('failed to stop provisioning transport: ' + err.toString());
              }
              this._fsm.transition('notStarted', err, callback);
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        respondToAuthenticationChallenge: {
          _onEnter: (registrationInfo, sasToken, registerCallback) => {
            this._transport.respondToAuthenticationChallenge(registrationInfo.request, sasToken, (err) => {
              if (err) {
                // TODO: verify that the transport is disconnected here.  Maybe add SRS in transport
                this._fsm.transition('notStarted', err, registerCallback);
              } else {
                this._fsm.transition('registrationInProgress', registrationInfo, registerCallback);
              }
            });
          },
          cancel: (callback) => {
            /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_011: [The `cancel` method shall interrupt the ongoing registration process.]*/
            this._transport.cancel((err) => {
              if (err) {
                debug('failed to stop provisioning transport: ' + err.toString());
              }
              this._fsm.transition('notStarted', err, callback);
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        registrationInProgress: {
          _onEnter: (registrationInfo, registerCallback) => {
            /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_007: [The `register` method shall start the actual registration process by calling the `register` method on the `TpmProvisioningTransport` object passed to the constructor with the following parameters:
            - `sasToken`: the SAS token generated according to `SRS_NODE_DPS_TPM_REGISTRATION_16_006`
            - `registrationInfo`: an object with the following properties `endorsementKey`, `storageRootKey`, `registrationId` and their previously set values.
            - a callback that will handle an optional error and a `result` object containing the IoT hub name, device id and symmetric key for this device.]*/
            this._pollingStateMachine.register(registrationInfo.request, (err, result) => {
              if (err) {
                debug('failed to register with provisioning transport: ' + err.toString());
                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                this._fsm.transition('notStarted', err, registerCallback);
              } else {
                this._fsm.transition('storingSecret', result, registerCallback);
              }
            });
          },
          cancel: (callback) => {
            /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_011: [The `cancel` method shall interrupt the ongoing registration process.]*/
            this._transport.cancel((err) => {
              if (err) {
                debug('failed to stop provisioning transport: ' + err.toString());
              }
              this._fsm.transition('notStarted', err, callback);
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        storingSecret: {
          _onEnter: (registrationResult, registerCallback) => {
            /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_008: [When the callback for the registration process is called, the `register` method shall store the symmetric key within the TPM by calling the `activateIdentityKey` method of the `TpmSecurityClient` object passed to the constructor with the following arguments:
            - `symmetricKey`: the symmetric key returned by the previous call to `TpmProvisioningTransport.getAuthenticationChallenge`
            - a callback that will handle an optional error if the operation fails.
            ]*/
            this._securityClient.activateIdentityKey(Buffer.from(registrationResult.registrationState.tpm.authenticationKey,'base64'), (err) => {
              if (err) {
                debug('failed to stop provisioning transport: ' + err.toString());
                /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_010: [If any of the calls the the `TpmSecurityClient` or the `TpmProvisioningTransport` fails, the `register` method shall call its callback with the error resulting from the failure.]*/
                this._fsm.transition('notStarted', err, registerCallback);
              } else {
                this._fsm.transition('completed', registrationResult, registerCallback);
              }
            });
          },
          cancel: (callback) => {
            /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_011: [The `cancel` method shall interrupt the ongoing registration process.]*/
              this._fsm.transition('notStarted', null, callback);
          },
           '*': () => this._fsm.deferUntilTransition()
        },
        completed: {
          _onEnter: (registrationResult, registerCallback) => {
            this._transport.disconnect((err) => {
              if (err) {
                debug('disconnect err.  ignoring. ' + err);
              }
              /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_009: [Once the symmetric key has been stored, the `register` method shall call its own callback with a `null` error object and a `TpmRegistrationResult` object containing the information that the `TpmProvisioningTransport` returned once the registration was successful.]*/
              registerCallback(null, registrationResult);
            });
          },
          cancel: (callback) => {
            // TODO: is this weird? also what type of error?
            callback(new Error('cannot cancel - registration was successfully completed'));
          }
        }
      }
    });

    this._fsm.on('transition', (data) => debug('TPM State Machine: ' + data.fromState + ' -> ' + data.toState + ' (' + data.action + ')'));
    this._fsm.on('handling', (data) => debug('TPM State Machine: handling ' + data.inputType));

  }

  register(callback: Callback<RegistrationResult>): void;
  register(): Promise<RegistrationResult>;
  register(callback?: Callback<RegistrationResult>): Promise<RegistrationResult> | void {
    return callbackToPromise((_callback) => {
      let registrationInfo: TpmRegistrationInfo = {
        endorsementKey: undefined,
        storageRootKey: undefined,
        request: {
          registrationId: null,
          idScope: this._idScope,
          provisioningHost: this._provisioningHost
        }
      };

      this._fsm.handle('register', registrationInfo, _callback);
    }, callback);
  }

  cancel(callback: ErrorCallback): void;
  cancel(): Promise<void>;
  cancel(callback?: ErrorCallback): Promise<void> | void {
    return errorCallbackToPromise((_callback) => {
      this._fsm.handle('cancel', _callback);
    }, callback);
  }

  private _createRegistrationSas(registrationInfo: TpmRegistrationInfo, callback: (err: Error, sasToken?: string) => void): void {

    /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_005: [The `register` method shall create a signature for the initial SAS token by signing the following payload with the session key and the `TpmSecurityClient`:
    ```
    <idScope>/registrations/<registrationId>\n<expiryTimeUtc>
    ```
    with:
    - `idScope` being the value of the `idScope` argument passed to the `TpmRegistration` constructor.
    - `registrationId` being the previously computed registration id.
    - `expiryTimeUtc` being the number of seconds since Epoch + a delay during which the initial sas token should be valid (1 hour by default).
    ]*/
    const expiryTimeUtc = anHourFromNow();
    const audience = encodeURIComponent(registrationInfo.request.idScope + '/registrations/' + registrationInfo.request.registrationId);
    const payload = new Buffer(audience + '\n' + expiryTimeUtc.toString());

    this._securityClient.signWithIdentity(payload, (err, signedBytes) => {
      if (err) {
        debug('failed to sign the initial authentication payload with sessionKey: ' + err.toString());
        callback(err);
      } else {
        const signature = encodeURIComponent(signedBytes.toString('base64'));
        /*Codes_SRS_NODE_DPS_TPM_REGISTRATION_16_006: [The `register` method shall create a SAS token to be used to get the actual registration result as follows:
        ```
        SharedAccessSignature sr=<audience>&sig=<signature>&se=<expiryTimeUtc>&skn=registration
        ```
        With the following fields:
        - `audience`: <idScope>/registrations/<registrationId>
        - `signature`: the base64 encoded version of the signature generated per `SRS_NODE_DPS_TPM_REGISTRATION_16_005`
        - `expiryTimeUtc`: the same value that was used to generate the signature.
        ]*/
        callback(null, 'SharedAccessSignature sr=' + audience + '&sig=' + signature + '&se=' + expiryTimeUtc.toString() + '&skn=registration');
      }
    });
  }
}
