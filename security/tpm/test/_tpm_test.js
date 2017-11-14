// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var TMPSecurityObject = require('../lib/tpm').TMPSecurityObject;
var assert = require('chai').assert;

describe('tpm', function () {
  this.timeout(1000);

  var obj = new TMPSecurityObject();

  describe('getEndoresementKey', function() {
    it ('throws', function() {
      assert.throws(function() {
        obj.getEndoresementKey();
      });
    });
  });

  describe('getStorageKey', function() {
    it ('throws', function() {
      assert.throws(function() {
        obj.getStorageKey();
      });
    });
  });

  describe('signData', function() {
    it ('throws', function() {
      assert.throws(function() {
        obj.signData();
      });
    });
  });

  describe('activateSymetricIdentity', function() {
    it ('throws', function() {
      assert.throws(function() {
        obj.activateSymetricIdentity();
      });
    });
  });

});

