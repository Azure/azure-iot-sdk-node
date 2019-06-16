// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwin-service').IoTHubTokenCredentials;
const RegistryManager = require('azure-iothub').Registry;
const DigitalTwinServiceClient  = require('azure-iot-digitaltwin-service').DigitalTwinServiceClient;
// const ModelRepositoryClient  = require('azure-iot-digitaltwin-model-repository').DigitalTwinRepositoryService;
const uuid = require('uuid');

// Example of how to:
// - create a Digital Twin enabled Device using the RegistryManager
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - create a Model Repository Client using the ModelRepositoryClient constructor
// - create a Model using the ModelRepositoryClient
// - get the Digital Twin
// - get a single Digital Twin Component by name
// - update the Digital Twin with patch
// - update the Digital Twin property using property update API
// - list all the Digital Twin Components
async function main() {
  // IoT Hub connection string has to be set to system environment variable IOTHUB_CONNECTION_STRING
  
  // Create registry manager client for managing devices
  const registryManagerClient = RegistryManager.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);

  // Create credentials for repository client and digital twin service client
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);

  // Create repository client
  // const repositoryClient = new ModelRepositoryClient(credentials);

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
  //...
  var modelId = '';

  // Add/Get a component name and property name from the Model
  var componentName = '';
  var propertyName = '';

  // Assign the model to the device
  //... 

  // Get digital twin
  const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceDescription.deviceId);
  // Print original Twin
  console.log(JSON.stringify(digitalTwin, null, 2));

  // Get digital twin model
  const digitalTwinModel = await digitalTwinServiceClient.getDigitalTwinModel(modelId);
  // Print original model
  console.log(JSON.stringify(digitalTwinModel, null, 2));

  // Get component by name
  const digitalTwinComponent = await digitalTwinServiceClient.getDigitalTwinComponent(deviceDescription.deviceId, componentName);
  // Print original component
  console.log(JSON.stringify(digitalTwinComponent, null, 2));

  // Update property using full patch
  var propertyName = '<PROPERTY_NAME_GOES_HERE>';
  var propertyValue = 42;
  var patch = {
    interfaces: {
      [componentName]: {
        properties: {
          [propertyName]: {
            desired: {
              value: [propertyValue]
            }
          }
        }
      }
    }
  };
  // Update digital twin and verify the update
  try{
    var updatedDigitalTwin = await digitalTwinServiceClient.updateDigitalTwin(deviceDescription.deviceId, patch, digitalTwin.eTag);
    // Print updated Twin
    console.log(JSON.stringify(updatedDigitalTwin, null, 2));
  }
  catch (err){
    console.log(err);
  }

  // Print updated twin
  console.log(JSON.stringify(digitalTwin, null, 2));

  var componentName = '<COMPONENT_NAME_GOES_HERE>';
  var propertyName = '<PROPERTY_NAME_GOES_HERE>';
  var propertyValue = 42;
  try{
    var updatedDigitalTwin = await digitalTwinServiceClient.updateDigitalTwinProperty(deviceDescription.deviceId, componentName, propertyName, propertyValue);

    // Print updated twin
    console.log(JSON.stringify(updatedDigitalTwin.interfaces, null, 2));
  }
  catch (err){
    console.log(err);
  }

  // List components by name
  for (var digitalComponentName in digitalTwin) {
    console.log(JSON.stringify(digitalTwin[digitalComponentName]));
  }

  // Delete sample device
  await registryManagerClient.delete(deviceDescription.deviceId);
  console.log('Deleted device: ' + deviceDescription.deviceId);
};
  
main();