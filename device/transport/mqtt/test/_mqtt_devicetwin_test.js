// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;

var Mqtt = require('../lib/mqtt').Mqtt;
var errors = require('azure-iot-common').errors;
var sinon = require('sinon');
var MqttTwinReceiver = require('../lib/mqtt_twin_receiver.js').MqttTwinReceiver;

var config = {
  'host' : 'mock_host',
  'deviceId' : 'mock_deviceId',
  'sharedAccessSignature' : 'mock_sharedAccessSignature'
};

var fakeMqttBase;
var transport;

describe('Mqtt: Device Twin', function () {
  beforeEach(function() {
    fakeMqttBase = new EventEmitter();
    fakeMqttBase.connect = sinon.stub().callsArg(1);
    fakeMqttBase.disconnect = sinon.stub().callsArg(0);
    fakeMqttBase.publish = sinon.stub().callsArg(3);
    fakeMqttBase.subscribe = sinon.stub().callsArg(2);
    fakeMqttBase.unsubscribe = sinon.stub().callsArg(1);
    fakeMqttBase.updateSharedAccessSignature = sinon.stub().callsArg(1);

    transport = new Mqtt(config, fakeMqttBase);
  });

  describe('#sendTwinRequest', function () {
    /*Tests_SRS_NODE_DEVICE_MQTT_16_029: [The `sendTwinRequest` method shall connect the Mqtt connection if it is disconnected.]*/
    it('connects the transport if currently disconnected', function (testCallback) {
      transport.sendTwinRequest('PUT', '/res', {'rid':10}, 'body', function () {
        assert.isTrue(fakeMqttBase.connect.calledOnce);
        assert.isTrue(fakeMqttBase.publish.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_MQTT_16_033: [The `sendTwinRequest` method shall call its callback with an error translated using `translateError` if `MqttBase` fails to connect.]*/
    it('calls the callback with an error if the transport fails to connect', function (testCallback) {
      fakeMqttBase.connect = sinon.stub().callsArgWith(1, new Error('fake error'));
      transport.sendTwinRequest('PUT', '/res', {'rid':10}, 'body', function (err) {
        assert.isTrue(fakeMqttBase.connect.calledOnce);
        assert.instanceOf(err, Error);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_001: [** The `sendTwinRequest` method shall call the publish method on `MqttBase`. **]** */
    it('calls publish method on transport', function (testCallback) {
      transport.connect(function() {
        transport.sendTwinRequest('PUT', '/res', {'rid':10}, 'body', function() {
          assert(fakeMqttBase.publish.calledOnce);
          testCallback();
        });
      });
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_008: [** The `sendTwinRequest` method shall not throw if the `done` callback is falsy. **]** */
    it('does not throw if done is falsy', function() {
      transport.connect();
      assert.doesNotThrow(function() {
        transport.sendTwinRequest('PUT', '/res', {'rid':10}, 'body', null);
      });
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_009: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `method` argument is falsy. **]** */
    it('throws if method is falsy', function() {
      transport.connect();
      assert.throws(function() {
        transport.sendTwinRequest(null, '/res', {'rid':10}, 'body', function() {});
      }, ReferenceError);
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_010: [** The `sendTwinRequest` method shall throw an `ArgumentError` if the `method` argument is not a string. **]** */
    it('throws if method is not a string', function() {
      transport.connect();
      assert.throws(function() {
        transport.sendTwinRequest({}, '/res', {'rid':10}, 'body', function() {});
      }, errors.ArgumentError);
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_019: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `resource` argument is falsy. **]** */
    it('throws if resource is falsy', function() {
      transport.connect();
      assert.throws(function() {
        transport.sendTwinRequest('PUT', null, {'rid':10}, 'body', function() {});
      }, ReferenceError);
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_020: [** The `sendTwinRequest` method shall throw an `ArgumentError` if the `resource` argument is not a string. **]** */
    it('throws if resource is not a string', function() {
      transport.connect();
      assert.throws(function() {
        transport.sendTwinRequest('PUT', {}, {'rid':10}, 'body', function() {});
      }, errors.ArgumentError);
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_011: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `properties` argument is falsy. **]** */
    it('throws if properties is falsy', function() {
      transport.connect();
      assert.throws(function() {
        transport.sendTwinRequest('PUT', '/res', null, 'body', function() {});
      }, ReferenceError);
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_012: [** The `sendTwinRequest` method shall throw an `ArgumentError` if the `properties` argument is not a an object. **]** */
    it('throws if properties is not an object', function() {
      transport.connect();
      assert.throws(function() {
        transport.sendTwinRequest('PUT', '/res', 'properties', 'body', function() {});
      }, errors.ArgumentError);
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_018: [** The `sendTwinRequest` method shall throw an `ArgumentError` if any members of the `properties` object fails to serialize to a string **]** */
    it('throws if properties fails to deserialize to a string', function() {
      transport.connect();
      assert.throws(function() {
        transport.sendTwinRequest('PUT', '/res', {'func': function() {}}, 'body', function() {});
      }, errors.ArgumentError);
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_013: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `body` argument is falsy. **]** */
    it('throws if body is falsy', function() {
      transport.connect();
      assert.throws(function() {
        transport.sendTwinRequest('PUT', '/res', {'rid' : 10}, null, function() {});
      }, ReferenceError);
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_022: [** The `propertyQuery` string shall be construced from the `properties` object. **]**   */
    /* Tests_SRS_NODE_DEVICE_MQTT_18_023: [** Each member of the `properties` object shall add another 'name=value&' pair to the `propertyQuery` string. **]**   */
    it('correctly builds properties string', function() {
      transport.connect();
      transport.sendTwinRequest('a/', 'b/', {'rid' : 10, 'pid' : 20}, 'body', function() {});
      assert(fakeMqttBase.publish.calledWith('$iothub/twin/a/b/?rid=10&pid=20'));
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_004: [** If a `done` callback is passed as an argument, The `sendTwinRequest` method shall call `done` after the body has been published. **]** */
    it('calls done after the body has been published', function(done) {
      transport.connect();
      transport.sendTwinRequest('PUT', '/res', {'rid':10}, 'body', done);
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_021: [** The topic name passed to the publish method shall be $iothub/twin/`method`/`resource`/?`propertyQuery` **]** */
    it('uses the correct topic name', function() {
      // 7.5.2: $iothub/twin/PATCH/properties/reported/?$rid={request id}&$version={base version}
      transport.connect();
      transport.sendTwinRequest('PATCH', '/properties/reported/', {'$rid':10, '$version': 200}, 'body', function() {});
      assert(fakeMqttBase.publish.calledWith('$iothub/twin/PATCH/properties/reported/?$rid=10&$version=200'));
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_015: [** The `sendTwinRequest` shall publish the request with QOS=0, DUP=0, and Retain=0 **]** */
    it('uses the correct publish parameters', function() {
      transport.connect();
      transport.sendTwinRequest('PATCH', '/properties/reported/', {'$rid':10, '$version': 200}, 'body', function() {});
      var publishoptions = fakeMqttBase.publish.getCall(0).args[2];
      assert.equal(publishoptions.qos, 0);
      assert.equal(publishoptions.retain, false);
      // no way to verify DUP flag
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_016: [** If an error occurs in the `sendTwinRequest` method, the `done` callback shall be called with the error as the first parameter. **]** */
    /* Tests_SRS_NODE_DEVICE_MQTT_18_024: [** If an error occurs, the `sendTwinRequest` shall use the MQTT `translateError` module to convert the mqtt-specific error to a transport agnostic error before passing it into the `done` callback. **]** */
    it('calls done with an error on failure', function(done) {
      fakeMqttBase.publish = sinon.stub().callsArgWith(3, new Error('Invalid topic'));
      transport.connect();
      transport.sendTwinRequest('PATCH', '/properties/reported/', {'$rid':10, '$version': 200}, 'body', function(err) {
        assert.equal(err.constructor.name, 'FormatError');
        done();
      });
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_017: [** If the `sendTwinRequest` method is successful, the first parameter to the `done` callback shall be null and the second parameter shall be a MessageEnqueued object. **]** */
    it('returns MessageEnqueued object on success', function(done) {
      transport.connect();
      transport.sendTwinRequest('PATCH', '/properties/reported/', {'$rid':10, '$version': 200}, 'body', function(err, res) {
        if (err) {
          done(err);
        } else {
          assert.equal(res.constructor.name, 'MessageEnqueued');
          done();
        }
      });
    });


  });

  describe('#getTwinReceiver', function () {
    /* Tests_SRS_NODE_DEVICE_MQTT_18_014: [** The `getTwinReceiver` method shall throw an `ReferenceError` if done is falsy **]**  */
    it ('throws if done is falsy', function() {
      assert.throws(function() {
        transport.getTwinReceiver();
      }, ReferenceError);
    });

    /* Tests_SRS_NODE_DEVICE_MQTT_18_005: [** The `getTwinReceiver` method shall call the `done` method after it completes **]** */
    it ('calls done when complete', function(done) {
      transport.connect(function () {
        transport.getTwinReceiver(done);
      });
    });
  });

  it('connects the transport if disconnected', function (testCallback) {
    transport.getTwinReceiver(function () {
      assert.isTrue(fakeMqttBase.connect.calledOnce);
      testCallback();
    });
  });

  it('calls the callback with an error if the transport fails to connect', function (testCallback) {
    fakeMqttBase.connect = sinon.stub().callsArgWith(1, new Error('fake'));
    transport.getTwinReceiver(function (err) {
      assert.instanceOf(err, Error);
      testCallback();
    });
  });
});

