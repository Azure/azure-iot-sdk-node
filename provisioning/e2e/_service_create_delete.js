// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var uuid = require('uuid');
var debug = require('debug')('azure-iot-provisioning-device-e2e');
var certHelper = require('./cert_helper');

var provisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;

var serviceClient = provisioningServiceClient.fromConnectionString(process.env.IOT_PROVISIONING_SERVICE_CONNECTION_STRING);

var enrollment = {
  registrationId: 'e2e-node-deleteme-psc-' + uuid.v4(),
  attestation: {
    type: 'tpm',
    tpm: {
      endorsementKey: "AToAAQALAAMAsgAgg3GXZ0SEs/gakMyNRqXXJP1S124GUgtk8qHaGzMUaaoABgCAAEMAEAgAAAAAAAEAtKEADl/sNRgmYAjP6gXmbccRaJoTnVixisUaek0OwAzFGN70xt9ZOYp6fhIwfcft3fdVKOrKpXYcTe72CGNkGJGlQz5ti9n2pQ0uJhcX8aefh4Onm7lVlUCQAVp1K0r6zI8vkEXWsBIvwvxk0eMJbFaq146kbTkJHIGczb89RkFH2TX+CgXeZOG9oXQzUNwktmTUacspamune5Wywc/ce8HsDFYchyUHogFhrZ/LPnzyTDXO8sSC5z5dvsUBtUME3iRYDyKgZOfBtmRMqQewD+4iH+ZEJjtsyJiWR8hFhyKROnOuqXfNFwjd5IcNU4wtlKO0cLyXmTOfQK6Da1pr5Q=="
    }
  },
  provisioningStatus: "enabled",
  capabilities: {
    iotEdge: true
  },
  reprovisionPolicy: {
    updateHubAssignment: true,
    migrateDeviceData: true
  },
  allocationPolicy: 'custom',
  customAllocationDefinition: {
    webhookUrl: 'https://web.hook',
    apiVersion: '2018-11-01'
  }
};

var symmetricKeyEnrollment = {
  registrationId: 'e2e-node-deleteme-psc-' + uuid.v4(),
  attestation: {
    type: 'symmetricKey',
    symmetricKey: {
      primaryKey: Buffer.from(uuid.v4()).toString('base64'),
      secondaryKey: Buffer.from(uuid.v4()).toString('base64')
    }
  },
  provisioningStatus: "enabled",
  reprovisionPolicy: {
    updateHubAssignment: false,
    migrateDeviceData: false
  },
  allocationPolicy: 'hashed'
};

var enrollmentGroup = {
  enrollmentGroupId: 'e2e-node-deleteme-psc-' + uuid.v4(),
  attestation: {
    type: 'x509',
    x509: {
      signingCertificates: {
        primary: {
          certificate: ''
        }
      }
    }
  },
  provisioningStatus: "enabled",
  reprovisionPolicy: {
    updateHubAssignment: true,
    migrateDeviceData: false
  },
  allocationPolicy: 'geoLatency'
};

var symmetricKeyEnrollmentGroup = {
  enrollmentGroupId: 'e2e-node-deleteme-psc-' + uuid.v4(),
  attestation: {
    type: 'symmetricKey',
    symmetricKey: {
      primaryKey: Buffer.from(uuid.v4()).toString('base64'),
      secondaryKey: Buffer.from(uuid.v4()).toString('base64')
    }
  },
  provisioningStatus: "enabled",
  reprovisionPolicy: {
    updateHubAssignment: false,
    migrateDeviceData: true
  },
  allocationPolicy: 'static'
};

describe('Provisioning Service Client: CRUD operations', function () {
  this.timeout(60000);
  before(function(done) {
    certHelper.createIntermediateCaCert('test cert', null, function(err, cert) {
      if (err) {
        done(err);
      } else {
        enrollmentGroup.attestation.x509.signingCertificates.primary.certificate = cert.cert;
        done();
      }
    });
  });

  var testSpecification = [
    {
      getFunction: serviceClient.getIndividualEnrollment.bind(serviceClient),
      deleteFunction: serviceClient.deleteIndividualEnrollment.bind(serviceClient),
      getAttestationMechanismFunction: serviceClient.getIndividualEnrollmentAttestationMechanism.bind(serviceClient),
      testDescription: 'IndividualEnrollment object with TPM',
      idPropertyName: 'registrationId',
      createFunction: serviceClient.createOrUpdateIndividualEnrollment.bind(serviceClient),
      updateFunction: serviceClient.createOrUpdateIndividualEnrollment.bind(serviceClient),
      enrollmentObject: enrollment
    },
    {
      getFunction: serviceClient.getIndividualEnrollment.bind(serviceClient),
      deleteFunction: serviceClient.deleteIndividualEnrollment.bind(serviceClient),
      getAttestationMechanismFunction: serviceClient.getIndividualEnrollmentAttestationMechanism.bind(serviceClient),
      testDescription: 'IndividualEnrollment object with symmetric keys',
      idPropertyName: 'registrationId',
      createFunction: serviceClient.createOrUpdateIndividualEnrollment.bind(serviceClient),
      updateFunction: serviceClient.createOrUpdateIndividualEnrollment.bind(serviceClient),
      enrollmentObject: symmetricKeyEnrollment
    },
    {
      getFunction: serviceClient.getEnrollmentGroup.bind(serviceClient),
      deleteFunction: serviceClient.deleteEnrollmentGroup.bind(serviceClient),
      getAttestationMechanismFunction: serviceClient.getEnrollmentGroupAttestationMechanism.bind(serviceClient),
      testDescription: 'EnrollmentGroup object with x509',
      idPropertyName: 'enrollmentGroupId',
      createFunction: serviceClient.createOrUpdateEnrollmentGroup.bind(serviceClient),
      updateFunction: serviceClient.createOrUpdateEnrollmentGroup.bind(serviceClient),
      enrollmentObject: enrollmentGroup
    },
    {
      getFunction: serviceClient.getEnrollmentGroup.bind(serviceClient),
      deleteFunction: serviceClient.deleteEnrollmentGroup.bind(serviceClient),
      getAttestationMechanismFunction: serviceClient.getEnrollmentGroupAttestationMechanism.bind(serviceClient),
      testDescription: 'EnrollmentGroup object with symmetric keys',
      idPropertyName: 'enrollmentGroupId',
      createFunction: serviceClient.createOrUpdateEnrollmentGroup.bind(serviceClient),
      updateFunction: serviceClient.createOrUpdateEnrollmentGroup.bind(serviceClient),
      enrollmentObject: symmetricKeyEnrollmentGroup
    }
  ];
  testSpecification.forEach(function(testConfiguration) {
    describe('#Create', function() {
      var enrollmentToDelete = {};
      after(function(done) {
        debug('before get: enrollment record etag: ' + enrollmentToDelete.etag);
        testConfiguration.getFunction(enrollmentToDelete[testConfiguration.idPropertyName], function (err, getResult) {
          if (err) {
            debug(err);
          } else {
            debug('after get: enrollment record etag: ' + enrollmentToDelete.etag);
            testConfiguration.deleteFunction(getResult, function(err) {
              if (err) {
                debug(err);
              }
              assert.isNull(err, 'Non null response from the delete AFTER create.');
              done();
            });
          }
        });
      });
      it(testConfiguration.testDescription, function(callback) {
        enrollmentToDelete = {};
        testConfiguration.createFunction(testConfiguration.enrollmentObject, function(err, returnedEnrollment) {
          if (err) {
            debug(err);
          }
          assert.isNull(err,'Should be no error from the create');
          enrollmentToDelete = returnedEnrollment;
          callback();
        });
      });
    });
  });

  testSpecification.forEach(function(testConfiguration) {
    describe('#Delete', function() {
      var enrollmentToDelete = {};
      before(function(done) {
        testConfiguration.createFunction(testConfiguration.enrollmentObject, function(err, returnedEnrollment) {
          if (err) {
            debug(err);
          }
          assert.isNull(err, 'Should be no error from the BEFORE create');
          enrollmentToDelete = returnedEnrollment;
          done();
        });
      });
      it(testConfiguration.testDescription, function(callback) {
        testConfiguration.deleteFunction(enrollmentToDelete[testConfiguration.idPropertyName], enrollmentToDelete.etag, function(err) {
          if (err) {
            debug(err);
          }
          assert.isNull(err, 'Non null response from the delete.');
          enrollmentToDelete = {};
          callback();
        });
      });
    });
  });

  testSpecification.forEach(function(testConfiguration) {
    describe('#Update', function() {
      var enrollmentToDelete = {};
      var enrollmentToUpdate = {};
      before(function(done) {
        testConfiguration.createFunction(testConfiguration.enrollmentObject, function(err, returnedEnrollment) {
          if (err) {
            debug(err);
          }
          assert.isNull(err, 'Should be no error from the create');
          enrollmentToUpdate = returnedEnrollment;
          done();
        });
      });
      after(function(done) {
        testConfiguration.deleteFunction(enrollmentToDelete, function(err) {
          if (err) {
            debug(err);
          }
          assert.isNull(err, 'Non null response from the delete AFTER create.');
          done();
        });
      });
      it(testConfiguration.testDescription, function(callback) {
        enrollmentToDelete = {};
        enrollmentToUpdate.provisioningStatus = 'disabled';
        testConfiguration.updateFunction(enrollmentToUpdate, function(err, updatedEnrollment) {
          if (err) {
            debug(err);
          }
          assert.isNull(err);
          assert.equal(updatedEnrollment.provisioningStatus, 'disabled', 'provsioning state not disabled');
          enrollmentToDelete = updatedEnrollment;
          callback();
        });
      });
    });

    describe('#getAttestationMechanism', function () {
      var enrollmentToVerify;
      before(function(done) {
        testConfiguration.createFunction(testConfiguration.enrollmentObject, function(err, returnedEnrollment) {
          if (err) {
            debug(err);
          }
          assert.isNull(err, 'Should be no error from the create');
          enrollmentToVerify = returnedEnrollment;
          done();
        });
      });
      after(function(done) {
        testConfiguration.deleteFunction(enrollmentToVerify, function(err) {
          if (err) {
            debug(err);
          }
          assert.isNull(err, 'Non null response from the delete AFTER create.');
          done();
        });
      });
      it(testConfiguration.testDescription, function(done) {
        testConfiguration.getAttestationMechanismFunction(enrollmentToVerify[testConfiguration.idPropertyName], function (err, attestationMechanism) {
          if (err) {
            debug(err);
          }
          assert.isNull(err);
          assert.strictEqual(testConfiguration.enrollmentObject.attestation.type, attestationMechanism.type);
          done();
        });
      });
    });
  });
});
