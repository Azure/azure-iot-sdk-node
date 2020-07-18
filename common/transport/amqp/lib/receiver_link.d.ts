import { EventEmitter } from 'events';
import { AmqpError, Session, ReceiverOptions } from 'rhea';
import { results } from 'azure-iot-common';
import { AmqpMessage } from './amqp_message';
import { AmqpLink } from './amqp_link_interface';
/**
 * @private
 * State machine used to manage AMQP receiver links
 *
 * @extends {EventEmitter}
 * @implements {AmqpLink}
 *
 * @fires ReceiverLink#message
 * @fires ReceiverLink#error
 */
export declare class ReceiverLink extends EventEmitter implements AmqpLink {
    private _linkAddress;
    private _rheaReceiver;
    private _fsm;
    private _rheaSession;
    private _receiverCloseOccurred;
    private _attachingCallback;
    private _detachingCallback;
    private _indicatedError;
    private _rheaReceiverName;
    private _combinedOptions;
    private _undisposedDeliveries;
    constructor(linkAddress: string, linkOptions: ReceiverOptions, session: Session);
    detach(callback: (err?: Error) => void, err?: Error | AmqpError): void;
    forceDetach(err?: Error | AmqpError): void;
    attach(callback: (err?: Error) => void): void;
    accept(message: AmqpMessage, callback?: (err?: Error, result?: results.MessageCompleted) => void): void;
    /**
     * @deprecated Use accept(message, callback) instead (to adhere more closely to the AMQP10 lingo).
     */
    complete(message: AmqpMessage, callback?: (err?: Error, result?: results.MessageCompleted) => void): void;
    reject(message: AmqpMessage, callback?: (err?: Error, result?: results.MessageRejected) => void): void;
    abandon(message: AmqpMessage, callback?: (err?: Error, result?: results.MessageAbandoned) => void): void;
    private _findDeliveryRecord;
    private _safeCallback;
    private _getErrorName;
}
