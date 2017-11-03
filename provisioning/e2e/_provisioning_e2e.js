// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Promise = require('bluebird');
var pem = Promise.promisifyAll(require('pem'));
var uuid = require('uuid');
var assert = require('chai').assert;
var debug = require('debug')('azure-device-provisioning-e2e');
var Http = require('azure-iot-provisioning-device-http').Http;
var ProvisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;
var Registry = require('azure-iothub').Registry;

var idScope = process.env.IOTHUB_PROVISIONING_IDSCOPE;
var provisioningConnectionString = process.env.IOTHUB_PROVISIONING_CONNECTION_STRING;
var registryConnectionString = process.env.IOTHUB_CONNECTION_STRING;

var provisioningTransports = [ Http ];

describe('IoT Provisioning', function() {
  var deviceId;
  var registrationId;
  this.timeout(30000);

  var provisioningServiceClient = Promise.promisifyAll(ProvisioningServiceClient.fromConnectionString(provisioningConnectionString));
  var registry = Promise.promisifyAll(Registry.fromConnectionString(registryConnectionString));

  var createX509Cert = function(registrationId) {
    var certOptions = {
      commonName: registrationId,
      selfSigned: true,
      days: 10
    };

    return pem.createCertificateAsync(certOptions)
      .then(function(result) {
        return {
          cert: result.certificate,
          key: result.clientKey
        };
      });
  };

  var enrollX509 = function(registrationId, deviceId, x509) {
    var enrollment =  {
      registrationId: registrationId,
      deviceId: deviceId,
      attestation: {
        type: 'x509',
        x509: {
          clientCertificates: {
            primary: {
              certificate: x509.cert
            }
          }
        }
      },
      initialTwinState: {
        desiredProperties: {
          testProp: registrationId + ' ' + deviceId
        }
      }
    };

    return provisioningServiceClient.createOrUpdateIndividualEnrollmentAsync(enrollment);
  };

  beforeEach (function() {
    var id = uuid.v4();
    deviceId = 'deleteme_provisioning_node_e2e_' + id;
    registrationId = 'reg-' + id;
  });

  afterEach (function(callback) {
    debug('deleting enrollment');
    provisioningServiceClient.deleteIndividualEnrollmentAsync(registrationId)
      .catch(function() {
        debug('ignoring deleteIndividualEnrollment error');
      })
      .then(function() {
        debug('deleting device');
        registry.delete(deviceId);
      })
      .catch(function() {
        debug('ignoring delete error');
      })
      .then(function() {
        debug('done with per-test cleanup');
        callback();
      });
  });

  var assertRegistrationStatus = function(registrationId, expectedStatus, expectedDeviceId) {
    return provisioningServiceClient.getIndividualEnrollmentAsync(registrationId)
      .then(function(enrollment) {
        assert.equal(enrollment.registrationStatus.status, expectedStatus);
        if (expectedDeviceId) {
          assert.equal(enrollment.registrationStatus.deviceId, expectedDeviceId);
        }
      });
  };

  provisioningTransports.forEach(function (Transport) {
    it ('can create an x509 enrollment, register it using ' + Transport.name + ', and verify twin contents', function(callback) {
      var x509cert;

      debug('creating x509 certificate');
      createX509Cert(registrationId)
      .then(function(cert) {
        x509cert = cert;
        debug('enrolling');
        return enrollX509(registrationId, deviceId, cert);
      })
      .then(function() {
        debug('verifying registration status is unassigned');
        return assertRegistrationStatus(registrationId, 'unassigned');
      })
      .then(function() {
        debug('registering device');
        var provisioningDeviceClient = Promise.promisifyAll(Transport.createDeviceClient(idScope));
        return provisioningDeviceClient.registerAsync(registrationId, x509cert, false)
          .then(function() {
            return provisioningDeviceClient.endSessionAsync();
          });
      })
      .then(function() {
        debug('verifying registration status is assigned');
        return assertRegistrationStatus(registrationId, 'assigned', deviceId);
      })
      .then(function() {
        debug('getting twin');
        return registry.getTwinAsync(deviceId);
      })
      .then(function(twin) {
        debug('asserting twin contents');
        assert.equal(twin.properties.desired.testProp, registrationId + ' ' + deviceId);
        callback();
      })
      .catch(function(err) {
        callback(err);
      });
    });
  });
});