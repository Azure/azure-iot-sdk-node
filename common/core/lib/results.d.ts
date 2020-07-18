/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */
/**
 * @private
 */
export interface Result {
    transportObj?: any;
}
/**
 * Result returned when a message was successfully enqueued.
 */
export declare class MessageEnqueued implements Result {
    /**
     * @private
     */
    transportObj?: any;
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    constructor(transportObj?: any);
}
/**
 * Result returned when a message was successfully rejected.
 */
export declare class MessageCompleted implements Result {
    /**
     * @private
     */
    transportObj?: any;
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    constructor(transportObj?: any);
}
/**
 * Result returned when a message was successfully rejected.
 */
export declare class MessageRejected implements Result {
    /**
     * @private
     */
    transportObj?: any;
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    constructor(transportObj?: any);
}
/**
 * Result returned when a message was successfully abandoned.
 */
export declare class MessageAbandoned implements Result {
    /**
     * @private
     */
    transportObj?: any;
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    constructor(transportObj?: any);
}
/**
 * Result returned when a transport is successfully connected.
 */
export declare class Connected implements Result {
    /**
     * @private
     */
    transportObj?: any;
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    constructor(transportObj?: any);
}
/**
 * Result returned when a transport is successfully disconnected.
 */
export declare class Disconnected implements Result {
    /**
     * @private
     */
    transportObj?: any;
    /**
     * The reason why the disconnected event is emitted.
     */
    reason: string;
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    constructor(transportObj?: any, reason?: string);
}
/**
 * Result returned when a transport is successfully configured.
 */
export declare class TransportConfigured implements Result {
    /**
     * @private
     */
    transportObj?: any;
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    constructor(transportObj?: any);
}
/**
 * Result returned when a SAS token has been successfully updated.
 */
export declare class SharedAccessSignatureUpdated {
    /**
     * Boolean indicating whether the client needs to reconnect or not.
     */
    needToReconnect: boolean;
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    constructor(needToReconnect: boolean);
}
export declare type ResultWithHttpResponse<TResult> = {
    responseBody: TResult;
    httpResponse: any;
};
