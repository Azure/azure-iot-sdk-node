// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const deviceId = process.env.IOTHUB_DEVICE_ID;
const componentName = process.env.IOTHUB_COMPONENT_NAME; // for the environmental sensor, try "environmentalSensor"

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - get a single Digital Twin Component by name
async function main() {
  // Environment variables have to be set
  // Digital Twin enabled device must be exist on the IoT Hub

  try {
    // Create service client
    const credentials = new IoTHubTokenCredentials(connectionString);
    const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

    // Get component by name
    console.log('getting ' + componentName + ' on device ' + deviceId + '...');
    const getComponentResponse = await digitalTwinServiceClient.getComponent(deviceId, componentName);

    // Print the component
    console.log(componentName + ':');
    console.log(JSON.stringify(getComponentResponse.interfaces, null, 2));
  } catch (err) {
    console.log(err);
  }  
};

main();
