// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

const { Client } = require('azure-iot-device');
const { Mqtt: Protocol }= require('azure-iot-device-mqtt');
const { promisify } = require('util');

let client = Client.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Protocol);

const onRebootCallback = async (request, response) => {
    try {
        response.send(200, 'Reboot started');
        console.log('Response to method \'' + request.methodName + '\' send successfully.');
        const twin = await client.getTwin();
        console.log('Twin acquired');
        const patch = { iothubDM : { reboot : { startedRebootTime : new Date().toISOString()}}};
        const asyncUpdateReportedTwinProperties = promisify(twin.properties.reported.update);
        await asyncUpdateReportedTwinProperties(patch);
    }
    catch (err) {
        console.error('Error: ', err);
    }
};

const run = async () => {
    try {
        console.log('Initializing Client from Connection String');

        console.log('Opening connection to IoT Hub');
        await client.open();

        console.log('Enabling \'reboot\' device method.');
        client.onDeviceMethod('reboot', onRebootCallback);
    }
    catch (err) {
        console.error('Error: ', err);
    }
};

run();