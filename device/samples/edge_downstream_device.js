// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// edge_downstream_device.js
// This sample is vastly similar to simple_sample_device.js, however demonstrates connecting an edge downstream device.

'use strict';

require('dotenv').config();
const fs = require('fs');
const { Mqtt: Protocol } = require('azure-iot-device-mqtt');
const { Client, Message } = require('azure-iot-device');

// Helper Function
const generateMessage = () => {
    // Generates a simulated temperature and humidity sensor
    //  and uses a random number generator to determine

    console.log('Creating Simulated Information Message.');
    const msg = new Message( JSON.stringify(
        {
            deviceId : 'simulatedDownstreamDevice',
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
    console.log('Received a C2D message: (' + msg.messageId + ') ' + message.data.toString());
    console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);

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
        // 1) Obtain the connection string for your downstream device and to it
        //    append this string GatewayHostName=<edge device hostname>;
        // 2) The Azure IoT Edge device hostname is the hostname set in the config.yaml of the Azure IoT Edge device
        //    to which this sample will connect to.
        //
        // The resulting string should look like the following
        //  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>;GatewayHostName=<edge device hostname>"
        console.log('Initializing Device Client.');
        const client = Client.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Protocol);
        var edge_ca_cert_path = process.env.PATH_TO_EDGE_CA_CERT;

        console.log('Connecting Device Client.');
        await client.open();

        console.log('Providing Edge CA Cert via client.setOptions()');
        let options = { ca : fs.readFileSync(edge_ca_cert_path, 'utf-8') };
        await client.setOptions(options);

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
