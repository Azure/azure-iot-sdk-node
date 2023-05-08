// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Registry = require('azure-iothub').Registry;
const uuid = require('uuid');
const async = require('async');
const assert = require('chai').assert;
const debug = require('debug')('e2etests:configuration');
const getErrorDetailString = require('./testUtils').getErrorDetailString;

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
const registry = Registry.fromConnectionString(hubConnectionString);


function waitForEventualConsistency(callback) {
  // Some of these tests occasionally fails, presumably because the registry doesn't update quickly
  // enough. Sleep for an arbitrary 2 seconds to account for this.
  setTimeout(() => callback(), 2000);
}

// MISSING SCENARIOS
//
// The following scenarios are missing:
// 1) Test of applyConfigurationContentToDevice (because we can't create an edgeHub device)
// 2) Test to verify that config applies to device based on targetCondition (because the test hasn't been written)
//
['module', 'device'].forEach((entity) => {
  describe(entity + ' configuration', function () {
    // eslint-disable-next-line no-invalid-this
    this.timeout(46000);

    let config;

    beforeEach(function () {
      let propertyName = entity + 'Content';
      config = {
        id: 'node_e2e_' + entity + '_' + uuid.v4(),
        content: {
          [propertyName]: {
            'properties.desired': {
              prop1: 'foo'
            }
          }
        },
        targetCondition: '',
        priority: 20
      };
      debug('using configuration id ' + config.id + ' for this test');
    });

    afterEach(function (done) {
      if (config && config.id) {
        const id = config.id;
        config = null;
        debug('(afterEach) removing configuration with id ' + id);
        registry.removeConfiguration(id, function (err) {
          debug(getErrorDetailString('(afterEach: ignoring error) removeConfiguration', err));
          // ignore errors.  Test may not have created the config, or it may already be deleted
          done();
        });
      }
    });

    it ('can add and find it by id', function (done) {
      async.series([
        function addConfig(callback) {
          debug('adding configuration with id ' + config.id);
          registry.addConfiguration(config, function (err) {
            debug(getErrorDetailString('addConfiguration', err));
            callback(err);
          });
        },
        waitForEventualConsistency,
        function findConfig(callback) {
          debug('getting configuration with id ' + config.id);
          registry.getConfiguration(config.id, function (err, foundConfig) {
            debug(getErrorDetailString('getConfiguration', err));
            if (err) {
              callback(err);
            } else {
              assert.strictEqual(foundConfig.id, config.id);
              assert.deepEqual(foundConfig.content, config.content);
              callback();
            }
          });
        }
      ], done);
    });

    it ('can add a config and see it in the list of all configs', function (done) {
      async.series([
        function addConfig(callback) {
          debug('adding configuration with id ' + config.id);
          registry.addConfiguration(config, function (err) {
            debug(getErrorDetailString('addConfiguration', err));
            callback(err);
          });
        },
        waitForEventualConsistency,
        function findConfig(callback) {
          debug('getting all configurations');
          registry.getConfigurations(function (err, foundConfigs) {
            debug(getErrorDetailString('getConfigurations', err));
            if (err) {
              callback(err);
            } else {
              debug(foundConfigs.length.toString() + ' configurations on hub');
              debug(JSON.stringify(foundConfigs, null, '  '));
              let found = false;
              foundConfigs.forEach(function (foundConfig) {
                if (foundConfig.id === config.id) {
                  assert.strictEqual(foundConfig.id, config.id);
                  assert.deepEqual(foundConfig.content, config.content);
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

    it ('can add and update a config', function (done) {
      const newPriority = 99;
      async.series([
        function addConfig(callback) {
          debug('adding configuration with id ' + config.id);
          registry.addConfiguration(config, function (err) {
            debug(getErrorDetailString('addConfiguration', err));
            callback(err);
          });
        },
        waitForEventualConsistency,
        function updateConfig(callback) {
          debug('Preparing for update.  Getting configuration with id ' + config.id);
          registry.getConfiguration(config.id, function (err, foundConfig) {
            debug(getErrorDetailString('getConfiguration', err));
            if (err) {
              callback(err);
            } else {
              debug('Updating configuration with id ' + config.id + ' to priority ' + newPriority);
              foundConfig.priority = newPriority;
              registry.updateConfiguration(foundConfig, function (err) {
                debug(getErrorDetailString('updateConfiguration', err));
                callback(err);
              });
            }
          });
        },
        waitForEventualConsistency,
        function verifyUpdate(callback) {
          debug('Verifying update.  Getting configuration with id ' + config.id);
          registry.getConfiguration(config.id, function (err, foundConfig) {
            debug(getErrorDetailString('getConfiguration', err));
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

    it ('can add and force-update a config', function (done) {
      const newPriority = 99;
      async.series([
        function addConfig(callback) {
          debug('adding configuration with id ' + config.id);
          registry.addConfiguration(config, function (err) {
            debug(getErrorDetailString('addConfiguration', err));
            callback(err);
          });
        },
        waitForEventualConsistency,
        function updateConfig(callback) {
          config.priority = newPriority;
          debug('Updating configuration with id ' + config.id + ' to priority ' + newPriority);
          registry.updateConfiguration(config, true, function (err) {
            debug(getErrorDetailString('updateConfiguration', err));
            callback(err);
          });
        },
        waitForEventualConsistency,
        function verifyUpdate(callback) {
          debug('Verifying update.  Getting configuration with id ' + config.id);
          registry.getConfiguration(config.id, function (err, foundConfig) {
            debug(getErrorDetailString('getConfiguration', err));
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

    it ('can add and delete a config', function (done) {
      async.series([
        function addConfig(callback) {
          debug('adding configuration with id ' + config.id);
          registry.addConfiguration(config, function (err) {
            debug(getErrorDetailString('addConfiguration', err));
            callback(err);
          });
        },
        waitForEventualConsistency,
        function verifyConfigWasAdded(callback) {
          debug('verifying existence of config with id ' + config.id);
          registry.getConfiguration(config.id, function (err) {
            debug(getErrorDetailString('getConfiguration', err));
            callback(err);
          });
        },
        waitForEventualConsistency,
        function removeConfig(callback) {
          debug('removing configuration with id ' + config.id);
          registry.removeConfiguration(config.id, function (err) {
            debug(getErrorDetailString('removeConfiguration', err));
            callback(err);
          });
        },
        waitForEventualConsistency,
        function verifyConfigWasRemoved(callback) {
          debug('verifying removal of configuration with id ' + config.id);
          registry.getConfiguration(config.id, function (err) {
            debug(getErrorDetailString('(expecting failure) getConfiguration', err));
            if (!err) {
              assert.fail('getConfig should fail after config was removed');
            }
            callback();
          });
        }
      ], done);
    });
  });
});
