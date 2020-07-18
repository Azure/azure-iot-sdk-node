import { X509 } from 'azure-iot-common';
/**
 * @private
 * X509 security client using user-generated cert for Azure IoT
 */
export declare class X509Security {
    private _cert;
    private _registrationId;
    /**
     * Construct a new X509 security object
     *
     * @param cert certificate to use
     */
    constructor(registrationId: string, cert: X509);
    /**
     * return the X509 certificate
     *
     * @param callback called when the operation is complete
     */
    getCertificate(callback: (err?: Error, cert?: X509) => void): void;
    /**
     * return the registration Id for the device
     */
    getRegistrationId(): string;
}
