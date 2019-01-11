// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

import { X509Registration } from './x509_registration';
import { TpmRegistration } from './tpm_registration';
import { SymmetricKeyRegistration } from './symmetric_registration';
import { RegistrationClient, X509ProvisioningTransport, TpmProvisioningTransport, X509SecurityClient, TpmSecurityClient, SymmetricKeyProvisioningTransport, SymmetricKeySecurityClient } from './interfaces';
import { errors } from 'azure-iot-common';

/**
 * Client object used to communicate with the Azure IoT Hub Device Provisioning Service.
 */
export class ProvisioningDeviceClient {
  /**
   * Construct a client object which can be used to communicate with the Azure Device Provisioning Service.
   *
   * @param provisioningHost  Host running the Device Provisioning Service.  Can be found in the Azure portal in the 'Essentials' section of the 'Overview' tab as the string 'Global device endpoint'
   * @param idScope           Scope of IDs for the Device Provisioning Service.  Can be found in the Azure portal in the 'Essentials' section of the 'Overview' tab as the string 'ID Scope'
   * @param transport         Constructor function for provisioning transport to use.  Can be one of the following:
   *                          [azure-iot-provisioning-device-http.Http]{@link module:azure-iot-provisioning-device-http.Http}
   *                          [azure-iot-provisioning-device-amqp.Amqp]{@link module:azure-iot-provisioning-device-amqp.Amqp}
   *                          [azure-iot-provisioning-device-amqp.AmqpWs]{@link module:azure-iot-provisioning-device-amqp.AmqpWs}
   *                          [azure-iot-provisioning-device-mqtt.Mqtt]{@link module:azure-iot-provisioning-device-mqtt.Mqtt}
   *                          [azure-iot-provisioning-device-mqtt.MqttWs]{@link module:azure-iot-provisioning-device-mqtt.MqttWs}
   * @param securityClient    Instance of Security client object implementing either the
   *                          [X509SecurityClient]{@link module:azure-iot-provisioning-device:X509SecurityClient} or the
   *                          [TpmSecurityClient]{@link module:azure-iot-provisioning-device:TpmSecurityClient} interface.
   *                          [SymmetricKeySecurityClient]{@link module:azure-iot-provisioning-device:SymmetricKeySecurityClient} interface.
   *                          Suggested implementations of these interfaces include
   *                          [X509Security]{@link module:azure-iot-security-x509.X509Security} or
   *                          [TpmSecurityClient]{@link module:azure-iot-security-tpm.TpmSecurityClient}
   *                          [SymmetricKeySecurityClient]{@link module:azure-iot-security-symmetric-key.SymmetricKeySecurityClient}
   *
   * @returns                 An object supporting the [RegistrationClient]{@link module:azure-iot-provisioning-device:RegistrationClient}
   *                          interface which can be usd to register the device/
   *
   * @
   */
  static create(provisioningHost: string, idScope: string, transport: X509ProvisioningTransport | TpmProvisioningTransport | SymmetricKeyProvisioningTransport, securityClient: X509SecurityClient | TpmSecurityClient | SymmetricKeySecurityClient): RegistrationClient {
    /*Codes_SRS_PROVISIONING_CLIENT_06_001: [The `create` method shall throw `ReferenceError` if the `provisioningHost` argument is falsy.] */
    if (!provisioningHost) {
      throw new ReferenceError('Required argument provisioningHost not present.');
    }

    /*Codes_SRS_PROVISIONING_CLIENT_06_002: [The `create` method shall throw `ReferenceError` if the `idScope` argument is falsy.] */
    if (!idScope) {
      throw new ReferenceError('Required argument idScope not present.');
    }

    const isX509Security: boolean = ((securityClient as X509SecurityClient).getCertificate !== undefined);
    const isX509Transport: boolean = ((transport as X509ProvisioningTransport).setAuthentication !== undefined);
    const isTpmSecurity: boolean = ((securityClient as TpmSecurityClient).getEndorsementKey !== undefined);
    const isTpmTransport: boolean = ((transport as TpmProvisioningTransport).getAuthenticationChallenge !== undefined);
    const isSymmetricKeySecurity: boolean = ((securityClient as SymmetricKeySecurityClient).createSharedAccessSignature !== undefined);
    const isSymmetricKeyTransport: boolean = ((transport as SymmetricKeyProvisioningTransport).setSharedAccessSignature !== undefined);

    if (isX509Security) {
      if (isX509Transport) {
        /* Codes_SRS_PROVISIONING_CLIENT_18_001: [ If `securityClient` implements `X509SecurityClient` and the `transport` implements `X509ProvisioningTransport`, then `create` shall return an `X509Registration` object. ] */
        return new X509Registration(provisioningHost, idScope, transport as X509ProvisioningTransport, securityClient as X509SecurityClient);
      } else {
        /* Codes_SRS_PROVISIONING_CLIENT_18_002: [ If `securityClient` implements `X509SecurityClient` and the `transport` does not implement `X509ProvisioningTransport`, then `create` shall throw an `ArgumentError` exception. ] */
        throw new errors.ArgumentError('Transport does not support X509 authentication');
      }
    } else if (isTpmSecurity) {
      if (isTpmTransport) {
        /* Codes_SRS_PROVISIONING_CLIENT_18_003: [ If `securityClient` implements `TPMSecurityClient` and the `transport` supports TPM authentication, then `create` shall return a `TpmRegistration` object. ] */
        return new TpmRegistration(provisioningHost, idScope, transport as TpmProvisioningTransport, securityClient as TpmSecurityClient);
      } else {
        /* Codes_SRS_PROVISIONING_CLIENT_18_004: [ If `securityClient` implements `TPMSecurityClient` and the `transport` dos not implement `TPMProvisioningTransport`, then `create` shall throw an `ArgumentError` exception. ] */
        throw new errors.ArgumentError('Transport does not support TPM authentication');
      }
    } else if (isSymmetricKeySecurity) {
      if (isSymmetricKeyTransport) {
        /* Codes_SRS_PROVISIONING_CLIENT_06_003: [If `securityClient` implements `SymmetricKeySecurityClient` and the `transport` implements `SymmetricKeyProvisioningTransport`, then `create` shall return an `SymmetricKeyRegistration` object.] */
        return new SymmetricKeyRegistration(provisioningHost, idScope, transport as SymmetricKeyProvisioningTransport, securityClient as SymmetricKeySecurityClient);

      } else {
        /* Codes_SRS_PROVISIONING_CLIENT_06_004: [If `securityClient` implements `SymmetricKeySecurityClient` and the `transport` does not implement `SymmetricKeyProvisioningTransport`, then `create` shall throw an `ArgumentError` exception.] */
        throw new errors.ArgumentError('Transport does not support SymmetricKey authentication');
      }
    } else {
      /* Codes_SRS_PROVISIONING_CLIENT_18_005: [ If `securityClient` does not implement `X509SecurityClient`, `TPMSecurityClient`,  or `SymmetricKeySecurityClient` then `create` shall show an `ArgumentError` exception. ] */
      throw new errors.ArgumentError('Invalid security object');
    }
  }
}
