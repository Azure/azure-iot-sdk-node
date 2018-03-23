// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Registry = require('azure-iothub').Registry;
var uuid = require('uuid');
var DeviceIdentityHelper = require('./device_identity_helper.js');
var async = require('async');
var assert = require('chai').assert;

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
var registry = Registry.fromConnectionString(hubConnectionString);

// MISSING SCENARIOS
//
// The following scenarios are missing because modules, module twins, and
// module methods are not yet supported for devices on IoT Hub
//
// 1. create a module, get the connection string, and connect using the device API.
// 2. set a module twin and verify desired properties from device API.
// 3. set reported properties from device api and verify from service api.
// 4. invoke a device method and verify using device api
//
describe('modules', function() {
  var module;
  var deviceId = null;

  before(function (done) {
    DeviceIdentityHelper.createDeviceWithSas(function (err, testDeviceInfo) {
      deviceId = testDeviceInfo.deviceId;
      done(err);
    });
  });

  after(function (done) {
    if (deviceId) {
      var id = deviceId;
      deviceId = null;
      DeviceIdentityHelper.deleteDevice(id, done);
    } else {
      done();
    }
  });

  beforeEach(function() {
    module = {
      deviceId: deviceId,
      moduleId: 'node_e2e_' + uuid.v4()
    };
  });

  it ('can add a module and find it by id', function(done) {
    async.series([
      function addModule(callback) {
        registry.addModule(module, callback);
      },
      function findModule(callback) {
        registry.getModule(module.deviceId, module.moduleId, function(err, foundModule) {
          if (err) {
            callback(err);
          } else {
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
        registry.addModule(module, callback);
      },
      function findModule(callback) {
        registry.getModulesOnDevice(module.deviceId, function(err, foundModules) {
          if (err) {
            callback(err);
          } else {
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

  it ('can add and update a module', function(done) {
    var expectedSecondary;
    var expectedPrimary;

    async.series([
      function addModule(callback) {
        registry.addModule(module, callback);
      },
      function updateModule(callback) {
        registry.getModule(module.deviceId, module.moduleId, function(err, foundModule) {
          if (err) {
            callback(err);
          } else {
            expectedSecondary = foundModule.authentication.symmetricKey.primaryKey;
            expectedPrimary = foundModule.authentication.symmetricKey.secondaryKey;
            foundModule.authentication.symmetricKey.primaryKey = expectedPrimary;
            foundModule.authentication.symmetricKey.secondaryKey = expectedSecondary;
            registry.updateModule(foundModule, callback);
          }
        });
      },
      function verifyUpdate(callback) {
        registry.getModule(module.deviceId, module.moduleId, function(err, foundModule) {
          if (err) {
            callback(err);
          } else {
            assert.strictEqual(foundModule.authentication.symmetricKey.primaryKey, expectedPrimary);
            assert.strictEqual(foundModule.authentication.symmetricKey.secondaryKey, expectedSecondary);
            callback();
          }
        });
      }
    ], done);
  });



  it ('can add and update a module', function(done) {
    var expectedSecondary;
    var expectedPrimary;

    async.series([
      function addModule(callback) {
        registry.addModule(module, callback);
      },
      function updateModule(callback) {
        registry.getModule(module.deviceId, module.moduleId, function(err, foundModule) {
          if (err) {
            callback(err);
          } else {
            expectedSecondary = foundModule.authentication.symmetricKey.primaryKey;
            expectedPrimary = foundModule.authentication.symmetricKey.secondaryKey;
            foundModule.authentication.symmetricKey.primaryKey = expectedPrimary;
            foundModule.authentication.symmetricKey.secondaryKey = expectedSecondary;
            delete foundModule.etag;
            registry.updateModule(foundModule, true, callback);
          }
        });
      },
      function verifyUpdate(callback) {
        registry.getModule(module.deviceId, module.moduleId, function(err, foundModule) {
          if (err) {
            callback(err);
          } else {
            assert.strictEqual(foundModule.authentication.symmetricKey.primaryKey, expectedPrimary);
            assert.strictEqual(foundModule.authentication.symmetricKey.secondaryKey, expectedSecondary);
            callback();
          }
        });
      }
    ], done);
  });

  // Skipped because of failure
  it.skip ('can add and remove a module', function(done) {
    async.series([
      function addModule(callback) {
        registry.addModule(module, callback);
      },
      function removeModule(callback) {
        registry.removeModule(module.deviceId, module.moduleId, callback);
      },
      function verifyRemoval(callback) {
        registry.getModule(module.deviceId, module.moduleId, function(err) {
          assert(err, 'The module should not be found after removal');
          callback();
        });
      }
    ], done);
  });
});

