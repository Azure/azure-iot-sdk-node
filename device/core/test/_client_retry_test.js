// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');

var Client = require('../lib/client.js').Client;
var results = require('azure-iot-common').results;
var Message = require('azure-iot-common').Message;
var errors = require('azure-iot-common').errors;
var ExponentialBackOffWithJitter = require('azure-iot-common').ExponentialBackOffWithJitter;


describe('Client Retry Logic', function () {
  [
    {
      funcName: 'sendEvent',
      funcParam: new Message('foo')
    },
    {
      funcName: 'sendEventBatch',
      funcParam: [new Message('1'), new Message('2')]
    },
    {
      funcName: 'updateSharedAccessSignature',
      funcParam: 'fakeSasToken'
    },
    {
      funcName: 'complete',
      funcParam: new Message('foo')
    },
    {
      funcName: 'reject',
      funcParam: new Message('foo')
    },
    {
      funcName: 'abandon',
      funcParam: new Message('foo')
    },
    {
      funcName: 'setOptions',
      funcParam: {}
    }
  ].forEach(function (testConfig) {
    it('retries to ' + testConfig.funcName, function(testCallback) {
      var fakeTransport = new EventEmitter();
      var fakeBlobClient = { updateSharedAccessSignature: function () {} };
      fakeTransport[testConfig.funcName] = sinon.stub().callsArgWith(1, new errors.TimeoutError('failed'));

      var client = new Client(fakeTransport, null, fakeBlobClient);
      client._maxOperationTimeout = 100;
      client[testConfig.funcName](new Message('foo'), function (err) {
        assert(fakeTransport[testConfig.funcName].callCount >= 2);
        testCallback();
      });
    });
  });

  it('retries to open/connect', function(testCallback) {
    var fakeTransport = new EventEmitter();
    var fakeBlobClient = { updateSharedAccessSignature: function () {} };
    fakeTransport.connect = sinon.stub().callsArgWith(0, new errors.TimeoutError('failed'));

    var client = new Client(fakeTransport, null, fakeBlobClient);
    client._maxOperationTimeout = 100;
    client.open(function (err) {
      assert(fakeTransport.connect.callCount >= 2);
      testCallback();
    });
  });

  it('retries to enable device methods', function(testCallback) {
    var fakeTransport = new EventEmitter();
    var fakeBlobClient = { updateSharedAccessSignature: function () {} };
    fakeTransport.onDeviceMethod = sinon.stub();
    fakeTransport.enableMethods = sinon.stub().callsArgWith(0, new errors.TimeoutError('failed'));

    var client = new Client(fakeTransport, null, fakeBlobClient);
    client._maxOperationTimeout = 100;
    client.on('error', (err) => {
      assert(fakeTransport.onDeviceMethod.calledOnce);
      assert(fakeTransport.enableMethods.callCount >= 2);
      testCallback();
    });
    client.onDeviceMethod('methodName', function () {});
  });


  it('retries to receive cloud-to-device message', function(testCallback) {
    var fakeTransport = new EventEmitter();
    var fakeBlobClient = { updateSharedAccessSignature: function () {} };
    sinon.spy(fakeTransport, 'on');
    fakeTransport.enableC2D = sinon.stub().callsArgWith(0, new errors.TimeoutError('failed'));

    var client = new Client(fakeTransport, null, fakeBlobClient);
    client._maxOperationTimeout = 100;
    client.on('error', (err) => {
      assert(fakeTransport.enableC2D.callCount >= 2);
      testCallback();
    });
    client.on('message', function() {});
  })
});