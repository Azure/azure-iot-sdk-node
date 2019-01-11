// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * Device attestation method.
 */
export interface AttestationMechanism {
  /**
   * The type of attestation.  Will be set to a string
   * either `tpm` or `x509`.
   */
  type: AttestationTypes;
  /**
   * This property is an object containing the TPM specific values
   * for enrollment.
   */
  tpm?: TpmAttestation;
  /**
   * This property is an object containing the x509 specific values
   * for enrollment.
   */
  x509?: X509Attestation;

  /**
   * This property is an object containing the symmetric keys for an enrollment record.
   */
  symmetricKey?: SymmetricKeyAttestation;
}

export type AttestationTypes = 'none' | 'tpm' | 'x509' | 'symmetricKey';

/**
 * Attestation via Symmetric Key.
 */
export interface SymmetricKeyAttestation {
  /**
   * Primary symmetric key.
   */
  primaryKey: string;
  /**
   * Secondary symmetric key.
   */
  secondaryKey: string;
}

/**
 * Attestation via TPM.
 */
export interface TpmAttestation {
  /**
   * The endorsement key is an encryption key that is permanently embedded in the Trusted Platform Module (TPM)
   * security hardware, generally at the time of manufacture. This private portion of the endorsement key is never
   * released outside of the TPM. The public portion of the endorsement key helps to recognize a genuine TPM.
   *
   * The endorsement key is a base64 encoded value.
   */
  endorsementKey: string;
  /**
   * The storage root key is embedded in the Trusted Platform Module (TPM) security hardware.
   * It is used to protect TPM keys created by applications, so that these keys cannot be used without the TPM.
   * Unlike the endorsement key (which is generally created when the TPM is manufactured), the storage root key
   * is created when you take ownership of the TPM. This means that if you clear the TPM and a new user takes ownership,
   * a new storage root key is created.
   *
   * This property is not typically manipulated by the service client.
   *
   * The storageRootKey is a base64 encoded value.
   */
  storageRootKey: string;
}

/**
 * Attestation via X509.
 */
export interface X509Attestation {
  /**
   * x509 certificate object which provides all information for a leaf certificate.
   */
  clientCertificates: X509Certificates;
  /**
   * x509 certificate object which provides all information needed for a certificate
   * suitable for signing other certificates.
   */
  signingCertificates: X509Certificates;
  /**
   * Primary and secondary CA reference.  These will be names rather than
   * actual certificates.
   */
  caReferences: X509CAReferences;
}

/**
 * X509 certificate info.
 *
 * This object is not provided by the application.  It is populated by the service from
 * a provided certificate.
 */
export interface X509CertificateInfo {
  /**
   * For clientCertificates the subjectName is used as the deviceId on the IoT Hub.
   */
  subjectName: string;
  /**
   * A 160 bit hash of the certificate.
   */
  sha1Thumbprint: string;
  /**
   * A 256 bit hash of the certificate.
   */
  sha256Thumbprint: string;
  /**
   * The name of certificate used to sign the certificate that is the basis
   * for this info.
   */
  issuerName: string;
  /**
   * The date and time before which this certificate is not valid for authentication
   * purposes.
   */
  notBeforeUtc: Date;
  /**
   * The date and time after which this certificate is not valid for authentication
   * purposes.
   */
  notAfterUtc: Date;
  /**
   * A value that should be unique to the issuing CA for this certificate.  Note that
   * this serial number is not unique over all certificates world wide.
   */
  serialNumber: string;
  /**
   * The version specifies what capabilities are supported by the particular certificate.
   * Version 3 is currently the highest version number.
   */
  version: number;
}

/**
 * Certificate and Certificate info
 */
export interface X509CertificateWithInfo {
  /**
   * PEM or CER representation of a certificate.
   */
  certificate: string;
  /**
   * This property is populated by the service from the information
   * provided by the certificate property of this object.
   */
  info: X509CertificateInfo;
}

/**
 * Primary and secondary certificates
 */
export interface X509Certificates {
  /**
   * Would typically be the certificate used to provide the identification
   * and authentication for an enrollment.
   */
  primary: X509CertificateWithInfo;
  /**
   * Would typically be the certificate used to provide the identification
   * and authentication for an enrollment in the case that the primary is
   * revoked.
   */
  secondary: X509CertificateWithInfo;
}

export interface X509CAReferences {
  /**
   * The name of the primary CA certificate.
   */
  primary: string;
  /**
   * The name of the secondary CA certificate.
   */
  secondary: string;
}

/**
 * Bulk operation
 */
export interface BulkEnrollmentOperation {
  /**
   * The mode property specifies the operation that will be performed upon all
   * of the IndividualEnrollment elements in the enrollments property.
   */
  mode: BulkOperationMode;
  /**
   * The enrollments property is an array of IndividualEnrollment objects.  The size of this
   * array is limited.
   */
  enrollments: Array<IndividualEnrollment>;
}

/**
 * The kind of operations that can be performed with a BulkOperation.
 * Only one kind of operation may be performed on any instance of a
 * BulkOperation.
 */
export type BulkOperationMode = 'create' | 'update' | 'updateIfMatchEtag' | 'delete';

/**
 * Bulk operation result
 */
export interface BulkEnrollmentOperationResult {
  /**
   * If isSuccessful is true then all CRUD operations for a bulkOperation
   * were successful.  Otherwise there will be at least one element in the
   * errors array.
   */
  isSuccessful: boolean;
  /**
   * Will provide information as to why particular CRUD operations failed for
   * a runBulkEnrollmentOperation invocation.  The array will be zero length if
   * isSuccessful is true.
   */
  errors: Array<BulkEnrollmentOperationError>;
}

/**
 * Bulk enrollment operation error
 */
export interface BulkEnrollmentOperationError {
  /**
   * The id of the the IndividualEnrollment object that was in error during a runBulkEnrollmentOperation invocation.
   */
  registrationId: string;
  /**
   * The status code that is associated with the error for a particular CRUD operation.
   */
  errorCode: number;
  /**
   * The helpful text associated with the error for a particular CRUD operation.
   */
  errorStatus: string;
}

/**
 * Device registration status.
 */
export interface DeviceRegistrationState {
  /**
   * The unique identifier associated with an enrollment object.
   *
   * The value is all lowercase alphanumeric with embedded `-` permitted.
   */
  registrationId: string;
  /**
   * The date that the device registration was created.
   */
  createdDateTimeUtc: Date;
  /**
   * The IoT Hub that the device was provisioned to.
   */
  assignedHub: string;
  /**
   * The unique identifier (per hub) used for the device registration.
   */
  deviceId: string;
  /**
   * What is the provisioning state of the device at the moment of the request.
   */
  status: RegistrationStatus;
  /**
   * Substatus for 'Assigned' devices. Possible values include:
   * - 'initialAssignment': Device has been assigned to an IoT hub for the first time.
   * - 'deviceDataMigrated': Device has been assigned to a different IoT hub and its device data was migrated from the previously assigned IoT hub. Device data was removed from the previously assigned IoT hub.
   * - 'deviceDataReset':  Device has been assigned to a different IoT hub and its device data was populated from the initial state stored in the enrollment. Device data was removed from the previously assigned IoT hub.
   */
  substatus: RegistrationSubstatus;
  /**
   * The last time that this registration status was updated.
   */
  lastUpdatedDateTimeUtc: Date;
  /**
   * A numeric value for the error associated with this registration.
   */
  errorCode: number;
  /**
   * The helpful text for the error associated with this registration.
   */
  errorMessage: string;
  /**
   * An opaque value suitable to uniquely identify a particular generation
   * of this object for use during a CRUD operation.
   */
  etag: string;
}

/**
 * The provisioning state of the device at the moment of the request.
 */
export type RegistrationStatus = 'unassigned' | 'assigning' | 'assigned' | 'failed' | 'disabled';

/**
 * Substatus for 'Assigned' devices. Possible values include:
 * - 'initialAssignment': Device has been assigned to an IoT hub for the first time.
 * - 'deviceDataMigrated': Device has been assigned to a different IoT hub and its device data was migrated from the previously assigned IoT hub. Device data was removed from the previously assigned IoT hub.
 * - 'deviceDataReset':  Device has been assigned to a different IoT hub and its device data was populated from the initial state stored in the enrollment. Device data was removed from the previously assigned IoT hub.
 */
export type RegistrationSubstatus = 'initialAssignment' | 'deviceDataMigrated' | 'deviceDataReset';

/**
 * The behavior the service should adopt when a device is re-provisioned to another IoT Hub.
 */
export interface ReprovisionPolicy {
  /**
   * When set to true (default) the Device Provisioning Service will evaluate the device's hub assignment and update it if necessary
   * for any provisioning request beyond the first from a given device. If set to false the device will stay assigned to its current IoT hub.
   */
  updateHubAssignment: boolean;
  /**
   * When set to true (default) the Device Provisioning Service will migrate the device data (twin, device capabilities and device id)
   * from one hub to another during an IoT hub assignment update. If set to false the Device Provisioning Service will reset the device data to its
   * initial configuration stored in its corresponding enrollment.
   */
  migrateDeviceData: boolean;
}

/**
 * Capabilities of the device that will be provisioned using this enrollment record.
 */
export interface DeviceCapabilities {
  /**
   * Boolean indicating whether the provisioned device is an Azure IoT Edge device.
   */
  iotEdge: boolean;
}

/**
 * The individual enrollment record.
 */
export interface IndividualEnrollment {
  /**
   * A unique identifier for this object.
   *
   * The value is all lowercase alphanumeric with embedded `-` permitted.
   */
  registrationId: string;
  /**
   * The unique identifier (per hub) used for the device registration.
   *
   * If this object is using x509 attestation, this property should be
   * undefined.
   */
  deviceId: string;
  /**
   * The state of the device registration associated with this object.
   */
  registrationState: DeviceRegistrationState;
  /**
   * The security mechanism associated with this object.
   */
  attestation: AttestationMechanism;
  /**
   * The IoT Hub that will be the destination of the provisioning for the device
   * associated with this object.
   */
  iotHubHostName: string;
  /**
   * The initial twin document that will be created for this device upon its provisioning.
   */
  initialTwin: InitialTwin;
  /**
   * An opaque value suitable to uniquely identify a particular generation
   * of this object for use during a CRUD operation.
   */
  etag: string;
  /**
   * Indicates whether this enrollment can be used as the basis for a device
   * provisioning.
   */
  provisioningStatus: ProvisioningStatus;
  /**
   * The date and time that this object was created.
   */
  createdDateTimeUtc: string;
  /**
   * The date and time that this enrollment record was last updated.  This
   * could include an update or an actual registration.
   */
  lastUpdatedDateTimeUtc: string;

  /**
   * The capabilities of the device that will be provisioned using this enrollment record.
   */
  capabilities?: DeviceCapabilities;

  /**
   * The behavior when a device is re-provisioned to an IoT hub.
   */
  reprovisionPolicy?: ReprovisionPolicy;

  /**
   * The allocation policy of this individual enrollment. This policy overrides the tenant-level allocation policy.
   * - 'hashed': Linked IoT hubs are equally likely to have devices provisioned to them.
   * - 'geoLatency':  Devices are provisioned to an IoT hub with the lowest latency to the device.If multiple linked IoT hubs would provide the same lowest latency, the provisioning service hashes devices across those hubs.
   * - 'static' : Specification of the desired IoT hub in the enrollment list takes priority over the service-level allocation policy.
   * - 'custom': Devices are provisioned to an IoT hub based on your own custom logic. The provisioning service passes information about the device to the logic, and the logic returns the desired IoT hub as well as the desired initial configuration. We recommend using Azure Functions to host your logic.
   */
  allocationPolicy?: AllocationPolicyType;

  /**
   * The list of names of IoT hubs the device(s) in this resource can be allocated to. It must be a subset of tenant level list of IoT hubs.
   */
  iotHubs: string[];

  /**
   * Custom allocation definition.
   */
  customAllocationDefinition?: CustomAllocationDefinition;
}

/**
 * The allocation policy of this individual enrollment. This policy overrides the tenant-level allocation policy.
 * - 'hashed': Linked IoT hubs are equally likely to have devices provisioned to them.
 * - 'geoLatency':  Devices are provisioned to an IoT hub with the lowest latency to the device.If multiple linked IoT hubs would provide the same lowest latency, the provisioning service hashes devices across those hubs.
 * - 'static' : Specification of the desired IoT hub in the enrollment list takes priority over the service-level allocation policy.
 * - 'custom': Devices are provisioned to an IoT hub based on your own custom logic. The provisioning service passes information about the device to the logic, and the logic returns the desired IoT hub as well as the desired initial configuration. We recommend using Azure Functions to host your logic.
 */
export type AllocationPolicyType = 'hashed' | 'geoLatency' | 'static' | 'custom';

export type ProvisioningStatus = 'enabled' | 'disabled';

/**
 * The enrollment group object.
 */
export interface EnrollmentGroup {
  /**
   * A unique identifier for this object.
   *
   * The value is all lowercase alphanumeric with embedded `-` permitted.
   */
  enrollmentGroupId: string;
  /**
   * The security mechanism associated with this object.
   *
   * Currently this MUST be x509.
   */
  attestation: AttestationMechanism;
  /**
   * The IoT Hub that will be the destination of the provisioning for devices
   * associated with this object.
   */
  iotHubHostName: string;
  /**
   * The initial twin document that will be created for devices upon their provisioning.
   */
  initialTwin: InitialTwin;
  /**
   * An opaque value suitable to uniquely identify a particular generation
   * of this object for use during a CRUD operation.
   */
  etag: string;
  /**
   * Indicates whether this object can be used as the basis for a device
   * provisioning.
   */
  provisioningStatus: ProvisioningStatus;
  /**
   * The date and time that this object was created.
   */
  createdDateTimeUtc: string;
  /**
   * The date and time that this object was last updated.  This
   * could include an update or an actual registration.
   */
  lastUpdatedDateTimeUtc: string;

  /**
   * The behavior when a device is re-provisioned to an IoT hub.
   */
  reprovisionPolicy?: ReprovisionPolicy;

  /**
   * The allocation policy of this enrollment group. This policy overrides the tenant-level allocation policy.
   * - 'hashed': Linked IoT hubs are equally likely to have devices provisioned to them.
   * - 'geoLatency':  Devices are provisioned to an IoT hub with the lowest latency to the device.If multiple linked IoT hubs would provide the same lowest latency, the provisioning service hashes devices across those hubs.
   * - 'static' : Specification of the desired IoT hub in the enrollment list takes priority over the service-level allocation policy.
   * - 'custom': Devices are provisioned to an IoT hub based on your own custom logic. The provisioning service passes information about the device to the logic, and the logic returns the desired IoT hub as well as the desired initial configuration. We recommend using Azure Functions to host your logic.
   */
  allocationPolicy?: AllocationPolicyType;

  /**
   * The list of names of IoT hubs the device(s) in this resource can be allocated to. It must be a subset of tenant level list of IoT hubs.
   */
  iotHubs: string[];

  /**
   * Custom allocation definition.
   */
  customAllocationDefinition?: CustomAllocationDefinition;
}

/**
 * Custom allocation definition.
 */
export interface CustomAllocationDefinition {
  /**
   * The webhook URL used for allocation requests.
   */
  webhookUrl: string;
  /**
   * The API version of the provisioning service types (such as IndividualEnrollment) sent in the custom allocation request. Supported versions include:
   * - "2018-11-01"
   */
  apiVersion: string;
}

export interface Metadata {
  lastUpdated: Date;
  /**
   * This SHOULD be null for Reported properties metadata and MUST not be null for Desired properties metadata.
   */
  lastUpdatedVersion: number;
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
export interface InitialTwin {
  tags: TwinCollection;
  properties: {
    desired: TwinCollection;
  };
}
