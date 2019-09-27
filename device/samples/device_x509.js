// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// device_x509.js
// This is a basic sample simulating a device that sends information to IoT Hub about a Simulated Device it is monitoring. 
// It is vastly similar to simple_sample_device.js, but instead of a connection string for connecting to your
// IoT Hub Device, an X.509 Certificate is used. 
// 
// One main benefit of using an X.509 certificate is you do not have to share or store secrets for your device in IoT Hub.
// More information on authenticating with X.509 in IoT Hub can be found here:
// docs https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-security#supported-x509-certificates
// sample https://github.com/Azure/azurhttps://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-security#supported-x509-certificates-iot-sdk-node/blob/master/device/samples/simple_sample_device_x509.js

// NOTE: This sample enables C2D (Cloud to Device) Messages on the Device Client. 
// To receive C2D Messages, a Service Client must send the messages.
// This can be done using the cloud_to_device_mesage.js file, which uses the Azure IoT Service Client,
// or it can be done using the Azure IoT Explorer. 

'use strict';

require('dotenv').config();
const { Mqtt: Protocol } = require('azure-iot-device-mqtt');
// Uncomment one of these transports and then change it in fromConnectionString to test other transports
// const { AmqpWs: Protocol } = require('azure-iot-device-amqp');
// const { Http: Protocol } = require('azure-iot-device-http');
// const { Amqp: Protocol } = require('azure-iot-device-amqp');
// const { MqttWs: Protocol } = require('azure-iot-device-mqtt');
const { Client, Message } = require('azure-iot-device');
const { fs } = require('util');


// Helper Function
const generateMessage = () => {
    // Generates a simulated temperature and humidity sensor
    //  and uses a random number generator to determine

    console.log('Creating Simulated Information Message.');
    const msg = new Message( JSON.stringify(
        {
            deviceId : 'simulatedDevice',
            windSpeed : 10 + (Math.random() * 4), // range: [10, 14]
            temperature : 20 + (Math.random() * 10), // range: [20, 30]
            humidity : 60 + (Math.random() * 20) // range: [60, 80]
        }
    ));
    msg.properties.add('DATA_TYPE', 'JSON');
    msg.properties.add('DEVICE_LOCATION', 'REDMOND');

    return msg;
};


//Note that this is using the device client's sendEvent rather than the module clients sendOutputEvent as seen in another sample
// The setInterval() method calls our function at the specified interval provided in messageDelay.
const startMessageInterval = (client, messageDelay) => setInterval( async() => {
    let msg = generateMessage();
    console.log('Sending Message to IoT Hub from Device Client.');
    const status = await client.sendEvent(msg).catch( err => console.error('Error sending message: ', err));
    console.log('Sent Message');
    console.log(status);
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
};

const run = async() => {
    try {
        console.log('Initializing Device Client.');
        //  DEVICE_CONNECTION_STRING in the format: "HostName=<iothub_host_name>;DeviceId=<device_id>;x509=true"
        const client = Client.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Protocol);

        console.log('Connecting Device Client.');
        await client.open();

        console.log('Calling setOptions with x509 certificate and key to configure the client transport to use x509 when connecting to IoT Hub');
        var options = {
            cert : fs.readFileSync(process.env.PATH_TO_CERTIFICATE_FILE, 'utf-8').toString(),
            key : fs.readFileSync(process.env.PATH_TO_KEY_FILE, 'utf-8').toString(),
            passphrase: process.env.KEY_PASSPHRASE_OR_EMPTY // Key Passphrase is optional, and can be empty.
        };
        client.setOptions(options);

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
            console.log('Re-opening Client Connection. This is essentially a restart.');
            run();
        });
    } 
    catch (err) {
        console.error('Error: ', err);
    }
};


run();
