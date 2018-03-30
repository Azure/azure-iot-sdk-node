import {Client as DeviceClient, ConnectionString as DeviceConnectionString} from 'azure-iot-device';
import {Http as DeviceHttp} from 'azure-iot-device-http';
import {Message, results} from 'azure-iot-common';
import {ConnectionString as ServiceConnectionString, Client as ServiceClient} from 'azure-iothub';
import * as uuid from 'uuid';
import * as fs from 'fs';
import * as testUtils from './testUtils';
import { assert } from 'chai';
import * as dbg from 'debug';
const debug = dbg('ts-e2e-d2c');


describe('File upload', function () {
  this.timeout(60000);
  const testDevice = testUtils.createTestDevice();

  const hostName = ServiceConnectionString.parse(process.env.IOTHUB_CONNECTION_STRING).HostName;
  const testDeviceCS = DeviceConnectionString.createWithSharedAccessKey(hostName, testDevice.deviceId, testDevice.authentication.symmetricKey.primaryKey)

  const fileConfig = {
    fileName: 'smallFile',
    fileSizeInKb: 10,
  };

  before((beforeCallback) => {
    var fileContent = new Buffer(fileConfig.fileSizeInKb * 1024);
    fileContent.fill(uuid.v4());
    fs.writeFileSync(fileConfig.fileName, fileContent);
    testUtils.addTestDeviceToRegistry(testDevice, beforeCallback);
  });

  after((afterCallback) => {
    fs.unlinkSync(fileConfig.fileName);
    testUtils.removeTestDeviceFromRegistry(testDevice, afterCallback);
  });

  describe('Over Http', function () {
    it('can upload a file', (testCallback) => {
      const testBlobName = 'e2eblob';
      const serviceClient = ServiceClient.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
      const deviceClient = DeviceClient.fromConnectionString(testDeviceCS, DeviceHttp);
      fs.stat(fileConfig.fileName, function (err, fileStats) {
        if(err) throw err;
        const testFileSize = fileStats.size;
        const fileStream = fs.createReadStream(fileConfig.fileName);

        serviceClient.open(function(err) {
          if (err) throw err;
          serviceClient.getFileNotificationReceiver(function(err, fileNotificationReceiver) {
            if (err) throw err;
            fileNotificationReceiver.on('message', (msg) => {
              const notification = JSON.parse(msg.getData().toString());
              if (notification.deviceId === testDevice.deviceId && notification.blobName === testDevice.deviceId + '/' + testBlobName) {
                assert.isString(notification.blobUri);
                assert.equal(notification.blobSizeInBytes, testFileSize);
                fileNotificationReceiver.complete(msg, function(err) {
                  testCallback(err);
                });
              }
            });

            deviceClient.open((err) => {
              if (err) throw err;
              deviceClient.uploadToBlob(testBlobName, fileStream, fileStats.size, function(err) {
                if(err) throw err;
              });
            });
          });
        });
      });
    });
  });
});
