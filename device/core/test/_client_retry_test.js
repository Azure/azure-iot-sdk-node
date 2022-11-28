// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let EventEmitter = require('events').EventEmitter;
let assert = require('chai').assert;
let sinon = require('sinon');

let DeviceClient = require('../dist/device_client.js').Client;
let ModuleClient = require('../dist/module_client.js').ModuleClient;
let Message = require('azure-iot-common').Message;
let errors = require('azure-iot-common').errors;

describe('DeviceClient Retry Logic', function () {
  it('retries to receive cloud-to-device message', function (testCallback) {
    let fakeTransport = new EventEmitter();
    let fakeBlobClient = { updateSharedAccessSignature: function () {} };
    sinon.spy(fakeTransport, 'on');
    fakeTransport.enableC2D = sinon.stub().callsArgWith(0, new errors.TimeoutError('failed'));

    let client = new DeviceClient(fakeTransport, null, fakeBlobClient);
    client._maxOperationTimeout = 100;
    client.on('error', (_err) => {
      assert(fakeTransport.enableC2D.callCount >= 2);
      testCallback();
    });
    client.on('message', function () {});
  });
});

function DeviceClientCtor(fakeTransport) {
  return new DeviceClient(fakeTransport, null, { updateSharedAccessSignature: sinon.stub(), setOptions: sinon.stub() });
}

function ModuleClientCtor(fakeTransport) {
  return new ModuleClient(fakeTransport, { setOptions: sinon.stub() });
}

[ {
    ctor: DeviceClientCtor,
    onMethodFunc: 'onDeviceMethod'
  },{
    ctor: ModuleClientCtor,
    onMethodFunc: 'onMethod'
  }].forEach(function (testClient) {
  describe(testClient.ctor.name + ' Retry Logic', function () {
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
      it('retries to ' + testConfig.funcName, function (testCallback) {
        let fakeTransport = new EventEmitter();
        fakeTransport[testConfig.funcName] = sinon.stub().callsArgWith(1, new errors.TimeoutError('failed'));

        let client = testClient.ctor(fakeTransport);
        client._maxOperationTimeout = 100;
        client[testConfig.funcName](testConfig.funcParam, function () {
          assert(fakeTransport[testConfig.funcName].callCount >= 2);
          testCallback();
        });
      });
    });

    it('retries to open/connect', function (testCallback) {
      let fakeTransport = new EventEmitter();
      fakeTransport.connect = sinon.stub().callsArgWith(0, new errors.TimeoutError('failed'));

      let client = testClient.ctor(fakeTransport);
      client._maxOperationTimeout = 100;
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      client.open(function (_err) {
        assert(fakeTransport.connect.callCount >= 2);
        testCallback();
      });
    });

    it('retries to enable device methods', function (testCallback) {
      let fakeTransport = new EventEmitter();
      fakeTransport.onDeviceMethod = sinon.stub();
      fakeTransport.enableMethods = sinon.stub().callsArgWith(0, new errors.TimeoutError('failed'));

      let client = testClient.ctor(fakeTransport);
      client._maxOperationTimeout = 100;
      client.on('error', (_err) => {
        assert(fakeTransport.onDeviceMethod.calledOnce);
        assert(fakeTransport.enableMethods.callCount >= 2);
        testCallback();
      });
      client[testClient.onMethodFunc]('methodName', function () {});
    });
  });
});
