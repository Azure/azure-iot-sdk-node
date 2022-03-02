// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const { ClientSecretCredential } = require("@azure/identity");
const provisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;
const uuid = require('uuid');

const argv = require('yargs')
  .usage('Usage: $0 --hostname <DPS HOST NAME> --endorsementKey <ENDORSMENT KEY> --tenantid <AAD TENANT ID> --clientid <AAD CLIENT ID> --clientsecret <AAD_CLIENT_SECRET>')
  .option('hostname', {
    alias: 'h',
    describe: 'The host name for the Device Provisioning instance',
    type: 'string',
    demandOption: true
  })
  .option('tenantid', {
    alias: 't',
    describe: 'The Azure Active Directory tenant (directory) Id',
    type: 'string',
    demandOption: true
  })
.option('clientid', {
    alias: 'c',
    describe: 'The client Id of the Azure Active Directory application',
    type: 'string',
    demandOption: true
  })
  .option('clientsecret', {
    alias: 's',
    describe: 'A client secret that was generated for the application Registration used to authenticate the client',
    type: 'string',
    demandOption: true
  })
  .argv;

const credential = new ClientSecretCredential(argv.tenantid, argv.clientid, argv.clientsecret);
const serviceClient = provisioningServiceClient.fromTokenCredential(argv.hostname, credential);

const enrollment = {
  registrationId: 'sample_enrollment-' + uuid.v1(),
  attestation: {
    type: 'symmetricKey',
    symmetricKey: {
      primaryKey: '',
      secondaryKey: ''
    }
  },
  capabilities: {
    iotEdge: false
  }
};

serviceClient.createOrUpdateIndividualEnrollment(enrollment).then((enrollmentResponse) => {
    console.log("Enrollment record returned: " + JSON.stringify(enrollmentResponse.responseBody, null, 2)),
    serviceClient.deleteIndividualEnrollment(enrollmentResponse.responseBody.registrationId).then(
      (res) => console.log("Enrollment deleted successfully"),
      (err) => console.log("Error deleting enrollment: " + err)
    )}
  ).catch((err) => console.log("Error creating the individual enrollment: " + err));
