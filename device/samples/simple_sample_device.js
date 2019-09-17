require('dotenv').config()
const { Mqtt } = require('azure-iot-device-mqtt');
const { Client, Message } = require('azure-iot-device');

/* 
My least important question, but interesting...
why does the wrapping go transportObj : MessagEnqueued : transportObj??
(havent really investigated... maybe take out)
*/


const startMessageInterval = (client, messageDelay=3000) => setInterval( async() => {
    const asteroid = { size : Math.random()*100, timeTillImpact : Math.random()*100 } //leaving units to users imagination
    const msg = new Message( JSON.stringify(asteroid) )

    msg.properties.add('IMPACT_EMERGENCY', asteroid.timeTillImpact < 50 && asteroid.size > 50 ? 'true' : 'false')
    const transportObj = await client.sendEvent(msg).catch( err => console.error('Error sending message: ', err) )

    console.log(transportObj)

}, messageDelay)


const run = async() => {
    try {
        //create a client using the device connection string and the mqtt protocol
        const client = Client.fromConnectionString(process.env.DEVICE_CONN_STRING, Mqtt)
        const sendMessageInterval = startMessageInterval(client)


    } catch (err) {
        console.error('Error: ', err)
    }
}


run()