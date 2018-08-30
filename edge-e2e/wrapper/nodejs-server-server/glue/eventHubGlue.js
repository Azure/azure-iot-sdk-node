// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
/*jshint esversion: 6 */

var debug = require('debug')('azure-iot-e2e:node')
var glueUtils = require('./glueUtils');
var NamedObjectCache = require('./NamedObjectCache');
var EventHubReceiverHelper = require('./EventHubReceiverHelper');


/**
 * cache of objects.  Used to return object by name to the caller.
 */
var objectCache = new NamedObjectCache();

/**
 * Connect to eventhub
 * Connect to the Azure eventhub service.
 *
 * connectionString String Service connection string
 * returns connectResponse
 **/
exports.eventhubConnectPUT = function(connectionString) {
  debug(`eventhubConnectPUT called`);
  return glueUtils.makePromise('eventhubConnectPUT', function(callback) {
    var client = new EventHubReceiverHelper(connectionString);
    var connectionId = objectCache.addObject('eventHubClient', client);
    callback(null, {connectionId: connectionId});
  });
}

/**
 * wait for telemetry sent from a specific device
 *
 * connectionId String Id for the connection
 * deviceId String
 * returns String
 **/
exports.eventhubConnectionIdDeviceTelemetryDeviceIdGET = function(connectionId,deviceId) {
  debug(`eventhubConnectionIdDeviceTelemetryDeviceIdGET called with ${connectionId}, ${deviceId}`);
  return glueUtils.makePromise('eventhubConnectionIdDeviceTelemetryDeviceIdGET', function(callback) {
    var client = objectCache.getObject(connectionId);
    var handler = function(data) {
      if (data.annotations['iothub-connection-device-id'] === deviceId) {
        client.removeListener('message', handler);
        callback(null, data.body.toString('ascii'));
      }
    }
    client.on('message', handler);
  });
}


/**
 * Disconnect from the eventhub
 * Disconnects from the Azure eventhub service
 *
 * connectionId String Id for the connection
 * no response value expected for this operation
 **/
exports.eventhubConnectionIdDisconnectPUT = function(connectionId) {
  debug(`eventhubConnectionIdDisconnectPUT called called with ${connectionId}`);
  return glueUtils.makePromise('eventhubConnectionIdDisconnectPUT', function(callback) {
    var client = objectCache.removeObject(connectionId);
    if (!client) {
      debug(`${connectionId} already closed.`);
      callback();
    } else {
      client.closeClient(function(err) {
        glueUtils.debugFunctionResult('eventHub.closeClient', err);
        if (err) {
          callback(err);
        } else {
          debug(`Removed EventHub client for ${connectionId}.`);
          callback();
        }
      });
    }
  });
}


/**
 * Enable telemetry
 *
 * connectionId String Id for the connection
 * no response value expected for this operation
 **/
exports.eventhubConnectionIdEnableTelemetryPUT = function(connectionId) {
  debug(`eventhubConnectionIdEnableTelemetryPUT called called with ${connectionId}`);
  return glueUtils.makePromise('eventhubConnectionIdEnableTelemetryPUT', function(callback) {
    var client = objectCache.getObject(connectionId);
    client.openClient(function(err) {
      glueUtils.debugFunctionResult('eventHub.openClient', err);
      callback(err)
    });
  });
}

exports._objectCache = objectCache;


