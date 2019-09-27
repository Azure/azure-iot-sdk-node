// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

require('dotenv').config();
const Mqtt = require('azure-iot-device-mqtt').Mqtt;
const { Client : HubClient } = require('azure-iothub');

//this invokes method 'lockDoor' on the connected device
const methodParams = {
    methodName : 'lockDoor',
    payload : JSON.stringify({ passengerDoor : true }),
    responseTimeoutInSeconds : 10
};

const run = async() => {
    try {
        // Note: IOTHUB_CONNECTION_STRING is NOT the same as DEVICE_CONNECTION_STRING 
        console.log('Connecting IoT Hub Service Client.');
        const client = HubClient.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING, Mqtt);

        console.log('Invoking direct method "lockDoor" on deviceId : ${process.env.DEVICE_ID}');
        const { result } = await client.invokeDeviceMethod(process.env.DEVICE_ID, methodParams);

        console.log('Resulting response from device : ', result);

    } catch (err) {
        console.error('Error: ', err.message);
    }
};

run();