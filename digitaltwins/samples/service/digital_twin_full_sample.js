// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const RegistryManager = require('azure-iothub').Registry;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;
const uuid = require('uuid');

// Example of how to:
// - create a Digital Twin enabled Device using the RegistryManager
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - get the Digital Twin
// - get a single Digital Twin Interface Instance by name
// - update the Digital Twin with patch
// - update the Digital Twin property using property update API
// - list all the Digital Twin Interface Instances
async function main() {
  // IoT Hub connection string has to be set to system environment variable IOTHUB_CONNECTION_STRING

  // Create registry manager client for managing devices
  const registryManagerClient = RegistryManager.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);

  // Create credentials for digital twin service client
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);

  // Create digital twin service client
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Create sample device
  const deviceDescription = {
    deviceId: 'get-digital-twin-sampleDevice-' + uuid.v4(),
    status: 'enabled'
  };
  await registryManagerClient.create(deviceDescription);
  console.log('Created device: ' + deviceDescription.deviceId);

  // Create Model and get the model ID
  // ...
  const modelId = '<model_id>';

  // Add/Get a interface instance name and property name from the Model
  const interfaceInstanceName = '<interface_instance_name>';
  const propertyName = '<property_name>';
  const propertyValue = 42;

  // Assign the model to the device
  // ...

  // Get digital twin
  const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceDescription.deviceId);
  // Print original Twin
  console.log(JSON.stringify(digitalTwin, null, 2));

  // Get digital twin model
  const digitalTwinModel = await digitalTwinServiceClient.getDigitalTwinModel(modelId);
  // Print original model
  console.log(JSON.stringify(digitalTwinModel, null, 2));

  // Get interface instance by name
  const digitalTwinInterfaceInstanceName = await digitalTwinServiceClient.getDigitalTwinInterfaceInstance(deviceDescription.deviceId, interfaceInstanceName);
  // Print original interface instance
  console.log(JSON.stringify(digitalTwinInterfaceInstanceName, null, 2));

  // Update property using full patch
  const patch = {
    interfaces: {
      [interfaceInstanceName]: {
        properties: {
          [propertyName]: {
            desired: {
              value: propertyValue
            }
          }
        }
      }
    }
  };
  // Update digital twin and verify the update
  try {
    const updatedDigitalTwin = await digitalTwinServiceClient.updateDigitalTwin(deviceDescription.deviceId, patch, digitalTwin.eTag);
    // Print updated Twin
    console.log(JSON.stringify(updatedDigitalTwin, null, 2));
  } catch (err) {
    console.log(err);
  }

  // Print updated twin
  console.log(JSON.stringify(digitalTwin, null, 2));

  try {
    const updatedDigitalTwin = await digitalTwinServiceClient.updateDigitalTwinProperty(deviceDescription.deviceId, interfaceInstanceName, propertyName, propertyValue);

    // Print updated twin
    console.log(JSON.stringify(updatedDigitalTwin.interfaces, null, 2));
  } catch (err) {
    console.log(err);
  }

  // List interfaces by name
  for (const interfaceInstanceName in digitalTwin) {
    if (digitalTwin.interfaces.hasOwnProperty(interfaceInstanceName)) {
      console.log(JSON.stringify(digitalTwin.interfaces[interfaceInstanceName]));
    }
  }

  // Delete sample device
  await registryManagerClient.delete(deviceDescription.deviceId);
  console.log('Deleted device: ' + deviceDescription.deviceId);
};

main();
