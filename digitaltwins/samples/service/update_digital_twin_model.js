// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const modelId = process.env.IOTHUB_MODEL_NAME; // suggestion: urn:azureiot:Client:SDKInformation:1

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - update a model
async function main() {
  // IOTHUB_CONNECTION_STRING, IOTHUB_DEVICE_ID, IOTHUB_COMPONENT_NAME environment variables have to be set
  // Digital Twin enabled device must be exist on the IoT Hub

  // Create service client
  const credentials = new IoTHubTokenCredentials(connectionString);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Update component
  const digitalTwinModel = await digitalTwinServiceClient.updateDigitalTwinModel(modelId);
  const idName = '@id';
  console.log('ModelId: ' + JSON.stringify(digitalTwinModel[idName], null, 2));
  console.log('Model: ' + JSON.stringify(digitalTwinModel.contents, null, 2));
};

main();
