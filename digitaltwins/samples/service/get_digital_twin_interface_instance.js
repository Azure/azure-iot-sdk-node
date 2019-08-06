// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const deviceId = '<DEVICE_ID_GOES_HERE>';
const interfaceInstanceName = '<INTERFACE_INSTANCE_NAME_GOES_HERE>'; // for the environmental sensor, try "environmentalSensor"

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - get a single Digital Twin Interface Instance by name
async function main() {
  // IoT Hub connection string has to be set to system environment variable IOTHUB_CONNECTION_STRING
  // Twin enabled device must be exist on the IoT Hub


  // Create service client
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  console.log('getting ' + interfaceInstanceName + ' on device ' + deviceId + '...');
  // Get interface instance by name
  const partialDigitalTwin = await digitalTwinServiceClient.getDigitalTwinInterfaceInstance(deviceId, interfaceInstanceName);

  // Print the interface instance
  console.log(JSON.stringify(partialDigitalTwin.interfaces, null, 2));
};

main();
