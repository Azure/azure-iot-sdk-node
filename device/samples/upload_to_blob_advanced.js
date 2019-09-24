// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// upload_to_blob_advanced.js
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

import { AnonymousCredential, uploadStreamToBlockBlob, Aborter, BlobURL, BlockBlobURL, ContainerURL, ServiceURL, StorageURL } from "@azure/storage-blob";
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
import { Client } from 'azure-iot-device';
import { createReadStream } from 'fs';
import { promisify } from 'util';
const statAsync = promisify(stat);

const deviceConnectionString = process.env.DEVICE_CONNECTION_STRING;

function to(promise) {
    return promise.then(data => {
       return [null, data];
    })
    .catch(err => [err]);
 }

const run = async() => {
    try {
        // Create a dummy file to upload.
        const dummyFilePath = path.resolve(__dirname, 'dummyFile.txt');
        await writeFileAsync(dummyFilePath, 'Microsoft loves you!');
        const { size : fileSize } = await statAsync(dummyFilePath);

        // Connect to IoT Hub.
        const client = Client.fromConnectionString(deviceConnectionString, Protocol);

        // Get the Shared Access Signature for the linked Azure Storage Blob from IoT Hub.
        // The IoT Hub needs to have a linked Storage Account for Upload To Blob.
        let blobInfo = await client.getBlobSharedAccessSignature(blobName);
        if (!blobInfo) {
            throw new errors.ArgumentError('Invalid upload parameters');
        }

        // Create a new Pipeline
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

        // Initialize the blockBlobURL to a new blob
        const containerURL = ContainerURL.fromServiceURL(serviceURL, blobInfo.containerName);
        const blobURL = BlobURL.fromContainerURL(containerURL, blobInfo.blobName);
        const blockBlobURL = BlockBlobURL.fromBlobURL(blobURL);

        // Parallel Uploading
        // We use a to() method to wrap the uploadStreamToBlockBlob so that
        // instead of a try catch we can have it return the err as a result of the operation,
        // similar to the older callback format.  
        [err, data] = await to(uploadStreamToBlockBlob(
            Aborter.timeout(30 * 60 * 1000), // 30mins
            createReadStream(dummyFilePath),
            blockBlobURL,
            fileSize,
            20,
            {
                progress: ev => console.log(ev)
            }
        ));

        let isSuccess, statusCode, statusDescription;
        if (err) {
            console.error('notifyBlobUploadStatus failed');
            isSuccess = false;
            statusCode = err.response.headers.get("x-ms-error-code");
            statusDescription = '';
            console.error('Upload to Blob Error: ', err);
        } else {
            console.log('uploadStreamToBlockBlob success');
            isSuccess = true;
            statusCode = uploadStatus._response.status;
            statusDescription = uploadStatus._response.bodyAsText;
            // notify IoT Hub of upload to blob status (success)
        }
        err = await to(client.notifyBlobUploadStatus(result.correlationId, isSuccess, statusCode, statusDescription));
        err ? console.error('notifyBlobUploadStatus failed') : console.log('notifyBlobUploadStatus success');

        //remove the dummy file we just created
        unlinkSync(dummyFilePath);
        console.log('Removed created dummy file.');
    }
    catch (err) {
        console.error('Error: ', err);
    }

};


run();