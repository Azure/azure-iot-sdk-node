// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const deviceId = process.env.IOTHUB_DEVICE_ID;
const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const componentName = process.env.IOTHUB_COMPONENT_NAME || 'sensor'; // for the environmental sensor, try "sensor"
const commandName = process.env.IOTHUB_COMMAND_NAME || 'turnon'; // for the environmental sensor, you can try "blink", "turnoff" or "turnoff"
const commandPayload = process.env.IOTHUB_COMMAND_PAYLOAD || ''; // for the environmental sensor, it really doesn't matter. any string will do.

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - invoke a command on a Digital Twin enabled device
async function main() {
  // Environment variables have to be set
  // Digital Twin enabled device must be exist on the IoT Hub

  try {
    // Create service client
    const credentials = new IoTHubTokenCredentials(connectionString);
    const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

    // Invoke a command
    console.log('invoking command ' + commandName + ' on component instance' + componentName + ' for device ' + deviceId + '...');
    const invokeComponentCommandResponse = await digitalTwinServiceClient.invokeComponentCommand(deviceId, componentName, commandName, commandPayload);

    // Print the response
    console.log(JSON.stringify(invokeComponentCommandResponse, null, 2));
  } catch (err) {
    console.log(err);
  }
};

main();
