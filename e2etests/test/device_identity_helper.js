// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var ConnectionString = require('azure-iothub').ConnectionString;
var deviceSas = require('azure-iot-device').SharedAccessSignature;
var anHourFromNow = require('azure-iot-common').anHourFromNow;

var uuid = require('uuid');
var debug = require('debug')('e2etests:DeviceIdentityHelper');

var pem = require('pem');
var Registry = require('azure-iothub').Registry;

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

var registry = Registry.fromConnectionString(hubConnectionString);
var CARootCert = new Buffer(process.env.IOTHUB_CA_ROOT_CERT, 'base64').toString('ascii');
var CARootCertKey = new Buffer(process.env.IOTHUB_CA_ROOT_CERT_KEY, 'base64').toString('ascii');

var host = ConnectionString.parse(hubConnectionString).HostName;

function setupDevice(deviceDescription, provisionDescription, done) {
  registry.create(deviceDescription, function (err) {
    if (err) {
      debug('Failed to create device identity: ' + deviceDescription.deviceId + ' : ' + err.toString());
      done(err);
    } else {
      debug('Device created: ' + deviceDescription.deviceId);
      done(null, provisionDescription);
    }
  });
}

function createCertDevice(deviceId, done) {
  var certOptions = {
    selfSigned: true,
    days: 1
  };

  pem.createCertificate(certOptions, function (err, certConstructionResult) {
    if (err) {
      done(err);
    } else {
      pem.getFingerprint(certConstructionResult.certificate, function (err, fingerPrintResult) {
        if (err) {
          done(err);
        } else {
          var thumbPrint = fingerPrintResult.fingerprint.replace(/:/g, '');
          setupDevice(
            {
              deviceId: deviceId,
              status: 'enabled',
              authentication: {
                type: 'selfSigned',
                x509Thumbprint: {
                  primaryThumbprint: thumbPrint
                }
              }
            },
            {
              authenticationDescription: 'x509 certificate',
              deviceId: deviceId,
              connectionString: 'HostName=' + host + ';DeviceId=' + deviceId + ';x509=true',
              certificate: certConstructionResult.certificate,
              clientKey: certConstructionResult.clientKey
            },
            done
          );
        }
      });
    }
  });
}

function createCACertDevice(deviceId, done) {

  pem.createCSR( { commonName: deviceId }, function (err, csrResult) {
    if (err) {
      done(err);
    } else {
      pem.createCertificate(
        {
          csr: csrResult.csr,
          clientKey: csrResult.clientKey,
          serviceKey: CARootCertKey,
          serviceCertificate: CARootCert,
          serial: Math.floor(Math.random() * 1000000000),
          days: 1
        }, function (err, certConstructionResult) {
        if (err) {
          done(err);
        } else {
          setupDevice(
            {
              deviceId: deviceId,
              status: 'enabled',
              authentication: {
                type: 'certificateAuthority'
              }
            },
            {
              authenticationDescription: 'CA signed certificate',
              deviceId: deviceId,
              connectionString: 'HostName=' + host + ';DeviceId=' + deviceId + ';x509=true',
              certificate: certConstructionResult.certificate,
              clientKey: certConstructionResult.clientKey
            },
            done
          );
        }
      });
    }
  });
}

function createKeyDevice(deviceId, done) {
  var pkey = new Buffer(uuid.v4()).toString('base64');
  setupDevice(
    {
      deviceId: deviceId,
      status: 'enabled',
      authentication: {
        type: 'sas',
        symmetricKey: {
          primaryKey: pkey,
          secondaryKey: new Buffer(uuid.v4()).toString('base64')
        }
      }
    },
    {
      deviceId: deviceId,
      authenticationDescription:'shared private key',
      primaryKey: pkey,
      connectionString: 'HostName=' + host + ';DeviceId=' + deviceId + ';SharedAccessKey=' + pkey
    },
    done
  );
}

function createSASDevice(deviceId, done) {
  var pkey = new Buffer(uuid.v4()).toString('base64');
  setupDevice(
    {
      deviceId: deviceId,
      status: 'enabled',
      authentication: {
        type: 'sas',
        symmetricKey: {
          primaryKey: pkey,
          secondaryKey: new Buffer(uuid.v4()).toString('base64')
        }
      }
    },
    {
      deviceId: deviceId,
      authenticationDescription: 'application supplied SAS',
      connectionString: deviceSas.create(host, deviceId, pkey, anHourFromNow()).toString()
    },
    done
  );
}

function deleteDevice(deviceId, callback) {
  registry.delete(deviceId, callback);
}

module.exports = {
  createDeviceWithX509SelfSignedCert: function (callback) {
    createCertDevice('0000e2etest-delete-me-node-x509-' + uuid.v4(), callback);
  },
  createDeviceWithSymmetricKey: function (callback) {
    createKeyDevice('0000e2etest-delete-me-node-key-' + uuid.v4(), callback);
  },
  createDeviceWithSas: function (callback) {
    createSASDevice('0000e2etest-delete-me-node-sas-' + uuid.v4(), callback);
  },
  createDeviceWithX509CASignedCert: function (callback) {
    // max number of letters for this is
    createCACertDevice('00e2e-del-me-node-CACert-' + uuid.v4(), callback);
  },
  deleteDevice: deleteDevice
};