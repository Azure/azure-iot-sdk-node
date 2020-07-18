/**
 * @private
 */
export declare class ProvisioningError extends Error {
    transportObject?: any;
    result?: any;
}
/**
 * @private
 */
export declare function translateError(message: string, status: number, result?: any, response?: any): ProvisioningError;
