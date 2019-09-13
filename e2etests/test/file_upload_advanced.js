// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var fs = require('fs');
var assert = require('chai').assert;
var uuid = require('uuid');
var HttpTransport = require('azure-iot-device-http').Http;
var DeviceIdentityHelper = require('./device_identity_helper.js');
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


var serviceSdk = require('azure-iothub');
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

async function uploadToBlob(fileStream, client, callback) {
  let blobInfo = await client.getBlobSharedAccessSignature(blobName);
  if (!blobInfo) {
    throw new errors.ArgumentError('Invalid upload parameters');
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
  
    // parallel uploading
  try {
    let uploadStatus = await uploadStreamToBlockBlob(
      Aborter.timeout(30 * 60 * 1000), // Abort uploading with timeout in 30mins
      fileStream,
      blockBlobURL,
      4 * 1024 * 1024, // 4MB block size
    20, // 20 concurrency
    {
      progress: ev => console.log(ev)
    }
    );
    console.log('uploadStreamToBlockBlob success');
    let isSuccess = true;
    let statusCode = uploadStatus._response.status;
    let statusDescription = uploadStatus._response.bodyAsText;
    // notify IoT Hub of upload to blob status (success)
    await client.notifyBlobUploadStatus(isSuccess, statusCode, statusDescription);
    console.log('notifyBlobUploadStatus success')
    return callback();
  }
  catch (err) {
    // notify IoT Hub of upload to blob status (failure)
    console.log(err);
    await client.notifyBlobUploadStatus(err, null);
    return callback(err);
  }
}


describe('File upload - HTTP transport', function () {
  this.timeout(120000);
  var serviceClient, deviceClient;
  var provisionedDevice;
  var testFilesConfig = [{
    fileName: 'smallFile',
    fileSizeInKb: '10',
  },{
    fileName: 'bigFile',
    fileSizeInKb: '5120',
  }];

  before(function(beforeCallback) {
    testFilesConfig.forEach(function(fileConfig) {
      var fileContent = Buffer.alloc(fileConfig.fileSizeInKb * 1024);
      fileContent.fill(uuid.v4());
      fs.writeFileSync(fileConfig.fileName, fileContent);
    });

    DeviceIdentityHelper.createDeviceWithSas(function (err, testDeviceInfo) {
      provisionedDevice = testDeviceInfo;
      beforeCallback(err);
    });
  });

  after(function(afterCallback) {
    testFilesConfig.forEach(function(fileConfig) {
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

  testFilesConfig.forEach(function(fileConfig) {
    it('successfully uploads a file of ' + fileConfig.fileSizeInKb + 'Kb and the notification is received by the service', function(done) {
      var testBlobName = 'mye2edir/e2eblob';
      fs.stat(fileConfig.fileName, function (err, fileStats) {
        if(err) {
          done(err);
        } else {
          var testFileSize = fileStats.size;
          var fileStream = fs.createReadStream(fileConfig.fileName);

          serviceClient.open(function(err) {
            if (err) {
              done(err);
            } else {
              serviceClient.getFileNotificationReceiver(function(err, fileNotificationReceiver) {
                if (err) {
                  done(err);
                } else {
                  fileNotificationReceiver.on('message', function(msg) {
                    var notification = JSON.parse(msg.data.toString());
                    if (notification.deviceId === provisionedDevice.deviceId && notification.blobName === provisionedDevice.deviceId + '/' + testBlobName) {
                      assert.isString(notification.blobUri);
                      assert.equal(notification.blobSizeInBytes, testFileSize);
                      fileNotificationReceiver.complete(msg, function(err) {
                        done(err);
                      });
                    }
                  });

                  deviceClient.open(function(err) {
                    if (err) {
                      done(err);
                    } else {
                      uploadToBlob(testBlobName, fileStream, fileStats.size, function(err) {
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