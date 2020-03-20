// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const deviceId = process.env.IOTHUB_DEVICE_ID;

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - get the Digital Twin
// - list all the Digital Twin Components
async function main() {
  // IoT Hub connection string has to be set to system environment variable IOTHUB_CONNECTION_STRING
  // Twin enabled device must be exist on the IoT Hub

  // Create digital twin service client
  const credentials = new IoTHubTokenCredentials(connectionString);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  console.log('getting full digital twin for device ' + deviceId + '...');
  // Get digital twin
  const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceId);

  // Print digital twin components
  console.log(JSON.stringify(digitalTwin.interfaces, null, 2));
};

main();
