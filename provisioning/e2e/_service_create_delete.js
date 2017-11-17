// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var uuid = require('uuid');


var provisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;

var serviceClient = provisioningServiceClient.fromConnectionString(process.env.IOT_PROVISIONING_SERVICE_CONNECTION_STRING);

var enrollment = {
  registrationId: 'e2e-node-deleteme-psc-' + uuid.v4(),
  attestation: {
    type: 'tpm',
    tpm: {
      endorsementKey: 'a',
      storageRootKey: 'b'
    }
  }
};

var enrollmentGroup = {
  enrollmentGroupId: 'e2e-node-deleteme-psc-' + uuid.v4(),
  attestation: {
    type: 'x509',
    x509: {
      signingCertificates: {
        primary: {
          certificate: process.env.IOTHUB_CA_ROOT_CERT
        }
      }
    }
  }
};

var testDescription =   [{
  deleteFunction: serviceClient.deleteIndividualEnrollment.bind(serviceClient),
  testDescription: 'IndividualEnrollment object',
  idPropertyName: 'registrationId',
  createFunction: serviceClient.createOrUpdateIndividualEnrollment.bind(serviceClient),
  enrollmentObject: enrollment
},
{
  deleteFunction: serviceClient.deleteEnrollmentGroup.bind(serviceClient),
  testDescription: 'EnrollmentGroup object',
  idPropertyName: 'enrollmentGroupId',
  createFunction: serviceClient.createOrUpdateEnrollmentGroup.bind(serviceClient),
  enrollmentObject: enrollmentGroup
}
];
testDescription.forEach(function(testConfiguration) {
  describe('#Create', function() {
    this.timeout(10000);
    var enrollmentToDelete = {};
    after(function(done) {
      testConfiguration.deleteFunction(enrollmentToDelete, function(err) {
        assert.isNull(err,'Non null response from the delete AFTER create.');
        done();
      });
    });
    it(testConfiguration.testDescription, function(callback) {
      enrollmentToDelete = {};
      testConfiguration.createFunction(testConfiguration.enrollmentObject, function(err, returnedEnrollment) {
        assert.isNull(err,'Should be no error from the create');
        enrollmentToDelete = returnedEnrollment;
        callback();
      });
    });
  });
});

testDescription.forEach(function(testConfiguration) {
  describe('#Delete', function() {
    this.timeout(10000);
    var enrollmentToDelete = {};
    before(function(done) {
      testConfiguration.createFunction(testConfiguration.enrollmentObject, function(err, returnedEnrollment) {
        assert.isNull(err,'Should be no error from the BEFORE create');
        enrollmentToDelete = returnedEnrollment;
        done();
      });
    });
    it(testConfiguration.testDescription, function(callback) {
      testConfiguration.deleteFunction(enrollmentToDelete[testConfiguration.idPropertyName], enrollmentToDelete.etag, function(err) {
        assert.isNull(err,'Non null response from the delete.');
        enrollmentToDelete = {};
        callback();
      });
    });
  });
});