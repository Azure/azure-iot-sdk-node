import { results, Message, AuthenticationProvider, TransportConfig } from 'azure-iot-common';
import { MethodMessage, DeviceMethodResponse, DeviceTransport, DeviceClientOptions, TwinProperties } from 'azure-iot-device';
import { EventEmitter } from 'events';
import { MqttBaseTransportConfig } from 'azure-iot-mqtt-base';
/**
 * @class        module:azure-iot-device-mqtt.Mqtt
 * @classdesc    Provides MQTT transport for the device [client]{@link module:azure-iot-device.Client} class.
 *
 * This class is not meant to be used directly, instead it should just be passed to the [client]{@link module:azure-iot-device.Client} object.
 *
 * @param   {Object}    config  Configuration object derived from the connection string by the client.
 */
export declare class Mqtt extends EventEmitter implements DeviceTransport {
    /**
     * @private
     */
    protected _authenticationProvider: AuthenticationProvider;
    private _mqtt;
    private _twinClient;
    private _topicTelemetryPublish;
    private _fsm;
    private _topics;
    private _userAgentString;
    private _productInfo;
    private _mid;
    /**
     * @private
     */
    constructor(authenticationProvider: AuthenticationProvider, mqttBase?: any);
    /**
     * @private
     * @method              module:azure-iot-device-mqtt.Mqtt#connect
     * @description         Establishes the connection to the Azure IoT Hub instance using the MQTT protocol.
     *
     * @param {Function}    done   callback that shall be called when the connection is established.
     */
    connect(done?: (err?: Error, result?: any) => void): void;
    /**
     * @private
     * @method              module:azure-iot-device-mqtt.Mqtt#disconnect
     * @description         Terminates the connection to the IoT Hub instance.
     *
     * @param {Function}    done      Callback that shall be called when the connection is terminated.
     */
    disconnect(done?: (err?: Error, result?: any) => void): void;
    /**
     * @private
     * @method              module:azure-iot-device-mqtt.Mqtt#sendEvent
     * @description         Sends an event to the server.
     *
     * @param {Message}     message   Message used for the content of the event sent to the server.
     */
    sendEvent(message: Message, done?: (err?: Error, result?: any) => void): void;
    /**
     * @private
     * @method             module:azure-iot-device-mqtt.Mqtt#sendEventBatch
     * @description        Not Implemented.
     * @param {Message[]}  messages    The [messages]{@linkcode module:common/message.Message}
     *                                 to be sent.
     * @param {Function}   done        The callback to be invoked when `sendEventBatch`
     *                                 completes execution.
     */
    sendEventBatch(messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    /**
     * @private
     * @deprecated          // Implementation test belongs in the client.
     * @method              module:azure-iot-device-mqtt.Mqtt#complete
     * @description         Settles the message as complete and calls the done callback with the result.
     *
     * @param {Message}     message     The message to settle as complete.
     * @param {Function}    done        The callback that shall be called with the error or result object.
     */
    complete(message: Message, done?: (err?: Error, result?: any) => void): void;
    /**
     * @private
     * @deprecated          // Implementation test belongs in the client.
     * @method              module:azure-iot-device-mqtt.Mqtt#reject
     * @description         Settles the message as rejected and calls the done callback with the result.
     *
     * @throws {Error}      The MQTT transport does not support rejecting messages.
     */
    reject(): void;
    /**
     * @private
     * @deprecated          // Implementation test belongs in the client.
     * @method              module:azure-iot-device-mqtt.Mqtt#abandon
     * @description         Settles the message as abandoned and calls the done callback with the result.
     *
     * @throws {Error}      The MQTT transport does not support abandoning messages.
     */
    abandon(): void;
    /**
     * @private
     * @method          module:azure-iot-device-mqtt.Mqtt#updateSharedAccessSignature
     * @description     This methods sets the SAS token used to authenticate with the IoT Hub service.
     *
     * @param {String}        sharedAccessSignature  The new SAS token.
     * @param {Function}      done      The callback to be invoked when `updateSharedAccessSignature` completes.
     */
    updateSharedAccessSignature(sharedAccessSignature: string, done: (err?: Error, result?: any) => void): void;
    /**
     * @private
     * @method          module:azure-iot-device-mqtt.Mqtt#setOptions
     * @description     This methods sets the MQTT specific options of the transport.
     *
     * @param {object}        options   Options to set.  Currently for MQTT these are the x509 cert, key, and optional passphrase properties. (All strings)
     * @param {Function}      done      The callback to be invoked when `setOptions` completes.
     */
    setOptions(options: DeviceClientOptions, done?: (err?: Error, result?: any) => void): void;
    /**
     * @private
     * @method            module:azure-iot-device-mqtt.Mqtt.Mqtt#sendMethodResponse
     * @description       Sends the response for a device method call to the service.
     *
     * @param {Object}   response     This is the `response` object that was
     *                                produced by the device client object when a
     *                                C2D device method call was received.
     * @param {Function} done         The callback to be invoked when the response
     *                                has been sent to the service.
     *
     * @throws {Error}                If the `response` parameter is falsy or does
     *                                not have the expected shape.
     */
    sendMethodResponse(response: DeviceMethodResponse, done?: (err?: Error, result?: any) => void): void;
    /**
     * @private
     */
    onDeviceMethod(methodName: string, callback: (methodRequest: MethodMessage, methodResponse: DeviceMethodResponse) => void): void;
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
    enableInputMessages(callback: (err?: Error) => void): void;
    /**
     * @private
     */
    disableInputMessages(callback: (err?: Error) => void): void;
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
    sendOutputEvent(outputName: string, message: Message, done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    /**
     * @private
     */
    sendOutputEventBatch(outputName: string, messages: Message[], done: (err?: Error, result?: results.MessageEnqueued) => void): void;
    protected _getBaseTransportConfig(credentials: TransportConfig): MqttBaseTransportConfig;
    protected _configureEndpoints(credentials: TransportConfig): void;
    private _setupSubscription;
    private _removeSubscription;
    private _dispatchMqttMessage;
    private _onC2DMessage;
    private _extractPropertiesFromTopicPart;
    private _onInputMessage;
    private _onDeviceMethod;
    private _getEventTopicFromMessage;
    private _ensureAgentString;
}
