/**
 * @private
 */
export declare type GetSasTokenCallback = (err: Error, sasToken?: string) => void;
/**
 * @private
 */
export declare type GetSasToken = (challenge: Buffer, callback: GetSasTokenCallback) => void;
/**
 * @private
 */
export declare type SaslResponseFrame = {
    response: Buffer;
};
/**
 * @private
 */
export declare class SaslTpm {
    name: string;
    hostname: string;
    private _getSasToken;
    private _challengeKey;
    private _idScope;
    private _registrationId;
    private _endorsementKey;
    private _storageRootKey;
    constructor(idScope: string, registrationId: string, endorsementKey: Buffer, storageRootKey: Buffer, getSasToken: GetSasToken);
    start(callback: (err?: Error, response?: any) => void): void;
    step(challenge: any, callback: (err?: Error, response?: any) => void): void;
}
