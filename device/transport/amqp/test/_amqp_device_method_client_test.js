'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;
var Message = require('azure-iot-common').Message;
var errors = require('azure-iot-common').errors;
var endpoint = require('azure-iot-common').endpoint;

var AmqpDeviceMethodClient = require('../lib/amqp_device_method_client.js').AmqpDeviceMethodClient;

var fakeConfig = {
  deviceId: 'deviceId'
};

describe('AmqpDeviceMethodClient', function() {
  describe('#constructor', function() {
    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_001: [The `AmqpDeviceMethodClient` shall throw a `ReferenceError` if the `config` argument is falsy.]*/
    [undefined, null].forEach(function(badConfig) {
      it('throws a ReferenceError if \'config\' is \'' + badConfig + '\'', function() {
        assert.throws(function() {
          return new AmqpDeviceMethodClient(badConfig, {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_002: [The `AmqpDeviceMethodClient` shall throw a `ReferenceError` if the `amqpClient` argument is falsy.]*/
    [undefined, null].forEach(function(badClient) {
      it('throws a ReferenceError if \'amqpClient\' is \'' + badClient + '\'', function() {
        assert.throws(function() {
          return new AmqpDeviceMethodClient({}, badClient);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_003: [The `AmqpDeviceMethodClient` shall inherit from the `EventEmitter` class.]*/
    it('inherits from EventEmitter', function() {
      var client = new AmqpDeviceMethodClient({}, {});
      assert.instanceOf(client, EventEmitter);
    });
  });

  describe('#onDeviceMethod', function() {
    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_004: [The `onDeviceMethod` method shall throw a `ReferenceError` if the `methodName` argument is falsy.]*/
    [undefined, null, ''].forEach(function(badMethodName) {
      it('throws a ReferenceError if the \'methodName\' parameter is \'' + badMethodName + '\'', function() {
        var client = new AmqpDeviceMethodClient(fakeConfig, {});
        assert.throws(function() {
          client.onDeviceMethod(badMethodName, function() {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_018: [The `onDeviceMethod` method shall throw an `ArgumentError` if the `methodName` argument is not a string.]*/
    [42, function() {}, {}].forEach(function(badMethodName) {
      it('throws an ArgumentError if the \'methodName\' parameter is \'' + JSON.stringify(badMethodName) + '\'', function() {
        var client = new AmqpDeviceMethodClient(fakeConfig, {});
        assert.throws(function() {
          client.onDeviceMethod(badMethodName, function() {});
        }, errors.ArgumentError);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_005: [The `onDeviceMethod` method shall subscribe to the `message` and `errorReceived` events on the `AmqpReceiver` object associated with the method endpoint.]*/
    it('subscribes to the message and errorReceived events of the AmqpReceiver for the method endpoint', function() {
      var fakeAmqpReceiver = {
        on: sinon.spy()
      };

      var fakeAmqpClient = {
        attachSenderLink: function(endpoint, options, callback) {
          callback(null, {});
        },
        attachReceiverLink: function(endpoint, options, callback) {
          callback(null, {});
        },
        getReceiver: function(endpoint, callback) {
          callback(null, fakeAmqpReceiver);
        }
      };

      var client = new AmqpDeviceMethodClient(fakeConfig, fakeAmqpClient);
      client.onDeviceMethod('testMethod', function() {});
      assert(fakeAmqpReceiver.on.calledWith('message'));
      assert(fakeAmqpReceiver.on.calledWith('errorReceived'));
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_006: [The `onDeviceMethod` method shall save the `callback` argument so that it is called when the corresponding method call is received.]*/
    it('saves the callback argument and calls it with a DeviceMethodRequest when a method request message is received', function(testCallback) {
      var fakeAmqpReceiver = new EventEmitter();
      var fakeMethodName = 'testMethod';
      var fakeMethodRequest = new Message('payload');
      fakeMethodRequest.correlationId = 'fakeCorrelationId';
      fakeMethodRequest.properties.add('IoThub-methodname', fakeMethodName);
      var fakeAmqpClient = {
        /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_014: [The `AmqpDeviceMethodClient` object shall set 2 properties of any AMQP link that it create:
        - `com.microsoft:api-version` shall be set to the current API version in use.
        - `com.microsoft:channel-correlation-id` shall be set to the identifier of the device (also often referred to as `deviceId`).]*/
        /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_017: [The endpoint used to for the sender and receiver link shall be `/devices/<device-id>/methods/devicebound`.]*/
        /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_012: [The `AmqpDeviceMethodClient` object shall automatically establish the AMQP links required to receive method calls and send responses when either `onDeviceMethod` or `sendMethodResponse` is called.]*/
        attachSenderLink: function(ep, options, callback) {
          assert.strictEqual(ep, '/devices/' + fakeConfig.deviceId + '/methods/devicebound');
          assert.strictEqual(options.attach.properties['com.microsoft:api-version'], endpoint.apiVersion);
          assert.strictEqual(options.attach.properties['com.microsoft:channel-correlation-id'], fakeConfig.deviceId);
          callback(null, {});
        },
        attachReceiverLink: function(ep, options, callback) {
          assert.strictEqual(ep, '/devices/' + fakeConfig.deviceId + '/methods/devicebound');
          assert.strictEqual(options.attach.properties['com.microsoft:api-version'], endpoint.apiVersion);
          assert.strictEqual(options.attach.properties['com.microsoft:channel-correlation-id'], fakeConfig.deviceId);
          callback(null, {});
        },
        getReceiver: function(ep, callback) {
          callback(null, fakeAmqpReceiver);
        }
      };

      var client = new AmqpDeviceMethodClient(fakeConfig, fakeAmqpClient);
      client.onDeviceMethod(fakeMethodName, function(methodRequest) {
        /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_016: [When a message is received on the method endpoint, a new object describing the method request shall be created with the following properties:
        - `requestId`: a UUID that uniquely identifies this method name and is stored as the correlationId in the incoming message
        - `body`: the payload of the message received, which is also the payload of the method request
        - `methods`: an object with a `methodName` property containing the name of the method that is being called, extracted from the incoming message's application property named `IoThub-methodname`.]*/
        assert.strictEqual(methodRequest.methods.methodName, fakeMethodName);
        assert.strictEqual(methodRequest.requestId, fakeMethodRequest.correlationId);
        assert.strictEqual(methodRequest.body, fakeMethodRequest.getData());
        testCallback();
      });

      fakeAmqpReceiver.emit('message', fakeMethodRequest);
    });
  });

  describe('#sendMethodResponse', function() {
    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_007: [The `sendMethodResponse` method shall throw a `ReferenceError` if the `methodResponse` object is falsy.]*/
    [undefined, null].forEach(function(badMethodResponse) {
      it('throws a ReferenceError when \'methodResponse\' is \'' + badMethodResponse + '\'', function() {
        var client = new AmqpDeviceMethodClient(fakeConfig, {});
        assert.throws(function(){
          client.sendMethodResponse(badMethodResponse, function() {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_008: [The `sendMethodResponse` method shall throw an `ArgumentError` if the `methodResponse.status` property is `null` or `undefined`.]*/
    [null, undefined].forEach(function(badStatus) {
      it('throws an ArgumentError when \'methodResponse.status\' is \'' + badStatus + '\'', function() {
        var client = new AmqpDeviceMethodClient(fakeConfig, {});
        assert.throws(function(){
          client.sendMethodResponse({ status: badStatus }, function() {});
        }, errors.ArgumentError);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_009: [The `sendMethodResponse` method shall throw an `ArgumentError` if the `methodResponse.requestId` property is falsy.]*/
    [null, undefined, 0, ''].forEach(function(badRequestId) {
      it('throws an ArgumentError when \'methodResponse.requestId\' is \'' + badRequestId + '\'', function() {
        var client = new AmqpDeviceMethodClient(fakeConfig, {});
        assert.throws(function(){
          client.sendMethodResponse({ status: 200, requestId: badRequestId }, function() {});
        }, errors.ArgumentError);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_010: [The `sendMethodResponse` method shall create a new `Message` object with the following properties:
    - The `IoThub-status` application property must be set to the value of the `methodResponse.status` property.
    - The `correlationId` property of the message must be set to the value of the `methodResponse.requestId` property.
    - The `body` property of the messager must be set to the value of the `methodResponse.payload` property.]*/
    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_011: [The `sendMethodResponse` method shall call the `send` method on local `AmqpClient` instance with the specially crafted message containing the method response.]*/
    it('creates a properly formatted message from the method response object', function(testCallback) {
      var fakeMethodResponse = {
        requestId: 'fakeRequestId',
        status: 42,
        payload: 'fakePayload'
      };

      var fakeAmqpClient = {
        /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_014: [The `AmqpDeviceMethodClient` object shall set 2 properties of any AMQP link that it create:
        - `com.microsoft:api-version` shall be set to the current API version in use.
        - `com.microsoft:channel-correlation-id` shall be set to the identifier of the device (also often referred to as `deviceId`).]*/
        /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_017: [The endpoint used to for the sender and receiver link shall be `/devices/<device-id>/methods/devicebound`.]*/
        /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_012: [The `AmqpDeviceMethodClient` object shall automatically establish the AMQP links required to receive method calls and send responses when either `onDeviceMethod` or `sendMethodResponse` is called.]*/
        attachSenderLink: function(ep, options, callback) {
          assert.strictEqual(ep, '/devices/' + fakeConfig.deviceId + '/methods/devicebound');
          assert.strictEqual(options.attach.properties['com.microsoft:api-version'], endpoint.apiVersion);
          assert.strictEqual(options.attach.properties['com.microsoft:channel-correlation-id'], fakeConfig.deviceId);
          callback(null, {});
        },
        attachReceiverLink: function(ep, options, callback) {
          assert.strictEqual(ep, '/devices/' + fakeConfig.deviceId + '/methods/devicebound');
          assert.strictEqual(options.attach.properties['com.microsoft:api-version'], endpoint.apiVersion);
          assert.strictEqual(options.attach.properties['com.microsoft:channel-correlation-id'], fakeConfig.deviceId);
          callback(null, {});
        },
        send: function(message, endpoint, to, sendCallback) {
          assert.strictEqual(message.correlationId, fakeMethodResponse.requestId);
          assert.strictEqual(message.properties.getValue('IoThub-status'), fakeMethodResponse.status);
          assert.strictEqual(message.getData(), JSON.stringify(fakeMethodResponse.payload));
          sendCallback();
        }
      };

      var client = new AmqpDeviceMethodClient(fakeConfig, fakeAmqpClient);
      client.sendMethodResponse(fakeMethodResponse, testCallback);
    });
  });

  describe('Internal state machine', function() {
    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_013: [The `AmqpDeviceMethodClient` object shall emit `errorReceived` events if establishing any of the required links fail.]*/
    it('emits an errorReceived event if establishing the sender link fails', function(testCallback) {
      var fakeMethodResponse = {
        requestId: 'fakeRequestId',
        status: 42,
        payload: 'fakePayload'
      };
      var fakeError = new Error('failed to establish sender link');
      var fakeAmqpClient = {
        attachSenderLink: function(endpoint, options, callback) {
          callback(fakeError);
        },
        attachReceiverLink: function(endpoint, options, callback) {
          callback(null, {});
        },
        send: function(message, endpoint, to, sendCallback) {
          sendCallback();
        }
      };

      var client = new AmqpDeviceMethodClient(fakeConfig, fakeAmqpClient);
      client.on('errorReceived', function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });

      client.sendMethodResponse(fakeMethodResponse, function() {});
    });

    it('emits an errorReceived event if establishing the receiver link fails', function(testCallback) {
      var fakeMethodResponse = {
        requestId: 'fakeRequestId',
        status: 42,
        payload: 'fakePayload'
      };
      var fakeError = new Error('failed to establish sender link');
      var fakeAmqpClient = {
        attachSenderLink: function(endpoint, options, callback) {
          callback(null, {});
        },
        attachReceiverLink: function(endpoint, options, callback) {
          callback(fakeError);
        },
        send: function(message, endpoint, to, sendCallback) {
          sendCallback();
        }
      };

      var client = new AmqpDeviceMethodClient(fakeConfig, fakeAmqpClient);
      client.on('errorReceived', function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });

      client.sendMethodResponse(fakeMethodResponse, function() {});
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_015: [The `AmqpDeviceMethodClient` object shall forward any error received on a link to any listening client in an `errorReceived` event.*/
    it('emits an errorReceived event if an error is received after establishing the link', function(testCallback) {
      var fakeAmqpReceiver = new EventEmitter();
      var fakeError = new Error('failed to establish sender link');
      var fakeAmqpClient = {
        attachSenderLink: function(endpoint, options, callback) {
          callback(null, {});
        },
        attachReceiverLink: function(endpoint, options, callback) {
          callback(null, {});
        },
        getReceiver: function(ep, callback) {
          callback(null, fakeAmqpReceiver);
        }
      };

      var client = new AmqpDeviceMethodClient(fakeConfig, fakeAmqpClient);
      client.onDeviceMethod('testMethod', function() {});
      client.on('errorReceived', function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
      fakeAmqpReceiver.emit('errorReceived', fakeError);
    });

    it('queues onDeviceMethod call when already connecting', function(testCallback) {
      var fakeAmqpReceiver = new EventEmitter();
      var savedCallback = null;
      var fakeAmqpClient = {
        attachSenderLink: function(endpoint, options, callback) {
          callback(null, {});
        },
        attachReceiverLink: function(endpoint, options, callback) {
          savedCallback = callback;
          // Do not call the callback in order to block.
        },
        getReceiver: function(ep, callback) {
          callback(null, fakeAmqpReceiver);
        },
        unlockAttach: function() {
          savedCallback(null, {});
        }
      };

      var client = new AmqpDeviceMethodClient(fakeConfig, fakeAmqpClient);
      var testMethod1OK = false;
      var testMethod2OK = false;
      client.onDeviceMethod('testMethod1', function() {
        testMethod1OK = true;
        if (testMethod1OK && testMethod2OK) testCallback();
      });
      // At that point since the attachReceiverLink callback hasn't been called, the state machine is locked in the 'connecting' state
      client.onDeviceMethod('testMethod2', function() {
        testMethod2OK = true;
        if (testMethod1OK && testMethod2OK) testCallback();
      });

      fakeAmqpClient.unlockAttach();
      var message1 = new Message();
      message1.properties.add('IoThub-methodname', 'testMethod1');
      message1.correlationId = 'correlationId1';
      
      var message2 = new Message();
      message2.properties.add('IoThub-methodname', 'testMethod2');
      message2.correlationId = 'correlationId2';

      fakeAmqpReceiver.emit('message', message1);
      fakeAmqpReceiver.emit('message', message2);
    });

    it('queues sendMethodResponse call when already connecting', function(testCallback) {
      var fakeAmqpReceiver = new EventEmitter();
      var savedCallback = null;
      var response1OK = false;
      var response2OK = false;
      var fakeAmqpClient = {
        attachSenderLink: function(endpoint, options, callback) {
          callback(null, {});
        },
        attachReceiverLink: function(endpoint, options, callback) {
          savedCallback = callback;
          // Do not call the callback in order to block.
        },
        getReceiver: function(ep, callback) {
          callback(null, fakeAmqpReceiver);
        },
        unlockAttach: function() {
          savedCallback(null, {});
        },
        send: function(message) {
          if (message.correlationId === 'id1') response1OK = true;
          if (message.correlationId === 'id2') response2OK = true;
          if (response1OK && response2OK) testCallback();
        }
      };

      var client = new AmqpDeviceMethodClient(fakeConfig, fakeAmqpClient);
      client.sendMethodResponse({ status: 42, requestId: 'id1' }, function() {});
      client.sendMethodResponse({ status: 42, requestId: 'id2' }, function() {});

      fakeAmqpClient.unlockAttach();
    });
  });
});

