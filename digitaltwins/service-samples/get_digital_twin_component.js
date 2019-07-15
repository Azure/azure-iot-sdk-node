// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwin-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwin-service').DigitalTwinServiceClient;

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - get a single Digital Twin Component by name
async function main() {
  // IoT Hub connection string has to be set to system environment variable IOTHUB_CONNECTION_STRING
  // Twin enabled device must be exist on the IoT Hub
  const deviceId = '<DEVICE_ID_GOES_HERE>';
  const componentName = '<COMPONENT_NAME_GOES_HERE>';

  // Create service client
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Get component by name
  const digitalTwinComponent = await digitalTwinServiceClient.getDigitalTwinComponent(deviceId, componentName);

  // Print the component
  console.log(JSON.stringify(digitalTwinComponent, null, 2));
};

main();
