import * as dbg from 'debug';
const debug = dbg('azure-iot-device:TPMAuthenticationProvider');

import { EventEmitter } from 'events';
import { AuthenticationType, SharedAccessSignature, errors, TransportConfig, AuthenticationProvider } from 'azure-iot-common';
import { TpmSecurityClient } from './tpm';

/**
 * @private
 */
export class TPMAuthenticationProvider extends EventEmitter implements AuthenticationProvider {
  type: AuthenticationType = AuthenticationType.Token;
  automaticRenewal: boolean = true;
  private _tokenValidTimeInSeconds: number = 3600;   // 1 hour
  private _tokenRenewalMarginInSeconds: number = 900; // 15 minutes
  private _currentTokenExpiryTimeInSeconds: number = 0;
  private _renewalTimeout: NodeJS.Timer;

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
  }

  getDeviceCredentials(callback: (err: Error, credentials?: TransportConfig) => void): void {
    if (this._shouldRenewToken()) {
      this._renewToken(callback);
    } else {
      callback(null, this._credentials);
    }
  }

  updateSharedAccessSignature(sharedAccessSignature: string): void {
    throw new errors.InvalidOperationError('cannot update a shared access signature when using TPM');
  }

  private _shouldRenewToken(): boolean {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    return (this._currentTokenExpiryTimeInSeconds - currentTimeInSeconds) < this._tokenRenewalMarginInSeconds;
  }

  private _renewToken(getCredentialCallback?: (err: Error, credentials?: TransportConfig) => void): void {
    if (this._renewalTimeout) {
      clearTimeout(this._renewalTimeout);
    }
    const newExpiry =  Math.floor(Date.now() / 1000) + this._tokenValidTimeInSeconds;
    SharedAccessSignature.createWithSigningFunction(this._credentials, newExpiry, this._tpmSecurityClient.signWithIdentity.bind(this._tpmSecurityClient), (err, newSas) => {
      if (err) {
        console.log('Unable to create a new SAS token! - ' + err);
        if (getCredentialCallback) {
          getCredentialCallback(err);
        }
      } else {
        this._credentials.sharedAccessSignature = newSas.toString();
        this._renewalTimeout = setTimeout(() => this._renewToken(), (this._tokenValidTimeInSeconds - this._tokenRenewalMarginInSeconds) * 1000);
        debug('Created a new sas token.');
        if (getCredentialCallback) {
          getCredentialCallback(null, this._credentials);
        }
        this.emit('newTokenAvailable', this._credentials);
      }
    });
  }

  static fromTpmSecurity(deviceId: string, iotHubHostname: string, tpmSecurityClient: TpmSecurityClient) {
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

    return new TPMAuthenticationProvider(credentials, tpmSecurityClient);
  }
}
