import * as dbg from 'debug';
const debug = dbg('azure-iot-device:TPMAuthenticationProvider');

import { EventEmitter } from 'events';
import { AuthenticationType, ConnectionString, SharedAccessSignature, errors, TransportConfig, AuthenticationProvider} from 'azure-iot-common';
import { TpmSecurityClient } from './tpm';

/**
 * @private
 */
export class TPMAuthenticationProvider extends EventEmitter implements AuthenticationProvider {
  private _tokenExpirationInSeconds: number = 3600;
  private _tokenRenewalIntervalInSeconds: number = 2700;
  private _currentTokenExpiryTimeInSeconds: number = 0;

  private _renewalTimeout: NodeJS.Timer;

  private _credentials: TransportConfig;
  private _tpmSecurityClient: TpmSecurityClient;
  type: AuthenticationType = AuthenticationType.Token;
  automaticRenewal: boolean = true;

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
      this._renewToken();
    }

    callback(null, this._credentials);
  }

  private _shouldRenewToken(): boolean {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    return (this._currentTokenExpiryTimeInSeconds - currentTimeInSeconds) < this._tokenRenewalIntervalInSeconds;
  }


  updateSharedAccessSignature(sharedAccessSignature: string): void {
    throw new errors.InvalidOperationError('cannot update a shared access signature when using TPM');
  }

  private _renewToken() {
    if (this._renewalTimeout) {
      clearTimeout(this._renewalTimeout);
    }
    const newExpiry =  Math.floor(Date.now() / 1000) + this._tokenExpirationInSeconds;
    const sas = SharedAccessSignature.createWithSigningFunction(this._credentials, newExpiry, this._tpmSecurityClient.signWithIdentity.bind(this._tpmSecurityClient), (err, newSas) => {
      this._credentials.sharedAccessSignature = newSas.toString()
      this._renewalTimeout = setTimeout(() => this._renewToken(), this._tokenRenewalIntervalInSeconds * 1000);
      this.emit('newTokenAvailable');
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