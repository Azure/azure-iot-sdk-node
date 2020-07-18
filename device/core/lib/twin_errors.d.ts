/**
 * @private
 */
export declare class TwinBaseError extends Error {
    response?: any;
}
/**
 * @private
 */
export declare function translateError(response: any, status: number): TwinBaseError;
