import { EventEmitter } from 'events';
import { results, Message, AuthenticationProvider } from 'azure-iot-common';
import { DeviceTransport, MethodMessage, DeviceMethodResponse, TwinProperties } from 'azure-iot-device';
import { DeviceClientOptions } from 'azure-iot-device';
/**
 * Provides the transport layer over HTTP for the {@link azure-iot-device.Client} object.
 *
 * This class is not meant to be used directly, instead passed to the {@link azure-iot-device.Client} class to be used as
 * a transport.
 */
export declare class Http extends EventEmitter implements DeviceTransport {
    private _authenticationProvider;
    private _http;
    private _opts;
    private _cronObj;
    private _intervalObj;
    private _timeoutObj;
    private _receiverStarted;
    private _userAgentString;
    private _productInfo;
    /**
     * @private
     * @constructor
     * @param config The configuration object.
     */
    constructor(authenticationProvider: AuthenticationProvider, http?: any);
    /**
     * @private
     */
    connect(callback: (err?: Error, result?: results.Connected) => void): void;
    /**
     * @private
     */
    disconnect(callback: (err?: Error, result?: results.Disconnected) => void): void;
    /**
     * @private
     * @method          module:azure-iot-device-http.Http#sendEvent
     * @description     This method sends an event to the IoT Hub as the device indicated in the
     *                  `config` parameter.
     *
     * @param {Message}  message    The [message]{@linkcode module:common/message.Message}
     *                              to be sent.
     * @param {Object}  config      This is a dictionary containing the following keys
     *                              and values:
     *
     * | Key     | Value                                                   |
     * |---------|---------------------------------------------------------|
     * | host    | The host URL of the Azure IoT Hub                       |
     * | keyName | The identifier of the device that is being connected to |
     * | key     | The shared access key auth                              |
     *
     * @param {Function} done       The callback to be invoked when `sendEvent`
     *                              completes execution.
     */
    sendEvent(message: Message, done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    /**
     * @private
     * @method          module:azure-iot-device-http.Http#sendEventBatch
     * @description     The `sendEventBatch` method sends a list of event messages to the IoT Hub
     *                  as the device indicated in the `config` parameter.
     * @param {array<Message>} messages   Array of [Message]{@linkcode module:common/message.Message}
     *                                    objects to be sent as a batch.
     * @param {Object}  config            This is a dictionary containing the
     *                                    following keys and values:
     *
     * | Key     | Value                                                   |
     * |---------|---------------------------------------------------------|
     * | host    | The host URL of the Azure IoT Hub                       |
     * | keyName | The identifier of the device that is being connected to |
     * | key     | The shared access key auth                              |
     *
     * @param {Function}      done      The callback to be invoked when
     *                                  `sendEventBatch` completes execution.
     */
    sendEventBatch(messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    /**
     * @private
     * @method          module:azure-iot-device-http.Http#setOptions
     * @description     This methods sets the HTTP specific options of the transport.
     *
     * @param {Function}      done      The callback to be invoked when `setOptions` completes.
     */
    setOptions(options: DeviceClientOptions, done: (err?: Error, result?: any) => void): void;
    /**
     * @private
     * @method          module:azure-iot-device-http.HttpReceiver#receive
     * @description     The receive method queries the IoT Hub immediately (as the device indicated in the
     *                  `config` constructor parameter) for the next message in the queue.
     */
    receive(): void;
    /**
     * @private
     * @method              module:azure-iot-device-http.Http#complete
     * @description         Settles the message as complete and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as complete.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    complete(message: Message, done: (err?: Error, result?: results.MessageCompleted) => void): void;
    /**
     * @private
     * @method              module:azure-iot-device-http.Http#reject
     * @description         Settles the message as rejected and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as rejected.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    reject(message: Message, done: (err?: Error, result?: results.MessageRejected) => void): void;
    /**
     * @private
     * @method              module:azure-iot-device-http.Http#abandon
     * @description         Settles the message as abandoned and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as abandoned.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    abandon(message: Message, done: (err?: Error, result?: results.MessageAbandoned) => void): void;
    /**
     * @private
     * @method          module:azure-iot-device-http.Http#updateSharedAccessSignature
     * @description     This methods sets the SAS token used to authenticate with the IoT Hub service.
     *
     * @param {String}        sharedAccessSignature  The new SAS token.
     * @param {Function}      done      The callback to be invoked when `updateSharedAccessSignature` completes.
     */
    updateSharedAccessSignature(sharedAccessSignature: string, done: (err?: Error, result?: results.SharedAccessSignatureUpdated) => void): void;
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
    getTwin(done: (err?: Error, twin?: TwinProperties) => void): void;
    /**
     * @private
     */
    updateTwinReportedProperties(done: (err?: Error) => void): void;
    /**
     * @private
     */
    enableTwinDesiredPropertiesUpdates(done: (err?: Error) => void): void;
    /**
     * @private
     */
    disableTwinDesiredPropertiesUpdates(done: (err?: Error) => void): void;
    /**
     * @private
     */
    sendMethodResponse(response: DeviceMethodResponse, done?: (err?: Error, result?: any) => void): void;
    /**
     * @private
     */
    onDeviceMethod(methodName: string, methodCallback: (request: MethodMessage, response: DeviceMethodResponse) => void): void;
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
    sendOutputEvent(outputName: string, message: Message, done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    /**
     * @private
     */
    sendOutputEventBatch(outputName: string, messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    private _insertAuthHeaderIfNecessary;
    /**
     * @private
     * This method sends the feedback action to the IoT Hub.
     *
     * @param {String}  action    This parameter must be equal to one of the
     *                            following possible values:
     *
     * | Value    | Action                                                                                  |
     * |----------|-----------------------------------------------------------------------------------------|
     * | abandon  | Directs the IoT Hub to re-enqueue a message so it may be received again later.          |
     * | reject   | Directs the IoT Hub to delete a message from the queue and record that it was rejected. |
     * | complete | Directs the IoT Hub to delete a message from the queue and record that it was accepted. |
     *
     * @param {String}        message   The message for which feedback is being sent.
     * @param {Function}      done      The callback to be invoked when
     *                                  `sendFeedback` completes execution.
     */
    private _sendFeedback;
    /** @private
     * @method          module:azure-iot-device-http.HttpReceiver#setOptions
     * @description     This method sets the options defining how the receiver object should poll the IoT Hub service to get messages.
     *                  There is only one instance of the receiver object. If the receiver has already been created, calling setOptions will
     *                  change the options of the existing instance and restart it.
     *
     * @param {Object} opts Receiver options formatted as: { interval: (Number), at: (Date), cron: (string), drain: (Boolean) }
     */
    private _setReceiverOptions;
    private _ensureAgentString;
}
