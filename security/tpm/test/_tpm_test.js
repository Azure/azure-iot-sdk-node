// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var TpmSecurityClient  = require('../lib/tpm').TpmSecurityClient ;
var assert = require('chai').assert;

describe('tpm', function () {
  this.timeout(1000);

  var obj = new TpmSecurityClient ();

  describe('getEndorsementKey', function() {
    it ('throws', function() {
      assert.throws(function() {
        obj.getEndorsementKey();
      });
    });
  });

  describe('getStorageRootKey', function() {
    it ('throws', function() {
      assert.throws(function() {
        obj.getStorageRootKey();
      });
    });
  });

  describe('signWithIdentity', function() {
    it ('throws', function() {
      assert.throws(function() {
        obj.signWithIdentity();
      });
    });
  });

  describe('activateSymmetricIdentity', function() {
    it ('throws', function() {
      assert.throws(function() {
        obj.activateSymmetricIdentity();
      });
    });
  });

});

