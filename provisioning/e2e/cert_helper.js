// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var pem = require('pem');

module.exports.createSelfSignedCert = function(registrationId, callback) {
  var certOptions = {
    commonName: registrationId,
    selfSigned: true,
    days: 10
  };
  pem.createCertificate(certOptions, function (err, result) {
    if (err) {
      callback(err);
    } else {
      var x509 = {
        cert: result.certificate,
        key: result.clientKey
      };
      callback(null, x509);
    }
  });
};

module.exports.createIntermediateCaCert = function(authorityName, parentCert, callback) {
  var certOptions = {
    commonName: authorityName,
    serial: Math.floor(Math.random() * 1000000000),
    days: 1,
    config: [
      '[req]',
      'req_extensions = v3_req',
      'distinguished_name = req_distinguished_name',
      'x509_extensions = v3_ca',
      '[req_distinguished_name]',
      'commonName = ' + authorityName,
      '[v3_req]',
      'basicConstraints = critical, CA:true'
    ].join('\n')
  };
  if (parentCert) {
    certOptions.serviceKey = parentCert.key;
    certOptions.serviceCertificate = parentCert.cert;
  }
  pem.createCertificate(certOptions, function(err, cert) {
    if (err) {
      callback(err);
    } else {
      var x509 = {
        key: cert.clientKey,
        cert: cert.certificate
      };
      callback(null, x509);
    }
  });
};

module.exports.createDeviceCert = function(registrationId, parentCert, callback) {
  var deviceCertOptions = {
    commonName: registrationId,
    serviceKey: parentCert.key,
    serviceCertificate: parentCert.cert,
    serial: Math.floor(Math.random() * 1000000000),
    days: 1,
    config: [
      '[req]',
      'req_extensions = v3_req',
      'distinguished_name = req_distinguished_name',
      '[req_distinguished_name]',
      'commonName = ' + registrationId,
      '[v3_req]',
      'extendedKeyUsage = critical,clientAuth'
    ].join('\n')
  };
  pem.createCertificate(deviceCertOptions, function(err, cert) {
    if (err) {
      callback(err);
    } else {
      var x509 = {
        key: cert.clientKey,
        cert: cert.certificate
      };
      callback(null, x509);
    }
  });
};

