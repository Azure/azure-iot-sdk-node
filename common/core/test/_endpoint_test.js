// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;

var endpoint = require('../lib/endpoint.js');

describe('endpoint', function () {
  [{
    testName: 'with device only',
    deviceId: 'mydevice',
    moduleId: undefined,
    devicePath: '/devices/mydevice',
    eventPath: '/devices/mydevice/messages/events',
    messagePath: '/devices/mydevice/messages/devicebound'
  },{
    testName: 'with device and module',
    deviceId: 'mydevice',
    moduleId: 'mymodule',
    devicePath: '/devices/mydevice/modules/mymodule',
    eventPath: '/devices/mydevice/modules/mymodule/messages/events',
    messagePath: '/devices/mydevice/modules/mymodule/messages/devicebound'
  }
  ].forEach(function(testConfig) {
    describe('#devicePath ' + testConfig.testName, function () {
      it('matches ' + testConfig.devicePath, function () {
        var path = endpoint.devicePath(testConfig.deviceId, testConfig.moduleId);
        assert.strictEqual(testConfig.devicePath, path);
      });
    });

    describe('#eventPath ' + testConfig.testName, function () {
      it('matches ' + testConfig.eventPath, function () {
        var path = endpoint.eventPath(testConfig.deviceId, testConfig.moduleId);
        assert.strictEqual(testConfig.eventPath, path);
      });
    });

    describe('#messagePath ' + testConfig.testName, function () {
      it('matches  ' + testConfig.messagePath, function () {
        var path = endpoint.messagePath(testConfig.deviceId, testConfig.moduleId);
        assert.strictEqual(testConfig.messagePath, path);
      });
    });
  });

  describe('#feedbackPath', function () {
    it('matches /devices/<device-id>/messages/devicebound/<lockToken>', function () {
      var path = endpoint.feedbackPath('mydevice', '55E68746-0AD9-4DCF-9906-79CDAC14FFBA');
      assert.strictEqual('/devices/mydevice/messages/devicebound/55E68746-0AD9-4DCF-9906-79CDAC14FFBA', path);
    });
  });

  describe('versionQueryString', function() {
    it('matches ?api-version=' + endpoint.apiVersion, function () {
      var apiVer = endpoint.versionQueryString();
      assert.strictEqual('?api-version=' + endpoint.apiVersion, apiVer);
    });
  });
});
