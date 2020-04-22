// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const deviceId = process.env.IOTHUB_DEVICE_ID;

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - update the Digital Twin with patch
async function main() {
  // Environment variables have to be set
  // Digital Twin enabled device must be exist on the IoT Hub

  try {
    // Create service client
    const credentials = new IoTHubTokenCredentials(connectionString);
    const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

    // Get digital twin
    const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceId);

    // Print digital twin
    console.log('device information:');
    console.log(JSON.stringify(digitalTwin.deviceInformation, null, 2));
    if (digitalTwin.environmentalSensor) {
      console.log('environmental sensor:');
      console.log(JSON.stringify(digitalTwin.environmentalSensor, null, 2));
    }

   const patch = {
    interfaces: {
      '<INTERFACE NAME>': { // for the environmental sensor, try "environmentalSensor"
        properties: {
          '<PROPERTY NAME>': { // for the environmental sensor, try "brightness"
            desired: {
              value: '<VALUE>' // for the environmental sensor, try 42 (note that this is a number, not a string, so don't include quotes).
            }
          },
        }
      }
    }
  };  
    console.log('patch:');
    console.log(JSON.stringify(patch, null, 2));

    // Update digital twin
    const digitalTwinUpdateResponse = await digitalTwinServiceClient.updateDigitalTwin(deviceId, patch);

    // Print the response
    console.log(JSON.stringify(digitalTwinUpdateResponse.interfaces, null, 2));
  } catch (err) {
    console.log(err);
  }
};

main();
