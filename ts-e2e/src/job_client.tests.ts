import { Client as DeviceClient } from 'azure-iot-device';
import { Mqtt as DeviceMqtt } from 'azure-iot-device-mqtt';
import { ConnectionString, JobClient, Registry } from 'azure-iothub';
import * as uuid from 'uuid';
import { assert } from 'chai';
import * as dbg from 'debug';
const debug = dbg('ts-e2e-jobclient');

 describe('JobClient', () => {
  // tslint:disable:no-invalid-this
  this.timeout(120000);

  const testDeviceId = '0000node-e2etests-JobClient-' + uuid.v4();
  let testDevice = null;
  let testDeviceConnectionString = null;

  const continueWith = (next) => {
    return (err, result) => {
      if (err) throw err;
      return next(result);
    };
  };

  before((beforeCallback) => {
    const registry = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
    registry.create({ deviceId: testDeviceId }, continueWith((result) => {
      testDevice = result;
      const host = ConnectionString.parse(process.env.IOTHUB_CONNECTION_STRING).HostName;
      testDeviceConnectionString = 'HostName=' + host + ';DeviceId=' + testDevice.deviceId + ';SharedAccessKey=' + testDevice.authentication.symmetricKey.primaryKey;
      debug('created device with id: ' + testDevice.deviceId);
      beforeCallback();
    }));
  });

  after((afterCallback) => {
    if (testDevice) {
      const registry = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
      registry.delete(testDeviceId, (err) => {
        debug('deleted device with id: ' + testDevice.deviceId);
        afterCallback(err);
      });
    } else {
      // Device was not created, exit immediately.
      afterCallback();
    }
  });

  const waitForJobStatus = (jobClient, jobId, desiredJobStatus, callback) => {
    const intervalInMs = 3000;
    const waitFunction = () => {
      jobClient.getJob(jobId, continueWith((job) => {
        debug('Got job ' + jobId + ' status: ' + job.status);
        if (job.status === desiredJobStatus) {
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
  };

  describe('scheduleTwinUpdate', () => {
    it('schedules a twin update job with a sql query and succeeds', (testCallback) => {
      const jobClient = JobClient.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
      const testJobId = uuid.v4();
      const testTwinPatch = {
        etag: '*',
        tags: {
          key: 'value2'
        },
        properties: { desired: {}, reported: {} }
      };

      debug('scheduling a twin update job with a sql query with the id: ' + testJobId);
      debug('Query: ' + 'deviceId = \'' + testDeviceId + '\'');
      jobClient.scheduleTwinUpdate(testJobId, 'deviceId = \'' + testDeviceId + '\'', testTwinPatch, new Date(Date.now()), 120, continueWith(() => {
        waitForJobStatus(jobClient, testJobId, 'completed', continueWith(() => {
          const registry = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
          registry.getTwin(testDeviceId, continueWith((twin) => {
            assert.equal(twin.tags.key, testTwinPatch.tags.key);
            testCallback();
          }));
        }));
      }));
    });

    it('schedules a twin update job and cancels it', (testCallback) => {
      const jobClient = JobClient.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
      const testJobId = uuid.v4();
      const fakePatch = {
        etag: '*',
        tags: {},
        properties: {
          desired: {},
          reported: {}
        }
      };
      jobClient.scheduleTwinUpdate(testJobId, 'deviceId = \'' + testDeviceId + '\'', fakePatch, new Date(Date.now() + 3600000), 120, continueWith((job) => {
        assert.strictEqual(job.jobId, testJobId);
        assert.strictEqual(job.status, 'queued');
        debug('cancelling job ' + testJobId);
        jobClient.cancelJob(testJobId, continueWith(() => {
          waitForJobStatus(jobClient, testJobId, 'cancelled', continueWith(() => {
            testCallback();
          }));
        }));
      }));
    });
  });

  describe('scheduleDeviceMethod', () => {
    const testDeviceMethod = {
      methodName: 'testMethod',
      payload: null,
      timeoutInSeconds: 30
    };

    it('schedules a device method job with a sql query and succeeds', (testCallback) => {
      const jobClient = JobClient.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
      const testJobId = uuid.v4();
      let methodResponseWasSent = false;
      const deviceClient = DeviceClient.fromConnectionString(testDeviceConnectionString, DeviceMqtt);
      deviceClient.open(continueWith(() => {
        deviceClient.onDeviceMethod(testDeviceMethod.methodName, (request, response) => {
          response.send(200, continueWith(() => {
            methodResponseWasSent = true;
          }));
        });

        debug('scheduling a device method job with a sql query with the id: ' + testJobId);
        debug('Query: ' + 'deviceId = \'' + testDeviceId + '\'');
        jobClient.scheduleDeviceMethod(testJobId, 'deviceId = \'' + testDeviceId + '\'', testDeviceMethod, new Date(Date.now()), 120, continueWith(() => {
          waitForJobStatus(jobClient, testJobId, 'completed', continueWith(() => {
            const registry = Registry.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
            registry.getTwin(testDeviceId, continueWith(() => {
              assert.isTrue(methodResponseWasSent);
              testCallback();
            }));
          }));
        }));
      }));
    });

    it('schedules a device method job and cancels it', (testCallback) => {
      const jobClient = JobClient.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
      const testJobId = uuid.v4();
      jobClient.scheduleDeviceMethod(testJobId, 'deviceId = \'' + testDeviceId + '\'', testDeviceMethod, new Date(Date.now() + 3600000), 120, continueWith((job) => {
        assert.strictEqual(job.jobId, testJobId);
        assert.strictEqual(job.status, 'queued');
        debug('cancelling job ' + testJobId);
        jobClient.cancelJob(testJobId, continueWith(() => {
          waitForJobStatus(jobClient, testJobId, 'cancelled', continueWith(testCallback));
        }));
      }));
    });
  });
});
