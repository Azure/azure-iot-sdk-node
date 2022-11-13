/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */

'use strict';

import { Properties } from './properties';

const securityInterfaceId: string = 'urn:azureiot:Security:SecurityAgent:1';

/**
 * The {@link azure-iot-common.Message} object is used for telemetry (device-to-cloud) and commands (cloud-to-device) asynchronous
 * messaging between the device and the IoT Hub service. It is transport-agnostic, meaning it works the same way over AMQP, MQTT and HTTP.
 */
export class Message {
  data: any;
  /**
   * A map containing string keys and values for storing custom message properties.
   */
  properties: Properties;
  /**
   * Used to correlate two-way communication. Format: A case-sensitive string (up to 128 char long) of ASCII 7-bit alphanumeric chars and the following special symbols: <br/>`- : . + % _ # * ? ! ( ) , = @ ; $ '`.
   */
  messageId: string;
  /**
   * Destination of the message.
   */
  to: string;
  /**
   * Expiry time in UTC interpreted by hub on C2D messages. Ignored in other cases.
   */
  expiryTimeUtc: any;
  /**
   * Used to Abandon, Reject or Accept the message
   */
  lockToken: string;
  /**
   * Used in message responses and feedback
   */
  correlationId: string;
  /**
   * Used to specify the entity creating the message
   */
  userId: string;
  /**
   * Type of feedback requested (in case of cloud-to-device command)
   */
  ack: string;

  /**
   * Content type property used to routes with the message body. Should be 'application/json'.
   */
  contentType: undefined | 'application/json';

  /**
   * Content encoding of the message body. can be 'utf-8', 'utf-16' or 'utf-32'.
   */
  contentEncoding: undefined | 'utf-8' | 'utf-16' | 'utf-32';

  /**
   * Is this message a security message
   */
  interfaceId: string;

  /**
   * @private
   */
  transportObj: any;

  /**
   * Creates a new {@link azure-iot-common.Message} object
   *
   * @constructor
   * @param data a Node [Buffer]{@link https://nodejs.org/api/globals.html#globals_class_buffer}
   *             object or anything that can be passed to the [Buffer]{@link https://nodejs.org/api/globals.html#globals_class_buffer} constructor
   *             to construct a [Buffer]{@link https://nodejs.org/api/globals.html#globals_class_buffer} from.
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
    this.contentEncoding = undefined;
    this.contentType = undefined;
  }

  /**
   * Gets the content (body) of the {@link azure-iot-common.Message}.
   *
   * @returns {*} The content of the {@link azure-iot-common.Message}.
   */
  getData(): Message.BufferConvertible {
    /*Codes_SRS_NODE_IOTHUB_MESSAGE_07_003: [The getData function shall return a representation of the body of the message as the type that was presented during construction.]*/
    return this.data;
  }

  /**
   * Gets the data passed to the constructor as a [Buffer]{@link https://nodejs.org/api/globals.html#globals_class_buffer}
   *
   * @returns {Buffer}
   */
  getBytes(): Buffer {
    if (Buffer.isBuffer(this.data) ) {
      /*Codes_SRS_NODE_IOTHUB_MESSAGE_07_001: [If the data message that is store is of type Buffer then the data object will get returned unaltered.]*/
      return this.data;
    } else {
      /*Codes_SRS_NODE_IOTHUB_MESSAGE_07_002: [If the data message is of any other type then the data will be converted to a Buffer object and returned.]*/
      return Buffer.from(this.data);
    }
  }

  /**
   * Sets this message as a security message
   */
  setAsSecurityMessage(): void {
    this.interfaceId = securityInterfaceId;
  }

  /**
   * Returns true if the given object is of type {@link Message.BufferConvertible}.  Objects of type {@link Message.BufferConvertible} can be passed into the {@link Message} constructor.
   *
   * @param obj object instance to check
   *
   * @returns True if the object is of type {@link Message.BufferConvertible}
   */
  static isBufferConvertible(obj: any): boolean {
    /*Codes_SRS_NODE_IOTHUB_MESSAGE_18_001: [`isBufferConvertible` shall return `true` if `obj` is a `Buffer`, a `string`, an `Array`, or an `ArrayBuffer`.]*/
    if (Buffer.isBuffer(obj)) {
      return true;
    } else if (typeof obj === 'string') {
      return true;
    } else if (obj instanceof Array) {
      return true;
    } else if (obj instanceof ArrayBuffer) {
      return true;
    } else {
      /*Codes_SRS_NODE_IOTHUB_MESSAGE_18_002: [`isBufferConvertible` shall return `false` if `obj` is any other type.]*/
      return false;
    }
  }
}

export namespace Message {
  export type BufferConvertible = Buffer | string | any[] | ArrayBuffer;

}
