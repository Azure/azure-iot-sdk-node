import { EventEmitter } from 'events';
import { AuthenticationProvider } from 'azure-iot-common';
import { TwinProperties } from 'azure-iot-device';
/**
 * @private
 * @class        module:azure-iot-device-amqp.AmqpTwinClient
 * @classdesc    Acts as a client for device-twin traffic
 *
 * @param {Object} config                        configuration object
 * @fires AmqpTwinClient#error                   an error has occurred
 * @fires AmqpTwinClient#desiredPropertyUpdate   a desired property has been updated
 * @throws {ReferenceError}                      If client parameter is falsy.
 *
 */
export declare class AmqpTwinClient extends EventEmitter {
    private _client;
    private _authenticationProvider;
    private _endpoint;
    private _senderLink;
    private _receiverLink;
    private _fsm;
    private _pendingTwinRequests;
    private _messageHandler;
    private _errorHandler;
    constructor(authenticationProvider: AuthenticationProvider, client: any);
    getTwin(callback: (err: Error, twin?: TwinProperties) => void): void;
    updateTwinReportedProperties(patch: any, callback: (err?: Error) => void): void;
    enableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
    disableTwinDesiredPropertiesUpdates(callback: (err?: Error) => void): void;
    /**
     * Necessary for the client to be able to properly detach twin links
     * attach() isn't necessary because it's done by the FSM automatically when one of the APIs is called.
     */
    detach(callback: (err?: Error) => void): void;
    private _generateTwinLinkProperties;
    private _onResponseMessage;
    private _onDesiredPropertyDelta;
    private _sendTwinRequest;
    private _translateErrorResponse;
}
