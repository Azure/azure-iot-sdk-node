import { EventEmitter } from 'events';
export declare class D2CSender extends EventEmitter {
    private _timer;
    private _client;
    private _sendInterval;
    private _sendTimeout;
    constructor(connStr: string, protocol: any, sendInterval: number, sendTimeout: number);
    start(callback: (err?: Error) => void): void;
    stop(callback: (err?: Error) => void): void;
    private _startSending;
    private _send;
}
