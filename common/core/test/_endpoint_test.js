// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;

var endpoint = require('../lib/endpoint.js');
var deviceId = 'mydevice';
var moduleId = 'mymodule';

describe('endpoint', function () {
  [{
    name: 'devicePath',
    expected: '/devices/mydevice',
    actual: endpoint.devicePath(deviceId)
  },
  {
    name: 'deviceEventPath',
    expected: '/devices/mydevice/messages/events',
    actual: endpoint.deviceEventPath(deviceId)
  },
  {
    name: 'deviceMessagePath',
    expected: '/devices/mydevice/messages/devicebound',
    actual: endpoint.deviceMessagePath(deviceId)
  },
  {
    name: 'deviceTwinPath',
    expected: '/devices/mydevice/twin',
    actual: endpoint.deviceTwinPath(deviceId)
  },
  {
    name: 'deviceMethodPath',
    expected: '/devices/mydevice/methods/devicebound',
    actual: endpoint.deviceMethodPath(deviceId)
  },
  {
    name: 'deviceBlobUploadPath',
    expected: '/devices/mydevice/files',
    actual: endpoint.deviceBlobUploadPath(deviceId)
  },
  {
    name: 'deviceBlobUploadNotificationPath',
    expected: '/devices/mydevice/files/notifications/correlationId',
    actual: endpoint.deviceBlobUploadNotificationPath(deviceId, 'correlationId')
  },
  {
    name: 'deviceFeedbackPath',
    expected: '/devices/mydevice/messages/devicebound/55E68746-0AD9-4DCF-9906-79CDAC14FFBA',
    actual: endpoint.deviceFeedbackPath(deviceId, '55E68746-0AD9-4DCF-9906-79CDAC14FFBA')
  },
  {
    name: 'modulePath',
    expected: '/devices/mydevice/modules/mymodule',
    actual: endpoint.modulePath(deviceId, moduleId)
  },
  {
    name: 'moduleEventPath',
    expected: '/devices/mydevice/modules/mymodule/messages/events',
    actual: endpoint.moduleEventPath(deviceId, moduleId)
  },
  {
    name: 'moduleMessagePath',
    expected: '/devices/mydevice/modules/mymodule/messages/events',
    actual: endpoint.moduleMessagePath(deviceId, moduleId)
  },
  {
    name: 'moduleInputMessagePath',
    expected: '/devices/mydevice/modules/mymodule/inputs',
    actual: endpoint.moduleInputMessagePath(deviceId, moduleId)
  },
  {
    name: 'moduleTwinPath',
    expected: '/devices/mydevice/modules/mymodule/twin',
    actual: endpoint.moduleTwinPath(deviceId, moduleId)
  },
  {
    name: 'moduleMethodPath',
    expected: '/devices/mydevice/modules/mymodule/methods/devicebound',
    actual: endpoint.moduleMethodPath(deviceId, moduleId)
  },
  {
    name: 'veryVersionString',
    expected: '?api-version=' + endpoint.apiVersion,
    actual:  endpoint.versionQueryString()
  }].forEach(function(testConfig) {
    it( testConfig.name + ' matches ' + testConfig.expected, function() {
      assert.strictEqual(testConfig.actual, testConfig.expected);
    });
  });
});
