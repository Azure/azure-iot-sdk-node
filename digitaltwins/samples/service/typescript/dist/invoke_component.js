"use strict";
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_digitaltwins_service_1 = require("azure-iot-digitaltwins-service");
var azure_iot_digitaltwins_service_2 = require("azure-iot-digitaltwins-service");
var deviceId = process.env.IOTHUB_DEVICE_ID || 'device_id';
var connectionString = process.env.IOTHUB_CONNECTION_STRING || 'conn_string';
var componentName = process.env.IOTHUB_COMPONENT_NAME || 'sensor'; // for the environmental sensor, try "sensor"
var commandName = process.env.IOTHUB_COMMAND_NAME || 'turnon'; // for the environmental sensor, you can try "blink", "turnoff" or "turnon"
var commandPayload = process.env.IOTHUB_COMMAND_PAYLOAD || ''; // for the environmental sensor, it really doesn't matter. any string will do.
var credentials = new azure_iot_digitaltwins_service_2.IoTHubTokenCredentials(connectionString);
var digitalTwinServiceClient = new azure_iot_digitaltwins_service_1.DigitalTwinServiceClient(credentials);
console.log('invoking command ' + commandName + ' on component instance' + componentName + ' for device ' + deviceId + '...');
var invokeComponentCommandResponse = digitalTwinServiceClient.invokeComponentCommand(deviceId, componentName, commandName, commandPayload);
// Print the response
console.log(JSON.stringify(invokeComponentCommandResponse, null, 2));
//# sourceMappingURL=invoke_component.js.map