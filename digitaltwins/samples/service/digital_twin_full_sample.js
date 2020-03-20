// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const RegistryManager = require('azure-iothub').Registry;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;
const uuid = require('uuid');

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const modelId = process.env.IOTHUB_MODEL_NAME; // suggestion: urn:azureiot:Client:SDKInformation:1
const componentInstanceName = process.env.IOTHUB_COMPONENT_INSTANCE_NAME; // for the environmental sensor, try "environmentalSensor"
const propertyName = process.env.IOTHUB_PROPERTY_NAME; // for the environmental sensor, try "brightness"
const propertyValue = process.env.IOTHUB_PROPERTY_VALUE; // for the environmental sensor, try 42 (note that this is a number, not a string, so don't include quotes).

// Example of how to:
// - create a Digital Twin enabled Device using the RegistryManager
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - get the Digital Twin
// - get a single Digital Twin Component Instance by name
// - update the Digital Twin with patch
// - update the Digital Twin property using property update API
// - list all the Digital Twin Component Instances
async function main() {
  // IoT Hub connection string has to be set to system environment variable IOTHUB_CONNECTION_STRING

  // Create registry manager client for managing devices
  const registryManagerClient = RegistryManager.fromConnectionString(connectionString);

  // Create credentials for digital twin service client
  const credentials = new IoTHubTokenCredentials(connectionString);

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

  // Add/Get a component instance name and property name from the Model
  //...

  // Assign the model to the device
  // ...

  // Get digital twin
  const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceDescription.deviceId);
  // Print original Twin
  console.log(JSON.stringify(digitalTwin, null, 2));

  // Get digital twin model
  const digitalTwinModel = await digitalTwinServiceClient.getModel(modelId);
  // Print model
  const idName = '@id';
  console.log('ModelId: ' + JSON.stringify(digitalTwinModel[idName], null, 2));
  console.log('Model: ' + JSON.stringify(digitalTwinModel.contents, null, 2));

  // Get component instance by name
  const digitalTwinComponentInstanceName = await digitalTwinServiceClient.getDigitalTwinComponentInstance(deviceDescription.deviceId, componentInstanceName);
  // Print original component instance
  console.log(JSON.stringify(digitalTwinComponentInstanceName, null, 2));

  // Update property using full patch
  const patch = {
    interfaces: {
      [componentInstanceName]: {
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
    const updatedDigitalTwin = await digitalTwinServiceClient.updateDigitalTwinProperty(deviceDescription.deviceId, componentInstanceName, propertyName, propertyValue);

    // Print updated twin
    console.log(JSON.stringify(updatedDigitalTwin.components, null, 2));
  } catch (err) {
    console.log(err);
  }

  // List components by name
  for (const componentInstanceName in digitalTwin) {
    if (digitalTwin.components.hasOwnProperty(componentInstanceName)) {
      console.log(JSON.stringify(digitalTwin.components[componentInstanceName]));
    }
  }

  // Delete sample device
  await registryManagerClient.delete(deviceDescription.deviceId);
  console.log('Deleted device: ' + deviceDescription.deviceId);
};

main();
