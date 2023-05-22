// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let Registry = require('azure-iothub').Registry;
let uuid = require('uuid');
let DeviceIdentityHelper = require('./device_identity_helper.js');
let async = require('async');
let assert = require('chai').assert;
let debug = require('debug')('e2etests:module_crud');

let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
let registry = Registry.fromConnectionString(hubConnectionString);

function waitForEventualConsistency(callback) {
  // Some of these tests occasionally fails, presumably because the registry doesn't update quickly
  // enough. Sleep for an arbitrary 2 seconds to account for this.
  setTimeout(() => callback(), 2000);
}

describe('modules', function () {
  // eslint-disable-next-line no-invalid-this
  this.timeout(46000);
  let module;
  let deviceId = null;

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
      let id = deviceId;
      deviceId = null;
      debug('deleting device with deviceId ' + id);
      DeviceIdentityHelper.deleteDevice(id, function (err) {
        debug('deleteDevice returned ' + (err ? err : 'success'));
        done(err);
      });
    } else {
      done();
    }
  });

  beforeEach(function () {
    module = {
      deviceId: deviceId,
      moduleId: 'node_e2e_' + uuid.v4()
    };
    debug('moduleId for this test will be ' + module.moduleId);
  });

  it ('can add a module and find it by id', function (done) {
    async.series([
      function addModule(callback) {
        debug('adding module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.addModule(module, function (err) {
          debug('addModule returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      waitForEventualConsistency,
      function findModule(callback) {
        debug('getting module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.getModule(module.deviceId, module.moduleId, function (err, foundModule) {
          debug('getModule returned ' + (err ? err : 'success'));
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

  it ('can add a module and find it in list of all modules on device', function (done) {
    async.series([
      function addModule(callback) {
        debug('adding module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.addModule(module, function (err) {
          debug('addModule returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      waitForEventualConsistency,
      function findModule(callback) {
        debug('getting all modules on device ' + module.deviceId);
        registry.getModulesOnDevice(module.deviceId, function (err, foundModules) {
          debug('getModulesOnDevice returned ' + (err ? err : 'success'));
          if (err) {
            callback(err);
          } else {
            debug(foundModules.length.toString() + ' modules on device');
            let found = false;
            debug('looking for moduleId ' + module.moduleId);
            foundModules.forEach(function (foundModule) {
              debug('found moduleId ' + foundModule.moduleId);
              if (foundModule.deviceId === module.deviceId && foundModule.moduleId === module.moduleId) {
                debug('that\'s it!');
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
    it ('can add and update a module' + (forceUpdate ? ' with forceUpdate = true' : ''), function (done) {
      let expectedSecondary;
      let expectedPrimary;

      async.series([
        function addModule(callback) {
          debug('adding module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
          registry.addModule(module, function (err) {
            debug('addModule returned ' + (err ? err : 'success'));
            callback(err);
          });
        },
        waitForEventualConsistency,
        function updateModule(callback) {
          debug('Preparing to update. getting module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
          registry.getModule(module.deviceId, module.moduleId, function (err, foundModule) {
            debug('getModule returned ' + (err ? err : 'success'));
            if (err) {
              callback(err);
            } else {
              debug('switching primary and secondary keys');
              expectedSecondary = foundModule.authentication.symmetricKey.primaryKey;
              expectedPrimary = foundModule.authentication.symmetricKey.secondaryKey;
              foundModule.authentication.symmetricKey.primaryKey = expectedPrimary;
              foundModule.authentication.symmetricKey.secondaryKey = expectedSecondary;
              debug('calling updateModule set primary to ' + expectedPrimary);
              if (forceUpdate) {
                debug('forcing update');
                delete foundModule.etag;
              } else {
                debug('not forcing update.  etag=' + foundModule.etag);
              }
              debug('calling updateModule');
              registry.updateModule(foundModule, forceUpdate, function (err) {
                debug('updateModule returned ' + (err ? err : 'success'));
                callback(err);
              });
            }
          });
        },
        waitForEventualConsistency,
        function verifyUpdate(callback) {
          debug('verify the update');
          debug('getting module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
          registry.getModule(module.deviceId, module.moduleId, function (err, foundModule) {
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

  it ('can remove a module using deviceId, moduleId pair', function (done) {
    async.series([
      function addModule(callback) {
        debug('adding module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.addModule(module, function (err) {
          debug('addModule returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      waitForEventualConsistency,
      function removeModule(callback) {
        debug('removing module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.removeModule(module.deviceId, module.moduleId, function (err) {
          debug('remove module returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      waitForEventualConsistency,
      function verifyRemoval(callback) {
        debug('Verifying removal.  Getting module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.getModule(module.deviceId, module.moduleId, function (err) {
          debug('(expecting failure) getModule returned ' + (err ? err : 'success'));
          assert(err, 'The module should not be found after removal');
          callback();
        });
      }
    ], done);
  });

  it ('can remove a module using a module object', function (done) {
    async.series([
      function addModule(callback) {
        debug('adding module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.addModule(module, function (err) {
          debug('addModule returned ' + (err ? err : 'success'));
          callback(err);
        });
      },
      waitForEventualConsistency,
      function removeModule(callback) {
        debug('getting module');
        registry.getModule(module.deviceId, module.moduleId, function (err, foundModule) {
          debug('getModule returned ' + (err ? err : 'success'));
          debug('removing module using object returned from getModule');
          debug('removing module. etag = ' + foundModule.etag);
          registry.removeModule(foundModule, function (err) {
            debug('remove module returned ' + (err ? err : 'success'));
            callback(err);
          });
        });
      },
      waitForEventualConsistency,
      function verifyRemoval(callback) {
        debug('Verifying removal.  Getting module with deviceId = ' + module.deviceId + ' and moduleId ' + module.moduleId);
        registry.getModule(module.deviceId, module.moduleId, function (err) {
          debug('(expecting failure) getModule returned ' + (err ? err : 'success'));
          assert(err, 'The module should not be found after removal');
          callback();
        });
      }
    ], done);
  });

});

