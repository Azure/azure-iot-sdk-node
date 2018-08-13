// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
/*jshint esversion: 6 */

var async = require('async');
var debug = require('debug')('azure-iot-e2e:node')
var glueUtils = require('./glueUtils');
var moduleGlue = require('./moduleGlue');
var eventHubGlue = require('./eventHubGlue');
var registryGlue = require('./registryGlue');
var serviceGlue = require('./serviceGlue');
var deviceGlue = require('./deviceGlue');

/**
 * Cleanup an individual glue module
 */
var cleanupGlueModule = function(mod, callback) {
  var remainingObjects = mod._objectCache.getMap();

  async.forEachSeries(Object.keys(remainingObjects), function(objectId, callback) {
    if (objectId.indexOf('response_') === 0) {
      // not a failure
      debug(`removing dangling object ${objectId}`);
      mod._objectCache.removeObject(objectId);
      callback();
    } else {
      debug('Cleaning up ' + objectId);
      var obj = mod._objectCache.removeObject(objectId);
      var closeFunc = obj.close || obj.closeClient;
      if (closeFunc) {
        try {
          closeFunc.bind(obj)(function(err) {
            if (err) {
              debug('ignoring close error: ' + err.message);
            }
            callback();
          })
        } catch (e) {
          debug('ignoring close exception: ' + e.message);
          callback();
        }
      } else {
        callback();
      }
    }
  }, callback);
};

/**
 * verify that the clients have cleaned themselves up completely
 *
 * no response value expected for this operation
 **/
exports.wrapperCleanupPUT = function() {
  debug('wrapperCleanupPUT called')
  return glueUtils.makePromise('wrapperCleanupPUT', function(callback) {
    var objectsToClean = [
      moduleGlue,
      eventHubGlue,
      serviceGlue,
      registryGlue,
      deviceGlue
    ];
    async.forEachSeries(objectsToClean, cleanupGlueModule, callback);
  });
}


/**
 * Terminate a wrapper, optionally returning the log
 *
 * no response value expected for this operation
 **/
exports.wrapperSessionGET = function() {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Launch a wrapper, getting ready to test
 *
 * no response value expected for this operation
 **/
exports.wrapperSessionPUT = function() {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}

/**
 * log a message to output
 *
 * message Object
 * no response value expected for this operation
 **/
exports.wrapperMessagePUT = function(message) {
  return new Promise(function(resolve, reject) {
    if (message.message) {
      debug(message.message);
    } else {
      debug(message);
    }
    resolve();
  });
}
