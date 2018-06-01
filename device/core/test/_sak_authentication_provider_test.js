// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var errors = require('azure-iot-common').errors;
var SharedAccessSignature = require('azure-iot-common').SharedAccessSignature;
var SharedAccessKeyAuthenticationProvider = require('../lib/sak_authentication_provider').SharedAccessKeyAuthenticationProvider;

describe('SharedAccessKeyAuthenticationProvider', function () {
  describe('#constructor', function () {

    /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_001: [The `constructor` shall create the initial token value using the `credentials` parameter.]*/
    it('initializes the credentials', function (testCallback) {
      var fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      var sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, 10, 1);
      sakAuthProvider.automaticRenewal = false;
      sakAuthProvider.getDeviceCredentials(function (err, creds) {
        assert.strictEqual(creds.deviceId, fakeCredentials.deviceId);
        assert.strictEqual(creds.host, fakeCredentials.host);
        assert.strictEqual(creds.sharedAccessKey, fakeCredentials.sharedAccessKey);
        var sasObject = SharedAccessSignature.parse(creds.sharedAccessSignature);
        /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_010: [Every token shall be created using the `azure-iot-common.SharedAccessSignature.create` method and then serialized as a string, with the arguments to the create methods being:
        ```
        resourceUri: <IoT hub host>/devices/<deviceId>
        keyName: the `SharedAccessKeyName` parameter of the connection string or `null`
        key: the `SharedAccessKey` parameter of the connection string
        expiry: the expiration time of the token, which is now + the token validity time, formatted as the number of seconds since Epoch (Jan 1st, 1970, 00:00 UTC).
        ```]*/
        assert.strictEqual(sasObject.sr, encodeURIComponent(fakeCredentials.host + '/devices/' + fakeCredentials.deviceId));
        assert.notOk(sasObject.skn);
        assert.isOk(sasObject.sig);
        assert.isTrue(sasObject.se > Date.now() / 1000);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_002: [The `constructor` shall start a timer that will automatically renew the token every (`tokenValidTimeInSeconds` - `tokenRenewalMarginInSeconds`) seconds if specified, or 45 minutes by default.]*/
    it('starts a timer to renew the token', function (testCallback) {
      this.clock = sinon.useFakeTimers();
      var testClock = this.clock;
      var fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      var token;
      var sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, 10, 1);
      var eventSpy = sinon.spy();
      sakAuthProvider.on('newTokenAvailable', eventSpy);
      /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_003: [The `getDeviceCredentials` should call its callback with a `null` first parameter and a `TransportConfig` object as a second parameter, containing the latest valid token it generated.]*/
      sakAuthProvider.getDeviceCredentials(function (err, creds) {
        assert.isNull(err);
        token = creds.sharedAccessSignature;
        testClock.tick(5000); // 5 seconds - token not renewed
        sakAuthProvider.getDeviceCredentials(function (err, creds) {
          assert.strictEqual(token, creds.sharedAccessSignature);
          testClock.tick(5000); // 5 more seconds - token should've been renewed
          sakAuthProvider.getDeviceCredentials(function (err, creds) {
            assert.notEqual(token, creds.sharedAccessSignature);
            /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_005: [Every time a new token is created, the `newTokenAvailable` event shall be fired with no arguments.]*/
            assert.isTrue(eventSpy.calledOnce);
            sakAuthProvider.automaticRenewal = false;
            testClock.restore();
            testCallback();
          });
        });
      });
    });

    /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_011: [The `constructor` shall throw an `ArgumentError` if the `tokenValidTimeInSeconds` is less than or equal `tokenRenewalMarginInSeconds`.]*/
    it('throws ArgumentError if the tokenValidTimeInSeconds is less than or equal tokenRenewalMarginInSeconds', function () {
      assert.throw(function () {
        return new SharedAccessKeyAuthenticationProvider({
          deviceId: 'fakeDeviceId',
          host: 'fake.host.name',
          sharedAccessKey: 'fakeKey'
        }, 100, 200);
      }, errors.ArgumentError);
    });
  });

  describe('fromConnectionString', function () {
    /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_006: [The `fromConnectionString` method shall throw a `ReferenceError` if the `connectionString` parameter is falsy.]*/
    [null, undefined, ''].forEach(function (badConnectionString) {
      it('throws if the connection string is \'' + badConnectionString + '\'', function () {
        assert.throws(function () {
          SharedAccessKeyAuthenticationProvider.fromConnectionString(badConnectionString);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_007: [The `fromConnectionString` method shall throw an `errors.ArgumentError` if the `connectionString` does not have a SharedAccessKey parameter.]*/
    it('throws an ArgumentError if the connection string does not contain a shared access key', function () {
      assert.throws(function () {
        var fakeConnectionString = 'DeviceId=deviceId;HostName=host;SharedAccessKeyName=foo';
        return SharedAccessKeyAuthenticationProvider.fromConnectionString(fakeConnectionString, 1, 1);
      }, errors.ArgumentError);
    });

    /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_008: [The `fromConnectionString` method shall extract the credentials from the `connectionString` argument and create a new `SharedAccessKeyAuthenticationProvider` that uses these credentials to generate security tokens.]*/
    [
      {
        name: 'without moduleId',
        connectionString: 'DeviceId=fakeDeviceId;HostName=fake.host.name;SharedAccessKey=fakeKey',
        credentials: {
          deviceId: 'fakeDeviceId',
          host: 'fake.host.name',
          sharedAccessKey: 'fakeKey'
        }
      },
      {
        name: 'with moduleId',
        connectionString: 'DeviceId=fakeDeviceId;ModuleId=fakeModuleId;HostName=fake.host.name;SharedAccessKey=fakeKey',
        credentials: {
          deviceId: 'fakeDeviceId',
          moduleId: 'fakeModuleId',
          host: 'fake.host.name',
          sharedAccessKey: 'fakeKey'
        }
      }
    ].forEach(function(testConfig) {
      it('initializes the credentials from the connection string ' + testConfig.name, function (testCallback) {
        var sakAuthProvider = SharedAccessKeyAuthenticationProvider.fromConnectionString(testConfig.connectionString, 2, 1);
        sakAuthProvider.getDeviceCredentials(function (err, creds) {
          assert.strictEqual(creds.deviceId, testConfig.credentials.deviceId);
          assert.strictEqual(creds.moduleId, testConfig.credentials.moduleId);
          assert.strictEqual(creds.host, testConfig.credentials.host);
          assert.strictEqual(creds.sharedAccessKey, testConfig.credentials.sharedAccessKey);
          testCallback();
        });
      });
    });
  });
});