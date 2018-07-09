// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var EventEmitter = require('events').EventEmitter;
var sinon = require('sinon');
var rhea = require('rhea');


var AmqpTwinClient = require('../lib/amqp_twin_client.js').AmqpTwinClient;
var errors = require('azure-iot-common').errors;
var endpoint = require('azure-iot-common').endpoint;

describe('AmqpTwinClient', function () {

  var fakeConfig, fakeAuthenticationProvider, fakeAmqpClient, fakeSenderLink, fakeReceiverLink, twinClient;

  beforeEach(function () {
    fakeAuthenticationProvider = {
      getDeviceCredentials: sinon.stub().callsArgWith(0, null, fakeConfig)
    };

    fakeConfig = {
      deviceId: 'deviceId'
    };

    fakeSenderLink = new EventEmitter();
      fakeSenderLink.send = sinon.stub().callsArg(1);

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

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_007: [The endpoint argument for attachReceiverLink shall be `/devices/<deviceId>/twin`.] */
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_06_009: [The endpoint argument for attachSenderLink shall be `/devices/<deviceId>/twin`.] */
    it('attaches sender and receiver links to the `/devices/<deviceId>/twin` endpoint.', function() {
      methodUnderTest();
      assert.strictEqual(fakeAmqpClient.attachSenderLink.firstCall.args[0],'/devices/' + fakeConfig.deviceId + '/twin');
      assert.strictEqual(fakeAmqpClient.attachReceiverLink.firstCall.args[0],'/devices/' + fakeConfig.deviceId + '/twin');
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_18_001: [If a `moduleId` value was set in the device's connection string, the endpoint argument for `attachReceiverLink` shall be `/devices/<deviceId>/modules/<moduleId>/twin`]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_18_002: [If a `moduleId` value was set in the device's connection string, the endpoint argument for `attachSenderLink` shall be `/device/<deviceId>/modules/<moduleId>/twin`.]*/
    it('attaches sender and receiver links to the `/devices/<deviceId>/modules/<moduleId>/twin` endpoint when there\'s a moduleId', function() {
      fakeConfig.moduleId = "fakeModuleId";
      fakeAuthenticationProvider = {
        getDeviceCredentials: sinon.stub().callsArgWith(0, null, fakeConfig)
      };
      twinClient = new AmqpTwinClient(fakeAuthenticationProvider, fakeAmqpClient);
      methodUnderTest();
      assert.strictEqual(fakeAmqpClient.attachSenderLink.firstCall.args[0],'/devices/' + fakeConfig.deviceId + '/modules/' + fakeConfig.moduleId + '/twin');
      assert.strictEqual(fakeAmqpClient.attachReceiverLink.firstCall.args[0],'/devices/' + fakeConfig.deviceId + '/modules/' + fakeConfig.moduleId + '/twin');
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
      assert.equal(senderLinkOptions.snd_settle_mode, 1, ' sender send settle mode not set appropriately' );
      assert.equal(senderLinkOptions.rcv_settle_mode, 0, ' sender rcv settle mode not set appropriately' );
      assert.equal(receiverLinkOptions.snd_settle_mode, 1, ' receiver send settle mode not set appropriately' );
      assert.equal(receiverLinkOptions.rcv_settle_mode, 0, ' receiver rcv settle mode not set appropriately' );
      assert.equal(senderLinkOptions.properties['com.microsoft:api-version'], endpoint.apiVersion, ' sender api version not set appropriately');
      assert.equal(receiverLinkOptions.properties['com.microsoft:api-version'], endpoint.apiVersion, ' receiver api version not set appropriately');
      /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_036: [The same correlationId shall be used for both the sender and receiver links.]*/
      assert.equal(receiverLinkOptions.properties['com.microsoft:channel-correlation-id'], senderLinkOptions.properties['com.microsoft:channel-correlation-id'], ' send and receiver correlation not equal');
      assert(receiverLinkOptions.properties['com.microsoft:channel-correlation-id'].length, 41); // 32 hex digits + 4 dashes + twin:
      assert(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(senderLinkOptions.properties['com.microsoft:channel-correlation-id'].substr(5, 36)), 'correlationId does not contains a uuid');
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
      assert.strictEqual(amqpMessage.message_annotations.operation, 'GET');
      assert.isUndefined(amqpMessage.message_annotations.resource);
      assert.isString(amqpMessage.correlation_id);
      assert.strictEqual(amqpMessage.body.content.toString(), ' ');
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
        message_annotations: {
          status: 200
        },
        correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
        body: rhea.message.data_section(new Buffer(JSON.stringify(fakeTwin)))
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_038: [The `getTwin` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the `status` message annotation is `> 300`.]*/
    it('parses a response containing an error and translates it', function (testCallback) {
      twinClient.getTwin(function (err) {
        assert.instanceOf(err, Error);
        testCallback();
      });

      fakeReceiverLink.emit('message', {
        correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
        message_annotations: {
          status: 400
        },
        body: rhea.message.data_section(JSON.stringify({
          message: 'fake message',
          errorCode: 400
        }))
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
      assert.strictEqual(amqpMessage.message_annotations.operation, 'PATCH');
      assert.strictEqual(amqpMessage.message_annotations.resource, '/properties/reported');
      assert.isString(amqpMessage.correlation_id);
      assert.strictEqual(amqpMessage.body.content.toString(), JSON.stringify(fakePatch));
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_039: [The `updateTwinReportedProperties` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the `status` message annotation is `> 300`.]*/
    it('parses a response containing an error and translates it', function (testCallback) {
      twinClient.updateTwinReportedProperties({ fake: 'patch' }, function (err) {
        assert.instanceOf(err, Error);
        testCallback();
      });

      fakeReceiverLink.emit('message', {
        correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
        message_annotations: {
          status: 400
        },
        body: rhea.message.data_section(JSON.stringify({
          message: 'fake message',
          errorCode: 400
        }))
      });
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
      assert.strictEqual(amqpMessage.message_annotations.operation, 'PUT');
      assert.strictEqual(amqpMessage.message_annotations.resource, '/notifications/twin/properties/desired');
      assert.isString(amqpMessage.correlation_id);
      assert.strictEqual(amqpMessage.body.content.toString(), ' ');
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_040: [The `enableTwinDesiredPropertiesUpdates` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the status message annotation is `> 300`.]*/
    it('parses a response containing an error and translates it', function (testCallback) {
      twinClient.enableTwinDesiredPropertiesUpdates(function (err) {
        assert.instanceOf(err, Error);
        testCallback();
      });

      fakeReceiverLink.emit('message', {
        correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
        message_annotations: {
          status: 400
        },
        body: rhea.message.data_section(JSON.stringify({
          message: 'fake message',
          errorCode: 400
        }))
      });
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
        assert.strictEqual(fakeSenderLink.send.secondCall.args[0].message_annotations.operation, 'DELETE');
        testCallback();
      });

      fakeReceiverLink.emit('message', {
        correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
        message_annotations: {
          status: 200
        },
        body: undefined
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
        correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
        message_annotations: {
          status: 200
        },
        data: undefined
      });
    });

    it('sends a message with the resource annotation set to /notifications/twin/properties/desired', function (testCallback) {
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        twinClient.disableTwinDesiredPropertiesUpdates(function () {});
        assert.strictEqual(fakeSenderLink.send.firstCall.args[0].message_annotations.resource, '/notifications/twin/properties/desired');
        testCallback();
      });
      fakeReceiverLink.emit('message', {
        correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
        message_annotations: {
          status: 200
        },
        data: undefined
      });
    });

    it('sends a message with a correlation id that is a uuid', function (testCallback) {
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        twinClient.disableTwinDesiredPropertiesUpdates(function () {});
        assert.isString(fakeSenderLink.send.secondCall.args[0].correlation_id);
        testCallback();
      });
      fakeReceiverLink.emit('message', {
        correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
        message_annotations: {
          status: 200
        },
        data: undefined
      });
    });

    it('sends a message with an empty body', function (testCallback) {
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        twinClient.disableTwinDesiredPropertiesUpdates(function () {});
        assert.strictEqual(fakeSenderLink.send.firstCall.args[0].body.content.toString(), ' ');
        testCallback();
      });
      fakeReceiverLink.emit('message', {
        correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
        message_annotations: {
          status: 200
        },
        data: undefined
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_041: [The `disableTwinDesiredPropertiesUpdates` method shall call its callback with a translated error according to the table described in **SRS_NODE_DEVICE_AMQP_TWIN_16_037** if the status message annotation is `> 300`.]*/
    it('parses a response containing an error and translates it', function (testCallback) {
      twinClient.enableTwinDesiredPropertiesUpdates(function () {
        twinClient.disableTwinDesiredPropertiesUpdates(function (err) {
          assert.instanceOf(err, Error);
          testCallback();
        });

        fakeReceiverLink.emit('message', {
          correlation_id: fakeSenderLink.send.secondCall.args[0].correlation_id,
          message_annotations: {
            status: 400
          },
          body: rhea.message.data_section(JSON.stringify({
            message: 'fake message',
            errorCode: 400
          }))
        });
      });
      fakeReceiverLink.emit('message', {
        correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
        message_annotations: {
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
        correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
        message_annotations: {
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
        correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
        message_annotations: {
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
        correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
        message_annotations: {
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
            body: rhea.message.data_section(JSON.stringify(desiredPropDelta))
          });
        });
        fakeReceiverLink.emit('message', {
          correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
          message_annotations: {
            status: 200
          },
          body: undefined
        });
      });

      it('ignores a message that has no correlationId and no data', function () {
        twinClient.on('twinDesiredPropertiesUpdate', function () {
          assert.fail();
        });
        twinClient.on('error', function () {
          assert.fail();
        });

        twinClient.enableTwinDesiredPropertiesUpdates(function () {
          fakeReceiverLink.emit('message', {});
        });
        fakeReceiverLink.emit('message', {
          correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
          message_annotations: {
            status: 200
          },
          data: undefined
        });
      });
    });

    describe('error', function () {
      it('detaches the links and emits an error if an error is received on the sender link', function (testCallback) {
        var fakeError = new Error('fake');
        twinClient.on('error', function (err) {
          assert.strictEqual(err, fakeError);
          assert.isTrue(fakeAmqpClient.detachSenderLink.calledOnce);
          assert.isTrue(fakeAmqpClient.detachReceiverLink.calledOnce);
          testCallback();
        });
        twinClient.enableTwinDesiredPropertiesUpdates(function () {
          fakeSenderLink.emit('error', fakeError);
        });
        fakeReceiverLink.emit('message', {
          correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
          message_annotations: {
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
        });
        twinClient.enableTwinDesiredPropertiesUpdates(function () {
          fakeReceiverLink.emit('error', fakeError);
        });
        fakeReceiverLink.emit('message', {
          correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
          message_annotations: {
            status: 200
          },
          data: undefined
        });
      });
    });
  });

  describe('error translation', function () {
    /*Tests_SRS_NODE_DEVICE_AMQP_TWIN_16_037: [The responses containing errors received on the receiver link shall be translated according to the following table:
      | statusCode | ErrorType               |
      | ---------- | ------------------------|
      | 400        | FormatError             |
      | 401        | UnauthorizedError       |
      | 403        | InvalidOperationError   |
      | 404        | DeviceNotFoundError     |
      | 429        | ThrottlingError         |
      | 500        | InternalServerError     |
      | 503        | ServiceUnavailableError |
      | 504        | TimeoutError            |
      | others     | TwinRequestError        |
    ]*/
    [
      { statusCode: 400, expectedErrorType: errors.FormatError },
      { statusCode: 401, expectedErrorType: errors.UnauthorizedError },
      { statusCode: 403, expectedErrorType: errors.InvalidOperationError },
      { statusCode: 404, expectedErrorType: errors.DeviceNotFoundError },
      { statusCode: 429, expectedErrorType: errors.ThrottlingError },
      { statusCode: 500, expectedErrorType: errors.InternalServerError },
      { statusCode: 503, expectedErrorType: errors.ServiceUnavailableError },
      { statusCode: 504, expectedErrorType: errors.TimeoutError },
      { statusCode: 999, expectedErrorType: errors.TwinRequestError }
    ].forEach(function (testConfig) {
      it('translates an response with a status of ' + testConfig.statusCode + ' to a ' + testConfig.expectedErrorType.name, function (testCallback) {
        twinClient.getTwin(function (err) {
          assert.instanceOf(err, testConfig.expectedErrorType);
          testCallback();
        });

        fakeReceiverLink.emit('message', {
          correlation_id: fakeSenderLink.send.firstCall.args[0].correlation_id,
          message_annotations: {
            status: testConfig.statusCode
          },
          body: rhea.message.data_section(JSON.stringify({
            message: 'fake message',
            errorCode: testConfig.statusCode
          }))
        });
      });
    });
  });
});
