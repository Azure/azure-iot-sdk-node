// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Amqp = require('../lib/amqp.js').Amqp;

describe('device client', function () {
  it ('has an empty test to satisfy npm scripts until actual tests are writtten', function(testCallback) {
    var amqp = new Amqp();
    testCallback();
  });
});
