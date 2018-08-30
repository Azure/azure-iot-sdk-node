'use strict';
/*jshint esversion: 6 */


/**
 * verify that the clients have cleaned themselves up completely
 *
 * no response value expected for this operation
 **/
exports.wrapperCleanupPUT = function() {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * log a message to output
 *
 * msg Object
 * no response value expected for this operation
 **/
exports.wrapperMessagePUT = function(msg) {
  return new Promise(function(resolve, reject) {
    resolve();
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

// WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING
//
// When updating this file, make sure the code below ends up in the new file.  This is how we
// avoid changing the codegen code.  The real implementations are in the *Glue.js files, and we leave the
// codegen stubs in here.  We replace all the codegen implementations with our new implementations
// and then make sure we've replaced them all before exporting.
//
// WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING
module.exports = require('../glue/glueUtils').replaceExports(module.exports, '../glue/wrapperGlue.js')

