// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let assert = require('chai').assert;
let sinon = require('sinon');
let getUserAgentString = require('../dist/utils').getUserAgentString;
let core = require('azure-iot-common');
let packageJson = require('../package.json');

describe('getUserAgentString', function () {
  let fakePlatformString = 'fakePlatformString';
  let fakeProductInfoString = 'fakeProductInfoString';
  before(function () {
    sinon.stub(core, 'getAgentPlatformString').callsArgWith(0, fakePlatformString);
  });

  after(function () {
    core.getAgentPlatformString.restore();
  });

  /*Tests_SRS_NODE_DEVICE_UTILS_18_001: [`getUserAgentString` shall call `getAgentPlatformString` to get the platform string.]*/
  /*Tests_SRS_NODE_DEVICE_UTILS_18_002: [`getUserAgentString` shall call its `callback` with a string in the form 'azure-iot-device/<packageJson.version>(<platformString>)<productInfo>'.]*/
  it ('returns the right string', function (callback) {
    getUserAgentString(function (actualAgentString) {
      assert.equal(actualAgentString, 'azure-iot-device/' + packageJson.version + ' (' + fakePlatformString + ')');
      callback();
    });
  });

  /*Tests_SRS_NODE_DEVICE_UTILS_41_001: [`getUserAgentString` shall not add any custom product Info if a `falsy` value is passed in as the first arg.]*/
  it('does not populate productInfo for falsy values', function () {
    ['', null, undefined].forEach(function (falsyValue) {
      getUserAgentString(falsyValue, function (actualAgentString) {
        assert.strictEqual(actualAgentString, 'azure-iot-device/' + packageJson.version + ' (' + fakePlatformString + ')');
      });
    });
  });

  /*Tests_SRS_NODE_DEVICE_UTILS_41_002: [`getUserAgentString` shall accept productInfo as a `string` so that the callback is called with a string in the form 'azure-iot-device/<packageJson.version>(<platformString>)<productInfo>'.]*/
  it('returns the right string with productInfo', function (callback) {
    getUserAgentString(fakeProductInfoString, function (actualAgentString) {
      assert.strictEqual(actualAgentString, 'azure-iot-device/' + packageJson.version + ' (' + fakePlatformString + ')' + fakeProductInfoString);
      callback();
    });
  });

  /*Tests_SRS_NODE_DEVICE_UTILS_41_003: [`getUserAgentString` shall throw if the first arg is not `falsy`, or of type `string` or `function`.]*/
  it('throws on wrong type for productInfo', function () {
    [41, [5, 1], { test: 'test' }].forEach(function (badValue) {
      assert.throws(function () {
        getUserAgentString(badValue, function (actualAgentString) {
          console.log(actualAgentString);
        });
      });
    });
  });


});



