import { Message } from 'azure-iot-common';
/**
 * @private
 * @class           module:azure-iot-amqp-base.AmqpMessage
 * @classdesc       AMQP-specific message class used to prepare a [azure-iot-common.Message]{@link module:azure-iot-common.Message}
 *                  before it's sent over the wire using the AMQP protocol.
 */
export declare class AmqpMessage {
    to?: string;
    absolute_expiry_time?: Date;
    message_id?: string;
    correlation_id?: string;
    reply_to?: string;
    content_type?: undefined | 'application/json';
    content_encoding?: undefined | 'utf-8' | 'utf-16' | 'utf-32';
    body: any;
    application_properties: {
        [key: string]: any;
    };
    message_annotations: {
        [key: string]: any;
    };
    /**
     * @method          module:azure-iot-amqp-base.AmqpMessage.fromMessage
     * @description     Takes a azure-iot-common.Message{@link module:azure-iot-common.Message} object and creates an AMQP message from it.
     *
     * @param {module:azure-iot-common.Message}   message   The {@linkcode Message} object from which to create an AMQP message.
     */
    static fromMessage(message: Message): AmqpMessage;
    /**
     * @method          module:azure-iot-amqp-base.AmqpMessage.toMessage
     * @description     Creates a transport-agnostic azure-iot-common.Message{@link module:azure-iot-common.Message} object from transport-specific AMQP message.
     *
     * @param {AmqpMessage}   message   The {@linkcode AmqpMessage} object from which to create an Message.
     */
    static toMessage(amqpMessage: AmqpMessage): Message;
}
