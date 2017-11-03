// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
import * as Provisioning from './interfaces';
import { ClientStateMachine } from './client_state_machine';
import * as dbg from 'debug';
const debug = dbg('azure-device-provisioning:device-client');

export class ProvisioningDeviceClient implements Provisioning.ClientConfiguration {

  /**
   * User-Agent string passed to the service as part of communication
   */
  userAgent: string = 'azure-iot-node-provisioning'; // TODO

  /**
   * Default interval for polling, to use in case service doesn't provide it to us.
   */
  pollingInterval: number = 2000;

  /**
   * Default host for the provisioning service
   */
  provisioningHost: string = 'global.azure-devices-provisioning.net';

  /**
   * apiVersion to use while communicating with service.
   */
  apiVersion: string = '2017-08-31-preview';

  /**
   * default timeout to use when communicating with the service
   */
  timeoutInterval: number = 4000;

  /**
   * idScope to use when communicating with the provisioning service
   */
  idScope: string;

  private _stateMachine: ClientStateMachine;

  private constructor(transport: Provisioning.TransportHandlers, idScope: string) {
    this.idScope = idScope;
    transport.setClientConfig(this);
    this._stateMachine = new ClientStateMachine(transport);
  }

  register(registrationId: string, authentication: Provisioning.Authentication, forceRegistration: boolean, callback: (err: Error, deviceConfig?: Provisioning.DeviceConfiguration) => void): void {
    this._stateMachine.register(registrationId, authentication, {'registrationId' : registrationId}, forceRegistration, (err, response) => {
      if (err) {
        debug('_stateMachine.register returned error');
        debug(err.toString);
        callback(err);
      } else {
        let deviceConfig: Provisioning.DeviceConfiguration = {
          iotHubUri: response.registrationStatus.assignedHub,
          deviceId: response.registrationStatus.deviceId
        };
        callback(null, deviceConfig);
      }

    });
  }

  endSession(callback: (err?: Error) => void): void {
    this._stateMachine.endSession(callback);
  }

  /**
   * Factory method to use to create a DeviceClient object.
   *
   * @param transport Transport instance to use
   * @param idScope Scope ID assigned to the current provisioning service instance
   */
  static create(transport: Provisioning.TransportHandlers, idScope: string): ProvisioningDeviceClient {
    return new ProvisioningDeviceClient(transport, idScope);
  }
}

