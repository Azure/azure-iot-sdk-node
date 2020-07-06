// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;
const { inspect } = require('util');

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - get a Digital Twin Model by model ID
//
// Preconditions:
// - Environment variables have to be set
// - Twin enabled device must exist on the ADT hub
async function main() {
  const modelId = process.env.IOTHUB_MODEL_ID; // suggestion: urn:azureiot:Client:SDKInformation:1

  // Create service client
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Get digital twin model
  const model = await digitalTwinServiceClient.getModel(modelId);

  // Print the model
  console.log(inspect(model));
};

main().catch((err) => {
  console.log("error code: ", err.code);
  console.log("error message: ", err.message);
  console.log("error stack: ", err.stack);
});
