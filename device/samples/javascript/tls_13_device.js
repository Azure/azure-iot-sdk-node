// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// TLS 1.3 also works for MQTT over websockets, AMQP, AMQP over websockets, and HTTP
const ProtocolAmqp = require('azure-iot-device-amqp').Amqp;

const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-common').Message;

const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING;

if (!deviceConnectionString.includes(".device.azure-devices.")) {
    console.error('Device connection string must be in format: \'<hub name>.device.azure-devices.<dnsSuffix>\' for TLS 1.3 support');
    process.exit(-1);
}

// These settings are not required because, by default, this SDK will advertise support for TLS 1.2 to TLS 1.3 by default during the TLS handshake
// with the server. The server should then select TLS 1.3 over TLS 1.2. They are here for reference for anyone who wants more strict control over
// the TLS versions used by this SDK for any reason. Additional TLS level settings are described here: https://nodejs.org/api/tls.html
process.env['NODE_OPTIONS'] = '--tls-min-v1.2 --tls-max-v1.3';

const client = Client.fromConnectionString(deviceConnectionString, ProtocolAmqp);

function onConnect(err) {
    if(err) {
        console.error('Could not connect: ' + err.message);
        process.exit(0);
    } else {
        console.log('Connected the device. Sending some telemetry.');
        client.sendEvent(new Message('hello tls 1.3 world'), function (err) {
            if (err) {
                console.log(err.toString());
            } else {
                console.log('Message sent. Closing connection');
            }

            console.log('Closing connection');
            client.close();
            process.exit(0);
        });
    }
}

console.log("Opening client");
client.open(onConnect);
