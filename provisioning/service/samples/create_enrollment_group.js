// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var fs = require('fs');

var provisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;

var serviceClient = provisioningServiceClient.fromConnectionString(process.argv[2]);

var enrollment = {
  enrollmentGroupId: 'first',
  attestation: {
    type: 'x509',
    x509: {
      signingCertificates: {
        primary: {
          certificate: fs.readFileSync(process.argv[3], 'utf-8').toString()
        }
      }
    }
  },
  provisioningStatus: 'disabled'
};


serviceClient.createOrUpdateEnrollmentGroup(enrollment, function(err, enrollmentResponse) {
  if (err) {
    console.log('error creating the group enrollment: ' + err);
  } else {
    console.log("enrollment record returned: " + JSON.stringify(enrollmentResponse, null, 2));
    enrollmentResponse.provisioningStatus = 'enabled';
    serviceClient.createOrUpdateEnrollmentGroup(enrollmentResponse, function(err, enrollmentResponse) {
      if (err) {
        console.log('error updating the group enrollment: ' + err);
      } else {
        console.log("updated enrollment record returned: " + JSON.stringify(enrollmentResponse, null, 2));
      }
    });
  }
});
