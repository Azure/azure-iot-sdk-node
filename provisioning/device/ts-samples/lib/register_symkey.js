"use strict";
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
Object.defineProperty(exports, "__esModule", { value: true });
var azure_iot_device_mqtt_1 = require("azure-iot-device-mqtt");
var azure_iot_device_1 = require("azure-iot-device");
var azure_iot_device_2 = require("azure-iot-device");
// import { Http as ProvisioningTransport } from 'azure-iot-provisioning-device-http';
// import { Amqp as ProvisioningTransport } from 'azure-iot-provisioning-device-amqp';
// import { AmqpWs as ProvisioningTransport } from 'azure-iot-provisioning-device-amqp';
var azure_iot_provisioning_device_mqtt_1 = require("azure-iot-provisioning-device-mqtt");
// import { MqttWs as ProvisioningTransport } from 'azure-iot-provisioning-device-mqtt';
// Feel free to change the preceding import statement to anyone of the following if you would like to try another protocol.
var azure_iot_security_symmetric_key_1 = require("azure-iot-security-symmetric-key");
var azure_iot_provisioning_device_1 = require("azure-iot-provisioning-device");
//
// For the public clouds the address of the provisioning host would be: global.azure-devices-provisioning.net
//
var provisioningHost = process.env.PROVISIONING_HOST;
//
// You can find your idScope in the portal overview section for your dps instance.
//
var idScope = process.env.PROVISIONING_IDSCOPE;
//
// The registration id of the device to be registered.
//
var registrationId = process.env.PROVISIONING_REGISTRATION_ID;
var symmetricKey = process.env.PROVISIONING_SYMMETRIC_KEY;
var provisioningSecurityClient = new azure_iot_security_symmetric_key_1.SymmetricKeySecurityClient(registrationId, symmetricKey);
var provisioningClient = azure_iot_provisioning_device_1.ProvisioningDeviceClient.create(provisioningHost, idScope, new azure_iot_provisioning_device_mqtt_1.Mqtt(), provisioningSecurityClient);
// Register the device.
provisioningClient.setProvisioningPayload({ a: 'b' });
provisioningClient.register(function (err, result) {
    if (err) {
        console.log('error registering device: ' + err);
    }
    else {
        console.log('registration succeeded');
        console.log('assigned hub=' + result.assignedHub);
        console.log('deviceId=' + result.deviceId);
        console.log('payload=' + JSON.stringify(result.payload));
        var connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + symmetricKey;
        var hubClient_1 = azure_iot_device_1.Client.fromConnectionString(connectionString, azure_iot_device_mqtt_1.Mqtt);
        hubClient_1.open(function (err) {
            if (err) {
                console.error('Could not connect: ' + err.message);
            }
            else {
                console.log('Client connected');
                var message = new azure_iot_device_2.Message('Hello world');
                hubClient_1.sendEvent(message, function (err, res) {
                    if (err)
                        console.log('send error: ' + err.toString());
                    process.exit(1);
                });
            }
        });
    }
});
//# sourceMappingURL=register_symkey.js.map