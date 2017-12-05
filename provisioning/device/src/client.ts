// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

import { X509Registration } from './x509_registration';
import { TpmRegistration } from './tpm_registration';
import { RegistrationClient, X509ProvisioningTransport, TpmProvisioningTransport, X509SecurityClient, TpmSecurityClient } from './interfaces';
import { errors } from 'azure-iot-common';

export class ProvisioningDeviceClient {
  /**
   * Factory method to use to create a DeviceClient object.
   *
   * @param transport Transport instance to use
   * @param securityClient: Security client object which can provide access to the necessary secrets and/or encryption functions
   */
  static create(provisioningHost: string, idScope: string, transport: X509ProvisioningTransport | TpmProvisioningTransport, securityClient: X509SecurityClient | TpmSecurityClient): RegistrationClient {
    const isX509Security: boolean = ((securityClient as X509SecurityClient).getCertificate !== undefined);
    const isX509Transport: boolean = ((transport as X509ProvisioningTransport).registerX509 !== undefined);
    const isTpmSecurity: boolean = ((securityClient as TpmSecurityClient).getEndorsementKey !== undefined);
    const isTpmTransport: boolean = ((transport as TpmProvisioningTransport).getAuthenticationChallenge !== undefined);

    if (isX509Security) {
      if (isX509Transport) {
        /* Codes_SRS_PROVISIONING_CLIENT_18_001: [ If `securityClient` implements `X509SecurityClient` and the `transport` implements `X509ProvisioningTransport`, then `create` shall return an `X509Registration` object. ] */
        return new X509Registration(provisioningHost, idScope, transport as X509ProvisioningTransport, securityClient as X509SecurityClient);
      } else {
        /* Codes_SRS_PROVISIONING_CLIENT_18_002: [ If `securityClient` implements `X509SecurityClient` and the `transport` does not implement `X509ProvisioningTransport`, then `create` shall throw a `ArgumentError` exepction. ] */
        throw new errors.ArgumentError('Transport does not support X509 authentication');
      }
    } else if (isTpmSecurity) {
      if (isTpmTransport) {
        /* Codes_SRS_PROVISIONING_CLIENT_18_003: [ If `securityClient` implements `TPMSecurityClient` and the `transport` supports TPM authentication, then `create` shall return a `TpmRegistration` object. ] */
        return new TpmRegistration(provisioningHost, idScope, transport as TpmProvisioningTransport, securityClient as TpmSecurityClient);
      } else {
        /* Codes_SRS_PROVISIONING_CLIENT_18_004: [ If `securityClient` implements `TPMSecurityClient` and the `transport` dos not implement `TPMProvisioningTransport`, then `create` shall throw a `ArgumentError` exepction. ] */
        throw new errors.ArgumentError('Transport does not support TPM authentication');
      }
    } else {
      /* Codes_SRS_PROVISIONING_CLIENT_18_005: [ If `securityClient` dos not implement `X509ProvisioningTransport` or `TPMProvisioningTransport`, then `create` shall show an `ArgumentError` exception. ] */
      throw new errors.ArgumentError('Invalid security object');
    }
  }
}
