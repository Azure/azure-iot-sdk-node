// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var endpoint = require('azure-iot-common').endpoint;
var DeviceMethod = require('../dist/device_method.js').DeviceMethod;

describe('DeviceMethod', function() {
  describe('#constructor', function() {
    [undefined, null, ''].forEach(function(badParams) {
      it('throws a \'ReferenceError\' if params is \'' + badParams + '\'', function() {
        assert.throws(function() {
          return new DeviceMethod(badParams, {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_IOTHUB_DEVICE_METHOD_16_004: [The `DeviceMethod` constructor shall throw a `ReferenceError` if `params.methodName` is `null`, `undefined` or an empty string.]*/
    [undefined, null, ''].forEach(function(badMethodName) {
      it('throws a \'ReferenceError\' if params.methodName is \'' + badMethodName + '\'', function() {
        assert.throws(function() {
          return new DeviceMethod({ methodName: badMethodName }, {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_IOTHUB_DEVICE_METHOD_16_005: [The `DeviceMethod` constructor shall throw a `TypeError` if `params.methodName` is not a `string`.]*/
    [{}, function() {}, 42].forEach(function(badMethodType) {
      it('throws a \'TypeError\' if params.methodName is \'' + typeof badMethodType + '\'', function() {
        assert.throws(function() {
          return new DeviceMethod({ methodName: badMethodType }, {});
        }, TypeError);
      });
    });

    /*Tests_SRS_NODE_IOTHUB_DEVICE_METHOD_16_006: [The `DeviceMethod` constructor shall set the `DeviceMethod.params.timeoutInSeconds` property to the `timeoutInSeconds` argument value.]*/
    it('sets the DeviceMethod.responseTimeoutInSeconds property to the responseTimeoutInSeconds argument value', function() {
      var testTimeout = 42;
      var method = new DeviceMethod({ methodName: 'foo', payload: null, responseTimeoutInSeconds: testTimeout }, {});
      assert.equal(method.params.responseTimeoutInSeconds, testTimeout);
    });

    [undefined, null, 0].forEach(function (badTimeoutValue) {
      it('sets the DeviceMethod.params.responseTimeoutInSeconds property to the default timeout value if params.responseTimeoutInSeconds is \'' + badTimeoutValue + '\'', function() {
        var method = new DeviceMethod({ methodName: 'foo', payload: null, responseTimeoutInSeconds: badTimeoutValue }, {});
        assert.equal(method.params.responseTimeoutInSeconds, DeviceMethod.defaultResponseTimeout);
      });
    });

    /*Codes_SRS_NODE_IOTHUB_DEVICE_METHOD_16_013: [The `DeviceMethod` constructor shall set the `DeviceMethod.params.methodName` property to the `params.methodName` argument value.]*/
    it('sets the DeviceMethod.name property to the methodName argument value', function() {
      var methodName = 'foo';
      var method = new DeviceMethod({ methodName: methodName }, {});
      assert.equal(method.params.methodName, methodName);
    });

    /*Tests_SRS_NODE_IOTHUB_DEVICE_METHOD_16_015: [The `DeviceMethod` constructor shall set the `DeviceMethod.params.payload` property value to the `params.payload` argument value or to the default (`null`) if the `payload` argument is `null` or `undefined`.]*/
    [-1, 0, '', {}, { foo: 'bar' }, 'foo', Buffer.from([0xDE, 0xAD, 0xBE, 0xEF])].forEach(function(goodPayload) {
      it('sets the DeviceMethod.params.payload property to the params.payload argument value: \'' + goodPayload.toString() + '\'', function() {
        var method = new DeviceMethod({ methodName: 'foo', payload: goodPayload, responseTimeoutInSeconds: 42 }, {});
        assert.equal(method.params.payload, goodPayload);
      });
    });

    [undefined, null].forEach(function(badPayload) {
      it('sets the DeviceMethod.params.payload property to the default payload value if params.payload is \'' + badPayload + '\'', function() {
        var method = new DeviceMethod({ methodName: 'foo', payload: badPayload, responseTimeoutInSeconds: 42 }, {});
        assert.equal(method.params.payload, DeviceMethod.defaultPayload);
      });
    });
  });

  describe('#invokeOn', function() {
    /*Tests_SRS_NODE_IOTHUB_DEVICE_METHOD_16_008: [The `invokeOn` method shall throw a `ReferenceError` if `deviceId` is `null`, `undefined` or an empty string.]*/
    [undefined, null, ''].forEach(function(badDeviceId) {
      it('throws a ReferenceError if \'deviceId\' is \'' + badDeviceId + '\'', function() {
        var method = new DeviceMethod({ methodName: 'foo', payload: null, responseTimeoutInSeconds: 42 }, {});
        assert.throws(function() {
          method.invokeOn(badDeviceId, function() {});
        }, ReferenceError);
      });
    });
  });

  /*Tests_SRS_NODE_IOTHUB_DEVICE_METHOD_18_001: [The `invokeOnModule` method shall throw a `ReferenceError` if `deviceId` or `moduleId` is falsy. ]*/
  describe('#invokeOnModule', function() {
    [undefined, null, ''].forEach(function(badArg) {
      it('throws a ReferenceError if \'deviceId\' is \'' + badArg + '\'', function() {
        var method = new DeviceMethod({ methodName: 'foo', payload: null, responseTimeoutInSeconds: 42 }, {});
        assert.throws(function() {
          method.invokeOnModule(badArg, 'moduleId', function() {});
        }, ReferenceError);
      });

      it('throws a ReferenceError if \'moduleId\' is \'' + badArg + '\'', function() {
        var method = new DeviceMethod({ methodName: 'foo', payload: null, responseTimeoutInSeconds: 42 }, {});
        assert.throws(function() {
          method.invokeOnModule('deviceId', badArg, function() {});
        }, ReferenceError);
      });
    });

    it('returns a promise with result argument and a transport-specific response second argument', function(done) {
      var fakeResult = {
        status: 'success'
      };
      var fakeResponse = {
        statusCode: 200
      };
      var fakeRestClientSucceeds = {
        executeApiCall: function(method, path, headers, body, timeout, callback) {
          callback(null, fakeResult, fakeResponse);
        }
      };

      var method = new DeviceMethod({ methodName: 'foo', payload: null, responseTimeoutInSeconds: 42 }, fakeRestClientSucceeds);
      method.invokeOn("deviceId").then(res => {
        assert.deepEqual(res.device, fakeResult);
        assert.isDefined(res.response, fakeResponse);
        done();
      }).catch(err => done(err));
    });
  });

  var fakeDeviceId = 'deviceId';
  var fakeModuleId = 'moduleId';
  [
    {
      name: 'invokeDeviceMethod',
      functionUnderTest: function(method, callback) { method.invokeOn(fakeDeviceId, callback); },
      expectedPath: '/twins/' + fakeDeviceId + '/methods' + endpoint.versionQueryString()
    },
    {
      name: 'invokeDeviceMethod',
      functionUnderTest: function(method, callback) { method.invokeOnModule(fakeDeviceId, fakeModuleId, callback); },
      expectedPath: '/twins/' + fakeDeviceId + '/modules/' + fakeModuleId + '/methods' + endpoint.versionQueryString()
    },
  ].forEach(function(testConfig) {
    describe('#' + testConfig.name, function() {
      /*Tests_SRS_NODE_IOTHUB_DEVICE_METHOD_16_009: [The `invokeOn` method shall invoke the `done` callback with an standard javascript `Error` object if the method execution failed.]*/
      /*Tests_SRS_NODE_IOTHUB_DEVICE_METHOD_18_003: [The `invokeOnModule` method shall invoke the `done` callback with an standard javascript `Error` object if the method execution failed. ]*/
      it('calls the done callback with an Error object if the request fails', function(testCallback) {
        var fakeError = new Error('Fake failure');
        var fakeRestClientFails = {
          executeApiCall: function(method, path, headers, body, timeout, callback) {
            callback(fakeError);
          }
        };

        var method = new DeviceMethod({ methodName: 'foo', payload: null, responseTimeoutInSeconds: 42 }, fakeRestClientFails);
        testConfig.functionUnderTest(method, function(err) {
          assert.equal(err, fakeError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_IOTHUB_DEVICE_METHOD_16_010: [The `invokeOn` method shall invoke the `done` callback with a `null` first argument, a result second argument and a transport-specific response third argument if the method execution succeeds**/
      /*Tests_SRS_NODE_IOTHUB_DEVICE_METHOD_18_004: [The `invokeOnModule` method shall invoke the `done` callback with a `null` first argument, a result second argument and a transport-specific response third argument if the method execution succeeds. ]*/
      it('calls the done callback with a null first argument, a result second argument and a transport-specific response third argument', function(testCallback) {
        var fakeResult = {
          status: 'success'
        };
        var fakeResponse = {
          statusCode: 200
        };
        var fakeRestClientSucceeds = {
          executeApiCall: function(method, path, headers, body, timeout, callback) {
            callback(null, fakeResult, fakeResponse);
          }
        };

        var method = new DeviceMethod({ methodName: 'foo', payload: null, responseTimeoutInSeconds: 42 }, fakeRestClientSucceeds);
        testConfig.functionUnderTest(method, function(err, result, response) {
          assert.isNull(err);
          assert.equal(result, fakeResult);
          assert.equal(response, fakeResponse);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_IOTHUB_DEVICE_METHOD_16_017: [The `invokeOn` method shall uri-encode the device id.]*/
      it('URI-encodes the device id', function(testCallback) {
        var fakeMethodParams = {
          methodName: 'method',
          payload: { foo: 'bar' },
          responseTimeoutInSeconds: 42
        };

        var fakeDeviceId = 'device#';
        var uriEncodedDeviceId = encodeURIComponent(fakeDeviceId);

        var fakeRestClient = {
          executeApiCall: function(method, path, headers, body, timeout, callback) {
            assert.equal(path, '/twins/' + uriEncodedDeviceId + '/methods' + endpoint.versionQueryString());
            callback();
          }
        };

        var method = new DeviceMethod(fakeMethodParams, fakeRestClient);
        method.invokeOn(fakeDeviceId, testCallback);
      });

      /*Tests_SRS_NODE_IOTHUB_DEVICE_METHOD_16_011: [The `invokeOn` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      POST /twins/<encodeUriComponent(deviceId>)/methods?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      Request-Id: <guid>
      {
        "methodName": <DeviceMethod.params.name>,
        "responseTimeoutInSeconds": <DeviceMethod.params.responseTimeoutInSeconds>,
        "connectTimeoutInSeconds": <DeviceMethod.params.connectTimeoutInSeconds>,
        "payload": <DeviceMethod.params.payload>
      }
      ```]*/
      /*Tests_SRS_NODE_IOTHUB_DEVICE_METHOD_18_002: [The `invokeOnModule` method shall construct an HTTP request using information supplied by the caller, as follows:
      ```
      POST /twins/<encodeUriComponent(deviceId)>/modules/<encodeUriComponent(moduleId)>/methods?api-version=<version> HTTP/1.1
      Authorization: <config.sharedAccessSignature>
      Content-Type: application/json; charset=utf-8
      Request-Id: <guid>
      {
        "methodName": <DeviceMethod.params.name>,
        "responseTimeoutInSeconds": <DeviceMethod.params.responseTimeoutInSeconds>,
        "connectTimeoutInSeconds": <DeviceMethod.params.connectTimeoutInSeconds>,
        "payload": <DeviceMethod.params.payload>
      }
      ```
      ]*/
      [-1, 0, '', {}, { foo: 'bar' }, 'one line', Buffer.from([0xDE, 0xAD, 0xBE, 0xEF])].forEach(function(goodPayload) {
        it('builds a correct request when the payload is ' + goodPayload.toString(), function(testCallback) {
          var fakeMethodParams = {
            methodName: 'method',
            payload: { foo: 'bar' },
            responseTimeoutInSeconds: 42,
            connectTimeoutInSeconds: 43
          };

          var fakeRestClient = {
            executeApiCall: function(method, path, headers, body, timeout, callback) {
              assert.equal(method, 'POST');
              assert.equal(path, testConfig.expectedPath);
              assert.equal(headers['Content-Type'], 'application/json; charset=utf-8');
              assert.equal(body.methodName, fakeMethodParams.methodName);
              assert.equal(body.responseTimeoutInSeconds, fakeMethodParams.responseTimeoutInSeconds);
              assert.equal(body.connectTimeoutInSeconds, fakeMethodParams.connectTimeoutInSeconds);
              assert.equal(body.payload, fakeMethodParams.payload);
              assert.equal(timeout, (fakeMethodParams.responseTimeoutInSeconds + fakeMethodParams.connectTimeoutInSeconds) * 1000);
              callback();
            }
          };

          var method = new DeviceMethod(fakeMethodParams, fakeRestClient);
          testConfig.functionUnderTest(method, testCallback);
        });
      });

      [-1, 0, '', {}, { foo: 'bar' }, 'one line', Buffer.from([0xDE, 0xAD, 0xBE, 0xEF])].forEach(function(goodPayload) {
        it('builds a correct request when the payload is ' + goodPayload.toString(), function(testCallback) {
          var fakeMethodParams = {
            methodName: 'method',
            payload: goodPayload,
            responseTimeoutInSeconds: 42
          };

          var fakeRestClient = {
            executeApiCall: function(method, path, headers, body, timeout, callback) {
              assert.equal(method, 'POST');
              assert.equal(path, testConfig.expectedPath);
              assert.equal(headers['Content-Type'], 'application/json; charset=utf-8');
              assert.equal(body.methodName, fakeMethodParams.methodName);
              assert.equal(body.responseTimeoutInSeconds, fakeMethodParams.responseTimeoutInSeconds);
              assert.equal(body.connectTimeoutInSeconds, fakeMethodParams.connectTimeoutInSeconds);
              assert.equal(body.payload, fakeMethodParams.payload);
              assert.equal(timeout, (fakeMethodParams.responseTimeoutInSeconds + fakeMethodParams.connectTimeoutInSeconds) * 1000);
              callback();
            }
          };

          var method = new DeviceMethod(fakeMethodParams, fakeRestClient);
          testConfig.functionUnderTest(method, testCallback);
        });
      });
    });
  });
});