// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

require('dotenv').config();
const { Mqtt } = require('azure-iot-device-mqtt');
const { clientFromConnectionString : httpClientFromConnectionString } = require('azure-iot-device-http');
const { ModuleClient, Message } = require('azure-iot-device');
const { EventHubClient, EventPosition } = require('@azure/event-hubs');

// This is a conceptual example in that it likely does not make sense for a module client to be sending messages then retrieve them in the same script
// 
// Here's how the sample works:
// A Module Client is set up to receive messages from the HTTP Device Client
// Then, an Event Hub Client, created from our IoT Hub connection string to pull the recent messages down

// Helper Function
// This returns a dummy messsage ready to be sent, the messageId is just to show order
const generateImportantMessage = messageId => new Message(
    JSON.stringify({ 
        messageId : messageId,
        data : 'beep boop bopity bop',
    })
);

// Helper Function
// Pulls messages down from event hub using the client, starting event position and the partition id
const recieveFromEventHubAndPrint = (eventHubClient, eventPosition) => partitionId => eventHubClient.receive(
    partitionId,
    m => console.log(`PartitionId : ${partitionId}`, m.body),
    console.error,
    { eventPosition : eventPosition }
);

const run = async() => {
    try {
        console.log('Initializing Module Client.');
        const moduleClient = ModuleClient.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Mqtt);
        // We use the iot hub connection string to create the client rather than the actual event hub end point
        console.log('Initializing Event Hub Client.');
        const eventHubClient = await EventHubClient.createFromIotHubConnectionString(process.env.IOTHUB_CONNECTION_STRING); 
        console.log('Initializing HTTP Device Client.');
        const httpClient = httpClientFromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
        console.log('Initialized clients!');

        console.log('Getting information from Event Hub.');
        const partitionIds = await eventHubClient.getPartitionIds(); //read more about partitions https://docs.microsoft.com/en-us/azure/event-hubs/event-hubs-features#partitions
        const startingPosition = EventPosition.fromEnqueuedTime(Date.now() - 1000); //subtracting a second to account for delay
        
        const eventLabel = 'beepBoop'; //label our events
        const sendDummyMessage = m => moduleClient.sendOutputEvent(eventLabel, m); //send helper

        console.log('Creating messages to send to via Module Client');
        //generate some messages
        const messageCount = 10;
        const importantMessages = [...Array(messageCount).keys()].map(generateImportantMessage);

        console.log('Sending messages via Module Client.');
        //iterative send approach
        await Promise.all(importantMessages.map(sendDummyMessage));
        console.log('Sent messages iteratively');

        console.log('Sending messages via HTTP Device Client.');
        // we can also send as a batch of events using certain protocols such as http (not mqtt)
        // first lets generate some newer messages
        const extremelyImportantMessages = [...Array(messageCount).keys()].map( i => generateImportantMessage(i+10));
        await httpClient.sendEventBatch(extremelyImportantMessages);

        console.log('Receiving and printing messages via Event Hub API.');
        //pull all these messages down
        partitionIds.map(recieveFromEventHubAndPrint(eventHubClient, startingPosition));

    } catch ( err ) { 
        console.error('Error : ', err);
    }
};

run();
