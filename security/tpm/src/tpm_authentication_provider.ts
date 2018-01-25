import * as dbg from 'debug';
const debug = dbg('azure-iot-device:TPMAuthenticationProvider');

import { EventEmitter } from 'events';
import * as machina from 'machina';
import { AuthenticationType, SharedAccessSignature, errors, TransportConfig, AuthenticationProvider } from 'azure-iot-common';
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
   * Initializes a new instance of the TokenAuthenticationProvider - users should only use the factory methods though.
   *
   * @param credentials       Credentials to be used by the device to connect to the IoT hub.
   */
  constructor(credentials: TransportConfig, tpmSecurityClient: TpmSecurityClient) {
    super();
    this._credentials  = credentials;
    this._tpmSecurityClient = tpmSecurityClient;
    this._fsm = new machina.Fsm({
      initialState: 'inactive',
      states: {
        inactive: {
          _onEnter: (callback, err) => {
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
            SharedAccessSignature.createWithSigningFunction(this._credentials, newExpiry, this._tpmSecurityClient.signWithIdentity.bind(this._tpmSecurityClient), (err, newSas) => {
              if (err) {
                debug('Unable to create a new SAS token! - ' + err);
                callback(err);
                this._fsm.transition('inactive');
              } else {
                this._credentials.sharedAccessSignature = newSas.toString();
                this._renewalTimeout = setTimeout(() => this._renewToken(), (this._tokenValidTimeInSeconds - this._tokenRenewalMarginInSeconds) * 1000);
                debug('Created a new sas token.');
                this.emit('newTokenAvailable', this._credentials);
                callback(null, this._credentials);
                this._fsm.transition('active');
              }
            });
          },
          '*': () => this._fsm.deferUntilTransition()
        },
        active: {
          getDeviceCredentials: (callback) => {
            callback(null, this._credentials);
          }
        }
      }
    });
  }

  getDeviceCredentials(callback: (err: Error, credentials?: TransportConfig) => void): void {
    this._fsm.handle('getDeviceCredentials', callback);
  }

  updateSharedAccessSignature(sharedAccessSignature: string): void {
    throw new errors.InvalidOperationError('cannot update a shared access signature when using TPM');
  }

  private _renewToken(): void {
    if (this._renewalTimeout) {
      clearTimeout(this._renewalTimeout);
    }
    const newExpiry =  Math.floor(Date.now() / 1000) + this._tokenValidTimeInSeconds;
    SharedAccessSignature.createWithSigningFunction(this._credentials, newExpiry, this._tpmSecurityClient.signWithIdentity.bind(this._tpmSecurityClient), (err, newSas) => {
      if (err) {
        debug('Unable to create a new SAS token! - ' + err);
        this._fsm.transition('inactive');
      } else {
        this._credentials.sharedAccessSignature = newSas.toString();
        this._renewalTimeout = setTimeout(() => this._renewToken(), (this._tokenValidTimeInSeconds - this._tokenRenewalMarginInSeconds) * 1000);
        debug('Created a new sas token.');
        this.emit('newTokenAvailable', this._credentials);
      }
    });
  }

  /**
   * @method           module:azure-iot-security-tpm.TpmSecurityClient#fromTpmSecurity
   * @description      Returns an authentication provider.
   * @param {string}            deviceId          The device id for the client to be created.
   * @param {string}            iotHubHostname    The name of the IoT hub to be utilized.
   * @param {TpmSecurityClient} tpmSecurityClient The client which provides the tpm security interface. (Signing, activating, etc.)
   */
  static fromTpmSecurity(deviceId: string, iotHubHostname: string, tpmSecurityClient: TpmSecurityClient): TpmAuthenticationProvider {
    if (!deviceId) {
      throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');
    }
    if (!iotHubHostname) {
      throw new ReferenceError('iotHubHostname cannot be \'' + iotHubHostname + '\'');
    }
    if (!tpmSecurityClient) {
      throw new ReferenceError('tpmSecurityClient cannot be \'' + tpmSecurityClient + '\'');
    }

    const credentials: TransportConfig = {
      host: iotHubHostname,
      deviceId: deviceId
    };

    return new TpmAuthenticationProvider(credentials, tpmSecurityClient);
  }
}
