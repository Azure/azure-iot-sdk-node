import { Message } from 'azure-iot-common';
import { SenderLink } from './sender_link';
import { ReceiverLink } from './receiver_link';
export declare type GenericAmqpBaseCallback<T> = (err: Error | null, result?: T) => void;
/**
 * @private
 * @class module:azure-iot-amqp-base.Amqp
 * @classdesc Basic AMQP functionality used by higher-level IoT Hub libraries.
 *            Usually you'll want to avoid using this class and instead rely on higher-level implementations
 *            of the AMQP transport (see [azure-iot-device-amqp.Amqp]{@link module:azure-iot-device-amqp.Amqp} for example).
 *
 * @param   {Boolean}   autoSettleMessages      Boolean indicating whether messages should be settled automatically or if the calling code will handle it.
 * @param   {String}    sdkVersionString        String identifying the type and version of the SDK used.
 */
export declare class Amqp {
    private _rheaContainer;
    private _rheaConnection;
    private _rheaSession;
    private _receivers;
    private _senders;
    private _connectionCallback;
    private _indicatedConnectionError;
    private _sessionCallback;
    private _indicatedSessionError;
    private _sessionResult;
    private _disconnectHandler;
    private _disconnectionOccurred;
    private _sessionCloseOccurred;
    private _connectionCloseOccurred;
    private _fsm;
    private _cbs;
    private _config;
    constructor(autoSettleMessages: boolean);
    /**
     * @method             module:azure-iot-amqp-base.Amqp#connect
     * @description        Establishes a connection with the IoT Hub instance.
     * @param {AmqpBaseTransportConfig}     config        Configuration object
     * @param {Function}                    done          Callback called when the connection is established or if an error happened.
     */
    connect(config: AmqpBaseTransportConfig, done: GenericAmqpBaseCallback<any>): void;
    /**
     * @method             module:azure-iot-amqp-base.Amqp#setDisconnectCallback
     * @description        Sets the callback that should be called in case of disconnection.
     * @param {Function}   disconnectCallback   Called when the connection disconnected.
     */
    setDisconnectHandler(disconnectCallback: GenericAmqpBaseCallback<any>): void;
    /**
     * @method             module:azure-iot-amqp-base.Amqp#disconnect
     * @description        Disconnects the link to the IoT Hub instance.
     * @param {Function}   done   Called when disconnected of if an error happened.
     */
    disconnect(done: GenericAmqpBaseCallback<any>): void;
    /**
     * @deprecated         Use attachSenderLink and the SenderLink.send() method instead
     * @method             module:azure-iot-amqp-base.Amqp#send
     * @description        Sends a message to the IoT Hub instance.
     *
     * @param {Message}   message   The message to send.
     * @param {string}    endpoint  The endpoint to use when sending the message.
     * @param {string}    to        The destination of the message.
     * @param {Function}  done      Called when the message is sent or if an error happened.
     */
    send(message: Message, endpoint: string, to: string, done: GenericAmqpBaseCallback<any>): void;
    /**
     * @deprecated         use attachReceiverLink() instead.
     * @method             module:azure-iot-amqp-base.Amqp#getReceiver
     * @description        Gets the {@linkcode AmqpReceiver} object that can be used to receive messages from the IoT Hub instance and accept/reject/release them.
     *
     * @param {string}    endpoint  Endpoint used for the receiving link.
     * @param {Function}  done      Callback used to return the {@linkcode AmqpReceiver} object.
     */
    getReceiver(endpoint: string, done: GenericAmqpBaseCallback<ReceiverLink>): void;
    /**
     * @method             module:azure-iot-amqp-base.Amqp#attachReceiverLink
     * @description        Creates and attaches an AMQP receiver link for the specified endpoint.
     *
     * @param {string}    endpoint    Endpoint used for the receiver link.
     * @param {Object}    linkOptions Configuration options to be merged with the rhea policies for the link..
     * @param {Function}  done        Callback used to return the link object or an Error.
     */
    attachReceiverLink(endpoint: string, linkOptions: any, done: GenericAmqpBaseCallback<ReceiverLink>): void;
    /**
     * @method             module:azure-iot-amqp-base.Amqp#attachSenderLink
     * @description        Creates and attaches an AMQP sender link for the specified endpoint.
     *
     * @param {string}    endpoint    Endpoint used for the sender link.
     * @param {Object}    linkOptions Configuration options to be merged with the rhea policies for the link..
     * @param {Function}  done        Callback used to return the link object or an Error.
     */
    attachSenderLink(endpoint: string, linkOptions: any, done: GenericAmqpBaseCallback<SenderLink>): void;
    /**
     * @method             module:azure-iot-amqp-base.Amqp#detachReceiverLink
     * @description        Detaches an AMQP receiver link for the specified endpoint if it exists.
     *
     * @param {string}    endpoint  Endpoint used to identify which link should be detached.
     * @param {Function}  done      Callback used to signal success or failure of the detach operation.
     */
    detachReceiverLink(endpoint: string, detachCallback: GenericAmqpBaseCallback<any>): void;
    /**
     * @method             module:azure-iot-amqp-base.Amqp#detachSenderLink
     * @description        Detaches an AMQP sender link for the specified endpoint if it exists.
     *
     * @param {string}    endpoint  Endpoint used to identify which link should be detached.
     * @param {Function}  done      Callback used to signal success or failure of the detach operation.
     */
    detachSenderLink(endpoint: string, detachCallback: GenericAmqpBaseCallback<any>): void;
    initializeCBS(callback: (err?: Error) => void): void;
    putToken(audience: string, token: string, callback: (err?: Error) => void): void;
    private _detachLink;
    private _safeCallback;
    private _getErrorName;
}
/**
 * @private
 */
export interface AmqpBaseTransportConfig {
    uri: string;
    userAgentString: string;
    sslOptions?: any;
    saslMechanismName?: string;
    saslMechanism?: any;
    policyOverride?: any;
}
