// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

require('es5-shim');
var assert = require('chai').assert;
var sinon = require('sinon');
var Mqtt = require('../lib/mqtt.js').Mqtt;
var endpoint = require('azure-iot-common').endpoint;
var errors = require('azure-iot-common').errors;
var results = require('azure-iot-common').results;
var Message = require('azure-iot-common').Message;
var AuthenticationType = require('azure-iot-common').AuthenticationType;
var EventEmitter = require('events').EventEmitter;
var getUserAgentString = require('azure-iot-device').getUserAgentString;

describe('Mqtt', function () {
  var fakeConfig, fakeAuthenticationProvider, fakeMqttBase;

  beforeEach(function () {
    fakeConfig = {
      host: 'host.name',
      deviceId: 'deviceId',
      sharedAccessSignature: 'sas'
    };

    fakeAuthenticationProvider = new EventEmitter();
    fakeAuthenticationProvider.type = AuthenticationType.Token;
    fakeAuthenticationProvider.getDeviceCredentials = sinon.stub().callsArgWith(0, null, fakeConfig);
    fakeAuthenticationProvider.updateSharedAccessSignature = sinon.stub();
    fakeAuthenticationProvider.stop = sinon.stub();
    sinon.spy(fakeAuthenticationProvider, 'on');

    fakeMqttBase = new EventEmitter();
    fakeMqttBase.connect = sinon.stub().callsArg(1);
    fakeMqttBase.disconnect = sinon.stub().callsArg(0);
    fakeMqttBase.publish = sinon.stub().callsArg(3);
    fakeMqttBase.subscribe = sinon.stub().callsArg(2);
    fakeMqttBase.unsubscribe = sinon.stub().callsArg(1);
    fakeMqttBase.updateSharedAccessSignature = sinon.stub().callsArg(1);
  });

  afterEach(function () {
    fakeMqttBase = undefined;
  });

  describe('#constructor', function () {
    /*Tests_SRS_NODE_DEVICE_MQTT_16_071: [The constructor shall subscribe to the `newTokenAvailable` event of the `authenticationProvider` passed as an argument if it uses tokens for authentication.]*/
    it('subscribes to the newTokenAvailable event on the authenticationProvider uses Tokens', function () {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      void(mqtt);
      assert.isTrue(fakeAuthenticationProvider.on.calledOnce);
    });

    it('does not subscribe to the newTokenAvailable event if the authenticationProvider uses X509', function () {
      var fakeX509AuthProvider = {
        type: AuthenticationType.X509,
        on: sinon.stub()
      };

      var mqtt = new Mqtt(fakeX509AuthProvider, fakeMqttBase);
      void(mqtt);
      assert.isTrue(fakeX509AuthProvider.on.notCalled);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_18_025: [If the `Mqtt` constructor receives a second parameter, it shall be used as a provider in place of mqtt.]*/
    it('accepts an mqttProvider for testing', function() {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      assert.equal(mqtt._mqtt, fakeMqttBase);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_072: [If the `newTokenAvailable` event is fired, the `Mqtt` object shall do nothing if it isn't connected.]*/
    it('does not do anything if the newTokenAvailable is fired and the MQTT connection is disconnected', function (testCallback) {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      void(mqtt);
      fakeAuthenticationProvider.emit('newTokenAvailable', fakeConfig);
      assert.isTrue(fakeMqttBase.connect.notCalled);
      testCallback();
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_073: [If the `newTokenAvailable` event is fired, the `Mqtt` object shall call `updateSharedAccessSignature` on the `mqttBase` object if it is connected.]*/
    it('calls updateSharedAccessSignature if the newTokenAvailable is fired and the MQTT connection is connected', function (testCallback) {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.connect(function () {
        fakeAuthenticationProvider.emit('newTokenAvailable', fakeConfig);
        assert.isTrue(fakeMqttBase.updateSharedAccessSignature.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_074: [If updating the shared access signature fails when the `newTokenAvailable` event is fired, the `Mqtt` state machine shall fire a `disconnect` event.]*/
    it('emits a disconnect event if updating the shared access signature fails', function (testCallback) {
      var fakeError = new Error('fake');
      fakeMqttBase.updateSharedAccessSignature = sinon.stub().callsArgWith(1, fakeError);
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.on('disconnect', function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });

      mqtt.connect(function () {
        fakeAuthenticationProvider.emit('newTokenAvailable', fakeConfig);
      });
    });
  });

  [
    {
      testName: 'sendEvent for device',
      sendFuncName: 'sendEvent',
      sendFunc: function(transport, message, callback) {
        transport.sendEvent(message, callback);
      },
      baseTopicWithoutProps: 'devices/deviceId/messages/events/',
      baseTopicWithProps: 'devices/deviceId/messages/events/',
      topicEnder: ''
    },
    {
      testName: 'sendOutputEvent for device',
      sendFuncName: 'sendOutputEvent',
      sendFunc: function(transport, message, callback) {
        transport.sendOutputEvent('fakeOutputName', message, callback);
      },
      /*Tests_SRS_NODE_DEVICE_MQTT_18_068: [ The `sendOutputEvent` method shall serialize the `outputName` property of the message as a key-value pair on the topic with the key `$.on`. ] */
      baseTopicWithoutProps: 'devices/deviceId/messages/events/%24.on=fakeOutputName',
      baseTopicWithProps: 'devices/deviceId/messages/events/%24.on=fakeOutputName&',
      topicEnder: '/'
    },
    {
      testName: 'sendEvent for module',
      moduleId: 'moduleId',
      sendFuncName: 'sendEvent',
      sendFunc: function(transport, message, callback) {
        transport.sendEvent(message, callback);
      },
      baseTopicWithoutProps: 'devices/deviceId/modules/moduleId/messages/events/',
      baseTopicWithProps: 'devices/deviceId/modules/moduleId/messages/events/',
      topicEnder: ''
    },
    {
      testName: 'sendOutputEvent for modules',
      moduleId: 'moduleId',
      sendFuncName: 'sendOutputEvent',
      sendFunc: function(transport, message, callback) {
        transport.sendOutputEvent('fakeOutputName', message, callback);
      },
      /*Tests_SRS_NODE_DEVICE_MQTT_18_068: [ The `sendOutputEvent` method shall serialize the `outputName` property of the message as a key-value pair on the topic with the key `$.on`. ] */
      baseTopicWithoutProps: 'devices/deviceId/modules/moduleId/messages/events/%24.on=fakeOutputName',
      baseTopicWithProps: 'devices/deviceId/modules/moduleId/messages/events/%24.on=fakeOutputName&',
      topicEnder: '/'
    }
  ].forEach(function (testConfig) {
    describe('#' + testConfig.testName, function () {

      beforeEach(function() {
        fakeConfig.moduleId = testConfig.moduleId;
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_16_023: [The `sendEvent` method shall connect the Mqtt connection if it is disconnected.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_045: [ The `sendOutputEvent` method shall connect the Mqtt connection if it is disconnected. ]*/
      it('connects the transport if currently disconnected', function (testCallback) {
        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        testConfig.sendFunc(transport, new Message('test'), function () {
          assert.isTrue(fakeMqttBase.connect.calledOnce);
          assert.isTrue(fakeMqttBase.publish.calledOnce);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_16_024: [The `sendEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to establish a connection.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_046: [ The `sendOutputEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to establish a connection. ]*/
      it('calls the callback with an error if the transport fails to connect', function (testCallback) {
        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        fakeMqttBase.connect = sinon.stub().callsArgWith(1, new Error('fake error'));
        testConfig.sendFunc(transport, new Message('test'), function (err) {
          assert.isTrue(fakeMqttBase.connect.calledOnce);
          assert.instanceOf(err, Error);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_16_025: [If `sendEvent` is called while `MqttBase` is establishing the connection, it shall wait until the connection is established and then send the event.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_047: [ If `sendOutputEvent` is called while `MqttBase` is establishing the connection, it shall wait until the connection is established and then send the event. ]*/
      it('waits until connected if called while connecting', function (testCallback) {
        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        var connectCallback;
        fakeMqttBase.connect = sinon.stub().callsFake(function (config, callback) {
          connectCallback = callback;
        });
        transport.connect(function () {});
        testConfig.sendFunc(transport, new Message('test'), function () {
          assert.isTrue(fakeMqttBase.connect.calledOnce);
          assert.isTrue(fakeMqttBase.publish.calledOnce);
          testCallback();
        });
        connectCallback();
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_16_035: [If `sendEvent` is called while `MqttBase` is establishing the connection, and `MqttBase` fails to establish the connection, then sendEvent shall fail.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_048: [ If `sendOutputEvent` is called while `MqttBase` is establishing the connection, and `MqttBase` fails to establish the connection, then sendEvent shall fail. ]*/
      it('calls the callback with an error if called while connecting and connecting fails', function (testCallback) {
        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        var fakeError = new Error('test');
        var connectCallback;
        fakeMqttBase.connect = sinon.stub().callsFake(function (config, callback) {
          connectCallback = callback;
        });
        transport.connect(function () {});
        testConfig.sendFunc(transport, new Message('test'), function (err) {
          assert.instanceOf(err, Error);
          assert.isTrue(fakeMqttBase.connect.calledOnce);
          assert.isTrue(fakeMqttBase.publish.notCalled);
          testCallback();
        });
        fakeMqttBase.connect = sinon.stub().callsArgWith(1, fakeError);
        connectCallback(fakeError);
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_16_026: [If `sendEvent` is called while `MqttBase` is disconnecting, it shall wait until the disconnection is complete and then try to connect again and send the event. ]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_049: [If `sendOutputEvent` is called while `MqttBase` is disconnecting, it shall wait until the disconnection is complete and then try to connect again and send the event. ]*/
      it('waits until disconnected to try to reconnect if called while disconnecting', function (testCallback) {
        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        var disconnectCallback;
        fakeMqttBase.disconnect = sinon.stub().callsFake(function (callback) {
          disconnectCallback = callback;
        });

        transport.connect(function () {
          transport.disconnect(function () {});
          // blocked in disconnecting state
          testConfig.sendFunc(transport, new Message('test'), function () {
            assert.isTrue(fakeMqttBase.connect.calledTwice);
            assert.isTrue(fakeMqttBase.disconnect.calledOnce);
            assert.isTrue(fakeMqttBase.publish.calledOnce);
            testCallback();
          });
          disconnectCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_16_027: [The `sendEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to publish the message.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_050: [ The `sendOutputEvent` method shall call its callback with an `Error` that has been translated using the `translateError` method if the `MqttBase` object fails to publish the message. ]*/
      it('calls its callback with an Error if it fails to publish the message', function (testCallback) {
        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        fakeMqttBase.publish = sinon.stub().callsArgWith(3, new Error('Server unavailable'));
        testConfig.sendFunc(transport, new Message('test'), function (err) {
          assert.isTrue(fakeMqttBase.connect.calledOnce);
          assert.instanceOf(err, errors.ServiceUnavailableError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_008: [** The `sendEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/messages/events/`.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_034: [ If the connection string specifies a `moduleId` value, the `sendEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/<moduleId>/messages/events/` ]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_036: [ If a `moduleId` was not specified in the transport connection, the `sendOutputEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/messages/events/`. ]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_037: [ If a `moduleId` was specified in the transport connection, the `sendOutputEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/<moduleId>/messages/events/`. ]*/
      it('uses the proper topic format:' + testConfig.baseTopicWithoutProps, function(done) {
        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        transport.connect(function () {
          testConfig.sendFunc(transport, new Message('test'), function() {});
          assert.equal(fakeMqttBase.publish.firstCall.args[0], testConfig.baseTopicWithoutProps + testConfig.topicEnder);
          done();
        });
      });

      /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_009: [** If the message has properties, the property keys and values shall be uri-encoded, then serialized and appended at the end of the topic with the following convention: `<key>=<value>&<key2>=<value2>&<key3>=<value3>(...)`.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_038: [ If the outputEvent message has properties, the property keys and values shall be uri-encoded, then serialized and appended at the end of the topic with the following convention: `<key>=<value>&<key2>=<value2>&<key3>=<value3>(...)`. ]*/
      it('correctly serializes properties on the topic', function(done) {
        var testMessage = new Message('message');
        testMessage.properties.add('key1', 'value1');
        testMessage.properties.add('key2', 'value2');
        testMessage.properties.add('key$', 'value$');

        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        transport.connect(function () {
          testConfig.sendFunc(transport, testMessage, function() {
            assert.equal(fakeMqttBase.publish.firstCall.args[0], testConfig.baseTopicWithProps+'key1=value1&key2=value2&key%24=value%24' + testConfig.topicEnder);
            done();
          });
        });
      });

      /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_010: [** The `sendEvent` method shall use QoS level of 1.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_039: [ The `sendOutputEvent` method shall use QoS level of 1. ]*/
      it('uses a QoS of 1', function(done) {
        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        transport.connect(function () {
          testConfig.sendFunc(transport, new Message('message'), function() {
            assert.equal(fakeMqttBase.publish.args[0][2].qos, 1);
            done();
          });
        });
        fakemqtt.emit('connect', { connack: true });
      });

      [
        /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_011: [The `sendEvent` method shall serialize the `messageId` property of the message as a key-value pair on the topic with the key `$.mid`.]*/
        /*Tests_SRS_NODE_DEVICE_MQTT_18_040: [ The `sendOutputEvent` method shall serialize the `messageId` property of the message as a key-value pair on the topic with the key `$.mid`. ]*/
        { propName: 'messageId', serializedAs: '%24.mid', fakeValue: 'fakeMessageId' },
        /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_012: [The `sendEvent` method shall serialize the `correlationId` property of the message as a key-value pair on the topic with the key `$.cid`.]*/
        /*Tests_SRS_NODE_DEVICE_MQTT_18_041: [ The `sendOutputEvent` method shall serialize the `correlationId` property of the message as a key-value pair on the topic with the key `$.cid`. ]*/
        { propName: 'correlationId', serializedAs: '%24.cid', fakeValue: 'fakeCorrelationId' },
        /*Tests_SRS_NODE_DEVICE_MQTT_18_042: [ The `sendOutputEvent` method shall serialize the `userId` property of the message as a key-value pair on the topic with the key `$.uid`. ]*/
        /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_013: [The `sendEvent` method shall serialize the `userId` property of the message as a key-value pair on the topic with the key `$.uid`.]*/
        { propName: 'userId', serializedAs: '%24.uid', fakeValue: 'fakeUserId' },
        /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_014: [The `sendEvent` method shall serialize the `to` property of the message as a key-value pair on the topic with the key `$.to`.]*/
        /*Tests_SRS_NODE_DEVICE_MQTT_18_043: [ The `sendOutputEvent` method shall serialize the `to` property of the message as a key-value pair on the topic with the key `$.to`. ]*/
        { propName: 'to', serializedAs: '%24.to', fakeValue: 'fakeTo' },
        /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_015: [The `sendEvent` method shall serialize the `expiryTimeUtc` property of the message as a key-value pair on the topic with the key `$.exp`.]*/
        /*Tests_SRS_NODE_DEVICE_MQTT_18_044: [ The `sendOutputEvent` method shall serialize the `expiryTimeUtc` property of the message as a key-value pair on the topic with the key `$.exp`. ]*/
        { propName: 'expiryTimeUtc', serializedAs: '%24.exp', fakeValue: 'fakeDateString' },
        { propName: 'expiryTimeUtc', serializedAs: '%24.exp', fakeValue: new Date(1970, 1, 1), fakeSerializedValue: encodeURIComponent(new Date(1970, 1, 1).toISOString()) },
        /*Tests_SRS_NODE_DEVICE_MQTT_16_083: [The `sendEvent` method shall serialize the `contentEncoding` property of the message as a key-value pair on the topic with the key `$.ce`.]*/
        { propName: 'contentEncoding', serializedAs: '%24.ce', fakeValue: 'utf-8' },
        /*Tests_SRS_NODE_DEVICE_MQTT_16_084: [The `sendEvent` method shall serialize the `contentType` property of the message as a key-value pair on the topic with the key `$.ct`.]*/
        { propName: 'contentType', serializedAs: '%24.ct', fakeValue: 'application/json', fakeSerializedValue: encodeURIComponent('application/json') }
      ].forEach(function(testProperty) {
        it('serializes Message.' + testProperty.propName + ' as ' + decodeURIComponent(testProperty.serializedAs) + ' on the topic', function(done) {
          var testMessage = new Message('message');
          testMessage[testProperty.propName] = testProperty.fakeValue;
          testMessage.properties.add('fakeKey', 'fakeValue');

          var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
          transport.connect(function () {
            testConfig.sendFunc(transport, testMessage, function() {
              var serializedPropertyValue = testProperty.fakeSerializedValue || testProperty.fakeValue;
              assert.equal(fakeMqttBase.publish.firstCall.args[0], testConfig.baseTopicWithProps + testProperty.serializedAs + '=' + serializedPropertyValue + '&fakeKey=fakeValue' + testConfig.topicEnder);
              done();
            });
          });
        });
      });
    });
  });

  describe('#onDeviceMethod', function () {
    it('calls the registered callback when a method is received', function (testCallback) {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.connect(function () {
        mqtt.onDeviceMethod('testMethod', function () {
          testCallback();
        });
        mqtt.emit('method_testMethod', {});
      });
    });
  });

  describe('#sendMethodResponse', function() {
    // Tests_SRS_NODE_DEVICE_MQTT_13_001: [ sendMethodResponse shall throw an Error if response is falsy or does not conform to the shape defined by DeviceMethodResponse. ]
    [
      // response is falsy
      null,
      // response is falsy
      undefined,
      // response.requestId is falsy
      {},
      // response.requestId is not a string
      { requestId: 42 },
      // response.requestId is an empty string
      { requestId: '' },
      // response.properties is falsy
      { requestId: 'req1' },
      // response.properties is not an object
      {
        requestId: 'req1',
        properties: 42
      },
      // response.properties has empty string keys
      {
        requestId: 'req1',
        properties: {
          '': 'val1'
        }
      },
      // response.properties has non-string values
      {
        requestId: 'req1',
        properties: {
          'k1': 42
        }
      },
      // response.properties has empty string values
      {
        requestId: 'req1',
        properties: {
          'k1': ''
        }
      },
      // response.status is falsy
      {
        requestId: 'req1',
        properties: {
          'k1': 'v1'
        }
      },
      // response.status is not a number
      {
        requestId: 'req1',
        properties: {
          'k1': 'v1'
        },
        status: '200'
      }
    ].forEach(function(response) {
      it('throws an Error if response is falsy or is improperly constructed', function()
      {
        var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        assert.throws(function() {
          mqtt.sendMethodResponse(response, null);
        });
      });
    });

    // Tests_SRS_NODE_DEVICE_MQTT_13_002: [ sendMethodResponse shall build an MQTT topic name in the format: $iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES> where <STATUS> is response.status. ]
    // Tests_SRS_NODE_DEVICE_MQTT_13_003: [ sendMethodResponse shall build an MQTT topic name in the format: $iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES> where <REQUEST ID> is response.requestId. ]
    // Tests_SRS_NODE_DEVICE_MQTT_13_004: [ sendMethodResponse shall build an MQTT topic name in the format: $iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES> where <PROPERTIES> is URL encoded. ]
    it('formats MQTT topic with status code', function(testCallback) {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.connect(function () {
        mqtt.sendMethodResponse({
          requestId: 'req1',
          status: 200,
          payload: null
        }, function () {
          assert.isTrue(fakeMqttBase.publish.calledOnce);
          assert.strictEqual(fakeMqttBase.publish.args[0][0], '$iothub/methods/res/200/?$rid=req1');
          testCallback();
        });
      });
    });

    // Tests_SRS_NODE_DEVICE_MQTT_13_006: [ If the MQTT publish fails then an error shall be returned via the done callback's first parameter. ]
    it('calls callback with error when mqtt publish fails', function(testCallback) {
      var testError = new Error('No connection to broker');
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      fakeMqttBase.publish = sinon.stub().callsArgWith(3, testError);

      mqtt.connect(function () {
        mqtt.sendMethodResponse({
          requestId: 'req1',
          status: 200,
          payload: null
        }, function (err) {
          assert.strictEqual(err.transportError, testError);
          testCallback();
        });
      });
    });

    // Tests_SRS_NODE_DEVICE_MQTT_13_007: [ If the MQTT publish is successful then the done callback shall be invoked passing null for the first parameter. ]
    it('calls callback with null when mqtt publish succeeds', function(testCallback) {
      // setup
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);

      // test
      mqtt.connect(function () {
        mqtt.sendMethodResponse({
          requestId: 'req1',
          status: 200,
          payload: null
        }, testCallback);
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_034: [The `sendMethodResponse` method shall fail with a `NotConnectedError` if the `MqttBase` object is not connected.]*/
    it('immediately fails and does not try to connect if the transport is disconnected', function (testCallback) {
      var fakeResponse = {
        requestId: 'req1',
        status: 200,
        payload: null
      };

      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.sendMethodResponse(fakeResponse, function (err) {
        assert.isTrue(fakeMqttBase.connect.notCalled);
        assert.instanceOf(err, errors.NotConnectedError);
        testCallback();
      });
    });
  });

  describe('#setOptions', function() {
    var fakeX509Options = { cert: 'cert', key: 'key'};
    var fakeConfig = {
      host: 'host',
      deviceId: 'deviceId',
      x509: fakeX509Options
    };

    var fakeX509AuthenticationProvider;

    beforeEach(function () {
      fakeX509AuthenticationProvider= {
        getDeviceCredentials: sinon.stub().callsArgWith(0, null, fakeConfig),
        setX509Options: sinon.stub()
      };
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_011: [The `setOptions` method shall throw a `ReferenceError` if the `options` argument is falsy]*/
    [null, undefined].forEach(function(badOptions) {
      it('throws a ReferenceError if the `options` argument is \'' + badOptions + '\'', function() {
        var mqtt = new Mqtt(fakeX509AuthenticationProvider);
        assert.throws(function() {
          mqtt.setOptions(badOptions);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_015: [The `setOptions` method shall throw an `ArgumentError` if the `cert` property is populated but the device uses symmetric key authentication.]*/
    it('throws an ArgumentError if the options.cert property is set but the device is using symmetric key authentication', function() {
      var mqtt = new Mqtt(fakeAuthenticationProvider);
      assert.throws(function() {
        mqtt.setOptions(fakeX509Options);
      }, errors.ArgumentError);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_012: [The `setOptions` method shall update the existing configuration of the MQTT transport with the content of the `options` object.]*/
    it('updates the existing configuration with new options', function() {
      var mqtt = new Mqtt(fakeX509AuthenticationProvider);
      mqtt.setOptions(fakeX509Options);
      assert.strictEqual(fakeX509AuthenticationProvider.setX509Options.firstCall.args[0], fakeX509Options);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_013: [If a `done` callback function is passed as a argument, the `setOptions` method shall call it when finished with no arguments.]*/
    it('calls the `done` callback with no arguments when finished', function(done){
      var mqtt = new Mqtt(fakeX509AuthenticationProvider);
      mqtt.setOptions(fakeX509Options, done);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_014: [The `setOptions` method shall not throw if the `done` argument is not passed.]*/
    it('doesn\'t throw if `done` is not passed in the arguments', function() {
      var mqtt = new Mqtt(fakeX509AuthenticationProvider);
      assert.doesNotThrow(function() {
        mqtt.setOptions(fakeX509Options);
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_069: [The `setOptions` method shall obtain the current credentials by calling `getDeviceCredentials` on the `AuthenticationProvider` passed to the constructor as an argument.]*/
    it('calls getDeviceCredentials on the AuthenticationProvider', function (testCallback) {
      var mqtt = new Mqtt(fakeX509AuthenticationProvider);
      mqtt.setOptions(fakeX509Options, function () {
        assert.isTrue(fakeX509AuthenticationProvider.getDeviceCredentials.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_070: [The `setOptions` method shall call its callback with the error returned by `getDeviceCredentials` if it fails to return the credentials.]*/
    it('calls its callback with an error if AuthenticationProvider.getDeviceCredentials fails', function (testCallback) {
      var fakeError = new Error('fake');
      fakeX509AuthenticationProvider.getDeviceCredentials = sinon.stub().callsArgWith(0, fakeError);
      var mqtt = new Mqtt(fakeX509AuthenticationProvider);
      mqtt.setOptions(fakeX509Options, function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });
  });

  describe('#connect', function() {
    /* Tests_SRS_NODE_DEVICE_MQTT_12_004: [The connect method shall call the connect method on MqttBase */
    it ('calls connect on the transport', function(testCallback) {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.connect(function(err, result) {
        assert(fakeMqttBase.connect.calledOnce);
        /*Tests_SRS_NODE_DEVICE_MQTT_16_020: [The `connect` method shall call its callback with a `null` error parameter and a `results.Connected` response if `MqttBase` successfully connects.]*/
        assert.instanceOf(result, results.Connected);
        testCallback();
      });
    });


    getUserAgentString(function(userAgentString) {
      [
        /*Tests_SRS_NODE_DEVICE_MQTT_16_016: [If the connection string does not specify a `gatewayHostName` value, the `Mqtt` constructor shall initialize the `uri` property of the `config` object to `mqtts://<host>`.]*/
        {
          fieldNameToSet: null,
          fieldValueToSet: null,
          fieldNameToCheck: 'uri',
          fieldValueToCheck: 'mqtts://host.name'
        },
        /*Tests_SRS_NODE_DEVICE_MQTT_18_052: [ If a `moduleId` is specified in the connection string, the Mqtt constructor shall initialize the `clientId` property of the `config` object to '<deviceId>/<moduleId>'. ]*/
        {
          fieldNameToSet: 'moduleId',
          fieldValueToSet: 'moduleId',
          fieldNameToCheck: 'clientId',
          fieldValueToCheck: 'deviceId/moduleId'
        },
        /*Tests_SRS_NODE_DEVICE_MQTT_18_053: [ If a `moduleId` is not specified in the connection string, the Mqtt constructor shall initialize the `clientId` property of the `config` object to '<deviceId>'. ]*/
        {
          fieldNameToSet: null,
          fieldValueToSet: null,
          fieldNameToCheck: 'clientId',
          fieldValueToCheck: 'deviceId'
        },
        /*Tests_SRS_NODE_DEVICE_MQTT_18_054: [ If a `gatewayHostName` is specified in the connection string, the Mqtt constructor shall initialize the `uri` property of the `config` object to `mqtts://<gatewayhostname>`. ]*/
        {
          fieldNameToSet: 'gatewayHostName',
          fieldValueToSet: 'fakeGatewayHost',
          fieldNameToCheck: 'uri',
          fieldValueToCheck: 'mqtts://fakeGatewayHost'
        },
        /*Tests_SRS_NODE_DEVICE_MQTT_18_055: [ The Mqtt constructor shall initialize the `username` property of the `config` object to '<host>/<clientId>/api-version=<version>&DeviceClientType=<agentString>'. ]*/
        {
          fieldNameToSet: null,
          fieldValueToSet: null,
          fieldNameToCheck: 'username',
          fieldValueToCheck: 'host.name/deviceId/' + endpoint.versionQueryString() + '&DeviceClientType=' + encodeURIComponent(userAgentString)
        }
      ].forEach(function (testConfig) {
        it('sets the ' + testConfig.fieldNameToCheck + ' to \'' + testConfig.fieldValueToCheck + '\'', function (testCallback) {
          if (testConfig.fieldNameToSet) {
            fakeConfig[testConfig.fieldNameToSet] = testConfig.fieldValueToSet;
          }
          var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
          mqtt.connect(function () {
            assert.strictEqual(fakeMqttBase.connect.firstCall.args[0][testConfig.fieldNameToCheck], testConfig.fieldValueToCheck);
            testCallback();
          });
        });
      });
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_026: When MqttBase fires an error event, the Mqtt object shall emit a disconnect event */
    it('registers to emit disconnect when an error received', function (testCallback) {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.on('disconnect', testCallback);
      mqtt.connect(function () {
        fakeMqttBase.emit('error');
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_018: [The `connect` method shall call its callback immediately if `MqttBase` is already connected.]*/
    it('calls the callback immediately if already connected', function (testCallback) {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.connect(function() {
        assert(fakeMqttBase.connect.calledOnce);
        mqtt.connect(function () {
          assert(fakeMqttBase.connect.calledOnce);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_019: [The `connect` method shall calls its callback with an `Error` that has been translated from the `MqttBase` error using the `translateError` method if it fails to establish a connection.]*/
    it('calls the callback with an error if it fails to connect', function (testCallback) {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      fakeMqttBase.connect = sinon.stub().callsArgWith(1, new Error('Not authorized'));
      mqtt.connect(function (err) {
        assert.instanceOf(err, errors.UnauthorizedError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_067: [The `connect` method shall call the `getDeviceCredentials` method of the `AuthenticationProvider` object passed to the constructor to obtain the credentials of the device.]*/
    it('calls getDeviceCredentials on the AuthenticationProvider', function (testCallback) {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.connect(function () {
        assert.isTrue(fakeAuthenticationProvider.getDeviceCredentials.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_068: [The `connect` method shall call its callback with the error returned by `getDeviceCredentials` if it fails to return the device credentials.]*/
    it('calls its callback with an error if `getDeviceCredentials` returns an error', function (testCallback) {
      var fakeError = new Error('fake');
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      fakeAuthenticationProvider.getDeviceCredentials = sinon.stub().callsArgWith(0, fakeError);
      mqtt.connect(function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });
  });

  describe('#disconnect', function () {
    /*Tests_SRS_NODE_DEVICE_MQTT_16_021: [The `disconnect` method shall call its callback immediately with a `null` argument and a `results.Disconnected` second argument if `MqttBase` is already disconnected.]*/
    it('calls the callback immediately if already disconnected', function (testCallback) {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.disconnect(function () {
        assert.isTrue(fakeMqttBase.connect.notCalled);
        assert.isTrue(fakeMqttBase.disconnect.notCalled);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_001: [The `disconnect` method should call the `disconnect` method on `MqttBase`.]*/
    /*Tests_SRS_NODE_DEVICE_MQTT_16_022: [The `disconnect` method shall call its callback with a `null` error parameter and a `results.Disconnected` response if `MqttBase` successfully disconnects if not disconnected already.]*/
    it('disconnects the transport if connected', function (testCallback) {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.connect(function () {
        mqtt.disconnect(function () {
          assert.isTrue(fakeMqttBase.disconnect.calledOnce);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_001: [The `disconnect` method should call the `disconnect` method on `MqttBase`.]*/
    /*Tests_SRS_NODE_DEVICE_MQTT_16_022: [The `disconnect` method shall call its callback with a `null` error parameter and a `results.Disconnected` response if `MqttBase` successfully disconnects if not disconnected already.]*/
    it('disconnects the transport if connecting', function (testCallback) {
      fakeMqttBase.connect = sinon.stub(); // will block in 'connecting' state
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.connect(function () {});
      mqtt.disconnect(function () {
        assert.isTrue(fakeMqttBase.disconnect.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_085: [Once the MQTT transport is disconnected and if it is using a token authentication provider, the `stop` method of the `AuthenticationProvider` object shall be called to stop any running timer.]*/
    it('calls stop on the authentication provider if using token authentication', function (testCallback) {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.connect(function () {});
      mqtt.disconnect(function () {
        assert.isTrue(fakeAuthenticationProvider.stop.calledTwice); // once when instantiated, once when disconnected
        testCallback();
      });
    });
  });

  describe('#updateSharedAccessSignature', function () {
    /*Tests_SRS_NODE_DEVICE_MQTT_16_007: [The `updateSharedAccessSignature` method shall save the new shared access signature given as a parameter to its configuration.]*/
    it('does not require reconnecting if disconnected but uses the new shared access signature on subsequent calls', function (testCallback) {
      var newSas = 'newSas';
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.updateSharedAccessSignature(newSas, function () {
        assert.isTrue(fakeMqttBase.connect.notCalled);
        assert.isTrue(fakeMqttBase.disconnect.notCalled);
        assert.isTrue(fakeAuthenticationProvider.updateSharedAccessSignature.calledWith(newSas));
        assert.isTrue(fakeAuthenticationProvider.getDeviceCredentials.notCalled);
        mqtt.connect(function () {
          assert.isTrue(fakeAuthenticationProvider.getDeviceCredentials.calledOnce);
        });
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_009: [The `updateSharedAccessSignature` method shall call the `done` method with an `Error` object if `MqttBase.updateSharedAccessSignature` fails.]*/
    it('calls the callback with an error if it fails to reconnect the MQTT connection', function (testCallback) {
      var newSas = 'newSas';
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.connect(function () {
        fakeMqttBase.updateSharedAccessSignature = sinon.stub().callsArgWith(1, new Error('Not authorized'));
        mqtt.updateSharedAccessSignature(newSas, function (err) {
          assert.isTrue(fakeMqttBase.connect.calledOnce);
          assert.instanceOf(err, errors.UnauthorizedError);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_010: [The `updateSharedAccessSignature` method shall call the `done` callback with a `null` error object and a `SharedAccessSignatureUpdated` object with its `needToReconnect` property set to `false`, if `MqttBase.updateSharedAccessSignature` succeeds.]*/
    it('calls the callback and does not require the client to handle reconnection if it succeeds', function (testCallback) {
      var newSas = 'newSas';
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.connect(function () {
        mqtt.updateSharedAccessSignature(newSas, function (err, result) {
          assert.isNotOk(err);
          /*Tests_SRS_NODE_DEVICE_MQTT_16_028: [The `updateSharedAccessSignature` method shall call the `updateSharedAccessSignature` method on the `MqttBase` object if it is connected.]*/
          assert.isTrue(fakeMqttBase.updateSharedAccessSignature.calledOnce);
          assert.instanceOf(result, results.SharedAccessSignatureUpdated);
          assert.isFalse(result.needToReconnect);
          testCallback();
        });
      });
    });
  });

  /*Tests_SRS_NODE_DEVICE_MQTT_16_005: [The `complete` method shall call the `done` callback given as argument immediately since all messages are automatically completed.]*/
  describe('#complete', function () {
    it('immediately calls the callback with a MessageCompleted result', function (testCallback) {
      var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      mqtt.complete(new Message('fake'), function (err, result)  {
        assert.isNotOk(err);
        assert.instanceOf(result, results.MessageCompleted);
        testCallback();
      });
    });
  });

  /*Tests_SRS_NODE_DEVICE_MQTT_16_004: [The `abandon` method shall throw because MQTT doesn’t support abandoning messages.]*/
  /*Tests_SRS_NODE_DEVICE_MQTT_16_006: [The `reject` method shall throw because MQTT doesn’t support rejecting messages.]*/
  /*Tests_SRS_NODE_DEVICE_MQTT_16_056: [The `sendEventBatch` method shall throw a `NotImplementedError`]*/
  /*Tests_SRS_NODE_DEVICE_MQTT_18_051: [`sendOutputEventBatch` shall throw a `NotImplementedError` exception. ]*/
  ['abandon', 'reject', 'sendEventBatch', 'sendOutputEventBatch'].forEach(function (method) {
    describe('#' + method, function ()  {
      it('throws a NotImplementedError', function () {
        var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        assert.throws(function () {
          mqtt[method](new Message('fake'), function () {});
        }, errors.NotImplementedError);
      });
    });
  });

  [
    {
      methodName: 'enableC2D',
      topicName: 'devices/deviceId/messages/devicebound/#',
      qos: 1
    },
    {
      methodName: 'enableMethods',
      topicName: '$iothub/methods/POST/#',
      qos: 0
    },
    {
      methodName: 'enableInputMessages',
      moduleId: 'moduleId',
      topicName: 'devices/deviceId/modules/moduleId/inputs/#',
      qos: 1
    },
  ].forEach(function (testConfig) {
    describe('#' + testConfig.methodName, function () {
      beforeEach(function() {
        fakeConfig.moduleId = testConfig.moduleId;
      });

      it('connects the transport if necessary', function (testCallback) {
        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        transport[testConfig.methodName](function (err) {
          /*Tests_SRS_NODE_DEVICE_MQTT_16_047: [`enableC2D` shall connect the MQTT connection if it is disconnected.]*/
          /*Tests_SRS_NODE_DEVICE_MQTT_16_038: [`enableMethods` shall connect the MQTT connection if it is disconnected.]*/
          /*Tests_SRS_NODE_DEVICE_MQTT_16_057: [`enableTwinDesiredPropertiesUpdates` shall connect the MQTT connection if it is disconnected.]*/
          /*Tests_SRS_NODE_DEVICE_MQTT_18_059: [ `enableInputMessages` shall connect the MQTT connection if it is disconnected. ]*/
          assert.isTrue(fakeMqttBase.connect.calledOnce);
          /*Tests_SRS_NODE_DEVICE_MQTT_16_050: [`enableC2D` shall call its callback with no arguments when the `SUBACK` packet is received.]*/
          /*Tests_SRS_NODE_DEVICE_MQTT_16_051: [`enableMethods` shall call its callback with no arguments when the `SUBACK` packet is received.]*/
          /*Tests_SRS_NODE_DEVICE_MQTT_18_062: [ `enableInputMessages` shall call its callback with no arguments when the `SUBACK` packet is received. ]*/
          assert.isUndefined(err);
          /*Tests_SRS_NODE_DEVICE_MQTT_16_049: [`enableC2D` shall subscribe to the MQTT topic for messages with a QoS of `1`.]*/
          /*Tests_SRS_NODE_DEVICE_MQTT_16_040: [`enableMethods` shall subscribe to the MQTT topic for direct methods.]*/
          /*Tests_SRS_NODE_DEVICE_MQTT_18_061: [ `enableInputMessages` shall subscribe to the MQTT topic for inputMessages. ]*/
          assert.equal(fakeMqttBase.subscribe.firstCall.args[0], testConfig.topicName);
          assert.strictEqual(fakeMqttBase.subscribe.firstCall.args[1].qos, testConfig.qos);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_16_048: [`enableC2D` shall calls its callback with an `Error` object if it fails to connect.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_16_039: [`enableMethods` shall calls its callback with an `Error` object if it fails to connect.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_16_058: [`enableTwinDesiredPropertiesUpdates` shall calls its callback with an `Error` object if it fails to connect.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_060: [ `enableInputMessages` shall calls its callback with an `Error` object if it fails to connect. ]*/
      it('calls its callback with an error if it fails to connect', function (testCallback) {
        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        fakeMqttBase.connect = sinon.stub().callsArgWith(1, new Error('fake error'));
        transport[testConfig.methodName](function (err) {
          assert.isTrue(fakeMqttBase.connect.calledOnce);
          assert.instanceOf(err, Error);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_16_052: [`enableC2D` shall call its callback with an `Error` if subscribing to the topic fails.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_16_053: [`enableMethods` shall call its callback with an `Error` if subscribing to the topic fails.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_16_061: [`enableTwinDesiredPropertiesUpdates` shall call its callback with an `Error` if subscribing to the topics fails.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_063: [ `enableInputMessages` shall call its callback with an `Error` if subscribing to the topic fails. ]*/
      it('calls its callback with an error if subscribing fails', function (testCallback) {
        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        fakeMqttBase.subscribe = sinon.stub().callsArgWith(2, new Error('fake error'));
        transport.connect(function () {
          transport[testConfig.methodName](function (err) {
            assert.isTrue(fakeMqttBase.subscribe.calledOnce);
            assert.instanceOf(err, Error);
            testCallback();
          });
        });
      });
    });
  });

  [
    { enableFeatureMethod: 'enableC2D', disableFeatureMethod: 'disableC2D' },
    { enableFeatureMethod: 'enableMethods', disableFeatureMethod: 'disableMethods' },
    { enableFeatureMethod: 'enableTwinDesiredPropertiesUpdates', disableFeatureMethod: 'disableTwinDesiredPropertiesUpdates' },
    { enableFeatureMethod: 'enableInputMessages', disableFeatureMethod: 'disableInputMessages', moduleId: 'moduleId' }
  ].forEach(function (testConfig) {
    describe('#' + testConfig.disableFeatureMethod, function () {
      beforeEach(function() {
        fakeConfig.moduleId = testConfig.moduleId;
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_16_041: [`disableC2D` shall call its callback immediately if the MQTT connection is already disconnected.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_16_044: [`disableMethods` shall call its callback immediately if the MQTT connection is already disconnected.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_16_062: [`disableTwinDesiredPropertiesUpdates` shall call its callback immediately if the MQTT connection is already disconnected.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_064: [ `disableInputMessages` shall call its callback immediately if the MQTT connection is already disconnected. ]*/
      it('immediately calls its callback if the disconnected', function (testCallback) {
        var mqtt = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        mqtt[testConfig.disableFeatureMethod](function () {
          assert.isTrue(fakeMqttBase.connect.notCalled);
          assert.isTrue(fakeMqttBase.disconnect.notCalled);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_16_043: [`disableC2D` shall call its callback with an `Error` if an error is received while unsubscribing.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_16_046: [`disableMethods` shall call its callback with an `Error` if an error is received while unsubscribing.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_16_065: [`disableTwinDesiredPropertiesUpdates` shall call its callback with an `Error` if an error is received while unsubscribing.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_067: [ `disableInputMessages` shall call its callback with an `Error` if an error is received while unsubscribing. ]*/
      it('calls its callback with an error if it fails to unsubscribe', function (testCallback) {
        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        fakeMqttBase.unsubscribe = sinon.stub().callsArgWith(1, new Error('fake error'));
        transport.connect(function () {
          transport[testConfig.enableFeatureMethod](function () {
            transport[testConfig.disableFeatureMethod](function (err) {
              /*Tests_SRS_NODE_DEVICE_MQTT_16_042: [`disableC2D` shall unsubscribe from the topic for C2D messages.]*/
              /*Tests_SRS_NODE_DEVICE_MQTT_16_045: [`disableMethods` shall unsubscribe from the topic for direct methods.]*/
              /*Tests_SRS_NODE_DEVICE_MQTT_16_063: [`disableTwinDesiredPropertiesUpdates` shall unsubscribe from the topics for twin messages.]*/
              assert.isTrue(fakeMqttBase.unsubscribe.called);
              assert.instanceOf(err, Error);
              testCallback();
            });
          });
        });
      });

      /*Tests_SRS_NODE_DEVICE_MQTT_16_054: [`disableC2D` shall call its callback with no arguments when the `UNSUBACK` packet is received.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_16_055: [`disableMethods` shall call its callback with no arguments when the `UNSUBACK` packet is received.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_16_064: [`disableTwinDesiredPropertiesUpdates` shall call its callback with no arguments when the `UNSUBACK` packet is received.]*/
      /*Tests_SRS_NODE_DEVICE_MQTT_18_066: [ `disableInputMessages` shall call its callback with no arguments when the `UNSUBACK` packet is received. ]*/
      it('unsubscribes and calls its callback', function (testCallback) {
        var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
        transport.connect(function () {
          transport[testConfig.enableFeatureMethod](function () {
            transport[testConfig.disableFeatureMethod](function (err) {
              /*Tests_SRS_NODE_DEVICE_MQTT_16_042: [`disableC2D` shall unsubscribe from the topic for C2D messages.]*/
              /*Tests_SRS_NODE_DEVICE_MQTT_16_045: [`disableMethods` shall unsubscribe from the topic for direct methods.]*/
              /*Tests_SRS_NODE_DEVICE_MQTT_16_063: [`disableTwinDesiredPropertiesUpdates` shall unsubscribe from the topics for twin messages.]*/
              /*Tests_SRS_NODE_DEVICE_MQTT_18_065: [ `disableInputMessages` shall unsubscribe from the topic for inputMessages. ]*/
              assert.isTrue(fakeMqttBase.unsubscribe.called);
              assert.isUndefined(err);
              testCallback();
            });
          });
        });
      });
    });
  });

  describe('#getTwin', function () {
    /*Tests_SRS_NODE_DEVICE_MQTT_16_075: [`getTwin` shall establish the MQTT connection by calling `connect` on the `MqttBase` object if it is disconnected.]*/
    it('connects the transport if disconnected', function () {
      var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      transport.getTwin(function () {});
      assert.isTrue(fakeMqttBase.connect.calledOnce);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_076: [`getTwin` shall call its callback with an error if it fails to connect the transport]*/
    it('calls the callback with an error if the transport fails to connect', function (testCallback) {
      fakeMqttBase.connect = sinon.stub().callsArgWith(1, new Error('fake'));
      var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      transport.getTwin(function (err) {
        assert.instanceOf(err, Error);
        testCallback();
      });
    });
    /*Tests_SRS_NODE_DEVICE_MQTT_16_077: [`getTwin` shall call the `getTwin` method on the `MqttTwinClient` object and pass it its callback.]*/
    it('calls getTwin on the MqttTwinClient object and passes its callback', function (testCallback) {
      var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      var fakeCallback = function () {};
      sinon.spy(transport._twinClient, 'getTwin');
      transport.connect(function () {
        transport.getTwin(fakeCallback);
        assert.isTrue(transport._twinClient.getTwin.calledOnce);
        assert.isTrue(transport._twinClient.getTwin.calledWith(fakeCallback));
        testCallback();
      });
    });
  });

  describe('#updateTwinReportedProperties', function () {
    var fakePatch = {
      fake: 'patch'
    };
    /*Tests_SRS_NODE_DEVICE_MQTT_16_078: [`updateTwinReportedProperties` shall establish the MQTT connection by calling `connect` on the `MqttBase` object if it is disconnected.]*/
    it('connects the transport if disconnected', function () {
      var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      transport.updateTwinReportedProperties(fakePatch, function () {});
      assert.isTrue(fakeMqttBase.connect.calledOnce);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_079: [`updateTwinReportedProperties` shall call its callback with an error if it fails to connect the transport.]*/
    it('calls the callback with an error if the transport fails to connect', function (testCallback) {
      fakeMqttBase.connect = sinon.stub().callsArgWith(1, new Error('fake'));
      var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      transport.updateTwinReportedProperties(fakePatch, function (err) {
        assert.instanceOf(err, Error);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_080: [`updateTwinReportedProperties` shall call the `updateTwinReportedProperties` method on the `MqttTwinClient` object and pass it its callback.]*/
    it('calls updateTwinReportedProperties on the MqttTwinClient object and passes its callback', function (testCallback) {
      var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      var fakeCallback = function () {};
      sinon.spy(transport._twinClient, 'updateTwinReportedProperties');
      transport.connect(function () {
        transport.updateTwinReportedProperties(fakePatch, fakeCallback);
        assert.isTrue(transport._twinClient.updateTwinReportedProperties.calledOnce);
        assert.isTrue(transport._twinClient.updateTwinReportedProperties.calledWith(fakePatch, fakeCallback));
        testCallback();
      });
    });
  });

  describe('#enableTwinDesiredPropertiesUpdates', function () {
    /*Tests_SRS_NODE_DEVICE_MQTT_16_057: [`enableTwinDesiredPropertiesUpdates` shall connect the MQTT connection if it is disconnected.]*/
    it('connects the transport if necessary', function (testCallback) {
      var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      transport.enableTwinDesiredPropertiesUpdates(function () {
        assert.isTrue(fakeMqttBase.connect.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_058: [`enableTwinDesiredPropertiesUpdates` shall calls its callback with an `Error` object if it fails to connect.]*/
    it('calls its callback with an error if connecting the transport fails', function (testCallback) {
      var fakeError = new Error('fake');
      var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      fakeMqttBase.connect = sinon.stub().callsArgWith(1, fakeError);
      transport.enableTwinDesiredPropertiesUpdates(function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_059: [`enableTwinDesiredPropertiesUpdates` shall call the `enableTwinDesiredPropertiesUpdates` on the `MqttTwinClient` object created by the constructor and pass it its callback.]*/
    it('calls \'enableTwinDesiredPropertiesUpdates\' on the MqttTwinClient and passes its callback', function () {
      var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      sinon.spy(transport._twinClient, 'enableTwinDesiredPropertiesUpdates');
      transport.connect(function () {
        var callback = function () {};
        transport.enableTwinDesiredPropertiesUpdates(callback);
        assert.isTrue(transport._twinClient.enableTwinDesiredPropertiesUpdates.calledOnce);
        assert.isTrue(transport._twinClient.enableTwinDesiredPropertiesUpdates.calledWith(callback));
      });
    });
  });

  describe('#disableTwinDesiredPropertiesUpdates', function () {
    /*Tests_SRS_NODE_DEVICE_MQTT_16_083: [`disableTwinDesiredPropertiesUpdates` shall call the `disableTwinDesiredPropertiesUpdates` on the `MqttTwinClient` object created by the constructor and pass it its callback.]*/
    it('calls \'disableTwinDesiredPropertiesUpdates\' on the MqttTwinClient and passes its callback', function () {
      var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      sinon.spy(transport._twinClient, 'disableTwinDesiredPropertiesUpdates');
      transport.connect(function () {
        var callback = function () {};
        transport.disableTwinDesiredPropertiesUpdates(callback);
        assert.isTrue(transport._twinClient.disableTwinDesiredPropertiesUpdates.calledOnce);
        assert.isTrue(transport._twinClient.disableTwinDesiredPropertiesUpdates.calledWith(callback));
      });
    });
  });

  describe('#on(\'twinDesiredPropertiesUpdate\'', function () {
    /*Tests_SRS_NODE_DEVICE_MQTT_16_081: [The `Mqtt` constructor shall subscribe to the `MqttTwinClient` `twinDesiredPropertiesUpdates`.]*/
    /*Tests_SRS_NODE_DEVICE_MQTT_16_082: [A `twinDesiredPropertiesUpdates` shall be emitted by the `Mqtt` object for each `twinDesiredPropertiesUpdates` event received from the `MqttTwinClient` with the same payload. **/
    it('re-emits events \'twinDesiredPropertiesUpdate\' emitted by the twin client', function (testCallback) {
      var fakePatch = {
        fake: 'patch'
      };

      var transport = new Mqtt(fakeAuthenticationProvider, fakeMqttBase);
      transport.on('twinDesiredPropertiesUpdate', function (patch) {
        assert.strictEqual(patch, fakePatch);
        testCallback();
      });

      transport._twinClient.emit('twinDesiredPropertiesUpdate', fakePatch);
    });
  });
});
