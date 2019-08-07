// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const deviceId = '<DEVICE_ID_GOES_HERE>';
const interfaceInstanceName = '<INTERFACE_INSTANCE_NAME_GOES_HERE>'; // for the environmental sensor, you can try "environmentalSensor"
const commandName = '<COMMAND_NAME_GOES_HERE>'; // for the environmental sensor, you can try "blink", "turnOff" or "turnOn"
const commandArgument = '<COMMAND_ARGUMENT_GOES_HERE>'; // for the environmental sensor, it really doesn't matter. any string will do.

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - invoke a command on a Digital Twin enabled device
async function main() {
  // IoT Hub connection string has to be set to system environment variable IOTHUB_CONNECTION_STRING
  // Twin enabled device must be exist on the IoT Hub

  // Create service client
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  console.log('invoking command ' + commandName + ' on interface instance' + interfaceInstanceName + ' for device ' + deviceId + '...');
  // Invoke a command
  const digitalTwinCommandResult = await digitalTwinServiceClient.invokeCommand(deviceId, interfaceInstanceName, commandName, commandArgument);

  // Print result of the command
  console.log(JSON.stringify(digitalTwinCommandResult, null, 2));
};

main();
