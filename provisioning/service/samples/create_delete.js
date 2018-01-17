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
  attestation: {
    type: 'tpm',
    tpm: {
      endorsementKey: 'a'
    }
  }
};

var enrollment2 = {
  registrationId: 'second',
  attestation: {
    type: 'tpm',
    tpm: {
      endorsementKey: 'a'
    }
  }
};

serviceClient.createOrUpdateIndividualEnrollment(enrollment1, function (err, firstEnrollmentResponse) {
  if (err) {
    console.log('error creating the first enrollment: ' + err);
  } else {
    console.log("enrollment record returned for first: " + JSON.stringify(firstEnrollmentResponse, null, 2));
    serviceClient.createOrUpdateIndividualEnrollment(enrollment2, function (err, secondEnrollmentResponse) {
      if (err) {
        console.log('error creating the second enrollment: ' + err);
      } else {
        console.log("enrollment record returned for second: " + JSON.stringify(secondEnrollmentResponse, null, 2));
        //
        // deleteIndividualEnrollment can take an IndividualEnrollment object or a registrationId with optional etag.
        // If the etag is included and it doesn't match, the delete will fail.
        //
        serviceClient.deleteIndividualEnrollment(firstEnrollmentResponse.registrationId, 'badetag', function (err) {
          if (err) {
            serviceClient.deleteIndividualEnrollment(firstEnrollmentResponse.registrationId, firstEnrollmentResponse.etag, function (err) {
              if (err) {
                console.log('error deleting the first enrollment: ' + err);
              } else {
                serviceClient.deleteIndividualEnrollment(secondEnrollmentResponse, function (err) {
                  if (err) {
                    console.log('error deleting the second enrollment: ' + err);
                  }
                });
              }
            });
          } else {
            console.log('The first delete should have failed because of an etag mismatch!');
          }
        });
      }
    })
  }
});