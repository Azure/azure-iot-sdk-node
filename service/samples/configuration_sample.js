// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var iothub = require('azure-iothub');

var connectionString = '[IoT Hub Connection String]';
var deviceId = '[Device ID]';

var registry = iothub.Registry.fromConnectionString(connectionString);

var sampleConfig = {
  id: 'sampleconfig',
  labels: {},
  content: {
    moduleContent: {
      fakeModule: {
        'properties.desired': {
          prop1: 'foo'
        }
      }
    }
  },
  targetCondition: 'tags.environment=\'prod\'',
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
        console.log(config.id);
      });

      if (configurations.length >= 1) {
        getConfigurationById(configurations[0].id,done);
      } else {
        done();
      }
    }
  });
};

var getConfigurationById = function(id, done) {
  console.log();
  console.log('getting details for config ' + id);
  registry.getConfiguration(id, function(err, config) {
    if (err) {
      console.log('getConfigurationById failed: ' + err);
      done();
    } else {
      printJson(config);
      done();
    }
  });
};

var addConfiguration = function(done) {
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

var updateConfiguration = function(done) {
  console.log();
  console.log('retrieving new configuration back from the service to update');

  registry.getConfiguration(sampleConfig.id, function(err, configFromService) {
    if (err) {
      console.log('getConfiguration failed: ' + err);
      done();
    } else {
      configFromService.priority++;
      console.log('updating configuration with new priority ' + configFromService.priority);
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
  console.log('removing configuration with id ' + sampleConfig.id);

  registry.removeConfiguration(sampleConfig.id, function(err) {
    if (err) {
      console.log('removeConfiguration failed: ' + err);
      done();
    } else {
      console.log('removeConfiguration succeeded');
      done();
    }
  });
};

var applyConfigurationContentOnDevice = function(done) {
  console.log("Applying configuration to device " + deviceId);

  registry.applyConfigurationContentOnDevice(deviceId, sampleConfig, function(err) {
    if (err) {
      console.log('applyConfigurationContentOnDevice failed: ' + err);
      done();
    } else {
      console.log('applyConfigurationContentOnDevice succeeded');
      done();
    }
  });
};

getAllConfigurations(function() {
  addConfiguration(function() {
    updateConfiguration(function() {
      removeConfiguration(function() {
        applyConfigurationContentOnDevice(function() {

        });
      });
    });
  });
});
