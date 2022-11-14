// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const EventEmitter = require('events').EventEmitter;
const assert = require('chai').assert;
const sinon = require('sinon');

const MqttBase = require('../dist/mqtt_base.js').MqttBase;
const FakeMqtt = require('./_fake_mqtt.js').FakeMqtt;
const PubFakeMqtt = require('./_fake_mqtt.js').PubFakeMqtt;
const PubACKTwiceFakeMqtt = require('./_fake_mqtt.js').PubACKTwiceFakeMqtt;
const ErrorFakeMqtt = require('./_fake_mqtt.js').ErrorFakeMqtt;
const errors = require('azure-iot-common').errors;

describe('MqttBase', function () {
  let fakeConfig;

  beforeEach(function () {
    fakeConfig = {
      uri: 'uri',
      clientId: 'clientId',
      username: 'username',
      sharedAccessSignature: "sasToken"
    };
  });

  describe('#connect', function () {
    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_006: [The `connect` method shall throw a ReferenceError if the config argument is falsy, or if one of the following properties of the config argument is falsy: uri, clientId, username, and one of sharedAccessSignature or x509.cert and x509.key.]*/
    it('throws if config structure is falsy', function () {
      [null, undefined, '', 0].forEach(function (config) {
        const mqtt = new MqttBase(new FakeMqtt());
        assert.throws(function () {
          mqtt.connect(config, function () {});
        }, ReferenceError, 'Invalid transport configuration');
      });
    });

    ['uri', 'clientId', 'username'].forEach(function (falsyProperty) {
      [null, undefined, ''].forEach(function (falsyValue) {
        it('throws if ' + falsyProperty + ' is ' + falsyValue , function () {
          fakeConfig[falsyProperty] = falsyValue;
          const mqtt = new MqttBase(new FakeMqtt());
          assert.throws(function () {
            mqtt.connect(fakeConfig, function () {});
          }, ReferenceError, 'Invalid transport configuration');
        });
      });
    });

    [null, undefined, ''].forEach(function (sas) {
      [
        null,
        undefined,
        { cert: null, key: 'key' },
        { cert: undefined, key: 'key' },
        { cert: '', key: 'key' },
        { cert: 'cert', key: null },
        { cert: 'cert', key: undefined },
        { cert: 'cert', key: '' }
      ].forEach(function (x509) {
        it('throws if sharedAccessSignature is \'' + sas + '\' and x509 options are \'' + JSON.stringify(x509) + '\'', function () {
          const config = fakeConfig;
          config.sharedAccessSignature = sas;
          config.x509 = x509;
          const mqtt = new MqttBase(new FakeMqtt());
          assert.throws(function () {
            mqtt.connect(config, function () {});
          }, ReferenceError, 'Invalid transport configuration');
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_002: [The `connect` method shall use the authentication parameters contained in the `config` argument to connect to the server.]*/
    it('uses the authentication parameters contained in the config structure (SharedAccessSignature)', function () {
      const config = fakeConfig;
      const fakemqtt = new FakeMqtt();
      const transport = new MqttBase(fakemqtt);

      fakemqtt.connect = function (host, options) {
        assert.strictEqual(options.clientId, config.clientId);
        assert.strictEqual(options.username, config.username);
        assert.strictEqual(options.password.toString(), config.sharedAccessSignature);

        assert.strictEqual(options.protocolId, 'MQTT');
        assert.strictEqual(options.protocolVersion, 4);
        assert.isFalse(options.clean);
        if (Object.prototype.hasOwnProperty.call(options,'rejectUnauthorized')) {
          assert.isTrue('rejectUnauthorized must never be set false.')
        }
        /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_016: [The `connect` method shall configure the `keepalive` ping interval to 3 minutes by default since the Azure Load Balancer TCP Idle timeout default is 4 minutes.]*/
        assert.isFalse(options.reschedulePings);
        assert.strictEqual(options.keepalive, 180);
        return new EventEmitter();
      };

      transport.connect(config, function () {});
    });

    it('uses the authentication parameters contained in the config structure (x509)', function () {
      const config = {
        uri: 'uri',
        clientId: 'clientId',
        username: 'username',
        x509: {
          cert: 'cert',
          key: 'key',
          passphrase: 'passphrase'
        }
      };

      const fakemqtt = new FakeMqtt();
      const transport = new MqttBase(fakemqtt);

      fakemqtt.connect = function (host, options) {
        assert.strictEqual(options.clientId, config.clientId);
        assert.strictEqual(options.username, config.username);
        assert.strictEqual(options.cert, config.x509.cert);
        assert.strictEqual(options.key, config.x509.key);
        assert.strictEqual(options.passphrase, config.x509.passphrase);
        if (Object.prototype.hasOwnProperty.call(options,'rejectUnauthorized')) {
          assert.isTrue('rejectUnauthorized must never be set false.')
        }
        assert.strictEqual(options.protocolId, 'MQTT');
        assert.strictEqual(options.protocolVersion, 4);
        assert.isFalse(options.clean);
        /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_016: [The `connect` method shall configure the `keepalive` ping interval to 3 minutes by default since the Azure Load Balancer TCP Idle timeout default is 4 minutes.]*/
        assert.isFalse(options.reschedulePings);
        assert.strictEqual(options.keepalive, 180);
        return new EventEmitter();
      };

      transport.connect(config, function () {});
    });

    it('uses the uri specified by the config object', function () {
      const config = {
        clientId: 'clientId',
        username: 'username',
        sharedAccessSignature: "sasToken",
        uri: 'wss://host.name:443/$iothub/websocket'
      };

      const fakemqtt = new FakeMqtt();
      const transport = new MqttBase(fakemqtt);

      fakemqtt.connect = function (host) {
        assert.strictEqual(host, config.uri);
        return new EventEmitter();
      };

      transport.connect(config, function () {});
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_18_001: [The `connect` method shall set the `ca` option based on the `ca` string passed in the `options` structure via the `setOptions` function.]*/
    it('uses the ca passed into setOptions', function (done) {
      const fakeCa = '__FAKE_CA__';
      const fakemqtt = new FakeMqtt();
      const transport = new MqttBase(fakemqtt);

      transport.setOptions({ ca: fakeCa });
      fakemqtt.connect = function (host, options) {
        assert.strictEqual(options.ca, fakeCa);
        done();
      };
      transport.connect(fakeConfig, function () {});
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_41_001: [The `connect` method shall set the `keepalive` option based on the `keepalive` numeric value passed in the `options` structure via the `setOptions` function.]*/
    it('uses the keepalive value passed into setOptions', function (done) {
      const fakemqtt = new FakeMqtt();
      const transport = new MqttBase(fakemqtt);

      transport.setOptions({ keepalive: 0xFF });
      fakemqtt.connect = function (host, options) {
        assert.strictEqual(options.keepalive, 0xFF);
        done();
      };
      transport.connect(fakeConfig, function () {});
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_18_002: [The `connect` method shall set the `wsOptions.agent` option based on the `mqtt.webSocketAgent` object passed in the `options` structure via the `setOptions` function.]*/
    it('uses the agent passed into setOptions', function (done) {
      const fakeAgent = '__FAKE_AGENT__';
      const fakemqtt = new FakeMqtt();
      const transport = new MqttBase(fakemqtt);

      transport.setOptions({ mqtt: { webSocketAgent: fakeAgent } });
      fakemqtt.connect = function (host, options) {
        assert.strictEqual(options.wsOptions.agent, fakeAgent);
        done();
      };
      transport.connect(fakeConfig, function () {});
    });


    /*Tests_SRS_NODE_COMMON_MQTT_BASE_12_005: [The `connect` method shall call connect on MQTT.JS  library and call the `done` callback with a `null` error object and the result as a second argument.]*/
    it('calls the done callback once successfully connected to the server', function (done) {
      const fakemqtt = new FakeMqtt();
      const transport = new MqttBase(fakemqtt);
      transport.connect(fakeConfig, function (err) {
        if(err) {
          done(err);
        } else {
          done();
        }
      });

      fakemqtt.emit('connect', { connack: true });
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_003: [The `connect` method shall call the `done` callback with a standard javascript `Error` object if the connection failed.]*/
    ['close', 'offline', 'error', 'disconnect'].forEach(function (event) {
      it('calls the done callback with an error if we get the \'' + event + '\' event before connect', function (done) {
        const fakemqtt = new FakeMqtt();
        const transport = new MqttBase(fakemqtt);
        transport.connect(fakeConfig, function (err) {
          assert.isNotNull(err);
          done();
        });

        fakemqtt.emit(event, new Error('could not connect'));
      });
    });

    it('calls the done callback with an error only and exactly once even if multiple events are received', function (done) {
        let callbackCounter = 0;
        const fakemqtt = new FakeMqtt();
        const transport = new MqttBase(fakemqtt);
        transport.connect(fakeConfig, function (err) {
          callbackCounter++;
          assert.equal(callbackCounter, 1);
          assert.isNotNull(err);
          done();
        });

        fakemqtt.emit('error', new Error('could not connect'));
        fakemqtt.emit('close');
    });

    it('calls the callback immediately if already connected', function (testCallback) {
      const fakeMqtt = new FakeMqtt();
      const mqttBase = new MqttBase(fakeMqtt);
      mqttBase.connect(fakeConfig, function () {
        mqttBase.connect(fakeConfig, function () {
          assert.isTrue(fakeMqtt.connect.calledOnce);
          testCallback();
        });
      });
      fakeMqtt.emit('connect');
    });
  });

  describe('#disconnect', function () {
    it('calls the callback immediately if already disconnected', function (testCallback) {
      const fakeMqtt = new FakeMqtt();
      const mqttBase = new MqttBase(fakeMqtt);
      mqttBase.disconnect(function () {
        assert.isTrue(fakeMqtt.connect.notCalled);
        testCallback();
      });
    });

    it('disconnects the client if connected', function (testCallback) {
      const fakeMqtt = new FakeMqtt();
      const mqttBase = new MqttBase(fakeMqtt);
      mqttBase.connect(fakeConfig, function () {
        mqttBase.disconnect(function () {
          assert.isTrue(fakeMqtt.connect.calledOnce);
          assert.isTrue(fakeMqtt.end.calledOnce);
          testCallback();
        });
      });
      fakeMqtt.emit('connect');
    });

    it('does not fail if _mqttClient is undefined', function (testCallback) {
      const fakeMqtt = new FakeMqtt();
      const mqttBase = new MqttBase(fakeMqtt);
      mqttBase.connect(fakeConfig, function () {
        mqttBase._mqttClient = undefined;
        mqttBase.disconnect(function () {
          testCallback();
        });
      });
      fakeMqtt.emit('connect');
    });
  });

  describe('#publish', function () {
    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_018: [The `publish` method shall throw a `ReferenceError` if the topic is falsy.]*/
    [null, undefined, ''].forEach(function (topic) {
      it('throws if topic is \'' + topic + '\'', function () {
        const transport = new MqttBase(new FakeMqtt());
        assert.throws(function () {
          transport.publish(topic, 'payload', function () {});
        }, ReferenceError, 'Invalid topic');
      });
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_020: [The `publish` method shall call the callback with a `NotConnectedError` if the connection hasn't been established prior to calling `publish`.]*/
    it('fails with a NotConnectedError if the MQTT connection is not active', function (testCallback) {
      const transport = new MqttBase(new FakeMqtt());
      transport.publish('topic', 'payload', {}, function (err) {
        assert.instanceOf(err, errors.NotConnectedError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_017: [The `publish` method publishes a `payload` on a `topic` using `options`.]*/
    it('calls publish on the MQTT library', function (testCallback) {
      const fakemqtt = new FakeMqtt();
      const transport = new MqttBase(fakemqtt);
      transport.connect(fakeConfig, function () {
        fakemqtt.publishShouldSucceed(true);
        /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_021: [The  `publish` method shall call `publish` on the mqtt client object and call the `callback` argument with `null` and the `puback` object if it succeeds.]*/
        transport.publish('topic', 'payload', {}, testCallback);
      });
      fakemqtt.emit('connect', { connack: true });
    });

    // Publish errors are handled with a callback, so 'error' should be subscribed only once when connecting, to get link errors.
    it('does not subscribe to the error event', function (done) {
      const fakemqtt = new FakeMqtt();
      const transport = new MqttBase(fakemqtt);
      transport.connect(fakeConfig, function () {
        assert.equal(fakemqtt.listeners('error').length, 1);
        fakemqtt.publishShouldSucceed(false);
        transport.publish('topic', 'payload', {}, function () {
          assert.equal(fakemqtt.listeners('error').length, 1);
          done();
        });
      });
      fakemqtt.emit('connect', { connack: true });
    });

    // Publishes 4 messages and they PUBACK out of order but the context of the callback is preserved.
    it('handles out of order PUBACK correctly', function (done) {
      // the fakemqtt will invoke the callbacks in the following order 4,1,3,2
      const fakemqtt = new PubFakeMqtt();
      const transport = new MqttBase(fakemqtt);
      transport.connect(fakeConfig, function () {
        let callbackInvokes = 1;
        transport.publish('topic1', 'payload1', {}, () => {
          assert.equal(callbackInvokes, 2);
          callbackInvokes++;
        });
        transport.publish('topic2', 'payload2', {}, () => {
          assert.equal(callbackInvokes, 4);
          done();
        });
        transport.publish('topic3', 'payload3', {}, () => {
          assert.equal(callbackInvokes, 3);
          callbackInvokes++;
        });
        transport.publish('topic4', 'payload4', {}, () => {
          assert.equal(callbackInvokes, 1);
          callbackInvokes++;
        });
      });
      fakemqtt.emit('connect', { connack: true });
    });

    it('handles puback of no longer existing pub on wire', function (done) {
      const fakemqtt = new PubACKTwiceFakeMqtt();
      const transport = new MqttBase(fakemqtt);
      transport.connect(fakeConfig, function () {
        let callbackInvokes = 0;
        transport.publish('topic1', 'payload1', {}, () => {
          callbackInvokes++;
          if (callbackInvokes === 2) {
            assert.fail('Callback invoked to many times.');
          }
          process.nextTick(() => done());
        });
      });
      fakemqtt.emit('connect', { connack: true });
    });

    // Publishes 4 messages. None of which complete initially.  After the forth message an error is emitted.
    // All of the publishes are completed with the error.  Finally an error is emitted as there
    // is no current operation.
    it('Purge messages in the case of an error occurring', function (done) {
      const fakemqtt = new ErrorFakeMqtt();
      const transport = new MqttBase(fakemqtt);
      const fakeError = new Error('Error from mqtt');
      let processedErrorEvent = false;
      let errorOnCallback = 0;
      transport.connect(fakeConfig, () => {
        transport.publish('topic1', 'payload1', {}, (err) => {
          assert.strictEqual(err, fakeError);
          errorOnCallback++;
        });
        transport.publish('topic2', 'payload2', {}, (err) => {
          assert.strictEqual(err, fakeError);
          errorOnCallback++;
        });
        transport.publish('topic3', 'payload3', {}, (err) => {
          assert.strictEqual(err, fakeError);
          errorOnCallback++;
        });
        transport.publish('topic4', 'payload4', {}, (err) => {
          assert.strictEqual(err, fakeError);
          errorOnCallback++;
        });
        process.nextTick(() => {fakemqtt.emit('error', fakeError)});
      });
      transport.on('error', (err) => {
        assert.strictEqual(err, fakeError);
        processedErrorEvent = true;
      });
      //
      // Let the event loop go round twice.  Makes sure everything gets processed.
      //
      setImmediate(() => {
        setImmediate(() => {
          assert(processedErrorEvent);
          assert.equal(errorOnCallback, 4);
          done();
        });
      });
      fakemqtt.emit('connect', { connack: true });
    });
  });

  describe('#timeout', function () {
    const defaultTimeOutInSeconds = 30;
    it('completes message with a timeout at around default timeout number of seconds', function (done) {
      const clock = sinon.useFakeTimers();
      const fakemqtt = new ErrorFakeMqtt();
      const transport = new MqttBase(fakemqtt);
      transport.connect(fakeConfig, () => {
        const publishCallbackSpy = sinon.spy((err) => {
          let callbackTimeInSeconds = Math.round(Date.now() / 1000);
          assert.instanceOf(err, errors.TimeoutError);
          assert.isAtLeast(callbackTimeInSeconds - beforePublishTimeInSeconds, defaultTimeOutInSeconds);
          assert.isBelow(callbackTimeInSeconds - beforePublishTimeInSeconds, defaultTimeOutInSeconds * 1.1);
        });
        let beforePublishTimeInSeconds = Math.round(Date.now() / 1000);
        transport.publish('topic1', 'payload1', {}, publishCallbackSpy);
        clock.tick((defaultTimeOutInSeconds*1000)+10000);
        assert(publishCallbackSpy.calledOnce);
        clock.restore();
        done();
    });
      fakemqtt.emit('connect', { connack: true });
    });

    it('completes message with a timeout at around 2*default timeout number of seconds', function (done) {
      let clock = sinon.useFakeTimers();
      const fakemqtt = new ErrorFakeMqtt();
      const transport = new MqttBase(fakemqtt);
      transport.connect(fakeConfig, () => {
        let publishCallbackSpy = sinon.spy((err) => {
          let callbackTimeInSeconds = Math.round(Date.now() / 1000);
          assert.instanceOf(err, errors.TimeoutError);
          assert.isAtLeast(callbackTimeInSeconds - beforePublishTimeInSeconds, 2*defaultTimeOutInSeconds);
          assert.isBelow(callbackTimeInSeconds - beforePublishTimeInSeconds, defaultTimeOutInSeconds * 2.1);
        });
        let beforePublishTimeInSeconds = Math.round(Date.now() / 1000);
        transport.publish('topic1', 'payload1', {}, publishCallbackSpy);
        transport.setTimeout(2*defaultTimeOutInSeconds);
        clock.tick((defaultTimeOutInSeconds*2*1000)+10000);
        assert(publishCallbackSpy.calledOnce);
        clock.restore();
        done();
      });
      fakemqtt.emit('connect', { connack: true });
    });

    it('completes 2 message with a timeout at around default timeout number of seconds, then third at default*1.5', function (done) {
      let clock = sinon.useFakeTimers();
      const fakemqtt = new ErrorFakeMqtt();
      const transport = new MqttBase(fakemqtt);
      transport.connect(fakeConfig, () => {
        let publishCallbackSpy1st = sinon.spy((err) => {
          let callbackTimeInSeconds = Math.round(Date.now() / 1000);
          assert.instanceOf(err, errors.TimeoutError);
          assert.isAtLeast(callbackTimeInSeconds - beforePublishTimeInSeconds, defaultTimeOutInSeconds);
          assert.isBelow(callbackTimeInSeconds - beforePublishTimeInSeconds, defaultTimeOutInSeconds * 1.1);
        });
        let publishCallbackSpy2nd = sinon.spy((err) => {
          let callbackTimeInSeconds = Math.round(Date.now() / 1000);
          assert.instanceOf(err, errors.TimeoutError);
          assert.isAtLeast(callbackTimeInSeconds - beforePublishTimeInSeconds, defaultTimeOutInSeconds);
          assert.isBelow(callbackTimeInSeconds - beforePublishTimeInSeconds, defaultTimeOutInSeconds * 1.1);
        });
        let publishCallbackSpy3rd = sinon.spy((err) => {
          let callbackTimeInSeconds = Math.round(Date.now() / 1000);
          assert.instanceOf(err, errors.TimeoutError);
          assert.isAtLeast(callbackTimeInSeconds - beforePublishTimeInSeconds, 1.5*defaultTimeOutInSeconds);
          assert.isBelow(callbackTimeInSeconds - beforePublishTimeInSeconds, defaultTimeOutInSeconds * 1.7);
        });
        let beforePublishTimeInSeconds = Math.round(Date.now() / 1000);
        transport.publish('topic1', 'payload1', {}, publishCallbackSpy1st);
        transport.publish('topic2', 'payload2', {}, publishCallbackSpy2nd);
        clock.tick(defaultTimeOutInSeconds*0.5*1000);
        transport.publish('topic3', 'payload3', {}, publishCallbackSpy3rd);
        clock.tick(1000);
        assert(publishCallbackSpy1st.notCalled);
        assert(publishCallbackSpy2nd.notCalled);
        assert(publishCallbackSpy3rd.notCalled);
        clock.tick(defaultTimeOutInSeconds*0.6*1000);
        assert(publishCallbackSpy1st.calledOnce);
        assert(publishCallbackSpy2nd.calledOnce);
        assert(publishCallbackSpy3rd.notCalled);
        clock.tick(defaultTimeOutInSeconds*0.6*1000);
        assert(publishCallbackSpy1st.calledOnce);
        assert(publishCallbackSpy2nd.calledOnce);
        assert(publishCallbackSpy3rd.calledOnce);
        clock.restore();
        done();
      });
      fakemqtt.emit('connect', { connack: true });
    });

  });

  describe('#subscribe', function () {
    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_026: [The `subscribe` method shall call the callback with a `NotConnectedError` if the connection hasn't been established prior to calling `publish`.]*/
    it('fails with a NotConnectedError if the MQTT connection is not active', function (testCallback) {
      const transport = new MqttBase(new FakeMqtt());
      transport.subscribe('topic', {}, function (err) {
        assert.instanceOf(err, errors.NotConnectedError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_023: [The `subscribe` method shall throw a `ReferenceError` if the topic is falsy.]*/
    [null, undefined, ''].forEach(function (badTopic) {
      it('throws if the topic is \'' + badTopic + '\'', function () {
        const fakeMqtt = new FakeMqtt();
        const transport = new MqttBase(fakeMqtt);
        assert.throws(function () {
          transport.subscribe(badTopic, {}, function () {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_12_008: [The `subscribe` method shall call `subscribe`  on MQTT.JS  library and pass it the `topic` and `options` arguments.]*/
    it('calls subscribe on the mqtt client with the topic and options', function (testCallback) {
      const fakeTopic = 'topic';
      const fakeOptions = {};
      const fakeMqtt = new FakeMqtt();
      const transport = new MqttBase(fakeMqtt);
      transport.connect(fakeConfig, function () {
        transport.subscribe(fakeTopic, fakeOptions, function () {
          /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_024: [The `subscribe` method shall call the callback with `null` and the `suback` object if the mqtt library successfully subscribes to the `topic`.]*/
          assert.isTrue(fakeMqtt.subscribe.calledWith(fakeTopic, fakeOptions));
          testCallback();
        });
      });
      fakeMqtt.emit('connect');
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_025: [The `subscribe` method shall call the callback with an `Error` if the mqtt library fails to subscribe to the `topic`.]*/
    it('calls the callback with an error if subscribing on the mqtt client with the topic and options fails', function (testCallback) {
      const fakeTopic = 'topic';
      const fakeOptions = {};
      const fakeError = new Error('unsubscribe failed');
      const fakeMqtt = new FakeMqtt();
      fakeMqtt.subscribe = sinon.stub().callsArgWith(2, fakeError);
      const transport = new MqttBase(fakeMqtt);
      transport.connect(fakeConfig, function () {
        transport.subscribe(fakeTopic, fakeOptions, function (err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });
      fakeMqtt.emit('connect');
    });
  });


  describe('#unsubscribe', function () {
    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_027: [The `unsubscribe` method shall call the callback with a `NotConnectedError` if the connection hasn't been established prior to calling `publish`.]*/
    it('fails with a NotConnectedError if the MQTT connection is not active', function (testCallback) {
      const transport = new MqttBase(new FakeMqtt());
      transport.unsubscribe('topic', function (err) {
        assert.instanceOf(err, errors.NotConnectedError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_031: [The `unsubscribe` method shall throw a `ReferenceError` if the `topic` argument is falsy.]*/
    [null, undefined, ''].forEach(function (badTopic) {
      it('throws if the topic is \'' + badTopic + '\'', function () {
        const fakeMqtt = new FakeMqtt();
        const transport = new MqttBase(fakeMqtt);
        assert.throws(function () {
          transport.unsubscribe(badTopic, function () {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_028: [The `unsubscribe` method shall call `unsubscribe` on the mqtt library and pass it the `topic`.]*/
    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_029: [The `unsubscribe` method shall call the `callback` argument with no arguments if the operation succeeds.]*/
    it('calls unsubscribe on the mqtt client', function (testCallback) {
      const fakeTopic = 'topic';
      const fakeMqtt = new FakeMqtt();
      const transport = new MqttBase(fakeMqtt);
      transport.connect(fakeConfig, function () {
        transport.unsubscribe(fakeTopic, function () {
          assert.isTrue(fakeMqtt.unsubscribe.calledWith(fakeTopic));
          testCallback();
        });
      });
      fakeMqtt.emit('connect');
    });
  });

  describe('#updateSharedAccessSignature', function () {
    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_032: [The `updateSharedAccessSignature` method shall throw a `ReferenceError` if the `sharedAccessSignature` argument is falsy.]*/
    [null, undefined, ''].forEach(function (badSas) {
      it('throws if the new shared access signature is \'' + badSas + '\'', function () {
        const fakeMqtt = new FakeMqtt();
        const transport = new MqttBase(fakeMqtt);
        assert.throws(function () {
          transport.updateSharedAccessSignature(badSas, function () {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_034: [The `updateSharedAccessSignature` method shall not trigger any network activity if the mqtt client is not connected.]*/
    it('does not try to connect if the MQTT connection is not active', function (testCallback) {
      const fakeMqtt = new FakeMqtt();
      const transport = new MqttBase(fakeMqtt);
      transport.connect(fakeConfig, function () {
        transport.disconnect(function () {
          transport.updateSharedAccessSignature('sas', function () {
            assert.isTrue(fakeMqtt.connect.calledOnce);
            testCallback();
          });
        });
      });

      fakeMqtt.emit('connect');
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_033: [The `updateSharedAccessSignature` method shall disconnect and reconnect the mqtt client with the new `sharedAccessSignature`.]*/
    it('disconnects and reconnects the mqtt client', function (testCallback) {
      const newSas = 'newsas';
      const fakeMqtt = new FakeMqtt();
      const transport = new MqttBase(fakeMqtt);
      transport.connect(fakeConfig, function () {
        assert.isTrue(fakeMqtt.connect.calledOnce);
        assert.strictEqual(fakeMqtt.connect.firstCall.args[1].password, fakeConfig.sharedAccessSignature);
        transport.updateSharedAccessSignature(newSas, function (err) {
          assert.notExists(err);
          /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_035: [The `updateSharedAccessSignature` method shall call the `callback` argument with no parameters if the operation succeeds.]*/
          assert.isTrue(fakeMqtt.end.calledOnce);
          assert.isTrue(fakeMqtt.connect.calledTwice);
          assert.strictEqual(fakeMqtt.connect.secondCall.args[1].password, newSas);
          testCallback();
        });
        fakeMqtt.emit('connect');
      });

      fakeMqtt.emit('connect');
    });

    it('force disconnects the client on disconnect timeout during reconnecting', function (testCallback) {
      let clock = sinon.useFakeTimers();
      const newSas = 'newsas';
      const fakeMqtt = new FakeMqtt();
      fakeMqtt.end = sinon.stub();
      fakeMqtt.end.onFirstCall().callsFake((force, callback) => {
        assert.isFalse(force);
        clock.tick(30000);
        callback();
      });

      fakeMqtt.end.onSecondCall().callsFake((force, callback) => {
        /*Tests_SRS_NODE_COMMON_MQTT_BASE_41_002: [The `updateSharedAccessSignature` method shall trigger a forced disconnect if after 30 seconds the mqtt client has failed to complete a non-forced disconnect.]*/
        assert.isTrue(force);
        callback();
      });
      const transport = new MqttBase(fakeMqtt);
      transport.connect(fakeConfig, function () {
        assert.isTrue(fakeMqtt.connect.calledOnce);
        assert.strictEqual(fakeMqtt.connect.firstCall.args[1].password, fakeConfig.sharedAccessSignature);
        transport.updateSharedAccessSignature(newSas, function (err) {
          assert.notExists(err);
          assert.isTrue(fakeMqtt.end.calledTwice);
          assert.isTrue(fakeMqtt.connect.calledTwice);
          assert.strictEqual(fakeMqtt.connect.secondCall.args[1].password, newSas);
          clock.restore();
          testCallback();
        });
        fakeMqtt.emit('connect');
      });

      fakeMqtt.emit('connect');
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_036: [The `updateSharedAccessSignature` method shall call the `callback` argument with an `Error` if the operation fails.]*/
    it('calls the callback with an error if it fails to reconnect the mqtt client', function (testCallback) {
      const fakeError = new Error('fake failed to reconnect');
      const fakeMqtt = new FakeMqtt();
      const transport = new MqttBase(fakeMqtt);
      transport.connect(fakeConfig, function () {
        transport.updateSharedAccessSignature('newSas', function (err) {
          assert.isTrue(fakeMqtt.end.calledOnce);
          assert.isTrue(fakeMqtt.connect.calledTwice);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
        fakeMqtt.emit('error', fakeError);
      });

      fakeMqtt.emit('connect');
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_41_003: [The `updateSharedAccessSignature` method shall call the `callback` argument with an `Error` if the operation fails after timing out.]*/
    it('calls the callback with an error if it fails to reconnect the mqtt client (force disconnect)', function (testCallback) {
      let clock = sinon.useFakeTimers();
      const fakeError = new Error('fake failed to reconnect');
      const fakeMqtt = new FakeMqtt();
      fakeMqtt.end = sinon.stub();
      fakeMqtt.end.onFirstCall().callsFake((force, callback) => {
        clock.tick(30000);
        callback();
      });
      fakeMqtt.end.onSecondCall().callsFake((force, callback) => {
        callback();
      });
      const transport = new MqttBase(fakeMqtt);
      transport.connect(fakeConfig, function () {
        transport.updateSharedAccessSignature('newSas', function (err) {
          assert.isTrue(fakeMqtt.end.calledTwice);
          assert.isTrue(fakeMqtt.connect.calledTwice);
          assert.strictEqual(err, fakeError);
          clock.restore();
          testCallback();
        });
        fakeMqtt.emit('error', fakeError);
      });
      fakeMqtt.emit('connect');
    });
  });

  describe('#events', function () {
    it('emits a message when the mqtt client emits a message', function (testCallback) {
      const fakeTopic = 'topic';
      const fakePayload = 'payload';
      const fakeMqtt = new FakeMqtt();
      const mqttBase = new MqttBase(fakeMqtt);
      mqttBase.on('message', function (topic, payload) {
        assert.strictEqual(topic, fakeTopic);
        assert.strictEqual(payload, fakePayload);
        testCallback();
      });
      mqttBase.connect(fakeConfig, function () {
        fakeMqtt.emit('message', fakeTopic, fakePayload);
      });
      fakeMqtt.emit('connect');
    });

    it('emits a NotConnectedError when the mqtt client emits an close while connected', function (testCallback) {
      const fakeMqtt = new FakeMqtt();
      const mqttBase = new MqttBase(fakeMqtt);
      mqttBase.on('error', function (err) {
        assert.instanceOf(err, errors.NotConnectedError);
        testCallback();
      });
      mqttBase.connect(fakeConfig, function () {
        fakeMqtt.emit('close');
      });
      fakeMqtt.emit('connect');
    });

    it('swallows the close event if the client is already disconnecting', function (testCallback) {
      const fakeMqtt = new FakeMqtt();
      let disconnectCallback;
      fakeMqtt.end = sinon.stub().callsFake(function (force, callback) {
        disconnectCallback = callback;
        // blocks instead of calling its callback.
      });
      const mqttBase = new MqttBase(fakeMqtt);
      mqttBase.on('error', function () {
        assert.fail();
      });
      mqttBase.connect(fakeConfig, function () {
        mqttBase.disconnect(testCallback);
        fakeMqtt.emit('close');
        disconnectCallback();
      });
      fakeMqtt.emit('connect');
    });
  });
});
