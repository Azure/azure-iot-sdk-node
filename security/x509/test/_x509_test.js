// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var X509SecurityObject = require('../lib/x509').X509SecurityObject;
var assert = require('chai').assert;

describe('x509', function () {
  this.timeout(1000);

  var obj = new X509SecurityObject();

  describe('GetCertificate', function() {
    it ('throws', function() {
      assert.throws(function() {
        obj.getCertificate();
      });
    });
  });

  describe('GetCertificateChain', function() {
    it ('throws', function() {
      assert.throws(function() {
        obj.getCertificateChain();
      });
    });
  });

});

