// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var ArgumentError = require('azure-iot-common').errors.ArgumentError;
var ConnectionString = require('../lib/connection_string.js');

var incompleteConnectionStrings = {
  HostName: 'DeviceId=id;SharedAccessKey=key;GatewayHostName=gateway',
  DeviceId: 'HostName=name;SharedAccessKey=key;GatewayHostName=gateway'
};

var invalidConnectionStrings = {
  BothSharedAccessKeyAndx509:'DeviceId=id;HostName=name;SharedAccessKey=key;x509=true',
  BothSharedAccessKeyAndSharedAccessSignature:'DeviceId=id;HostName=name;SharedAccessKey=key;SharedAccessSignature=key',
  BothSharedAccessSignatureAndx509:'DeviceId=id;HostName=name;SharedAccessSignature=key;x509=true',
  NeitherSharedAccessKeyNorSharedAccessSignatureNorx509: 'DeviceId=id;HostName=name'
};

describe('ConnectionString', function () {
  describe('#parse', function () {
    /*Tests_SRS_NODE_DEVICE_CONNSTR_05_001: [The parse method shall return the result of calling azure-iot-common.ConnectionString.parse.]*/
    /*Tests_SRS_NODE_DEVICE_CONNSTR_05_002: [It shall throw ArgumentError if any of 'HostName', 'DeviceId' fields are not found in the source argument.]*/
    ['HostName', 'DeviceId'].forEach(function (key) {
      it('throws if connection string is missing ' + key, function () {
        assert.throws(function () {
          ConnectionString.parse(incompleteConnectionStrings[key]);
        }, ArgumentError);
      });
    });

    it('does not throw if shared access signature is missing GatewayHostName', function () {
      assert.doesNotThrow(function () {
        ConnectionString.parse('HostName=name;DeviceId=id;SharedAccessKey=key');
      }, ArgumentError);
    });

    /*Tests_SRS_NODE_DEVICE_CONNSTR_16_001: [It shall throw `ArgumentError` if `SharedAccessKey` and `x509` are present at the same time.]*/
    /*Tests_SRS_NODE_DEVICE_CONNSTR_16_006: [It shall throw `ArgumentError` if `SharedAccessSignature` and `x509` are present at the same time.]*/
    /*Tests_SRS_NODE_DEVICE_CONNSTR_16_007: [It shall throw `ArgumentError` if `SharedAccessKey` and `SharedAccessSignature` are present at the same time.]*/
    /*Tests_SRS_NODE_DEVICE_CONNSTR_16_008: [It shall throw `ArgumentError` if none of `SharedAccessKey`, `SharedAccessSignature` and `x509` are present.]*/
    ['BothSharedAccessKeyAndx509', 'BothSharedAccessKeyAndSharedAccessSignature', 'BothSharedAccessSignatureAndx509', 'NeitherSharedAccessKeyNorx509'].forEach(function(key) {
      it('throws if the connection string is invalid because ' + key, function() {
        assert.throws(function() {
          ConnectionString.parse(invalidConnectionStrings[key]);
        }, ArgumentError);
      });
    });

    it('does not throw if x509 is true and SharedAccessKey is not present', function() {
      assert.doesNotThrow(function() {
        ConnectionString.parse('HostName=name;DeviceId=id;x509=true');
      }, ArgumentError);
    });
  });

  describe('createWithSharedAccessSignature', function() {
    /*Tests_SRS_NODE_DEVICE_CONNSTR_16_002: [The `createWithSharedAccessKey` static method shall returns a valid connection string with the values passed as arguments.]*/
    it('creates a valid connection string', function() {
      var expected = 'HostName=host;DeviceId=deviceId;SharedAccessKey=sak';
      var actual = ConnectionString.createWithSharedAccessKey('host', 'deviceId', 'sak');
      assert.strictEqual(actual, expected);
    });

    /*Tests_SRS_NODE_DEVICE_CONNSTR_16_003: [The `createWithSharedAccessKey` static method shall throw a `ReferenceError` if one or more of the `hostName`, `deviceId` or `sharedAccessKey` are falsy.]*/
    [null, undefined, ''].forEach(function (badValue) {
      [
        { hostName: badValue, deviceId: 'deviceId', sharedAccessKey: 'sak', badParamName: 'hostName'},
        { hostName: 'hostName', deviceId: badValue, sharedAccessKey: 'sak', badParamName: 'deviceId'},
        { hostName: 'hostName', deviceId: 'deviceId', sharedAccessKey: badValue, badParamName: 'sharedAccessKey'}
      ].forEach(function(config) {
        it('throws ReferenceError when ' + config.badParamName + ' is \'' + config[config.badParamName] + '\'', function() {
          assert.throws(function() {
            ConnectionString.createWithSharedAccessKey(config.hostName, config.deviceId, config.sharedAccessKey);
          }, ReferenceError);
        });
      });
    });
  });

  describe('createWithX509Certificate', function() {
    /*Tests_SRS_NODE_DEVICE_CONNSTR_16_004: [The `createWithX509Certificate` static method shall returns a valid x509 connection string with the values passed as arguments.]*/
    it('creates a valid connection string', function() {
      var expected = 'HostName=host;DeviceId=deviceId;x509=true';
      var actual = ConnectionString.createWithX509Certificate('host', 'deviceId');
      assert.strictEqual(actual, expected);
    });

    /*Tests_SRS_NODE_DEVICE_CONNSTR_16_005: [The `createWithX509Certificate` static method shall throw a `ReferenceError` if one or more of the `hostName` or `deviceId` are falsy.]*/
    [null, undefined, ''].forEach(function (badValue) {
      [
        { hostName: badValue, deviceId: 'deviceId', badParamName: 'hostName'},
        { hostName: 'hostName', deviceId: badValue, badParamName: 'deviceId'},
      ].forEach(function(config) {
        it('throws ReferenceError when ' + config.badParamName + ' is \'' + config[config.badParamName] + '\'', function() {
          assert.throws(function() {
            ConnectionString.createWithX509Certificate(config.hostName, config.deviceId);
          }, ReferenceError);
        });
      });
    });
  });
});
