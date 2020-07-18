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
var amqp_1 = require("./amqp");
/**
 * Transport used to provision a device over AMQP over Websockets.
 */
var AmqpWs = /** @class */ (function (_super) {
    __extends(AmqpWs, _super);
    /**
     * @private
     */
    function AmqpWs(amqpBase) {
        return _super.call(this, amqpBase) || this;
    }
    /**
     * @private
     */
    AmqpWs.prototype._getConnectionUri = function (request) {
        return 'wss://' + request.provisioningHost + ':443/$iothub/websocket';
    };
    return AmqpWs;
}(amqp_1.Amqp));
exports.AmqpWs = AmqpWs;
//# sourceMappingURL=amqp_ws.js.map