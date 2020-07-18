import { results, Message, AuthenticationProvider, Callback, DoubleValueCallback } from 'azure-iot-common';
import { InternalClient, DeviceTransport } from './internal_client';
import { MethodParams, MethodCallback, MethodClient, DeviceMethodRequest, DeviceMethodResponse, MethodResult } from './device_method';
import { DeviceClientOptions } from './interfaces';
/**
 * IoT Hub device client used to connect a device with an Azure IoT hub.
 *
 * Users of the SDK should call one of the factory methods,
 * {@link azure-iot-device.Client.fromConnectionString|fromConnectionString}
 * or {@link azure-iot-device.Client.fromSharedAccessSignature|fromSharedAccessSignature}
 * to create an IoT Hub device client.
 */
export declare class ModuleClient extends InternalClient {
    private _inputMessagesEnabled;
    private _moduleDisconnectHandler;
    private _methodClient;
    /**
     * @private
     * @constructor
     * @param {Object}  transport         An object that implements the interface
     *                                    expected of a transport object, e.g.,
     *                                    {@link azure-iot-device-mqtt.Mqtt|Mqtt}.
     * @param {Object}  restApiClient     the RestApiClient object to use for HTTP calls
     */
    constructor(transport: DeviceTransport, methodClient: MethodClient);
    /**
     * Sends an event to the given module output
     * @param outputName Name of the output to send the event to
     * @param message Message to send to the given output
     * @param [callback] Optional function to call when the operation has been queued.
     * @returns {Promise<results.MessageEnqueued> | void} Promise if no callback function was passed, void otherwise.
     */
    sendOutputEvent(outputName: string, message: Message, callback: Callback<results.MessageEnqueued>): void;
    sendOutputEvent(outputName: string, message: Message): Promise<results.MessageEnqueued>;
    /**
     * Sends an array of events to the given module output
     * @param outputName Name of the output to send the events to
     * @param message Messages to send to the given output
     * @param [callback] Function to call when the operations have been queued.
     * @returns {Promise<results.MessageEnqueued> | void} Optional promise if no callback function was passed, void otherwise.
     */
    sendOutputEventBatch(outputName: string, messages: Message[], callback: Callback<results.MessageEnqueued>): void;
    sendOutputEventBatch(outputName: string, messages: Message[]): Promise<results.MessageEnqueued>;
    /**
     * Closes the transport connection and destroys the client resources.
     *
     * *Note: After calling this method the ModuleClient object cannot be reused.*
     *
     * @param [closeCallback] Optional function to call once the transport is disconnected and the client closed.
     * @returns {Promise<results.Disconnected> | void} Promise if no callback function was passed, void otherwise.
     */
    close(closeCallback: Callback<results.Disconnected>): void;
    close(): Promise<results.Disconnected>;
    _invokeMethod(deviceId: string, methodParams: MethodParams, callback: MethodCallback): void;
    _invokeMethod(deviceId: string, moduleId: string, methodParams: MethodParams, callback: MethodCallback): void;
    /**
     * Invokes a method on a downstream device or on another module on the same IoTEdge device. Please note that this feature only works when
     * the module is being run as part of an IoTEdge device.
     *
     * @param deviceId      target device identifier
     * @param moduleId      target module identifier on the device identified with the `deviceId` argument
     * @param methodParams  parameters of the direct method call
     * @param [callback]    optional callback that will be invoked either with an Error object or the result of the method call.
     * @returns {Promise<MethodResult> | void} Promise if no callback function was passed, void otherwise.
     */
    invokeMethod(deviceId: string, methodParams: MethodParams, callback: Callback<MethodResult>): void;
    invokeMethod(deviceId: string, moduleId: string, methodParams: MethodParams, callback: Callback<MethodResult>): void;
    invokeMethod(deviceId: string, methodParams: MethodParams): Promise<MethodResult>;
    invokeMethod(deviceId: string, moduleId: string, methodParams: MethodParams): Promise<MethodResult>;
    /**
     * Registers a callback for a method named `methodName`.
     *
     * @param methodName Name of the method that will be handled by the callback
     * @param callback Function that shall be called whenever a method request for the method called `methodName` is received.
     */
    onMethod(methodName: string, callback: DoubleValueCallback<DeviceMethodRequest, DeviceMethodResponse>): void;
    /**
     * Passes options to the `ModuleClient` object that can be used to configure the transport.
     * @param options   A {@link DeviceClientOptions} object.
     * @param [done]    Optional callback to call once the options have been set.
     * @returns {Promise<results.TransportConfigured> | void} Promise if no callback function was passed, void otherwise.
     */
    setOptions(options: DeviceClientOptions, done: Callback<results.TransportConfigured>): void;
    setOptions(options: DeviceClientOptions): Promise<results.TransportConfigured>;
    private _disableInputMessages;
    private _enableInputMessages;
    /**
     * Creates an IoT Hub device client from the given connection string using the given transport type.
     *
     * @param {String}    connStr        A connection string which encapsulates "device connect" permissions on an IoT hub.
     * @param {Function}  transportCtor  A transport constructor.
     *
     * @throws {ReferenceError}          If the connStr parameter is falsy.
     *
     * @returns {module:azure-iot-device.ModuleClient}
     */
    static fromConnectionString(connStr: string, transportCtor: any): ModuleClient;
    /**
     * Creates an IoT Hub module client from the given shared access signature using the given transport type.
     *
     * @param {String}    sharedAccessSignature      A shared access signature which encapsulates "device
     *                                  connect" permissions on an IoT hub.
     * @param {Function}  Transport     A transport constructor.
     *
     * @throws {ReferenceError}         If the connStr parameter is falsy.
     *
     * @returns {module:azure-iothub.Client}
     */
    static fromSharedAccessSignature(sharedAccessSignature: string, transportCtor: any): ModuleClient;
    /**
     * Creates an IoT Hub module client from the given authentication method and using the given transport type.
     * @param authenticationProvider  Object used to obtain the authentication parameters for the IoT hub.
     * @param transportCtor           Transport protocol used to connect to IoT hub.
     */
    static fromAuthenticationProvider(authenticationProvider: AuthenticationProvider, transportCtor: any): ModuleClient;
    /**
     * Creates an IoT Hub module client by using configuration information from the environment.
     *
     * If an environment variable called `EdgeHubConnectionString` or `IotHubConnectionString` exists, then that value is used and behavior is identical
     * to calling `fromConnectionString` passing that in. If those environment variables do not exist then the following variables MUST be defined:
     *
     *     - IOTEDGE_WORKLOADURI          URI for iotedged's workload API
     *     - IOTEDGE_DEVICEID             Device identifier
     *     - IOTEDGE_MODULEID             Module identifier
     *     - IOTEDGE_MODULEGENERATIONID   Module generation identifier
     *     - IOTEDGE_IOTHUBHOSTNAME       IoT Hub host name
     *     - IOTEDGE_AUTHSCHEME           Authentication scheme to use; must be "sasToken"
     *
     * @param transportCtor Transport protocol used to connect to IoT hub.
     * @param [callback]    Optional callback to invoke when the ModuleClient has been constructured or if an
     *                      error occurs while creating the client.
     * @returns {Promise<ModuleClient> | void} Promise if no callback function was passed, void otherwise.
     */
    static fromEnvironment(transportCtor: any, callback: Callback<ModuleClient>): void;
    static fromEnvironment(transportCtor: any): Promise<ModuleClient>;
    private static _fromEnvironmentEdge;
    private static _fromEnvironmentNormal;
    private static validateEnvironment;
}
