// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var EventEmitter = require('events').EventEmitter;
var sinon = require('sinon');

var AmqpTwinReceiver = require('../lib/amqp_twin_receiver.js').AmqpTwinReceiver;
var AmqpProvider = require('./_fake_amqp.js').FakeAmqp;
var Amqp = require('../lib/amqp').Amqp;
var AmqpProviderAttachSenderFails = require('./_fake_amqp.js').FakeAmqpAttachSenderFails;
var AmqpProviderAttachReceiverFails = require('./_fake_amqp.js').FakeAmqpAttachReceiverFails;
var AmqpProviderDetachSenderFails = require('./_fake_amqp.js').FakeAmqpDetachSenderFails;
var AmqpProviderDetachReceiverFails = require('./_fake_amqp.js').FakeAmqpDetachReceiverFails;
var AmqpProviderAttachReceiverDelay = require('./_fake_amqp.js').FakeAmqpAttachReceiverDelayCallback
var AmqpProviderDetachReceiverDelay = require('./_fake_amqp.js').FakeAmqpDetachReceiverDelayCallback
var Message = require('azure-iot-common').Message;
var errors = require('azure-iot-common').errors;
var endpoint = require('azure-iot-common').endpoint;


var fakeConfig = {
  deviceId: 'deviceId'
};

describe('AmqpTwinReceiver', function () {

  describe('#constructor', function () {

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_004: [The `AmqpTwinReceiver` constructor shall throw `ReferenceError` if the `config` object is falsy.] */
    [undefined, null].forEach(function(badConfig) {
      it('throws a ReferenceError if \'config\' is \'' + badConfig + '\'', function() {
        assert.throws(function() {
          return new AmqpTwinReceiver(badConfig, {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_002: [The `AmqpTwinReceiver` constructor shall throw `ReferenceError` if the `client` object is falsy.] */
    [undefined, null].forEach(function(badClient) {
      it('throws a ReferenceError if \'amqpClient\' is \'' + badClient + '\'', function() {
        assert.throws(function() {
          return new AmqpTwinReceiver({}, badClient);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_005: [The `AmqpDeviceMethodClient` shall inherit from the `EventEmitter` class.] */
    it('inherits from EventEmitter', function() {
      var client = new AmqpTwinReceiver({}, {});
      assert.instanceOf(client, EventEmitter);
    });
  });

  describe('#response', function () {

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_006: [When a listener is added for the `response` event, and the `post` event is NOT already subscribed, upstream and downstream links are established via calls to `attachReceiverLink` and `attachSenderLink`.] */
    it('calls attachSender and attachReceiver if #post not invoked first', function() {
      var amqpClient = new AmqpProvider();
      var attachSender = sinon.spy(amqpClient, 'attachSenderLink');
      var attachReceiver = sinon.spy(amqpClient, 'attachReceiverLink');
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('response', function () {});
      assert(attachSender.calledOnce);
      assert(attachReceiver.calledOnce);
    });

    it('ONLY calls attachSender and attachReceiver once if #post is subscribed first', function() {
      var amqpClient = new AmqpProvider();
      var attachSender = sinon.spy(amqpClient, 'attachSenderLink');
      var attachReceiver = sinon.spy(amqpClient, 'attachReceiverLink');
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('post', function() {});
      newTwinReceiver.on('response', function () {});
      assert(attachSender.calledOnce);
      assert(attachReceiver.calledOnce);
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_007: [The endpoint argument for attacheReceiverLink shall be `/devices/<deviceId>/twin`.] */
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_009: [The endpoint argument for attacheSenderLink shall be `/devices/<deviceId>/twin`.] */
    it('endpoint argument for attache/Receiver/Sender/Link shall be `/devices/<deviceId>/twin`.', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('response', function () {});
      assert.equal(amqpClient.attachSenderEndpoint, '/devices/' + fakeConfig.deviceId + '/twin', 'attach sender called with correct endpoint');
      assert.equal(amqpClient.attachReceiverEndpoint, '/devices/' + fakeConfig.deviceId + '/twin', 'attach receiver called with correct endpoint');
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_010: [** The link options argument for attachSenderLink shall be:
         attach: {
                properties: {
                  'com.microsoft:channel-correlation-id' : 'twin:<correlationId>',
                  'com.microsoft:api-version' : endpoint.apiVersion
                },
                sndSettleMode: 1,
                rcvSettleMode: 0
              } ]  */
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_008: [The link options argument for attachReceiverLink shall be:
         attach: {
                properties: {
                  'com.microsoft:channel-correlation-id' : 'twin:<correlationId>',
                  'com.microsoft:api-version' : endpoint.apiVersion
                },
                sndSettleMode: 1,
                rcvSettleMode: 0
              } ] */
    it('link options argument for attache/Receiver/Sender/Link shall be ...', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('response', function () {});
      assert.equal(amqpClient.attachSenderLinkOptions.attach.sndSettleMode, 1, ' sender send settle mode not set appropriately' );
      assert.equal(amqpClient.attachSenderLinkOptions.attach.rcvSettleMode, 0, ' sender rcv settle mode not set appropriately' );
      assert.equal(amqpClient.attachReceiverLinkOptions.attach.sndSettleMode, 1, ' receiver send settle mode not set appropriately' );
      assert.equal(amqpClient.attachReceiverLinkOptions.attach.rcvSettleMode, 0, ' receiver rcv settle mode not set appropriately' );
      assert.equal(amqpClient.attachSenderLinkOptions.attach.properties['com.microsoft:api-version'], endpoint.apiVersion, ' sender api version not set appropriately');
      assert.equal(amqpClient.attachReceiverLinkOptions.attach.properties['com.microsoft:api-version'], endpoint.apiVersion, ' receiver api version not set appropriately');
      assert.equal(amqpClient.attachReceiverLinkOptions.attach.properties['com.microsoft:channel-correlation-id'], amqpClient.attachSenderLinkOptions.attach.properties['com.microsoft:channel-correlation-id'], ' send and receiver correlation not equal');
      assert(amqpClient.attachSenderLinkOptions.attach.properties['com.microsoft:channel-correlation-id'].length, 41); // 32 hex digits + 4 dashes + twin:
      assert(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(amqpClient.attachSenderLinkOptions.attach.properties['com.microsoft:channel-correlation-id'].substr(5, 36)), 'correlationId does not contains a uuid');
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_011: [** Upon successfully establishing the upstream and downstream links the `subscribed` event shall be emitted from the twin receiver, with an argument object of {eventName: "response", transportObject: <object>}.] */
    it('subscribe event emitted on successful listen for response', function() {
      var subCalls = 0;
      var subResponseCalls = 0;
      var subPostCalls = 0;
      var subscribeHandler = function(subObject) {
        subCalls++;
        if (subObject.eventName === 'response') {
          subResponseCalls++;
        }
        if (subObject.eventName === 'post') {
          subPostCalls++;
        }
      };
      var subSpy = sinon.spy();
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('subscribed', subscribeHandler);
      newTwinReceiver.on('response', function () {});
      assert.equal(subCalls, 1, 'subscribe handler invoked improper number of times');
      assert.equal(subResponseCalls, 1, 'response event emitted incorrect number of times')
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_014: [When there are no more listeners for the `response` AND the `post` event, the upstream and downstream amqp links shall be closed via calls to `detachReceiverLink` and `detachSenderLink`.] */
    it('No more listeners will invoke detach of sender and receiver links.', function() {
      var amqpClient = new AmqpProvider();
      var responseFunction = function () {};
      var attachSender = sinon.spy(amqpClient, 'attachSenderLink');
      var attachReceiver = sinon.spy(amqpClient, 'attachReceiverLink');
      var detachSender = sinon.spy(amqpClient, 'detachSenderLink');
      var detachReceiver = sinon.spy(amqpClient, 'detachReceiverLink');
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('response', responseFunction);
      assert(detachSender.notCalled);
      assert(detachReceiver.notCalled);
      newTwinReceiver.removeListener('response', responseFunction);
      assert(detachSender.calledOnce);
      assert(detachReceiver.calledOnce);
    });

    it('Had two listeners then no more listeners will invoke detach of sender and receiver links.', function() {
      var amqpClient = new AmqpProvider();
      var responseFunction = function () {};
      var attachSender = sinon.spy(amqpClient, 'attachSenderLink');
      var attachReceiver = sinon.spy(amqpClient, 'attachReceiverLink');
      var detachSender = sinon.spy(amqpClient, 'detachSenderLink');
      var detachReceiver = sinon.spy(amqpClient, 'detachReceiverLink');
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('response', responseFunction);
      newTwinReceiver.on('post', responseFunction);
      assert(detachSender.notCalled);
      assert(detachReceiver.notCalled);
      newTwinReceiver.removeListener('response', responseFunction);
      assert(detachSender.notCalled);
      assert(detachReceiver.notCalled);
      newTwinReceiver.removeListener('post', responseFunction);
      assert(detachSender.calledOnce);
      assert(detachReceiver.calledOnce);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_015: [If there is a listener for the `response` event, a `response` event shall be emitted for each response received for requests initiated by SendTwinRequest.] */
    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_026: [The `status` value is acquired from the amqp message status message annotation.] */
    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_016: [When a `response` event is emitted, the parameter shall be an object which contains `status`, `requestId` and `body` members.] */
    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_017: [The `requestId` value is acquired from the amqp message correlationId property in the response amqp message.] */
    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_018: [The `body` parameter of the `response` event shall be the data of the received amqp message.] */
    it('Emit a response message for a sendTwinRequest.', function(responseDone) {
      var amqpClient = new AmqpProvider();
      var messageData = 'a string for the body';
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('subscribed', function(event) {
        if (event.eventName === 'response') {
          process.nextTick(function () {
            newTwinReceiver.sendTwinRequest('GET', '/abc', { '$rid' : 10 }, messageData, function() {});
            //
            // Form a common message for the receiver link to emit.
            //
            var newMessage = new Message();
            newMessage.correlationId = '10';
            newMessage.data = messageData;
            newMessage.transportObj = {};
            newMessage.transportObj.messageAnnotations = {};
            newMessage.transportObj.messageAnnotations['status'] = 201;
            amqpClient.fakeReceiverLink.emit('message', newMessage);
          });
        }
      });
      newTwinReceiver.on('response', function(data) {
        assert.isDefined(data.status);
        assert.equal(data.status, 201, 'returned status is not set appropriately');
        assert.isDefined(data.$rid);
        assert.equal(data.$rid, '10', '$rid not set appropriately');
        assert.isDefined(data.body);
        assert.equal(data.body, messageData, 'the body was not set appropriately');
        responseDone();
      });
    });

    it('sendTwinRequest while still connecting', function(responseDone) {
      var amqpClient = new AmqpProviderAttachReceiverDelay();
      var messageData = 'some string for the body.';
      var dummyResponseHandler = function() {};
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      var sendCalled = sinon.spy(amqpClient.fakeSenderLink, 'send');
      newTwinReceiver.on('response', dummyResponseHandler);  // This will start the connecting sequence.
      assert(sendCalled.notCalled);
      newTwinReceiver.sendTwinRequest('GET', '/abc', { '$rid' : 10 }, messageData, function() {});
      assert(sendCalled.notCalled);
      amqpClient.invokeDelayCallback();
      assert(sendCalled.calledOnce);
      responseDone();
    });

    it('handleNewListener while still connecting', function(testDone) {
      var amqpClient = new AmqpProviderAttachReceiverDelay();
      var subscribeCallback = {
        callbackFunction: function () {}
      };
      var subSpy = sinon.spy(subscribeCallback, 'callbackFunction');
      var dummyResponseHandler = function() {};
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('subscribed', subscribeCallback.callbackFunction);
      newTwinReceiver.on('response', dummyResponseHandler);  // This will start the connecting sequence.
      assert(subSpy.notCalled);
      newTwinReceiver.on('response', dummyResponseHandler);  // Still should be in the connecting sequence.
      assert(subSpy.notCalled);
      amqpClient.invokeDelayCallback();  // This should cause the connect sequence to finish.
      assert(subSpy.calledTwice);
      testDone();
    });

    it('handleRemoveListener while still connecting', function(testDone) {
      var amqpClient = new AmqpProviderAttachReceiverDelay();
      var subscribeCallback = {
        callbackFunction: function () {}
      };
      var subSpy = sinon.spy(subscribeCallback, 'callbackFunction');
      var dummyResponseHandler = function() {};
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('subscribed', subscribeCallback.callbackFunction);
      newTwinReceiver.on('response', dummyResponseHandler);  // This will start the connecting sequence.
      assert(subSpy.notCalled);
      newTwinReceiver.on('response', dummyResponseHandler);  // Still should be in the connecting sequence.
      assert(subSpy.notCalled);
      newTwinReceiver.removeListener('response', dummyResponseHandler);
      assert(subSpy.notCalled);
      amqpClient.invokeDelayCallback();  // This should cause the connect sequence to finish.
      assert(subSpy.calledTwice);
      testDone();
    });

    it('handleRemoveListener while still connecting', function(testDone) {
      var amqpClient = new AmqpProviderAttachReceiverDelay();
      var subscribeCallback = {
        callbackFunction: function () {}
      };
      var subSpy = sinon.spy(subscribeCallback, 'callbackFunction');
      var dummyResponseHandler = function() {};
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('subscribed', subscribeCallback.callbackFunction);
      newTwinReceiver.on('response', dummyResponseHandler);  // This will start the connecting sequence.
      assert(subSpy.notCalled);
      newTwinReceiver.on('response', dummyResponseHandler);  // Still should be in the connecting sequence.
      assert(subSpy.notCalled);
      newTwinReceiver.removeListener('response', dummyResponseHandler);
      assert(subSpy.notCalled);
      amqpClient.invokeDelayCallback();  // This should cause the connect sequence to finish.
      assert(subSpy.calledTwice);
      testDone();
    });

    it('handle while disconnecting', function(testDone) {
      var amqpClient = new AmqpProviderDetachReceiverDelay();
      var subscribeCallback = {
        callbackFunction: function () {}
      };
      var subSpy = sinon.spy(subscribeCallback, 'callbackFunction');
      var dummyResponseHandler = function() {};
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('subscribed', subscribeCallback.callbackFunction);
      newTwinReceiver.on('response', dummyResponseHandler);  // This will make us fully connected
      assert(subSpy.calledOnce); // Should have seen the subscribe
      //
      // The next call should start the disconnecting.  However, that
      // won't complete until force the detach callback.
      //
      newTwinReceiver.removeListener('response', dummyResponseHandler);
      newTwinReceiver.on('response', dummyResponseHandler);  // These next 3 should pend because disconnecting.
      newTwinReceiver.sendTwinRequest('GET', '/abc', { '$rid' : 10 }, 'not important', function(err) {
        assert(subSpy.calledOnce); // No subscription should have occurred.
        assert(err.message === 'Link Detached');
        testDone();
      });
      newTwinReceiver.removeListener('response', dummyResponseHandler);
      amqpClient.invokeDelayCallback();  // This should cause the disconnect sequence to finish.
    });

    it('error event in connected causes disconnect', function(testDone) {
      var errorHandler = function(err) {
        assert(detachSender.calledOnce, 'detach sender should have been called');
        assert(detachReceiver.calledOnce, 'detach receiver should have been called');
        assert.equal(err.constructor.name, 'InternalServerError');
        testDone();
      };
      var amqpClient = new AmqpProvider();
      var detachSender = sinon.spy(amqpClient, 'detachSenderLink');
      var detachReceiver = sinon.spy(amqpClient, 'detachReceiverLink');
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('response', function () {});
      newTwinReceiver.on('error', errorHandler);
      assert(detachSender.notCalled, 'detach sender should not have been called');
      assert(detachReceiver.notCalled, 'detach receiver should not have been called');
      var linkError = new Error();
      linkError.condition = 'amqp:internal-error'
      amqpClient.fakeSenderLink.emit('errorReceived', linkError);
    });

  });

  describe('#post', function () {

    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_012: [When a listener is added for the `post` event, and the `response` event is NOT already subscribed, upstream and downstream links are established via calls to `attachReceiverLink` and `attachSenderLine`.] */
    it('calls attachSender and attachReceiver if #response not invoked first', function() {
      var amqpClient = new AmqpProvider();
      var attachSender = sinon.spy(amqpClient, 'attachSenderLink');
      var attachReceiver = sinon.spy(amqpClient, 'attachReceiverLink');
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('post', function () {});
      assert(attachSender.calledOnce);
      assert(attachReceiver.calledOnce);
    });

    it('ONLY calls attachSender and attachReceiver once if #response is subscribed first', function() {
      var amqpClient = new AmqpProvider();
      var attachSender = sinon.spy(amqpClient, 'attachSenderLink');
      var attachReceiver = sinon.spy(amqpClient, 'attachReceiverLink');
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('response', function () {});
      newTwinReceiver.on('post', function() {});
      assert(attachSender.calledOnce);
      assert(attachReceiver.calledOnce);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_013: [Upon receiving a successful response message with the correlationId of the `PUT`, the `subscribed` event shall be emitted from the twin receiver, with an argument object of {eventName: "post", transportObject: <object>}.] */
    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_019: [Upon successfully establishing the upstream and downstream links, a `PUT` request shall be sent on the upstream link with a correlationId set in the properties of the amqp message.] */
    it('calls SendTwinRequest following Link Establishment', function(responseDone) {
      var resource = '/notifications/twin/properties/desired';
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      var sendCalled = sinon.spy(amqpClient.fakeSenderLink, 'send');
      newTwinReceiver.on('subscribed', function(event) {
        if (event.eventName === 'post') {
          responseDone();
        }
      });
      newTwinReceiver.on('post', function () {});
      assert(sendCalled.calledOnce, 'sendTwinRequest invoked incorrect number of times');
      assert.equal(amqpClient.lastSendMessage.messageAnnotations['operation'], 'PUT', 'inappropriate operation sent');
      assert.equal(amqpClient.lastSendMessage.messageAnnotations['resource'], resource, 'inappropriate resource sent');
      var newMessage = new Message();
      newMessage.correlationId = amqpClient.lastSendMessage.properties.correlationId;
      newMessage.data = '';
      amqpClient.fakeReceiverLink.emit('message', newMessage);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_020: [If there is a listener for the `post` event, a `post` event shall be emitted for each amqp message received on the downstream link that does NOT contain a correlation id, the parameter of the emit will be is the data of the amqp message.] */
    it('POST listeners invoked for every desired prop update', function(responseDone) {
      var amqpClient = new AmqpProvider();
      var messageData = 'a string of data';
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.on('subscribed', function(event) {
        if (event.eventName === 'post') {
          var newDesiredMessage = new Message();
          newDesiredMessage.data = messageData;
          amqpClient.fakeReceiverLink.emit('message', newDesiredMessage);
        }
      });
      newTwinReceiver.on('post', function (propUpdate) {
        if (propUpdate === messageData) {
          responseDone();
        }
      });
      var newMessage = new Message();
      newMessage.correlationId = amqpClient.lastSendMessage.properties.correlationId;
      newMessage.data = '';
      amqpClient.fakeReceiverLink.emit('message', newMessage);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_021: [When there is no more listeners for the `post` event, a `DELETE` request shall be sent on the upstream link with a correlationId set in the properties of the amqp message.] */
    it('No more POST listeners results in DELETE message to service', function(responseDone) {
      var resource = '/notifications/twin/properties/desired';
      var amqpClient = new AmqpProvider();
      var dummyPostHandler = function() {};
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      var sendCalled = sinon.spy(amqpClient.fakeSenderLink, 'send');
      newTwinReceiver.on('subscribed', function(event) {
        if (event.eventName === 'post') {
          var deleteResponse = new Message();
          newTwinReceiver.on('response', function() {});
          newTwinReceiver.removeListener('post', dummyPostHandler);
          assert(sendCalled.calledTwice, 'sendTwinRequest invoked incorrect number of times');
          assert.equal(amqpClient.lastSendMessage.messageAnnotations['operation'], 'DELETE', 'inappropriate operation sent');
          assert.equal(amqpClient.lastSendMessage.messageAnnotations['resource'], resource, 'inappropriate resource sent');
          deleteResponse.correlationId = amqpClient.lastSendMessage.properties.correlationId;
          deleteResponse.data = '';
          amqpClient.fakeReceiverLink.emit('message', deleteResponse);
          responseDone();
        }
      });
      newTwinReceiver.on('post', dummyPostHandler);
      var postResponse = new Message();
      postResponse.correlationId = amqpClient.lastSendMessage.properties.correlationId;
      postResponse.data = '';
      amqpClient.fakeReceiverLink.emit('message', postResponse);
    });

  });

  describe('#errors', function() {
    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_022: [If an error occurs on establishing the upstream or downstream link then the `error` event shall be emitted.] */
    [
      { direction: 'sender', provider: AmqpProviderAttachSenderFails },
      { direction: 'receiver', provider: AmqpProviderAttachReceiverFails }
    ].forEach(function(operation) {
      it('twin receiver emits an error if attaching ' + operation.direction + ' link fails', function(testDone) {
        var amqpClient = new operation.provider();
        var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
        newTwinReceiver.on('error', function(err) {
          assert.equal(err.constructor.name, 'UnauthorizedError');
          testDone();
        });
        newTwinReceiver.on('response', function () {});
      });
    });

    [
      { direction: 'sender', provider: AmqpProviderDetachSenderFails },
      { direction: 'receiver', provider: AmqpProviderDetachReceiverFails }
    ].forEach(function(operation) {
      it('twin receiver emits an error if detaching ' + operation.direction + ' link fails', function(testDone) {
        var amqpClient = new operation.provider();
        var dummyResponseHandler = function() {};
        var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
        newTwinReceiver.on('error', function(err) {
          /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_025: [When the `error` event is emitted, the first parameter shall be an error object obtained via the amqp `translateError` module.] */
          assert.equal(err.constructor.name, 'UnauthorizedError');
          testDone();
        });
        newTwinReceiver.on('response', dummyResponseHandler);
        newTwinReceiver.removeListener('response', dummyResponseHandler)
      });
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_024: [If any detach occurs the other link will also be detached by the twin receiver.] */
    /* Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_023: [If a detach with error occurs on the upstream or the downstream link then the `error` event shall be emitted.] */
    [
      'fakeSenderLink',
      'fakeReceiverLink'
    ].forEach(function (whichLink) {
      it('twin receiver detaches all links when a detach is emitted on ' + whichLink, function(testDone) {
        var amqpClient = new AmqpProvider();
        var detachSender = sinon.spy(amqpClient, 'detachSenderLink');
        var detachReceiver = sinon.spy(amqpClient, 'detachReceiverLink');
        var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
        newTwinReceiver.on('subscribed', function(event) {
          if (event.eventName === 'response') {
            var linkError = new Error();
            linkError.condition = 'amqp:internal-error';
            var detachError = {closed: false, error: linkError};
            amqpClient[whichLink].emit('detached', detachError);
            var newDeleteResult = new Message();
          }
        });
        newTwinReceiver.on('error', function(err) {
          assert(detachSender.calledOnce);
          assert(detachReceiver.calledOnce);
          assert.equal(err.constructor.name, 'InternalServerError');
          testDone();
        });
        newTwinReceiver.on('response', function() {});
      });
    });
  });

  describe('sendTwinRequest', function () {

    /* Tests_SRS_NODE_DEVICE_AMQP_06_012: [The `sendTwinRequest` method shall not throw `ReferenceError` if the `done` callback is falsy.] */
    it('does not throw if done is falsy', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      assert.doesNotThrow(function() {
        newTwinReceiver.sendTwinRequest('PUT', '/res', { 'rid':10 }, 'body', null);
      });
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_013: [** The `sendTwinRequest` method shall throw an `ReferenceError` if the `method` argument is falsy. **] */
    it('throws if method is falsy', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      assert.throws(function() {
        newTwinReceiver.sendTwinRequest(null, '/res', { '$rid':10 }, 'body', function() {});
      }, ReferenceError);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_017: [The `sendTwinRequest` method shall throw an `ArgumentError` if the `method` argument is not a string.] */
    it('throws if method is not a string', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      assert.throws(function() {
        newTwinReceiver.sendTwinRequest({}, '/res', { '$rid':10 }, 'body', function() {});
      }, errors.ArgumentError);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_014: [The `sendTwinRequest` method shall throw an `ReferenceError` if the `resource` argument is falsy.] */
    it('throws if resource is falsy', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      assert.throws(function() {
        newTwinReceiver.sendTwinRequest('PUT', null, { '$rid':10 }, 'body', function() {});
      }, ReferenceError);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_018: [The `sendTwinRequest` method shall throw an `ArgumentError` if the `resource` argument is not a string.] */
  it('throws if resource is not a string', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      assert.throws(function() {
        newTwinReceiver.sendTwinRequest('PUT', {}, { '$rid':10 }, 'body', function() {});
      }, errors.ArgumentError);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_015: [The `sendTwinRequest` method shall throw an `ReferenceError` if the `properties` argument is falsy.] */
    it('throws if properties is falsy', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      assert.throws(function() {
        newTwinReceiver.sendTwinRequest('PUT', '/res', null, 'body', function() {});
      }, ReferenceError);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_019: [The `sendTwinRequest` method shall throw an `ArgumentError` if the `properties` argument is not a an object.] */
    it('throws if properties is not an object', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      assert.throws(function() {
        newTwinReceiver.sendTwinRequest('PUT', '/res', 'properties', 'body', function() {});
      }, errors.ArgumentError);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_028: [The `sendTwinRequest` method shall throw an `ArgumentError` if any members of the `properties` object fails to serialize to a string.] */
    it('throws if properties fails to deserialize to a string', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      assert.throws(function() {
        newTwinReceiver.sendTwinRequest('PUT', '/res', { 'func': function() {} }, 'body', function() {});
      }, errors.ArgumentError);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_016: [The `sendTwinRequest` method shall throw an `ReferenceError` if the `body` argument is falsy.] */
    it('throws if body is falsy', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      assert.throws(function() {
        newTwinReceiver.sendTwinRequest('PUT', '/res', { '$rid' : 10 }, null, function() {});
      }, ReferenceError);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_020: [The `method` argument shall be the value of the amqp message `operation` annotation.] */
    it('method argument shall be operation annotation', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.sendTwinRequest('GET', 'abc/', { '$rid' : 10 }, 'a string for the body', function() {});
      assert.equal(amqpClient.lastSendMessage.messageAnnotations.operation, 'GET', 'operation not set appropriately');
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_021: [The `resource` argument shall be the value of the amqp message `resource` annotation.] */
    it('resource argument shall be resource annotation', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.sendTwinRequest('GET', '/abc', { '$rid' : 10 }, 'a string for the body', function() {});
      assert.equal(amqpClient.lastSendMessage.messageAnnotations.resource, '/abc', 'resource not set appropriately');
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_031: [If the `resource` argument terminates in a slash, the slash shall be removed from the annotation.] */
    it('resource argument terminating slash shall be removed', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.sendTwinRequest('GET', '/abc/', { '$rid' : 10 }, 'a string for the body', function() {});
      assert.equal(amqpClient.lastSendMessage.messageAnnotations.resource, '/abc', 'resource not set appropriately');
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_039: [If the `resource` argument length is zero (after terminating slash removal), the resource annotation shall not be set.] */
    it('resource length zero has no resource annotation', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.sendTwinRequest('GET', '/', { '$rid' : 10 }, 'a string for the body', function() {});
      assert(!amqpClient.lastSendMessage.messageAnnotations.hasOwnProperty('resource'), 'message contains a resource annotation inappropriately');
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_022: [All properties, except $rid, shall be set as the part of the properties map of the amqp message.] */
    /* Tests_SRS_NODE_DEVICE_AMQP_06_023: [The $rid property shall be set as the `correlationId` in the properties map of the amqp message.] */
    it('properties of the message set appropriately', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.sendTwinRequest('PATCH', '/', { '$rid' : 10, 'rid': 10, 'from': 'the south', 'to': 'the north' }, 'a string for the body', function() {});
      assert.isFalse(amqpClient.lastSendMessage.properties.hasOwnProperty('$rid'), '$rid property set inappropriately in message');
      assert(amqpClient.lastSendMessage.properties.hasOwnProperty('rid'), 'rid property not in message');
      assert.strictEqual(amqpClient.lastSendMessage.properties['rid'], 10, 'rid property set inappropriately');
      assert(amqpClient.lastSendMessage.properties.hasOwnProperty('from'), 'from property not in message');
      assert.strictEqual(amqpClient.lastSendMessage.properties['from'], 'the south', 'from property set inappropriately');
      assert(amqpClient.lastSendMessage.properties.hasOwnProperty('to'), 'to property not in message');
      assert.strictEqual(amqpClient.lastSendMessage.properties['to'], 'the north', 'to property set inappropriately');
      assert(amqpClient.lastSendMessage.properties.hasOwnProperty('correlationId'), 'correlation property not in message');
      assert.strictEqual(amqpClient.lastSendMessage.properties['correlationId'], '10', 'correlation property set inappropriately');
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_024: [The `body` shall be value of the body of the amqp message.] */
    /* Tests_SRS_NODE_DEVICE_AMQP_06_025: [The amqp message will be sent upstream to the IoT Hub via the amqp10 client `send`.] */
    it('body argument shall be value of message body', function() {
      var amqpClient = new AmqpProvider();
      var messageData = 'a string for the body';
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.sendTwinRequest('PATCH', '/', { '$rid' : 10, 'rid': 10, 'from': 'the south', 'to': 'the north' }, messageData, function() {});
      assert(amqpClient.lastSendMessage.hasOwnProperty('body'), 'body property not in message');
      assert.equal(amqpClient.lastSendMessage.body, messageData, 'body set inappropriately');
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_040: [If an error occurs in the `sendTwinRequest` method, the `done` callback shall be called with the error as the first parameter.] */
    it('error occurs done shall be called with error as first parameter', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      amqpClient.sendShouldSucceed(false);
      newTwinReceiver.sendTwinRequest('PATCH', '/', { '$rid' : 10, 'rid': 10, 'from': 'the south', 'to': 'the north' }, 'a string for the body', function(err) {
        assert(err);
      });
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_041: [If an error occurs, the `sendTwinRequest` shall use the AMQP `translateError` module to convert the amqp-specific error to a transport agnostic error before passing it into the `done` callback.] */
    it('error occurs shall translated to agnostic message', function() {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      amqpClient.sendShouldSucceed(false);
      newTwinReceiver.sendTwinRequest('PATCH', '/', { '$rid' : 10, 'rid': 10, 'from': 'the south', 'to': 'the north' }, 'a string for the body', function(err) {
        assert.equal(err.constructor.name, 'UnauthorizedError');
      });
    });


    /* Tests_SRS_NODE_DEVICE_AMQP_06_042: [If the `sendTwinRequest` method is successful, the first parameter to the `done` callback shall be null and the second parameter shall be a MessageEnqueued object. **] */
    it('returns MessageEnqueued object on success', function(done) {
      var amqpClient = new AmqpProvider();
      var newTwinReceiver = new AmqpTwinReceiver(fakeConfig, amqpClient);
      newTwinReceiver.sendTwinRequest('PATCH', '/properties/reported/', { '$rid':10, '$version': 200 }, 'body', function(err, res) {
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
    var config = {
      'host' : 'mock_host',
      'deviceId' : 'mock_deviceId',
      'sharedAccessSignature' : 'mock_sharedAccessSignature'
    };

    var provider;
    var transport;

    beforeEach(function() {
      provider = new AmqpProvider();
      transport = new Amqp(config, provider);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_033: [ The `getTwinReceiver` method shall throw an `ReferenceError` if done is falsy.]  */
    it('throws if done is falsy', function() {
      assert.throws(function() {
        transport.getTwinReceiver();
      }, ReferenceError);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_034: [If a twin receiver for this endpoint doesn't exist, the `getTwinReceiver` method should create a new `AmqpTwinReceiver` object.] */
    /* Tests_SRS_NODE_DEVICE_AMQP_06_035: [If a twin receiver for this endpoint has already been created, the `getTwinReceiver` method should not create a new `AmqpTwinReceiver` object.] */
    it('calls done when complete', function(done) {
      transport.getTwinReceiver(done);
    });

    /* Tests_SRS_NODE_DEVICE_AMQP_06_037: [If a twin receiver for this endpoint did not previously exist, the `getTwinReceiver` method should return the a new `AmqpTwinReceiver` object as the second parameter of the `done` function with null as the first parameter.] */
    /* Tests_SRS_NODE_DEVICE_AMQP_06_038: [If a twin receiver for this endpoint previously existed, the `getTwinReceiver` method should return the preexisting `AmqpTwinReceiver` object as the second parameter of the `done` function with null as the first parameter.] */
    it('only creates one twin receiver object', function(done) {
      transport.getTwinReceiver(function(err, receiver1) {
        assert.isNull(err);
        assert.instanceOf(receiver1, AmqpTwinReceiver);
        transport.getTwinReceiver(function(err, receiver2) {
          assert.isNull(err);
          assert.strictEqual(receiver1, receiver2);
          done();
        });
      });
    });
  });

});
