
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var OperationList = require('../lib/operation_list').OperationList;
var assert = require('chai').assert;

describe('OperationList', function () {
  this.timeout(1000);
  var operationList;

  beforeEach(function() {
    operationList = new OperationList();
    operationList.operationStarted(1);
    operationList.operationStarted(2);
    operationList.operationStarted(3);
  });

  it ('can add operations and execute them', function() {
    var visited =[];
    operationList.popAllPendingOperations(function(o) {
      assert(o >= 1 && o <= 3);
      visited[o] = true;
    });
    assert(visited[1]);
    assert(visited[2]);
    assert(visited[3]);
  });

  it ('can remove a single operation', function() {
    var visited = [];
    visited[1] = false;
    visited[2] = false;
    visited[3] = false;
    operationList.operationEnded(2);
    operationList.popAllPendingOperations(function(o) {
      assert(o >= 1 && o <= 3);
      visited[o] = true;
    });
    assert(visited[1]);
    assert(!visited[2]);
    assert(visited[3]);
  });

  it ('can tell us when an operation is still pending', function() {
    operationList.operationEnded(2);
    assert(operationList.operationIsStillPending(1));
    assert(!operationList.operationIsStillPending(2));
    assert(operationList.operationIsStillPending(3));
  });

  it ('can remove all operations and add one back', function() {
    var done;
    operationList.operationEnded(1);
    operationList.operationStarted(4);
    operationList.operationEnded(2);
    operationList.operationEnded(3);
    operationList.popAllPendingOperations(function(o) {
      assert(o === 4);
      done = true;
    });
    assert(done);

  });

});

