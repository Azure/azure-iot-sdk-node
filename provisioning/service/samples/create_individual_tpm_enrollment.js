// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

var provisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;
const path = require('path');

var argv = require('yargs')
  .usage('Usage: $0 --endorsementkey <ENDORSMENT KEY> --connectionstring <DEVICE PROVISIONING CONNECTION STRING> ')
  .option('endorsementKey', {
    alias: 'e',
    describe: 'Endorsment key for TPM',
    type: 'string',
    demandOption: true
  })
  .option('connectionstring', {
    alias: 'c',
    describe: 'The connection string for the Device Provisioning instance',
    type: 'string',
    demandOption: true
  })
  .argv;

var endorsementKey = argv.endorsementKey;
var connectionString = argv.connectionString;
var serviceClient = provisioningServiceClient.fromConnectionString(connectionString);

var enrollment = {
  registrationId: 'first',
  attestation: {
    type: 'tpm',
    tpm: {
      endorsementKey: endorsementKey
    }
  }
};

serviceClient.createOrUpdateIndividualEnrollment(enrollment, function (err, enrollmentResponse) {
  if (err) {
    console.log('error creating the individual enrollment: ' + err);
  } else {
    console.log("enrollment record returned: " + JSON.stringify(enrollmentResponse, null, 2));
  }
});