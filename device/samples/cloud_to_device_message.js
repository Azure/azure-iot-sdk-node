// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
require('dotenv').config()
const { Message } = require('azure-iot-device');

const { Client : HubClient } = require('azure-iothub')


//In this example we instantiate an iot hub client via a connection string and send a message from the hub to the listening device

const generateImportantMessage = messageId => new Message(
    JSON.stringify({ 
        messageId : messageId,
        data : 'beep boop bopity bop',
    })
)

const sendMessageFromIotHub = async() => {
    try {
        const client = HubClient.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING)
        console.log('Connected to IoT Hub!')

        await client.send(process.env.DEVICE_ID, generateImportantMessage(0))
        console.log('C2D message sent successfully!')

    } catch (err) {
        console.error('Error sending message from iot hub: ', err)
    }
}


const run = async() => {
    try { 
        sendMessageFromIotHub();
    } catch (err) {
        console.error('Error:', err)
    }
}

run()
