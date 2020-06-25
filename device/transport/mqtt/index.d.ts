// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { Client } from 'azure-iot-device';

export { Mqtt } from './dist/mqtt';
export { MqttWs } from './dist/mqtt_ws';
export declare function clientFromConnectionString(connectionString: string): Client;
