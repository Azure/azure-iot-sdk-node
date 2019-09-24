// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

require('dotenv').config();
const Mqtt = require('azure-iot-device-mqtt').Mqtt;
const { Client : DeviceClient } = require('azure-iot-device');


// READ THIS!
// This is playing the part of the listener, to see it in action run device_methods_invoke.
const onLockCarDoor = async(request, response) => {
    try {
        const { payload, methodName } = request;
        console.log(`${methodName} was invoked with payload: `, payload);
        
        /*
            implement the actual locking door logic here
        */

        //send back a meaningful response
        await response.send(200, `Beep boop bop car door locked. Date : ${(new Date)}`);
    } catch (err) {
        console.error('onLocCarDoor handler error', err);
        await response.send(500, 'A meaningful error response');
    }
}


const run = async() => {
    try {
        const client = DeviceClient.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Mqtt);
        
        client.onDeviceMethod('lockDoor', onLockCarDoor);
        console.log('Listening for the lockDoor directMethod!');

    } catch (err) {
        console.error('Error: ', err);
    }
}

run();