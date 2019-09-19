require('dotenv').config()
const { Mqtt } = require('azure-iot-device-mqtt');
const { Client : DeviceClient, Message } = require('azure-iot-device');

const { Client : HubClient } = require('azure-iothub')

/*
    Note that this is a conceptual example in that it doesn't really make since to send a
    message from the iot hub then listen to it in the same script

*/


const generateImportantMessage = (data=Math.random()) => new Message(
    JSON.stringify({ 
        type : 'beep boop bopity bop',
        data
    })
)


const listenOnDevice = async() => {
    try {
        
        //create a client using the device connection string and the mqtt protocol
        const client = DeviceClient.fromConnectionString(process.env.DEVICE_CONN_STRING, Mqtt)

        client.on('message', (message) => console.log('recieved a message!', message.data.toString() ))



    } catch (err) {
        console.error('Error: ', err)
    }
}


const sendMessageFromIotHub = async() => {
    try {
        const client = HubClient.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING)

        await client.send(process.env.DEVICE_ID, generateImportantMessage(Math.random()))
        console.log('Message sent from iot hub!');
        
    } catch (err) {
        console.error('Error sending message from iot hub: ', err)
    }
}


const run = async() => {
    try { 
        listenOnDevice()
        setInterval(sendMessageFromIotHub, 3000)
    } catch (err) {
        console.error('Error:', err)
    }
}

run()
