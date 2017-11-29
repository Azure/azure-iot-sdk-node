// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

import { X509Registration } from './x509_registration';
import { RegistrationClient, X509ProvisioningTransport, TpmProvisioningTransport, X509SecurityClient, TpmSecurityClient } from './interfaces';
import { errors } from 'azure-iot-common';

export class ProvisioningDeviceClient {
  /**
   * Factory method to use to create a DeviceClient object.
   *
   * @param transport Transport instance to use
   * @param securityClient: Security client object which can provide access to the necessary secrets and/or encryption functions
   */
  static create(transport: X509ProvisioningTransport | TpmProvisioningTransport, securityClient: X509SecurityClient | TpmSecurityClient): RegistrationClient {
    if ((securityClient as X509SecurityClient).getCertificate && (securityClient as X509SecurityClient).getCertificateChain) {
      if (!((transport as X509ProvisioningTransport).registerX509)) {
        throw new errors.InvalidOperationError('Transport does not support X509 authentication');
      } else {
        return new X509Registration(transport as X509ProvisioningTransport, securityClient as X509SecurityClient);
      }
    } else {
      throw new errors.InvalidOperationError('security client is not supported yet');
    }
  }
}
