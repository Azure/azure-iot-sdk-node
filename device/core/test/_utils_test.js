// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var getUserAgentString = require('../lib/utils').getUserAgentString;
var core = require('azure-iot-common');
var packageJson = require('../package.json');

describe('getUserAgentString', function() {
  var fakePlatformString = 'fakePlatformString';

  before(function() {
    sinon.stub(core, 'getAgentPlatformString').callsArgWith(0, fakePlatformString);
  });

  after(function() {
    core.getAgentPlatformString.restore();
  });

  /*Codes_SRS_NODE_DEVICE_UTILS_18_001: [`getUserAgentString` shall call `getAgentPlatformString` to get the platform string.]*/
  /*Codes_SRS_NODE_DEVICE_UTILS_18_002: [`getUserAgentString` shall call its `callback` with a string in the form 'azure-iot-device/<packageJson.version>(<platformString>)'.]*/
  it ('returns the right string', function(callback) {
    getUserAgentString(function(actual) {
      assert.equal(actual, 'azure-iot-device/' + packageJson.version + ' (' + fakePlatformString + ')');
      callback();
    });
  });
});




