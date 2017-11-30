// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { X509 } from 'azure-iot-common';
import { ProvisioningTransportOptions, X509ProvisioningTransport, X509RegistrationResult, PollingStateMachine } from 'azure-iot-provisioning-device';
import { Http as Base } from 'azure-iot-http-base';
import { HttpPollingHandlers } from './http_polling_handlers';

/**
 * Transport object for Azure IoT provisioning HTTP protocol
 */
export class Http  extends EventEmitter implements X509ProvisioningTransport {
  private _stateMachine: PollingStateMachine;
  private _pollingHandlers: HttpPollingHandlers;

  /**
   * Create a new HTTP transport object
   * @param idScope ID Scope to use when communicating with the provisionin service
   * @param httpBase base object for testing
   */
  constructor(idScope: number, httpBase?: Base) {
    super();
    this._pollingHandlers = new HttpPollingHandlers(idScope, httpBase);
    this._stateMachine = new PollingStateMachine(this._pollingHandlers);

    this._stateMachine.on('operationStatus', (eventBody) => {
      this.emit('operationStatus', eventBody);
    });
  }

  /**
   * @private
   */
  endSession(callback: (err?: Error) => void): void {
    this._stateMachine.endSession(callback);
  }

  /**
   * @private
   */
  setTransportOptions(options: ProvisioningTransportOptions): void {
    this._pollingHandlers.setTransportOptions(options);
  }

  /**
   * @private
   */
  registerX509(registrationId: string, auth: X509, forceRegistration: boolean, callback: (err?: Error, registrationResult?: X509RegistrationResult, body?: any, result?: any) => void): void {
     this._stateMachine.register(registrationId, auth, {'registrationId' : registrationId}, forceRegistration, (err, responseBody, result) => {
      if (err) {
        callback(err, null, responseBody, result );
      } else {
        let registrationResult: X509RegistrationResult = {
          deviceId: responseBody.registrationStatus.deviceId,
          assignedHub: responseBody.registrationStatus.assignedHub
        };
        callback(err, registrationResult, responseBody, result);
     }
    });
  }
}
