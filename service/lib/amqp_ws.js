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
 * Transport class used by the [service client]{@link azure-iothub.Client} to connect to the Azure IoT hub using the AMQP protocol over secure websockets.
 * This class should not be used directly and instead be passed to one of the {@link azure-iothub.Client} factory methods: {@link azure-iothub.Client.fromConnectionString|fromConnectionString} or {@link azure-iothub.Client.fromSharedAccessSignature|fromSharedAccessSignature}.
 */
/*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_WS_16_001: [The `AmqpWs` constructor shall accept a config object with those four properties:
- `host` – (string) the fully-qualified DNS hostname of an IoT Hub
- `keyName` – (string) the name of a key that can be used to communicate with the IoT Hub instance
- `sharedAccessSignature–` (string) the key associated with the key name.]*/
/*Codes_SRS_NODE_IOTHUB_SERVICE_AMQP_WS_16_002: [`AmqpWs` should inherit from `Amqp`.]*/
var AmqpWs = /** @class */ (function (_super) {
    __extends(AmqpWs, _super);
    /**
     * @private
     */
    function AmqpWs(config) {
        return _super.call(this, config) || this;
    }
    AmqpWs.prototype._getConnectionUri = function () {
        return 'wss://' + this._config.host + ':443/$iothub/websocket';
    };
    return AmqpWs;
}(amqp_1.Amqp));
exports.AmqpWs = AmqpWs;
//# sourceMappingURL=amqp_ws.js.map