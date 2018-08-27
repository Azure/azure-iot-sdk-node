// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
/*jshint esversion: 6 */

var debug = require('debug')('azure-iot-e2e:node')
var glueUtils = require('./glueUtils');
var NamedObjectCache = require('./NamedObjectCache');

var Registry = require('azure-iothub').Registry;


/**
 * cache of objects.  Used to return object by name to the caller.
 */
var objectCache = new NamedObjectCache();

/**
 * Connect to registry
 * Connect to the Azure IoTHub registry.  More specifically, the SDK saves the connection string that is passed in for future use.
 *
 * connectionString String Service connection string
 * returns connectResponse
 **/
exports.registryConnectPUT = function(connectionString) {
  debug(`registryConnectPUT called`);
  return glueUtils.makePromise('registryConnectPUT', function(callback) {
    var registry = Registry.fromConnectionString(connectionString);
    var connectionId = objectCache.addObject('registry', registry);
    callback(null, {connectionId: connectionId});
  });
}


/**
 * Disconnect from the registry
 * Disconnects from the Azure IoTHub registry.  More specifically, closes all connections and cleans up all resources for the active connection
 *
 * connectionId String Id for the connection
 * no response value expected for this operation
 **/
exports.registryConnectionIdDisconnectPUT = function(connectionId) {
  debug(`registryConnectionIdDisconnectPUT called with ${connectionId}`);
  return glueUtils.makePromise('registryConnectionIdDisconnectPUT', function(callback) {
    var registry = objectCache.removeObject(connectionId);
    if (!registry) {
      debug(`${connectionId} already closed.`);
      callback();
    } else {
      debug(`Removed registry for ${connectionId}.`);
      callback();
    }
  });
}


/**
 * gets the module twin for the given deviceid and moduleid
 *
 * connectionId String Id for the connection
 * deviceId String
 * moduleId String
 * returns Object
 **/
exports.registryConnectionIdModuleTwinDeviceIdModuleIdGET = function(connectionId,deviceId,moduleId) {
  debug(`registryConnectionIdModuleTwinDeviceIdModuleIdGET called with ${connectionId}, ${deviceId}, ${moduleId}`);
  return glueUtils.makePromise('registryConnectionIdModuleTwinDeviceIdModuleIdGET', function(callback) {
    var registry = objectCache.getObject(connectionId);
    debug(`calling Registry.getModuleTwin`);
    registry.getModuleTwin(deviceId, moduleId, function(err, result) {
      glueUtils.debugFunctionResult('registry.getModuleTwin', err);
      callback(err, result);
    });
  });
}


/**
 * update the module twin for the given deviceId and moduleId
 *
 * connectionId String Id for the connection
 * deviceId String
 * moduleId String
 * props Object
 * no response value expected for this operation
 **/
exports.registryConnectionIdModuleTwinDeviceIdModuleIdPATCH = function(connectionId,deviceId,moduleId,props) {
  debug(`registryConnectionIdModuleTwinDeviceIdModuleIdPATCH called with ${connectionId}, ${deviceId}, ${moduleId}`);
  debug(props);
  return glueUtils.makePromise('registryConnectionIdModuleTwinDeviceIdModuleIdPATCH', function(callback) {
    var registry = objectCache.getObject(connectionId);
    debug(`calling Registry.updateModuleTwin`);
    registry.updateModuleTwin(deviceId, moduleId, props, '*', function(err, result) {
      glueUtils.debugFunctionResult('registry.updateModuleTwin', err);
      callback(err, result);
    });
  });
}

exports._objectCache = objectCache;

