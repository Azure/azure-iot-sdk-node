// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var iothub = require('azure-iothub');

var connectionString = '[IoT Hub Connection String]';

var registry = iothub.Registry.fromConnectionString(connectionString);

var sampleDeploymentId = 'fake-deployment';
var sampleDeployment = {
  'id': sampleDeploymentId,
  'content': {
    'modulesContent': {
      '$edgeAgent': {
        'properties.desired': {
          'schemaVersion': '1.0',
          'runtime': {
            'type': 'docker',
            'settings': {
              'minDockerVersion': 'v1.25',
              'loggingOptions': ''
            }
          },
          'systemModules': {
            'edgeAgent': {
              'type': 'docker',
              'settings': {
                'image': 'microsoft/azureiotedge-agent:1.0-preview',
                'createOptions': '{}'
              }
            },
            'edgeHub': {
              'type': 'docker',
              'status': 'running',
              'restartPolicy': 'always',
              'settings': {
                'image': 'microsoft/azureiotedge-hub:1.0-preview',
                'createOptions': '{}'
              }
            }
          },
          'modules': {}
        }
      },
      '$edgeHub': {
        'properties.desired': {
          'schemaVersion': '1.0',
          'routes': {
            'route': 'FROM /* INTO $upstream'
          },
          'storeAndForwardConfiguration': {
            'timeToLiveSecs': 7200
          }
        }
      }
    }
  },
  'schemaVersion': '1.0',
  'targetCondition': 'tags.environment=\'test\'',
  'priority': 10,
  'labels': {
    'Version': '3.0.1'
  },
}

var printJson = function(obj) {
  console.log(JSON.stringify(obj, null, '  '));
};


var createEdgeDeployment = function(done) {
  console.log();
  console.log('adding new deployment with id ' + sampleDeployment.id);

  registry.addConfiguration(sampleDeployment, function(err) {
    if (err) {
      console.log('add configuration failed: ' + err);
      done();
    } else {
      console.log('add configuration succeeded');
      done();
    }
  });
};

var monitorEdgeDeployment = function(done) {
  console.log();
  console.log('getting details for deployment ' + sampleDeploymentId);
  registry.getConfiguration(sampleDeploymentId, function(err, config) {
    if (err) {
      console.log('getConfigurationById failed: ' + err);
      done();
    } else {
      printJson(config);
      done();
    }
  });
};


var updateEdgeDeployment = function(done) {
  console.log();
  console.log('updating deployment ' + sampleDeploymentId + ' to add new query' );

  registry.getConfiguration(sampleDeploymentId, function(err, configFromService) {
    if (err) {
      console.log('getConfiguration failed: ' + err);
      done();
    } else {
      configFromService.metrics.queries['notAppliedCount'] = 'select deviceId from devices.modules where moduleId = \'$edgeAgent\' and configurations.[[fake-deployment]].status != \'Applied\'';
      registry.updateConfiguration(configFromService, function(err) {
        if (err) {
          console.log('updateConfiguration failed: ' + err);
          done();
        } else {
          console.log('updateConfiguration succeeded');
          done();
        }
      });
    }
  });
};

var removeEdgeDeployment = function(done) {
  console.log();
  console.log('removing configuration with id ' + sampleDeploymentId);

  registry.removeConfiguration(sampleDeploymentId, function(err) {
    if (err) {
      console.log('removeConfiguration failed: ' + err);
      done();
    } else {
      console.log('removeConfiguration succeeded');
      done();
    }
  });
};

createEdgeDeployment(function() {
  monitorEdgeDeployment(function() {
    updateEdgeDeployment(function() {
      monitorEdgeDeployment(function() {
        removeEdgeDeployment(function() {
        });
      });
    });
  });
});

