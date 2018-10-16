/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */

'use strict';

/**
 * @private
 */
export interface Result {
    transportObj?: any;
}

/**
 * Result returned when a message was successfully enqueued.
 */
export class MessageEnqueued implements Result {
  /**
   * @private
   */
  transportObj?: any;
  /**
   * @private
   * @constructor
   * @param transportObj optional transport object to help with debugging.
   */
  constructor(transportObj?: any) {
    this.transportObj = transportObj;
  }
}

/**
 * Result returned when a message was successfully rejected.
 */
export class MessageCompleted implements Result {
  /**
   * @private
   */
  transportObj?: any;
  /**
   * @private
   * @constructor
   * @param transportObj optional transport object to help with debugging.
   */
  constructor(transportObj?: any) {
    this.transportObj = transportObj;
  }
}

/**
 * Result returned when a message was successfully rejected.
 */
export class MessageRejected implements Result {
  /**
   * @private
   */
  transportObj?: any;
  /**
   * @private
   * @constructor
   * @param transportObj optional transport object to help with debugging.
   */
  constructor(transportObj?: any) {
    this.transportObj = transportObj;
  }
}

/**
 * Result returned when a message was successfully abandoned.
 */
export class MessageAbandoned implements Result {
  /**
   * @private
   */
  transportObj?: any;
  /**
   * @private
   * @constructor
   * @param transportObj optional transport object to help with debugging.
   */
  constructor(transportObj?: any) {
    this.transportObj = transportObj;
  }
}

/**
 * Result returned when a transport is successfully connected.
 */
export class Connected implements Result {
  /**
   * @private
   */
  transportObj?: any;
  /**
   * @private
   * @constructor
   * @param transportObj optional transport object to help with debugging.
   */
  constructor(transportObj?: any) {
    this.transportObj = transportObj;
  }
}

/**
 * Result returned when a transport is successfully disconnected.
 */
export class Disconnected implements Result {
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
  constructor(transportObj?: any, reason?: string) {
    this.transportObj = transportObj;
    this.reason = reason;
  }
}

/**
 * Result returned when a transport is successfully configured.
 */
export class TransportConfigured implements Result {
  /**
   * @private
   */
  transportObj?: any;
  /**
   * @private
   * @constructor
   * @param transportObj optional transport object to help with debugging.
   */
  constructor(transportObj?: any) {
    this.transportObj = transportObj;
  }
}

/**
 * Result returned when a SAS token has been successfully updated.
 */
export class SharedAccessSignatureUpdated {
  /**
   * Boolean indicating whether the client needs to reconnect or not.
   */
  needToReconnect: boolean;
  /**
   * @private
   * @constructor
   * @param transportObj optional transport object to help with debugging.
   */
  constructor(needToReconnect: boolean) {
    this.needToReconnect = needToReconnect;
  }
}

export type ResultWithHttpResponse<TResult> = {
  responseBody: TResult;
  httpResponse: any;
};
