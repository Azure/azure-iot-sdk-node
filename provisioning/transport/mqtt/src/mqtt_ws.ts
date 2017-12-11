
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Mqtt } from './mqtt';
import { RegistrationRequest } from 'azure-iot-provisioning-device';
import { MqttBase } from 'azure-iot-mqtt-base';

export class MqttWs extends Mqtt {

  constructor(mqttBase?: MqttBase) {
    super(mqttBase);
  }

    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_049: [ When connecting using websockets, `Mqtt`Ws shall set the uri passed into the transport to 'wss://<host>:443/$iothub/websocket'.] */
    modifyRequest(request: RegistrationRequest): RegistrationRequest {
    (<any>request).uri = 'wss://' + request.provisioningHost + ':443/$iothub/websocket';
    return request;
  }

  registrationRequest(request: RegistrationRequest, callback: (err?: Error, result?: any, response?: any, pollingInterval?: number) => void): void {
    super.registrationRequest(this.modifyRequest(request), callback);
  }

  queryOperationStatus(request: RegistrationRequest, operationId: string, callback: (err?: Error, result?: any, response?: any, pollingInterval?: number) => void): void {
    super.queryOperationStatus(this.modifyRequest(request), operationId, callback);
  }
}
