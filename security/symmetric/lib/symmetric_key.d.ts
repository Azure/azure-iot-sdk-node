import { Callback, SharedAccessSignature } from 'azure-iot-common';
/**
 * @private
 */
export declare class SymmetricKeySecurityClient {
    private _registrationId;
    private _symmetricKey;
    constructor(registrationId: string, symmetricKey: string);
    /**
     * @method           module:azure-iot-security-symmetric-key.SymmetricKeySecurityClient#getRegistrationId
     * @description      Returns the registrationId originally provided to the client.
     * @param {function}          callback        Invoked upon completion of the operation.
     *                                            If the err argument is non-null then the registrationId
     *                                            parameter will be undefined.
     */
    getRegistrationId(callback?: Callback<string>): Promise<string> | void;
    /**
     * @method           module:azure-iot-security-symmetric-key.SymmetricKeySecurityClient#createSharedAccessSignature
     * @description      Returns a SAS token constructed from an id scope and the symmetric key
     *
     * @param {string}            idScope         Used to provide scope into the dps instance.
     * @param {function}          callback        Invoked upon completion of the operation.
     *                                            If the err argument is non-null then the sas token
     *                                            parameter will be undefined.
     */
    createSharedAccessSignature(idScope: string, callback?: Callback<SharedAccessSignature>): Promise<SharedAccessSignature> | void;
}
