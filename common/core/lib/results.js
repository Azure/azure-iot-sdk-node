/*! Copyright (c) Microsoft. All rights reserved.
 *! Licensed under the MIT license. See LICENSE file in the project root for full license information.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Result returned when a message was successfully enqueued.
 */
var MessageEnqueued = /** @class */ (function () {
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    function MessageEnqueued(transportObj) {
        this.transportObj = transportObj;
    }
    return MessageEnqueued;
}());
exports.MessageEnqueued = MessageEnqueued;
/**
 * Result returned when a message was successfully rejected.
 */
var MessageCompleted = /** @class */ (function () {
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    function MessageCompleted(transportObj) {
        this.transportObj = transportObj;
    }
    return MessageCompleted;
}());
exports.MessageCompleted = MessageCompleted;
/**
 * Result returned when a message was successfully rejected.
 */
var MessageRejected = /** @class */ (function () {
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    function MessageRejected(transportObj) {
        this.transportObj = transportObj;
    }
    return MessageRejected;
}());
exports.MessageRejected = MessageRejected;
/**
 * Result returned when a message was successfully abandoned.
 */
var MessageAbandoned = /** @class */ (function () {
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    function MessageAbandoned(transportObj) {
        this.transportObj = transportObj;
    }
    return MessageAbandoned;
}());
exports.MessageAbandoned = MessageAbandoned;
/**
 * Result returned when a transport is successfully connected.
 */
var Connected = /** @class */ (function () {
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    function Connected(transportObj) {
        this.transportObj = transportObj;
    }
    return Connected;
}());
exports.Connected = Connected;
/**
 * Result returned when a transport is successfully disconnected.
 */
var Disconnected = /** @class */ (function () {
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    function Disconnected(transportObj, reason) {
        this.transportObj = transportObj;
        this.reason = reason;
    }
    return Disconnected;
}());
exports.Disconnected = Disconnected;
/**
 * Result returned when a transport is successfully configured.
 */
var TransportConfigured = /** @class */ (function () {
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    function TransportConfigured(transportObj) {
        this.transportObj = transportObj;
    }
    return TransportConfigured;
}());
exports.TransportConfigured = TransportConfigured;
/**
 * Result returned when a SAS token has been successfully updated.
 */
var SharedAccessSignatureUpdated = /** @class */ (function () {
    /**
     * @private
     * @constructor
     * @param transportObj optional transport object to help with debugging.
     */
    function SharedAccessSignatureUpdated(needToReconnect) {
        this.needToReconnect = needToReconnect;
    }
    return SharedAccessSignatureUpdated;
}());
exports.SharedAccessSignatureUpdated = SharedAccessSignatureUpdated;
//# sourceMappingURL=results.js.map