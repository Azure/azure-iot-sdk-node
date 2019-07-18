// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - invoke a command on a Digital Twin enabled device
async function main() {
  // IoT Hub connection string has to be set to system environment variable IOTHUB_CONNECTION_STRING
  // Twin enabled device must be exist on the IoT Hub
  const deviceId = '<DEVICE_ID_GOES_HERE>';

  // Create service client
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Get digital twin
  const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceId);

  // Invoke a command
  const digitalTwinCommandResultComponentName = '<COMPONENT_NAME_FROM_DIGITAL_TWIN>';
  const digitalTwinCommandResultCommandName = '<COMMAND_NAME_FROM_COMPONENT>';
  const digitalTwinCommandResultArgument = '<COMMAND_ARGUMENT>';
  const digitalTwinCommandResult = await digitalTwinServiceClient.invokeCommand(digitalTwin.Id, digitalTwinCommandResultComponentName, digitalTwinCommandResultCommandName, digitalTwinCommandResultArgument);

  // Print result of the command
  console.log(JSON.stringify(digitalTwinCommandResult, null, 2));
};

main();
