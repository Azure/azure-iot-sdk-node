// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const deviceId = process.env.IOTHUB_DEVICE_ID;
const componentInstanceName = process.env.IOTHUB_COMPONENT_INSTANCE_NAME; // for the environmental sensor, try "environmentalSensor"

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - get a single Digital Twin Component Instance by name
async function main() {
  // IoT Hub connection string has to be set to system environment variable IOTHUB_CONNECTION_STRING
  // Twin enabled device must be exist on the IoT Hub


  // Create service client
  const credentials = new IoTHubTokenCredentials(connectionString);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  console.log('getting ' + componentInstanceName + ' on device ' + deviceId + '...');
  // Get component instance by name
  const partialDigitalTwin = await digitalTwinServiceClient.getDigitalTwinComponentInstance(deviceId, componentInstanceName);

  // Print the component instance
  console.log(JSON.stringify(partialDigitalTwin.interfaces, null, 2));
};

main();
