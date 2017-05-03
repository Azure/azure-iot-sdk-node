// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var assert = require('chai').assert;
var Device = require('../lib/device.js').Device;

describe('Device', function() {
  describe('constructor', function() {
    var fakeDevice = { deviceId: 'fake' };

    /*Tests_SRS_NODE_SERVICE_DEVICE_16_002: [If the `deviceDescription` argument is provided as a string, it shall be parsed as JSON and the properties of the new `Device` object shall be populated with the values provided in the `deviceDescription` JSON string.]*/
    it('accepts a JSON string', function() {
      var testDevice = new Device(JSON.stringify(fakeDevice));
      assert.strictEqual(testDevice.deviceId, fakeDevice.deviceId);
    });

    /*Tests_SRS_NODE_SERVICE_DEVICE_16_003: [If the `deviceDescription` argument if provided as an object, the properties of the new `Device` object shall be populated with the values provided in the `deviceDescription` JSON string.]*/
    it('accepts an object', function() {
      var testDevice = new Device(fakeDevice);
      assert.strictEqual(testDevice.deviceId, fakeDevice.deviceId);
    });

    /*Tests_SRS_NODE_SERVICE_DEVICE_16_001: [The constructor shall accept a `null` or `undefined` value as argument and create an empty `Device` object.]*/
    [null, undefined].forEach(function(falsyValue) {
      it('does not throw if given \'' + falsyValue + '\'', function() {
        assert.doesNotThrow(function() {
          return new Device(falsyValue);
        });
      });
    });

    /*Tests_SRS_NODE_SERVICE_DEVICE_16_004: [The constructor shall throw a `ReferenceError` if the `deviceDescription` argument doesn't contain a `deviceId` property.]*/
    it('throws if given an argument and it does not have a deviceId', function() {
      var badArg = {
        key: 'value'
      };

      assert.throws(function() {
        return new Device(badArg);
      }, ReferenceError);
    });
  });

  describe('SymmetricKey', function() {
    /*Tests_SRS_NODE_SERVICE_DEVICE_16_005: [The `authentication.SymmetricKey` property shall return the content of the `authentication.symmetricKey` property (the latter being the valid property returned by the IoT hub in the device description).]*/
    it('returns the content of the symmetricKey property', function() {
      var deviceDescription = {
        deviceId: 'test',
        authentication: {
          symmetricKey: {
            primaryKey: 'primaryKey',
            secondaryKey: 'secondaryKey'
          }
        }
      };

      var testDevice = new Device(deviceDescription);
      assert.deepEqual(testDevice.symmetricKey, deviceDescription.symmetricKey);
      assert.deepEqual(testDevice.SymmetricKey, deviceDescription.symmetricKey);
    });
  });
});