// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var errors = require('azure-iot-common').errors;
var X509AuthenticationProvider = require('../lib/x509_authentication_provider').X509AuthenticationProvider;

describe('X509AuthenticationProvider', function () {
  describe('#constructor + #getDeviceCredentials', function () {
    /*Tests_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_001: [The `constructor` shall store the credentials passed as argument.]*/
    it('creates an X509AuthenticationProvider with the credentials given as argument', function (testCallback) {
      var initialCreds = {
        deviceId: 'deviceId',
        host: 'host.name',
        x509: {
          cert: 'cert',
          key: 'key'
        }
      };

      var x509AuthProvider = new X509AuthenticationProvider(initialCreds);
      /*Tests_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_002: [The `getDeviceCredentials` method shall call its callback with a `null` error object and the stored device credentials as a second argument.]*/
      x509AuthProvider.getDeviceCredentials(function (err, creds) {
        assert.isNull(err);
        assert.strictEqual(creds.deviceId, initialCreds.deviceId);
        assert.strictEqual(creds.host, initialCreds.host);
        assert.strictEqual(creds.x509.cert, initialCreds.x509.cert);
        assert.strictEqual(creds.x509.key, initialCreds.x509.key);
        testCallback();
      });
    });
  });

  describe('#setX509Options', function () {
    /*Tests_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_003: [The `setX509Options` method shall store the `X509` object passed as an argument with the existing credentials.]*/
    it('updates the x509 options', function (testCallback) {
      var initialCreds = {
        deviceId: 'deviceId',
        host: 'host.name',
        x509: {
          cert: 'cert',
          key: 'key'
        }
      };

      var newX509Options = {
        cert: 'cert',
        key: 'key'
      };

      var x509AuthProvider = new X509AuthenticationProvider(initialCreds);
      x509AuthProvider.getDeviceCredentials(function (err, creds) {
        assert.isNull(err);
        assert.strictEqual(creds.deviceId, initialCreds.deviceId);
        assert.strictEqual(creds.host, initialCreds.host);
        assert.strictEqual(creds.x509.cert, initialCreds.x509.cert);
        assert.strictEqual(creds.x509.key, initialCreds.x509.key);
        x509AuthProvider.setX509Options(newX509Options);
        x509AuthProvider.getDeviceCredentials(function (err, creds) {
          assert.isNull(err);
          assert.strictEqual(creds.deviceId, initialCreds.deviceId);
          assert.strictEqual(creds.host, initialCreds.host);
          assert.strictEqual(creds.x509.cert, newX509Options.cert);
          assert.strictEqual(creds.x509.key, newX509Options.key);
          testCallback();
        });
      });
    });
  });

  describe('#fromX509Options', function () {
    /*Tests_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_004: [The `fromX509Options` method shall throw a `ReferenceError` if `deviceId` is falsy.]*/
    [undefined, null, ''].forEach(function (badDeviceId) {
      it('throws if deviceId is \'' + badDeviceId + '\'', function () {
        var fakeX509Options = {
          cert: 'cert',
          key: 'key'
        };
        assert.throws(function () {
          return X509AuthenticationProvider.fromX509Options(badDeviceId, 'host', fakeX509Options);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_005: [The `fromX509Options` method shall throw a `ReferenceError` if `iotHubHostname` is falsy.]*/
    [undefined, null, ''].forEach(function (badHost) {
      it('throws if iotHubHostname is \'' + badHost + '\'', function () {
        var fakeX509Options = {
          cert: 'cert',
          key: 'key'
        };
        assert.throws(function () {
          return X509AuthenticationProvider.fromX509Options('deviceId', badHost, fakeX509Options);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_006: [The `fromX509Options` method shall throw a `ReferenceError` if `x509info` is falsy.]*/
    [undefined, null].forEach(function (badX509Opts) {
      it('throws if x509Options is \'' + badX509Opts + '\'', function () {
        assert.throws(function () {
          return X509AuthenticationProvider.fromX509Options('deviceId', 'host', badX509Opts);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_007: [The `fromX509Options` method shall throw an `errors.ArgumentError` if `x509info.cert` is falsy.]*/
    /*Tests_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_008: [The `fromX509Options` method shall throw an `errors.ArgumentError` if `x509info.key` is falsy.]*/
    [{ cert: 'cert' }, { key: 'key' }, {}].forEach(function (badX509Opts) {
      it('throws if x509Options is \'' + JSON.stringify(badX509Opts) + '\'', function () {
        assert.throws(function () {
          return X509AuthenticationProvider.fromX509Options('deviceId', 'host', badX509Opts);
        }, errors.ArgumentError);
      });
    });

    /*Tests_SRS_NODE_X509_AUTHENTICATION_PROVIDER_16_009: [The `fromX509Options` method shall create a new instance of `X509AuthenticationProvider` with a credentials object created from the arguments.]*/
    it('creates a new instance of an X509AuthenticationProvider using the arguments provided', function (testCallback) {
      var fakeX509Options = {
        cert: 'cert',
        key: 'key'
      };
      var fakeDeviceId = 'deviceId';
      var fakeHost = 'host.name';

      var x509AuthProvider = X509AuthenticationProvider.fromX509Options(fakeDeviceId, fakeHost, fakeX509Options);
      x509AuthProvider.getDeviceCredentials(function (err, creds) {
        assert.isNull(err);
        assert.strictEqual(creds.deviceId, fakeDeviceId);
        assert.strictEqual(creds.host, fakeHost);
        assert.strictEqual(creds.x509.cert, fakeX509Options.cert);
        assert.strictEqual(creds.x509.key, fakeX509Options.key);
        testCallback();
      });
    });
  });
});
