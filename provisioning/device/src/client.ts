// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import { ProvisioningTransportHandlersX509, ProvisioningTransportHandlersBase, ProvisioningDeviceConfiguration } from './interfaces';
import { errors } from 'azure-iot-common';
import * as dbg from 'debug';
const debug = dbg('azure-device-provisioning:device-client');

export class ProvisioningDeviceClient {

  private _transport: ProvisioningTransportHandlersBase;
  private _securityClient: any;

  private constructor(transport: ProvisioningTransportHandlersBase, securityClient: any) {
    this._transport = transport;
    this._securityClient = securityClient;
  }

  registerX509(registrationId: string, forceRegistration: boolean, callback: (err: Error, deviceConfig?: ProvisioningDeviceConfiguration) => void): void {
    if (!((this._transport as any).registerX509)) {
      throw new errors.InvalidOperationError('Transport does not support X509 authentication');
    }
    if (!((this._securityClient as any).getCertificate)) {
      throw new errors.InvalidOperationError('Security Client does not support X509 authentication');
    }

    this._securityClient.getCertificate((err, cert)  => {
      if (err) {
        debug('security client returned error on cert acquisition');
        callback(err);
      } else {
        (this._transport as ProvisioningTransportHandlersX509).registerX509(registrationId, cert, forceRegistration, (err, assignedHub, deviceId) => {
          if (err) {
            debug('_stateMachine.register returned error');
            debug(err.toString);
            callback(err);
          } else {
            let deviceConfig: ProvisioningDeviceConfiguration = {
              iotHubUri: assignedHub,
              deviceId: deviceId
            };
            callback(null, deviceConfig);
          }
        });
      }
    });
  }

  endSession(callback: (err?: Error) => void): void {
    this._transport.endSession(callback);
  }

  /**
   * Factory method to use to create a DeviceClient object.
   *
   * @param transport Transport instance to use
   * @param idScope Scope ID assigned to the current provisioning service instance
   */
  static create(transport: ProvisioningTransportHandlersBase, securityClient: any): ProvisioningDeviceClient {
    return new ProvisioningDeviceClient(transport, securityClient);
  }
}

