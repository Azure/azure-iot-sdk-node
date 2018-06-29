// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var encodeUriComponentStrict = require('azure-iot-common').encodeUriComponentStrict;
var MethodClient = require('../../lib/device_method').MethodClient;


describe('MethodClient', function () {
  var fakeAuthProvider, fakeRestApiClient;
  var fakeCredentials = {
    gatewayHostName: 'gateway',
    sharedAccessSignature: 'sas',
    deviceId: 'deviceId',
    moduleId: 'moduleId'
  };
  var fakeMethodParams = {
    methodName: 'fakeMethod',
    payload: 'fakePayload',
    responseTimeoutInSeconds: 4,
    connectTimeoutInSeconds: 2
  };
  var fakeMethodResult = {
    status: 200,
    payload: {
      fakeKey: 'fakeValue'
    }
  };

  beforeEach(function () {
    fakeAuthProvider = {
      getDeviceCredentials: sinon.stub().callsArgWith(0, null, fakeCredentials)
    };
    fakeRestApiClient = {
      setOptions: sinon.stub(),
      updateSharedAccessSignature: sinon.stub(),
      executeApiCall: sinon.stub().callsArgWith(5, null, fakeMethodResult)
    };
  })

  describe('#invokeMethod', function () {

    /*Tests_SRS_NODE_DEVICE_METHOD_CLIENT_16_006: [The `invokeMethod` method shall get the latest credentials by calling `getDeviceCredentials` on the `AuthenticationProvider` object.]*/
    it('calls getDeviceCredentials on the authentication provider and use received credentials', function (testCallback) {
      var client = new MethodClient(fakeAuthProvider);
      client._restApiClient = fakeRestApiClient;
      client.invokeMethod('targetDeviceId', 'targetModuleId', fakeMethodParams, function () {
        assert.isTrue(fakeAuthProvider.getDeviceCredentials.calledOnce);
        assert.strictEqual(fakeRestApiClient.executeApiCall.firstCall.args[2]['x-ms-edge-moduleId'], fakeCredentials.deviceId + '/' + fakeCredentials.moduleId);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_METHOD_CLIENT_16_007: [The `invokeMethod` method shall create a `RestApiClient` object if it does not exist.]*/
    it('instantiates a RestApiClient with the proper parameters if it has not been created yet', function (testCallback) {
      var client = new MethodClient(fakeAuthProvider);
      var fakeRestApiClient = {
        setOptions: sinon.stub(),
        executeApiCall: sinon.stub().callsArg(5)
      }
      var restApiClientStub = sinon.stub(require('azure-iot-http-base'), 'RestApiClient').callsFake(function (config, userAgent) {
        assert.strictEqual(config.host, fakeCredentials.gatewayHostName);
        assert.strictEqual(config.sharedAccessSignature, fakeCredentials.sharedAccessSignature);
        assert.isString(userAgent);
        restApiClientStub.restore();
        return fakeRestApiClient;
      });
      client.invokeMethod('targetDeviceId', 'targetModuleId', fakeMethodParams, function () {
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_METHOD_CLIENT_16_015: [The `invokeMethod` method shall update the shared access signature of the `RestApiClient` by using its `updateSharedAccessSignature` method and the credentials obtained with the call to `getDeviceCredentials` (see `SRS_NODE_DEVICE_METHOD_CLIENT_16_006`).]*/
    it('calls updateSharedAccessSignature on the RestApiClient if it has already been instantiated', function (testCallback) {
      var client = new MethodClient(fakeAuthProvider);
      client._restApiClient = fakeRestApiClient;
      client.invokeMethod('targetDeviceId', 'targetModuleId', fakeMethodParams, function () {
        assert.isTrue(fakeRestApiClient.updateSharedAccessSignature.calledWith(fakeCredentials.sharedAccessSignature));
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_METHOD_CLIENT_16_009: [The `invokeMethod` method shall call the `setOptions` method on the `RestApiClient` with its options as argument to make sure the CA certificate is populated.]*/
    it('calls setOptions on the RestApiClient to make sure the CA cert parameter is set', function (testCallback) {
      var fakeOptions = { ca: 'ca' };
      var client = new MethodClient(fakeAuthProvider);
      client._restApiClient = fakeRestApiClient;
      client._options = fakeOptions;
      client.invokeMethod('targetDeviceId', 'targetModuleId', fakeMethodParams, function () {
        assert.isTrue(fakeRestApiClient.setOptions.calledOnce);
        assert.isTrue(fakeRestApiClient.setOptions.calledWith(fakeOptions));
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_METHOD_CLIENT_16_008: [The `invokeMethod` method shall call its callback with an `Error` if it fails to get the latest credentials from the `AuthenticationProvider` object.]*/
    it('calls its callback with an error if the authentication provider fails to provide credentials', function (testCallback) {
      var fakeError = new Error('fake');
      var client = new MethodClient(fakeAuthProvider);
      client._restApiClient = fakeRestApiClient;
      fakeAuthProvider.getDeviceCredentials = sinon.stub().callsArgWith(0, fakeError);
      client.invokeMethod('targetDeviceId', 'targetModuleId', fakeMethodParams, function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_METHOD_CLIENT_16_011: [The `invokeMethod` method shall construct the HTTP request path as `/twins/encodeUriComponentStrict(<targetDeviceId>)/modules/encodeUriComponentStrict(<targetModuleId>)/methods` if the target is a module.]*/
    /*Tests_SRS_NODE_DEVICE_METHOD_CLIENT_16_012: [The `invokeMethod` method shall call `RestApiClient.executeApiCall` with:
      - `POST` for the HTTP method argument.
      - `path` as defined in `SRS_NODE_DEVICE_METHOD_CLIENT_16_010` and `SRS_NODE_DEVICE_METHOD_CLIENT_16_011`
      - 2 custom headers:
        - `Content-Type` shall be set to `application/json`
        - `x-ms-edge-moduleId` shall be set to `<deviceId>/<moduleId>` with `deviceId` and `moduleId` being the identifiers for the current module (as opposed to the target module)
      - the stringified version of the `MethodParams` object as the body of the request
      - a timeout value in milliseconds that is the sum of the `connectTimeoutInSeconds` and `responseTimeoutInSeconds` parameters of the `MethodParams` object.]*/
    it('calls executeApiCall on the RestApiClient with the correct HTTP request parameters for a module target', function (testCallback) {
      var targetDeviceId = 'target#DeviceId';
      var targetModuleId = 'targetModule/Id';
      var expectedPath = '/twins/' + encodeUriComponentStrict(targetDeviceId) + '/modules/' + encodeUriComponentStrict(targetModuleId) + '/methods';
      var client = new MethodClient(fakeAuthProvider);
      client._restApiClient = fakeRestApiClient;
      client.invokeMethod(targetDeviceId, targetModuleId, fakeMethodParams, function () {
        /*Tests_SRS_NODE_DEVICE_METHOD_CLIENT_16_014: [The `invokeMethod` method shall call its callback with the result object if the call to `RestApiClient.executeApiCall` succeeds.]*/
        assert.strictEqual(client._restApiClient.executeApiCall.firstCall.args[0], 'POST');
        assert.strictEqual(client._restApiClient.executeApiCall.firstCall.args[1], expectedPath);
        assert.strictEqual(client._restApiClient.executeApiCall.firstCall.args[2]['Content-Type'], 'application/json');
        assert.strictEqual(client._restApiClient.executeApiCall.firstCall.args[2]['x-ms-edge-moduleId'], fakeCredentials.deviceId + '/' + fakeCredentials.moduleId);
        assert.strictEqual(client._restApiClient.executeApiCall.firstCall.args[3], JSON.stringify(fakeMethodParams));
        assert.strictEqual(client._restApiClient.executeApiCall.firstCall.args[4], 1000 * (fakeMethodParams.responseTimeoutInSeconds + fakeMethodParams.connectTimeoutInSeconds));
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_METHOD_CLIENT_16_010: [The `invokeMethod` method shall construct the HTTP request path as `/twins/encodeUriComponentStrict(<targetDeviceId>)/methods` if the target is a device.]*/
    it('calls executeApiCall on the RestApiClient with the correct HTTP request parameters for a device target', function (testCallback) {
      var targetDeviceId = 'target#DeviceId';
      var expectedPath = '/twins/' + encodeUriComponentStrict(targetDeviceId) + '/methods';
      var client = new MethodClient(fakeAuthProvider);
      client._restApiClient = fakeRestApiClient;
      client.invokeMethod(targetDeviceId, undefined, fakeMethodParams, function () {
        assert.strictEqual(client._restApiClient.executeApiCall.firstCall.args[0], 'POST');
        assert.strictEqual(client._restApiClient.executeApiCall.firstCall.args[1], expectedPath);
        assert.strictEqual(client._restApiClient.executeApiCall.firstCall.args[2]['Content-Type'], 'application/json');
        assert.strictEqual(client._restApiClient.executeApiCall.firstCall.args[2]['x-ms-edge-moduleId'], fakeCredentials.deviceId + '/' + fakeCredentials.moduleId);
        assert.strictEqual(client._restApiClient.executeApiCall.firstCall.args[3], JSON.stringify(fakeMethodParams));
        assert.strictEqual(client._restApiClient.executeApiCall.firstCall.args[4], 1000 * (fakeMethodParams.responseTimeoutInSeconds + fakeMethodParams.connectTimeoutInSeconds));
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_METHOD_CLIENT_16_013: [The `invokeMethod` method shall call its callback with an error if `RestApiClient.executeApiCall` fails.]*/
    it('calls its callback with an error if the call to RestApiClient.executeApiCall fails', function (testCallback) {
      var fakeError = new Error('fake');
      var client = new MethodClient(fakeAuthProvider);
      fakeRestApiClient.executeApiCall = sinon.stub().callsArgWith(5, fakeError);
      client._restApiClient = fakeRestApiClient;
      client.invokeMethod('targetDeviceId', 'targetModuleId', fakeMethodParams, function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });
  });

  describe('#setOptions', function () {
    /*Tests_SRS_NODE_DEVICE_METHOD_CLIENT_16_001: [The `setOptions` method shall merge the options passed in argument with the existing set of options used by the `MethodClient`.]*/
    it('sets the CA option to be used by the RestApiClient', function (testCallback) {
      var client = new MethodClient(fakeAuthProvider);
      client._restApiClient = fakeRestApiClient
      client.setOptions({ ca : 'fakeCa' });
      client.invokeMethod('targetDevice', 'targetModule', fakeMethodParams, function (err, result) {
        assert.strictEqual(fakeRestApiClient.setOptions.firstCall.args[0].ca, 'fakeCa');
        testCallback();
      });
    });
  });
});