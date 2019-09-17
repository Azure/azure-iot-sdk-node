// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// UPLOAD TO BLOB ADVANCED SAMPLE 
// This is a new api for upload to blob that allows for greater control over the blob uplaod calls.  
// Instead of a single API call that wraps the Storage SDK, the user in this sample retrieves the linked
// Storage Account SAS Token from IoT Hub using a new API call,  removes the Azure Storage Blob package from within the Node.js Client Library
// and instead exposes two new APIs: 
//
// getBlobSharedAccessSignature 
// > Using a HTTP POST, retrieve a SAS Token for the Storage Account linked to your IoT Hub.
//
// notifyBlobUploadStatus
// > Using HTTP POST, notify IoT Hub of the status of a finished file upload (success/failure).
// 
// More information on Uploading Files with IoT Hub can be found here:
// https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-file-upload


'use strict';

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

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const fs = require('fs');

// make sure you set these environment variables prior to running the sample.
const deviceConnectionString = process.env.DEVICE_CONNECTION_STRING;
const localFilePath = process.env.PATH_TO_FILE;
const blobName = 'testblob.txt';

async function uploadToBlob(localFilePath, client) {
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
  let isSuccess;
  let statusCode;
  let statusDescription;
  try {
    let uploadStatus = await uploadStreamToBlockBlob(
      Aborter.timeout(30 * 60 * 1000), // 30mins
      fs.createReadStream(localFilePath),
      blockBlobURL,
      4 * 1024 * 1024, // 4MB block size
    20, // 20 concurrency
    {
      progress: ev => console.log(ev)
    }
    );
    console.log('uploadStreamToBlockBlob success');
    isSuccess = true;
    statusCode = uploadStatus._response.status;
    statusDescription = uploadStatus._response.bodyAsText;
    // notify IoT Hub of upload to blob status (success)
    console.log('notifyBlobUploadStatus success');
  }
  catch (err) {
    isSuccess = false;
    statusCode = err.response.headers.get("x-ms-error-code");
    statusDescription = '';
    console.log('notifyBlobUploadStatus failed');
    console.log(err);
  }
  await client.notifyBlobUploadStatus(result.correlationId, isSuccess, statusCode, statusDescription);
}

uploadToBlob(localFilePath, Client.fromConnectionString(deviceConnectionString, Protocol))
.catch((err) => {
  console.log(err);
});
