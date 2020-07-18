import { SharedAccessSignature } from 'azure-iot-common';
/**
 * Creates a shared access signature token to authenticate a service connection with an Azure IoT hub.
 *
 * @param {string}  host      Hostname of the Azure IoT hub.
 * @param {string}  policy    Name of the policy to use to connect to the Azure IoT hub (typically `ServiceConnect`, `iothubowner` etc. See [Control access to your Azure IoT hub]{@link https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-security}.
 * @param {string}  key       Symmetric key to use to create shared access signature tokens.
 * @param {string}  expiry    Expiry time for the token that will be created.
 *
 * @throws {ReferenceError}  If one of the parameters is falsy.
 *
 * @returns {SharedAccessSignature}  A shared access signature to be used to connect with an Azure IoT hub.
 */
export declare function create(host: string, policy: string, key: string, expiry: string | number): SharedAccessSignature;
/**
 * Parses a string in the format of a Shared Access Signature token and returns a {@link SharedAccessSignature}.
 *
 * @param source A shared access signature string.
 * @returns {SharedAccessSignature}  An object containing the different shared access signature properties extracted from the string given as a parameter
 *
 * @throws {FormatError}  If the string cannot be parsed or is missing required parameters.
 */
export declare function parse(source: string): SharedAccessSignature;
