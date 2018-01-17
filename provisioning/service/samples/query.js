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

var queryForEnrollments = serviceClient.createIndividualEnrollmentQuery({
  "query": "*"
}, 10);
var queryForEnrollmentGroups = serviceClient.createEnrollmentGroupQuery({
  "query": "*"
}, 10);

var onEnrollmentResults = function (err, results) {
  if (err) {
    console.error('Failed to fetch the results: ' + err.message);
  } else {
    // Do something with the results
    results.forEach(function (enrollment) {
      console.log(JSON.stringify(enrollment, null, 2));
    });

    if (queryForEnrollments.hasMoreResults) {
      queryForEnrollments.next(onEnrollmentResults);
    } else {
      console.log('Querying for the Enrollment Groups');
      queryForEnrollmentGroups.next(onEnrollmentGroupResults);
    }
  }
};

var onEnrollmentGroupResults = function (err, results) {
  if (err) {
    console.error('Failed to fetch the results: ' + err.message);
  } else {
    // Do something with the results
    results.forEach(function (enrollmentGroup) {
      console.log(JSON.stringify(enrollmentGroup, null, 2));
      var alreadyPrintedSomeDeviceRegistrations = false;
      var queryForDeviceRegistrationState = serviceClient.createEnrollmentGroupDeviceRegistrationStateQuery({
        "query": "*"
      }, enrollmentGroup.enrollmentGroupId, 10);
      var onDeviceRegistrationStateResults = function (err, results) {
        if (err) {
          console.error('Failed to fetch the results: ' + err.message);
        } else {
          // Do something with the results
          results.forEach(function (deviceRegistrationState) {
            if (!alreadyPrintedSomeDeviceRegistrations) {
              alreadyPrintedSomeDeviceRegistrations = true;
              console.log('For ' + enrollmentGroup.enrollmentGroupId + ', all of its the Device Registrations Status objects: ')
            }
            console.log(JSON.stringify(deviceRegistrationState, null, 2));
          });
          if (queryForDeviceRegistrationState.hasMoreResults) {
            queryForDeviceRegistrationState.next(onDeviceRegistrationState);
          }
        }
      };
      queryForDeviceRegistrationState.next(onDeviceRegistrationStateResults);
    });

    if (queryForEnrollmentGroups.hasMoreResults) {
      queryForEnrollmentGroups.next(onEnrollmentGroupResults);
    }
  }
};


console.log('Querying for the enrollments: ');
queryForEnrollments.next(onEnrollmentResults);