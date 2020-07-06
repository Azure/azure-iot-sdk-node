// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;
const { inspect } = require('util');

const patch = [{
  interfaces: {
    'environmentalSensor': { // for the environmental sensor, try 'environmentalSensor'
      properties: {
        'brightness': { // for the environmental sensor, try 'brightness'
          desired: {
            value: 42 // for the environmental sensor, try 42 (note that this is a number, not a string, so don't include quotes).
          }
        }
      }
    }
  }
}];

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - create a patch for modifying the Digital Twin
// - update the Digital Twin with patch
//
// Preconditions:
// - Environment variables have to be set
// - Twin enabled device must exist on the ADT hub
async function main() {
  const deviceId = process.env.IOTHUB_DEVICE_ID;
  const componentName = process.env.IOTHUB_DEVICE_TWIN_COMPONENT_NAME; // suggestion: urn:azureiot:Client:SDKInformation:1 or for the environmental sensor, try 'environmentalSensor'

  // Create service client
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Get digital twin
  const digitalTwin = await digitalTwinServiceClient.getComponent(deviceId, componentName);

  // Print original Twin
  console.log(inspect(digitalTwin));

  // Update digital twin and verify the update
  const components = await digitalTwinServiceClient.updateComponent(deviceId, patch);

  // Print response
  console.log(components);
};

main().catch((err) => {
  console.log('error code: ', err.code);
  console.log('error message: ', err.message);
  console.log('error stack: ', err.stack);
});
