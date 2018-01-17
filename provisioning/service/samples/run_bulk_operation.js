// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var provisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;

var argv = require('yargs')
  .usage('Usage: $0 --connectionstring <DEVICE PROVISIONING CONNECTION STRING> ')
  .option('connectionstring', {
    alias: 'c',
    describe: 'The connection string for the Device Provisioning instance',
    type: 'string',
    demandOption: true
  })
  .argv;

var connectionString = argv.connectionString;
var serviceClient = provisioningServiceClient.fromConnectionString(connectionString);

var enrollment1 = {
  registrationId: 'first',
  provisioningStatus: 'disabled',
  attestation: {
    type: 'tpm',
    tpm: {
      endorsementKey: 'a'
    }
  }
};

var enrollment2 = {
  registrationId: 'second',
  provisioningStatus: 'disabled',
  attestation: {
    type: 'tpm',
    tpm: {
      endorsementKey: 'a'
    }
  }
};

var enrollment3 = {
  registrationId: 'third',
  provisioningStatus: 'disabled',
  attestation: {
    type: 'tpm'
  }
};

var badCreateBulkOperation = {
  mode: 'create',
  enrollments: []
};
badCreateBulkOperation.enrollments.push(enrollment1);
badCreateBulkOperation.enrollments.push(enrollment2);
badCreateBulkOperation.enrollments.push(enrollment2);

//
// runBulkEnrollmentOperation has two different ways that errors can be indicated to the
// caller.  The err parameter on the callback or through the result parameter
// on the callback.
//
// This first runBulkEnrollmentOperation will fail.  The reason it fails is because we have
// a duplicate entry in the bulk array.  This will NOT produce a BulkEnrollmentOperationResult.
//
serviceClient.runBulkEnrollmentOperation(badCreateBulkOperation, function (err, result) {
  if (err) {
    console.log('The bulk operation result is: ' + err);
  }
  console.log('The value of the result operation should be undefined: ', JSON.stringify(result, null, 2));
  //
  // Get rid of the duplicate entry and put in an entry without an actual attestation.
  // Some of the bulk create will work but we should get a BulkEnrollmentOperationResult
  // that indicates the third one failed.
  //
  badCreateBulkOperation.enrollments.splice(2, 1);
  badCreateBulkOperation.enrollments.push(enrollment3);
  serviceClient.runBulkEnrollmentOperation(badCreateBulkOperation, function (err, result) {
    console.log('The err parameter should be null for this second bulkOperation call, err: ' + err);
    console.log('The value of the result operation should indicate the third enrollment was bad: ' + JSON.stringify(result, null, 2));
    serviceClient.getIndividualEnrollment(enrollment1.registrationId, function (err, completeEnrollment1) {
      if (err) {
        console.log('Unable to get first enrollment: ' + err);
      } else {
        console.log('Complete enrollment record 1: ' + JSON.stringify(completeEnrollment1, null, 2));
        serviceClient.getIndividualEnrollment(enrollment2.registrationId, function (err, completeEnrollment2) {
          if (err) {
            console.log('Unable to get second enrollment: ' + err);
          } else {
            console.log('Complete enrollment record 2: ' + JSON.stringify(completeEnrollment2, null, 2));
            var deleteBulkOperation = {
              mode: 'delete',
              enrollments: []
            };
            deleteBulkOperation.enrollments.push(completeEnrollment1);
            deleteBulkOperation.enrollments.push(completeEnrollment2);
            serviceClient.runBulkEnrollmentOperation(deleteBulkOperation, function (err, result) {
              console.log('The err parameter should be null for this delete runBulkEnrollmentOperation call, err: ' + err);
              console.log('The value of the result operation should indicate success and no errors: ' + JSON.stringify(result, null, 2));
            });
          }
        });
      }
    });
  });
});