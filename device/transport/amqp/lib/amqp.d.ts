import { EventEmitter } from 'events';
import { DeviceTransport, MethodMessage, DeviceMethodResponse, TwinProperties, DeviceClientOptions } from 'azure-iot-device';
import { Amqp as BaseAmqpClient } from 'azure-iot-amqp-base';
import { results, Message, AuthenticationProvider, TransportConfig } from 'azure-iot-common';
/**
 * Provides the transport layer over AMQP for the {@link azure-iot-device.Client} object.
 *
 * This class is not meant to be used directly, instead passed to the {@link azure-iot-device.Client} class to be used as
 * a transport.
 */
export declare class Amqp extends EventEmitter implements DeviceTransport {
    /**
     * @private
     */
    protected _authenticationProvider: AuthenticationProvider;
    private _deviceMethodClient;
    private _amqp;
    private _twinClient;
    private _c2dEndpoint;
    private _d2cEndpoint;
    private _messageEventName;
    private _c2dLink;
    private _d2cLink;
    private _options;
    private _c2dErrorListener;
    private _c2dMessageListener;
    private _d2cErrorListener;
    private _fsm;
    /**
     * @private
     */
    constructor(authenticationProvider: AuthenticationProvider, baseClient?: BaseAmqpClient);
    /**
     * @private
     * @method              module:azure-iot-device-amqp.Amqp#connect
     * @description         Establishes a connection with the IoT Hub instance.
     * @param {Function}   done   Called when the connection is established of if an error happened.
     *
     */
    connect(done?: (err?: Error, result?: results.Connected) => void): void;
    /**
     * @private
     * @method              module:azure-iot-device-amqp.Amqp#disconnect
     * @description         Disconnects the link to the IoT Hub instance.
     * @param {Function}   done   Called when disconnected of if an error happened.
     */
    disconnect(done?: (err?: Error) => void): void;
    /**
     * @private
     * @method              module:azure-iot-device-amqp.Amqp#sendEvent
     * @description         Sends an event to the IoT Hub.
     * @param {Message}  message    The [message]{@linkcode module:common/message.Message}
     *                              to be sent.
     * @param {Function} done       The callback to be invoked when `sendEvent`
     *                              completes execution.
     */
    sendEvent(message: Message, done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    /**
     * @private
     * @method             module:azure-iot-device-amqp.Amqp#sendEventBatch
     * @description        Not Implemented.
     * @param {Message[]}  messages    The [messages]{@linkcode module:common/message.Message}
     *                                 to be sent.
     * @param {Function}   done        The callback to be invoked when `sendEventBatch`
     *                                 completes execution.
     */
    sendEventBatch(messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    /**
     * @private
     * @method              module:azure-iot-device-amqp.Amqp#complete
     * @description         Settles the message as complete and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as complete.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    complete(message: Message, done?: (err?: Error, result?: results.MessageCompleted) => void): void;
    /**
     * @private
     * @method              module:azure-iot-device-amqp.Amqp#reject
     * @description         Settles the message as rejected and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as rejected.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    reject(message: Message, done?: (err?: Error, result?: results.MessageRejected) => void): void;
    /**
     * @private
     * @method              module:azure-iot-device-amqp.Amqp#abandon
     * @description         Settles the message as abandoned and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as abandoned.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    abandon(message: Message, done?: (err?: Error, result?: results.MessageAbandoned) => void): void;
    /**
     * @private
     * @method          module:azure-iot-device-amqp.Amqp#updateSharedAccessSignature
     * @description     This methods sets the SAS token used to authenticate with the IoT Hub service and performs re-authorization using the CBS links with this new token
     *                  Updating the expiry time of the token is the responsibility of the caller.
     *
     * @param {String}        sharedAccessSignature  The new SAS token.
     * @param {Function}      done      The callback to be invoked when `updateSharedAccessSignature` completes.
     */
    updateSharedAccessSignature(sharedAccessSignature: string, done?: (err?: Error, result?: results.SharedAccessSignatureUpdated) => void): void;
    /**
     * @private
     * @method          module:azure-iot-device-amqp.Amqp#setOptions
     * @description     This methods sets the AMQP specific options of the transport.
     *
     * @param {object}        options   Options to set.  Currently for amqp these are the x509 cert, key, and optional passphrase properties. (All strings)
     * @param {Function}      done      The callback to be invoked when `setOptions` completes.
     */
    setOptions(options: DeviceClientOptions, done?: () => void): void;
    /**
     * @private
     * The `sendEventBatch` method sends a list of event messages to the IoT Hub.
     * @param {array<Message>} messages   Array of [Message]{@linkcode module:common/message.Message}
     *                                    objects to be sent as a batch.
     * @param {Function}      done      The callback to be invoked when
     *                                  `sendEventBatch` completes execution.
     */
    /**
     * @private
     */
    onDeviceMethod(methodName: string, methodCallback: (request: MethodMessage, response: DeviceMethodResponse) => void): void;
    /**
     * @private
     * The `sendMethodResponse` method sends a direct method response to the IoT Hub
     * @param {Object}     methodResponse   Object describing the device method response.
     * @param {Function}   callback         The callback to be invoked when
     *                                      `sendMethodResponse` completes execution.
     */
    sendMethodResponse(methodResponse: DeviceMethodResponse, callback: (err?: Error, result?: any) => void): void;
    /**
     * @private
     * Gets the Twin for the connected device.
     *
     * @param callback called when the transport has a twin or encountered and error trying to retrieve it.
     */
    getTwin(callback: (err?: Error, twin?: TwinProperties) => void): void;
    /**
     * @private
     */
    updateTwinReportedProperties(patch: any, callback: (err?: Error) => void): void;
    /**
     * @private
     */
    enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
    /**
     * @private
     */
    disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
    /**
     * @private
     */
    enableC2D(callback: (err?: Error) => void): void;
    /**
     * @private
     */
    disableC2D(callback: (err?: Error) => void): void;
    /**
     * @private
     */
    enableMethods(callback: (err?: Error) => void): void;
    /**
     * @private
     */
    disableMethods(callback: (err?: Error) => void): void;
    /**
     * @private
     */
    enableInputMessages(callback: (err?: Error) => void): void;
    /**
     * @private
     */
    disableInputMessages(callback: (err?: Error) => void): void;
    /**
     * @private
     */
    sendOutputEvent(outputName: string, message: Message, callback: (err?: Error, result?: results.MessageEnqueued) => void): void;
    /**
     * @private
     */
    sendOutputEventBatch(outputName: string, messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    protected _getConnectionUri(credentials: TransportConfig): string;
    private _stopC2DListener;
}
