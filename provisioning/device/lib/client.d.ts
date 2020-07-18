import { RegistrationClient, X509ProvisioningTransport, TpmProvisioningTransport, X509SecurityClient, TpmSecurityClient, SymmetricKeyProvisioningTransport, SymmetricKeySecurityClient } from './interfaces';
/**
 * Client object used to communicate with the Azure IoT Hub Device Provisioning Service.
 */
export declare class ProvisioningDeviceClient {
    /**
     * Construct a client object which can be used to communicate with the Azure Device Provisioning Service.
     *
     * @param provisioningHost  Host running the Device Provisioning Service.  Can be found in the Azure portal in the 'Essentials' section of the 'Overview' tab as the string 'Global device endpoint'
     * @param idScope           Scope of IDs for the Device Provisioning Service.  Can be found in the Azure portal in the 'Essentials' section of the 'Overview' tab as the string 'ID Scope'
     * @param transport         Constructor function for provisioning transport to use.  Can be one of the following:
     *                          [azure-iot-provisioning-device-http.Http]{@link module:azure-iot-provisioning-device-http.Http}
     *                          [azure-iot-provisioning-device-amqp.Amqp]{@link module:azure-iot-provisioning-device-amqp.Amqp}
     *                          [azure-iot-provisioning-device-amqp.AmqpWs]{@link module:azure-iot-provisioning-device-amqp.AmqpWs}
     *                          [azure-iot-provisioning-device-mqtt.Mqtt]{@link module:azure-iot-provisioning-device-mqtt.Mqtt}
     *                          [azure-iot-provisioning-device-mqtt.MqttWs]{@link module:azure-iot-provisioning-device-mqtt.MqttWs}
     * @param securityClient    Instance of Security client object implementing either the
     *                          [X509SecurityClient]{@link module:azure-iot-provisioning-device:X509SecurityClient} or the
     *                          [TpmSecurityClient]{@link module:azure-iot-provisioning-device:TpmSecurityClient} interface.
     *                          [SymmetricKeySecurityClient]{@link module:azure-iot-provisioning-device:SymmetricKeySecurityClient} interface.
     *                          Suggested implementations of these interfaces include
     *                          [X509Security]{@link module:azure-iot-security-x509.X509Security} or
     *                          [TpmSecurityClient]{@link module:azure-iot-security-tpm.TpmSecurityClient}
     *                          [SymmetricKeySecurityClient]{@link module:azure-iot-security-symmetric-key.SymmetricKeySecurityClient}
     *
     * @returns                 An object supporting the [RegistrationClient]{@link module:azure-iot-provisioning-device:RegistrationClient}
     *                          interface which can be usd to register the device/
     *
     * @
     */
    static create(provisioningHost: string, idScope: string, transport: X509ProvisioningTransport | TpmProvisioningTransport | SymmetricKeyProvisioningTransport, securityClient: X509SecurityClient | TpmSecurityClient | SymmetricKeySecurityClient): RegistrationClient;
}
