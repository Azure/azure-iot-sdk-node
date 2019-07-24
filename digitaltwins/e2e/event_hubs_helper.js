// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const debug = require('debug')('e2etests:digitaltwin_eventhubs_helper');

const EventHubClient = require('@azure/event-hubs').EventHubClient;
const EventPosition = require('@azure/event-hubs').EventPosition;

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

module.exports.startEventHubsClient = function (onEventHubMessage, onEventHubError, startAfterTime, delayTime) {
  let ehClient;
  return EventHubClient.createFromIotHubConnectionString(hubConnectionString)
    .then(function (client) {
      debug('event hubs client: created');
      ehClient = client;
      debug('event hubs client: getting partition ids...');
      return ehClient.getPartitionIds();
    })
    .then(function (partitionIds) {
      debug('event hubs client: got ' + partitionIds.length + ' partition ids');
      partitionIds.forEach(function (partitionId) {
        debug('event hubs client: creating receiver for partition: ' + partitionId);
        ehClient.receive(partitionId, onEventHubMessage, onEventHubError, { eventPosition: EventPosition.fromEnqueuedTime(startAfterTime) });
      });
      if (delayTime) {
        return new Promise(function (resolve) {
          debug('event hubs client: waiting 3 seconds to get everything setup before starting the digital twin client...');
          setTimeout(function () {
            debug('event hubs client: setup finished.');
            resolve(ehClient);
          }, delayTime);
        });
      } else {
        return Promise.resolve(ehClient);
      }
    });
};

module.exports.closeClients = function (deviceClient, ehClient, done, err) {
  debug('closing device and event hubs clients');
  return Promise.all([
    deviceClient.close(),
    ehClient.close()
  ]).then(() => {
    -
    debug('device client and event hubs client closed');
    return done(err);
  }).catch((closeErr)=> {
    debug('error closing clients: ' + closeErr.toString());
    return done(err || closeErr);
  });
};
