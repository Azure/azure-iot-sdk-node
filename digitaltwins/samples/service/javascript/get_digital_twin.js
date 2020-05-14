// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const deviceId = process.env.IOTHUB_DEVICE_ID;

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - get the Digital Twin
async function main() {
  // Environment variables have to be set
  // Digital Twin enabled device must be exist on the IoT Hub

  try {
    // Create digital twin service client
    const credentials = new IoTHubTokenCredentials(connectionString);
    const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

    // Get digital twin
    console.log('getting digital twin for device ' + deviceId + '...');
    const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceId);

    // Print digital twin object members
    console.log('device metadata:');
    console.log(JSON.stringify(digitalTwin.$metadata, null, 2));
  } catch (err) {
    console.log(err);
  }
};

main();
