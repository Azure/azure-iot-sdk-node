// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// upload_to_blob.js 
// Using the simple built in uploadToBlob() API, this sample uploads a generated dummyFile.txt 
// to the specified 
// This example requires that your azure iot hub has a storage container attached to it

require('dotenv').config();
const { Mqtt: Protocol } = require('azure-iot-device-mqtt');
const { Client } = require('azure-iot-device');
const { promisify } = require('util')
const { writeFile, createReadStream, stat, unlinkSync } = require('fs');
const path = require('path');
const writeFileAsync = promisify(writeFile);
const statAsync = promisify(stat);


const run = async() => {
    try {
        //create the connection using the mqtt protocol and device connection string
        const client = Client.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Protocol);
        
        //create a dummy file to upload
        const dummyFilePath = path.resolve(__dirname, 'dummyFile.txt');
        await writeFileAsync(dummyFilePath, 'Microsoft loves you!');

        //we also need to know the exact size for the upload
        const { size : fileSize } = await statAsync(dummyFilePath);

        //uploadToBlob also takes a filestream
        const fileStream = createReadStream(dummyFilePath);
        await client.uploadToBlob('testblob.txt', fileStream, fileSize);
        console.log('File has been uploaded from simulated device to your iot hub\'s storage container!');
        
        //destroy the read stream
        fileStream.destroy();
        //remove the dummy file we just created
        unlinkSync(dummyFilePath);
        console.log('Removed created dummy file!');
        
        process.exit(0);
    } catch (err) {
        console.error('Error: ', err);
    }
}


run()
