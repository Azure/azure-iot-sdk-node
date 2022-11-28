/* eslint-disable security/detect-non-literal-fs-filename */
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
let fs = require('fs');
let assert = require('chai').assert;
let uuid = require('uuid');
let HttpTransport = require('azure-iot-device-http').Http;
let DeviceIdentityHelper = require('./device_identity_helper.js');

let serviceSdk = require('azure-iothub');
let createDeviceClient = require('./testUtils.js').createDeviceClient;
let closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

describe('File upload - HTTP transport', function () {
  // eslint-disable-next-line no-invalid-this
  this.timeout(120000);
  let serviceClient;
  let deviceClient;
  let provisionedDevice;
  let testFilesConfig = [{
    fileName: 'smallFile',
    fileSizeInKb: '10',
  },{
    fileName: 'bigFile',
    fileSizeInKb: '5120',
  },{
    fileName: 'massiveFile',
    fileSizeInKb: '256000',
  }];

  before(function (beforeCallback) {
    testFilesConfig.forEach(function (fileConfig) {
      let fileContent = Buffer.alloc(fileConfig.fileSizeInKb * 1024);
      fileContent.fill(uuid.v4());
      fs.writeFileSync(fileConfig.fileName, fileContent);
    });

    DeviceIdentityHelper.createDeviceWithSas(function (err, testDeviceInfo) {
      provisionedDevice = testDeviceInfo;
      beforeCallback(err);
    });
  });

  after(function (afterCallback) {
    testFilesConfig.forEach(function (fileConfig) {
      fs.unlinkSync(fileConfig.fileName);
    });

    DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, afterCallback);
  });

  beforeEach(function () {
    serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString);
    deviceClient = createDeviceClient(HttpTransport, provisionedDevice);
  });

  afterEach(function (done) {
    closeDeviceServiceClients(deviceClient, serviceClient, done);
  });

  testFilesConfig.forEach(function (fileConfig) {
    it('successfully uploads a file of ' + fileConfig.fileSizeInKb + 'Kb and the notification is received by the service', function (done) {
      let testBlobName = 'mye2edir/e2eblob';
      fs.stat(fileConfig.fileName, function (err, fileStats) {
        if(err) {
          done(err);
        } else {
          let testFileSize = fileStats.size;
          let fileStream = fs.createReadStream(fileConfig.fileName);

          serviceClient.open(function (err) {
            if (err) {
              done(err);
            } else {
              serviceClient.getFileNotificationReceiver(function (err, fileNotificationReceiver) {
                if (err) {
                  done(err);
                } else {
                  fileNotificationReceiver.on('message', function (msg) {
                    let notification = JSON.parse(msg.data.toString());
                    if (notification.deviceId === provisionedDevice.deviceId && notification.blobName === provisionedDevice.deviceId + '/' + testBlobName) {
                      assert.isString(notification.blobUri);
                      assert.equal(notification.blobSizeInBytes, testFileSize);
                      fileNotificationReceiver.complete(msg, function (err) {
                        done(err);
                      });
                    }
                  });

                  deviceClient.open(function (err) {
                    if (err) {
                      done(err);
                    } else {
                      deviceClient.uploadToBlob(testBlobName, fileStream, fileStats.size, function (err) {
                        if(err) {
                          done(err);
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    });
  });
});
