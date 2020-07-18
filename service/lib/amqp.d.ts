import { EventEmitter } from 'events';
import { results, Message, Callback } from 'azure-iot-common';
import { Amqp as Base } from 'azure-iot-amqp-base';
import { Client } from './client';
import { ResultWithIncomingMessage, IncomingMessageCallback } from './interfaces.js';
/**
 * Transport class used by the [service client]{@link azure-iothub.Client} to connect to the Azure IoT hub using the AMQP protocol over a secure (TLS) socket.
 * This class should not be used directly and instead be passed to one of the {@link azure-iothub.Client} factory methods: {@link azure-iothub.Client.fromConnectionString|fromConnectionString} or {@link azure-iothub.Client.fromSharedAccessSignature|fromSharedAccessSignature}.
 */
export declare class Amqp extends EventEmitter implements Client.Transport {
    /**
     * @private
     */
    protected _config: Client.TransportConfigOptions;
    private _amqp;
    private _renewalTimeout;
    private _renewalNumberOfMilliseconds;
    private _fsm;
    private _c2dEndpoint;
    private _c2dLink;
    private _c2dErrorListener;
    private _feedbackEndpoint;
    private _feedbackReceiver;
    private _feedbackErrorListener;
    private _fileNotificationEndpoint;
    private _fileNotificationReceiver;
    private _fileNotificationErrorListener;
    /**
     * @private
     */
    constructor(config: Client.TransportConfigOptions, amqpBase?: Base);
    /**
     * @private
     * @method             module:azure-iothub.Amqp#connect
     * @description        Establishes a connection with the IoT Hub instance.
     * @param {TripleValueCallback<results.Connected, IncomingMessage>}   [done]   Optional callback called when the connection is established of if an error happened.
     * @returns {Promise<results.Disconnected> | void} Promise if no callback function was passed, void otherwise.
     */
    connect(done: Callback<results.Connected>): void;
    connect(): Promise<results.Connected>;
    /**
     * @private
     * @method             module:azure-iothub.Amqp#disconnect
     * @description        Disconnects the link to the IoT Hub instance.
     * @param {Callback<results.Disconnected>}   [done]   Optional callback called when disconnected of if an error happened.
     * @returns {Promise<results.Disconnected> | void} Promise if no callback function was passed, void otherwise.
     */
    disconnect(done: Callback<results.Disconnected>): void;
    disconnect(): Promise<results.Disconnected>;
    /**
     * @private
     * @method             module:azure-iothub.Amqp#send
     * @description        Sends a message to the IoT Hub.
     * @param {Message}  message    The [message]{@linkcode module:common/message.Message}
     *                              to be sent.
     * @param {Function} [done]     The optional callback to be invoked when `send`
     *                              completes execution.
     * @returns {Promise<ResultWithIncomingMessage<results.MessageEnqueued>> | void} Promise if no callback function was passed, void otherwise.
     */
    send(deviceId: string, message: Message, done: IncomingMessageCallback<results.MessageEnqueued>): void;
    send(deviceId: string, message: Message): Promise<ResultWithIncomingMessage<results.MessageEnqueued>>;
    /**
     * @private
     * @method             module:azure-iothub.Amqp#getFeedbackReceiver
     * @description        Gets the {@linkcode AmqpReceiver} object that can be used to receive messages from the IoT Hub instance and accept/reject/release them.
     * @param {Function}   [done]      Optional callback used to return the {@linkcode AmqpReceiver} object.
     * @returns {Promise<ResultWithIncomingMessage<Client.ServiceReceiver>> | void} Promise if no callback function was passed, void otherwise.
     */
    getFeedbackReceiver(done: IncomingMessageCallback<Client.ServiceReceiver>): void;
    getFeedbackReceiver(): Promise<ResultWithIncomingMessage<Client.ServiceReceiver>>;
    /**
     * @private
     * @method             module:azure-iothub.Amqp#getFileNotificationReceiver
     * @description        Gets the {@linkcode AmqpReceiver} object that can be used to receive messages from the IoT Hub instance and accept/reject/release them.
     * @param {Function}   [done]      Optional callback used to return the {@linkcode AmqpReceiver} object.
     * @returns {Promise<Client.ServiceReceiver> | void} Promise if no callback function was passed, void otherwise.
     */
    getFileNotificationReceiver(done: IncomingMessageCallback<Client.ServiceReceiver>): void;
    getFileNotificationReceiver(): Promise<ResultWithIncomingMessage<Client.ServiceReceiver>>;
    /**
     * @private
     * Updates the shared access signature and puts a new CBS token.
     * @param sharedAccessSignature New shared access signature used to put a new CBS token.
     * @param [callback] Optional function called when the callback has been successfully called.
     * @returns {Promise<results.SharedAccessSignatureUpdated> | void} Promise if no callback function was passed, void otherwise.
     */
    updateSharedAccessSignature(sharedAccessSignature: string, callback: Callback<results.SharedAccessSignatureUpdated>): void;
    updateSharedAccessSignature(sharedAccessSignature: string): Promise<results.SharedAccessSignatureUpdated>;
    protected _getConnectionUri(): string;
    private _handleSASRenewal;
}
