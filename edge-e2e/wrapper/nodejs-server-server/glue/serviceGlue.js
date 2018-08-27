// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
/*jshint esversion: 6 */

var debug = require('debug')('azure-iot-e2e:node')
var glueUtils = require('./glueUtils');
var NamedObjectCache = require('./NamedObjectCache');
var ServiceClient = require('azure-iothub').Client;

/**
 * cache of objects.  Used to return object by name to the caller.
 */
var objectCache = new NamedObjectCache();


/**
 * Connect to service
 * Connect to the Azure IoTHub service.  More specifically, the SDK saves the connection string that is passed in for future use.
 *
 * connectionString String Service connection string
 * returns connectResponse
 **/
exports.serviceConnectPUT = function(connectionString) {
  debug(`serviceConnectPUT called`);
  return glueUtils.makePromise('serviceConnectPUT', function(callback) {
    var serviceClient = ServiceClient.fromConnectionString(connectionString);
    var connectionId = objectCache.addObject('serviceClient', serviceClient);
    callback(null, {connectionId: connectionId});
  });
}


/**
 * Disconnect from the service
 * Disconnects from the Azure IoTHub service.  More specifically, closes all connections and cleans up all resources for the active connection
 *
 * connectionId String Id for the connection
 * no response value expected for this operation
 **/
exports.serviceConnectionIdDisconnectPUT = function(connectionId) {
  debug(`serviceConnectionIdDisconnectPUT called with ${connectionId}`);
  return glueUtils.makePromise('serviceConnectionIdDisconnectPUT', function(callback) {
    var serviceClient = objectCache.removeObject(connectionId);
    if (!serviceClient) {
      debug(`${connectionId} already closed.`);
      callback();
    } else {
      serviceClient.close(function(err) {
        glueUtils.debugFunctionResult('serviceClient.close', err);
        if (err) {
          callback(err);
        } else {
          debug(`Removed serviceClient for ${connectionId}.`);
          callback();
        }
      });
    }
  });
}


/**
 * call the given method on the given module
 *
 * connectionId String Id for the connection
 * deviceId String
 * moduleId String
 * methodInvokeParameters Object
 * returns Object
 **/
exports.serviceConnectionIdModuleMethodDeviceIdModuleIdPUT = function(connectionId,deviceId,moduleId,methodInvokeParameters) {
  debug(`serviceConnectionIdModuleMethodDeviceIdModuleIdPUT called with ${connectionId}, ${deviceId}, ${moduleId}`);
  debug(JSON.stringify(methodInvokeParameters));
  return glueUtils.makePromise('serviceConnectionIdModuleMethodDeviceIdModuleIdPUT', function(callback) {
    var client = objectCache.getObject(connectionId);
    debug(`calling ServiceClient.invokeDeviceMethod`);
    client.invokeDeviceMethod(deviceId, moduleId, methodInvokeParameters, function(err, result) {
      glueUtils.debugFunctionResult('ServiceClient.invokeDeviceMethod', err);
      callback(err, result);
    });
  });
}

/**
 * call the given method on the given device
 *
 * connectionId String Id for the connection
 * deviceId String
 * methodInvokeParameters Object
 * returns Object
 **/
exports.serviceConnectionIdDeviceMethodDeviceIdPUT = function(connectionId,deviceId,methodInvokeParameters) {
  debug(`serviceConnectionIdDeviceMethodDeviceIdPUT called with ${connectionId}, ${deviceId}`);
  debug(JSON.stringify(methodInvokeParameters));
  return glueUtils.makePromise('serviceConnectionIdDeviceMethodDeviceIdPUT', function(callback) {
    var client = objectCache.getObject(connectionId);
    debug(`calling ServiceClient.invokeDeviceMethod`);
    client.invokeDeviceMethod(deviceId, methodInvokeParameters, function(err, result) {
      glueUtils.debugFunctionResult('ServiceClient.invokeDeviceMethod', err);
      callback(err, result);
    });
  });
}

exports._objectCache = objectCache;

