import * as dbg from 'debug';
const debug = dbg('azure-iot-device:TPMAuthenticationProvider');

import { EventEmitter } from 'events';
import * as machina from 'machina';
import { AuthenticationType, SharedAccessSignature, errors, TransportConfig, AuthenticationProvider, Callback, callbackToPromise } from 'azure-iot-common';
import { TpmSecurityClient } from './tpm';

/**
 * @private
 */
export class TpmAuthenticationProvider extends EventEmitter implements AuthenticationProvider {
  type: AuthenticationType = AuthenticationType.Token;
  automaticRenewal: boolean = true;
  private _tokenValidTimeInSeconds: number = 3600;   // 1 hour
  private _tokenRenewalMarginInSeconds: number = 900; // 15 minutes
  private _renewalTimeout: NodeJS.Timer;
  private _fsm: machina.Fsm;

  private _credentials: TransportConfig;
  private _tpmSecurityClient: TpmSecurityClient;

  /**
   * @private
   *
   * Initializes a new instance of the TpmAuthenticationProvider - users should only use the factory methods though.
   *
   * @param credentials       Credentials to be used by the device to connect to the IoT hub.
   * @param tpmSecurityClient That client that provides the signingFunction.
   */
  constructor(credentials: TransportConfig, tpmSecurityClient: TpmSecurityClient) {
    super();
    this._credentials  = credentials;
    this._tpmSecurityClient = tpmSecurityClient;
    this._fsm = new machina.Fsm({
      initialState: 'inactive',
      states: {
        inactive: {
          _onEnter: (err, callback) => {
            if (callback) {
              callback(err);
            } else if (err) {
              /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_007: [an `error` event shall be emitted if renewing the SAS token fail in the timer handler.]*/
              this.emit('error', err);
            }
            if (this._renewalTimeout) {
              clearTimeout(this._renewalTimeout);
            }
          },
          activate: (activateCallback) => this._fsm.transition('activating', activateCallback),
          getDeviceCredentials: (callback) => {
            this._fsm.handle('activate', (err, result) => {
              if (err) {
                callback(err);
              } else {
                this._fsm.handle('getDeviceCredentials', callback);
              }
            });
          }
        },
        activating: {
          _onEnter: (callback, err) => {
            const newExpiry =  Math.floor(Date.now() / 1000) + this._tokenValidTimeInSeconds;
            /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_001: [`getDeviceCredentials` shall use the `SharedAccessSignature.createWithSigningFunction` method with the `signWithIdentity` method of the `TpmSecurityClient` given to the construtor to generate a SAS token.]*/
            SharedAccessSignature.createWithSigningFunction(this._credentials, newExpiry, this._tpmSecurityClient.signWithIdentity.bind(this._tpmSecurityClient), (err, newSas) => {
              if (err) {
                debug('Unable to create a new SAS token! - ' + err);
                /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_003: [`getDeviceCredentials` shall call its callback with an `Error` object if the SAS token creation fails.]*/
                callback(err);
                this._fsm.transition('inactive');
              } else {
                this._credentials.sharedAccessSignature = newSas.toString();
                /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_004: [`getDeviceCredentials` shall start a timer to renew the SAS token after the time the token is valid minus the renewal margin (60 - 15 = 45 minutes by default).]*/
                this._renewalTimeout = setTimeout(() => this._renewToken(), (this._tokenValidTimeInSeconds - this._tokenRenewalMarginInSeconds) * 1000);
                debug('Created a new sas token.');
                this._fsm.transition('active', callback);
              }
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        active: {
          _onEnter: (callback) => {
            /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_008: [a `newTokenAvailable` event shall be emitted if renewing the SAS token succeeds in the timer handler.]*/
            this.emit('newTokenAvailable', this._credentials);
            /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_002: [`getDeviceCredentials` shall call its callback with an `null` first parameter and the generated SAS token as a second parameter if the SAS token creation is successful.]*/
            callback(null, this._credentials);
          },
          getDeviceCredentials: (callback) => {
            callback(null, this._credentials);
          },
          signingError: (err) => {
            debug('Unable to create a new SAS token! - ' + err);
            this._fsm.transition('inactive', err);
          },
          signingSuccessful: () => {
            debug('Created a new sas token.');
            this.emit('newTokenAvailable', this._credentials);
          },
          stop: () => {
            /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_006: [`stop` shall stop the renewal timer if it is running.]*/
            this._fsm.transition('inactive');
          }
        }
      }
    });
  }

  getDeviceCredentials(): Promise<TransportConfig>;
  getDeviceCredentials(callback: Callback<TransportConfig>): void;
  getDeviceCredentials(callback?: Callback<TransportConfig>): void | Promise<TransportConfig> {
    return callbackToPromise((_callback) => {
      this._fsm.handle('getDeviceCredentials', _callback);
    }, callback);
  }

  updateSharedAccessSignature(sharedAccessSignature: string): void {
    /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_005: [`updateSharedAccessSignature` shall throw an `InvalidOperationError` since it's the role of the TPM to generate SAS tokens.]*/
    throw new errors.InvalidOperationError('cannot update a shared access signature when using TPM');
  }

  stop(): void {
    debug('stopping TPM authentication provider');
    this._fsm.handle('stop');
  }

  private _renewToken(): void {
    if (this._renewalTimeout) {
      clearTimeout(this._renewalTimeout);
    }
    const newExpiry =  Math.floor(Date.now() / 1000) + this._tokenValidTimeInSeconds;
    SharedAccessSignature.createWithSigningFunction(this._credentials, newExpiry, this._tpmSecurityClient.signWithIdentity.bind(this._tpmSecurityClient), (err, newSas) => {
      if (err) {
        this._fsm.handle('signingError', err);
      } else {
        this._credentials.sharedAccessSignature = newSas.toString();
        this._renewalTimeout = setTimeout(() => this._renewToken(), (this._tokenValidTimeInSeconds - this._tokenRenewalMarginInSeconds) * 1000);
        this._fsm.handle('signingSuccessful');
      }
    });
  }

  /**
   * @method           module:azure-iot-security-tpm.TpmSecurityClient#fromTpmSecurityClient
   * @description      Returns an authentication provider.
   * @param {string}            deviceId          The device id for the client to be created.
   * @param {string}            iotHubHostname    The name of the IoT hub to be utilized.
   * @param {TpmSecurityClient} tpmSecurityClient The client which provides the tpm security interface. (Signing, activating, etc.)
   */
  static fromTpmSecurityClient(deviceId: string, iotHubHostname: string, tpmSecurityClient: TpmSecurityClient): TpmAuthenticationProvider {
    /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_009: [The `fromSecurityClient` method shall throw a `ReferenceError` if `deviceId` is falsy.]*/
    if (!deviceId) {
      throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');
    }
    /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_010: [The `fromSecurityClient` method shall throw a `ReferenceError` if `iotHubHostname` is falsy.]*/
    if (!iotHubHostname) {
      throw new ReferenceError('iotHubHostname cannot be \'' + iotHubHostname + '\'');
    }
    /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_011: [The `fromSecurityClient` method shall throw a `ReferenceError` if `tpmSecurityClient` is falsy.]*/
    if (!tpmSecurityClient) {
      throw new ReferenceError('tpmSecurityClient cannot be \'' + tpmSecurityClient + '\'');
    }

    const credentials: TransportConfig = {
      host: iotHubHostname,
      deviceId: deviceId
    };

    /*Codes_SRS_NODE_TPM_AUTH_PROVIDER_16_012: [The `fromSecurityClient` method shall instantiate a new `TpmSecurityClient` object.]*/
    return new TpmAuthenticationProvider(credentials, tpmSecurityClient);
  }
}
