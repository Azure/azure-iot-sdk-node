import { EventEmitter } from 'events';
import { AmqpError, Session, SenderOptions } from 'rhea';
import { results } from 'azure-iot-common';
import { AmqpMessage } from './amqp_message';
import { AmqpLink } from './amqp_link_interface';
/**
 * @private
 * State machine used to manage AMQP sender links
 *
 * @extends {EventEmitter}
 * @implements {AmqpLink}
 */
export declare class SenderLink extends EventEmitter implements AmqpLink {
    private _linkAddress;
    private _rheaSender;
    private _fsm;
    private _rheaSession;
    private _combinedOptions;
    private _senderCloseOccurred;
    private _attachingCallback;
    private _detachingCallback;
    private _indicatedError;
    private _rheaSenderName;
    private _unsentMessageQueue;
    private _pendingMessageDictionary;
    constructor(linkAddress: string, linkOptions: SenderOptions, session: Session);
    detach(callback: (err?: Error) => void, err?: Error | AmqpError): void;
    forceDetach(err?: Error | AmqpError): void;
    attach(callback: (err?: Error) => void): void;
    send(message: AmqpMessage, callback: (err?: Error, result?: results.MessageEnqueued) => void): void;
    private _getErrorName;
}
