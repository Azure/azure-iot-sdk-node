import { Stream } from 'stream';
import { EventEmitter } from 'events';
import { results, Message, X509, Callback } from 'azure-iot-common';
import { SharedAccessSignature as CommonSharedAccessSignature } from 'azure-iot-common';
import { RetryPolicy } from 'azure-iot-common';
import { DeviceMethodRequest, DeviceMethodResponse } from './device_method';
import { Twin, TwinProperties } from './twin';
import { DeviceClientOptions } from './interfaces';
/**
 * @private
 */
export declare abstract class InternalClient extends EventEmitter {
    /**
     * @private
     */
    static sasRenewalInterval: number;
    /**
     * @private
     */
    _transport: DeviceTransport;
    /**
     * @private
     */
    _twin: Twin;
    /**
     * @private
     * Maximum timeout (in milliseconds) used to consider an operation failed.
     * The operation will be retried according to the retry policy set with {@link azure-iot-device.Client.setRetryPolicy} method (or {@link azure-iot-common.ExponentialBackoffWithJitter} by default) until this value is reached.)
     */
    protected _maxOperationTimeout: number;
    protected _retryPolicy: RetryPolicy;
    private _methodCallbackMap;
    private _disconnectHandler;
    private _methodsEnabled;
    constructor(transport: DeviceTransport, connStr?: string);
    updateSharedAccessSignature(sharedAccessSignature: string, updateSasCallback?: Callback<results.SharedAccessSignatureUpdated>): void;
    open(openCallback: Callback<results.Connected>): void;
    open(): Promise<results.Connected>;
    sendEvent(message: Message, sendEventCallback: Callback<results.MessageEnqueued>): void;
    sendEvent(message: Message): Promise<results.MessageEnqueued>;
    sendEventBatch(messages: Message[], sendEventBatchCallback: Callback<results.MessageEnqueued>): void;
    sendEventBatch(messages: Message[]): Promise<results.MessageEnqueued>;
    close(closeCallback: Callback<results.Disconnected>): void;
    close(): Promise<results.Disconnected>;
    setTransportOptions(options: any, done: Callback<results.TransportConfigured>): void;
    setTransportOptions(options: any): Promise<results.TransportConfigured>;
    /**
     * Passes options to the `Client` object that can be used to configure the transport.
     * @param options   A {@link DeviceClientOptions} object.
     * @param [done]    The optional callback to call once the options have been set.
     * @returns {Promise<results.TransportConfigured> | void} Promise if no callback function was passed, void otherwise.
     */
    setOptions(options: DeviceClientOptions, done: Callback<results.TransportConfigured>): void;
    setOptions(options: DeviceClientOptions): Promise<results.TransportConfigured>;
    complete(message: Message, completeCallback: Callback<results.MessageCompleted>): void;
    complete(message: Message): Promise<results.MessageCompleted>;
    reject(message: Message, rejectCallback: Callback<results.MessageRejected>): void;
    reject(message: Message): Promise<results.MessageRejected>;
    abandon(message: Message, abandonCallback: Callback<results.MessageAbandoned>): void;
    abandon(message: Message): Promise<results.MessageAbandoned>;
    getTwin(done: Callback<Twin>): void;
    getTwin(): Promise<Twin>;
    /**
     * Sets the retry policy used by the client on all operations. The default is {@link azure-iot-common.ExponentialBackoffWithJitter|ExponentialBackoffWithJitter}.
     * @param policy {RetryPolicy}  The retry policy that should be used for all future operations.
     */
    setRetryPolicy(policy: RetryPolicy): void;
    protected _onDeviceMethod(methodName: string, callback: (request: DeviceMethodRequest, response: DeviceMethodResponse) => void): void;
    private _invokeSetOptions;
    private _validateDeviceMethodInputs;
    private _addMethodCallback;
    private _enableMethods;
    private _closeTransport;
}
/**
 * @private
 * Configuration parameters used to authenticate and connect a Device Client with an Azure IoT hub.
 */
export interface Config {
    /**
     * Device unique identifier (as it exists in the device registry).
     */
    deviceId: string;
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
     * If using symmetric key authentication, this is used to generate the shared access signature tokens used to authenticate the connection.
     */
    symmetricKey?: string;
    /**
     * The shared access signature token used to authenticate the connection with the Azure IoT hub.
     */
    sharedAccessSignature?: string | CommonSharedAccessSignature;
    /**
     * Structure containing the certificate and associated key used to authenticate the connection if using x509 certificates as the authentication method.
     */
    x509?: X509;
}
export interface DeviceTransport extends EventEmitter {
    on(type: 'error', func: (err: Error) => void): this;
    on(type: 'disconnect', func: (err?: Error) => void): this;
    connect(done: (err?: Error, result?: results.Connected) => void): void;
    disconnect(done: (err?: Error, result?: results.Disconnected) => void): void;
    setOptions?(options: DeviceClientOptions, done: (err?: Error, result?: results.TransportConfigured) => void): void;
    updateSharedAccessSignature(sharedAccessSignature: string, done: (err?: Error, result?: results.SharedAccessSignatureUpdated) => void): void;
    sendEvent(message: Message, done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    sendEventBatch(messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    on(type: 'message', func: (msg: Message) => void): this;
    complete(message: Message, done: (err?: Error, result?: results.MessageCompleted) => void): void;
    reject(message: Message, done: (err?: Error, results?: results.MessageRejected) => void): void;
    abandon(message: Message, done: (err?: Error, results?: results.MessageAbandoned) => void): void;
    enableC2D(callback: (err?: Error) => void): void;
    disableC2D(callback: (err?: Error) => void): void;
    on(type: 'twinDesiredPropertiesUpdate', func: (desiredProps: any) => void): this;
    getTwin(callback: (err?: Error, twin?: TwinProperties) => void): void;
    updateTwinReportedProperties(patch: any, callback: (err?: Error) => void): void;
    enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
    disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
    sendMethodResponse(response: DeviceMethodResponse, done?: (err?: Error, result?: any) => void): void;
    onDeviceMethod(methodName: string, methodCallback: (request: MethodMessage, response: DeviceMethodResponse) => void): void;
    enableMethods(callback: (err?: Error) => void): void;
    disableMethods(callback: (err?: Error) => void): void;
    enableInputMessages(callback: (err?: Error) => void): void;
    disableInputMessages(callback: (err?: Error) => void): void;
    on(type: 'inputMessage', func: (inputName: string, msg: Message) => void): this;
    sendOutputEvent(outputName: string, message: Message, done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    sendOutputEventBatch(outputName: string, messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void;
}
export interface BlobUpload {
    uploadToBlob(blobName: string, stream: Stream, steamLength: number, done: (err?: Error) => void): void;
    updateSharedAccessSignature(sharedAccessSignature: string): void;
}
/**
 * @private
 * @deprecated
 */
export interface MethodMessage {
    methods: {
        methodName: string;
    };
    requestId: string;
    properties: {
        [key: string]: string;
    };
    body: Buffer;
}
export declare type TransportCtor = new (config: Config) => DeviceTransport;
