// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const assert = require('chai').assert;
const EventEmitter = require('events').EventEmitter;

const MqttTwinClient = require('../dist/mqtt_twin_client.js').MqttTwinClient;
const MqttProvider = require('../../../../common/transport/mqtt/test/_fake_mqtt.js').FakeMqtt;
const sinon = require('sinon');

let provider;
let receiver;

const _validateSubscription = function (shortname, topic, done) {
  receiver.on(shortname, function () {});
  process.nextTick(function () {
    assert(provider.subscribe.withArgs(topic).calledOnce);
    done();
  });
};

const _validateUnsubscribe = function (shortname, topic, done) {
  const func1 = function () { };
  const func2 = function () { };
  receiver.on(shortname, func1);
  receiver.on(shortname, func2);
  process.nextTick(function () {
    receiver.removeListener(shortname, func1);
    assert(provider.unsubscribe.withArgs(topic).notCalled);
    receiver.removeListener(shortname, func2);
    process.nextTick(function () {
      assert(provider.unsubscribe.withArgs(topic).calledOnce);
      done();
    });
  });
};

const _validateEventFires = function (shortname, topic, done) {
  const handler = sinon.spy();
  receiver.on(shortname, handler);
  provider.fakeMessageFromService(topic, 'fake_body');
  process.nextTick(function () {
    assert(handler.calledOnce);
    provider.fakeMessageFromService(topic, 'fake_body');
    process.nextTick(function () {
      assert(handler.calledTwice);
      done();
    });
  });
};

describe('MqttTwinClient', function () {
  beforeEach(function (done) {
    provider = new MqttProvider();
    receiver = new MqttTwinClient(provider);
    done();
  });

  describe('#constructor', function () {
    /* Tests_SRS_NODE_DEVICE_MQTT_TWIN_RECEIVER_18_001: [The `MqttTwinClient` constructor shall accept a `client` object]*/
    it ('accepts a config object', function () {
      assert.equal(receiver._mqtt, provider);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_001: [The `MqttTwinClient` constructor shall immediately subscribe to the `message` event of the `client` object.]*/
    it('subscribes to the message event', function () {
      const fakeClient = new EventEmitter();
      sinon.spy(fakeClient, 'on');
      const _twinClient = new MqttTwinClient(fakeClient);
      assert.isTrue(fakeClient.on.calledWith('message'));
    });
  });

  describe('#getTwin', function () {
    let fakeMqttBase;

    beforeEach(function () {
      fakeMqttBase = new EventEmitter();
      fakeMqttBase.connect = sinon.stub().callsArg(1);
      fakeMqttBase.disconnect = sinon.stub().callsArg(0);
      fakeMqttBase.publish = sinon.stub().callsArg(3);
      fakeMqttBase.subscribe = sinon.stub().callsArg(2);
      fakeMqttBase.unsubscribe = sinon.stub().callsArg(1);
      fakeMqttBase.updateSharedAccessSignature = sinon.stub().callsArg(1);
    });

    afterEach(function () {
      fakeMqttBase = null;
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_002: [The `getTwin` method shall subscribe to the `$iothub/twin/res/#` topic if not already subscribed.]*/
    it('subscribes to the response topic', function () {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.getTwin(function () {});
      assert.isTrue(fakeMqttBase.subscribe.calledOnce);
      assert.isTrue(fakeMqttBase.subscribe.calledWith('$iothub/twin/res/#'));
    });

    it('does not subscribe twice to the response topic', function () {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.getTwin(function () {});
      assert.isTrue(fakeMqttBase.subscribe.calledOnce);
      twinClient.getTwin(function () {});
      assert.isTrue(fakeMqttBase.subscribe.calledOnce);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_009: [If subscribing to the response topic fails, the callback shall be called with the translated version of the error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
    it('calls its callback with an error if subscribing fails', function (testCallback) {
      const fakeError = new Error('failed to subscribe');
      fakeMqttBase.subscribe = sinon.stub().callsArgWith(2, fakeError);
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.getTwin(function (err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err.transportError, fakeError);
        assert.isTrue(fakeMqttBase.subscribe.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_003: [The `getTwin` method shall publish the request message on the `$iothub/twin/get/?rid=<requestId>` topic using the `MqttBase.publish` method.]*/
    it('publishes the request on the $iothub/twin/get/ topic', function () {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.getTwin(function () {});
      assert.isTrue(fakeMqttBase.publish.calledOnce);
      assert.strictEqual(fakeMqttBase.publish.firstCall.args[0].indexOf('$iothub/twin/GET/'), 0);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_004: [The `getTwin` method shall publish the request message with QoS=0, DUP=0 and Retain=0.]*/
    it('publishes the request with qos = 0 and retail = false', function () {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.getTwin(function () {});
      assert.strictEqual(fakeMqttBase.publish.firstCall.args[2].qos, 0);
      assert.strictEqual(fakeMqttBase.publish.firstCall.args[2].retain, false);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_005: [The `requestId` property in the topic querystring should be set to a unique identifier that will be used to identify the response later on.]*/
    it('publishes the request with a uuid  that is a requestId', function () {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.getTwin(function () {});
      const firstRequestId = fakeMqttBase.publish.firstCall.args[0].split('=')[1];
      twinClient.getTwin(function () {});
      const secondRequestId = fakeMqttBase.publish.secondCall.args[0].split('=')[1];
      assert.notEqual(firstRequestId, secondRequestId);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_006: [The request message published by the `getTwin` method shall have an empty body.]*/
    it('publishes the request with an empty body', function () {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.getTwin(function () {});
      assert.strictEqual(fakeMqttBase.publish.firstCall.args[1], ' ');
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_007: [When a message is received on the response topic with an `$rid` property in the query string of the topic matching the one that was sent on the request topic, the `callback` shall be called with a `null` error object and the parsed content of the response message.]*/
    it('calls its callback with the response when it is received', function (testCallback) {
      const fakeTwin = {
        fake: 'twin'
      };

      fakeMqttBase.publish = sinon.stub().callsFake(function (topic, body, options, callback) {
        const requestId = topic.split('=')[1];
        const fakeResponseTopic = '$iothub/twin/res/200?$rid=' + requestId;
        callback();
        fakeMqttBase.emit('message', fakeResponseTopic, JSON.stringify(fakeTwin));
      });

      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.getTwin(function (err, twin) {
        assert.isNull(err);
        assert.deepEqual(twin, fakeTwin);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_008: [If an error happen while publishing the request message, the `callback` shall be called with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
    it('calls its callback with an error if publish fails', function (testCallback) {
      const fakeError = new Error('failed to publish');
      fakeMqttBase.publish = sinon.stub().callsArgWith(3, fakeError);
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.getTwin(function (err, _twin) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err.transportError, fakeError);
        testCallback();
      });
    });
  });

  describe('#updateTwinReportedProperties', function () {
    let fakeMqttBase;

    beforeEach(function () {
      fakeMqttBase = new EventEmitter();
      fakeMqttBase.connect = sinon.stub().callsArg(1);
      fakeMqttBase.disconnect = sinon.stub().callsArg(0);
      fakeMqttBase.publish = sinon.stub().callsArg(3);
      fakeMqttBase.subscribe = sinon.stub().callsArg(2);
      fakeMqttBase.unsubscribe = sinon.stub().callsArg(1);
      fakeMqttBase.updateSharedAccessSignature = sinon.stub().callsArg(1);
    });

    afterEach(function () {
      fakeMqttBase = null;
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_011: [The `updateTwinReportedProperties` method shall subscribe to the `$iothub/twin/res/#` topic if not already subscribed.]*/
    it('subscribes to the response topic', function () {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.updateTwinReportedProperties({ fake: 'patch' }, function () {});
      assert.isTrue(fakeMqttBase.subscribe.calledOnce);
      assert.isTrue(fakeMqttBase.subscribe.calledWith('$iothub/twin/res/#'));
    });

    it('does not subscribe twice to the response topic', function () {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.updateTwinReportedProperties({ fake: 'patch' }, function () {});
      assert.isTrue(fakeMqttBase.subscribe.calledOnce);
      twinClient.updateTwinReportedProperties({ fake: 'patch' }, function () {});
      assert.isTrue(fakeMqttBase.subscribe.calledOnce);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_012: [If subscribing to the response topic fails, the callback shall be called with the translated version of the error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
    it('calls its callback with an error if subscribing fails', function (testCallback) {
      const fakeError = new Error('failed to subscribe');
      fakeMqttBase.subscribe = sinon.stub().callsArgWith(2, fakeError);
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.updateTwinReportedProperties({ fake: 'patch' }, function (err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err.transportError, fakeError);
        assert.isTrue(fakeMqttBase.subscribe.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_013: [The `updateTwinReportedProperties` method shall publish the request message on the `$iothub/twin/patch/properties/reported/?rid=<requestId>` topic using the `MqttBase.publish` method.]*/
    it('publishes the request on the $iothub/twin/patch/properties/reported topic', function () {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.updateTwinReportedProperties({ fake: 'patch' }, function () {});
      assert.isTrue(fakeMqttBase.publish.calledOnce);
      assert.strictEqual(fakeMqttBase.publish.firstCall.args[0].indexOf('$iothub/twin/PATCH/properties/reported/'), 0);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_014: [The `updateTwinReportedProperties` method shall publish the request message with QoS=0, DUP=0 and Retain=0.]*/
    it('publishes the request with qos = 0 and retail = false', function () {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.updateTwinReportedProperties({ fake: 'patch' }, function () {});
      assert.strictEqual(fakeMqttBase.publish.firstCall.args[2].qos, 0);
      assert.strictEqual(fakeMqttBase.publish.firstCall.args[2].retain, false);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_015: [The `requestId` property in the topic querystring should be set to a unique identifier that will be used to identify the response later on.]*/
    it('publishes the request with a uuid that is a requestId', function () {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.updateTwinReportedProperties({ fake: 'patch' }, function () {});
      const firstRequestId = fakeMqttBase.publish.firstCall.args[0].split('=')[1];
      twinClient.updateTwinReportedProperties({ fake: 'patch' }, function () {});
      const secondRequestId = fakeMqttBase.publish.secondCall.args[0].split('=')[1];
      assert.notEqual(firstRequestId, secondRequestId);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_016: [The body of the request message published by the `updateTwinReportedProperties` method shall be a JSON string of the reported properties patch.]*/
    it('publishes the request with a body that is the stringified version of the patch', function () {
      const fakePatch = { fake: 'patch' };
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.updateTwinReportedProperties(fakePatch, function () {});
      assert.strictEqual(fakeMqttBase.publish.firstCall.args[1], JSON.stringify(fakePatch));
    });


    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_41_001: [The `callback` shall be called with a Error object containing the error message if the `parsedMessage` contains an errorCode.]*/
    it('calls its callback with an error when the response contains an errorcode', function (testCallback) {
      let fakeTwin = {
        fake: 'twin'
      };

      fakeMqttBase.publish = sinon.stub().callsFake(function (topic, body, options, callback) {
        const requestId = topic.split('=')[1];
        const fakeResponseTopic = '$iothub/twin/res/200?$rid=' + requestId;
        callback();
        fakeMqttBase.emit('message', fakeResponseTopic, body);
      });

      const twinClient = new MqttTwinClient(fakeMqttBase);
      fakeTwin = {
        fake: 'patch',
        errorCode: 'fakeErrorCode'
      };
      twinClient.updateTwinReportedProperties(fakeTwin, function (err, twin) {
        assert.instanceOf(err, Error);
        assert.isUndefined(twin);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_017: [When a message is received on the response topic with an `$rid` property in the query string of the topic matching the one that was sent on the request topic, the `callback` shall be called with a `null` error object.]*/
    it('calls its callback with the response when it is received', function (testCallback) {
      const fakeTwin = {
        fake: 'twin'
      };

      fakeMqttBase.publish = sinon.stub().callsFake(function (topic, body, options, callback) {
        const requestId = topic.split('=')[1];
        const fakeResponseTopic = '$iothub/twin/res/200?$rid=' + requestId;
        callback();
        fakeMqttBase.emit('message', fakeResponseTopic, JSON.stringify(fakeTwin));
      });

      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.updateTwinReportedProperties({ fake: 'patch' }, function (err, twin) {
        assert.isNull(err);
        assert.deepEqual(twin, fakeTwin);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_018: [If an error happen while publishing the request message, the `callback` shall be called with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
    it('calls its callback with an error if publish fails', function (testCallback) {
      const fakeError = new Error('failed to publish');
      fakeMqttBase.publish = sinon.stub().callsArgWith(3, fakeError);
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.updateTwinReportedProperties({ fake: 'patch' }, function (err, _twin) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err.transportError, fakeError);
        testCallback();
      });
    });
  });

  describe('#enableTwinDesiredPropertiesUpdates', function () {
    let fakeMqttBase;

    beforeEach(function () {
      fakeMqttBase = new EventEmitter();
      fakeMqttBase.connect = sinon.stub().callsArg(1);
      fakeMqttBase.disconnect = sinon.stub().callsArg(0);
      fakeMqttBase.publish = sinon.stub().callsArg(3);
      fakeMqttBase.subscribe = sinon.stub().callsArg(2);
      fakeMqttBase.unsubscribe = sinon.stub().callsArg(1);
      fakeMqttBase.updateSharedAccessSignature = sinon.stub().callsArg(1);
    });

    afterEach(function () {
      fakeMqttBase = null;
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_019: [The `enableTwinDesiredPropertiesUpdates` shall subscribe to the `$iothub/twin/PATCH/properties/desired/#` topic using the `MqttBase.subscribe` method if it hasn't been subscribed to already.]*/
    it('subscribes to the desired properties updates topic', function () {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.enableTwinDesiredPropertiesUpdates(function () {});
      assert.isTrue(fakeMqttBase.subscribe.calledOnce);
      assert.isTrue(fakeMqttBase.subscribe.calledWith('$iothub/twin/PATCH/properties/desired/#'));
    });

    it('subscribes to the desired properties updates topic only once', function () {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.enableTwinDesiredPropertiesUpdates(function () {});
      assert.isTrue(fakeMqttBase.subscribe.calledOnce);
      twinClient.enableTwinDesiredPropertiesUpdates(function () {});
      assert.isTrue(fakeMqttBase.subscribe.calledOnce);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_020: [The `enableTwinDesiredPropertiesUpdates` shall call its callback with no arguments if the subscription is successful.]*/
    it('calls its callback with no argument if the subscription is successful', function (testCallback) {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.enableTwinDesiredPropertiesUpdates(testCallback);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_021: [if subscribing fails with an error the `enableTwinDesiredPropertiesUpdates` shall call its callback with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
    it('calls its callback with an error if subscribing fails', function (testCallback) {
      const fakeError = new Error('fake');
      fakeMqttBase.subscribe = sinon.stub().callsArgWith(2, fakeError);
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.enableTwinDesiredPropertiesUpdates(function (err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err.transportError, fakeError);
        testCallback();
      });
    });
  });

  describe('#disableTwinDesiredPropertiesUpdates', function () {
    let fakeMqttBase;

    beforeEach(function () {
      fakeMqttBase = new EventEmitter();
      fakeMqttBase.connect = sinon.stub().callsArg(1);
      fakeMqttBase.disconnect = sinon.stub().callsArg(0);
      fakeMqttBase.publish = sinon.stub().callsArg(3);
      fakeMqttBase.subscribe = sinon.stub().callsArg(2);
      fakeMqttBase.unsubscribe = sinon.stub().callsArg(1);
      fakeMqttBase.updateSharedAccessSignature = sinon.stub().callsArg(1);
    });

    afterEach(function () {
      fakeMqttBase = null;
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_022: [The `disableTwinDesiredPropertiesUpdates` shall unsubscribe from the `$iothub/twin/PATCH/properties/desired/#` topic using the `MqttBase.unsubscribe` method if it hasn't been unsubscribed from already.]*/
    it('unsubscribes from the desired properties update topic', function (testCallback) {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        twinClient.disableTwinDesiredPropertiesUpdates(function () {});
        assert.isTrue(fakeMqttBase.unsubscribe.calledOnce);
        assert.isTrue(fakeMqttBase.unsubscribe.calledWith('$iothub/twin/PATCH/properties/desired/#'));
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_023: [The `disableTwinDesiredPropertiesUpdates` shall call its callback with no arguments if the unsubscribe is successful.]*/
    it('calls its callback with no arguments if successful', function (testCallback) {
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        twinClient.disableTwinDesiredPropertiesUpdates(testCallback);
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_024: [if unsubscribing fails with an error the `disableTwinDesiredPropertiesUpdates` shall call its callback with the translated version of this error obtained by using the `translateError` method of the `azure-iot-mqtt-base` package.]*/
    it('calls its callback with an error if it fails to unsubscribe', function (testCallback) {
      const fakeError = new Error('fake');
      fakeMqttBase.unsubscribe = sinon.stub().callsArgWith(1, fakeError);
      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        twinClient.disableTwinDesiredPropertiesUpdates(function (err) {
          assert.instanceOf(err, Error);
          assert.strictEqual(err.transportError, fakeError);
          testCallback();
        });
      });
    });
  });

  describe('#on(\'twinDesiredPropertiesUpdate\'', function () {
    let fakeMqttBase;

    beforeEach(function () {
      fakeMqttBase = new EventEmitter();
      fakeMqttBase.connect = sinon.stub().callsArg(1);
      fakeMqttBase.disconnect = sinon.stub().callsArg(0);
      fakeMqttBase.publish = sinon.stub().callsArg(3);
      fakeMqttBase.subscribe = sinon.stub().callsArg(2);
      fakeMqttBase.unsubscribe = sinon.stub().callsArg(1);
      fakeMqttBase.updateSharedAccessSignature = sinon.stub().callsArg(1);
    });

    afterEach(function () {
      fakeMqttBase = null;
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_025: [Once the desired properties update topic has been subscribed to the `MqttTwinClient` shall emit a `twinDesiredPropertiesUpdate` event for messages received on that topic.]*/
    it('emits twinDesiredPropertiesUpdate events', function (testCallback) {
      const fakePatch = {
        fake: 'patch'
      };

      const twinClient = new MqttTwinClient(fakeMqttBase);
      twinClient.on('twinDesiredPropertiesUpdate', function (patch) {
        /*Tests_SRS_NODE_DEVICE_MQTT_TWIN_CLIENT_16_026: [The argument of the `twinDesiredPropertiesUpdate` event emitted shall be the object parsed from the JSON string contained in the received message.]*/
        assert.deepEqual(patch, fakePatch);
        testCallback();
      });

      fakeMqttBase.emit('message', '$iothub/twin/PATCH/properties/desired/', JSON.stringify(fakePatch));
    });
  });
});

