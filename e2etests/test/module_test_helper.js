// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var uuid = require('uuid');
var debug = require('debug')('e2etests:module-test-helper');
var async = require('async');

var Registry = require('azure-iothub').Registry;
var ConnectionString = require('azure-iot-common').ConnectionString;
var ModuleClient = require('azure-iot-device').ModuleClient;
var ServiceClient = require('azure-iothub').Client;
var DeviceIdentityHelper = require('./device_identity_helper.js');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
var registry = Registry.fromConnectionString(hubConnectionString);
var serviceClient = ServiceClient.fromConnectionString(hubConnectionString);

module.exports.createModule = function(testModule, Transport, done)  {
  async.series([
    function createDeviceIfNecessary(done) {
      if (testModule.testDevice) {
        done();
      } else {
        testModule.registry = registry;
        testModule.serviceClient = serviceClient;

        debug('Creating SAS device to use with test');
        DeviceIdentityHelper.createDeviceWithSas(function (err, testDevice) {
          debug('createDeviceWithSas returned ' + (err ? err : 'success'));
          if (err) {
            done(err);
          } else {
            debug('test deviceId: ' + testDevice.deviceId);
            testModule.testDevice = testDevice;
            testModule.deviceId = testDevice.deviceId;
            done();
          }
        });
      }
    },
    function createModule(done) {
      testModule.moduleId = 'node_e2e_' + uuid.v4();
      debug('creating module with id ' + testModule.moduleId);
      registry.addModule({deviceId: testModule.deviceId, moduleId: testModule.moduleId}, function(err) {
        debug('addModule returned ' + (err ? err : 'success'));
        if (err) {
          done(err);
        } else {
          debug('getting module with deviceId = ' + testModule.deviceId + ' and moduleId ' + testModule.moduleId);
          registry.getModule(testModule.deviceId, testModule.moduleId, function(err, foundModule) {
            debug('getModule returned ' + (err ? err : 'success'));
            if (err) {
              done(err);
            } else {
              var hubName = ConnectionString.parse(hubConnectionString).HostName;
              testModule.moduleConnectionString = 'HostName=' + hubName + ';DeviceId=' + foundModule.deviceId + ';ModuleId='+foundModule.moduleId+';SharedAccessKey=' + foundModule.authentication.symmetricKey.primaryKey;
              done();
            }
          });
        }
      });
    },
    function connectDeviceClient(done) {
      testModule.deviceClient = ModuleClient.fromConnectionString(testModule.moduleConnectionString, Transport);
      debug('opening device client');
      testModule.deviceClient.open(function(err) {
        debug('deviceClient.open returned ' + (err ? err : 'success'));
        done(err);
      });
    }
  ], done);
};

module.exports.getTwinObjects = function(testModule, done) {
  async.series([
    function createServiceTwin(done) {
      debug('getting service twin');
        registry.getModuleTwin(testModule.deviceId, testModule.moduleId, function(err, twin) {
          debug('getModuleTwin returned ' + (err ? err : 'success'));
          if (err) {
            done(err);
          } else {
            testModule.serviceTwin = twin;
            done();
          }
        });
      },
      function createDeviceTwin(done) {
        debug('getting device twin');
        testModule.deviceClient.getTwin(function(err, twin) {
          debug('getTwin returned ' + (err ? err : 'success'));
          if (err) {
            done(err);
          } else {
            testModule.deviceTwin = twin;
            done();
          }
        });
    }
  ], done);
};

module.exports.cleanUpAfterTest = function(testModule, done) {
  async.series([
    function closeDeviceClient(done) {
      if (testModule.deviceClient) {
        debug('closing device client');
        testModule.deviceClient.close(function(err) {
          debug('deviceClient.close returned ' + (err ? err : 'success'));
          done(err);
        });
      } else {
        done();
      }
    },
    function removeDeviceFromRegistry(done) {
      if (testModule.testDevice && testModule.testDevice.deviceId) {
        debug('deleting device with deviceId ' + testModule.testDevice.deviceId);
        DeviceIdentityHelper.deleteDevice(testModule.testDevice.deviceId, function(err) {
          debug('deleteDevice returned ' + (err ? err : 'success'));
          testModule.testDevice.deviceId = null;
          done(err);
        });
      } else {
        done();
      }
    }
  ], done);
};
