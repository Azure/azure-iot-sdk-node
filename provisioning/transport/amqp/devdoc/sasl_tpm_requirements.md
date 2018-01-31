# SaslTpm Requirements

The `SaslTpm` class provides TPM sasl functionality for the AMQP transport.

# Internal API

These methods are used by the other objects of the SDK but are not public API for the SDK user to call.

## constructor(idScope: string, registrationId: string, endorsementKey: Buffer, storageRootKey: Buffer, getSasToken: GetSasToken);

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_001: [** The `SaslTpm` constructor shall accept the following parameters:
  `idScope` - the idScope for the provisioning service instance
  `registrationId` - the registrationId for the device being registered
  `endorsementKey` - the endorsement key which was acquired from the TPM
  `storageRootKey` - the storage root key which was acquired from the TPM
  `getSasToken` - The callback to call when the challenge has been completed and the caller needs to formulate the response. **]**


## getInitFrame(): Promise<any>;

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_002: [** `getInitFrame` shall return a promise that resolves to an object with the following members:
  `mechanism` - Must be 'TPM'
  `initialResponse` - The inital frame contents
  `hostname` - the hostName **]**


## getResponseFrame(challenge: any): Promise<SaslResponseFrame>;

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_003: [** If `getResponseFrame` is called with a 1 byte challenge, it shall resolve with the the initial response that was passed into the constructor. **]**

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_004: [** If `getResponseFrame` is called with a first byte that has 1 in the most significant bit, it shall append the challenge to the full challenge buffer **]**

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_005: [** If `getResponseFrame` is called with a first byte that has 11 in the most significant bits, it shall call the challenge callback with the full challenge buffer **]**

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_006: [** If `ChallengeResponseCallback` is called without passing an error, the final `getResponseFrame` promise shall be resolved. **]**

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_007: [** If `ChallengeResponseCallback` is called with an error, the final `getResponseFrame` promise shall be rejected. **]**
