// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwin-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient  = require('azure-iot-digitaltwin-service').DigitalTwinServiceClient;

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - update the Digital Twin property using property update API
async function main() {
  // IoT Hub connection string has to be set to system environment variable IOTHUB_CONNECTION_STRING
  // Twin enabled device must be exist on the IoT Hub
  const deviceId = '<DEVICE_ID_GOES_HERE>';

  // Create service client 
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Get digital twin
  const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceId);

  // Print original Twin
  console.log(JSON.stringify(digitalTwin.interfaces, null, 2));

  // Update digital twin and verify the update
  var componentName = '<COMPONENT_NAME_GOES_HERE>';
  var propertyName = '<PROPERTY_NAME_GOES_HERE>';
  var propertyValue = 42;
  try{
    var updatedDigitalTwin = await digitalTwinServiceClient.updateDigitalTwinProperty(deviceDescription.deviceId, componentName, propertyName, propertyValue);

    // Print updated Twin
    console.log(JSON.stringify(updatedDigitalTwin.interfaces, null, 2));
  }
  catch (err){
    console.log(err);
  }
};
  
main();