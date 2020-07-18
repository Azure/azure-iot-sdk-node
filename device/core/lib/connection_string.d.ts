import { ConnectionString } from 'azure-iot-common';
/**
 * Parses a connection string from a string.
 * See {@link https://blogs.msdn.microsoft.com/iotdev/2017/05/09/understand-different-connection-strings-in-azure-iot-hub/|Understanding Connection Strings in Azure IoT Hub} for more details.
 *
 * @param source the string from which the {@link ConnectionString} object should be parsed.
 *
 * @throws {azure-iot-common.ArgumentError} if the string is missing one of the required attributes.
 */
export declare function parse(source: string): ConnectionString;
/**
 * Creates a valid connection string for a device using symmetric key authentication.
 *
 * @param hostName Hostname of the Azure IoT hub.
 * @param deviceId Unique device identifier.
 * @param symmetricKey Symmetric key used to generate the {@link SharedAccessSignature} that authenticate the connection.
 */
export declare function createWithSharedAccessKey(hostName: string, deviceId: string, symmetricKey: string): string;
/**
 * Creates a valid connection string for a device using x509 certificate authentication.
 *
 * @param hostName Hostname of the Azure IoT hub.
 * @param deviceId Unique device identifier.
 */
export declare function createWithX509Certificate(hostName: string, deviceId: string): string;
