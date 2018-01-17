// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var fs = require('fs');

var provisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;

var argv = require('yargs')
  .usage('Usage: $0 --connectionstring <DEVICE PROVISIONING CONNECTION STRING> --certificagte <PATH TO CERTIFICATE> ')
  .option('connectionstring', {
    alias: 'c',
    describe: 'The connection string for the Device Provisioning instance',
    type: 'string',
    demandOption: true
  })
  .option('certificate', {
    alias: 'ce',
    describe: 'certificated used for group enrollment',
    type: 'string',
    demandOption: true
  })
  .argv;

var connectionString = argv.connectionString;
var certificate = argv.certificate;
var serviceClient = provisioningServiceClient.fromConnectionString(connectionString);

var enrollment = {
  enrollmentGroupId: 'first',
  attestation: {
    type: 'x509',
    x509: {
      signingCertificates: {
        primary: {
          certificate: fs.readFileSync(certificate, 'utf-8').toString()
        }
      }
    }
  },
  provisioningStatus: 'disabled'
};

serviceClient.createOrUpdateEnrollmentGroup(enrollment, function (err, enrollmentResponse) {
  if (err) {
    console.log('error creating the group enrollment: ' + err);
  } else {
    console.log("enrollment record returned: " + JSON.stringify(enrollmentResponse, null, 2));
    enrollmentResponse.provisioningStatus = 'enabled';
    serviceClient.createOrUpdateEnrollmentGroup(enrollmentResponse, function (err, enrollmentResponse) {
      if (err) {
        console.log('error updating the group enrollment: ' + err);
      } else {
        console.log("updated enrollment record returned: " + JSON.stringify(enrollmentResponse, null, 2));
      }
    });
  }
});