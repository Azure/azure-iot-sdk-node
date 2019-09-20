// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

require('dotenv').config();

const Protocol = require('azure-iot-device-mqtt').Mqtt;
// Uncomment one of these transports and then change it in fromConnectionString to test other transports
// const Protocol = require('azure-iot-device-amqp').AmqpWs;
// const Protocol = require('azure-iot-device-http').Http;
// const Protocol = require('azure-iot-device-amqp').Amqp;
// const Protocol = require('azure-iot-device-mqtt').MqttWs;
const { Client, Message } = require('azure-iot-device');

//Note that this is using the device client's sendEvent rather than the module clients sendOutputEvent as seen in another sample
const startMessageInterval = (client, messageDelay=5000) => setInterval( async() => {
    const asteroid = { size : Math.random()*100, timeTillImpact : Math.random()*100 }; //leaving units to users imagination
    const msg = new Message( JSON.stringify(asteroid));

    msg.properties.add('IMPACT_EMERGENCY', asteroid.timeTillImpact < 50 && asteroid.size > 50 ? 'true' : 'false');
    const status = await client.sendEvent(msg).catch( err => console.error('Error sending message: ', err) );
    console.log('Sent Message')
}, messageDelay)


const onMessage = client => async(message) => {
    console.log('Received a C2D message', message.data.toString() )

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
        //create a client using the device connection string and the mqtt protocol
        const client = Client.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Mqtt);

        console.log('Client created. Starting send loop');
        const sendMessageInterval = startMessageInterval(client)

        client.on('message', onMessage(client));
        client.on('error', console.error);
        client.on('disconnect', () => {
            clearInterval(sendMessageInterval)
            client.removeAllListeners()
        });
    } 
    catch (err) {
        console.error('Error: ', err);
    }
}


run()
