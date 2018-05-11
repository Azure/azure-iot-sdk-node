// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
/*jshint esversion: 6 */

var assert = require('chai').assert;
var sinon = require('sinon');
var Client = require('../lib/device_client').Client;
var ModuleClient = require('../lib/module_client').ModuleClient;
var InternalClient = require('../lib/internal_client').InternalClient;
var FakeTransport = require('./fake_transport');
var Message = require('azure-iot-common').Message;
var NoRetry = require('azure-iot-common').NoRetry;
var errors = require('azure-iot-common').errors;

var fakeMethodName = '__FAKE_METHOD_NAME__';
var fakeSignature = '__FAKE_SIG__';
var fakeMessage = new Message('__FAKE__');
var fakeOptions = { fake: true };
var fakeStreamName = '__FAKE_STREAM_NAME__';
var fakeStream = '__FAKE_STREAM__';
var fakeStreamLength = fakeStream.length;
var fakeOutputName = '__FAKE_OUTPUT__';
var fakeEventName = '__FAKE_EVENT__';
var fakeEventListener = function() {};

var supportedMethods = {
  Client: {
    // common
    removeListener: (instance, done) => { instance.addListener(fakeEventName, fakeEventListener); instance.removeListener(fakeEventName, fakeEventListener); setTimeout(done, 400); },
    onDeviceMethod: (instance, done) => { instance.onDeviceMethod(fakeMethodName, (request,response) => {}); done(); },
    updateSharedAccessSignature: (instance, done) => instance.updateSharedAccessSignature(fakeSignature, done),
    open: (instance, done) => instance.open(done),
    close: (instance, done) => instance.close(done),
    setOptions: (instance, done) => instance.setOptions(fakeOptions, done),
    complete: (instance, done) => instance.complete(fakeMessage, done),
    reject: (instance, done) => instance.reject(fakeMessage, done),
    abandon: (instance, done) => instance.abandon(fakeMessage, done),
    getTwin: (instance, done) => instance.getTwin(done),
    setRetryPolicy: (instance, done) => { instance.setRetryPolicy(new NoRetry()); done(); },
    // unique to Client
    uploadToBlob: (instance, done) => instance.uploadToBlob(fakeStreamName, fakeStream, fakeStreamLength, done),
    setTransportOptions: (instance, done) => instance.setTransportOptions(fakeOptions, done),
    sendEvent: (instance, done) => instance.sendEvent(fakeMessage, done),
    sendEventBatch: (instance, done) => instance.sendEventBatch([fakeMessage], done),
  },
  ModuleClient: {
    // common
    removeListener: (instance, done) => { instance.addListener(fakeEventName, fakeEventListener); instance.removeListener(fakeEventName, fakeEventListener); setTimeout(done, 400); },
    onDeviceMethod: (instance, done) => { instance.onDeviceMethod(fakeMethodName, (request,response) => {}); done(); },
    updateSharedAccessSignature: (instance, done) => instance.updateSharedAccessSignature(fakeSignature, done),
    open: (instance, done) => instance.open(done),
    close: (instance, done) => instance.close(done),
    setOptions: (instance, done) => instance.setOptions(fakeOptions, done),
    complete: (instance, done) => instance.complete(fakeMessage, done),
    reject: (instance, done) => instance.reject(fakeMessage, done),
    abandon: (instance, done) => instance.abandon(fakeMessage, done),
    getTwin: (instance, done) => instance.getTwin(done),
    setRetryPolicy: (instance, done) => { instance.setRetryPolicy(new NoRetry()); done(); },
    // unique to ModuleClient
    sendOutputEvent: (instance, done) => instance.sendOutputEvent(fakeOutputName, fakeMessage, done),
    sendOutputEventBatch: (instance, done) => instance.sendOutputEventBatch(fakeOutputName, [fakeMessage], done),
  }
};

var unsupportedEvents = {
  Client: [ 'inputMessage' ],
  ModuleClient: [ 'message' ]
};

[Client, ModuleClient].forEach(function(objectUnderTest) {
  describe(objectUnderTest.name, function() {
    this.timeout(1000);

    var client;
    var fakeConnectionString = "HostName=_H_;DeviceId=_D_;SharedAccessKey=_K_";

    beforeEach(function() {
      client = new objectUnderTest.fromConnectionString(fakeConnectionString, FakeTransport);
      if (client._internalClient.blobUploadClient) {
        client._internalClient.blobUploadClient.uploadToBlob = sinon.stub().callsArg(3);
      }
    });

    afterEach(function() {
      client = null;
    });

    it ('constructor creates an InternalClient object', function() {
      assert.instanceOf(client._internalClient, InternalClient);
    });

    var methods = supportedMethods[objectUnderTest.name];
    Object.keys(methods).forEach((fname) => {
      it(fname + ' calls InternalBase.' + fname, function(done) {
        sinon.spy(client, fname);
        sinon.spy(client._internalClient, fname);
        methods[fname](client, function() {
          assert(client._internalClient[fname].called);
          assert.deepEqual(client[fname].firstCall.args, client._internalClient[fname].firstCall.args);
          done();
        });
      });
    });

    unsupportedEvents[objectUnderTest.name].forEach(function(eventName) {
      it ('on(\'' + eventName + '\' throws ArgumentError', function() {
        assert.throws(function() {
          client.emit('newListener', eventName, function() {});
        }, errors.ArgumentError);
      });
    });

  });
});