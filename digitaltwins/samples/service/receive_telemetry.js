// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// Connection string for the IoT Hub service
// Using the Azure CLI:
// az iot hub show-connection-string --hub-name {YourIoTHubName} --policy-name service  --output table
const connectionString = process.env.IOTHUB_CONNECTION_STRING;

// Using the Node.js SDK for Azure Event hubs:
//   https://github.com/Azure/azure-event-hubs-node
// The sample connects to an IoT hub's Event Hubs-compatible endpoint
// to read messages sent from a device.
const { EventHubClient, EventPosition } = require('@azure/event-hubs');

const printError = function (err) {
  console.log(err.message);
};

// Display the message content - telemetry and properties.
const printMessage = function (message) {
  console.log('Telemetry received: ');
  console.log(JSON.stringify(message.body, null, 2));
  console.log('Application properties (set by device): ');
  console.log(JSON.stringify(message.applicationProperties, null, 2));
  console.log('System properties (set by IoT Hub): ');
  console.log(JSON.stringify(message.annotations, null, 2));
  console.log('');
};

// Connect to the partitions on the IoT Hub's Event Hubs-compatible endpoint.
// This example only reads messages sent after this application started.
let ehClient;
EventHubClient.createFromIotHubConnectionString(connectionString).then(function (client) {
  console.log('Successfully created the EventHub Client from iothub connection string.');
  ehClient = client;
  return ehClient.getPartitionIds();
}).then(function (ids) {
  console.log('The partition ids are: ', ids);
  return ids.map(function (id) {
    return ehClient.receive(id, printMessage, printError, { eventPosition: EventPosition.fromEnqueuedTime(Date.now()) });
  });
}).catch(printError);
