/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */
import { Properties } from './properties';
/**
 * The {@link azure-iot-common.Message} object is used for telemetry (device-to-cloud) and commands (cloud-to-device) asynchronous
 * messaging between the device and the IoT Hub service. It is transport-agnostic, meaning it works the same way over AMQP, MQTT and HTTP.
 */
export declare class Message {
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
     * @constructor
     * @param data a Node [Buffer]{@link https://nodejs.org/api/globals.html#globals_class_buffer}
     *             object or anything that can be passed to the [Buffer]{@link https://nodejs.org/api/globals.html#globals_class_buffer} constructor
     *             to construct a [Buffer]{@link https://nodejs.org/api/globals.html#globals_class_buffer} from.
     */
    constructor(data: Message.BufferConvertible);
    /**
     * Gets the content (body) of the {@link azure-iot-common.Message}.
     *
     * @returns {*} The content of the {@link azure-iot-common.Message}.
     */
    getData(): Message.BufferConvertible;
    /**
     * Gets the data passed to the constructor as a [Buffer]{@link https://nodejs.org/api/globals.html#globals_class_buffer}
     *
     * @returns {Buffer}
     */
    getBytes(): Buffer;
    /**
     * Sets this message as a security message
     */
    setAsSecurityMessage(): void;
    /**
     * Returns true if the given object is of type {@link Message.BufferConvertible}.  Objects of type {@link Message.BufferConvertible} can be passed into the {@link Message} constructor.
     *
     * @param obj object instance to check
     *
     * @returns True if the object is of type {@link Message.BufferConvertible}
     */
    static isBufferConvertible(obj: any): boolean;
}
export declare namespace Message {
    type BufferConvertible = Buffer | String | any[] | ArrayBuffer;
}
