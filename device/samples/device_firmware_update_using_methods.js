// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

const { Client } = require('azure-iot-device');
const { Mqtt: Protocol } = require('azure-iot-device-mqtt');
const url = require('url');
const { promisify } = require('util');
const setTimeoutAsync = promisify(setTimeout);

console.log('Initializing Device Client.');
const client = Client.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Protocol);

const reportFWUpdateThroughTwin = async (firmwareUpdateValue) => {
    let patch = {
        iothubDM : {
            firmwareUpdate : firmwareUpdateValue
        }
    };
    console.log(JSON.stringify(patch, null, 2));
    let twin = await client.getTwin();
    const asyncUpdateReportedTwinProperties = promisify(twin.properties.reported.update);
    await asyncUpdateReportedTwinProperties(patch);
};


const applyImage = async (imageData) => {
    try {
        console.log('Sending Firmware Update through Twin');
        let fwUpdateStatus = { 
            status: 'applying',
            startedApplyingImage: new Date().toISOString()
        };
        await reportFWUpdateThroughTwin(fwUpdateStatus);
    
        console.log("Applying firmware image");
        // Replace this line with the code to apply the image.
        console.log(imageData);
        setTimeoutAsync(4000);
    
        console.log('Sending Firmware Update Through Twin');
        fwUpdateStatus = { 
            status: 'apply firmware image complete',
            lastFirmwareUpdate: new Date().toISOString()
        };
        reportFWUpdateThroughTwin(fwUpdateStatus);
    }
    catch (err) {
        console.error('Error: ', err);
        try {
        console.log('Sending Firmware Update Through Twin');
        reportFWUpdateThroughTwin( { status : 'Apply image failed' } );
        } catch (err) {
            console.error('Error: ', err);
        }
    }
};

    
const downloadImage = async (fwPackageUri) => {
    let fwUpdateStatus;
    try {
        
        console.log('Sending Twin Update: Downloading');
        fwUpdateStatus = {
            status: 'downloading',
            startedDownloadingTime: new Date().toISOString()
        };
        await reportFWUpdateThroughTwin(fwUpdateStatus);
        
        console.log('Downloading image from URI: ' + fwPackageUri);
        let imageResult = '[Fake firmware image data]';
        // Replace this line with the code to download the image.  Delay used to simulate the download.
        setTimeoutAsync(4000);

        console.log('Sending Twin Update: Download complete');
        fwUpdateStatus = {
            status : 'download complete',
            downloadCompleteTime : new Date().toISOString()
        };
        await reportFWUpdateThroughTwin(fwUpdateStatus);
        return imageResult;
    }
    catch (err) {
        console.error('Error Downloading Image: ', err);
        console.log('Sending Twin Update: Download Image Failed.');
        fwUpdateStatus = { status : 'Download image failed' };
        await reportFWUpdateThroughTwin(fwUpdateStatus);
        throw err;
    }
};


const initiateFirmwareUpdateFlow = async (fwPackageUri) => {
    console.log('Calling downloadImage()');
    const image = await downloadImage(fwPackageUri);

    console.log('Calling applyImage()');
    await applyImage(image);
};


const firmwareUpdateCallback = async (request, response) => {
    try {
        console.log('Parsing request payload.');
        const fwPackageUri = request.payload.fwPackageUri;
        const fwPackageUriObj = url.parse(fwPackageUri);

        console.log('Ensuring that the url is a secure url.');
        if (fwPackageUriObj.protocol !== 'https:') {
            await response.send(400, 'Invalid URL format.  Must use https:// protocol.');
            console.log('Response to method \'' + request.methodName + '\' sent successfully.');
        } 
        else {
            await response.send(200, 'Firmware update started.');
            console.log('Response to method \'' + request.methodName + '\' sent successfully.');
            await initiateFirmwareUpdateFlow(fwPackageUri);
            console.log('Completed firmwareUpdate flow');
        }
    } catch (err) {
        console.error('Error: ', err);
    }
};


const run = async () => {
    try {
        console.log('Opening Client Connection.');
        await client.open();
        console.log('Client connected to IoT Hub.');
    
        console.log('Initializing Device Method Callbacks');
        client.onDeviceMethod('firmwareUpdate', firmwareUpdateCallback);
    }
    catch (err) {
        console.error('Error: ', err);
    }
};



run();