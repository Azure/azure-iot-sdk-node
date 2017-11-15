// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { EventEmitter } from 'events';
import { X509 } from 'azure-iot-common';
import { ProvisioningTransportOptions, ProvisioningTransportHandlersX509, PollingStateMachine } from 'azure-iot-provisioning-device';
import { Http as Base } from 'azure-iot-http-base';
import { HttpPollingHandlers } from './http_polling_handlers';

export class Http  extends EventEmitter implements ProvisioningTransportHandlersX509 {
  private _stateMachine: PollingStateMachine;
  private _pollingHandlers: HttpPollingHandlers;

  constructor(idScope: number, httpBase?: Base) {
    super();
    this._pollingHandlers = new HttpPollingHandlers(idScope, httpBase);
    this._stateMachine = new PollingStateMachine(this._pollingHandlers);

    this._stateMachine.on('operationStatus', (eventBody) => {
      this.emit('operationStatus', eventBody);
    });
  }

  endSession(callback: (err?: Error) => void): void {
    this._stateMachine.endSession(callback);
  }

  setTransportOptions(options: ProvisioningTransportOptions): void {
    this._pollingHandlers.setTransportOptions(options);
  }

  registerX509(registrationId: string, authorization: X509, forceRegistration: boolean, callback: (err?: Error, assignedHub?: string, deviceId?: string, responseBody?: any, result?: any) => void): void {
    this._stateMachine.register(registrationId, authorization, {'registrationId' : registrationId}, forceRegistration, (err, responseBody, result) => {
      if (err) {
        callback(err, null, null, responseBody, result );
      } else {
        callback(err, responseBody.registrationStatus.assignedHub, responseBody.registrationStatus.deviceId, responseBody, result);
     }
    });
  }
}
