// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var EventEmitter = require('events').EventEmitter;
var sinon = require('sinon');

var AmqpTwinClient = require('../lib/amqp_twin_client.js').AmqpTwinClient;
var Amqp = require('../lib/amqp').Amqp;
var Message = require('azure-iot-common').Message;
var errors = require('azure-iot-common').errors;
var endpoint = require('azure-iot-common').endpoint;

describe('AmqpTwinClient', function () {

  var fakeConfig = {
    deviceId: 'deviceId'
  };

  var fakeAuthenticationProvider, fakeAmqpClient, fakeSenderLink, fakeReceiverLink, twinClient;

  beforeEach(function () {
    fakeAuthenticationProvider = {
      getDeviceCredentials: sinon.stub().callsArgWith(0, null, fakeConfig)
    };

    fakeSenderLink = new EventEmitter();
      fakeSenderLink.send = sinon.stub().callsArg(1)

      fakeReceiverLink = new EventEmitter();

      fakeAmqpClient = {
        connect: sinon.stub().callsArg(2),
        initializeCbs: sinon.stub().callsArg(0),
        putToken: sinon.stub().callsArg(2),
        attachSenderLink: sinon.stub().callsArgWith(2, null, fakeSenderLink),
        attachReceiverLink: sinon.stub().callsArgWith(2, null, fakeReceiverLink),
        detachSenderLink: sinon.stub().callsArg(1),
        detachReceiverLink: sinon.stub().callsArg(1)
      };

      twinClient = new AmqpTwinClient(fakeAuthenticationProvider, fakeAmqpClient);
  });

  describe('#constructor', function () {
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_005: [The `AmqpTwinClient` shall inherit from the `EventEmitter` class.] */
    it('inherits from EventEmitter', function() {
      var client = new AmqpTwinClient({}, {});
      assert.instanceOf(client, EventEmitter);
    });
  });

  function testStateMachine(methodUnderTest) {
    it('calls getDeviceCredentials on the authentication provider', function () {
      methodUnderTest();
      assert.isTrue(fakeAuthenticationProvider.getDeviceCredentials.calledOnce);
    });

    it('calls its callback with an error if getDeviceCredentials fails', function (testCallback) {
      var fakeError = new Error('fake');
      fakeAuthenticationProvider.getDeviceCredentials = sinon.stub().callsArgWith(0, fakeError);
      methodUnderTest(function (err) {
        assert.isTrue(fakeAuthenticationProvider.getDeviceCredentials.calledOnce);
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_007: [The `getTwin` method shall attach the sender link if it's not already attached.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_009: [THe `getTwin` method shall attach the receiver link if it's not already attached.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_015: [The `updateTwinReportedProperties` method shall attach the sender link if it's not already attached.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_017: [THe `updateTwinReportedProperties` method shall attach the receiver link if it's not already attached.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_023: [The `enableTwinDesiredPropertiesUpdates` method shall attach the sender link if it's not already attached.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_025: [THe `enableTwinDesiredPropertiesUpdates` method shall attach the receiver link if it's not already attached.]*/
    it('calls attachSender and attachReceiver if the links are not attached', function() {
      methodUnderTest();
      assert.isTrue(fakeAmqpClient.attachSenderLink.calledOnce);
      assert.isTrue(fakeAmqpClient.attachReceiverLink.calledOnce);
    });

    it('calls attachSender and attachReceiver only once', function() {
      methodUnderTest();
      methodUnderTest();
      assert.isTrue(fakeAmqpClient.attachSenderLink.calledOnce);
      assert.isTrue(fakeAmqpClient.attachReceiverLink.calledOnce);
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_06v_007: [The endpoint argument for attachReceiverLink shall be `/devices/<deviceId>/twin`.] */
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_009: [The endpoint argument for attachSenderLink shall be `/devices/<deviceId>/twin`.] */
    it('attaches sender and receiver links to the `/devices/<deviceId>/twin` endpoint.', function() {
      methodUnderTest();
      assert.isTrue(fakeAmqpClient.attachSenderLink.calledWith('/devices/' + fakeConfig.deviceId + '/twin'));
      assert.isTrue(fakeAmqpClient.attachReceiverLink.calledWith('/devices/' + fakeConfig.deviceId + '/twin'));
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
    it('configures link options for the sender and receiver links', function() {
      methodUnderTest();
      var senderLinkOptions = fakeAmqpClient.attachSenderLink.firstCall.args[1];
      var receiverLinkOptions = fakeAmqpClient.attachReceiverLink.firstCall.args[1];
      assert.equal(senderLinkOptions.attach.sndSettleMode, 1, ' sender send settle mode not set appropriately' );
      assert.equal(senderLinkOptions.attach.rcvSettleMode, 0, ' sender rcv settle mode not set appropriately' );
      assert.equal(receiverLinkOptions.attach.sndSettleMode, 1, ' receiver send settle mode not set appropriately' );
      assert.equal(receiverLinkOptions.attach.rcvSettleMode, 0, ' receiver rcv settle mode not set appropriately' );
      assert.equal(senderLinkOptions.attach.properties['com.microsoft:api-version'], endpoint.apiVersion, ' sender api version not set appropriately');
      assert.equal(receiverLinkOptions.attach.properties['com.microsoft:api-version'], endpoint.apiVersion, ' receiver api version not set appropriately');
      /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_036: [The same correlationId shall be used for both the sender and receiver links.]*/
      assert.equal(receiverLinkOptions.attach.properties['com.microsoft:channel-correlation-id'], senderLinkOptions.attach.properties['com.microsoft:channel-correlation-id'], ' send and receiver correlation not equal');
      assert(receiverLinkOptions.attach.properties['com.microsoft:channel-correlation-id'].length, 41); // 32 hex digits + 4 dashes + twin:
      assert(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(senderLinkOptions.attach.properties['com.microsoft:channel-correlation-id'].substr(5, 36)), 'correlationId does not contains a uuid');
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_008: [If attaching the sender link fails, the `getTwin` method shall call its callback with the error that caused the failure.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_016: [If attaching the sender link fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_024: [If attaching the sender link fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
    it('calls its callback with an error if it fails to attach the sender link', function (testCallback) {
      var fakeError = new Error('fake');
      fakeAmqpClient.attachSenderLink = sinon.stub().callsArgWith(2, fakeError);
      methodUnderTest(function (err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_010: [If attaching the receiver link fails, the `getTwin` method shall call its callback with the error that caused the failure.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_018: [If attaching the receiver link fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_026: [If attaching the receiver link fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
    it('calls its callback with an error if it fails to attach the receiver link', function (testCallback) {
      var fakeError = new Error('fake');
      fakeAmqpClient.attachReceiverLink = sinon.stub().callsArgWith(2, fakeError);
      methodUnderTest(function (err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_012: [If the `SenderLink.send` call fails, the `getTwin` method shall call its callback with the error that caused the failure.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_020: [If the `SenderLink.send` call fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_028: [If the `SenderLink.send` call fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
    it('calls its callback with an error if it fails to send the message', function (testCallback) {
      var fakeError = new Error('fake');
      fakeSenderLink.send = sinon.stub().callsArgWith(1, fakeError);
      methodUnderTest(function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });
  }

  describe('#getTwin', function () {
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_007: [The `getTwin` method shall attach the sender link if it's not already attached.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_008: [If attaching the sender link fails, the `getTwin` method shall call its callback with the error that caused the failure.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_009: [THe `getTwin` method shall attach the receiver link if it's not already attached.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_010: [If attaching the receiver link fails, the `getTwin` method shall call its callback with the error that caused the failure.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_012: [If the `SenderLink.send` call fails, the `getTwin` method shall call its callback with the error that caused the failure.]*/
    testStateMachine(function (callback) {
      twinClient.getTwin(callback);
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_011: [** The `getTwin` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
    - `operation` annotation set to `GET`.
    - `resource` annotation set to `undefined`
    - `correlationId` property set to a uuid
    - `body` set to ` `.]*/
    it('sends a message with the correct annotations, properties and body', function () {
      twinClient.getTwin(function () {});
      var amqpMessage = fakeSenderLink.send.firstCall.args[0];
      assert.strictEqual(amqpMessage.messageAnnotations.operation, 'GET');
      assert.isUndefined(amqpMessage.messageAnnotations.resource);
      assert.isString(amqpMessage.properties.correlationId);
      assert.strictEqual(amqpMessage.body, ' ');
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_013: [The `getTwin` method shall monitor `Message` objects on the `ReceiverLink.on('message')` handler until a message with the same `correlationId` as the one that was sent is received.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_014: [The `getTwin` method shall parse the body of the received message and call its callback with a `null` error object and the parsed object as a result.]*/
    it('parses the response from the body of the corresponding response message', function (testCallback) {
      var fakeTwin = { fake : 'twin' };
      twinClient.getTwin(function (err, twin) {
        assert.deepEqual(twin, fakeTwin);
        testCallback();
      });

      fakeReceiverLink.emit('message', {
        correlationId: fakeSenderLink.send.firstCall.args[0].properties.correlationId,
        data: new Buffer(JSON.stringify(fakeTwin))
      });
    });
  });

  describe('#updateTwinReportedProperties', function () {
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_015: [The `updateTwinReportedProperties` method shall attach the sender link if it's not already attached.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_017: [THe `updateTwinReportedProperties` method shall attach the receiver link if it's not already attached.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_016: [If attaching the sender link fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_018: [If attaching the receiver link fails, the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_020: [If the `SenderLink.send` call fails the `updateTwinReportedProperties` method shall call its callback with the error that caused the failure.]*/
    testStateMachine(function (callback) {
      twinClient.updateTwinReportedProperties({ fake: 'patch' }, callback);
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_019: [The `updateTwinReportedProperties` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
    - `operation` annotation set to `PATCH`.
    - `resource` annotation set to `/properties/reported`
    - `correlationId` property set to a uuid
    - `body` set to the stringified patch object.]*/
    it('sends a message with the correct annotations, properties and body', function () {
      var fakePatch = { fake: 'patch' };
      twinClient.updateTwinReportedProperties(fakePatch, function () {});
      var amqpMessage = fakeSenderLink.send.firstCall.args[0];
      assert.strictEqual(amqpMessage.messageAnnotations.operation, 'PATCH');
      assert.strictEqual(amqpMessage.messageAnnotations.resource, '/properties/reported');
      assert.isString(amqpMessage.properties.correlationId);
      assert.strictEqual(amqpMessage.body, JSON.stringify(fakePatch));
    });
  });

  describe('#enableTwinDesiredPropertiesUpdates', function () {
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_023: [The `enableTwinDesiredPropertiesUpdates` method shall attach the sender link if it's not already attached.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_024: [If attaching the sender link fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_025: [THe `enableTwinDesiredPropertiesUpdates` method shall attach the receiver link if it's not already attached.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_026: [If attaching the receiver link fails, the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_028: [If the `SenderLink.send` call fails the `enableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
    testStateMachine(function (callback) {
      twinClient.enableTwinDesiredPropertiesUpdates(callback);
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_027: [The `enableTwinDesiredPropertiesUpdates` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
    - `operation` annotation set to `PUT`.
    - `resource` annotation set to `/notifications/twin/properties/desired`
    - `correlationId` property set to a uuid
    - `body` set to `undefined`.]*/
    it('sends a message with the correct annotations, properties and body', function () {
      twinClient.enableTwinDesiredPropertiesUpdates(function () {});
      var amqpMessage = fakeSenderLink.send.firstCall.args[0];
      assert.strictEqual(amqpMessage.messageAnnotations.operation, 'PUT');
      assert.strictEqual(amqpMessage.messageAnnotations.resource, '/notifications/twin/properties/desired');
      assert.isString(amqpMessage.properties.correlationId);
      assert.strictEqual(amqpMessage.body, ' ');
    });
  });


  describe('#disableTwinDesiredPropertiesUpdates', function () {
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_031: [The `disableTwinDesiredPropertiesUpdates` method shall call its callback immediately and with no arguments if the links are detached.]*/
    it('does not attach or send a message if already detached', function () {
      twinClient.disableTwinDesiredPropertiesUpdates(function () {});
      assert.isTrue(fakeAmqpClient.attachReceiverLink.notCalled);
      assert.isTrue(fakeAmqpClient.attachSenderLink.notCalled);
      assert.isTrue(fakeSenderLink.send.notCalled);
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_032: [The `disableTwinDesiredPropertiesUpdates` method shall send an `AmqpMessage` using the `SenderLink.send` method with the following annotations and properties:
    - `operation` annotation set to `DELETE`.
    - `resource` annotation set to `/notifications/twin/properties/desired`
    - `correlationId` property set to a uuid
    - `body` set to `undefined`.]*/
    it('sends a message with the operation annotation set to DELETE', function (testCallback) {
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        twinClient.disableTwinDesiredPropertiesUpdates(function () {});
        assert.strictEqual(fakeSenderLink.send.secondCall.args[0].messageAnnotations.operation, 'DELETE');
        testCallback();
      });
      fakeReceiverLink.emit('message', {
        correlationId: fakeSenderLink.send.firstCall.args[0].properties.correlationId,
        messageAnnotations: {
          status: 200
        },
        data: undefined
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_033: [If the `SenderLink.send` call fails, the `disableTwinDesiredPropertiesUpdates` method shall call its callback with the error that caused the failure.]*/
    it('calls its callback with an error if it fails to send the message', function (testCallback) {
      var fakeError = new Error('fake');
      fakeSenderLink.send = sinon.stub().callsArgWith(1, fakeError);
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        twinClient.disableTwinDesiredPropertiesUpdates(function (err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });

      fakeReceiverLink.emit('message', {
        correlationId: fakeSenderLink.send.firstCall.args[0].properties.correlationId,
        messageAnnotations: {
          status: 200
        },
        data: undefined
      });
    });

    it('sends a message with the resource annotation set to /notifications/twin/properties/desired', function (testCallback) {
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        twinClient.disableTwinDesiredPropertiesUpdates(function () {});
        assert.strictEqual(fakeSenderLink.send.firstCall.args[0].messageAnnotations.resource, '/notifications/twin/properties/desired');
        testCallback();
      });
      fakeReceiverLink.emit('message', {
        correlationId: fakeSenderLink.send.firstCall.args[0].properties.correlationId,
        messageAnnotations: {
          status: 200
        },
        data: undefined
      });
    });

    it('sends a message with a correlation id that is a uuid', function (testCallback) {
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        twinClient.disableTwinDesiredPropertiesUpdates(function () {});
        assert.isString(fakeSenderLink.send.secondCall.args[0].properties.correlationId);
        testCallback();
      });
      fakeReceiverLink.emit('message', {
        correlationId: fakeSenderLink.send.firstCall.args[0].properties.correlationId,
        messageAnnotations: {
          status: 200
        },
        data: undefined
      });
    });

    it('sends a message with an empty body', function (testCallback) {
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        twinClient.disableTwinDesiredPropertiesUpdates(function () {});
        assert.strictEqual(fakeSenderLink.send.firstCall.args[0].body, ' ');
        testCallback();
      });
      fakeReceiverLink.emit('message', {
        correlationId: fakeSenderLink.send.firstCall.args[0].properties.correlationId,
        messageAnnotations: {
          status: 200
        },
        data: undefined
      });
    });
  });

  describe('#detach', function () {
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_004: [The `detach` method shall call its `callback` immediately if the links are already detached.]*/
    it('calls its callback immediately if not already connected', function (testCallback) {
      twinClient.detach(function () {
        assert.isTrue(fakeAmqpClient.attachSenderLink.notCalled);
        assert.isTrue(fakeAmqpClient.attachReceiverLink.notCalled);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_005: [The `detach` method shall detach the links and call its `callback` with no arguments if the links are successfully detached.]*/
    it('calls its callback after detaching both links', function (testCallback) {
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        assert.isTrue(fakeAmqpClient.attachSenderLink.calledOnce);
        assert.isTrue(fakeAmqpClient.attachReceiverLink.calledOnce);
        twinClient.detach(function () {
          assert.isTrue(fakeAmqpClient.detachSenderLink.calledOnce);
          assert.isTrue(fakeAmqpClient.detachReceiverLink.calledOnce);
          testCallback();
        });
      });
      fakeReceiverLink.emit('message', {
        correlationId: fakeSenderLink.send.firstCall.args[0].properties.correlationId,
        messageAnnotations: {
          status: 200
        },
        data: undefined
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_006: [The `detach` method shall call its `callback` with an `Error` if detaching either of the links fail.]*/
    it('calls its callback with an error if detaching the sender link fails', function (testCallback) {
      var fakeError = new Error('fake');
      fakeAmqpClient.detachSenderLink = sinon.stub().callsArgWith(1, fakeError);
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        assert.isTrue(fakeAmqpClient.attachSenderLink.calledOnce);
        assert.isTrue(fakeAmqpClient.attachReceiverLink.calledOnce);
        twinClient.detach(function (err) {
          assert.isTrue(fakeAmqpClient.detachSenderLink.calledOnce);
          assert.isTrue(fakeAmqpClient.detachReceiverLink.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });
      fakeReceiverLink.emit('message', {
        correlationId: fakeSenderLink.send.firstCall.args[0].properties.correlationId,
        messageAnnotations: {
          status: 200
        },
        data: undefined
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_006: [The `detach` method shall call its `callback` with an `Error` if detaching either of the links fail.]*/
    it('calls its callback with an error if detaching the receiver link fails', function (testCallback) {
      var fakeError = new Error('fake');
      fakeAmqpClient.detachReceiverLink = sinon.stub().callsArgWith(1, fakeError);
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        assert.isTrue(fakeAmqpClient.attachSenderLink.calledOnce);
        assert.isTrue(fakeAmqpClient.attachReceiverLink.calledOnce);
        twinClient.detach(function (err) {
          assert.isTrue(fakeAmqpClient.detachSenderLink.calledOnce);
          assert.isTrue(fakeAmqpClient.detachReceiverLink.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });
      fakeReceiverLink.emit('message', {
        correlationId: fakeSenderLink.send.firstCall.args[0].properties.correlationId,
        messageAnnotations: {
          status: 200
        },
        data: undefined
      });
    });
  });

  describe('#events', function () {
    describe('twinDesiredPropertiesUpdate', function () {
      it('emits a twinDesiredPropertiesUpdate event if a desired properties patch is received', function (testCallback) {
        var desiredPropDelta = {
          fake: 'patch'
        };
        twinClient.on('twinDesiredPropertiesUpdate', function (delta) {
          assert.deepEqual(delta, desiredPropDelta);
          testCallback();
        });

        twinClient.enableTwinDesiredPropertiesUpdates(function () {
          fakeReceiverLink.emit('message', {
            data: JSON.stringify(desiredPropDelta)
          });
        });
        fakeReceiverLink.emit('message', {
          correlationId: fakeSenderLink.send.firstCall.args[0].properties.correlationId,
          messageAnnotations: {
            status: 200
          },
          data: undefined
        });
      });

      it('ignores a message that has no correlationId and no data', function () {
        twinClient.on('twinDesiredPropertiesUpdate', function (delta) {
          assert.fail();
        });
        twinClient.on('error', function (delta) {
          assert.fail();
        });

        twinClient.enableTwinDesiredPropertiesUpdates(function () {
          fakeReceiverLink.emit('message', {});
        });
        fakeReceiverLink.emit('message', {
          correlationId: fakeSenderLink.send.firstCall.args[0].properties.correlationId,
          messageAnnotations: {
            status: 200
          },
          data: undefined
        });
      })
    });

    describe('error', function () {
      it('detaches the links and emits an error if an error is received on the sender link', function (testCallback) {
        var fakeError = new Error('fake');
        twinClient.on('error', function (err) {
          assert.strictEqual(err, fakeError);
          assert.isTrue(fakeAmqpClient.detachSenderLink.calledOnce);
          assert.isTrue(fakeAmqpClient.detachReceiverLink.calledOnce);
          testCallback();
        })
        twinClient.enableTwinDesiredPropertiesUpdates(function () {
          fakeSenderLink.emit('error', fakeError);
        });
        fakeReceiverLink.emit('message', {
          correlationId: fakeSenderLink.send.firstCall.args[0].properties.correlationId,
          messageAnnotations: {
            status: 200
          },
          data: undefined
        });
      });

      it('detaches the links and emits an error if an error is received on the receiver link', function (testCallback) {
        var fakeError = new Error('fake');
        twinClient.on('error', function (err) {
          assert.strictEqual(err, fakeError);
          assert.isTrue(fakeAmqpClient.detachSenderLink.calledOnce);
          assert.isTrue(fakeAmqpClient.detachReceiverLink.calledOnce);
          testCallback();
        })
        twinClient.enableTwinDesiredPropertiesUpdates(function () {
          fakeReceiverLink.emit('error', fakeError);
        });
        fakeReceiverLink.emit('message', {
          correlationId: fakeSenderLink.send.firstCall.args[0].properties.correlationId,
          messageAnnotations: {
            status: 200
          },
          data: undefined
        });
      });
    });
  });
});
