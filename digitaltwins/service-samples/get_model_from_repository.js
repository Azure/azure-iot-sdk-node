const IoTHubTokenCredentials = require('azure-iot-digitaltwin-service').IoTHubTokenCredentials;
const ModelRepoClient  = require('azure-iot-digitaltwin-model-repository').DigitalTwinRepositoryService;

async function main() {
  const creds = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const repoClient = new ModelRepoClient(creds);
  const modelId = 'urn:model:id';

  const model = await repoClient.getModel(modelId);
  console.log(JSON.stringify(model, null, 2));
}

main();