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
var mqtt_1 = require("./mqtt");
/**
 * Transport used to provision a device over MQTT over Websockets.
 */
var MqttWs = /** @class */ (function (_super) {
    __extends(MqttWs, _super);
    /**
     * @private
     */
    function MqttWs(mqttBase) {
        return _super.call(this, mqttBase) || this;
    }
    /**
     * @private
     */
    /* Codes_SRS_NODE_PROVISIONING_MQTT_18_049: [ When connecting using websockets, `Mqtt`Ws shall set the uri passed into the transport to 'wss://<host>:443/$iothub/websocket'.] */
    MqttWs.prototype._getConnectionUri = function (request) {
        return 'wss://' + request.provisioningHost + ':443/$iothub/websocket';
    };
    return MqttWs;
}(mqtt_1.Mqtt));
exports.MqttWs = MqttWs;
//# sourceMappingURL=mqtt_ws.js.map