// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var SharedAccessKeySignatureProvider = require('../lib/sak_signature_provider')
  .SharedAccessKeySignatureProvider;
var SharedAccessSignature = require('azure-iot-common').SharedAccessSignature;
var errors = require('azure-iot-common').errors;

describe('SharedAccessKeySignatureProvider', function() {
  describe('#constructor', function() {
    // Tests_SRS_NODE_SAK_SIG_PROVIDER_13_003: [ The constructor shall throw an ArgumentError if the _sharedAccessKey parameter is falsy. ]
    [null, undefined, ''].forEach(function(badKey) {
      it("throws if the key is '" + badKey + "'", function(testCallback) {
        assert.throws(function() {
          new SharedAccessKeySignatureProvider(badKey);
        }, errors.ArgumentError);
        testCallback();
      });
    });

    // Tests_SRS_NODE_SAK_SIG_PROVIDER_13_004: [ The constructor shall save the tokenValidTimeInSeconds parameter if supplied. If not, it shall default to 3600 seconds (1 hour). ]
    it('token expiry defaults to 3600 seconds', function(testCallback) {
      var provider = new SharedAccessKeySignatureProvider('somekey');
      assert.equal(provider._tokenValidTimeInSeconds, 3600);
      testCallback();
    });

    // Tests_SRS_NODE_SAK_SIG_PROVIDER_13_004: [ The constructor shall save the tokenValidTimeInSeconds parameter if supplied. If not, it shall default to 3600 seconds (1 hour). ]
    it('token expiry is saved if supplied', function(testCallback) {
      var provider = new SharedAccessKeySignatureProvider('somekey', 2000);
      assert.equal(provider._tokenValidTimeInSeconds, 2000);
      testCallback();
    });
  });

  describe('#sign', function() {
    before(function() {
      sinon.spy(SharedAccessSignature, 'create');
    });

    after(function() {
      SharedAccessSignature.create.restore();
    });

    // Tests_SRS_NODE_SAK_SIG_PROVIDER_13_005: [ The sign method shall throw a ReferenceError if the callback parameter is falsy or is not a function. ]
    [null, undefined, '', 'not a function', 20].forEach(function(badCallback) {
      it("throws if the callback is '" + badCallback + "'", function(
        testCallback
      ) {
        var provider = new SharedAccessKeySignatureProvider('somekey');
        assert.throws(function() {
          provider.sign('key1', 'data', badCallback);
        }, ReferenceError);
        testCallback();
      });
    });

    // Tests_SRS_NODE_SAK_SIG_PROVIDER_13_006: [ The sign method shall invoke callback with a ReferenceError if the data parameter is falsy. ]
    [null, undefined, ''].forEach(function(badData) {
      it(
        "invokes callback with ReferenceError if data is '" + badData + "'",
        function(testCallback) {
          var provider = new SharedAccessKeySignatureProvider('somekey');
          provider.sign('key1', badData, function(err) {
            assert.instanceOf(err, ReferenceError);
            testCallback();
          });
        }
      );
    });

    // Tests_SRS_NODE_SAK_SIG_PROVIDER_13_007: [ sign shall invoke the callback with the result of calling azure-iot-common.SharedAccessSignature.create. ]
    // Tests_SRS_NODE_SAK_SIG_PROVIDER_13_002: [ Every token shall be created using the azure-iot-common.SharedAccessSignature.create method and then serialized as a string. The the expiration time of the token will be now + the token validity time, formatted as the number of seconds since Epoch (Jan 1st, 1970, 00:00 UTC).]
    [null, undefined, '', 'key1'].forEach(function(keyName, index) {
      it("signs with key name '" + keyName + "'", function(testCallback) {
        var provider = new SharedAccessKeySignatureProvider('somekey');
        provider.sign(keyName, 'somedata', function(err, signature) {
          assert.isNull(err);
          assert.isNotNull(signature);
          assert.isNotNull(signature.sig);
          assert.isAtLeast(signature.se, Math.floor(Date.now() / 1000));
          assert.equal(
            SharedAccessSignature.create.getCall(index).args[0],
            'somedata'
          );
          assert.equal(
            SharedAccessSignature.create.getCall(index).args[1],
            keyName
          );
          assert.equal(
            SharedAccessSignature.create.getCall(index).args[2],
            'somekey'
          );

          testCallback();
        });
      });
    });
  });
});
