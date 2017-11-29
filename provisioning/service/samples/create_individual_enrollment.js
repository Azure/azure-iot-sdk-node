// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var provisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;

var serviceClient = provisioningServiceClient.fromConnectionString(process.argv[2]);
var endorsementKey = process.argv[3];

var enrollment = {
  registrationId: 'first',
  attestation: {
    type: 'tpm',
    tpm: {
      endorsementKey: endorsementKey
    }
  }
};


serviceClient.createOrUpdateIndividualEnrollment(enrollment, function(err, enrollmentResponse) {
  if (err) {
    console.log('error creating the individual enrollment: ' + err);
  } else {
    console.log("enrollment record returned: " + JSON.stringify(enrollmentResponse, null, 2));
  }
});
