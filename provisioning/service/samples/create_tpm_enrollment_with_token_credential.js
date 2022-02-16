// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const { ClientSecretCredential } = require("@azure/identity");
var provisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;
var uuid = require('uuid')

var argv = require('yargs')
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

var credential = new ClientSecretCredential(argv.tenantid, argv.clientid, argv.clientsecret);
var serviceClient = provisioningServiceClient.fromTokenCredential(argv.hostname, credential);

var enrollment = {
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

serviceClient.createOrUpdateIndividualEnrollment(enrollment, function (err, enrollmentResponse) {
  if (err) {
    console.log('error creating the individual enrollment: ' + err);
  } else {
    console.log("enrollment record returned: " + JSON.stringify(enrollmentResponse, null, 2));
    serviceClient.deleteIndividualEnrollment(enrollmentResponse.registrationId, function (err) {
      if (err) {
        console.log('error deleting the first enrollment: ' + err);
      } else {
        console.log("enrollment successfully deleted");
      }
    });
  }
});
