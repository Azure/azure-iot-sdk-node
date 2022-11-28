// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

export { Client } from './dist/device_client';
export { ModuleClient } from './dist/module_client';
export * as ConnectionString from './dist/connection_string';
export * as SharedAccessSignature from './dist/shared_access_signature';
export { Message } from 'azure-iot-common';
export { DeviceMethodRequest, DeviceMethodResponse } from './dist/device_method';
export { X509AuthenticationProvider } from './dist/x509_authentication_provider';
export { SharedAccessSignatureAuthenticationProvider } from './dist/sas_authentication_provider';
export { SharedAccessKeyAuthenticationProvider } from './dist/sak_authentication_provider';
export { EdgedAuthConfig, IotEdgeAuthenticationProvider } from './dist/iotedge_authentication_provider';
export { Twin, TwinProperties } from './dist/twin';
export { DeviceClientOptions, HttpReceiverOptions, AmqpTransportOptions, HttpTransportOptions, MqttTransportOptions } from './dist/interfaces';
export { getUserAgentString } from './dist/utils';
export { MethodMessage, DeviceTransport } from './dist/internal_client';
