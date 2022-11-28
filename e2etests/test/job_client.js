// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let assert = require('chai').assert;
let uuid = require('uuid');
let debug = require('debug')('e2etests:JobClient');
let Registry = require('azure-iothub').Registry;
let ConnectionString = require('azure-iothub').ConnectionString;
let JobClient = require('azure-iothub').JobClient;
let DeviceClient = require('azure-iot-device').Client;
let DeviceMqtt = require('azure-iot-device-mqtt').Mqtt;
let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

describe('JobClient', function () {
  // eslint-disable-next-line no-invalid-this
  this.timeout(120000);

  let testDeviceId = '0000node-e2etests-JobClient-' + uuid.v4();
  let testDevice = null;
  let testDeviceConnectionString = null;

  function continueWith(testCallback, next) {
    return function (err, result) {
      if (err) {
        testCallback(err);
      } else {
        next(result);
      }
    };
  }

  before(function (beforeCallback) {
    let registry = Registry.fromConnectionString(hubConnectionString);
    registry.create({ deviceId: testDeviceId }, continueWith(beforeCallback, function (result) {
      testDevice = result;
      let host = ConnectionString.parse(hubConnectionString).HostName;
      testDeviceConnectionString = 'HostName=' + host + ';DeviceId=' + testDevice.deviceId + ';SharedAccessKey=' + testDevice.authentication.symmetricKey.primaryKey;
      debug('created device with id: ' + testDevice.deviceId);
      beforeCallback();
    }));
  });

  after(function (afterCallback) {
    if(testDevice) {
      let registry = Registry.fromConnectionString(hubConnectionString);
      registry.delete(testDeviceId, function (err) {
        debug('deleted device with id: ' + testDevice.deviceId);
        afterCallback(err);
      });
    } else {
      // Device was not created, exit immediately.
      afterCallback();
    }
  });

  function waitForJobStatus(jobClient, jobId, desiredJobStatus, callback) {
    let intervalInMs = 3000;
    const waitFunction = function () {
      jobClient.getJob(jobId, continueWith(callback, function (job) {
        debug('Got job ' + jobId + ' status: ' + job.status);
        if(job.status === desiredJobStatus) {
          callback(null, job);
        } else if (job.status === 'failed' || job.status === 'cancelled'){
          callback(new Error('Job ' + jobId + ' status is: ' + job.status));
        } else {
          debug('Job ' + jobId + ' current status: ' + job.status + ' waiting for ' + desiredJobStatus);
          setTimeout(waitFunction, intervalInMs);
        }
      }));
    };
    setTimeout(waitFunction, intervalInMs);
  }

  describe('scheduleTwinUpdate', function () {
    it('schedules a twin update job with a sql query and succeeds', function (testCallback) {
      let jobClient = JobClient.fromConnectionString(hubConnectionString);
      let testJobId = uuid.v4();
      let testTwinPatch = {
        etag: '*',
        tags: {
          key: 'value2'
        },
        properties: { desired: {}, reported: {} }
      };

      debug('scheduling a twin update job with a sql query with the id: ' + testJobId);
      debug('Query: ' + 'deviceId = \'' + testDeviceId + '\'');
      jobClient.scheduleTwinUpdate(testJobId, 'deviceId = \'' + testDeviceId + '\'', testTwinPatch, new Date(Date.now()), 120, continueWith(testCallback, function () {
        waitForJobStatus(jobClient, testJobId, 'completed', continueWith(testCallback, function () {
          let registry = Registry.fromConnectionString(hubConnectionString);
          registry.getTwin(testDeviceId, continueWith(testCallback, function (twin) {
            assert.equal(twin.tags.key, testTwinPatch.tags.key);
            testCallback();
          }));
        }));
      }));
    });

    it('schedules a twin update job and cancels it', function (testCallback) {
      let jobClient = JobClient.fromConnectionString(hubConnectionString);
      let testJobId = uuid.v4();
      let fakePatch = {
        etag: '*',
        tags: {},
        properties: {
          desired: {},
          reported: {}
        }
      };
      jobClient.scheduleTwinUpdate(testJobId, 'deviceId = \'' + testDeviceId + '\'', fakePatch, new Date(Date.now() + 3600000), 120, continueWith(testCallback, function (job) {
        assert.strictEqual(job.jobId, testJobId);
        assert.strictEqual(job.status, 'queued');
        debug('cancelling job ' + testJobId);
        jobClient.cancelJob(testJobId, continueWith(testCallback, function () {
          waitForJobStatus(jobClient, testJobId, 'cancelled', continueWith(testCallback, function () {
            testCallback();
          }));
        }));
      }));
    });
  });

  describe('scheduleDeviceMethod', function () {
    let testDeviceMethod = {
      methodName: 'testMethod',
      payload: null,
      timeoutInSeconds: 30
    };

    it('schedules a device method job with a sql query and succeeds', function (testCallback) {
      let jobClient = JobClient.fromConnectionString(hubConnectionString);
      let testJobId = uuid.v4();
      let methodResponseWasSent = false;
      let deviceClient = DeviceClient.fromConnectionString(testDeviceConnectionString, DeviceMqtt);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      deviceClient.open(continueWith(testCallback, function () {
        deviceClient.onDeviceMethod(testDeviceMethod.methodName, function (request, response) {
          response.send(200, continueWith(testCallback, function () {
            methodResponseWasSent = true;
          }));
        });

        debug('scheduling a device method job with a sql query with the id: ' + testJobId);
        debug('Query: ' + 'deviceId = \'' + testDeviceId + '\'');
        jobClient.scheduleDeviceMethod(testJobId, 'deviceId = \'' + testDeviceId + '\'', testDeviceMethod, new Date(Date.now()), 120, continueWith(testCallback, function () {
          waitForJobStatus(jobClient, testJobId, 'completed', continueWith(testCallback, function () {
            let registry = Registry.fromConnectionString(hubConnectionString);
            registry.getTwin(testDeviceId, continueWith(testCallback, function () {
              assert.isTrue(methodResponseWasSent);
              testCallback();
            }));
          }));
        }));
      }));
    });

    it('schedules a device method job and cancels it', function (testCallback) {
      let jobClient = JobClient.fromConnectionString(hubConnectionString);
      let testJobId = uuid.v4();
      jobClient.scheduleDeviceMethod(testJobId, 'deviceId = \'' + testDeviceId + '\'', testDeviceMethod, new Date(Date.now() + 3600000), 120, continueWith(testCallback, function (job) {
        assert.strictEqual(job.jobId, testJobId);
        assert.strictEqual(job.status, 'queued');
        debug('cancelling job ' + testJobId);
        jobClient.cancelJob(testJobId, continueWith(testCallback, function () {
          waitForJobStatus(jobClient, testJobId, 'cancelled', continueWith(testCallback, function () {
            testCallback();
          }));
        }));
      }));
    });
  });
});
