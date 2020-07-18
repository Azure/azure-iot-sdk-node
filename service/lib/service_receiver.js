// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_amqp_base_1 = require("azure-iot-amqp-base");
var events_1 = require("events");
var ServiceReceiver = /** @class */ (function (_super) {
    __extends(ServiceReceiver, _super);
    function ServiceReceiver(receiver) {
        var _this = _super.call(this) || this;
        _this._receiver = receiver;
        /*Codes_SRS_NODE_SERVICE_RECEIVER_16_001: [The constructor shall subscribe to the `message` event of the `ReceiverLink` object passed as argument.]*/
        _this._receiver.on('message', function (amqpMessage) {
            /*Codes_SRS_NODE_SERVICE_RECEIVER_16_006: [The `ServiceReceiver` class shall convert any `AmqpMessage` received with the `message` event from the `ReceiverLink` object into `Message` objects and emit a `message` event with that newly created `Message` object for argument.]*/
            _this.emit('message', azure_iot_amqp_base_1.AmqpMessage.toMessage(amqpMessage));
        });
        /*Codes_SRS_NODE_SERVICE_RECEIVER_16_002: [The constructor shall subscribe to the `error` event of the `ReceiverLink` object passed as argument.]*/
        _this._receiver.on('error', function (err) {
            /*Codes_SRS_NODE_SERVICE_RECEIVER_16_007: [Any error event received from the `ReceiverLink` object shall be forwarded as is.]*/
            _this.emit('error', err);
        });
        return _this;
    }
    ServiceReceiver.prototype.complete = function (message, done) {
        var _this = this;
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            /*Codes_SRS_NODE_SERVICE_RECEIVER_16_003: [The `complete` method shall call the `complete` method on the `ReceiverLink` object and pass it the `AmqpMessage` stored within the `transportObj` property of the `Message` object as well as the `done` callback passed as argument.]*/
            _this._receiver.complete(message.transportObj, _callback);
        }, done);
    };
    ServiceReceiver.prototype.abandon = function (message, done) {
        var _this = this;
        /*Codes_SRS_NODE_SERVICE_RECEIVER_16_004: [The `abandon` method shall call the `abandon` method on the `ReceiverLink` object and pass it the `AmqpMessage` stored within the `transportObj` property of the `Message` object as well as the `done` callback passed as argument.]*/
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            _this._receiver.abandon(message.transportObj, _callback);
        }, done);
    };
    ServiceReceiver.prototype.reject = function (message, done) {
        var _this = this;
        /*Codes_SRS_NODE_SERVICE_RECEIVER_16_005: [The `reject` method shall call the `reject` method on the `ReceiverLink` object and pass it the `AmqpMessage` stored within the `transportObj` property of the `Message` object as well as the `done` callback passed as argument.]*/
        return azure_iot_common_1.callbackToPromise(function (_callback) {
            _this._receiver.reject(message.transportObj, _callback);
        }, done);
    };
    ServiceReceiver.prototype.detach = function (callback) {
        var _this = this;
        /*Codes_SRS_NODE_SERVICE_RECEIVER_16_008: [The `detach` method shall call the `detach` method on the `ReceiverLink` object and pass it its `callback` argument.]*/
        return azure_iot_common_1.errorCallbackToPromise(function (_callback) {
            _this._receiver.detach(_callback);
        }, callback);
    };
    ServiceReceiver.prototype.forceDetach = function (err) {
        /*Codes_SRS_NODE_SERVICE_RECEIVER_16_009: [The `forceDetach` method shall call the `forceDetach` method on the `ReceiverLink` object and pass it its `err` argument.]*/
        this._receiver.forceDetach(err);
    };
    return ServiceReceiver;
}(events_1.EventEmitter));
exports.ServiceReceiver = ServiceReceiver;
//# sourceMappingURL=service_receiver.js.map