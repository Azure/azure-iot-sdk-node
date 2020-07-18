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
 * Provides MQTT over WebSockets transport for the device [client]{@link module:azure-iot-device.Client} class.
 * This class is not meant to be used directly, instead it should just be passed to the [client]{@link module:azure-iot-device.Client} object.
 */
/*Codes_SRS_NODE_DEVICE_MQTT_12_001: [The constructor shall accept the transport configuration structure.]*/
/*Codes_SRS_NODE_DEVICE_MQTT_12_002: [The constructor shall store the configuration structure in a member variable.]*/
/*Codes_SRS_NODE_DEVICE_MQTT_12_003: [The constructor shall create an base transport object and store it in a member variable.]*/
var MqttWs = /** @class */ (function (_super) {
    __extends(MqttWs, _super);
    /**
     * @private
     * @constructor
     * @param   {Object}    config  Configuration object derived from the connection string by the client.
     */
    function MqttWs(authenticationProvider, mqttBase) {
        return _super.call(this, authenticationProvider, mqttBase) || this;
        /*Codes_SRS_NODE_DEVICE_MQTT_16_017: [The `MqttWs` constructor shall initialize the `uri` property of the `config` object to `wss://<host>:443/$iothub/websocket`.]*/
    }
    MqttWs.prototype._getBaseTransportConfig = function (credentials) {
        var baseConfig = _super.prototype._getBaseTransportConfig.call(this, credentials);
        baseConfig.uri = 'wss://' + (credentials.gatewayHostName || credentials.host) + ':443/$iothub/websocket';
        return baseConfig;
    };
    return MqttWs;
}(mqtt_1.Mqtt));
exports.MqttWs = MqttWs;
//# sourceMappingURL=mqtt_ws.js.map