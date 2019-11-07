'use strict';

module.exports = {
  ModelRepositoryCredentials: require('./dist/auth/model_repository_credentials').ModelRepositoryCredentials,
  ModelRepositoryServiceClient: require('./dist/cl/model_repository_service_client').ModelRepositoryServiceClient,
  DigitalTwinRepositoryService: require('./dist/pl/digitalTwinRepositoryService').DigitalTwinRepositoryService,
  DigitalTwinRepositoryServiceModels: require('./dist/pl/digitalTwinRepositoryService').DigitalTwinRepositoryServiceModels,
};
