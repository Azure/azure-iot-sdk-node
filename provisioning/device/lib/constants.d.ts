/**
 * @private
 */
export declare class ProvisioningDeviceConstants {
    /**
     * User-Agent string passed to the service as part of communication
     */
    static userAgent: string;
    /**
     * Default interval for polling, to use in case service doesn't provide it to us.
     */
    static defaultPollingInterval: number;
    /**
     * apiVersion to use while communicating with service.
     */
    static apiVersion: string;
    /**
     * default timeout to use when communicating with the service
     */
    static defaultTimeoutInterval: number;
}
