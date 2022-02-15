// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const { DefaultAzureCredential } = require("@azure/identity");
var provisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;

var argv = require('yargs')
  .usage('Usage: $0 --hostname <DPS HOST NAME> --endorsementKey <ENDORSMENT KEY>')
  .option('hostname', {
    alias: 'h',
    describe: 'The host name for the Device Provisioning instance',
    type: 'string',
    demandOption: true
  })
  .option('endorsementKey', {
    alias: 'e',
    describe: 'Endorsment key for TPM',
    type: 'string',
    demandOption: true
  })
  .argv;

// DefaultAzureCredential expects the following three environment variables:
// - AZURE_TENANT_ID: The tenant ID in Azure Active Directory
// - AZURE_CLIENT_ID: The application (client) ID registered in the AAD tenant
// - AZURE_CLIENT_SECRET: The client secret for the registered application
var credential = new DefaultAzureCredential();
var serviceClient = provisioningServiceClient.fromTokenCredential(argv.hostname, credential);
var endorsementKey = argv.endorsementKey;

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
