// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var iothub = require('azure-iothub');

var connectionString = '[IoT Hub Connection String]';

var registry = iothub.Registry.fromConnectionString(connectionString);

var sampleConfigId = 'chiller4000x';
var sampleConfig = {
  id: sampleConfigId,
  content: {
    deviceContent: {
      'properties.desired.chiller-water': {
        temperature: 66,
        pressure: 28
      }
    }
  },
  metrics: {
    queries: {
      waterSettingsPending: 'SELECT deviceId FROM devices WHERE properties.reported.chillerWaterSettings.status=\'pending\''
    }
  },
  targetCondition: 'properties.reported.chillerProperties.model=\'4000x\'',
  priority: 20
};

var printJson = function(obj) {
  console.log(JSON.stringify(obj, null, '  '));
};


var getAllConfigurations = function(done) {
  console.log();
  console.log('Querying IoT Hub for configurations');

  registry.getConfigurations(function(err, configurations) {
    if (err) {
      console.log('getConfigurations failed: ' + err);
      done();
    } else {
      console.log(configurations.length.toString() + ' configurations found');
      configurations.forEach(function(config) {
        console.log('contents of ' + config.id + ':');
        printJson(config);
        console.log();
      });
      done();
    }
  });
};

var createConfiguration = function(done) {
  console.log();
  console.log('adding new configuration with id ' + sampleConfig.id + ' and priority ' + sampleConfig.priority);

  registry.addConfiguration(sampleConfig, function(err) {
    if (err) {
      console.log('add configuration failed: ' + err);
      done();
    } else {
      console.log('add configuration succeeded');
      done();
    }
  });
};

var monitorConfiguration = function(done) {
  console.log();
  console.log('getting details for config ' + sampleConfigId);
  registry.getConfiguration(sampleConfigId, function(err, config) {
    if (err) {
      console.log('getConfigurationById failed: ' + err);
      done();
    } else {
      printJson(config);
      done();
    }
  });
};


var updateConfiguration = function(done) {
  console.log();
  console.log('updating configuration ' + sampleConfigId + ' to add new query' );

  registry.getConfiguration(sampleConfigId, function(err, configFromService) {
    if (err) {
      console.log('getConfiguration failed: ' + err);
      done();
    } else {
      configFromService.metrics.queries['overheat'] = 'SELECT deviceId FROM devices WHERE properties.reported.chillerWaterSettings.temperature > 75';
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

var removeConfiguration = function(done) {
  console.log();
  console.log('removing configuration with id ' + sampleConfigId);

  registry.removeConfiguration(sampleConfigId, function(err) {
    if (err) {
      console.log('removeConfiguration failed: ' + err);
      done();
    } else {
      console.log('removeConfiguration succeeded');
      done();
    }
  });
};

getAllConfigurations(function() {
  createConfiguration(function() {
    monitorConfiguration(function() {
      updateConfiguration(function() {
        monitorConfiguration(function() {
          removeConfiguration(function() {
          });
        });
      });
    });
  });
});
