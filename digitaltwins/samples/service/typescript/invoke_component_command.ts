// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { DigitalTwinServiceClient } from 'azure-iot-digitaltwins-service';
import { IoTHubTokenCredentials } from 'azure-iot-digitaltwins-service';

const deviceId = process.env.IOTHUB_DEVICE_ID || '';
const connectionString = process.env.IOTHUB_CONNECTION_STRING || '';
const componentName = process.env.IOTHUB_COMPONENT_NAME || 'sensor'; // for the environmental sensor, try "sensor"
const commandName = process.env.IOTHUB_COMMAND_NAME || 'turnon'; // for the environmental sensor, you can try "blink", "turnoff" or "turnon"
const commandPayload = process.env.IOTHUB_COMMAND_PAYLOAD || ''; // for the environmental sensor, it really doesn't matter. any string will do.

let credentials = new IoTHubTokenCredentials(connectionString);
let digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

console.log('invoking command ' + commandName + ' on component ' + componentName + ' for device ' + deviceId + '...');
const invokeComponentCommandResponse = digitalTwinServiceClient.invokeComponentCommand(deviceId, componentName, commandName, commandPayload);

// Print the response
console.log(JSON.stringify(invokeComponentCommandResponse, null, 2));
