// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Message } from 'azure-iot-common';
import * as amqp10 from 'amqp10';

function encodeUuid(uuidString: string): any {
  const uuidRegEx = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  let uuid;
  if (typeof uuidString === 'string' && uuidString.match(uuidRegEx)) {
    uuid = (<any>amqp10).Type.uuid(uuidString);
  } else {
    uuid = uuidString;
  }
  return uuid;
}

/**
 * @class           module:azure-iot-amqp-base.AmqpMessage
 * @classdesc       AMQP-specific message class used to prepare a [azure-iot-common.Message]{@link module:azure-iot-common.Message}
 *                  before it's sent over the wire using the AMQP protocol.
 */
export class AmqpMessage {
  properties: {
    to?: string;
    absoluteExpiryTime?: Date;
    messageId?: string;
    correlationId?: string;
    reply_to?: string;
  };

  body: any;
  applicationProperties: {
    [key: string]: any
  };

  /**
   * @method          module:azure-iot-amqp-base.AmqpMessage.fromMessage
   * @description     Takes a azure-iot-common.Message{@link module:azure-iot-common.Message} object and creates an AMQP message from it.
   *
   * @param {module:azure-iot-common.Message}   message   The {@linkcode Message} object from which to create an AMQP message.
   */
  static fromMessage (message: Message): AmqpMessage {
    if (!message) throw new ReferenceError('message is \'' + message + '\'');

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_05_001: [The fromMessage method shall create a new instance of AmqpMessage.]*/
    let amqpMessage = new AmqpMessage();
    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_05_002: [The created AmqpMessage object shall have a property of type Object named properties.]*/
    amqpMessage.properties = {};

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_05_003: [If the message argument has a to property, the properties property of the AmqpMessage object shall have a property named to with the same value.]*/
    if (message.to) {
      amqpMessage.properties.to = message.to;
    }
    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_05_004: [If the message argument has an expiryTimeUtc property, the properties property of the AmqpMessage object shall have a property named absoluteExpiryTime with the same value.]*/
    if (message.expiryTimeUtc) {
      amqpMessage.properties.absoluteExpiryTime = message.expiryTimeUtc;
    }

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_05_007: [If the message argument has a messageId property, the properties property of the AmqpMessage object shall have a property named messageId with the same value.]*/
    if (message.messageId) {
      amqpMessage.properties.messageId = encodeUuid(message.messageId);
    }

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_16_010: [If the `message` argument has a `correlationId` property, the `properties` property of the `AmqpMessage` object shall have a property named `correlationId` with the same value.]*/
    if (message.correlationId) {
      /*Codes_SRS_NODE_IOTHUB_AMQPMSG_16_012: [If the `Message.correlationId` property is a UUID, the AMQP type of the `AmqpMessage.properties.correlationId` property shall be forced to UUID.]*/
      amqpMessage.properties.correlationId = encodeUuid(message.correlationId);
    }

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_05_008: [If needed, the created AmqpMessage object shall have a property of type Object named applicationProperties.]*/
    function ensureApplicationPropertiesCreated(): void {
      if (!amqpMessage.applicationProperties) {
        amqpMessage.applicationProperties = {};
      }
    }

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_05_009: [If the message argument has an ack property, the applicationProperties property of the AmqpMessage object shall have a property named iothub-ack with the same value.]*/
    if (message.ack) {
      ensureApplicationPropertiesCreated();
      amqpMessage.applicationProperties['iothub-ack'] = message.ack;
    }

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_13_001: [ If message.properties is truthy, then all the properties in it shall be copied to the applicationProperties property of the AmqpMessage object. ]*/
    if (message.properties) {
      const props = message.properties;
      const propsCount = props.count();
      if (propsCount > 0) {
        if (!amqpMessage.applicationProperties) {
          ensureApplicationPropertiesCreated();
        }
        for (let index = 0; index < propsCount; index++) {
          const item = props.getItem(index);
          if (!!item) {
            /*Codes_SRS_NODE_IOTHUB_AMQPMSG_16_013: [If one of the property key is `IoThub-status`, this property is reserved and shall be forced to an `int` AMQP type.]*/
            const val = (item.key === 'IoThub-status') ? (<any>amqp10).Type.int(item.value) : item.value;
            amqpMessage.applicationProperties[item.key] = val;
          }
        }
      }
    }

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_05_005: [If message.getData() is truthy, the AmqpMessage object shall have a property named body with the value returned from message.getData().]*/
    const body = message.getData();
    if (body !== undefined) {
      amqpMessage.body = body;
    }

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_05_006: [The generated AmqpMessage object shall be returned to the caller.]*/
    return amqpMessage;
  }

  /**
   * @method          module:azure-iot-amqp-base.AmqpMessage.toMessage
   * @description     Creates a transport-agnostic azure-iot-common.Message{@link module:azure-iot-common.Message} object from transport-specific AMQP message.
   *
   * @param {AmqpMessage}   message   The {@linkcode AmqpMessage} object from which to create an Message.
   */
  static toMessage(amqpMessage: AmqpMessage): Message {
    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_16_001: [The `toMessage` method shall throw if the `amqpMessage` argument is falsy.]*/
    if (!amqpMessage) {
      throw new ReferenceError('amqpMessage cannot be \'' + amqpMessage + '\'');
    }

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_16_009: [The `toMessage` method shall set the `Message.data` of the message to the content of the `AmqpMessage.body` property.]*/
    let msg = new Message(amqpMessage.body);

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_16_005: [The `toMessage` method shall set the `Message.to` property to the `AmqpMessage.properties.to` value if it is present.]*/
    if (amqpMessage.properties.to) {
      msg.to = amqpMessage.properties.to;
    }

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_16_006: [The `toMessage` method shall set the `Message.expiryTimeUtc` property to the `AmqpMessage.properties.absoluteExpiryTime` value if it is present.]*/
    if (amqpMessage.properties.absoluteExpiryTime) {
      msg.expiryTimeUtc = amqpMessage.properties.absoluteExpiryTime;
    }

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_16_004: [The `toMessage` method shall set the `Message.messageId` property to the `AmqpMessage.properties.messageId` value if it is present.]*/
    if (amqpMessage.properties.messageId) {
      msg.messageId = amqpMessage.properties.messageId;
    }

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_16_003: [The `toMessage` method shall set the `Message.correlationId` property to the `AmqpMessage.properties.correlationId` value if it is present.]*/
    if (amqpMessage.properties.correlationId) {
      msg.correlationId = amqpMessage.properties.correlationId;
    }

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_16_007: [The `toMessage` method shall convert the user-defined `AmqpMessage.applicationProperties` to a `Properties` collection stored in `Message.applicationProperties`.]*/
    if (amqpMessage.applicationProperties) {
      const appProps = amqpMessage.applicationProperties;
      for (let key in appProps) {
        if (appProps.hasOwnProperty(key)) {
          /*Codes_SRS_NODE_IOTHUB_AMQPMSG_16_008: [The `toMessage` method shall set the `Message.ack` property to the `AmqpMessage.applicationProperties['iothub-ack']` value if it is present.]*/
          if (key === 'iothub-ack') {
            msg.ack = appProps[key];
          } else {
            msg.properties.add(key, appProps[key]);
          }
        }
      }
    }

    msg.transportObj = amqpMessage;

    /*Codes_SRS_NODE_IOTHUB_AMQPMSG_16_002: [The `toMessage` method shall return a `Message` object.]*/
    return msg;
  }
}
