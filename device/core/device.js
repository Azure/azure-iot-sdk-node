// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

/**
 * The `azure-iot-device` module provides a means for devices to send events to and
 * receive messages from an Azure IoT Hub.  The client handles
 * communication with the IoT Hub through a transport supplied by the caller
 * (e.g., [Http]{@linkcode module:adapters/https.Http}).
 *
 * @example
 * var Device = require('azure-iot-device');
 * var Client = Device.Client;
 * var Message = Device.Message;
 * var Http = Device.Http;
 *
 * function print(err, res) {
 *   if (err) console.log(err.toString());
 *   if (res) console.log(res.statusCode + ' ' + res.statusMessage);
 * }
 *
 * var config = {
 *   host: 'hostname',
 *   keyName: 'deviceId',
 *   key: 'password'
 * };
 *
 * var client = new Client(new Http(config));
 *
 * client.sendEvent(new Message('hello world'), print);
 *
 * client.receive (function (err, res, msg) {
 *   print(err, res);
 *   if (msg) console.log('Message: ' + msg);
 *   if (!err && res.statusCode !== 204) {
 *     client.complete(msg, print);
 *   }
 * });
 *
 * @module azure-iot-device
 */

'use strict';

const common = require('azure-iot-common');

module.exports = {
  Client: require('./dist/device_client.js').Client,
  ModuleClient: require('./dist/module_client.js').ModuleClient,
  ConnectionString: require('./dist/connection_string.js'),
  Message: common.Message,
  SharedAccessSignature: require('./dist/shared_access_signature.js'),
  DeviceMethodRequest: require('./dist/device_method').DeviceMethodRequest,
  DeviceMethodResponse: require('./dist/device_method').DeviceMethodResponse,
  X509AuthenticationProvider: require('./dist/x509_authentication_provider').X509AuthenticationProvider,
  SharedAccessSignatureAuthenticationProvider: require('./dist/sas_authentication_provider').SharedAccessSignatureAuthenticationProvider,
  SharedAccessKeyAuthenticationProvider: require('./dist/sak_authentication_provider').SharedAccessKeyAuthenticationProvider,
  Twin: require('./dist/twin').Twin,
  TwinProperties: require('./dist/twin').TwinProperties,
  getUserAgentString: require('./dist/utils').getUserAgentString,
  EdgedAuthConfig: require('./dist/iotedge_authentication_provider').EdgedAuthConfig,
  IotEdgeAuthenticationProvider: require('./dist/iotedge_authentication_provider').IotEdgeAuthenticationProvider
};
