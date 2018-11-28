// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { ConnectionString, errors } from 'azure-iot-common';

/**
 * Parses a connection string from a string.
 * See {@link https://blogs.msdn.microsoft.com/iotdev/2017/05/09/understand-different-connection-strings-in-azure-iot-hub/|Understanding Connection Strings in Azure IoT Hub} for more details.
 *
 * @param source the string from which the {@link ConnectionString} object should be parsed.
 *
 * @throws {azure-iot-common.ArgumentError} if the string is missing one of the required attributes.
 */
export function parse(source: string): ConnectionString {
  /*Codes_SRS_NODE_DEVICE_CONNSTR_05_001: [The parse method shall return the result of calling azure-iot-common.ConnectionString.parse.]*/
  /*Codes_SRS_NODE_DEVICE_CONNSTR_05_002: [It shall throw ArgumentError if any of 'HostName' or 'DeviceId' fields are not found in the source argument.]*/
  const connectionString = ConnectionString.parse(source, ['HostName', 'DeviceId']);
  /*Codes_SRS_NODE_DEVICE_CONNSTR_16_001: [It shall throw `ArgumentError` if `SharedAccessKey` and `x509` are present at the same time.]*/
  /*Codes_SRS_NODE_DEVICE_CONNSTR_16_006: [It shall throw `ArgumentError` if `SharedAccessKey` and `SharedAccessSignature` are present at the same time.]*/
  /*Codes_SRS_NODE_DEVICE_CONNSTR_16_007: [It shall throw `ArgumentError` if `SharedAccessSignature` and `x509` are present at the same time.]*/
  /*Codes_SRS_NODE_DEVICE_CONNSTR_16_008: [It shall throw `ArgumentError` if none of `SharedAccessKey`, `SharedAccessSignature` and `x509` are present.]*/
  if (connectionString.SharedAccessKey && connectionString.x509) {
    throw new errors.ArgumentError('The connection string must contain either a SharedAccessKey or x509=true');
  } else if (connectionString.SharedAccessKey && connectionString.SharedAccessSignature) {
    throw new errors.ArgumentError('The connection string must contain either a SharedAccessKey or SharedAccessSignature');
  } else if (connectionString.SharedAccessSignature && connectionString.x509) {
    throw new errors.ArgumentError('The connection string must contain either a SharedAccessSignature or x509=true');
  } else if ((!connectionString.SharedAccessKey && !connectionString.SharedAccessSignature && !connectionString.x509)) {
    throw new errors.ArgumentError('The connection string must contain either a SharedAccessKey, SharedAccessSignature or x509=true');
  }

  return connectionString;
}

/**
 * Creates a valid connection string for a device using symmetric key authentication.
 *
 * @param hostName Hostname of the Azure IoT hub.
 * @param deviceId Unique device identifier.
 * @param symmetricKey Symmetric key used to generate the {@link SharedAccessSignature} that authenticate the connection.
 */
export function createWithSharedAccessKey(hostName: string, deviceId: string, symmetricKey: string): string {
  /*Codes_SRS_NODE_DEVICE_CONNSTR_16_003: [The `createWithSharedAccessKey` static method shall throw a `ReferenceError` if one or more of the `hostName`, `deviceId` or `sharedAccessKey` are falsy.]*/
  if (!hostName) {
    throw new ReferenceError('hostName cannot be \'' + hostName + '\'');
  } else if (!deviceId) {
    throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');
  } else if (!symmetricKey) {
    throw new ReferenceError('symmetricKey cannot be \'' + symmetricKey + '\'');
  }

  /*Codes_SRS_NODE_DEVICE_CONNSTR_16_002: [The `createWithSharedAccessKey` static method shall returns a valid connection string with the values passed as arguments.]*/
  return 'HostName=' + hostName + ';DeviceId=' + deviceId + ';SharedAccessKey=' + symmetricKey;
}

/**
 * Creates a valid connection string for a device using x509 certificate authentication.
 *
 * @param hostName Hostname of the Azure IoT hub.
 * @param deviceId Unique device identifier.
 */
export function createWithX509Certificate(hostName: string, deviceId: string): string {
  /*Codes_SRS_NODE_DEVICE_CONNSTR_16_005: [The `createWithX509Certificate` static method shall throw a `ReferenceError` if one or more of the `hostName` or `deviceId` are falsy.]*/
  if (!hostName) {
    throw new ReferenceError('hostName cannot be \'' + hostName + '\'');
  } else if (!deviceId) {
    throw new ReferenceError('deviceId cannot be \'' + deviceId + '\'');
  }

  /*Codes_SRS_NODE_DEVICE_CONNSTR_16_004: [The `createWithX509Certificate` static method shall returns a valid x509 connection string with the values passed as arguments.]*/
  return 'HostName=' + hostName + ';DeviceId=' + deviceId + ';x509=true';
}

