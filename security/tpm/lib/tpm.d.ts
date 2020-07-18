/**
 * @private
 */
export declare class TpmSecurityClient {
    private static readonly _aes128SymDef;
    private static readonly _ekPersistentHandle;
    private static readonly _srkPersistentHandle;
    private static readonly _idKeyPersistentHandle;
    private static readonly _tpmNonceSize;
    private static readonly _ekTemplate;
    private static readonly _srkTemplate;
    private _ek;
    private _srk;
    private _registrationId;
    private _tpm;
    private _fsm;
    private _idKeyPub;
    constructor(registrationId?: string, customTpm?: any);
    /**
     * @method           module:azure-iot-security-tpm.TpmSecurityClient#getEndorsementKey
     * @description      Query the endorsement key on the TPM.
     * @param {function}          callback        Invoked upon completion of the operation.
     *                                            If the err argument is non-null then the endorsementKey
     *                                            parameter will be undefined.
     */
    getEndorsementKey(callback: (err: Error, endorsementKey?: Buffer) => void): void;
    /**
     * @method           module:azure-iot-security-tpm.TpmSecurityClient#getStorageRootKey
     * @description      Query the storage root key on the TPM.
     * @param {function}          callback        Invoked upon completion of the operation.
     *                                            If the err argument is non-null then the storageRootKey
     *                                            parameter will be undefined.
     */
    getStorageRootKey(callback: (err: Error, storageKey?: Buffer) => void): void;
    /**
     * @method           module:azure-iot-security-tpm.TpmSecurityClient#signWithIdentity
     * @description      Perform a cryptographic signing operation utilizing the TPM hardware.
     * @param {Buffer}            dataToSign      A buffer of data to sign.  The signing key will have been previously
     *                                            imported into the TPM via an activateIdentityKey.
     * @param {function}          callback        Invoked upon completion of the operation.
     *                                            If the err argument is non-null then the signedData
     *                                            parameter will be undefined.
     */
    signWithIdentity(dataToSign: Buffer, callback: (err: Error, signedData?: Buffer) => void): void;
    /**
     * @method           module:azure-iot-security-tpm.TpmSecurityClient#activateIdentityKey
     * @description      Activate the provided key into the TPM for use in signing operations later.
     * @param {function}          callback        Invoked upon completion of the operation.
     */
    activateIdentityKey(identityKey: Buffer, callback: (err: Error) => void): void;
    /**
     * @method           module:azure-iot-security-tpm.TpmSecurityClient#getRegistrationId
     * @description      Returns the registrationId originally provided to the client, or, if not provided
     *                   it constructs one around the endorsement key.
     * @param {function}          callback        Invoked upon completion of the operation.
     *                                            If the err argument is non-null then the registrationId
     *                                            parameter will be undefined.
     */
    getRegistrationId(callback: (err: Error, registrationId?: string) => void): void;
    private _createPersistentPrimary;
    private _readPersistentPrimary;
    private _getPropsAndHashAlg;
    private _signData;
    private _activateIdentityKey;
}
