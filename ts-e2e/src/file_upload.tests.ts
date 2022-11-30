/* eslint-disable security/detect-non-literal-fs-filename */
import { Client as DeviceClient, ConnectionString as DeviceConnectionString } from 'azure-iot-device';
import { Http as DeviceHttp } from 'azure-iot-device-http';
import { ConnectionString as ServiceConnectionString, Client as ServiceClient } from 'azure-iothub';
import * as uuid from 'uuid';
import * as fs from 'fs';
import * as testUtils from './testUtils';
import { assert } from 'chai';


describe('File upload', function () {
  // eslint-disable-next-line no-invalid-this
  (this as any).timeout(60000);
  const testDevice = testUtils.createTestDevice();

  const hostName = ServiceConnectionString.parse(process.env.IOTHUB_CONNECTION_STRING).HostName;
  const testDeviceCS = DeviceConnectionString.createWithSharedAccessKey(hostName, testDevice.deviceId, testDevice.authentication.symmetricKey.primaryKey);

  const fileConfig = {
    fileName: 'smallFile',
    fileSizeInKb: 10,
  };

  before(function (beforeCallback: (err?: Error) => void) {
    const fileContent = Buffer.alloc(fileConfig.fileSizeInKb * 1024);
    fileContent.fill(uuid.v4());
    fs.writeFileSync(fileConfig.fileName, fileContent);
    testUtils.addTestDeviceToRegistry(testDevice, beforeCallback);
  });

  after(function (afterCallback: (err?: Error) => void) {
    fs.unlinkSync(fileConfig.fileName);
    testUtils.removeTestDeviceFromRegistry(testDevice, afterCallback);
  });

  describe('Over Http', function () {
    it('can upload a file', function (testCallback: (err?: Error) => void) {
      const testBlobName = 'e2eblob';
      const serviceClient = ServiceClient.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
      const deviceClient = DeviceClient.fromConnectionString(testDeviceCS, DeviceHttp);
      fs.stat(fileConfig.fileName, (err, fileStats) => {
        if (err) throw err;
        const testFileSize = fileStats.size;
        const fileStream = fs.createReadStream(fileConfig.fileName);

        serviceClient.open((err) => {
          if (err) throw err;
          serviceClient.getFileNotificationReceiver((err, fileNotificationReceiver) => {
            if (err) throw err;
            fileNotificationReceiver.on('message', (msg) => {
              const notification = JSON.parse(msg.getData().toString());
              if (notification.deviceId === testDevice.deviceId && notification.blobName === testDevice.deviceId + '/' + testBlobName) {
                assert.isString(notification.blobUri);
                assert.equal(notification.blobSizeInBytes, testFileSize);
                fileNotificationReceiver.complete(msg, (err) => {
                  testCallback(err);
                });
              }
            });

            deviceClient.open((err) => {
              if (err) throw err;
              deviceClient.uploadToBlob(testBlobName, fileStream, fileStats.size, (err) => {
                if (err) throw err;
              });
            });
          });
        });
      });
    });
  });
});
