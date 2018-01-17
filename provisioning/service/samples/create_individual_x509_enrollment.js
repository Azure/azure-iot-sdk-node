// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';
var fs = require('fs');
var provisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;
const path = require('path');

var argv = require('yargs')
  .usage('Usage: $0 --deviceid <DEVICE ID> --connectionstring <DEVICE PROVISIONING CONNECTION STRING> ')
  .option('deviceid', {
    alias: 'd',
    describe: 'Unique identifier for the device that shall be created',
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

var deviceID = argv.deviceid;
var connectionString = argv.connectionstring;

var serviceClient = provisioningServiceClient.fromConnectionString(connectionString);

var certFile = path.join(__dirname, "cert", deviceID + "-cert.pem");

if (!fs.existsSync(certFile)) {
  console.log('Certificate File not found:' + certFile);
  process.exit();
} else {
  var certificate = fs.readFileSync(certFile, 'utf-8').toString();
};

var enrollment = {
  registrationId: deviceID,
  deviceID: deviceID,
  attestation: {
    type: 'x509',
    x509: {
      clientCertificates: {
        primary: {
          certificate: certificate
        }
      }
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