// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const componentInstanceName = process.env.IOTHUB_COMPONENT_INSTANCE_NAME; // for the environmental sensor, try "environmentalSensor"
const commandName = process.env.IOTHUB_COMMAND_NAME; // for the environmental sensor, you can try "blink", "turnOff" or "turnOn"
const commandArgument = process.env.IOTHUB_COMMAND_ARGUMENT; // for the environmental sensor, it really doesn't matter. any string will do.

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
    console.log('invoking command ' + commandName + ' on component instance' + componentInstanceName + ' for device ' + deviceId + '...');
    const invokeComponentCommandRespone = await digitalTwinServiceClient.invokeComponentCommand(deviceId, componentInstanceName, commandName, commandArgument);

    // Print the response
    console.log(JSON.stringify(invokeComponentCommandRespone, null, 2));
  } catch (err) {
    console.log(err);
  }
};

main();
