// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
/*jshint esversion: 6 */

var Client = require('azure-iot-device').Client;
var debug = require('debug')('azure-iot-e2e:node')
var glueUtils = require('./glueUtils');
var NamedObjectCache = require('./NamedObjectCache');

/**
 * cache of objects.  Used to return object by name to the caller.
 */
var objectCache = new NamedObjectCache();

/**
 * Connect to the azure IoT Hub as a device
 *
 * transportType String Transport to use
 * connectionString String connection string
 * caCertificate Object  (optional)
 * returns connectResponse
 **/
exports.deviceConnectTransportTypePUT = function(transportType,connectionString,caCertificate) {
  debug(`deviceConnectTransportTypePUT called with transport ${transportType}`);
  return glueUtils.makePromise('deviceConnectTransportTypePUT', function(callback) {
    var client = Client.fromConnectionString(connectionString, glueUtils.transportFromType(transportType));
    glueUtils.setOptionalCert(client, caCertificate, function(err) {
      glueUtils.debugFunctionResult('glueUtils.setOptionalCert', err);
      if (err) {
        callback(err);
      } else {
        debug('calling Client.open');
        client.open(function(err) {
          glueUtils.debugFunctionResult('client.open', err);
          if (err) {
            callback(err);
          } else {
            var connectionId = objectCache.addObject('DeviceClient', client);
            callback(null, {connectionId: connectionId});
          }
        });
      }
    });
  });
}


/**
 * Disconnect the device
 * Disconnects from Azure IoTHub service.  More specifically, closes all connections and cleans up all resources for the active connection
 *
 * connectionId String Id for the connection
 * no response value expected for this operation
 **/
exports.deviceConnectionIdDisconnectPUT = function(connectionId) {
  debug(`deviceConnectionIdDisconnectPUT called with ${connectionId}`);
  return glueUtils.makePromise('deviceConnectionIdDisconnectPUT', function(callback) {
    var client = objectCache.removeObject(connectionId);
    if (!client) {
      debug(`${connectionId} already closed.`);
      callback();
    } else {
      debug('calling Client.close');
      client.close(function(err) {
        glueUtils.debugFunctionResult('client.close', err);
        callback(err);
      });
    }
  });
}


/**
 * Enable methods
 *
 * connectionId String Id for the connection
 * no response value expected for this operation
 **/
exports.deviceConnectionIdEnableMethodsPUT = function(connectionId) {
  debug(`deviceConnectionIdEnableMethodsPUT called with ${connectionId}`);
  return glueUtils.makePromise('deviceConnectionIdEnableMethodsPUT', function(callback) {
    var client = objectCache.getObject(connectionId)
    client._enableMethods(function(err) {
      glueUtils.debugFunctionResult('client._enableMethods', err);
      callback(err);
    });
  });
}

/**
 * Wait for a method call, verify the request, and return the response.
 * This is a workaround to deal with SDKs that only have method call operations that are sync.  This function responds to the method with the payload of this function, and then returns the method parameters.  Real-world implemenatations would never do this, but this is the only same way to write our test code right now (because the method handlers for C, Java, and probably Python all return the method response instead of supporting an async method call)
 *
 * connectionId String Id for the connection
 * methodName String name of the method to handle
 * requestAndResponse RoundtripMethodCallBody
 * no response value expected for this operation
 **/
exports.deviceConnectionIdRoundtripMethodCallMethodNamePUT = function(connectionId,methodName,requestAndResponse) {
  debug(`deviceConnectionIdRoundtripMethodCallMethodNamePUT called with ${connectionId}, ${methodName}`);
  debug(JSON.stringify(requestAndResponse, null, 2));
  return glueUtils.makePromise('deviceConnectionIdRoundtripMethodCallMethodNamePUT', function(callback) {
    var client = objectCache.getObject(connectionId);
    client.onDeviceMethod(methodName, function(request, response) {
      debug(`function ${methodName} invoked from service`);
      debug(JSON.stringify(request, null, 2));
      if (JSON.stringify(request.payload) !== JSON.stringify(requestAndResponse.requestPayload.payload)) {
        debug('payload expected:' + JSON.stringify(requestAndResponse.requestPayload.payload));
        debug('payload received:' + JSON.stringify(request.payload));
        callback(new Error('request payload did not arrive as expected'))
      } else {
        debug('payload received as expected');
        response.send(requestAndResponse.statusCode, requestAndResponse.responsePayload, function(err) {
          debug('response sent');
          if (err) {
            callback(err);
          } else {
            callback(null, requestAndResponse.responsePayload);
          }
        });
      }
    });
  });
}

exports._objectCache = objectCache;
