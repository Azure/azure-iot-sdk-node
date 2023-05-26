// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let uuid = require('uuid');
let debug = require('debug')('e2etests:module-test-helper');
let async = require('async');

let Registry = require('azure-iothub').Registry;
let ConnectionString = require('azure-iot-common').ConnectionString;
let ModuleClient = require('azure-iot-device').ModuleClient;
let ServiceClient = require('azure-iothub').Client;
let DeviceIdentityHelper = require('./device_identity_helper.js');

let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
let registry = Registry.fromConnectionString(hubConnectionString);
let serviceClient = ServiceClient.fromConnectionString(hubConnectionString);

module.exports.createModule = function (testModule, Transport, done)  {
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
      registry.addModule({ deviceId: testModule.deviceId, moduleId: testModule.moduleId }, function (err) {
        debug('addModule returned ' + (err ? err : 'success'));
        if (err) {
          done(err);
        } else {
          // Added setTimeout because getModule doesn't always succeed if you call it immediately after addModule.
          setTimeout(function () {
            debug('getting module with deviceId = ' + testModule.deviceId + ' and moduleId ' + testModule.moduleId);
            registry.getModule(testModule.deviceId, testModule.moduleId, function (err, foundModule) {
              debug('getModule returned ' + (err ? err : 'success'));
              if (err) {
                done(err);
              } else {
                let hubName = ConnectionString.parse(hubConnectionString).HostName;
                testModule.moduleConnectionString = 'HostName=' + hubName + ';DeviceId=' + foundModule.deviceId + ';ModuleId='+foundModule.moduleId+';SharedAccessKey=' + foundModule.authentication.symmetricKey.primaryKey;
                done();
              }
            });
          }, 2000);
        }
      });
    },
    function connectDeviceClient(done) {
      testModule.deviceClient = ModuleClient.fromConnectionString(testModule.moduleConnectionString, Transport);
      debug('opening device client');
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      testModule.deviceClient.open(function (err) {
        debug('deviceClient.open returned ' + (err ? err : 'success'));
        done(err);
      });
    }
  ], done);
};

module.exports.getTwinObjects = function (testModule, done) {
  async.series([
    function createServiceTwin(done) {
      debug('getting service twin');
        registry.getModuleTwin(testModule.deviceId, testModule.moduleId, function (err, twin) {
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
        testModule.deviceClient.getTwin(function (err, twin) {
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

module.exports.cleanUpAfterTest = function (testModule, done) {
  async.series([
    function closeDeviceClient(done) {
      if (testModule.deviceClient) {
        debug('closing device client');
        testModule.deviceClient.close(function (err) {
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
        DeviceIdentityHelper.deleteDevice(testModule.testDevice.deviceId, function (err) {
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
