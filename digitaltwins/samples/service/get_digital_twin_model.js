// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const modelId = process.env.IOTHUB_MODEL_NAME; // suggestion: urn:azureiot:Client:SDKInformation:1

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - get a Digital Twin Model by model ID
async function main() {
  // Environment variables have to be set
  // Digital Twin enabled device must be exist on the IoT Hub

  try {
    // Create service client
    const credentials = new IoTHubTokenCredentials(connectionString);
    const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

    // Get digital twin model
    const digitalTwinModel = await digitalTwinServiceClient.getDigitalTwinModel(modelId);
    const idName = '@id';
    console.log('ModelId: ' + JSON.stringify(digitalTwinModel[idName], null, 2));
    console.log('Model: ' + JSON.stringify(digitalTwinModel.contents, null, 2));
  } catch (err) {
    console.log(err);
  }
};

main();
