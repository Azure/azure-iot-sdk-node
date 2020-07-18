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
var timeout_1 = require("async/timeout");
var uuid = require("uuid");
var dbg = require("debug");
var debug = dbg('longhaul:d2c_sender');
var azure_iot_common_1 = require("azure-iot-common");
var azure_iot_device_1 = require("azure-iot-device");
var events_1 = require("events");
var D2CSender = /** @class */ (function (_super) {
    __extends(D2CSender, _super);
    function D2CSender(connStr, protocol, sendInterval, sendTimeout) {
        var _this = _super.call(this) || this;
        _this._sendInterval = sendInterval;
        _this._sendTimeout = sendTimeout;
        var authProvider = azure_iot_device_1.SharedAccessKeyAuthenticationProvider.fromConnectionString(connStr);
        _this._client = azure_iot_device_1.Client.fromAuthenticationProvider(authProvider, protocol);
        _this._client.on('error', function (err) {
            debug('error emitted by client: ' + err.toString());
            _this.stop(function (stopErr) {
                debug('error stopping: ' + stopErr.toString());
            });
        });
        _this._client.on('disconnect', function (err) {
            _this.stop(function (stopErr) {
                debug('error stopping: ' + stopErr.toString());
            });
        });
        return _this;
    }
    D2CSender.prototype.start = function (callback) {
        var _this = this;
        debug('starting...');
        this._client.open(function (err) {
            if (err) {
                debug('failed to start: ' + err.toString());
            }
            else {
                debug('connected!');
                _this._startSending();
            }
            callback(err);
        });
    };
    D2CSender.prototype.stop = function (callback) {
        var _this = this;
        debug('stopping');
        if (this._timer) {
            debug('clearing timeout');
            clearTimeout(this._timer);
            this._timer = null;
        }
        this._client.close(function (err) {
            if (err) {
                debug('error while closing: ', err.toString());
            }
            else {
                debug('closed');
            }
            _this._client.removeAllListeners();
            _this._client = null;
            callback(err);
        });
    };
    D2CSender.prototype._startSending = function () {
        debug('starting send timer: 1 message every ' + this._sendInterval + ' milliseconds');
        this._timer = setTimeout(this._send.bind(this), this._sendInterval);
    };
    D2CSender.prototype._send = function () {
        var _this = this;
        var id = uuid.v4();
        var msg = new azure_iot_common_1.Message(id);
        msg.messageId = id;
        debug('sending message with id: ' + id);
        timeout_1.default(this._client.sendEvent.bind(this._client), this._sendTimeout)(msg, function (err) {
            if (err) {
                debug('error sending message: ' + id + ': ' + err.message);
                _this.emit('error', err);
            }
            else {
                debug('sent message with id: ' + id);
                _this._timer = setTimeout(_this._send.bind(_this), _this._sendInterval);
                _this.emit('sent', id);
            }
        });
    };
    return D2CSender;
}(events_1.EventEmitter));
exports.D2CSender = D2CSender;
//# sourceMappingURL=d2c_sender.js.map