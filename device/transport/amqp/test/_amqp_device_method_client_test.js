'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;
var AmqpMessage = require('azure-iot-amqp-base').AmqpMessage;
var errors = require('azure-iot-common').errors;
var endpoint = require('azure-iot-common').endpoint;
var rhea = require('rhea');
var uuidV4 = require('uuid').v4;


var AmqpDeviceMethodClient = require('../lib/amqp_device_method_client.js').AmqpDeviceMethodClient;

describe('AmqpDeviceMethodClient', function () {
  var fakeConfig = {
    deviceId: 'deviceId'
  };

  var fakeAuthenticationProvider;

  beforeEach(function () {
    fakeAuthenticationProvider = {
      getDeviceCredentials: sinon.stub().callsArgWith(0, null, fakeConfig)
    };
  });

  describe('#constructor', function () {
    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_003: [The `AmqpDeviceMethodClient` shall inherit from the `EventEmitter` class.]*/
    it('inherits from EventEmitter', function () {
      var client = new AmqpDeviceMethodClient({}, {});
      assert.instanceOf(client, EventEmitter);
    });
  });

  describe('#onDeviceMethod', function () {
    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_004: [The `onDeviceMethod` method shall throw a `ReferenceError` if the `methodName` argument is falsy.]*/
    [undefined, null, ''].forEach(function(badMethodName) {
      it('throws a ReferenceError if the \'methodName\' parameter is \'' + badMethodName + '\'', function() {
        var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, {});
        assert.throws(function() {
          client.onDeviceMethod(badMethodName, function() {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_018: [The `onDeviceMethod` method shall throw an `ArgumentError` if the `methodName` argument is not a string.]*/
    [42, function() {}, {}].forEach(function(badMethodName) {
      it('throws an ArgumentError if the \'methodName\' parameter is \'' + JSON.stringify(badMethodName) + '\'', function() {
        var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, {});
        assert.throws(function() {
          client.onDeviceMethod(badMethodName, function() {});
        }, errors.ArgumentError);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_006: [The `onDeviceMethod` method shall save the `callback` argument so that it is called when the corresponding method call is received.]*/
    it('saves the callback argument and calls it with a DeviceMethodRequest when a method request message is received', function(testCallback) {
      var fakeAmqpReceiver = new EventEmitter();
      var fakeMethodName = 'testMethod';
      var fakeMethodRequest = new AmqpMessage();
      fakeMethodRequest.body = rhea.message.data_section('payload');
      fakeMethodRequest.correlation_id = 'fakeCorrelationId';
      fakeMethodRequest.application_properties = {
        'IoThub-methodname': fakeMethodName
      };
      var fakeAmqpClient = {
        /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_014: [The `AmqpDeviceMethodClient` object shall set 2 properties of any AMQP link that it create:
        - `com.microsoft:api-version` shall be set to the current API version in use.
        - `com.microsoft:channel-correlation-id` shall be set to the string "methods:" followed by a guid.]*/
        /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_017: [The endpoint used to for the sender and receiver link shall be `/devices/<device-id>/methods/devicebound`.]*/
        /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_012: [The `AmqpDeviceMethodClient` object shall automatically establish the AMQP links required to receive method calls and send responses when either `onDeviceMethod` or `sendMethodResponse` is called.]*/
        attachSenderLink: function(ep, options, callback) {
          assert.strictEqual(ep, '/devices/' + fakeConfig.deviceId + '/methods/devicebound');
          assert.strictEqual(options.properties['com.microsoft:api-version'], endpoint.apiVersion);
          assert(options.properties['com.microsoft:channel-correlation-id'].startsWith('methods:'));
          callback(null, {});
        },
        attachReceiverLink: function(ep, options, callback) {
          assert.strictEqual(ep, '/devices/' + fakeConfig.deviceId + '/methods/devicebound');
          assert.strictEqual(options.properties['com.microsoft:api-version'], endpoint.apiVersion);
          assert(options.properties['com.microsoft:channel-correlation-id'].startsWith('methods:'));
          callback(null, fakeAmqpReceiver);
        }
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function () {
        client.onDeviceMethod(fakeMethodName, function(methodRequest) {
          /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_016: [When a message is received on the method endpoint, a new object describing the method request shall be created with the following properties:
          - `requestId`: a UUID that uniquely identifies this method name and is stored as the correlationId in the incoming message
          - `body`: the payload of the message received, which is also the payload of the method request
          - `methods`: an object with a `methodName` property containing the name of the method that is being called, extracted from the incoming message's application property named `IoThub-methodname`.]*/
          assert.strictEqual(methodRequest.methods.methodName, fakeMethodName);
          assert.strictEqual(methodRequest.requestId, fakeMethodRequest.correlation_id);
          assert.strictEqual(methodRequest.body, fakeMethodRequest.body.content);
          testCallback();
        });

        fakeAmqpReceiver.emit('message', fakeMethodRequest);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_017: [The endpoint used to for the sender and receiver link shall be `/devices/<device-id>/methods/devicebound`.]*/
    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_18_001: [If a `moduleId` value was set in the device's connection string, The endpoint used to for the sender and receiver link shall be `/devices/<deviceId>/modules/<moduleId>/methods/devicebound`.]*/
    [{
      deviceId: 'fakeDeviceId',
      moduleId: undefined,
      expectedEndpoint: '/devices/fakeDeviceId/methods/devicebound'
    },
    {
      deviceId: 'fakeDeviceId',
      moduleId: 'fakeModuleId',
      expectedEndpoint: '/devices/fakeDeviceId/modules/fakeModuleId/methods/devicebound'
    }].forEach(function(testConfig) {
      it('uses the right link parameters when moduleId is ' + testConfig.moduleId, function(testCallback) {
        var authProvider = {
          getDeviceCredentials: sinon.stub().callsArgWith(0, null, testConfig)
        };

        var fakeAmqpReceiver = new EventEmitter();
        var fakeMethodName = 'testMethod';
        var fakeMethodRequest = new AmqpMessage();
        fakeMethodRequest.body = 'payload';
        fakeMethodRequest.properties = {
          correlationId: 'fakeCorrelationId'
        };
        fakeMethodRequest.applicationProperties = {
          'IoThub-methodname': fakeMethodName
        };

        var fakeAmqpClient = {
          attachSenderLink: sinon.spy(function(ep, options, callback) {
            assert.strictEqual(ep, testConfig.expectedEndpoint);
            callback(null, {});
          }),
          attachReceiverLink: sinon.spy(function(ep, options, callback) {
            assert.strictEqual(ep, testConfig.expectedEndpoint);
            callback(null, fakeAmqpReceiver);
          })
        };

        var client = new AmqpDeviceMethodClient(authProvider, fakeAmqpClient);
        client.attach(function () {
          client.onDeviceMethod(fakeMethodName, function() {});
          assert(fakeAmqpClient.attachSenderLink.calledOnce);
          assert(fakeAmqpClient.attachReceiverLink.calledOnce);
          testCallback();
        });
      });
    });


    it('saves the callback for the method even though it is detached and works when attached', function (testCallback) {
      var fakeAmqpReceiver = new EventEmitter();
      var fakeMethodName = 'testMethod';
      var fakeMethodRequest = new AmqpMessage();
      fakeMethodRequest.body = rhea.message.data_section('payload');
      fakeMethodRequest.correlation_id = 'fakeCorrelationId';
      fakeMethodRequest.application_properties = {
        'IoThub-methodname': fakeMethodName
      };
      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, null, new EventEmitter()),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, fakeAmqpReceiver)
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.onDeviceMethod(fakeMethodName, function(methodRequest) {
        /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_016: [When a message is received on the method endpoint, a new object describing the method request shall be created with the following properties:
        - `requestId`: a UUID that uniquely identifies this method name and is stored as the correlationId in the incoming message
        - `body`: the payload of the message received, which is also the payload of the method request
        - `methods`: an object with a `methodName` property containing the name of the method that is being called, extracted from the incoming message's application property named `IoThub-methodname`.]*/
        assert.strictEqual(methodRequest.methods.methodName, fakeMethodName);
        assert.strictEqual(methodRequest.requestId, fakeMethodRequest.correlation_id);
        assert.strictEqual(methodRequest.body, fakeMethodRequest.body.content);
        testCallback();
      });

      client.attach(function () {
        fakeAmqpReceiver.emit('message', fakeMethodRequest);
      });
    });

    it('saves the callback for the method even though it is attaching and works when attached', function (testCallback) {
      var fakeAmqpReceiver = new EventEmitter();
      var fakeMethodName = 'testMethod';
      var fakeMethodRequest = new AmqpMessage();
      fakeMethodRequest.body = rhea.message.data_section('payload');
      fakeMethodRequest.correlation_id = 'fakeCorrelationId';
      fakeMethodRequest.application_properties = {
        'IoThub-methodname': fakeMethodName
      };
      var attachCallback;
      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsFake(function (endpoint, linkOptions, callback) {
          attachCallback = callback;
        }),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, fakeAmqpReceiver)
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function () {
        fakeAmqpReceiver.emit('message', fakeMethodRequest);
      });
      // now blocked in the 'attaching' state
      client.onDeviceMethod(fakeMethodName, function(methodRequest) {
        assert.strictEqual(methodRequest.methods.methodName, fakeMethodName);
        assert.strictEqual(methodRequest.requestId, fakeMethodRequest.correlation_id);
        assert.strictEqual(methodRequest.body, fakeMethodRequest.body.content);
        testCallback();
      });

      // unblock attach now
      attachCallback(null, new EventEmitter());
    });
  });

  describe('#sendMethodResponse', function () {
    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_007: [The `sendMethodResponse` method shall throw a `ReferenceError` if the `methodResponse` object is falsy.]*/
    [undefined, null].forEach(function(badMethodResponse) {
      it('throws a ReferenceError when \'methodResponse\' is \'' + badMethodResponse + '\'', function() {
        var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, {});
        assert.throws(function(){
          client.sendMethodResponse(badMethodResponse, function() {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_008: [The `sendMethodResponse` method shall throw an `ArgumentError` if the `methodResponse.status` property is `null` or `undefined`.]*/
    [null, undefined].forEach(function(badStatus) {
      it('throws an ArgumentError when \'methodResponse.status\' is \'' + badStatus + '\'', function() {
        var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, {});
        assert.throws(function(){
          client.sendMethodResponse({ status: badStatus }, function() {});
        }, errors.ArgumentError);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_009: [The `sendMethodResponse` method shall throw an `ArgumentError` if the `methodResponse.requestId` property is falsy.]*/
    [null, undefined, 0, ''].forEach(function(badRequestId) {
      it('throws an ArgumentError when \'methodResponse.requestId\' is \'' + badRequestId + '\'', function() {
        var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, {});
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
        - `com.microsoft:channel-correlation-id` shall be set to the string "methods:" followed by a guid.]*/
        /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_017: [The endpoint used to for the sender and receiver link shall be `/devices/<device-id>/methods/devicebound`.]*/
        /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_012: [The `AmqpDeviceMethodClient` object shall automatically establish the AMQP links required to receive method calls and send responses when either `onDeviceMethod` or `sendMethodResponse` is called.]*/
        attachSenderLink: function(ep, options, callback) {
          assert.strictEqual(ep, '/devices/' + fakeConfig.deviceId + '/methods/devicebound');
          assert.strictEqual(options.properties['com.microsoft:api-version'], endpoint.apiVersion);
          assert(options.properties['com.microsoft:channel-correlation-id'].startsWith('methods:'));
          callback(null, {});
        },
        attachReceiverLink: function(ep, options, callback) {
          assert.strictEqual(ep, '/devices/' + fakeConfig.deviceId + '/methods/devicebound');
          assert.strictEqual(options.properties['com.microsoft:api-version'], endpoint.apiVersion);
          assert(options.properties['com.microsoft:channel-correlation-id'].startsWith('methods:'));
          callback(null, new EventEmitter());
        },
        send: function(message, endpoint, to, sendCallback) {
          assert.strictEqual(message.correlationId, fakeMethodResponse.requestId);
          assert.strictEqual(message.properties.getValue('IoThub-status'), fakeMethodResponse.status);
          assert.strictEqual(message.getData(), JSON.stringify(fakeMethodResponse.payload));
          sendCallback();
        }
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function () {
        client.sendMethodResponse(fakeMethodResponse, testCallback);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_026: [The `sendMethodResponse` shall fail with a `NotConnectedError` if it is called while the links are detached.]*/
    it('fails if the links are detached', function(testCallback) {
      var fakeMethodResponse = {
        requestId: 'fakeRequestId',
        status: 42,
        payload: 'fakePayload'
      };
      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, {});
      client.sendMethodResponse(fakeMethodResponse, function (err) {
        assert.instanceOf(err, errors.NotConnectedError);
        testCallback();
      });
    });

    it('fails if the links are attaching', function(testCallback) {
      var fakeMethodResponse = {
        requestId: 'fakeRequestId',
        status: 42,
        payload: 'fakePayload'
      };
      var fakeAmqpClient = {
        attachSenderLink: sinon.stub(),
        attachReceiverLink: sinon.stub(),
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(); // will block in 'attaching'
      client.sendMethodResponse(fakeMethodResponse, function (err) {
        assert.instanceOf(err, errors.NotConnectedError);
        testCallback();
      });
    });
  });

  describe('#attach', function () {
    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_027: [The `attach` method shall call the `getDeviceCredentials` method on the `authenticationProvider` object passed as an argument to the constructor to retrieve the device id.]*/
    it('calls getDeviceCredentials on the authenticationProvider', function (testCallback) {
      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, null, new EventEmitter()),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, new EventEmitter())
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function () {
        assert.isTrue(fakeAuthenticationProvider.getDeviceCredentials.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_028: [The `attach` method shall call its callback with an error if the call to `getDeviceCredentials` fails with an error.]*/
    it('calls its callback with an error if the call to getDeviceCredentials fails with an error', function (testCallback) {
      var fakeError = new Error('fake');
      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, null, new EventEmitter()),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, new EventEmitter())
      };
      fakeAuthenticationProvider.getDeviceCredentials = sinon.stub().callsArgWith(0, fakeError);
      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function (err) {
        assert.isTrue(fakeAuthenticationProvider.getDeviceCredentials.calledOnce);
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_019: [The `attach` method shall create a SenderLink and a ReceiverLink and attach them.]*/
    it('attaches the sender and receiver links', function (testCallback) {
      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, null, new EventEmitter()),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, new EventEmitter())
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function (err) {
        assert.isUndefined(err);
        assert.isTrue(fakeAmqpClient.attachReceiverLink.calledOnce);
        assert.isTrue(fakeAmqpClient.attachSenderLink.calledOnce);
        testCallback();
      });
    });

    it('calls the callback with an error if the sender link fails to attach', function (testCallback) {
      var fakeError = new Error('fake');
      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, fakeError),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, new EventEmitter())
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    it('calls the callback with an error if the receiver link fails to attach', function (testCallback) {
      var fakeError = new Error('fake');
      var fakeSender = new EventEmitter();
      fakeSender.detach = sinon.stub().callsArg(0);

      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, null, fakeSender),
        attachReceiverLink: sinon.stub().callsArgWith(2, fakeError)
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function (err) {
        assert.isTrue(fakeSender.detach.calledOnce);
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    it.skip('emits an error event if no callback is specified', function(testCallback) {
      var fakeError = new Error('fake');
      var fakeSender = new EventEmitter();
      fakeSender.detach = sinon.stub().callsArg(0);

      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, null, fakeSender),
        attachReceiverLink: sinon.stub().callsArgWith(2, fakeError)
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);

      client.on('error', function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });

      client.attach();
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_015: [The `AmqpDeviceMethodClient` object shall forward any error received on a link to any listening client in an `error` event.*/
    it.skip('emits an error event if an error is received after establishing the link', function(testCallback) {
      var fakeAmqpReceiver = new EventEmitter();
      fakeAmqpReceiver.detach = sinon.stub().callsArg(0);
      var fakeAmqpSender = new EventEmitter();
      fakeAmqpSender.detach = sinon.stub().callsArg(0);
      var fakeError = new Error('failed to establish sender link');
      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, null, fakeAmqpSender),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, fakeAmqpReceiver),
        detachSenderLink: sinon.stub().callsArg(1),
        detachReceiverLink: sinon.stub().callsArg(1)
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.on('error', function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
      client.attach(function () {
        fakeAmqpReceiver.emit('error', fakeError);
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_020: [The `attach` method shall immediately call the callback if the links are already attached.]*/
    it('calls the callback immediately if the links are already attached', function (testCallback) {
      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, null, new EventEmitter()),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, new EventEmitter())
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function () {
        client.attach(function (err) {
          assert.isUndefined(err);
          assert.isTrue(fakeAmqpClient.attachReceiverLink.calledOnce);
          assert.isTrue(fakeAmqpClient.attachSenderLink.calledOnce);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_021: [The `attach` method shall subscribe to the `message` and `error` events on the `ReceiverLink` object associated with the method endpoint.]*/
    it('subscribes to the message and error events of the AmqpReceiver for the method endpoint', function() {
      var fakeAmqpReceiver = new EventEmitter();
      sinon.spy(fakeAmqpReceiver, 'on');

      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, null, new EventEmitter()),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, fakeAmqpReceiver)
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function() {
        assert(fakeAmqpReceiver.on.calledWith('message'));
        assert(fakeAmqpReceiver.on.calledWith('error'));
      });
    });

  });

  describe('#detach', function () {
    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_023: [The `detach` method shall call the callback with no arguments if the links are properly detached.]*/
    it('immediately calls the callback if already detached', function (testCallback) {
      var fakeSenderLink = new EventEmitter();
      fakeSenderLink.detach = sinon.stub().callsArg(0);
      var fakeReceiverLink = new EventEmitter();
      fakeReceiverLink.detach = sinon.stub().callsArg(0);

      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, null, fakeSenderLink),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, fakeReceiverLink)
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function () {
        client.detach(function () {
          assert.isTrue(fakeSenderLink.detach.calledOnce);
          assert.isTrue(fakeReceiverLink.detach.calledOnce);
          client.detach(function() {
            assert.isTrue(fakeSenderLink.detach.calledOnce);
            assert.isTrue(fakeReceiverLink.detach.calledOnce);
            testCallback();
          });
        });
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_022: [The `detach` method shall detach both Sender and Receiver links.]*/
    it('calls detach on the sender and receiver links', function (testCallback) {
      var fakeSenderLink = new EventEmitter();
      fakeSenderLink.detach = sinon.stub().callsArg(0);
      var fakeReceiverLink = new EventEmitter();
      fakeReceiverLink.detach = sinon.stub().callsArg(0);

      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, null, fakeSenderLink),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, fakeReceiverLink)
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function () {
        client.detach(function () {
          assert.isTrue(fakeSenderLink.detach.calledOnce);
          assert.isTrue(fakeReceiverLink.detach.calledOnce);
          testCallback();
        });
      });
    });

    it('waits until properly attached to cleanly detach links if called while attaching links', function (testCallback) {
      var fakeSenderLink = new EventEmitter();
      fakeSenderLink.detach = sinon.stub().callsArg(0);
      var fakeReceiverLink = new EventEmitter();
      fakeReceiverLink.detach = sinon.stub().callsArg(0);
      var attachCallback;
      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsFake(function (endpoint, linkOptions, callback) {
          attachCallback = callback;
        }),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, fakeReceiverLink)
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function () {
        assert.isTrue(fakeAmqpClient.attachReceiverLink.calledOnce);
        assert.isTrue(fakeAmqpClient.attachSenderLink.calledOnce);
      });

      // now blocked in 'attaching' state
      client.detach(function () {
        assert.isTrue(fakeSenderLink.detach.calledOnce);
        assert.isTrue(fakeReceiverLink.detach.calledOnce);
        testCallback();
      });

      // unblock attach
      attachCallback(null, fakeSenderLink);
    });
  });

  describe('#forceDetach', function () {
    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_025: The `forceDetach` method shall immediately return if all links are already detached.]*/
    it('immediately returns if the links are already detached', function () {
      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, {});
      assert.doesNotThrow(function () {
        client.forceDetach();
      });
    });

    /*Tests_SRS_NODE_AMQP_DEVICE_METHOD_CLIENT_16_024: [The `forceDetach` method shall forcefully detach all links.]*/
    it('calls forceDetach on the necessary links if called while attaching the links', function (testCallback) {
      var fakeSenderLink = new EventEmitter();
      fakeSenderLink.forceDetach = sinon.stub();
      var fakeReceiverLink = new EventEmitter();
      fakeReceiverLink.forceDetach = sinon.stub();

      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, null, fakeSenderLink),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, fakeReceiverLink)
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      sinon.stub(fakeReceiverLink, "on").callsFake(function (eventName) {
        if (eventName === 'message') {
          // sender is attached, receiver is attaching since we're registering for messages. good time to trigger a fake forceDetach
          client.forceDetach();
          assert(fakeSenderLink.forceDetach.calledOnce);
          assert(fakeReceiverLink.forceDetach.calledOnce);
          testCallback();
        }
      });

      client.attach(function () {
        client.forceDetach();
      });
    });

    it('does not throw if no links are attached', function () {
      var fakeSenderLink = new EventEmitter();
      fakeSenderLink.forceDetach = sinon.stub();
      var fakeReceiverLink = new EventEmitter();
      fakeReceiverLink.forceDetach = sinon.stub();

      var fakeAmqpClient = {
        attachSenderLink: sinon.stub(), // will block and no link will be attached
        attachReceiverLink: sinon.stub()
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function () {});
      assert.doesNotThrow(function () {
        client.forceDetach();
      });
    });

    it('calls forceDetach on the sender and receiver links', function (testCallback) {
      var fakeSenderLink = new EventEmitter();
      fakeSenderLink.forceDetach = sinon.stub();
      var fakeReceiverLink = new EventEmitter();
      fakeReceiverLink.forceDetach = sinon.stub();

      var fakeAmqpClient = {
        attachSenderLink: sinon.stub().callsArgWith(2, null, fakeSenderLink),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, fakeReceiverLink)
      };

      var client = new AmqpDeviceMethodClient(fakeAuthenticationProvider, fakeAmqpClient);
      client.attach(function () {
        client.forceDetach();
        assert.isTrue(fakeSenderLink.forceDetach.calledOnce);
        assert.isTrue(fakeReceiverLink.forceDetach.calledOnce);
        testCallback();
      });
    });
  });
});

