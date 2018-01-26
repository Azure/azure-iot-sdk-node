// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var async = require('async');
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
var certHelper = require('./cert_helper');
var TpmSecurityClient = require('azure-iot-security-tpm').TpmSecurityClient;
var TssJs = require("tss.js");

var idScope = process.env.IOT_PROVISIONING_DEVICE_IDSCOPE;
var provisioningConnectionString = process.env.IOT_PROVISIONING_SERVICE_CONNECTION_STRING;
var registryConnectionString = process.env.IOTHUB_CONNECTION_STRING;
var provisioningHost = 'global.azure-devices-provisioning.net';

var provisioningServiceClient = ProvisioningServiceClient.fromConnectionString(provisioningConnectionString);
var registry = Registry.fromConnectionString(registryConnectionString);

// avoid unused object warning when commenting out tests
/* exported X509Individual, createCertWithoutChain, createCertWithChain, X509Group, TpmIndividual, createAllCerts */

var X509IndividualTransports = [ Http, Amqp, AmqpWs, Mqtt, MqttWs ];
var X509GroupTransports = [ Http, Amqp, AmqpWs, Mqtt, MqttWs ];
var TpmIndividualTransports = [ Http, Amqp, AmqpWs ];

var rootCert = {
  cert: new Buffer(process.env.IOT_PROVISIONING_ROOT_CERT,"base64").toString('ascii'),
  key: new Buffer(process.env.IOT_PROVISIONING_ROOT_CERT_KEY,"base64").toString('ascii'),
};
var selfSignedCert;
var certWithoutChain;
var intermediateCert1;
var intermediateCert2;
var certWithChain;
var x509DeviceId;
var x509RegistrationId;


var createAllCerts = function(callback) {
  var id = uuid.v4();
  x509DeviceId = 'deleteme_provisioning_node_e2e_' + id;
  x509RegistrationId = 'reg-' + id;

  async.waterfall([
    function(callback) {
      debug('creating self-signed cert');
      certHelper.createSelfSignedCert(x509RegistrationId, function(err, cert) {
        selfSignedCert = cert;
        callback(err);
      });
    },
    function(callback) {
      debug('creating cert without chain');
      certHelper.createDeviceCert(x509RegistrationId, rootCert, function(err, cert) {
        certWithoutChain = cert;
        callback(err);
      });
    },
    function(callback) {
      debug('creating intermediate CA cert #1');
      certHelper.createIntermediateCaCert('Intermediate CA 1', rootCert, function(err, cert) {
        intermediateCert1 = cert;
        callback(err);
      });
    },
    function(callback) {
      debug('creating intermediate CA cert #2');
      certHelper.createIntermediateCaCert('Intermediate CA 2', intermediateCert1, function(err, cert) {
        intermediateCert2 = cert;
        callback(err);
      });
    },
    function(callback) {
      debug('creating cert with chain');
      certHelper.createDeviceCert(x509RegistrationId, intermediateCert2, function(err, cert) {
        cert.cert = cert.cert + '\n' + intermediateCert2.cert + '\n' + intermediateCert1.cert;
        certWithChain = cert;
        callback(err);
      });
    },
    function(callback) {
      debug('sleeping to account for clock skew');
      setTimeout(callback, 60000);
    }
  ], callback);
};

var X509Individual = function() {

  var self = this;

  this.transports = X509IndividualTransports;

  this.initialize = function (callback) {
    self._cert = selfSignedCert;
    self.deviceId = x509DeviceId;
    self.registrationId = x509RegistrationId;
    callback();
  };

  this.enroll = function (callback) {
    self._testProp = uuid.v4();
    var enrollment = {
      registrationId: self.registrationId,
      deviceId: self.deviceId,
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
    var securityClient = new X509Security(this.registrationId, self._cert);
    var transport = new Transport();
    var provisioningDeviceClient = ProvisioningDeviceClient.create(provisioningHost, idScope, transport, securityClient);
    provisioningDeviceClient.register(function (err, result) {
      callback(err, result);
    });
  };

  this.cleanup = function (callback) {
    debug('deleting enrollment');
    provisioningServiceClient.deleteIndividualEnrollment(this.registrationId, function (err) {
      if (err) {
        debug('ignoring deleteIndividualEnrollment error');
      }
      debug('deleting device');
      registry.delete(self.deviceId, function (err) {
        if (err) {
          debug('ignoring delete error');
        }
        debug('done with X509 individual cleanup');
        callback();
      });
    });
  };
};

var createCertWithoutChain = function(callback) {
  callback(null, rootCert, certWithoutChain);
};

var createCertWithChain = function(callback) {
  callback(null, intermediateCert2, certWithChain);
};

var X509Group = function(certFactory) {

  var self = this;

  this.transports = X509GroupTransports;
  this._groupId = 'testgroup';

  this.initialize = function(callback) {
    self.registrationId = x509RegistrationId;
    certFactory(function(err, enrollmentCert, deviceCert) {
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

    self._testProp = uuid.v4();
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
    var securityClient = new X509Security(self.registrationId, self._cert);
    var transport = new Transport();
    var provisioningDeviceClient = ProvisioningDeviceClient.create(provisioningHost, idScope, transport, securityClient);
    provisioningDeviceClient.register(function (err, result) {
      assert.isNotOk(err);
      assert.isOk(result.deviceId);
      self.deviceId = result.deviceId;
      callback(err, result);
    });
  };

  this.cleanup = function (callback) {
    debug('deleting device');
    registry.delete(self.deviceId, function (err) {
      if (err) {
        debug('ignoring delete error');
      }
      debug('deletingchenrollment group');
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

var tpm = null;
var TpmIndividual = function() {

  var self = this;
  var ek;
  var securityClient;

  this.transports = TpmIndividualTransports;

  this.initialize = function (callback) {
    var id = uuid.v4();
    self.deviceId = 'deleteme_provisioning_node_e2e_' + id;
    self.registrationId = 'reg-' + id;
      if (!tpm) {
      tpm = new TssJs.Tpm(false);
    }
    securityClient = new TpmSecurityClient(self.registrationId, tpm);
    securityClient.getEndorsementKey(function(err, endorsementKey) {
      if (err) {
        callback(err);
      } else {
        ek = endorsementKey.toString('base64');
        callback();
      }
    });
  };

  this.enroll = function (callback) {
    self._testProp = uuid.v4();
    var enrollment = {
      registrationId: self.registrationId,
      deviceId: self.deviceId,
      attestation: {
        type: 'tpm',
        tpm: {
          endorsementKey: ek
        }
      },
      provisioningStatus: "enabled",
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
    var transport = new Transport();
    var provisioningDeviceClient = ProvisioningDeviceClient.create(provisioningHost, idScope, transport, securityClient);
    provisioningDeviceClient.register(function (err, result) {
      callback(err, result);
    });
  };

  this.cleanup = function (callback) {
    debug('deleting enrollment');
    provisioningServiceClient.deleteIndividualEnrollment(self.registrationId, function (err) {
      if (err) {
        debug('ignoring deleteIndividualEnrollment error');
      }
      debug('deleting device');
      registry.delete(self.deviceId, function (err) {
        if (err) {
          debug('ignoring delete error');
        }
        debug('done with TPM individual cleanup');
        callback();
      });
    });
  };
};

describe('IoT Provisioning', function() {
  this.timeout(120000);
  before(createAllCerts);

  [
    /*
    {
      testName: 'TPM Individual Enrollment',
      testObj: new TpmIndividual()
    },
    */
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
              registry.getTwin(config.testObj.deviceId,function(err, twin) {
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
