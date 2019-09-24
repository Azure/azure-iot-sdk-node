// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

require('dotenv').config();
const Mqtt = require('azure-iot-device-mqtt').Mqtt;
const { ModuleClient } = require('azure-iot-device');

/*
    See how connecting with 'fromEnvironment' compares with 'fromConnectionString' 
    https://docs.microsoft.com/en-us/javascript/api/azure-iot-device/moduleclient?view=azure-node-latest#fromenvironment-any-

    Essentially it is nearly identical to the device_methods_invoke except that some env variables are implicit
*/

const run = async() => {
    try {
        const client = await ModuleClient.fromEnvironment(Mqtt)
        console.log('connected to moduleClient')

        const res = await client.invokeMethod(process.env.DEVICE_ID, 'methodTarget', {
            methodName : 'enableCarParachute',
            payload : JSON.stringify({ terminalVelocity : true }),
            responseTimeoutInSeconds: 5,
            connectTimeoutInSeconds: 5
        })
        console.log('Method invoked : ', res)
    } catch (err) {
        console.error('Error: ', err)
    }
}


run()