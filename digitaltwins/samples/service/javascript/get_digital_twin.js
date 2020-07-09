// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;
const { inspect } = require('util');

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - get the Digital Twin
//
// Preconditions:
// - Environment variables have to be set
// - Twin enabled device must exist on the ADT hub
async function main() {
  const deviceId = process.env.IOTHUB_DEVICE_ID;

  // Create digital twin service client
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Get digital twin and retrieve the modelId from it
  const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceId);

  console.log(inspect(digitalTwin));
  console.log('Model Id: ' + inspect(digitalTwin.$metadata.$model));
};

main().catch((err) => {
  console.log('error code: ', err.code);
  console.log('error message: ', err.message);
  console.log('error stack: ', err.stack);
});
