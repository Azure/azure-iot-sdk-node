import { Message, results, Callback, ErrorCallback } from 'azure-iot-common';
import { ReceiverLink } from 'azure-iot-amqp-base';
import { EventEmitter } from 'events';
import { Client } from './client';
export declare class ServiceReceiver extends EventEmitter implements Client.ServiceReceiver {
    private _receiver;
    constructor(receiver: ReceiverLink);
    complete(message: Message, done: Callback<results.MessageCompleted>): void;
    complete(message: Message): Promise<results.MessageCompleted>;
    abandon(message: Message, done: Callback<results.MessageAbandoned>): void;
    abandon(message: Message): Promise<results.MessageAbandoned>;
    reject(message: Message, done: Callback<results.MessageRejected>): void;
    reject(message: Message): Promise<results.MessageRejected>;
    detach(callback: ErrorCallback): void;
    detach(): Promise<void>;
    forceDetach(err?: Error): void;
}
