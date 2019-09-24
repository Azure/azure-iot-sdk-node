// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// NOTE: This sample enables C2D (Cloud to Device) Messages on the Device Client. 
// To receive C2D Messages, a Service Client must send the messages. 
// This can be done using the cloud_to_device_mesage.js file, which uses the Azure IoT Service Client

'use strict';

require('dotenv').config();

const { Mqtt: Protocol } = require('azure-iot-device-mqtt');
// Uncomment one of these transports and then change it in fromConnectionString to test other transports
// const { AmqpWs: Protocol } = require('azure-iot-device-amqp');
// const { Http: Protocol } = require('azure-iot-device-http');
// const { Amqp: Protocol } = require('azure-iot-device-amqp');
// const { MqttWs: Protocol } = require('azure-iot-device-mqtt');
const { Client, Message } = require('azure-iot-device');

// Helper Function
const generateAsteroidMessage = () => {
    // Generates an Asteroid Message and uses a random number generator to determine
    // if the there is an Impact Emergency Based on the time till impact and asteroid size.
    console.log('Creating Asteroid Information Message.');
    const msg = new Message( JSON.stringify(
        { 
            size : Math.random()*100, 
            timeTillImpact : Math.random()*100 
        }
    ));
    msg.properties.add('IMPACT_EMERGENCY', asteroid.timeTillImpact < 50 && asteroid.size > 50 ? 'true' : 'false');
    return msg;
}

//Note that this is using the device client's sendEvent rather than the module clients sendOutputEvent as seen in another sample
// The setInterval() method calls our function at the specified interval provided in messageDelay.
const startMessageInterval = (client, messageDelay) => setInterval( async() => {
    msg = generateAsteroidMessage();

    console.log('Sending Asteroid Message to IoT Hub from Device Client.');
    const status = await client.sendEvent(msg).catch( err => console.error('Error sending message: ', err));
    console.log('Sent Message');
}, messageDelay);


const onMessage = client => async(message) => {
    console.log('Received a C2D message', message.data.toString());

    // The AMQP and HTTP transports also have the notion of completing, rejecting or abandoning the message.
    // When completing a message, the service that sent the C2D message is notified that the message has been processed.
    // When rejecting a message, the service that sent the C2D message is notified that the message won't be processed by the device. the method to use is client.reject(msg, callback).
    // When abandoning the message, IoT Hub will immediately try to resend it. The method to use is client.abandon(msg, callback).
    // MQTT is simpler: it accepts the message by default, and doesn't support rejecting or abandoning a message.

    // Thus when using MQTT the following line is a no-op.
    await client.complete(message);
}

const run = async() => {
    try {
        console.log('Initializing Device Client.');
        const client = Client.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Protocol);

        console.log('Client created. Starting send loop.');
        const sendMessageInterval = startMessageInterval(client, 5000);

        console.log('Enabling Client cloud to device message handler.');
        client.on('message', onMessage(client));

        console.log('Enabling Client cloud to device error handler.');
        client.on('error', console.error);

        console.log('Enabling Client cloud to device disconnect handler.');
        client.on('disconnect', () => {
            console.log('Halting automated message sends from Device Client.');
            clearInterval(sendMessageInterval);
            console.log('Removing all C2D listeners.');
            client.removeAllListeners();
        });
    } 
    catch (err) {
        console.error('Error: ', err);
    }
}


run();
