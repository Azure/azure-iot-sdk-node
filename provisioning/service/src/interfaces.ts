// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * Device attestation method.
 */
export interface AttestationMechanism {
    type: AttestationTypes;
    tpm?: TpmAttestation;
    x509?: X509Attestation;
}

export type AttestationTypes = 'none' | 'tpm' | 'x509';

/**
 * Attestation via TPM.
 */
export interface TpmAttestation {
  endorsementKey: string;
  storageRootKey: string;
}

/**
 * Attestation via X509.
 */
export interface X509Attestation {
  clientCertificates: X509Certificates;
  signingCertificates: X509Certificates;
}

/**
 * X509 certificate info.
 */
export interface X509CertificateInfo {
  subjectName: string;
  sha1Thumbprint: string;
  sha256Thumbprint: string;
  issuerName: string;
  notBeforeUtc: Date;
  notAfterUtc: Date;
  serialNumber: string;
  version: number;
}

/**
 * Certificate and Certificate info
 */
export interface X509CertificateWithInfo {
  certificate: any;
  info: X509CertificateInfo;
}

/**
 * Primary and secondary certificates
 */
export interface X509Certificates {
  primary: X509CertificateWithInfo;
  secondary: X509CertificateWithInfo;
}

/**
 * Bulk operation
 */
export interface BulkOperation {
    mode: BulkOperationMode;
    enrollments: Array<Enrollment>;
}

export type BulkOperationMode = 'create' | 'update' | 'updateIfMatchEtag' | 'delete';

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
    isSuccessful: boolean;
    errors: Array<DeviceRegistrationOperationError>;
}

/**
 * Device registration operation error
 */
export interface DeviceRegistrationOperationError {
    registrationId: string;
    errorCode: string;
    errorStatus: string;
}

/**
 * Device registration status.
 */
export interface DeviceRegistrationStatus {
    registrationId: string;
    createdDateTimeUtc: Date;
    assignedHub: string;
    deviceId: string;
    status: RegistrationStatus;
    lastUpdatedDateTimeUtc: Date;
    errorCode: number;
    errorMessage: string;
    etag: string;
}

export type RegistrationStatus = 'unassigned' | 'assigning' | 'assigned' | 'failed' | 'disabled';

/**
 * The device enrollment record.
 */
export interface Enrollment {
    registrationId: string;
    deviceId: string;
    registrationStatus: DeviceRegistrationStatus;
    attestation: AttestationMechanism;
    iotHubHostName: string;
    initialTwinState: TwinState;
    etag: string;
    provisioningStatus: ProvisioningStatus;
    createdDateTimeUtc: string;
    lastUpdatedDateTimeUtc: string;
}

export type ProvisioningStatus = 'enabled' | 'disabled';

/**
 * The enrollment group record.
 */
export interface EnrollmentGroup {
    enrollmentGroupId: string;
    attestation: AttestationMechanism;
    iotHubHostName: string;
    initialTwinState: TwinState;
    etag: string;
    provisioningStatus: ProvisioningStatus;
    createdDateTimeUtc: string;
    lastUpdatedDateTimeUtc: string;
}

export interface Metadata {
    lastUpdated: Date;
    /**
     * This SHOULD be null for Reported properties metadata and MUST not be null for Desired properties metadata.
     */
    lastUpdatedVersion: number;
}

/**
 * TPM registration result.
 */
export interface TpmRegistrationResult {
  authenticationKey: string;
  unencryptedAuthenticationKey: string;
}

export interface TwinCollection {
  version: number;
  count: number;
  metadata: Metadata;
  [key: string]: any;
}

/**
 * Device twin state.
 */
export interface TwinState {
  tags: TwinCollection;
  desiredProperties: TwinCollection;
}


/**
 * X509 registration result.
 */
export interface X509RegistrationResult {
  certificateInfo: X509CertificateInfo;
  enrollmentGroupId: string;
  signingCertificateInfo: X509CertificateInfo;
}
