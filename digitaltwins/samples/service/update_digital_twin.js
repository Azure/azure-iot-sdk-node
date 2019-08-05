// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const deviceId = '<DEVICE_ID_GOES_HERE>';
const patch = {
  interfaces: {
    '<INTERFACE_INSTANCE_NAME_GOES_HERE>': { // for the environmental sensor, try "environmentalSensor"
      properties: {
        '<PROPERTY_NAME_GOES_HERE>': { // for the environmental sensor, try "brightness"
          desired: {
            value: '<PROPERTY_VALUE_GOES_HERE>' // for the environmental sensor, try 42 (note that this is a number, not a string, so don't include quotes).
          }
        }
      }
    }
  }
};

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - create a patch for modifying the Digital Twin
// - update the Digital Twin with patch
async function main() {
  // IoT Hub connection string has to be set to system environment variable IOTHUB_CONNECTION_STRING
  // Twin enabled device must be exist on the IoT Hub

  // Create service client
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Get digital twin
  const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceId);

  // Print original Twin
  console.log(JSON.stringify(digitalTwin.interfaces, null, 2));

  // Update digital twin and verify the update
  try {
    const updatedDigitalTwin = await digitalTwinServiceClient.updateDigitalTwin(deviceId, patch);

    // Print updated Twin
    console.log(JSON.stringify(updatedDigitalTwin.interfaces, null, 2));
  } catch (err) {
    console.log(err);
  }
};

main();
