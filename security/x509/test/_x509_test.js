// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var X509SecurityClient = require('../lib/x509').X509SecurityClient;
var assert = require('chai').assert;

describe('x509', function () {
  this.timeout(1000);

  var obj = new X509SecurityClient();

  describe('getCertificate', function() {
    it ('throws', function() {
      assert.throws(function() {
        obj.getCertificate();
      });
    });
  });

  describe('getCertificateChain', function() {
    it ('throws', function() {
      assert.throws(function() {
        obj.getCertificateChain();
      });
    });
  });

});

