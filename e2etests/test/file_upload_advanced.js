// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
let fs = require('fs');
let assert = require('chai').assert;
let uuid = require('uuid');
let HttpTransport = require('azure-iot-device-http').Http;
let DeviceIdentityHelper = require('./device_identity_helper.js');
const {
  AnonymousCredential,
  uploadStreamToBlockBlob,
  Aborter,
  BlobURL,
  BlockBlobURL,
  ContainerURL,
  ServiceURL,
  StorageURL,
} = require("@azure/storage-blob"); // Make sure @azure/storage-blob is installed via npm


let serviceSdk = require('azure-iothub');
let createDeviceClient = require('./testUtils.js').createDeviceClient;
let closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

async function uploadToBlob(blobName, fileStream, client, callback) {
  let blobInfo = await client.getBlobSharedAccessSignature(blobName);
  if (!blobInfo) {
    callback(Error('Failed to retrieve Blob SAS'));
  }
  const pipeline = StorageURL.newPipeline(new AnonymousCredential(), {
    retryOptions: { maxTries: 4 },
    telemetry: { value: 'HighLevelSample V1.0.0' }, // Customized telemetry string
    keepAliveOptions: {
      enable: false
    }
  });

  const serviceURL = new ServiceURL(
    `https://${blobInfo.hostName}/${blobInfo.sasToken}`,
    pipeline
  );

  // initialize the blockBlobURL to a new blob
  const containerURL = ContainerURL.fromServiceURL(serviceURL, blobInfo.containerName);
  const blobURL = BlobURL.fromContainerURL(containerURL, blobInfo.blobName);
  const blockBlobURL = BlockBlobURL.fromBlobURL(blobURL);
  let isSuccess;
  let statusCode;
  let statusDescription;
  let errorCode;
    // parallel uploading
  try {
    let uploadStatus = await uploadStreamToBlockBlob(
      Aborter.timeout(30 * 60 * 1000), // Abort uploading with timeout in 30mins
      fileStream,
      blockBlobURL,
      4 * 1024 * 1024, // 4MB block size
    20 // 20 concurrency
    );
    isSuccess = true;
    statusCode = uploadStatus._response.status;
    statusDescription = uploadStatus._response.bodyAsText;
    // notify IoT Hub of upload to blob status (success)
  } catch (err) {
    isSuccess = false;
    statusCode = err.response.headers.get("x-ms-error-code");
    statusDescription = '';
    errorCode = err;
  }
  await client.notifyBlobUploadStatus(isSuccess, statusCode, statusDescription);
  return callback(errorCode);
}


describe('File upload - HTTP transport', function () {
  // eslint-disable-next-line no-invalid-this
  this.timeout(600000);
  let serviceClient;
  let deviceClient;
  let provisionedDevice;
  let testFilesConfig = [{
    fileName: 'smallFile',
    fileSizeInKb: '10',
  },{
    fileName: 'bigFile',
    fileSizeInKb: '5120',
  }];

  before(function (beforeCallback) {
    testFilesConfig.forEach(function (fileConfig) {
      let fileContent = Buffer.alloc(fileConfig.fileSizeInKb * 1024);
      fileContent.fill(uuid.v4());
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.writeFileSync(fileConfig.fileName, fileContent);
    });

    DeviceIdentityHelper.createDeviceWithSas(function (err, testDeviceInfo) {
      provisionedDevice = testDeviceInfo;
      beforeCallback(err);
    });
  });

  after(function (afterCallback) {
    testFilesConfig.forEach(function (fileConfig) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
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
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.stat(fileConfig.fileName, function (err, fileStats) {
        if(err) {
          done(err);
        } else {
          let testFileSize = fileStats.size;
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          let fileStream = fs.createReadStream(fileConfig.fileName);

          // eslint-disable-next-line security/detect-non-literal-fs-filename
          serviceClient.open(function (err) {
            console.log("sc.open()");
            console.dir(err);
            if (err) {
              done(err);
            } else {
              serviceClient.getFileNotificationReceiver(function (err, fileNotificationReceiver) {
                console.log("sc.getfnr()");
                console.dir(err);
                if (err) {
                  done(err);
                } else {
                  fileNotificationReceiver.on('message', function (msg) {
                    console.log("fileNotificationReceiver.on(message)");
                    console.dir(msg);
                    let notification = JSON.parse(msg.data.toString());
                    if (notification.deviceId === provisionedDevice.deviceId && notification.blobName === provisionedDevice.deviceId + '/' + testBlobName) {
                      assert.isString(notification.blobUri);
                      assert.equal(notification.blobSizeInBytes, testFileSize);
                      fileNotificationReceiver.complete(msg, function (err) {
                        console.log("fileNotificationReceiver.complete()");
                        console.dir(err);
                        done(err);
                      });
                    }
                  });

                  // eslint-disable-next-line security/detect-non-literal-fs-filename
                  deviceClient.open(function (err) {
                    console.log("dc.open()");
                    console.dir(err);
                    if (err) {
                      done(err);
                    } else {
                      console.log("Uploading " + testBlobName + " with size " + fileStats.size);
                      let start=Date.now()
                      uploadToBlob(testBlobName, fileStream, fileStats.size, function (err) {
                        console.log("uploadToBlob()");
                        console.dir(err);
                        console.log("Elapsed: " + (Date.now()-start));
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
