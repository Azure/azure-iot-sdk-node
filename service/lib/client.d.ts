import { EventEmitter } from 'events';
import { results, Message, Receiver, SharedAccessSignature } from 'azure-iot-common';
import { RetryPolicy } from 'azure-iot-common';
import { RestApiClient } from 'azure-iot-http-base';
import { DeviceMethodParams, IncomingMessageCallback, ResultWithIncomingMessage } from './interfaces';
import { Callback } from 'azure-iot-common';
/**
 * The IoT Hub service client is used to communicate with devices through an Azure IoT hub.
 * It lets the SDK user:
 *   - send cloud-to-device (also known as commands) to devices: commands are queued on IoT Hub and delivered asynchronously only when the device is connected. Only 50 commands can be queued per device.
 *   - invoke direct methods on devices (which will work only if the device is currently connected: it's a synchronous way of communicating with the device)
 *   - listen for feedback messages sent by devices for previous commands.
 *   - listen for file upload notifications from devices.
 *
 * Users should create new {@link azure-iothub.Client} instances by calling one of the factory methods,
 * {@link azure-iothub.Client.fromConnectionString|fromConnectionString} or
 * {@link azure-iothub.Client.fromSharedAccessSignature|fromSharedAccessSignature},
 * to create an IoT Hub service Client.
 */
export declare class Client extends EventEmitter {
    private _transport;
    private _restApiClient;
    private _retryPolicy;
    /**
     * @private
     */
    constructor(transport: Client.Transport, restApiClient?: RestApiClient);
    /**
     * @method            module:azure-iothub.Client#open
     * @description       Opens the connection to an IoT hub.
     * @param {Function}  [done]  The optional function to call when the operation is
     *                            complete. `done` will be passed an Error object
     *                            argument, which will be null if the operation
     *                            completed successfully.
     * @returns {Promise<ResultWithIncomingMessage<results.Connected>> | void} Promise if no callback function was passed, void otherwise.
     */
    open(done: IncomingMessageCallback<results.Connected>): void;
    open(): Promise<ResultWithIncomingMessage<results.Connected>>;
    /**
     * @method            module:azure-iothub.Client#close
     * @description       Closes the connection to an IoT hub.
     * @param {Function}  [done]  The optional function to call when the operation is
     *                            complete. `done` will be passed an Error object
     *                            argument, which will be null if the operation
     *                            completed successfully.
     * @returns {Promise<ResultWithIncomingMessage<results.Disconnected>> | void} Promise if no callback function was passed, void otherwise.
     */
    close(done: IncomingMessageCallback<results.Disconnected>): void;
    close(): Promise<ResultWithIncomingMessage<results.Disconnected>>;
    /**
     * @method            module:azure-iothub.Client#send
     * @description       Sends a message to a device.
     * @param {String}    deviceId  The identifier of an existing device identity.
     * @param {Object}    message   The body of the message to send to the device.
     *                              If `message` is not of type
     *                              {@link module:azure-iot-common.Message|Message},
     *                              it will be converted.
     * @param {Function}  [done]    The optional function to call when the operation is
     *                              complete. `done` will be called with two
     *                              arguments: an Error object (can be null) and a
     *                              transport-specific response object useful for
     *                              logging or debugging.
     * @returns {Promise<ResultWithIncomingMessage<results.MessageEnqueued>> | void} Promise if no callback function was passed, void otherwise.
     *
     * @throws {ReferenceError}     If `deviceId` or `message` is null, undefined or empty.
     */
    send(deviceId: string, message: Message | Message.BufferConvertible, done: IncomingMessageCallback<results.MessageEnqueued>): void;
    send(deviceId: string, message: Message | Message.BufferConvertible): Promise<ResultWithIncomingMessage<results.MessageEnqueued>>;
    _invokeDeviceMethod(deviceId: string, moduleIdOrMethodParams: string | DeviceMethodParams, methodParamsOrDone?: DeviceMethodParams | IncomingMessageCallback<any>, done?: IncomingMessageCallback<any>): void;
    /**
     * @method            module:azure-iothub.Client#invokeDeviceMethod
     * @description       Invokes a method on a particular device or module.
     * @param {String}    deviceId            The identifier of an existing device identity.
     * @param {String}    moduleId            The identifier of an existing module identity (optional)
     * @param {Object}    params              An object describing the method and shall have the following properties:
     *                                        - methodName                  The name of the method that shall be invoked.
     *                                        - payload                     [optional] The payload to use for the method call.
     *                                        - responseTimeoutInSeconds    [optional] The number of seconds IoT Hub shall wait for the device
     *                                                                      to send a response before deeming the method execution a failure.
     *                                        - connectTimeoutInSeconds     [optional] The number of seconds IoT Hub shall wait for the service
     *                                                                      to connect to the device before declaring the device is unreachable.
     * @param {Function}  [done]              The optional callback to call with the result of the method execution.
     * @returns {ResultWithIncomingMessage<any> | void} Promise if no callback function was passed, void otherwise.
     *
     * @throws {ReferenceError}  If one of the required parameters is null, undefined or empty.
     * @throws {TypeError}       If one of the parameters is of the wrong type.
     */
    invokeDeviceMethod(deviceId: string, methodParams: DeviceMethodParams, done: IncomingMessageCallback<any>): void;
    invokeDeviceMethod(deviceId: string, moduleId: string, methodParams: DeviceMethodParams, done: IncomingMessageCallback<any>): void;
    invokeDeviceMethod(deviceId: string, methodParams: DeviceMethodParams): Promise<ResultWithIncomingMessage<any>>;
    invokeDeviceMethod(deviceId: string, moduleId: string, methodParams: DeviceMethodParams): Promise<ResultWithIncomingMessage<any>>;
    /**
     * @method            module:azure-iothub.Client#getFeedbackReceiver
     * @description       Returns a AmqpReceiver object which emits events when new feedback messages are received by the client.
     * @param {Function}  [done]    The optional function to call when the operation is
     *                              complete. `done` will be called with two
     *                              arguments: an Error object (can be null) and a
     *                              AmqpReceiver object.
     * @returns {ResultWithIncomingMessage<Client.ServiceReceiver> | void} Promise if no callback function was passed, void otherwise.
     */
    getFeedbackReceiver(done: IncomingMessageCallback<Client.ServiceReceiver>): void;
    getFeedbackReceiver(): Promise<ResultWithIncomingMessage<Client.ServiceReceiver>>;
    /**
     * @method            module:azure-iothub.Client#getFileNotificationReceiver
     * @description       Returns a AmqpReceiver object which emits events when new file upload notifications are received by the client.
     * @param {Function}  [done]    The optional function to call when the operation is
     *                              complete. `done` will be called with two
     *                              arguments: an Error object (can be null) and a
     *                              AmqpReceiver object.
     * @returns {ResultWithIncomingMessage<Client.ServiceReceiver> | void} Promise if no callback function was passed, void otherwise.
     */
    getFileNotificationReceiver(done: IncomingMessageCallback<Client.ServiceReceiver>): void;
    getFileNotificationReceiver(): Promise<ResultWithIncomingMessage<Client.ServiceReceiver>>;
    /**
     * Set the policy used by the client to retry network operations.
     *
     * @param policy policy used to retry operations (eg. open, send, etc.).
     *               The SDK comes with 2 "built-in" policies: ExponentialBackoffWithJitter (default)
     *               and NoRetry (to cancel any form of retry). The user can also pass its own object as
     *               long as it implements 2 methods:
     *               - shouldRetry(err: Error): boolean : indicates whether an operation should be retried based on the error type
     *               - nextRetryTimeout(retryCount: number, throttled: boolean): number : returns the time to wait (in milliseconds)
     *               before retrying based on the past number of attempts (retryCount) and the fact that the error is a throttling error or not.
     */
    setRetryPolicy(policy: RetryPolicy): void;
    private _disconnectHandler;
    /**
     * @method            module:azure-iothub.Client.fromConnectionString
     * @static
     * @description       Creates an IoT Hub service client from the given
     *                    connection string using the default transport
     *                    (Amqp) or the one specified in the second argument.
     *
     * @param {String}    connStr       A connection string which encapsulates "device
     *                                  connect" permissions on an IoT hub.
     * @param {Function}  Transport     A transport constructor.
     *
     * @returns {module:azure-iothub.Client}
     */
    static fromConnectionString(connStr: string, transportCtor?: Client.TransportCtor): Client;
    /**
     * @method            module:azure-iothub.Client.fromSharedAccessSignature
     * @static
     * @description       Creates an IoT Hub service client from the given
     *                    shared access signature using the default transport
     *                    (Amqp) or the one specified in the second argument.
     *
     * @param {String}    sharedAccessSignature   A shared access signature which encapsulates
     *                            "service connect" permissions on an IoT hub.
     * @param {Function}  Transport     A transport constructor.
     *
     * @returns {module:azure-iothub.Client}
     */
    static fromSharedAccessSignature(sharedAccessSignature: string, transportCtor?: Client.TransportCtor): Client;
}
export declare namespace Client {
    interface TransportConfigOptions {
        /**
         * Hostname of the Azure IoT hub. (<IoT hub name>.azure-devices.net).
         */
        host: string;
        /**
         * @deprecated This is not used anywhere anymore.
         * Name of the Azure IoT hub. (The first section of the Azure IoT hub hostname)
         */
        hubName?: string;
        /**
         * The name of the policy used to connect to the Azure IoT Hub service.
         */
        keyName: string;
        /**
         * The shared access signature token used to authenticate the connection with the Azure IoT hub.
         */
        sharedAccessSignature: string | SharedAccessSignature;
    }
    interface ServiceReceiver extends Receiver {
        complete(message: Message, done?: Callback<results.MessageCompleted>): void;
        abandon(message: Message, done?: Callback<results.MessageAbandoned>): void;
        reject(message: Message, done?: Callback<results.MessageRejected>): void;
    }
    interface Transport extends EventEmitter {
        connect(done?: Callback<results.Connected>): void;
        disconnect(done: Callback<results.Disconnected>): void;
        send(deviceId: string, message: Message, done?: Callback<results.MessageEnqueued>): void;
        getFeedbackReceiver(done: Callback<ServiceReceiver>): void;
        getFileNotificationReceiver(done: Callback<ServiceReceiver>): void;
    }
    type TransportCtor = new (config: Client.TransportConfigOptions) => Client.Transport;
}
