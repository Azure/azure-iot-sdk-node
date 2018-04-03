// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Registry = require('azure-iothub').Registry;
var uuid = require('uuid');
var async = require('async');
var assert = require('chai').assert;
var debug = require('debug')('e2etests:configuration');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
var registry = Registry.fromConnectionString(hubConnectionString);

// MISSING SCENARIOS
//
// The following scenarios are missing because:
//   1) there's currently no way to apply content to a non-IoT Hub device
//   2) There's configuration API for the device to verify the config was added.
//
// Test of applyConfigurationContentToDevice
// Test to verify that config applies to device based on targetCondition

describe.skip('device configuration', function() {
  var deviceConfig;

  this.timeout(46000);

  beforeEach(function() {
    deviceConfig = {
      id: 'node_e2e_' + uuid.v4(),
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
    debug('using configuration id ' + deviceConfig.id + ' for this test');
  });

  afterEach(function(done) {
    if (deviceConfig && deviceConfig.id) {
      var id = deviceConfig.id;
      deviceConfig = null;
      debug('(afterEach) removing configuration with id ' + id);
      registry.removeConfiguration(id, function(err) {
        debug('(afterEach: ignoring error) removeConfiguration returned ' + (err ? err : 'success'));
        // ignore errors.  Test may not have created the config, or it may already be deleted
        done();
      });
    }
  });

  it ('can add and find it by id', function(done) {
    async.series([
      function addConfig(callback) {
        debug('adding configuration with id ' + deviceConfig.id);
        registry.addConfiguration(deviceConfig, function(err) {
          debug('addConfiguration returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      function findConfig(callback) {
        debug('getting configuration with id ' + deviceConfig.id);
        registry.getConfiguration(deviceConfig.id, function(err, foundConfig) {
          debug('getConfiguration returned ' + (err ? err : 'success'));
          if (err) {
            callback(err);
          } else {
            assert.strictEqual(foundConfig.id, deviceConfig.id);
            assert.deepEqual(foundConfig.content, deviceConfig.content);
            callback();
          }
        });
      }
    ], done);
  });

  it ('can add a config and see it in the list of all configs', function(done) {
    async.series([
      function addConfig(callback) {
        debug('adding configuration with id ' + deviceConfig.id);
        registry.addConfiguration(deviceConfig, function(err) {
          debug('addConfiguration returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      function findConfig(callback) {
        debug('getting configuration with id ' + deviceConfig.id);
        registry.getConfigurations(function(err, foundConfigs) {
          debug('getConfigurations returned ' + (err ? err : 'success'));
          if (err) {
            callback(err);
          } else {
            debug(foundConfigs.length.toString() + ' configurations on hub');
            var found = false;
            foundConfigs.forEach(function(foundConfig) {
              if (foundConfig.id === deviceConfig.id) {
                assert.strictEqual(foundConfig.id, deviceConfig.id);
                assert.deepEqual(foundConfig.content, deviceConfig.content);
                found = true;
              }
            });
            assert(found, 'config was not found');
            callback();
          }
        });
      }
    ], done);
  });

  it ('can add and update a config', function(done) {
    var newPriority = 99;
    async.series([
      function addConfig(callback) {
        debug('adding configuration with id ' + deviceConfig.id);
        registry.addConfiguration(deviceConfig, function(err) {
          debug('addConfiguration returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      function updateConfig(callback) {
        debug('Preparing for update.  Getting configuration with id ' + deviceConfig.id);
        registry.getConfiguration(deviceConfig.id, function(err, foundConfig) {
          debug('getConfiguration returned ' + (err ? err : 'success'));
          if (err) {
            callback(err);
          } else {
            debug('Updating configuration with id ' + deviceConfig.id + ' to priority ' + newPriority);
            foundConfig.priority = newPriority;
            registry.updateConfiguration(foundConfig, function(err) {
              debug('updateConfiguration returned ' + (err ? err : 'success'));
              callback(err);
            });
          }
        });
      },
      function verifyUpdate(callback) {
        debug('Verifying update.  Getting configuration with id ' + deviceConfig.id);
        registry.getConfiguration(deviceConfig.id, function(err, foundConfig) {
          debug('getConfiguration returned ' + (err ? err : 'success'));
          if (err) {
            callback(err);
          } else {
            assert.strictEqual(foundConfig.priority, newPriority);
            callback();
          }
        });
      }
    ], done);
  });

  it ('can add and force-update a config', function(done) {
    var newPriority = 99;
    async.series([
      function addConfig(callback) {
        debug('adding configuration with id ' + deviceConfig.id);
        registry.addConfiguration(deviceConfig, function(err) {
          debug('addConfiguration returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      function updateConfig(callback) {
        deviceConfig.priority = newPriority;
        debug('Updating configuration with id ' + deviceConfig.id + ' to priority ' + newPriority);
        registry.updateConfiguration(deviceConfig, true, function(err) {
          debug('updateConfiguration returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      function verifyUpdate(callback) {
        debug('Verifying update.  Getting configuration with id ' + deviceConfig.id);
        registry.getConfiguration(deviceConfig.id, function(err, foundConfig) {
          debug('getConfiguration returned ' + (err ? err : 'success'));
          if (err) {
            callback(err);
          } else {
            assert.strictEqual(foundConfig.priority, newPriority);
            callback();
          }
        });
      }
    ], done);
  });

  it ('can add and delete a config', function(done) {
    async.series([
      function addConfig(callback) {
        debug('adding configuration with id ' + deviceConfig.id);
        registry.addConfiguration(deviceConfig, function(err) {
          debug('addConfiguration returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      function verifyConfigWasAdded(callback) {
        debug('verifying existence of config with id ' + deviceConfig.id);
        registry.getConfiguration(deviceConfig.id, function(err) {
          debug('getConfiguration returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      function removeConfig(callback) {
        debug('removing configuration with id ' + deviceConfig.id);
        registry.removeConfiguration(deviceConfig.id, function(err) {
          debug('removeConfiguration returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      function verifyConfigWasRemoved(callback) {
        debug('verifying removal of configuration with id ' + deviceConfig.id);
        registry.getConfiguration(deviceConfig.id, function(err) {
          debug('(expecting failure) getConfiguration returned ' + (err ? err : 'success'));
          if (!err) {
            assert.fail('getConfig should fail after config was removed');
          }
          callback();
        });
      }
    ], done);
  });
});


