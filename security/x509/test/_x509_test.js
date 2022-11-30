// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const X509Security = require('../dist/x509').X509Security;
const assert = require('chai').assert;

const fakeRegistrationId = 'fake registration id';
const fakeCert = 'fake certificate';

describe('x509', function () {
  // eslint-disable-next-line no-invalid-this
  this.timeout(1000);

  const obj = new X509Security(fakeRegistrationId, fakeCert);

  describe('getCertificate', function () {
    it ('returns the cert', function (callback) {
        obj.getCertificate(function (err, cert) {
          assert(!err);
          assert.equal(cert, fakeCert);
          callback();
        });
    });
  });

  describe('getRegistrationId', function () {
    it ('returns the registrationId', function (callback) {
      const registrationId = obj.getRegistrationId();
      assert.equal(registrationId, fakeRegistrationId);
      callback();
    });
  });

});
