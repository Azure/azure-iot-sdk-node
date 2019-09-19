require('dotenv').config()
const { Mqtt } = require('azure-iot-device-mqtt');
const { clientFromConnectionString : HttpClientFromConnectionString } = require('azure-iot-device-http');
const { ModuleClient, Message } = require('azure-iot-device');
const { EventHubClient, EventPosition } = require('@azure/event-hubs');
const { promisify } = require('util')
const delay = promisify(setTimeout)


/* 
This is a conceptual example in that it likely does not make sense for a module client to be sending messages then retrieve them in the same script

This sample uses a module client to have the device send dummy messages, 
it then uses an event hub client, created from out IoT Hub connection string to pull the recent messages down

It also demonstrates 
*/


//this returns a dummy messsage ready to be sent, the messageId is just to show order
const generateImportantMessage = messageId => new Message(
    JSON.stringify({ 
        messageId : messageId,
        data : 'beep boop bopity bop',
    })
)

//Pulls messages down from event hub using the client, starting event position and the partition id
const recieveFromEventHubAndPrint = (eventHubClient, eventPosition) => partitionId => eventHubClient.receive(
    partitionId,
    m => console.log(`PartitionId : ${partitionId}`, m.body),
    console.error,
    { eventPosition : eventPosition }
)
const run = async() => {
    try {
        const moduleClient = ModuleClient.fromConnectionString(process.env.DEVICE_CONN_STRING, Mqtt);
        const eventHubClient = await EventHubClient.createFromIotHubConnectionString(process.env.IOTHUB_CONNECTION_STRING); //this uses the iot hub connection string to create the client rather than the actual event hub end point
        const httpClient = HttpClientFromConnectionString(process.env.DEVICE_CONN_STRING)
        console.log('Initialized clients!')

        const partitionIds = await eventHubClient.getPartitionIds() //read more about partitions https://docs.microsoft.com/en-us/azure/event-hubs/event-hubs-features#partitions
        const startingPosition = EventPosition.fromEnqueuedTime(Date.now() - 1000) //subtracting a second to account for delay
        
        const eventLabel = 'beepBoop' //label our events
        const sendDummyMessage = m => moduleClient.sendOutputEvent(eventLabel, m) //send helper

        //generate some messages
        const messageCount = 10
        const importantMessages = [...Array(messageCount).keys()].map(generateImportantMessage)

        //iterative send approach
        await Promise.all(importantMessages.map(sendDummyMessage))
        console.log('Sent messages iteratively')

        // we can also send as a batch of events using certain protocols such as http 
        //first lets generate some newer messages
        const extremelyImportantMessages = [...Array(messageCount).keys()].map( i => generateImportantMessage(i+10) ) 
        await httpClient.sendEventBatch(extremelyImportantMessages)


        //pull all these messages down
        partitionIds.map(recieveFromEventHubAndPrint(eventHubClient, startingPosition))

    } catch ( err ) { 
        console.error('Error : ', err)
    }
}

run()
