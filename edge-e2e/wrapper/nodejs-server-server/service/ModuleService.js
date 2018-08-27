'use strict';
/*jshint esversion: 6 */


/**
 * Connect to the azure IoT Hub as a module using the environment variables
 *
 * transportType String Transport to use
 * returns connectResponse
 **/
exports.moduleConnectFromEnvironmentTransportTypePUT = function(transportType) {
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
 * Connect to the azure IoT Hub as a module
 *
 * transportType String Transport to use
 * connectionString String connection string
 * caCertificate Certificate  (optional)
 * returns connectResponse
 **/
exports.moduleConnectTransportTypePUT = function(transportType,connectionString,caCertificate) {
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
 * call the given method on the given device
 *
 * connectionId String Id for the connection
 * deviceId String
 * methodInvokeParameters Object
 * returns Object
 **/
exports.moduleConnectionIdDeviceMethodDeviceIdPUT = function(connectionId,deviceId,methodInvokeParameters) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = "{}";
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Disconnect the module
 * Disconnects from Azure IoTHub service.  More specifically, closes all connections and cleans up all resources for the active connection
 *
 * connectionId String Id for the connection
 * no response value expected for this operation
 **/
exports.moduleConnectionIdDisconnectPUT = function(connectionId) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Enable input messages
 *
 * connectionId String Id for the connection
 * no response value expected for this operation
 **/
exports.moduleConnectionIdEnableInputMessagesPUT = function(connectionId) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Enable methods
 *
 * connectionId String Id for the connection
 * no response value expected for this operation
 **/
exports.moduleConnectionIdEnableMethodsPUT = function(connectionId) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Enable module twins
 *
 * connectionId String Id for the connection
 * no response value expected for this operation
 **/
exports.moduleConnectionIdEnableTwinPUT = function(connectionId) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Send an event
 *
 * connectionId String Id for the connection
 * eventBody String
 * no response value expected for this operation
 **/
exports.moduleConnectionIdEventPUT = function(connectionId,eventBody) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Wait for a message on a module input
 *
 * connectionId String Id for the connection
 * inputName String
 * returns String
 **/
exports.moduleConnectionIdInputMessageInputNameGET = function(connectionId,inputName) {
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
 * call the given method on the given module
 *
 * connectionId String Id for the connection
 * deviceId String
 * moduleId String
 * methodInvokeParameters Object
 * returns Object
 **/
exports.moduleConnectionIdModuleMethodDeviceIdModuleIdPUT = function(connectionId,deviceId,moduleId,methodInvokeParameters) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = "{}";
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Send an event to a module output
 *
 * connectionId String Id for the connection
 * outputName String
 * eventBody String
 * no response value expected for this operation
 **/
exports.moduleConnectionIdOutputEventOutputNamePUT = function(connectionId,outputName,eventBody) {
  return new Promise(function(resolve, reject) {
    resolve();
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
exports.moduleConnectionIdRoundtripMethodCallMethodNamePUT = function(connectionId,methodName,requestAndResponse) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Wait for the next desired property patch
 *
 * connectionId String Id for the connection
 * returns Object
 **/
exports.moduleConnectionIdTwinDesiredPropPatchGET = function(connectionId) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = "{}";
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Get the device twin
 *
 * connectionId String Id for the connection
 * returns Object
 **/
exports.moduleConnectionIdTwinGET = function(connectionId) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = "{}";
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Updates the device twin
 *
 * connectionId String Id for the connection
 * props Object
 * no response value expected for this operation
 **/
exports.moduleConnectionIdTwinPATCH = function(connectionId,props) {
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
module.exports = require('../glue/glueUtils').replaceExports(module.exports, '../glue/moduleGlue.js')