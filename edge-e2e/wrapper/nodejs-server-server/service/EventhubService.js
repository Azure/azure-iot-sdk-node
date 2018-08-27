'use strict';
/*jshint esversion: 6 */


/**
 * Connect to eventhub
 * Connect to the Azure eventhub service.
 *
 * connectionString String Service connection string
 * returns connectResponse
 **/
exports.eventhubConnectPUT = function(connectionString) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = {
  "connectionId" : "connectionId"
};
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
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
  return new Promise(function(resolve, reject) {
    var examples = {};
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
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
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Enable telemetry
 *
 * connectionId String Id for the connection
 * no response value expected for this operation
 **/
exports.eventhubConnectionIdEnableTelemetryPUT = function(connectionId) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}

// WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING
//
// When updating this file, make sure the code below ends up in the new file.  This is how we
// avoid changing the codegen code.  The real implementations are in the *Glue.js files, and we leave the
// codegen stubs in here.  We replace all the codegen implementations with our new implementations
// and then make sure we've replaced them all before exporting.
//
// WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING
module.exports = require('../glue/glueUtils').replaceExports(module.exports, '../glue/eventHubGlue.js')