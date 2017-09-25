// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

require('es5-shim');
var assert = require('chai').assert;
var sinon = require('sinon');
var Mqtt = require('../lib/mqtt.js').Mqtt;
var errors = require('azure-iot-common').errors;
var Message = require('azure-iot-common').Message;
var EventEmitter = require('events').EventEmitter;

describe('Mqtt', function () {
  var fakeConfig = {
    host: 'host.name',
    deviceId: 'deviceId',
    sharedAccessSignature: 'sas'
  };

  var fakeMqttBase;
  beforeEach(function () {
    fakeMqttBase = new EventEmitter();
    fakeMqttBase.connect = sinon.stub().callsArg(1);
    fakeMqttBase.disconnect = sinon.stub().callsArg(0);
    fakeMqttBase.publish = sinon.stub().callsArg(3);
    fakeMqttBase.subscribe = sinon.stub().callsArg(2);
    fakeMqttBase.unsubscribe = sinon.stub().callsArg(1);
  });

  afterEach(function () {
    fakeMqttBase = undefined;
  });

  describe('#constructor', function () {
    /* Tests_SRS_NODE_DEVICE_MQTT_12_001: [The `Mqtt` constructor shall accept the transport configuration structure */
    /* Tests_SRS_NODE_DEVICE_MQTT_12_002: [The `Mqtt` constructor shall store the configuration structure in a member variable */
    it('stores config and created transport in member', function () {
      var mqtt = new Mqtt(fakeConfig);
      assert.notEqual(mqtt, null);
      assert.notEqual(mqtt, undefined);
      assert.equal(mqtt._config, fakeConfig);
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_025: [** If the `Mqtt` constructor receives a second parameter, it shall be used as a provider in place of mqtt. **]**   */
    it ('accepts an mqttProvider for testing', function() {
      var mqtt = new Mqtt(fakeConfig, fakeMqttBase);
      assert.equal(mqtt._mqtt, fakeMqttBase);
    });
  });

  describe('#sendEvent', function () {
    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_008: [** The `sendEvent` method shall use a topic formatted using the following convention: `devices/<deviceId>/messages/events/`.]*/
    it('uses the proper topic format', function(done) {
      var config = {
        host: "host.name",
        deviceId: "deviceId",
        sharedAccessSignature: "sasToken"
      };

      var transport = new Mqtt(config, fakeMqttBase);
      transport.connect(function () {
        transport.sendEvent(new Message('test'), function() {});
        assert(fakeMqttBase.publish.calledWith('devices/deviceId/messages/events/'));
        done();
      });
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_009: [** If the message has properties, the property keys and values shall be uri-encoded, then serialized and appended at the end of the topic with the following convention: `<key>=<value>&<key2>=<value2>&<key3>=<value3>(...)`.]*/
    it('correctly serializes properties on the topic', function(done) {
      var config = {
        host: "host.name",
        deviceId: "deviceId",
        sharedAccessSignature: "sasToken"
      };

      var testMessage = new Message('message');
      testMessage.properties.add('key1', 'value1');
      testMessage.properties.add('key2', 'value2');
      testMessage.properties.add('key$', 'value$');

      var transport = new Mqtt(config, fakeMqttBase);
      transport.connect(function () {
        transport.sendEvent(testMessage, function() {
          assert(fakeMqttBase.publish.calledWith('devices/deviceId/messages/events/key1=value1&key2=value2&key%24=value%24'));
          done();
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_010: [** The `sendEvent` method shall use QoS level of 1.]*/
    it('uses a QoS of 1', function(done) {
      var config = {
        host: "host.name",
        deviceId: "deviceId",
        sharedAccessSignature: "sasToken"
      };

      var transport = new Mqtt(config, fakeMqttBase);
      transport.connect(function () {
        transport.sendEvent(new Message('message'), function() {
          assert.equal(fakeMqttBase.publish.args[0][2].qos, 1);
          done();
        });
      });
      fakemqtt.emit('connect', { connack: true });
    });

    [
      /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_011: [The `sendEvent` method shall serialize the `messageId` property of the message as a key-value pair on the topic with the key `$.mid`.]*/
      { propName: 'messageId', serializedAs: '%24.mid', fakeValue: 'fakeMessageId' },
      /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_012: [The `sendEvent` method shall serialize the `correlationId` property of the message as a key-value pair on the topic with the key `$.cid`.]*/
      { propName: 'correlationId', serializedAs: '%24.cid', fakeValue: 'fakeCorrelationId' },
      /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_013: [The `sendEvent` method shall serialize the `userId` property of the message as a key-value pair on the topic with the key `$.uid`.]*/
      { propName: 'userId', serializedAs: '%24.uid', fakeValue: 'fakeUserId' },
      /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_014: [The `sendEvent` method shall serialize the `to` property of the message as a key-value pair on the topic with the key `$.to`.]*/
      { propName: 'to', serializedAs: '%24.to', fakeValue: 'fakeTo' },
      /*Tests_SRS_NODE_COMMON_MQTT_BASE_16_015: [The `sendEvent` method shall serialize the `expiryTimeUtc` property of the message as a key-value pair on the topic with the key `$.exp`.]*/
      { propName: 'expiryTimeUtc', serializedAs: '%24.exp', fakeValue: 'fakeDateString' },
      { propName: 'expiryTimeUtc', serializedAs: '%24.exp', fakeValue: new Date(1970, 1, 1), fakeSerializedValue: encodeURIComponent(new Date(1970, 1, 1).toISOString()) }
    ].forEach(function(testProperty) {
      it('serializes Message.' + testProperty.propName + ' as ' + decodeURIComponent(testProperty.serializedAs) + ' on the topic', function(done) {
        var config = {
          host: "host.name",
          deviceId: "deviceId",
          sharedAccessSignature: "sasToken"
        };

        var testMessage = new Message('message');
        testMessage[testProperty.propName] = testProperty.fakeValue;
        testMessage.properties.add('fakeKey', 'fakeValue');

        var transport = new Mqtt(config, fakeMqttBase);
        transport.connect(function () {
          transport.sendEvent(testMessage, function() {
            var serializedPropertyValue = testProperty.fakeSerializedValue || testProperty.fakeValue;
            assert(fakeMqttBase.publish.calledWith('devices/deviceId/messages/events/' + testProperty.serializedAs + '=' + serializedPropertyValue + '&fakeKey=fakeValue'));
            done();
          });
        });
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
        var mqtt = new Mqtt(fakeConfig, fakeMqttBase);
        assert.throws(function() {
          mqtt.sendMethodResponse(response, null);
        });
      });
    });

    // Tests_SRS_NODE_DEVICE_MQTT_13_002: [ sendMethodResponse shall build an MQTT topic name in the format: $iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES> where <STATUS> is response.status. ]
    // Tests_SRS_NODE_DEVICE_MQTT_13_003: [ sendMethodResponse shall build an MQTT topic name in the format: $iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES> where <REQUEST ID> is response.requestId. ]
    // Tests_SRS_NODE_DEVICE_MQTT_13_004: [ sendMethodResponse shall build an MQTT topic name in the format: $iothub/methods/res/<STATUS>/?$rid=<REQUEST ID>&<PROPERTIES> where <PROPERTIES> is URL encoded. ]
    it('formats MQTT topic with status code', function(testCallback) {
      var mqtt = new Mqtt(fakeConfig, fakeMqttBase);
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
      var mqtt = new Mqtt(fakeConfig, fakeMqttBase);
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
      var mqtt = new Mqtt(fakeConfig, fakeMqttBase);

      // test
      mqtt.connect(function () {
        mqtt.sendMethodResponse({
          requestId: 'req1',
          status: 200,
          payload: null
        }, testCallback);
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_016: [The `Mqtt` constructor shall initialize the `uri` property of the `config` object to `mqtts://<host>`.]*/
    it('sets the uri property to \'mqtts://<host>\'', function () {
      var mqtt = new Mqtt(fakeConfig);
      assert.strictEqual(mqtt._config.uri, 'mqtts://' + fakeConfig.host);
    });
  });

  describe('#setOptions', function() {
    var fakeX509Options = { cert: 'cert', key: 'key'};
    var fakeConfig = {
      host: 'host',
      deviceId: 'deviceId',
      x509: fakeX509Options
    };

    /*Tests_SRS_NODE_DEVICE_MQTT_16_011: [The `setOptions` method shall throw a `ReferenceError` if the `options` argument is falsy]*/
    [null, undefined].forEach(function(badOptions) {
      it('throws a ReferenceError if the `options` argument is \'' + badOptions + '\'', function() {
        var mqtt = new Mqtt(fakeConfig);
        assert.throws(function() {
          mqtt.setOptions(badOptions);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_015: [The `setOptions` method shall throw an `ArgumentError` if the `cert` property is populated but the device uses symmetric key authentication.]*/
    it('throws an ArgumentError if the options.cert property is set but the device is using symmetric key authentication', function() {
      var mqtt = new Mqtt({
        host: 'host.name',
        deviceId: 'deviceId',
        sharedAccessSignature: 'sharedAccessSignature'
      });
      assert.throws(function() {
        mqtt.setOptions(fakeX509Options);
      }, errors.ArgumentError);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_012: [The `setOptions` method shall update the existing configuration of the MQTT transport with the content of the `options` object.]*/
    it('updates the existing configuration with new options', function() {
      var mqtt = new Mqtt(fakeConfig);
      mqtt.setOptions(fakeX509Options);
      assert.equal(mqtt._config.x509.cert, fakeX509Options.cert);
      assert.equal(mqtt._config.x509.key, fakeX509Options.key);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_013: [If a `done` callback function is passed as a argument, the `setOptions` method shall call it when finished with no arguments.]*/
    it('calls the `done` callback with no arguments when finished', function(done){
      var mqtt = new Mqtt(fakeConfig);
      mqtt.setOptions(fakeX509Options, done);
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_014: [The `setOptions` method shall not throw if the `done` argument is not passed.]*/
    it('doesn\'t throw if `done` is not passed in the arguments', function() {
      var mqtt = new Mqtt(fakeConfig);
      assert.doesNotThrow(function() {
        mqtt.setOptions(fakeX509Options);
      });
    });
  });

  describe('#connect', function() {
    /* Tests_SRS_NODE_DEVICE_MQTT_12_004: [The connect method shall call the connect method on MqttTransport */
    it ('calls connect on the transport', function(done) {
      var mqtt = new Mqtt(fakeConfig, fakeMqttBase);
      mqtt.connect(function() {
        assert(fakeMqttBase.connect.calledOnce);
        done();
      });
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_026: When MqttTransport fires an error event, the Mqtt object shall emit a disconnect event */
    it('registers to emit disconnect when an error received', function(done) {
      var mqtt = new Mqtt(fakeConfig, fakeMqttBase);
      mqtt.on('disconnect', done);
      mqtt.connect(function () {
        fakeMqttBase.emit('error');
      });
    });
  });
});
