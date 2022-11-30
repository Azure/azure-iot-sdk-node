// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { ConnectionString, Registry } from 'azure-iothub';
import { SharedAccessSignature as deviceSas } from 'azure-iot-device';
import { anHourFromNow, callbackToPromise } from 'azure-iot-common';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const settings = require('../_settings.json');

import * as uuid from 'uuid';
import * as dbg from 'debug';
import * as pem from 'pem';

const debug = dbg('e2etests:DeviceIdentityHelper');

const hubConnectionString = settings.iothubConnectionString;
const registry = Registry.fromConnectionString(hubConnectionString);
const caRootCert = null; // TODO: Buffer.from(process.env.IOTHUB_CA_ROOT_CERT, 'base64').toString('ascii');
const caRootCertKey = null; // TODO: Buffer.from(process.env.IOTHUB_CA_ROOT_CERT_KEY, 'base64').toString('ascii');

const host = ConnectionString.parse(hubConnectionString).HostName;

interface ProvisionedDeviceDescription {
  deviceId: string;
  authenticationDescription: string;
  connectionString: string;
  certificate?: string;
  clientKey?: string;
  primaryKey?: string;
}

type DeviceCreationCallback = (
  err?: Error,
  provisionedDevice?: ProvisionedDeviceDescription
) => void;

function setupDevice(
  deviceDescription: Registry.DeviceDescription,
  provisionDescription: ProvisionedDeviceDescription,
  done: DeviceCreationCallback
): void {
  registry.create(deviceDescription, function (err: Error): void {
    if (err) {
      debug(
        'Failed to create device identity: ' + deviceDescription.deviceId + ' : ' + err.toString()
      );
      done(err);
    } else {
      debug('Device created: ' + deviceDescription.deviceId);
      done(null, provisionDescription);
    }
  });
}

function createCertDevice(deviceId: string, done: DeviceCreationCallback): void {
  const certOptions = {
    selfSigned: true,
    days: 1,
  };

  pem.createCertificate(certOptions, function (err: Error, certConstructionResult?: any): void {
    if (err) {
      done(err);
    } else {
      pem.getFingerprint(
        certConstructionResult.certificate,
        function (err: Error, fingerPrintResult?: any): void {
          if (err) {
            done(err);
          } else {
            const thumbPrint = fingerPrintResult.fingerprint.replace(/:/g, '');
            setupDevice(
              {
                deviceId: deviceId,
                status: 'enabled',
                authentication: {
                  type: 'selfSigned',
                  x509Thumbprint: {
                    primaryThumbprint: thumbPrint,
                  },
                },
              },
              {
                authenticationDescription: 'x509 certificate',
                deviceId: deviceId,
                connectionString: 'HostName=' + host + ';DeviceId=' + deviceId + ';x509=true',
                certificate: certConstructionResult.certificate,
                clientKey: certConstructionResult.clientKey,
              },
              done
            );
          }
        }
      );
    }
  });
}

function createCACertDevice(deviceId: string, done: DeviceCreationCallback): void {
  pem.createCSR({ commonName: deviceId }, function (err: Error, csrResult?: any): void {
    if (err) {
      done(err);
    } else {
      pem.createCertificate(
        {
          csr: csrResult.csr,
          clientKey: csrResult.clientKey,
          serviceKey: caRootCertKey,
          serviceCertificate: caRootCert,
          serial: Math.floor(Math.random() * 1000000000),
          days: 1,
        },
        function (err: Error, certConstructionResult?: any): void {
          if (err) {
            done(err);
          } else {
            setupDevice(
              {
                deviceId: deviceId,
                status: 'enabled',
                authentication: {
                  type: 'certificateAuthority',
                },
              },
              {
                authenticationDescription: 'CA signed certificate',
                deviceId: deviceId,
                connectionString: 'HostName=' + host + ';DeviceId=' + deviceId + ';x509=true',
                certificate: certConstructionResult.certificate,
                clientKey: certConstructionResult.clientKey,
              },
              done
            );
          }
        }
      );
    }
  });
}

function createKeyDevice(deviceId: string, done: DeviceCreationCallback): void {
  const pkey = Buffer.from(uuid.v4()).toString('base64');
  setupDevice(
    {
      deviceId: deviceId,
      status: 'enabled',
      authentication: {
        type: 'sas',
        symmetricKey: {
          primaryKey: pkey,
          secondaryKey: Buffer.from(uuid.v4()).toString('base64'),
        },
      },
    },
    {
      deviceId: deviceId,
      authenticationDescription: 'shared private key',
      primaryKey: pkey,
      connectionString: 'HostName=' + host + ';DeviceId=' + deviceId + ';SharedAccessKey=' + pkey,
    },
    done
  );
}

function createSASDevice(deviceId: string, done: DeviceCreationCallback): void {
  const pkey = Buffer.from(uuid.v4()).toString('base64');
  setupDevice(
    {
      deviceId: deviceId,
      status: 'enabled',
      authentication: {
        type: 'sas',
        symmetricKey: {
          primaryKey: pkey,
          secondaryKey: Buffer.from(uuid.v4()).toString('base64'),
        },
      },
    },
    {
      deviceId: deviceId,
      authenticationDescription: 'application supplied SAS',
      connectionString: deviceSas.create(host, deviceId, pkey, anHourFromNow()).toString(),
    },
    done
  );
}

export function deleteDevice(deviceId: string): Promise<void>;
export function deleteDevice(
  deviceId: string,
  callback?: (err: Error, t1?: unknown, t2?: unknown) => void
): void | Promise<void> {
  return callbackToPromise<void>((_callback) => {
    registry.delete(deviceId, _callback);
  }, callback);
}

export function createDeviceWithX509SelfSignedCert(): Promise<ProvisionedDeviceDescription>;
export function createDeviceWithX509SelfSignedCert(
  callback?: DeviceCreationCallback
): void | Promise<ProvisionedDeviceDescription> {
  return callbackToPromise<ProvisionedDeviceDescription>((_callback) => {
    createCertDevice('0000e2etest-delete-me-node-x509-' + uuid.v4(), _callback);
  }, callback);
}

export function createDeviceWithSymmetricKey(): Promise<ProvisionedDeviceDescription>;
export function createDeviceWithSymmetricKey(
  callback?: DeviceCreationCallback
): void | Promise<ProvisionedDeviceDescription> {
  return callbackToPromise<ProvisionedDeviceDescription>((_callback) => {
    createKeyDevice('0000e2etest-delete-me-node-key-' + uuid.v4(), _callback);
  }, callback);
}
export function createDeviceWithSas(): Promise<ProvisionedDeviceDescription>;
export function createDeviceWithSas(
  callback?: DeviceCreationCallback
): void | Promise<ProvisionedDeviceDescription> {
  return callbackToPromise<ProvisionedDeviceDescription>((_callback) => {
    createSASDevice('0000e2etest-delete-me-node-sas-' + uuid.v4(), _callback);
  }, callback);
}
export function createDeviceWithX509CASignedCert(): Promise<ProvisionedDeviceDescription>;
export function createDeviceWithX509CASignedCert(
  callback?: DeviceCreationCallback
): void | Promise<ProvisionedDeviceDescription> {
  return callbackToPromise<ProvisionedDeviceDescription>((_callback) => {
    createCACertDevice('00e2e-del-me-node-CACert-' + uuid.v4(), _callback);
  }, callback);
}
