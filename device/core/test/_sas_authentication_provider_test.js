// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var SharedAccessSignature = require('azure-iot-common').SharedAccessSignature;
var SharedAccessSignatureAuthenticationProvider = require('../lib/sas_authentication_provider').SharedAccessSignatureAuthenticationProvider;


describe('SharedAccessSignatureAuthenticationProvider', function () {
  describe('#constructor + #getDeviceCredentials', function () {
    /*Tests_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_001: [The `constructor` shall store the credentials passed in the `credentials` argument.]*/
    it('stores the credentials passed as argument', function (testCallback) {
      var fakeCredentials = {
        host: 'host.name',
        deviceId: 'deviceId',
        sharedAccessSignature: 'sas'
      };
      var sasAuthProvider = new SharedAccessSignatureAuthenticationProvider(fakeCredentials);
      sasAuthProvider.getDeviceCredentials(function (err, creds) {
        /*Tests_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_002: [The `getDeviceCredentials` method shall call its callback with a `null` error parameter and the stored `credentials` object containing the current device credentials.]*/
        assert.strictEqual(creds, fakeCredentials);
        assert.isNull(err);
        testCallback();
      });
    });
  });

  describe('#updateSharedAccessSignature', function () {
    /*Tests_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_003: [The `updateSharedAccessSignature` method shall update the stored credentials with the new `sharedAccessSignature` value passed as an argument.]*/
    it('updates the stored credentials', function (testCallback) {
      var newSas = 'newSas';
      var fakeCredentials = {
        host: 'host.name',
        deviceId: 'deviceId',
        sharedAccessSignature: 'sas'
      };
      var sasAuthProvider = new SharedAccessSignatureAuthenticationProvider(fakeCredentials);
      sasAuthProvider.getDeviceCredentials(function (err, creds) {
        assert.strictEqual(creds.sharedAccessSignature, fakeCredentials.sharedAccessSignature);
        sasAuthProvider.updateSharedAccessSignature(newSas);
        sasAuthProvider.getDeviceCredentials(function (err, creds) {
          assert.strictEqual(creds.sharedAccessSignature, newSas);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_004: [The `updateSharedAccessSignature` method shall emit a `newTokenAvailable` event with no arguments.]*/
    it('emits a newTokenAvailable event', function (testCallback) {
      var fakeCredentials = {
        host: 'host.name',
        deviceId: 'deviceId',
        sharedAccessSignature: 'sas'
      };
      var newSas = 'new shared access signature';
      var sasAuthProvider = new SharedAccessSignatureAuthenticationProvider(fakeCredentials);
      sasAuthProvider.on('newTokenAvailable', function (creds) {
        assert.strictEqual(creds.sharedAccessSignature, newSas);
        testCallback();
      });
      sasAuthProvider.updateSharedAccessSignature(newSas);
    });
  });

  describe('#fromSharedAccessSignature', function () {
    /*Tests_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_005: [The `fromSharedAccessSignature` method shall throw a `ReferenceError` if the `sharedAccessSignature` argument is falsy.]*/
    [undefined, null, ''].forEach(function (badSas) {
      it('throws a ReferenceError if the shared access signature is \'' + badSas + '\'', function () {
        assert.throws(function () {
          return SharedAccessSignatureAuthenticationProvider.fromSharedAccessSignature(badSas);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_006: [The `fromSharedAccessSignature` shall return a new `SharedAccessSignatureAuthenticationProvider` object initialized with the credentials parsed from the `sharedAccessSignature` argument.]*/
    it('creates a SharedAccessSignatureAuthenticationProvider initialized with credentials from the shared access signature passed as argument', function (testCallback) {
      var fakeCredentials = {
        host: 'host.name',
        deviceId: 'deviceId',
        sharedAccessSignature: 'sas'
      };
      var fakeSas = SharedAccessSignature.create(encodeURIComponent(fakeCredentials.host + '/devices/' + fakeCredentials.deviceId), null, 'foo', Math.floor(Date.now() / 1000) + 1000).toString();

      var sasAuthProvider = SharedAccessSignatureAuthenticationProvider.fromSharedAccessSignature(fakeSas.toString());
      sasAuthProvider.getDeviceCredentials(function (err, creds) {
        assert.strictEqual(creds.host, fakeCredentials.host);
        assert.strictEqual(creds.deviceId, fakeCredentials.deviceId);
        assert.isUndefined(creds.sharedAccessKey);
        assert.strictEqual(creds.sharedAccessSignature, fakeSas);
        testCallback();
      });
    });

    it('create a correct config when sr is not URI-encoded', function (testCallback) {
      var sharedAccessSignature = '"SharedAccessSignature sr=hubName.azure-devices.net/devices/deviceId&sig=s1gn4tur3&se=1454204843"';
      var sasAuthProvider = SharedAccessSignatureAuthenticationProvider.fromSharedAccessSignature(sharedAccessSignature);
      sasAuthProvider.getDeviceCredentials(function (err, creds) {
        assert.strictEqual(creds.host, 'hubName.azure-devices.net');
        assert.strictEqual(creds.deviceId, 'deviceId');
        assert.strictEqual(creds.sharedAccessSignature, sharedAccessSignature);
        testCallback();
      });
    });

    it('create a correct config when sr is URI-encoded', function (testCallback) {
      var sharedAccessSignature = '"SharedAccessSignature sr=hubName.azure-devices.net%2Fdevices%2FdeviceId&sig=s1gn4tur3&se=1454204843"';
      var sasAuthProvider = SharedAccessSignatureAuthenticationProvider.fromSharedAccessSignature(sharedAccessSignature);
      sasAuthProvider.getDeviceCredentials(function (err, creds) {
        assert.strictEqual(creds.host, 'hubName.azure-devices.net');
        assert.strictEqual(creds.deviceId, 'deviceId');
        assert.strictEqual(creds.sharedAccessSignature, sharedAccessSignature);
        testCallback();
      });
    });
  });

  describe('#stop', function () {
    /*Tests_SRS_NODE_SAS_AUTHENTICATION_PROVIDER_16_007: [The `stop` method shall simply return since there is no timeout or resources to clear.]*/
    it('returns and does not crash if the timer is not running', function () {
      var sasAuthProvider = new SharedAccessSignatureAuthenticationProvider({
        host: 'host.name',
        deviceId: 'deviceId',
        sharedAccessSignature: 'sas'
      }, 10, 1);
      assert.doesNotThrow(function () {
        sasAuthProvider.stop();
      });
    });
  })
});