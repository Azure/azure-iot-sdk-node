// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

require('dotenv').config();
const Protocol = require('azure-iot-device-mqtt').Mqtt;
const { Client, Message } = require('azure-iot-device');
const { readFileSync } = require('fs')

//Note that this is using the device clients sendEvent rather than the module clients sendOutputEvent as seen in another sample
const startMessageInterval = (client, messageDelay=1000) => setInterval( async() => {
    const asteroid = { size : Math.random()*100, timeTillImpact : Math.random()*100 } //leaving units to users imagination
    const msg = new Message( JSON.stringify(asteroid) )

    msg.properties.add('IMPACT_EMERGENCY', asteroid.timeTillImpact < 50 && asteroid.size > 50 ? 'true' : 'false')
    const status = await client.sendEvent(msg).catch( err => console.error('Error sending message: ', err) )
    console.log('Sent Message')
}, messageDelay)



//if wanting to use a SharedAccessSignature, ie -- "SharedAccessSignature sr=<iothub_host_name>/devices/<device_id>&sig=<signature>&se=<expiry>"
//see this example : https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-security#example
const connectWith_sharedAccessSignature = () => Client.fromSharedAccessSignature(process.env.DEVICE_SAS, Protocol)

//general docs https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-security#supported-x509-certificates
//sample https://github.com/Azure/azurhttps://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-security#supported-x509-certificates-iot-sdk-node/blob/master/device/samples/simple_sample_device_x509.js
const connectWith_x509 = async() => {

    //notice that this uses an x509 connection string of form "HostName=<iothub_host_name>;DeviceId=<device_id>;x509=true"
    const x509Client = Client.fromConnectionString(process.env.DEVICE_X509_CONN_STRING, Protocol)

    x509Client.setOptions({
        cert : readFileSync(process.env.CERT_PATH, 'utf-8'),
        key : readFileSync(process.env.KEY_PATH, 'utf-8'),
        passphrase : undefined //if there is a passphrase...
    })
    await x509Client.open()
    return x509Client;
}


const run = async() => {
    try {
        //create a client using the device connection string and the mqtt protocol
        const client = Client.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Protocol)

        /* you can also create clients with the alternative methods! */
        // const client = connectWith_sharedAccessSignature();
        // const client = await connectWith_x509();

        console.log('Client created. Starting send loop')

        const sendMessageInterval = startMessageInterval(client)

    } catch (err) {
        console.error('Error: ', err)
    }
}


run()
