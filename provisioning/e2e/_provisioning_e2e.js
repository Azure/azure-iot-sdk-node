// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var async = require('async');
var pem = require('pem');
var uuid = require('uuid');
var assert = require('chai').assert;
var debug = require('debug')('azure-device-provisioning-e2e');
var Http = require('azure-iot-provisioning-device-http').Http;
var ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;
var ProvisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;
var X509Security = require('azure-iot-security-x509').X509Security;
var Registry = require('azure-iothub').Registry;

var idScope = process.env.IOT_PROVISIONING_DEVICE_IDSCOPE;
var provisioningConnectionString = process.env.IOT_PROVISIONING_SERVICE_CONNECTION_STRING;
var registryConnectionString = process.env.IOTHUB_CONNECTION_STRING;


var provisioningServiceClient = ProvisioningServiceClient.fromConnectionString(provisioningConnectionString);
var registry = Registry.fromConnectionString(registryConnectionString);

var createX509Certificate = function (certOptions, callback) {
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

var X509Individual = function() {

  var self = this;

  this.testDescription = 'x509 individual device enrollment';
  this.transports = [ Http ];
  var id = uuid.v4();

  this._deviceId = 'deleteme_provisioning_node_e2e_' + id;
  this._registrationId = 'reg-' + id;

  this.initialize = function (callback) {
    var certOptions = {
      commonName: self._registrationId,
      selfSigned: true,
      days: 10
    };
    debug('creating x509 cert');
    createX509Certificate(certOptions, function(err, cert) {
      if (err) {
        callback(err);
      } else {
        self._cert = cert;
        callback();
      }
    });
  };

  this.enroll = function (callback) {
    self._testProp = self._registrationId + ' ' + self._deviceId;
    var enrollment = {
      registrationId: self._registrationId,
      deviceId: self._deviceId,
      attestation: {
        type: 'x509',
        x509: {
          clientCertificates: {
            primary: {
              certificate: self._cert.cert
            }
          }
        }
      },
      initialTwin: {
        properties: {
          desired: {
            testProp: self._testProp
          }
        }
      }
    };

    provisioningServiceClient.createOrUpdateIndividualEnrollment(enrollment, function (err) {
      if (err) {
        callback(err);
      } else {
        callback();
      }
    });
  };

  this.register = function (Transport, callback) {
    var securityClient = new X509Security(self._cert);
    var transport = new Transport(idScope);
    var provisioningDeviceClient = ProvisioningDeviceClient.create(transport, securityClient);
    provisioningDeviceClient.register(self._registrationId, false, function (err, result) {
      callback(err, result);
    });
  };

  this.cleanup = function (callback) {
    debug('deleting enrollment');
    provisioningServiceClient.deleteIndividualEnrollment(self._registrationId, function (err) {
      if (err) {
        debug('ignoring deleteIndividualEnrollment error');
      }
      debug('deleting device');
      registry.delete(self._deviceId, function (err) {
        if (err) {
          debug('ignoring delete error');
        }
        debug('done with X509 individual cleanup');
        callback();
      });
    });
  };
};

var X509Group = function() {

  var self = this;

  this.testDescription = 'x509 group device enrollment';
  this.transports = [ Http ];
  var id = uuid.v4();

  this._registrationId = 'reg-' + id;
  this._groupId = 'testgroup';

  this.initialize = function(callback) {
    debug('creating device cert');
    self._factoryCert = {
        cert: new Buffer(process.env.IOTHUB_CA_ROOT_CERT,"base64").toString('ascii'),
        key: new Buffer(process.env.IOTHUB_CA_ROOT_CERT_KEY,"base64").toString('ascii'),
      };
    var deviceCertOptions = {
      commonName: self._registrationId,
      serviceKey: self._factoryCert.key,
      serviceCertificate: self._factoryCert.cert,
      serviceKeyPassword: '123',
      serial: Math.floor(Math.random() * 1000000000),
      days: 1,
      config: [
        '[req]',
        'req_extensions = v3_req',
        'distinguished_name = req_distinguished_name',
        '[req_distinguished_name]',
        'commonName = ' + self._registrationId,
        '[v3_req]',
        'extendedKeyUsage = critical,clientAuth'
      ].join('\n')
    };
    pem.createCertificate(deviceCertOptions, function(err, cert) {
      if (err) {
        callback(err);
      } else {
        self._cert = {
          key: cert.clientKey,
          cert: cert.certificate
        };
        callback();
      }
    });
  };

  this.enroll = function(callback) {

    self._testProp = self._registrationId;
    var enrollmentGroup = {
      enrollmentGroupId: self._groupId,
      attestation: {
        type: 'x509',
        x509: {
          signingCertificates: {
            primary: {
              certificate: new Buffer(self._factoryCert.cert).toString('base64')
            }
          }
        }
      },
      initialTwin: {
        properties: {
          desired: {
            testProp: self._testProp
          }
        }
      }
    };


    provisioningServiceClient.deleteEnrollmentGroup(enrollmentGroup.enrollmentGroupId, function() {
      // ignore delete error.  We're just cleaning up from a previous run.
      provisioningServiceClient.createOrUpdateEnrollmentGroup(enrollmentGroup, function(err) {
        if (err) {
          callback(err);
        } else {
          callback();
        }
      });
    });
  };

  this.register = function (Transport, callback) {
    var securityClient = new X509Security(self._cert);
    var transport = new Transport(idScope);
    var provisioningDeviceClient = ProvisioningDeviceClient.create(transport, securityClient);
    provisioningDeviceClient.register(self._registrationId, false, function (err, result) {
      assert.isOk(result.deviceId);
      self._deviceId = result.deviceId;
      callback(err, result);
    });
  };

  this.cleanup = function (callback) {
    debug('deleting device');
    registry.delete(self._deviceId, function (err) {
      if (err) {
        debug('ignoring delete error');
      }
      debug('deleting enrollment group');
      provisioningServiceClient.deleteEnrollmentGroup(self._groupId, function(err) {
        if (err) {
          debug('ignoring deleteEnrollmentGroup error');
        }
        debug('done with group cleanup');
        callback();
      });
    });
  };
};

describe('IoT Provisioning', function() {
  [
    new X509Individual(),
    new X509Group()
  ].forEach(function(config) {

    describe(config.testDescription, function() {
      this.timeout(120000);

      afterEach(function(callback) {
        config.cleanup(callback);
      });

      config.transports.forEach(function (Transport) {
        it ('can create an enrollment, register it using ' + Transport.name + ', and verify twin contents', function(callback) {

          async.waterfall([
            function(callback) {
              debug('initializing');
              config.initialize(callback);
            },
            function(callback) {
              debug('enrolling');
              config.enroll(callback);
            },
            function(callback) {
              debug('registering device');
              config.register(Transport, callback);
            },
            function(result, callback) {
              debug('success registering device');
              debug(JSON.stringify(result,null,'  '));
              debug('getting twin');
              registry.getTwin(config._deviceId,function(err, twin) {
                callback(err, twin);
              });
            },
            function(twin, callback) {
              debug('asserting twin contents');
              assert.strictEqual(twin.properties.desired.testProp, config._testProp);
              callback();
            }
          ], callback);
        });
      });
    });
  });
});
