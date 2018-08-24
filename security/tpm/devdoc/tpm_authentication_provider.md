# TpmAuthenticationProvider requirements


## Overview

The `TpmAuthenticationProvider` class is used to generate SAS tokens from a TPM Security Client.

## Interface
```ts
class TpmAuthenticationProvider extends EventEmitter implements AuthenticationProvider {
  constructor(credentials: TransportConfig, tpmSecurityClient: TpmSecurityClient);
  getDeviceCredentials(callback: (err: Error, credentials?: TransportConfig) => void): void;
  updateSharedAccessSignature(sharedAccessSignature: string): void;
  stop(): void;
  static fromTpmSecurityClient(deviceId: string, iotHubHostname: string, tpmSecurityClient: TpmSecurityClient): TpmAuthenticationProvider;
}
```

## Public API

### getDeviceCredentials(callback: (err: Error, credentials?: TransportConfig) => void): void;

**SRS_NODE_TPM_AUTH_PROVIDER_16_001 [**`getDeviceCredentials` shall use the `SharedAccessSignature.createWithSigningFunction` method with the `signWithIdentity` method of the `TpmSecurityClient` given to the construtor to generate a SAS token. **]**

**SRS_NODE_TPM_AUTH_PROVIDER_16_002: [** `getDeviceCredentials` shall call its callback with an `null` first parameter and the generated SAS token as a second parameter if the SAS token creation is successful. **]**

**SRS_NODE_TPM_AUTH_PROVIDER_16_003: [** `getDeviceCredentials` shall call its callback with an `Error` object if the SAS token creation fails. **]**

**SRS_NODE_TPM_AUTH_PROVIDER_16_004: [** `getDeviceCredentials` shall start a timer to renew the SAS token after the time the token is valid minus the renewal margin (60 - 15 = 45 minutes by default). **]**

### updateSharedAccessSignature(sharedAccessSignature: string): void;

**SRS_NODE_TPM_AUTH_PROVIDER_16_005: [** `updateSharedAccessSignature` shall throw an `InvalidOperationError` since it's the role of the TPM to generate SAS tokens. **]**

### stop(): void;

**SRS_NODE_TPM_AUTH_PROVIDER_16_006: [** `stop` shall stop the renewal timer if it is running. **]**

### events

**SRS_NODE_TPM_AUTH_PROVIDER_16_007: [** an `error` event shall be emitted if renewing the SAS token fail in the timer handler. **]**

**SRS_NODE_TPM_AUTH_PROVIDER_16_008: [** a `newTokenAvailable` event shall be emitted if renewing the SAS token succeeds in the timer handler. **]**

### static fromTpmSecurityClient(deviceId: string, iotHubHostname: string, tpmSecurityClient: TpmSecurityClient): TpmAuthenticationProvider

**SRS_NODE_TPM_AUTH_PROVIDER_16_009: [** The `fromSecurityClient` method shall throw a `ReferenceError` if `deviceId` is falsy. **]**

**SRS_NODE_TPM_AUTH_PROVIDER_16_010: [** The `fromSecurityClient` method shall throw a `ReferenceError` if `iotHubHostname` is falsy. **]**

**SRS_NODE_TPM_AUTH_PROVIDER_16_011: [** The `fromSecurityClient` method shall throw a `ReferenceError` if `tpmSecurityClient` is falsy. **]**

**SRS_NODE_TPM_AUTH_PROVIDER_16_012: [** The `fromSecurityClient` method shall instantiate a new `TpmSecurityClient` object. **]**
