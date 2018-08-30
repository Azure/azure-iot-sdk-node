// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
/*jshint esversion: 6 */

var respondWithCode = require('../utils/writer').respondWithCode;
var debug = require('debug')('azure-iot-e2e:node')
var Mqtt = require('azure-iot-device-mqtt').Mqtt;
var MqttWs = require('azure-iot-device-mqtt').MqttWs;
var Amqp = require('azure-iot-device-amqp').Amqp;
var AmqpWs = require('azure-iot-device-amqp').AmqpWs;
var Http = require('azure-iot-device-http').Http;

/**
 * return failure to the caller, passing the appropriate information back.
 *
 * @param {function} reject reject function from Promise
 * @param {Error} err error to return
 * @param {string} functionName name of function with failure
 */
var returnFailure = function(reject, err, functionName) {
  var errorText = '';
  if (functionName) {
    errorText = 'failure from ' + functionName + ': ';
  }
  if (err.responseBody) {
    errorText += err.responseBody;
  } else {
    errorText += err.message;
  }
  debug(`returning 500: ${errorText}`)
  reject(respondWithCode(500,errorText));
}

/**
 * rethrow an error, wrapping it with a 500 return  code
 *
 * @param {Error} err Error to rethrow
 * @param {string} functionName name of function with failure
 * @param {string} functionName name of function with failure
 */
var rethrowException = function(err, functionName) {
  var errorText = '';
  if (functionName) {
    errorText = 'failure from ' + functionName + ': ';
  }
  errorText += err.message;
  debug(`rethrowing to return 500: ${errorText}`)
  throw(respondWithCode(500,errorText))
}

/**
 * print details of function call to debug log
 *
 * @param {string} functionName name of function that was just called.
 * @param {Error} err result of the function call.
 */
var debugFunctionResult = function(functionName, err) {
  debug(`${functionName} returned ${err ? err.message : 'success'}`);
}

/**
 * Make a promise that can be used inside of an API handler
 *
 * @param {string} functionName   Name of the function, used to return error strings
 * @param {function} func         Function that is being wrapped/called
 *
 * @returns Promise that wraps the passed function
 */
var makePromise = function(functionName, func) {
  return new Promise(function(resolve, reject) {
    try {
      func(function(err, result) {
        debugFunctionResult(functionName, err);
        if (err) {
          returnFailure(reject, err, functionName);
        } else {
          if (result) {
            if (typeof(result) === 'object') {
              try {
                debug(`result of ${functionName}: ${JSON.stringify(result)}`);
              } catch (e) {
                debug(`can\'t print result object: ${e.message}`);
              }
            } else {
              debug(`result: ${result}`);
            }
          }
          resolve(result);
        }
      });
    } catch (e) {
      rethrowException(e, functionName);
    }
  });
}

/**
 * Given a transport name, return the constructor for that transport.
 *
 * @param {string} transport: one of mqtt, mqttws, amqp, amqpws, or http
 *
 * @returns Transport constructor
 */
var transportFromType = function(transport) {
  switch (transport.toLowerCase()) {
    case 'mqtt':
      return Mqtt;
    case 'mqttws':
      return MqttWs;
    case 'amqp':
      return Amqp;
    case 'amqpws':
      return AmqpWs;
    case 'http':
      return Http;
    default:
      return null;
  }
}

/**
 * Set a cert on a client.  If the cert is not provided, the callback is called immediately.
 *
 * @param {*} client Client object to set the certificate on
 * @param {*} cert Certificate to set
 * @param {*} done callback to call after the cert is set
 */
var setOptionalCert = function(client, cert, done) {
  if (!cert || !cert.cert) {
    done();
  } else {
    client.setOptions({
      ca: cert.cert
    }, done);
  }
}

/**
 * Replace exports from one file with functions exported from another file.  We use this function
 * to make it easier to re-generate the stub code.  With this, we can replace the auto-generated
 * functions in the service directory with their equivalent functions in the glue folder.
 *
 * Here's how it works:
 *
 * service/ModuleService.js (etc) has a bunch of handler functions that are auto-generated for us.
 * The intention of this file is that app developers would replace the implementations inside this
 * file with "real" code to handle the various rest api calls.
 *
 * However, if app developers manually insert their code into one of these services files, then
 * they're in for a world of pain the next time they need to run the codegen tools because they
 * have to merge the newly generated code with their manual insertions.  This is an painful and
 * error-prone operation.
 *
 * To get around this pain, we use this function that replaces, at runtime, all of the functions
 * exported from service/moduleService.js (etc) with functions from ModuleGlue.js.  This way, the
 * only "merging" that app developers need to do is to make sure that this function gets called
 * at the end of ModuleService.js.  If any functions are added or removed from ModuleService.js,
 * this code will be able to notice this and flag an error.
 *
 */
var replaceExports = function(oldExports, filename) {
  var fail = false;
  var exports = {};
  // Load the glue module
  var thisMod = require('./' + filename);
  // For each export from the glue module, copy it into our exports.  Make sure we're replacing a previous one instead of adding a new one.
  Object.keys(thisMod).forEach(function(exportName) {
    if (!oldExports[exportName]) {
      if (!exportName.startsWith('_')) {
        console.log(`warning: export ${exportName} found in ${filename} but not in ${__dirname}.  This may be in multiple glue files or it may have been renamed in a newer swagger file`);
        fail = true;
      }
    } else {
      delete oldExports[exportName];
      exports[exportName] = thisMod[exportName];
    }
  });

  // Now go through our old exports and make sure we've replaced everything.
  Object.keys(oldExports).forEach(function(exportName) {
    console.log(`warning: export ${exportName} was not replaced.  Using codegen stub`);
    fail = true;
  });

  if (fail) {
    throw new Error(`failed replacing codegen stubs with implementations.  Open a node prompt and import your XxxxService.js file to see details.`)
  }

  return exports;
}


module.exports = {
  returnFailure: returnFailure,
  rethrowException: rethrowException,
  debugFunctionResult: debugFunctionResult,
  makePromise: makePromise,
  transportFromType: transportFromType,
  setOptionalCert: setOptionalCert,
  replaceExports: replaceExports
}