/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */

'use strict';

import { Properties } from './properties';

/**
 * @class     module:azure-iot-common.Message
 * @classdesc The Message object is used for telemetry (device-to-cloud) and commands (cloud-to-device) asynchronous
 *            messaging between the device and the IoT Hub service. It is transport-agnostic, meaning it works the same way over AMQP, MQTT and HTTP.
 *
 * @instance {Properties} properties      A map containing string
 *                                        keys and values for storing
 *                                        custom message properties.
 * @instance {string}     messageId       Used to correlate two-way
 *                                        communication.
 *                                        Format: A case-sensitive string
 *                                        (up to 128 char long) of ASCII
 *                                        7-bit alphanumeric chars and the
 *                                        following special symbols:
 *                                        <br/>`- : . + % _ # * ? ! ( ) , = @ ; $ '`
 * @instance {string}     to              Destination of the message
 * @instance {Date}       expiryTimeUtc   Expiry time in UTC interpreted by hub on
 *                                        C2D messages. Ignored in other cases.
 * @instance {string}     lockToken       Used by receiver to Abandon, Reject or
 *                                        Complete the message
 * @instance {string}     correlationId   Used in message responses and feedback
 * @instance {string}     userId          Used to specify the entity creating the
 *                                        message
 * @instance {string}     ack             Type of feedback requested (in case of cloud-to-device command)
 * @see {@link https://nodejs.org/api/globals.html#globals_class_buffer|Buffer}
 */
export class Message {
  data: any;
  properties: Properties;
  messageId: string;
  to: string;
  expiryTimeUtc: any;
  lockToken: string;
  correlationId: string;
  userId: string;
  ack: string;

  /**
   * @private
   */
  transportObj: any;

  /**
   * Creates a new {@link Message} object
   * @constructor
   * @param data a Node [Buffer]{@linkcode https://nodejs.org/api/globals.html#globals_class_buffer}
   *             object or anything that can be passed to the [Buffer]{@linkcode https://nodejs.org/api/globals.html#globals_class_buffer} constructor
   *             to construct a [Buffer]{@linkcode https://nodejs.org/api/globals.html#globals_class_buffer} from.
   */
  /*Codes_SRS_NODE_IOTHUB_MESSAGE_07_004: [The Message constructor shall accept a variable message that will be transmitted.]*/
  constructor(data: Message.BufferConvertible) {
    this.data = data;

    this.properties = new Properties();
    this.messageId = '';
    this.to = '';
    this.expiryTimeUtc = undefined;
    this.lockToken = '';
    this.correlationId = '';
    this.userId = '';
  }

  /**
   * Gets the content (body) of the {@link Message}.
   *
   * @returns {*} The content of the {@link Message}.
   */
  getData(): Message.BufferConvertible {
    /*Codes_SRS_NODE_IOTHUB_MESSAGE_07_003: [The getData function shall return a representation of the body of the message as the type that was presented during construction.]*/
    return this.data;
  };

  /**
   * Gets the data passed to the constructor as a [Buffer]{@linkcode https://nodejs.org/api/globals.html#globals_class_buffer}
   *
   * @returns {Buffer}
   */
  getBytes(): Buffer {
    if (Buffer.isBuffer(this.data) ) {
      /*Codes_SRS_NODE_IOTHUB_MESSAGE_07_001: [If the data message that is store is of type Buffer then the data object will get returned unaltered.]*/
      return this.data;
    } else {
      /*Codes_SRS_NODE_IOTHUB_MESSAGE_07_002: [If the data message is of any other type then the data will be converted to a Buffer object and returned.]*/
      return new Buffer(this.data);
    }
  };

}

export namespace Message {
  export type BufferConvertible = Buffer | String | any[] | ArrayBuffer;

}
