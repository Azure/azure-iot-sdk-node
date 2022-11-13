// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const assert = require('chai').assert;
const authorization = require('../dist/authorization.js');

const key = Buffer.from('password').toString('base64');

describe('authorization', function () {
  describe('#stringToSign', function () {
    /*Tests_SRS_NODE_COMMON_SAS_05_014: [<stringToSign> shall be a concatenation of resourceUri + '\n' + expiry.]*/
    it('returns <resourceUri>\\n<expiry>', function () {
      const stringToSign = authorization.stringToSign('blah/blah', 12345);
      assert.equal('blah/blah\n12345', stringToSign);
    });
  });

  describe('#hmacHash', function () {
    /*Tests_SRS_NODE_COMMON_SAS_05_013: [<signature> shall be an HMAC-SHA256 hash of the value <stringToSign>, which is then base64-encoded.]*/
    it('returns base64-encoded HMAC SHA-256 hash of string-to-sign', function () {
      const hash = authorization.hmacHash(key, 'string-to-sign');
      assert.equal('o1n1hiIVgzVA2+krq9ty1Z4xsIJKJZP3dYT8MOi65Y4=', hash);
    });
  });
});
