import { EventEmitter } from 'events';
import { Session } from 'rhea';
/**
 * @private
 * Handles claims based security (sending and receiving SAS tokens over AMQP links).
 * This resides in the amqp-base package because it's used by the device and service SDKs but
 * the life cycle of this object is actually managed by the upper layer of each transport.
 */
export declare class ClaimsBasedSecurityAgent extends EventEmitter {
    private static _putTokenSendingEndpoint;
    private static _putTokenReceivingEndpoint;
    private _rheaSession;
    private _fsm;
    private _senderLink;
    private _receiverLink;
    private _putToken;
    private _putTokensNotYetSent;
    constructor(session: Session);
    attach(callback: (err?: Error) => void): void;
    detach(callback: (err?: Error) => void): void;
    forceDetach(): void;
    /**
     * @method             module:azure-iot-amqp-base.Amqp#putToken
     * @description        Sends a put token operation to the IoT Hub to provide authentication for a device.
     * @param              audience          The path that describes what is being authenticated.  An example would be
     *                                       hub.azure-devices.net%2Fdevices%2Fmydevice
     * @param              token             The actual sas token being used to authenticate the device.  For the most
     *                                       part the audience is likely to be the sr field of the token.
     * @param {Function}   putTokenCallback  Called when the put token operation terminates.
     */
    putToken(audience: string, token: string, putTokenCallback: (err?: Error) => void): void;
    private _removeExpiredPutTokens;
}
