const IoTHubTokenCredentials = require('azure-iot-digitaltwin-service').IoTHubTokenCredentials;
const ModelRepositoryClient  = require('azure-iot-digitaltwin-model-repository').DigitalTwinRepositoryService;

// Simple example of how to:
// - create a Model Repository Client the ModelRepositoryClient constructor
// - get a model from the repository
async function main() {
  // IoT Hub connection string has to be set to system environment variable IOTHUB_CONNECTION_STRING
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const repositoryClient = new ModelRepositoryClient(credentials);

  const modelId = '<URN:MODEL_ID_GOES_HERE>';
  const model = await repositoryClient.getModel(modelId);

  // Print the model
  console.log(JSON.stringify(model, null, 2));
}

main();