// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var Message = require('azure-iot-common').Message;
var AmqpMessage = require('../lib/amqp_message.js').AmqpMessage;
var uuid = require('uuid');

describe('AmqpMessage', function () {
  describe('#fromMessage', function () {
    it('throws if message is falsy', function () {
      assert.throws(function () {
        AmqpMessage.fromMessage(null);
      }, ReferenceError, 'message is \'null\'');
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_001: [The fromMessage method shall create a new instance of AmqpMessage.]*/
    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_006: [The generated AmqpMessage object shall be returned to the caller.]*/
    it('creates an AmqpMessage object', function () {
      var amqpMessage = AmqpMessage.fromMessage(new Message());
      assert.instanceOf(amqpMessage, AmqpMessage);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_002: [The created AmqpMessage object shall have a property of type Object named properties.]*/
    it('always creates a properties object on the AmqpMessage object', function () {
      var amqpMessage = AmqpMessage.fromMessage(new Message());
      assert.property(amqpMessage, 'properties');
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_003: [If the message argument has a to property, the properties property of the AmqpMessage object shall have a property named to with the same value.]*/
    it('maps message.to to amqpMessage.properties.to', function () {
      var to = 'destination';
      var message = new Message();
      message.to = to;
      var amqpMessage = AmqpMessage.fromMessage(message);
      assert.equal(amqpMessage.properties.to, to);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_003: [If the message argument has a to property, the properties property of the AmqpMessage object shall have a property named to with the same value.]*/
    it('does not set amqpMessage.properties.to if message.to isn\'t set', function () {
      var amqpMessage = AmqpMessage.fromMessage(new Message());
      assert.notDeepProperty(amqpMessage, 'properties.to');
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_004: [If the message argument has an expiryTimeUtc property, the properties property of the AmqpMessage object shall have a property named absoluteExpiryTime with the same value.]*/
    it('maps message.expiryTimeUtc to amqpMessage.properties.absoluteExpiryTime', function () {
      var ts = Date.now() + 60000; // one minute from now
      var message = new Message();
      message.expiryTimeUtc = ts;
      var amqpMessage = AmqpMessage.fromMessage(message);
      assert.equal(amqpMessage.properties.absoluteExpiryTime, ts);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_004: [If the message argument has an expiryTimeUtc property, the properties property of the AmqpMessage object shall have a property named absoluteExpiryTime with the same value.]*/
    it('does not set amqpMessage.properties.absoluteExpiryTime if message.expiryTimeUtc isn\'t set', function () {
      var amqpMessage = AmqpMessage.fromMessage(new Message());
      assert.notDeepProperty(amqpMessage, 'properties.absoluteExpiryTime');
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_007: [If the message argument has a messageId property, the properties property of the AmqpMessage object shall have a property named messageId with the same value.]*/
    it('maps message.messageId to amqpMessage.properties.messageId', function () {
      var messageId = '123';
      var message = new Message();
      message.messageId = messageId;
      var amqpMessage = AmqpMessage.fromMessage(message);
      assert.equal(amqpMessage.properties.messageId, messageId);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_16_011: [If the `Message.messageId` property is a UUID, the AMQP type of the `AmqpMessage.properties.messageId` property shall be forced to UUID.]*/
    it('Forces the messageId type to UUID if it actually is a uuid', function() {
      var messageId = uuid.v4();
      var message = new Message();
      message.messageId = messageId;
      var amqpMessage = AmqpMessage.fromMessage(message);
      assert.strictEqual(amqpMessage.properties.messageId.typeName, 'uuid');
      assert.strictEqual(amqpMessage.properties.messageId.value, messageId);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_16_010: [If the `message` argument has a `correlationId` property, the `properties` property of the `AmqpMessage` object shall have a property named `correlationId` with the same value.]*/
    it('maps message.correlationId to amqpMessage.properties.correlationId', function () {
      var correlationId = '123';
      var message = new Message();
      message.correlationId = correlationId;
      var amqpMessage = AmqpMessage.fromMessage(message);
      assert.equal(amqpMessage.properties.correlationId, correlationId);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_16_012: [If the `Message.correlationId` property is a UUID, the AMQP type of the `AmqpMessage.properties.correlationId` property shall be forced to UUID.]*/
    it('Forces the correlationId type to UUID if it actually is a uuid', function() {
      var correlationId = uuid.v4();
      var message = new Message();
      message.correlationId = correlationId;
      var amqpMessage = AmqpMessage.fromMessage(message);
      assert.equal(amqpMessage.properties.correlationId.typeName, 'uuid');
      assert.strictEqual(amqpMessage.properties.correlationId.value, correlationId);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_007: [If the message argument has a messageId property, the properties property of the AmqpMessage object shall have a property named messageId with the same value.]*/
    it('does not set amqpMessage.properties.messageId if message.messageId isn\'t set', function () {
      var amqpMessage = AmqpMessage.fromMessage(new Message());
      assert.notDeepProperty(amqpMessage, 'properties.messageId');
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_008: [If needed, the created AmqpMessage object shall have a property of type Object named applicationProperties.]*/
    it('does not create amqpMessage.applicationProperties object if the are no application properties', function () {
      var amqpMessage = AmqpMessage.fromMessage(new Message());
      assert.notProperty(amqpMessage, 'applicationProperties');
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_008: [If needed, the created AmqpMessage object shall have a property of type Object named applicationProperties.]*/
    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_009: [If the message argument has an ack property, the applicationProperties property of the AmqpMessage object shall have a property named iothub-ack with the same value.]*/
    it('maps message.ack to amqpMessage.applicationProperties[\'iothub-ack\']', function () {
      var ack = 'full';
      var message = new Message();
      message.ack = ack;
      var amqpMessage = AmqpMessage.fromMessage(message);
      assert.equal(amqpMessage.applicationProperties['iothub-ack'], ack);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_13_001: [ If message.properties is truthy, then all the properties in it shall be copied to the applicationProperties property of the AmqpMessage object. ]*/
    it('copies message.properties to amqpMessage.applicationProperties', function () {
      var message = new Message();
      var keyItem = '';
      var valueItem = '';
      var numProps = 10;
      var i;

      for (i = 0; i < numProps; i++) {
        keyItem = "itemKey" + (i + 1);
        valueItem = "itemValue" + (i + 1);
        message.properties.add(keyItem, valueItem);
      }

      var amqpMessage = AmqpMessage.fromMessage(message);
      assert.isOk(amqpMessage.applicationProperties);

      for (i = 0; i < numProps; i++) {
        keyItem = "itemKey" + (i + 1);
        valueItem = "itemValue" + (i + 1);
        assert.property(amqpMessage.applicationProperties, keyItem);
        assert.strictEqual(amqpMessage.applicationProperties[keyItem], valueItem);
      }
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_16_013: [If one of the property key is `IoThub-status`, this property is reserved and shall be forced to an `int` AMQP type.]*/
    it('forces the IoThub-status property encoding to \'int\' if it exists', function() {
      var message = new Message();
      var statusKey = 'IoThub-status';
      var statusValue = 42;
      message.properties.add(statusKey, statusValue);

      var amqpMessage = AmqpMessage.fromMessage(message);
      assert.strictEqual(amqpMessage.applicationProperties[statusKey].typeName, 'int');
      assert.strictEqual(amqpMessage.applicationProperties[statusKey].value, statusValue);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_13_001: [ If message.properties is truthy, then all the properties in it shall be copied to the applicationProperties property of the AmqpMessage object. ]*/
    it('does not create amqpMessage.applicationProperties when there are no properties', function () {
      var message = new Message();
      var amqpMessage = AmqpMessage.fromMessage(message);
      assert.isNotOk(amqpMessage.applicationProperties);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_009: [If the message argument has an ack property, the applicationProperties property of the AmqpMessage object shall have a property named iothub-ack with the same value.]*/
    it('does not set amqpMessage.applicationProperties[\'iothub-ack\'] if message.ack isn\'t set', function () {
      var amqpMessage = AmqpMessage.fromMessage(new Message());
      assert.notDeepProperty(amqpMessage, 'applicationProperties.iothub-ack');
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_005: [If message.getData() is truthy, the AmqpMessage object shall have a property named body with the value returned from message.getData().]*/
    it('copies Message body', function () {
      var body = 'hello';
      var message = new Message(body);
      var amqpMessage = AmqpMessage.fromMessage(message);
      assert.equal(amqpMessage.body, body);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_05_005: [If message.getData() is truthy, the AmqpMessage object shall have a property named body with the value returned from message.getData().]*/
    it('does not set amqpMessage.body if message does not have a body', function () {
      var amqpMessage = AmqpMessage.fromMessage(new Message());
      assert.notProperty(amqpMessage, 'body');
    });
  });

  describe('#toMessage', function() {
    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_16_001: [The `toMessage` method shall throw if the `amqpMessage` argument is falsy.]*/
    [null, undefined, ''].forEach(function(badMsg) {
      it ('throws if amqpMessage is \'' + badMsg + '\'', function() {
        assert.throws(function() {
          return AmqpMessage.toMessage(badMsg);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_16_002: [The `toMessage` method shall return a `Message` object.]*/
    it('creates a Message object', function() {
      var testAmqpMessage = { properties: {} };
      assert.instanceOf(AmqpMessage.toMessage(testAmqpMessage), Message);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_16_003: [The `toMessage` method shall set the `Message.correlationId` property to the `AmqpMessage.properties.correlationId` value if it is present.]*/
    it('sets the correlationId property', function() {
      var testAmqpMessage = {
        properties: {
          correlationId: 'test'
        }
      };

      var convertedMessage = AmqpMessage.toMessage(testAmqpMessage);
      assert.strictEqual(convertedMessage.correlationId, testAmqpMessage.properties.correlationId);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_16_004: [The `toMessage` method shall set the `Message.messageId` property to the `AmqpMessage.properties.messageId` value if it is present.]*/
    it('sets the messageId property', function() {
      var testAmqpMessage = {
        properties: {
          messageId: 'test'
        }
      };

      var convertedMessage = AmqpMessage.toMessage(testAmqpMessage);
      assert.strictEqual(convertedMessage.messageId, testAmqpMessage.properties.messageId);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_16_005: [The `toMessage` method shall set the `Message.to` property to the `AmqpMessage.properties.to` value if it is present.]*/
    it('sets the to property', function() {
      var testAmqpMessage = {
        properties: {
          to: 'test'
        }
      };

      var convertedMessage = AmqpMessage.toMessage(testAmqpMessage);
      assert.strictEqual(convertedMessage.to, testAmqpMessage.properties.to);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_16_006: [The `toMessage` method shall set the `Message.expiryTimeUtc` property to the `AmqpMessage.properties.absoluteExpiryTime` value if it is present.]*/
    it('sets the absoluteExpiryTime property', function() {
      var testAmqpMessage = {
        properties: {
          absoluteExpiryTime: 'test'
        }
      };

      var convertedMessage = AmqpMessage.toMessage(testAmqpMessage);
      assert.strictEqual(convertedMessage.expiryTimeUtc, testAmqpMessage.properties.absoluteExpiryTime);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_16_008: [The `toMessage` method shall set the `Message.ack` property to the `AmqpMessage.applicationProperties['iothub-ack']` value if it is present.]*/
    it('sets the ack property', function() {
      var testAmqpMessage = {
        properties: {},
        applicationProperties: {
          'iothub-ack': 'test'
        }
      };

      var convertedMessage = AmqpMessage.toMessage(testAmqpMessage);
      assert.strictEqual(convertedMessage.ack, testAmqpMessage.applicationProperties['iothub-ack']);
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_16_007: [The `toMessage` method shall convert the user-defined `AmqpMessage.applicationProperties` to a `Properties` collection stored in `Message.applicationProperties`.]*/
    it('sets the custom properties', function() {
      var testAmqpMessage = {
        properties: {},
        applicationProperties: {
          k1: 'v1',
          k2: 'v2'
        }
      };

      var convertedMessage = AmqpMessage.toMessage(testAmqpMessage);
      assert.strictEqual(convertedMessage.properties.count(), 2);
      assert.strictEqual(convertedMessage.properties.getItem(0).key, 'k1');
      assert.strictEqual(convertedMessage.properties.getItem(0).value, 'v1');
      assert.strictEqual(convertedMessage.properties.getItem(1).key, 'k2');
      assert.strictEqual(convertedMessage.properties.getItem(1).value, 'v2');
    });

    /*Tests_SRS_NODE_IOTHUB_AMQPMSG_16_009: [The `toMessage` method shall set the `Message.data` of the message to the content of the `AmqpMessage.body` property.]*/
    it('sets the body of the message', function() {
      var testAmqpMessage = {
        properties: {},
        body: 'test'
      };

      var convertedMessage = AmqpMessage.toMessage(testAmqpMessage);
      assert.strictEqual(convertedMessage.data, testAmqpMessage.body);
    });
  });
});