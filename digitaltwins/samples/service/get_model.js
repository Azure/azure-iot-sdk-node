// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const modelId = '<MODEL_ID_NAME_GOES_HERE>'; // suggestion: urn:azureiot:Client:SDKInformation:1

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - get a Digital Twin Model by model ID
async function main() {
  // IoT Hub connection string has to be set to system environment variable IOTHUB_CONNECTION_STRING
  // Twin enabled device must be exist on the IoT Hub

  // Create service client
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Get digital twin model
  const digitalTwinModel = await digitalTwinServiceClient.getModel(modelId);
  const idName = '@id';
  console.log('ModelId: ' + JSON.stringify(digitalTwinModel[idName], null, 2));
  console.log('Model: ' + JSON.stringify(digitalTwinModel.contents, null, 2));
};

main();
