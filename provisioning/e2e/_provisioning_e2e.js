// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var async = require('async');
var pem = require('pem');
var uuid = require('uuid');
var assert = require('chai').assert;
var debug = require('debug')('azure-iot-provisioning-device-e2e');
var Http = require('azure-iot-provisioning-device-http').Http;
var Amqp = require('azure-iot-provisioning-device-amqp').Amqp;
var AmqpWs = require('azure-iot-provisioning-device-amqp').AmqpWs;
var Mqtt = require('azure-iot-provisioning-device-mqtt').Mqtt;
var MqttWs = require('azure-iot-provisioning-device-mqtt').MqttWs;
var ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;
var ProvisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;
var X509Security = require('azure-iot-security-x509').X509Security;
var Registry = require('azure-iothub').Registry;

var idScope = process.env.IOT_PROVISIONING_DEVICE_IDSCOPE;
var provisioningConnectionString = process.env.IOT_PROVISIONING_SERVICE_CONNECTION_STRING;
var registryConnectionString = process.env.IOTHUB_CONNECTION_STRING;
var provisioningHost = 'global.azure-devices-provisioning.net';

var provisioningServiceClient = ProvisioningServiceClient.fromConnectionString(provisioningConnectionString);
var registry = Registry.fromConnectionString(registryConnectionString);

var X509IndividualTransports = [ Http, Amqp, AmqpWs, Mqtt, MqttWs ];
var X509GroupTransports = [ Http, Amqp, AmqpWs, Mqtt, MqttWs ];

var createSelfSignedCert = function(registrationId, callback) {
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

var createIntermediateCaCert = function(authorityName, parentCert, callback) {
  var certOptions = {
    commonName: authorityName,
    serviceKey: parentCert.key,
    serviceCertificate: parentCert.cert,
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

var createDeviceCert = function(registrationId, parentCert, callback) {
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

var X509Individual = function() {

  var self = this;

  this.transports = X509IndividualTransports;
  var id = uuid.v4();

  this._deviceId = 'deleteme_provisioning_node_e2e_' + id;
  this._registrationId = 'reg-' + id;

  this.initialize = function (callback) {
    debug('creating x509 cert');
    createSelfSignedCert(this._registrationId, function(err, cert) {
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
    var securityClient = new X509Security(self._registrationId, self._cert);
    var transport = new Transport();
    var provisioningDeviceClient = ProvisioningDeviceClient.create(provisioningHost, idScope, transport, securityClient);
    provisioningDeviceClient.register(function (err, result) {
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

var createCertWithoutChain = function(registrationId, callback) {
  var rootCert = {
    cert: new Buffer(process.env.IOT_PROVISIONING_ROOT_CERT,"base64").toString('ascii'),
    key: new Buffer(process.env.IOT_PROVISIONING_ROOT_CERT_KEY,"base64").toString('ascii'),
  };
  debug('creating device cert');
  createDeviceCert(registrationId, rootCert, function(err, cert) {
    callback(err, rootCert, cert);
  });
};

var createCertWithChain = function(registrationId, callback) {
  var rootCert = {
    cert: new Buffer(process.env.IOT_PROVISIONING_ROOT_CERT,"base64").toString('ascii'),
    key: new Buffer(process.env.IOT_PROVISIONING_ROOT_CERT_KEY,"base64").toString('ascii'),
  };
  debug('creating intermediate CA cert #1');
  createIntermediateCaCert('Intermediate CA 1', rootCert, function(err, intermediateCert1) {
    if (err) {
      callback(err);
    } else {
      debug('creating intermediate CA cert #2');
      createIntermediateCaCert('Intermediate CA 2', intermediateCert1, function(err, intermediateCert2) {
        if (err) {
          callback(err);
        } else {
          debug('creating device cert');
          createDeviceCert(registrationId, intermediateCert2, function(err, cert) {
            if (err) {
              callback(err);
            } else {
              cert.cert = cert.cert + '\n' + intermediateCert2.cert + '\n' + intermediateCert1.cert;
              callback(err, intermediateCert2, cert);
            }
          });
        }
      });
    }
  });
};


var X509Group = function(certFactory) {

  var self = this;

  this.transports = X509GroupTransports;
  var id = uuid.v4();

  this._registrationId = 'reg-' + id;
  this._groupId = 'testgroup';

  this.initialize = function(callback) {
    certFactory(this._registrationId, function(err, enrollmentCert, deviceCert) {
      if (err) {
        callback(err);
      } else {
        self._enrollmentCert = enrollmentCert;
        self._cert = deviceCert;
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
              certificate: new Buffer(self._enrollmentCert.cert).toString('base64')
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
    var securityClient = new X509Security(self._registrationId, self._cert);
    var transport = new Transport();
    var provisioningDeviceClient = ProvisioningDeviceClient.create(provisioningHost, idScope, transport, securityClient);
    provisioningDeviceClient.register(function (err, result) {
      assert.isNotOk(err);
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
    {
      testName: 'x509 individual enrollment with Self Signed Certificate',
      testObj: new X509Individual()
    },
    {
      testName: 'x509 group enrollment without cert chain',
      testObj: new X509Group(createCertWithoutChain)
    },
    {
      testName: 'x509 group enrollment with cert chain',
      testObj: new X509Group(createCertWithChain)
    }
  ].forEach(function(config) {

    describe(config.testName, function() {
      this.timeout(120000);

      afterEach(function(callback) {
        config.testObj.cleanup(callback);
      });

      config.testObj.transports.forEach(function (Transport) {
        it ('can create an enrollment, register it using ' + Transport.name + ', and verify twin contents', function(callback) {

          async.waterfall([
            function(callback) {
              debug('initializing');
              config.testObj.initialize(callback);
            },
            function(callback) {
              debug('enrolling');
              config.testObj.enroll(callback);
            },
            function(callback) {
              debug('registering device');
              config.testObj.register(Transport, callback);
            },
            function(result, callback) {
              debug('success registering device');
              debug(JSON.stringify(result,null,'  '));
              debug('getting twin');
              registry.getTwin(config.testObj._deviceId,function(err, twin) {
                callback(err, twin);
              });
            },
            function(twin, callback) {
              debug('asserting twin contents');
              assert.strictEqual(twin.properties.desired.testProp, config.testObj._testProp);
              callback();
            }
          ], callback);
        });
      });
    });
  });
});
