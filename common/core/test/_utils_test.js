// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var sinon = require('sinon');
var assert = require('chai').assert;
var os = require('os');
var getos = require('getos');
var getAgentPlatformString = require('../lib/utils').getAgentPlatformString;

describe('getAgentPlatformString', function() {
  before(function() {
  });

  after(function() {
    if (os.platform.restore) {
      os.platform.restore();
    }
  });

  /*Tests_SRS_NODE_COMMON_UTILS_18_001: [`getAgentPlatformString` shall use `process.version` to get the node.js version.]*/
  /*Tests_SRS_NODE_COMMON_UTILS_18_002: [`getAgentPlatformString` shall use `os.platform` to distinguish between linux and non-linux operating systems.]*/
  /*Tests_SRS_NODE_COMMON_UTILS_18_003: [if `os.platform` returns "linux", `getAgentPlatformString` shall call `getOs` to the OS version.]*/
  /*Tests_SRS_NODE_COMMON_UTILS_18_004: [if the `getOs` call fails, the os version shall be 'unknown'.]*/
  /*Tests_SRS_NODE_COMMON_UTILS_18_005: [if the `getOs` call succeeds, the os version shall be built by concatenating the `dist` and `release` members of the returned object with a space in between.]*/
  /*Tests_SRS_NODE_COMMON_UTILS_18_007: [`getAgentPlatformString` shall call `os.arch` to get the CPU architecture.]*/
  /*Tests_SRS_NODE_COMMON_UTILS_18_008: [`getAgentPlatformString` shall call its `callback` with the string '<nodejs version>;<os version>;<CPU architecture>'.]*/
  it('returns the correct value with Linux flow', function(callback) {
    os.platform = sinon.stub().returns('linux');
    getos(function(err, getOsActual) {
      var osName;
      if (err) {
        osName = 'unknown';
      } else {
        osName = getOsActual.dist + ' ' + getOsActual.release;
      }
      getAgentPlatformString(function(platformActual) {
        assert.equal(platformActual, 'node ' + process.version + '; ' + osName + '; ' + process.arch);
        callback();
      });

    });
  });

  /*Tests_SRS_NODE_COMMON_UTILS_18_001: [`getAgentPlatformString` shall use `process.version` to get the node.js version.]*/
  /*Tests_SRS_NODE_COMMON_UTILS_18_006: [if `os.platform` returns anything except 'linux', the os version shall be built by concatenating `os.type` and os.release`` with a space in between.]*/
  /*Tests_SRS_NODE_COMMON_UTILS_18_002: [`getAgentPlatformString` shall use `os.platform` to distinguish between linux and non-linux operating systems.]*/
  /*Tests_SRS_NODE_COMMON_UTILS_18_007: [`getAgentPlatformString` shall call `os.arch` to get the CPU architecture.]*/
  /*Tests_SRS_NODE_COMMON_UTILS_18_008: [`getAgentPlatformString` shall call its `callback` with the string '<nodejs version>;<os version>;<CPU architecture>'.]*/
  it('returns the correct value with non-linux flow', function(callback) {
    os.platform = sinon.stub().returns('windows');
    getAgentPlatformString(function(platformActual) {
      assert.equal(platformActual, 'node ' + process.version + '; ' + os.type() + ' ' + os.release()  + '; ' + process.arch);
      callback();
    });
  });
});

