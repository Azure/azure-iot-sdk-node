// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Registry = require('azure-iothub').Registry;
var uuid = require('uuid');
var async = require('async');
var assert = require('chai').assert;

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

describe('device configuration', function() {
  var deviceConfig;

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
  });

  afterEach(function(done) {
    var id = deviceConfig.id;
    deviceConfig = null;
    registry.removeConfiguration(id, function() {
      // ignore errors.  Test may not have created the config, or it may already be deleted
      done();
    });
  });

  it ('can add and find it by id', function(done) {
    async.series([
      function addConfig(callback) {
        registry.addConfiguration(deviceConfig, callback);
      },
      function findConfig(callback) {
        registry.getConfiguration(deviceConfig.id, function(err, foundConfig) {
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
        registry.addConfiguration(deviceConfig, callback);
      },
      function findConfig(callback) {
        registry.getConfigurations(function(err, foundConfigs) {
          if (err) {
            callback(err);
          } else {
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
        registry.addConfiguration(deviceConfig, callback);
      },
      function updateConfig(callback) {
        registry.getConfiguration(deviceConfig.id, function(err, foundConfig) {
          if (err) {
            callback(err);
          } else {
            foundConfig.priority = newPriority;
            registry.updateConfiguration(foundConfig, callback);
          }
        });
      },
      function verifyUpdate(callback) {
        registry.getConfiguration(deviceConfig.id, function(err, foundConfig) {
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
        registry.addConfiguration(deviceConfig, callback);
      },
      function updateConfig(callback) {
        deviceConfig.priority = newPriority;
        registry.updateConfiguration(deviceConfig, true, callback);
      },
      function verifyUpdate(callback) {
        registry.getConfiguration(deviceConfig.id, function(err, foundConfig) {
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
        registry.addConfiguration(deviceConfig, callback);
      },
      function verifyConfigWasAdded(callback) {
        registry.getConfiguration(deviceConfig.id, callback);
      },
      function removeConfig(callback) {
        registry.removeConfiguration(deviceConfig.id, callback);
      },
      function verifyConfigWasRemoved(callback) {
        registry.getConfiguration(deviceConfig.id, function(err) {
          if (!err) {
            assert.fail('getConfig should fail after config was removed');
          }
          callback();
        });
      }
    ], done);
  });

});


