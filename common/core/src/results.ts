/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */

'use strict';

export interface Result {
    tranportObj?: any;
}

/**
 * @class       module:azure-iot-common.MessageEnqueued
 * @classdesc   Result returned when a message was successfully enqueued.
 *
 * @property {Object} transportObj  The transport-specific object
 *
 * @augments {Object}
 */
export class MessageEnqueued implements Result {
  transportObj?: any;
  constructor(transportObj?: any) {
    this.transportObj = transportObj;
  }
}

/**
 * @class       module:azure-iot-common.MessageCompleted
 * @classdesc   Result returned when a message was successfully rejected.
 *
 * @property {Object} transportObj  The transport-specific object
 *
 * @augments {Object}
 */
export class MessageCompleted implements Result {
  transportObj?: any;
  constructor(transportObj?: any) {
    this.transportObj = transportObj;
  }
}

/**
 * @class       module:azure-iot-common.MessageRejected
 * @classdesc   Result returned when a message was successfully rejected.
 *
 * @property {Object} transportObj  The transport-specific object
 *
 * @augments {Object}
 */
export class MessageRejected implements Result {
  transportObj?: any;
  constructor(transportObj?: any) {
    this.transportObj = transportObj;
  }
}

/**
 * @class       module:azure-iot-common.MessageAbandoned
 * @classdesc   Result returned when a message was successfully abandoned.
 *
 * @property {Object} transportObj  The transport-specific object
 *
 * @augments {Object}
 */
export class MessageAbandoned implements Result {
  transportObj?: any;
  constructor(transportObj?: any) {
    this.transportObj = transportObj;
  }
}

/**
 * @class       module:azure-iot-common.Connected
 * @classdesc   Result returned when a transport is successfully connected.
 *
 * @property {Object} transportObj  The transport-specific object
 *
 * @augments {Object}
 */
export class Connected implements Result {
  transportObj?: any;
  constructor(transportObj?: any) {
    this.transportObj = transportObj;
  }
}

/**
 * @class       module:azure-iot-common.Disconnected
 * @classdesc   Result returned when a transport is successfully disconnected.
 *
 * @property {Object} transportObj  The transport-specific object.
 * @property {String} reason        The reason why the disconnected event is emitted.
 *
 * @augments {Object}
 */
export class Disconnected implements Result {
  transportObj?: any;
  reason: string;
  constructor(transportObj?: any, reason?: string) {
    this.transportObj = transportObj;
    this.reason = reason;
  }
}

/**
 * @class       module:azure-iot-common.TransportConfigured
 * @classdesc   Result returned when a transport is successfully configured.
 *
 * @property {Object} transportObj  The transport-specific object.
 *
 * @augments {Object}
 */
export class TransportConfigured implements Result {
  transportObj?: any;
  constructor(transportObj?: any) {
    this.transportObj = transportObj;
  }
}

/**
 * @class       module:azure-iot-common.SharedAccessSignatureUpdated
 * @classdesc   Result returned when a SAS token has been successfully updated.
 *
 * @param {Boolean} needToReconnect  Value indicating whether the client needs to reconnect or not.
 *
 * @augments {Object}
 */
export class SharedAccessSignatureUpdated {
  needToReconnect: boolean;
  constructor(needToReconnect: boolean) {
    this.needToReconnect = needToReconnect;
  }
}
