// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var Twin = require('../lib/twin.js').Twin;
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var errors = require('azure-iot-common').errors;
var sinon = require('sinon');
var _ = require('lodash');

describe('Twin', function () {
  var fakeTransport, fakeTwin, fakeRetryPolicy;

  beforeEach(function () {
    fakeTwin = {
      desired: {
        key: 'value'
      },
      reported: {
        key: 'value'
      }
    };

    fakeRetryPolicy = {
      shouldRetry: function () { return false; },
      getNextRetryTimeout: function () { return 0; }
    };

    fakeTransport = new EventEmitter();
    fakeTransport.getTwin = sinon.stub().callsArgWith(0, null, fakeTwin);
    fakeTransport.updateTwinReportedProperties = sinon.stub().callsArg(1);
    fakeTransport.enableTwinDesiredPropertiesUpdates = sinon.stub().callsArg(0);
    sinon.spy(fakeTransport, 'on');
  });

  describe('#constructor', function () {
    /*Tests_SRS_NODE_DEVICE_TWIN_16_001: [The `Twin` constructor shall subscribe to the `twinDesiredPropertiesUpdate` event off the `transport` object.]*/
    it('subscribes to the twinDesiredPropertiesUpdate event on the transport', function () {
      var twin = new Twin(fakeTransport);
      assert.isTrue(fakeTransport.on.calledOnce);
      assert.isTrue(fakeTransport.on.calledWith('twinDesiredPropertiesUpdate'));
    });
  });

  describe('#get', function () {
    /*Tests_SRS_NODE_DEVICE_TWIN_16_002: [The `get` method shall call the `getTwin` method of the `Transport` object with a callback.]*/
    it('calls getTwin on the transpport', function () {
      var twin = new Twin(fakeTransport, fakeRetryPolicy, 0);
      twin.get(function () {});
      assert.isTrue(fakeTransport.getTwin.calledOnce);
    });

    /*Tests_SRS_NODE_DEVICE_TWIN_16_004: [If the callback passed to the `getTwin` method is called with no error and a `TwinProperties` object, these properties shall be merged with the current instance properties.]*/
    /*Tests_SRS_NODE_DEVICE_TWIN_16_005: [Once the properties have been merged the `callback` method passed to the call to `get` shall be called with a first argument that is `null` and a second argument that is the current `Twin` instance (`this`).]*/
    it('calls its callback with the twin after it is merged', function (testCallback) {
      var twin = new Twin(fakeTransport, fakeRetryPolicy, 0);
      twin.get(function (err, twin) {
        assert.deepEqual(twin.properties.desired, fakeTwin.desired);
        assert.deepEqual(twin.properties.reported.key, fakeTwin.reported.key);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_TWIN_16_003: [If the callback passed to the `getTwin` method is called with an error, the `callback` passed to the call to the `get` method shall be called with that error.]*/
    it('calls its callback with an error if the transport encounters an error', function (testCallback) {
      var fakeError = new Error('fake');
      fakeTransport.getTwin = sinon.stub().callsArgWith(0, fakeError);
      var twin = new Twin(fakeTransport, fakeRetryPolicy, 0);
      twin.get(function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_TWIN_16_006: [For each desired property that is part of the `TwinProperties` object received, an event named after the path to this property shall be fired and passed the property value as argument.]*/
    it('fires events for the new properties that have been merged', function (testCallback) {
      var twin = new Twin(fakeTransport, fakeRetryPolicy, 0);
      var genericEventReceived = false;
      var specificEventReceived = false;
      twin.on('properties.desired', function (delta) {
        assert.deepEqual(delta, fakeTwin.desired);
        genericEventReceived = true;
        if (genericEventReceived && specificEventReceived) {
          testCallback();
        }
      });
      twin.on('properties.desired.key', function (delta) {
        assert.strictEqual(delta, fakeTwin.desired.key);
        specificEventReceived = true;
        if (genericEventReceived && specificEventReceived) {
          testCallback();
        }
      });

      twin.get(function () {});
    });
  });

  describe('properties.reported.update', function () {
    /*Tests_SRS_NODE_DEVICE_TWIN_16_007: [The `update` method shall call the `updateReportedProperties` method of the `Transport` object and pass it the patch object and a callback accepting an error as argument.]*/
    it('calls updateTwinReportedProperties on the transport', function (testCallback) {
      var twin = new Twin(fakeTransport, fakeRetryPolicy, 0);
      var fakePatch = { key: 'value' };
      twin.get(function () {
        twin.properties.reported.update(fakePatch, function () {});
        assert.isTrue(fakeTransport.updateTwinReportedProperties.calledOnce);
        assert.isTrue(fakeTransport.updateTwinReportedProperties.calledWith(fakePatch));
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_TWIN_16_008: [If the callback passed to the transport is called with an error, the `callback` argument of the `update` method shall be called with that error.]*/
    it('calls its callback with an error if updateTwinReportedProperties fails', function (testCallback) {
      var fakeError = new Error('fake');
      fakeTransport.updateTwinReportedProperties = sinon.stub().callsArgWith(1, fakeError);

      var twin = new Twin(fakeTransport, fakeRetryPolicy, 0);
      twin.get(function () {
        twin.properties.reported.update({ reported: 'fake' }, function (err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_DEVICE_TWIN_16_009: [Once the properties have been merged the `callback` argument of the `update` method shall be called with no argument.]*/
    it('calls its callback with no arguments if the update succeeds', function (testCallback) {
      var twin = new Twin(fakeTransport, fakeRetryPolicy, 0);
      twin.get(function () {
        twin.properties.reported.update({ reported: 'fake' }, function (err) {
          assert.isNull(err);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_DEVICE_TWIN_18_031: [If the callback passed to the transport is called with no error, the  `properties.reported.update` shall merge the contents of the patch object into `properties.reported`]*/
    it('merges the patch in the reported properties', function (testCallback) {
      var twin = new Twin(fakeTransport, fakeRetryPolicy, 0);
      var fakePatch = { key: 'fake' };
      twin.get(function () {
        twin.properties.reported.update(fakePatch, function (err) {
          assert.deepEqual(twin.properties.reported.key, fakePatch.key);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_DEVICE_TWIN_18_032: [When merging the patch, if any properties are set to `null`, `properties.reported.update` shall delete that property from `properties.reported`.]*/
    it('deletes reported properties set to null', function (testCallback) {
      var twin = new Twin(fakeTransport);
      var fakePatch = {
        deleteMe: null
      };
      twin.get(function () {
        twin.properties.reported.deleteMe = 'fake';
        twin.properties.reported.update(fakePatch, function (err) {
          assert.isUndefined(twin.properties.reported.deleteMe);
          testCallback();
        });
      });
    });
  });

  describe('on(\'properties.desired[.path]\'', function () {
    /*Tests_SRS_NODE_DEVICE_TWIN_16_010: [When a listener is added for the first time on an event which name starts with `properties.desired`, the twin shall call the `enableTwinDesiredPropertiesUpdates` method of the `Transport` object.]*/
    it('calls enableTwinDesiredPropertiesUpdates on the transport', function () {
      var twin = new Twin(fakeTransport, fakeRetryPolicy, 0);
      twin.on('properties.desired', function () {});
      assert.isTrue(fakeTransport.enableTwinDesiredPropertiesUpdates.calledOnce);
    });

    /*Tests_SRS_NODE_DEVICE_TWIN_16_011: [If the callback passed to the transport is called with an error, that error shall be emitted by the Twin object.]*/
    it('emits an error if the call to enableTwinDesiredPropertiesUpdates fails', function (testCallback) {
      var fakeError = new Error('fake');
      fakeTransport.enableTwinDesiredPropertiesUpdates = sinon.stub().callsArgWith(0, fakeError);
      var twin = new Twin(fakeTransport, fakeRetryPolicy, 0);
      twin.on('error', function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
      twin.on('properties.desired', function () {});
    });

    /*Tests_SRS_NODE_DEVICE_TWIN_18_045: [If a property is already set when a handler is added for that property, the `Twin` object shall fire a property changed event for the property.]*/
    /*Tests_SRS_NODE_DEVICE_TWIN_16_012: [When a `twinDesiredPropertiesUpdates` event is emitted by the transport, the property patch passed as argument to the event handler shall be merged with the current desired properties.]*/
    /*Tests_SRS_NODE_DEVICE_TWIN_16_013: [Recursively for each desired property that is part of the patch received, an event named using the convention `properties.desired[.path]` shall be fired with an argument containing the value of the property.]*/
    it('emits an event for each property that changed', function (testCallback) {
      var fullPatchReceived = false;
      var prop1Received = false;
      var prop2Received = false;
      var prop2BarReceived = false;

      var fakePatch = {
        prop1: 'foo',
        prop2: {
          bar: 'baz'
        }
      };

      function verifyAndCompleteTest() {
        if (fullPatchReceived && prop1Received && prop2Received && prop2BarReceived) {
          twin.removeAllListeners();
          testCallback();
        }
      }

      var twin = new Twin(fakeTransport, fakeRetryPolicy, 0);
      twin.get(function () {
        twin.on('properties.desired', function (delta) {
          assert.deepEqual(delta.prop1, fakePatch.prop1);
          assert.deepEqual(delta.prop2, fakePatch.prop2);
          fullPatchReceived = true;
          verifyAndCompleteTest();
        });

        twin.on('properties.desired.prop1', function (delta) {
          assert.strictEqual(delta, fakePatch.prop1);
          prop1Received = true;
          verifyAndCompleteTest();
        });

        twin.on('properties.desired.prop2', function (delta) {
          assert.strictEqual(delta, fakePatch.prop2);
          prop2Received = true;
          verifyAndCompleteTest();
        });

        twin.on('properties.desired.prop2.bar', function (delta) {
          assert.strictEqual(delta, fakePatch.prop2.bar);
          prop2BarReceived = true;
          verifyAndCompleteTest();
        });

        fakeTransport.emit('twinDesiredPropertiesUpdate', fakePatch);
      });
    });
  });

  describe('#setRetryPolicy', function () {
    /*Tests_SRS_NODE_DEVICE_TWIN_16_014: [the `retryPolicy` object passed to the `setRetryPolicy` method shall be used to retry any subsequent operation (`get`, `properties.reported.update` or `enableTwinDesiredPropertiesUpdates`).]*/
    it('uses the retry policy passed as an argument in the subsequent calls', function (testCallback) {
      var testPolicy = {
        shouldRetry: sinon.stub().returns(false),
        nextRetryTimeout: sinon.stub().returns(-1)
      };
      fakeTransport.getTwin = sinon.stub().callsArgWith(0, new Error('fake'));

      var twin = new Twin(fakeTransport, fakeRetryPolicy);
      twin.setRetryPolicy(testPolicy);
      twin.get(function() {
        assert.isTrue(testPolicy.shouldRetry.calledOnce);
        assert.isTrue(testPolicy.nextRetryTimeout.notCalled); //shouldRetry being false, nextRetryTimeout should not have been called.
        assert.isTrue(fakeTransport.getTwin.calledOnce);
        testCallback();
      });
    });
  });
});
