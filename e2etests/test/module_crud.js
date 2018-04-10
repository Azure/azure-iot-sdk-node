// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Registry = require('azure-iothub').Registry;
var uuid = require('uuid');
var DeviceIdentityHelper = require('./device_identity_helper.js');
var async = require('async');
var assert = require('chai').assert;
var debug = require('debug')('e2etests:module_crud');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
var registry = Registry.fromConnectionString(hubConnectionString);

describe('modules', function() {
  var module;
  var deviceId = null;

  this.timeout(46000);

  before(function (done) {
    debug('Creating SAS device to use with test');
    DeviceIdentityHelper.createDeviceWithSas(function (err, testDeviceInfo) {
      debug('createDeviceWithSas returned ' + (err ? err : 'success'));
      if (!err) {
        deviceId = testDeviceInfo.deviceId;
        debug('test deviceId = ' + deviceId);
      }
      done(err);
    });
  });

  after(function (done) {
    if (deviceId) {
      var id = deviceId;
      deviceId = null;
      debug('deleting device with deviceId ' + id);
      DeviceIdentityHelper.deleteDevice(id, function(err) {
        debug('deleteDevice returned ' + (err ? err : 'success'));
        done(err);
      });
    } else {
      done();
    }
  });

  beforeEach(function() {
    module = {
      deviceId: deviceId,
      moduleId: 'node_e2e_' + uuid.v4()
    };
    debug('moduleId for this test will be ' + module.moduleId);
  });

  it ('can add a module and find it by id', function(done) {
    async.series([
      function addModule(callback) {
        debug('adding module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.addModule(module, function(err) {
          debug('addModule returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      function findModule(callback) {
        debug('getting module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.getModule(module.deviceId, module.moduleId, function(err, foundModule) {
          if (err) {
            debug('getModule returned ' + err);
            callback(err);
          } else {
            debug('getModule returned success');
            assert.strictEqual(foundModule.deviceId, module.deviceId);
            assert.strictEqual(foundModule.moduleId, module.moduleId);
            callback();
          }
        });
      }
    ], done);
  });

  it ('can add a module and find it in list of all modules on device', function(done) {
    async.series([
      function addModule(callback) {
        debug('adding module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.addModule(module, function(err) {
          debug('addModule returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      function findModule(callback) {
        debug('getting all modules on device ' + module.deviceId);
        registry.getModulesOnDevice(module.deviceId, function(err, foundModules) {
          debug('getModulesOnDevice returned ' + (err ? err : 'success'));
          if (err) {
            callback(err);
          } else {
            debug(foundModules.length.toString() + ' modules on device');
            var found = false;
            foundModules.forEach(function(foundModule) {
              if (foundModule.deviceId === module.deviceId && foundModule.moduleId === module.moduleId) {
                found = true;
              }
            });
            assert(found, 'module was not found in device');
            callback();
          }
        });
      }
    ], done);
  });

  [true, false].forEach(function (forceUpdate) {
    it ('can add and update a module' + (forceUpdate ? ' with forceUpdate = true' : ''), function(done) {
      var expectedSecondary;
      var expectedPrimary;

      async.series([
        function addModule(callback) {
          debug('adding module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
          registry.addModule(module, function(err) {
            debug('addModule returned ' + (err ? err : 'success'));
            callback(err);
          });
        },
        function updateModule(callback) {
          debug('Preparing to update. getting module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
          registry.getModule(module.deviceId, module.moduleId, function(err, foundModule) {
            debug('getModule returned ' + (err ? err : 'success'));
            if (err) {
              callback(err);
            } else {
              expectedSecondary = foundModule.authentication.symmetricKey.primaryKey;
              expectedPrimary = foundModule.authentication.symmetricKey.secondaryKey;
              foundModule.authentication.symmetricKey.primaryKey = expectedPrimary;
              foundModule.authentication.symmetricKey.secondaryKey = expectedSecondary;
              debug('calling updateModule set primary to ' + expectedPrimary);
              if (forceUpdate) {
                delete foundModule.etag;
              }
              registry.updateModule(foundModule, forceUpdate, function(err) {
                debug('updateModule returned ' + (err ? err : 'success'));
                callback(err);
              });
            }
          });
        },
        function verifyUpdate(callback) {
          debug('getting module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
          registry.getModule(module.deviceId, module.moduleId, function(err, foundModule) {
            debug('getModule returned ' + (err ? err : 'success'));
            if (err) {
              callback(err);
            } else {
              assert.strictEqual(foundModule.authentication.symmetricKey.primaryKey, expectedPrimary);
              assert.strictEqual(foundModule.authentication.symmetricKey.secondaryKey, expectedSecondary);
              debug('update successfully applied');
              callback();
            }
          });
        }
      ], done);
    });
  });

  // Skipped because of failure
  it ('can add and remove a module', function(done) {
    async.series([
      function addModule(callback) {
        debug('adding module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.addModule(module, function(err) {
          debug('addModule returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      function removeModule(callback) {
        debug('removing module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.removeModule(module.deviceId, module.moduleId, function(err) {
          debug('remove module returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      function verifyRemoval(callback) {
        debug('Verifying removal.  Getting module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.getModule(module.deviceId, module.moduleId, function(err) {
          debug('(expecting failure) getModule returned ' + (err ? err : 'success'));
          assert(err, 'The module should not be found after removal');
          callback();
        });
      }
    ], done);
  });
});

