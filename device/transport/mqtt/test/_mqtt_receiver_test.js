// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

require('es5-shim');
var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Mqtt = require('../lib/mqtt.js').Mqtt;
var Message = require('azure-iot-common').Message;

describe('Mqtt as MqttReceiver', function () {
  var fakeConfig = {
    host: 'host.name',
    deviceId: 'deviceId',
    sharedAccessSignature: 'sas'
  };

  var fakeMqttBase, fakeAuthenticationProvider;

  beforeEach(function () {
    fakeAuthenticationProvider = {
      getDeviceCredentials: sinon.stub().callsFake(function (callback) {
        callback(null, fakeConfig);
      })
    };

    fakeMqttBase = new EventEmitter();
    fakeMqttBase.connect = sinon.stub().callsArg(1);
    fakeMqttBase.disconnect = sinon.stub().callsArg(0);
    fakeMqttBase.publish = sinon.stub().callsArg(3);
    fakeMqttBase.subscribe = sinon.stub().callsArg(2);
    fakeMqttBase.unsubscribe = sinon.stub().callsArg(1);
    fakeMqttBase.updateSharedAccessSignature = sinon.stub().callsArg(1);
    sinon.spy(fakeMqttBase, 'on');
    sinon.spy(fakeMqttBase, 'removeListener');
  });

  afterEach(function () {
    fakeMqttBase = undefined;
  });

  describe('#events', function () {
    describe('#message', function() {
      /*Tests_SRS_NODE_DEVICE_MQTT_RECEIVER_16_004: [If there is a listener for the message event, a message event shall be emitted for each message received.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_RECEIVER_16_005: [When a message event is emitted, the parameter shall be of type Message]*/
      it('emits a message event with a Message object when there is a listener', function (done) {
        var receiver = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        receiver.connect(function () {
          receiver.on('message', function (msg) {
            assert.instanceOf(msg, Message);
            done();
          });
          fakeMqttBase.emit('message', 'devices/foo/messages/devicebound/%24.mid=0209afa7-1e2f-4dc1-8a6f-8500efd81db3&%24.to=%2Fdevices%2Ffoo%2Fmessages%2Fdevicebound');
        });
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_RECEIVER_16_007: [When a message is received, the receiver shall populate the generated `Message` object `properties` property with the user properties serialized in the topic.]*/
      it('populates user-defined message properties from the topic', function (done) {
        var receiver = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        receiver.connect(function () {
          receiver.on('message', function (msg) {
            assert.equal(msg.constructor.name, 'Message');
            assert.equal(msg.properties.getItem(0).key, 'key1');
            assert.equal(msg.properties.getItem(0).value, 'value1');
            assert.equal(msg.properties.getItem(1).key, 'key2');
            assert.equal(msg.properties.getItem(1).value, 'value2');
            assert.equal(msg.properties.getItem(2).key, 'key$');
            assert.equal(msg.properties.getItem(2).value, 'value$');
            done();
          });

          fakeMqttBase.emit('message', 'devices/foo/messages/devicebound/key1=value1&key2=value2&key%24=value%24');
        });
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_RECEIVER_16_008: [When a message is received, the receiver shall populate the generated `Message` object `messageId` with the value of the property `$.mid` serialized in the topic, if present.]*/
      it('populates Message.messageId from the topic', function (done) {
        var receiver = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        receiver.connect(function () {
          receiver.on('message', function (msg) {
            assert.equal(msg.constructor.name, 'Message');
            assert.equal(msg.messageId, '0209afa7-1e2f-4dc1-8a6f-8500efd81db3');
            done();
          });

          fakeMqttBase.emit('message', 'devices/foo/messages/devicebound/%24.mid=0209afa7-1e2f-4dc1-8a6f-8500efd81db3');
        });
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_RECEIVER_16_009: [When a message is received, the receiver shall populate the generated `Message` object `to` with the value of the property `$.to` serialized in the topic, if present.]*/
      it('populates Message.to from the topic', function (done) {
        var receiver = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        receiver.connect(function () {
          receiver.on('message', function (msg) {
            assert.equal(msg.constructor.name, 'Message');
            assert.equal(msg.to, '/devices/foo/messages/devicebound');
            done();
          });

          fakeMqttBase.emit('message', 'devices/foo/messages/devicebound/%24.to=%2Fdevices%2Ffoo%2Fmessages%2Fdevicebound');
        });
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_RECEIVER_16_010: [When a message is received, the receiver shall populate the generated `Message` object `expiryTimeUtc` with the value of the property `$.exp` serialized in the topic, if present.]*/
      it('populates Message.expiryTimeUtc from the topic', function (done) {
        var receiver = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        receiver.connect(function () {
          receiver.on('message', function (msg) {
            assert.equal(msg.constructor.name, 'Message');
            assert.equal(msg.expiryTimeUtc, '2017-01-06T23:37:00.669Z');
            done();
          });

          fakeMqttBase.emit('message', 'devices/foo/messages/devicebound/%24.exp=2017-01-06T23%3A37%3A00.669Z');
        });
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_RECEIVER_16_011: [When a message is received, the receiver shall populate the generated `Message` object `correlationId` with the value of the property `$.cid` serialized in the topic, if present.]*/
      it('populates Message.correlationId from the topic', function (done) {
        var fakeCid = 'fakeCorrelationId';
        var receiver = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        receiver.connect(function () {
          receiver.on('message', function (msg) {
            assert.equal(msg.constructor.name, 'Message');
            assert.equal(msg.correlationId, fakeCid);
            done();
          });

          fakeMqttBase.emit('message', 'devices/foo/messages/devicebound/%24.cid=' + fakeCid);
        });
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_RECEIVER_16_012: [When a message is received, the receiver shall populate the generated `Message` object `userId` with the value of the property `$.uid` serialized in the topic, if present.]*/
      it('populates Message.userId from the topic', function (done) {
        var fakeUid = 'fakeUserId';
        var receiver = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        receiver.connect(function () {
          receiver.on('message', function (msg) {
            assert.equal(msg.constructor.name, 'Message');
            assert.equal(msg.userId, fakeUid);
            done();
          });

          fakeMqttBase.emit('message', 'devices/foo/messages/devicebound/%24.uid=' + fakeUid);
        });
      });


      it('creates a message even if the properties topic segment is empty', function(done) {
        var receiver = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        receiver.connect(function () {
          receiver.on('message', function (msg) {
            assert.equal(msg.constructor.name, 'Message');
            done();
          });

          fakeMqttBase.emit('message', 'devices/foo/messages/devicebound/');
        });
      });
    });

    describe('#method', function() {
      // Tests_SRS_NODE_DEVICE_MQTT_RECEIVER_13_002: [ When a listener is added for the method event, the topic should be subscribed to. ]*/
      it('does not subscribe twice to the same topic for multiple event registrations', function () {
        var receiver = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        receiver.connect(function () {
          receiver.on('method_UpdateFirmware', function () { });
          receiver.on('method_Reboot', function () { });
          receiver.on('message', function () { });
          receiver.on('message', function () { });

          // assert
          assert.isTrue(fakeMqttBase.on.calledTwice,
            'mqttClient.on was not called twice (error + message)');
          assert.isTrue(fakeMqttBase.on.calledWith('message'),
            'mqttClient.on was not called for "message" event');
            assert.isTrue(fakeMqttBase.on.calledWith('error'),
              'mqttClient.on was not called for "error" event');
        });
      });

      // Tests_SRS_NODE_DEVICE_MQTT_RECEIVER_13_003: [ If there is a listener for the method event, a method_<METHOD NAME> event shall be emitted for each message received. ]
      /* Tests_SRS_NODE_DEVICE_MQTT_RECEIVER_13_005: [ When a method_<METHOD NAME> event is emitted the parameter shall conform to the shape as defined by the interface specified below:

        interface StringMap {
            [key: string]: string;
        }

        interface MethodMessage {
            methods: { methodName: string; };
            requestId: string;
            properties: StringMap;
            body: any;
            verb: string;
        }
      ]*/
      it('emits a method event when a method message is received', function() {
        var receiver = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        var callback = sinon.spy();
        var msg;
        receiver.connect(function () {
          receiver.on('method_Reboot', callback);

          // test
          fakeMqttBase.emit('message', '$iothub/methods/POST/Reboot?$rid=1');

          // assert
          assert.isTrue(callback.calledOnce);
          assert.isArray(callback.args);
          assert.isTrue(callback.args.length >= 1);
          assert.isArray(callback.args[0]);
          assert.isTrue(callback.args[0].length >= 1);
          msg = callback.args[0][0];
          assert.isObject(msg);
          assert.deepEqual(msg, {
            methods: {
              methodName: 'Reboot',
              verb: 'POST'
            },
            requestId: '1',
            properties: {},
            body: undefined
          });
        });
      });

      /* Tests_SRS_NODE_DEVICE_MQTT_RECEIVER_13_005: [ When a method_<METHOD NAME> event is emitted the parameter shall conform to the shape as defined by the interface specified below:

        interface StringMap {
            [key: string]: string;
        }

        interface MethodMessage {
            methods: { methodName: string; };
            requestId: string;
            properties: StringMap;
            body: any;
            verb: string;
        }
      ]*/
      it('emits a method event when a method message is received with properties', function() {
        var receiver = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        var callback = sinon.spy();
        var msg;
        receiver.connect(function () {
          receiver.on('method_Reboot', callback);

          // test
          fakeMqttBase.emit('message',
            '$iothub/methods/POST/Reboot?$rid=1&k1=v1&k2=v2&k3=v3'
          );

          // assert
          assert.isTrue(callback.calledOnce);
          assert.isArray(callback.args);
          assert.isTrue(callback.args.length >= 1);
          assert.isArray(callback.args[0]);
          assert.isTrue(callback.args[0].length >= 1);
          msg = callback.args[0][0];
          assert.isObject(msg);
          assert.deepEqual(msg, {
            methods: {
              methodName: 'Reboot',
              verb: 'POST'
            },
            requestId: '1',
            properties: {
              'k1': 'v1',
              'k2': 'v2',
              'k3': 'v3'
            },
            body: undefined
          });
        });
      });

      /* Tests_SRS_NODE_DEVICE_MQTT_RECEIVER_13_005: [ When a method_<METHOD NAME> event is emitted the parameter shall conform to the shape as defined by the interface specified below:

        interface StringMap {
            [key: string]: string;
        }

        interface MethodMessage {
            methods: { methodName: string; };
            requestId: string;
            properties: StringMap;
            body: any;
            verb: string;
        }
      ]*/
      it('emits a method event when a method message is received with payload and properties', function() {
        var receiver = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        var callback = sinon.spy();
        var msg, payload;
        receiver.connect(function () {
          receiver.on('method_Reboot', callback);

          // test
          payload = new Buffer('Here\'s some payload');
          fakeMqttBase.emit('message',
            '$iothub/methods/POST/Reboot?$rid=1&k1=v1&k2=v2&k3=v3',
            payload
          );

          // assert
          assert.isTrue(callback.calledOnce);
          assert.isArray(callback.args);
          assert.isTrue(callback.args.length >= 1);
          assert.isArray(callback.args[0]);
          assert.isTrue(callback.args[0].length >= 1);
          msg = callback.args[0][0];
          assert.isObject(msg);
          assert.deepEqual(msg, {
            methods: {
              methodName: 'Reboot',
              verb: 'POST'
            },
            requestId: '1',
            properties: {
              'k1': 'v1',
              'k2': 'v2',
              'k3': 'v3'
            },
            body: payload
          });
        });
      });
    });
  });
});
