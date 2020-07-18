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
var amqp_js_1 = require("./amqp.js");
/**
 * Constructs a transport object that can be used by the device {@link azure-iot-device.Client} to send and receive messages to and from an IoT Hub instance, using the AMQP protocol over secure websockets.
 * This class overloads the constructor of the base {@link azure-iot-device-amqp.Amqp} class from the AMQP transport, and inherits all methods from it.
 *
 * @augments module:azure-iot-device-amqp.Amqp
 */
var AmqpWs = /** @class */ (function (_super) {
    __extends(AmqpWs, _super);
    /**
     * @private
     * @constructor
     * @param {Object}  config   Configuration object generated from the connection string by the client.
     */
    function AmqpWs(authenticationProvider) {
        return _super.call(this, authenticationProvider) || this;
    }
    AmqpWs.prototype._getConnectionUri = function (credentials) {
        return 'wss://' + (credentials.gatewayHostName || credentials.host) + ':443/$iothub/websocket';
    };
    return AmqpWs;
}(amqp_js_1.Amqp));
exports.AmqpWs = AmqpWs;
//# sourceMappingURL=amqp_ws.js.map