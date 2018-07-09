// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

export { Client } from './lib/device_client';
export { ModuleClient } from './lib/module_client';
export import ConnectionString = require('./lib/connection_string');
export import SharedAccessSignature = require('./lib/shared_access_signature');
export { Message } from 'azure-iot-common';
export { DeviceMethodRequest, DeviceMethodResponse } from './lib/device_method';
export { X509AuthenticationProvider } from './lib/x509_authentication_provider';
export { SharedAccessSignatureAuthenticationProvider } from './lib/sas_authentication_provider';
export { SharedAccessKeyAuthenticationProvider } from './lib/sak_authentication_provider';
export { EdgedAuthConfig, IotEdgeAuthenticationProvider } from './lib/iotedge_authentication_provider';
export { Twin, TwinProperties } from './lib/twin';
export { DeviceClientOptions, HttpReceiverOptions, AmqpTransportOptions, HttpTransportOptions, MqttTransportOptions } from './lib/interfaces';
export { getUserAgentString } from './lib/utils';
export { MethodMessage, DeviceTransport } from './lib/internal_client'
