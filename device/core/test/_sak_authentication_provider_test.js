// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const errors = require('azure-iot-common').errors;
const SharedAccessSignature = require('azure-iot-common').SharedAccessSignature;
const SharedAccessKeyAuthenticationProvider = require('../dist/sak_authentication_provider').SharedAccessKeyAuthenticationProvider;

describe('SharedAccessKeyAuthenticationProvider', function () {
  describe('#constructor', function () {
    /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_001: [The `constructor` shall create the initial token value using the `credentials` parameter.]*/
    it('initializes the credentials', function (testCallback) {
      const fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      const sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, 10, 1);
      sakAuthProvider.getDeviceCredentials(function (err, creds) {
        assert.strictEqual(creds.deviceId, fakeCredentials.deviceId);
        assert.strictEqual(creds.host, fakeCredentials.host);
        assert.strictEqual(creds.sharedAccessKey, fakeCredentials.sharedAccessKey);
        const sasObject = SharedAccessSignature.parse(creds.sharedAccessSignature);
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
        sakAuthProvider.stop();
        testCallback();
      });
    });

    /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_002: [The `getDeviceCredentials` method shall start a timer that will automatically renew the token every (`tokenValidTimeInSeconds` - `tokenRenewalMarginInSeconds`) seconds if specified, or 45 minutes by default.]*/
    it('starts a timer to renew the token', function (testCallback) {
      const clock = sinon.useFakeTimers();
      const fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      const sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, 10, 1);
      const eventSpy = sinon.spy();
      sakAuthProvider.on('newTokenAvailable', eventSpy);
      /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_003: [The `getDeviceCredentials` should call its callback with a `null` first parameter and a `TransportConfig` object as a second parameter, containing the latest valid token it generated.]*/
      sakAuthProvider.getDeviceCredentials(function (err, creds) {
        assert.isNull(err);
        const token = creds.sharedAccessSignature;
        clock.tick(5000); // 5 seconds - token not renewed
        sakAuthProvider.getDeviceCredentials(function (err, creds) {
          assert.strictEqual(token, creds.sharedAccessSignature);
          clock.tick(5000); // 5 more seconds - token should've been renewed
          sakAuthProvider.getDeviceCredentials(function (err, creds) {
            assert.notEqual(token, creds.sharedAccessSignature);
            /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_005: [Every time a new token is created, the `newTokenAvailable` event shall be fired with no arguments.]*/
            assert(eventSpy.calledOnce);
            clock.restore();
            sakAuthProvider.stop();
            testCallback();
          });
        });
      });
    });

    it('getDeviceCredentials renews token on demand', function (testCallback) {
      const clock = sinon.useFakeTimers();
      const fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      const sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, 10, 1);

      // the following line will cause _shouldRenewToken to resolve to true
      sakAuthProvider._currentTokenExpiryTimeInSeconds = undefined;

      sakAuthProvider.getDeviceCredentials(function (err, creds) {
        assert.equal(creds.sharedAccessSignature, 'SharedAccessSignature sr=fake.host.name%2Fdevices%2FfakeDeviceId&sig=bYz5R2IFTaejB6pgYOxns2mw6lcuA4VSy8kJbYQp0Sc%3D&se=10');
        clock.restore();
        sakAuthProvider.stop();
        testCallback();
      });
    });

    it('emits an error if _sign fails while automatically renewing on token timeout', function (testCallback) {
      const fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      const fakeError = new Error('whoops');
      const sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, 10, 1);
      sakAuthProvider.on('error', function (err) {
        assert.strictEqual(err, fakeError);
          sakAuthProvider.stop();
          testCallback();
      });

      sinon.stub(sakAuthProvider, '_sign').callsArgWith(2, fakeError);
      sakAuthProvider._expiryTimerHandler();
    });

    it('getDeviceCredentials propagates error via callback if _sign fails', function (testCallback) {
      const fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      const sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, 10, 1);

      sinon.stub(sakAuthProvider, '_sign').callsArgWith(2, 'whoops');
      sakAuthProvider.getDeviceCredentials(function (err) {
        assert.equal(err, 'whoops');
          sakAuthProvider.stop();
          testCallback();
      });
    });

    it('_renewToken provides result via callback', function (testCallback) {
      const fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      const sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, 10, 1);

      sinon.stub(sakAuthProvider, '_sign').callsArgWith(2, null, 'signature');
      sakAuthProvider._renewToken(function (err, creds) {
        assert.equal(creds.sharedAccessSignature, 'signature');
      });
      sakAuthProvider.stop();
      testCallback();
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
        const fakeConnectionString = 'DeviceId=deviceId;HostName=host;SharedAccessKeyName=foo';
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
    ].forEach(function (testConfig) {
      it('initializes the credentials from the connection string ' + testConfig.name, function (testCallback) {
        const sakAuthProvider = SharedAccessKeyAuthenticationProvider.fromConnectionString(testConfig.connectionString, 2, 1);
        sakAuthProvider.getDeviceCredentials(function (err, creds) {
          assert.strictEqual(creds.deviceId, testConfig.credentials.deviceId);
          assert.strictEqual(creds.moduleId, testConfig.credentials.moduleId);
          assert.strictEqual(creds.host, testConfig.credentials.host);
          assert.strictEqual(creds.sharedAccessKey, testConfig.credentials.sharedAccessKey);
          sakAuthProvider.stop();
          testCallback();
        });
      });
    });
  });

  describe('stop', function () {

    /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_012: [The `stop` method shall clear the token renewal timer if it is running.]*/
    it('clears the SAS token renewal timeout', function (testCallback) {
      const clock = sinon.useFakeTimers();
      const fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      const sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, 10, 1);
      const eventSpy = sinon.spy();
      sakAuthProvider.on('newTokenAvailable', eventSpy);
      /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_003: [The `getDeviceCredentials` should call its callback with a `null` first parameter and a `TransportConfig` object as a second parameter, containing the latest valid token it generated.]*/
      sakAuthProvider.getDeviceCredentials(function () {
        clock.tick(11000); // 11 seconds - event should've fired
        assert(eventSpy.calledOnce);
        sakAuthProvider.stop();
        clock.tick(11000);
        assert(eventSpy.calledOnce); // if the timer is still running, the event would've fired twice.
        clock.restore();
        testCallback();
      });
    });

    /*Tests_SRS_NODE_SAK_AUTH_PROVIDER_16_013: [The `stop` method shall simply return if the token renewal timer is not running.]*/
    it('returns and does not crash if the timer is not running', function () {
      const sakAuthProvider = new SharedAccessKeyAuthenticationProvider({
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      }, 10, 1);
      assert.doesNotThrow(function () {
        sakAuthProvider.stop();
      });
    });

    it('clears _currentTokenExpiryTimeInSeconds so that _shouldRenewToken returns true', async function () {
      const fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      const sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, 10, 1);
      await sakAuthProvider.getDeviceCredentials();
      assert.isFalse(isNaN(sakAuthProvider._currentTokenExpiryTimeInSeconds), 'isNaN() returned true when it should have been false');
      assert.isFalse(sakAuthProvider._shouldRenewToken(), '_shouldRenewToken() returned true when it should have been false');
      sakAuthProvider.stop();
      assert.isTrue(isNaN(sakAuthProvider._currentTokenExpiryTimeInSeconds), 'isNaN() returned false when it should have been true');
      assert.isTrue(sakAuthProvider._shouldRenewToken(), '_shouldRenewToken() returned false when it should have been true');
    });
  });

  describe('setTokenRenewalValues', function () {

    const validTimeInSeconds = 3600;
    const marginInSeconds = 1200;
    /* Tests_SRS_NODE_SAK_AUTH_PROVIDER_06_001: [The `setTokenRenewalValues` shall throw an `ArgumentError` if the `tokenValidTimeInSeconds` is less than or equal `tokenRenewalMarginInSeconds`.] */
    it('throws if the valid <= margin ', function () {
      const fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      const sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, 10, 1);
      assert.throw(() => sakAuthProvider.setTokenRenewalValues(marginInSeconds, marginInSeconds), errors.ArgumentError);
    });

    /* Tests_SRS_NODE_SAK_AUTH_PROVIDER_06_002: [If there is no timer running when `setTokenRenewalValues` is invoked, there will NOT be a timer running when it returns.] */
    it('Will NOT start the timing loop', function (done) {
      const fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      const sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, 10, 1);
      assert.notOk(sakAuthProvider._renewalTimeout);
      sakAuthProvider.setTokenRenewalValues(validTimeInSeconds, marginInSeconds);
      assert.notOk(sakAuthProvider._renewalTimeout);
      done();
    });

    it('Will continue the timing loop', function (done) {
      const fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      const sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, 10, 1);
      assert.notOk(sakAuthProvider._renewalTimeout);
      sakAuthProvider.getDeviceCredentials((errorFromGet, _transportConfig) => {
        if (errorFromGet) {
          return done(errorFromGet);
        } else {
          assert(sakAuthProvider._renewalTimeout);
          sakAuthProvider.setTokenRenewalValues(validTimeInSeconds, marginInSeconds);
          assert(sakAuthProvider._renewalTimeout);
          sakAuthProvider.stop();
          assert.notOk(sakAuthProvider._renewalTimeout);
          return done();
        }
      });
    });

    /* Tests_SRS_NODE_SAK_AUTH_PROVIDER_06_003: [If there is a timer running when `setTokenRenewalValues` is invoked it will cause a token renewal to happen almost immediately and cause the subsequent renewals to happen with as specified with the new values.] */
    it('will reset the time when a new token is provided', function (done) {
      const initialValidTimeInSeconds = 10000;
      const initialMarginInSeconds = 2000;
      const newValidTimeInSeconds = 20000;
      const newMarginInSeconds = 2000;
      const clock = sinon.useFakeTimers();
      const fakeCredentials = {
        deviceId: 'fakeDeviceId',
        host: 'fake.host.name',
        sharedAccessKey: 'fakeKey'
      };
      const sakAuthProvider = new SharedAccessKeyAuthenticationProvider(fakeCredentials, initialValidTimeInSeconds, initialMarginInSeconds);
      const eventSpy = sinon.spy();
      sakAuthProvider.on('newTokenAvailable', eventSpy);
      sakAuthProvider.getDeviceCredentials(() => {
        clock.tick(initialValidTimeInSeconds*1000);
        assert(eventSpy.calledOnce);
        sakAuthProvider.setTokenRenewalValues(newValidTimeInSeconds, newMarginInSeconds);
        //
        // When resetting these values when auto-renewing is active, the will be a new token generated
        // almost immediately.  Then it will assume the new renewal values
        //
        clock.tick(1000);
        assert(eventSpy.calledTwice);
        //
        // Move forward by the initial valid time.  We should NOT have had a new token generated.
        //
        clock.tick(initialValidTimeInSeconds*1000);
        assert(eventSpy.calledTwice);
        //
        // Now move forward by the new time so we should have had another token generated.
        //
        clock.tick((newValidTimeInSeconds - initialValidTimeInSeconds) * 1000);
        assert(eventSpy.calledThrice);
        clock.tick(newValidTimeInSeconds*1000);
        assert(eventSpy.callCount, 4);
        sakAuthProvider.stop();
        clock.restore();
        done();
      });
    });
  });
});
