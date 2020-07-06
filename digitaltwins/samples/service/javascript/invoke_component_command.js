// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;
const { inspect } = require('util');

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - invoke a command on a Digital Twin enabled device's component
//
// Preconditions:
// - Environment variables have to be set
// - Twin enabled device must exist on the ADT hub
async function main() {
  const deviceId = process.env.IOTHUB_DEVICE_ID;
  const componentName = process.env.IOTHUB_COMPONENT_NAME; // for the environmental sensor, you can try 'environmentalSensor'
  const commandName = process.env.IOTHUB_COMMAND_NAME; // for the environmental sensor, you can try 'blink', 'turnOff' or 'turnOn'
  const commandArgument = process.env.IOTHUB_COMMAND_PAYLOAD; // for the environmental sensor, it really doesn't matter. any string will do.

  // Create service client
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Invoke a command
  const commandResponse = await digitalTwinServiceClient.invokeComponentCommand(deviceId, componentName, commandName, commandArgument);

  // Print result of the command
  console.log(inspect(commandResponse));
};

main().catch((err) => {
  console.log('error code: ', err.code);
  console.log('error message: ', err.message);
  console.log('error stack: ', err.stack);
});

