# SaslTpm Requirements

The `SaslTpm` class provides TPM sasl functionality for the AMQP transport.

# Internal API

These methods are used by the other objects of the SDK but are not public API for the SDK user to call.

## constructor(hostName: string, init: Buffer, firstResponse: Buffer, getResponseFromChallenge: GetResponseFromChallenge);

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_001: [** The `SaslTpm` constructor shall accept the following parameters:
  `hostName` - The hostName value to be returned when getInitFrameContent is called
  `init` - The initial frame contents to be returned when getInitFrameContent is called
  `firstResponse` - The response to return on the first call to getChallengeResponse
  `getResponseFromChallenge` - The callback to call when the challange has been completed and the caller needs to formulate the response. **]**


## getInitFrameContent(): Promise<any>;

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_002: [** `getInitFrameContent` shall return a promise that resolves to an object with the following members:
  `mechanism` - Must be 'TPM'
  `initialResponse` - The inital frame contents
  `hostname` - the hostName **]**


## getChallengeResponseContent(challenge: any): Promise<Buffer>;

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_003: [** If `getChallengeResponse` is called with a 1 byte challenge, it shall resolve with the the intial response that was passed into the constructor. **]**

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_004: [** If `getChallengeResponse` is called with a first byte that has 1 in the most significant bit, it shall append the challenge to the full challenge buffer **]**

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_005: [** If `getChallengeResponse` is called with a first byte that has 11 in the most significant bits, it shall call the challenge callback with the full challenge buffer **]**

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_006: [** If `ChallengeResponseCallback` is called without passing an error, the final `getChallangeResponse` promise shall be resolved. **]**

**SRS_NODE_PROVISIONING_AMQP_SASL_TPM_18_007: [** If `ChallengeResponseCallback` is called with an error, the final `getChallangeResponse` promise shall be rejected. **]**
