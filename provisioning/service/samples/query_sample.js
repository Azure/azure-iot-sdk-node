// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var provisioningServiceClient = require('azure-iot-provisioning-service').ProvisioningServiceClient;

var serviceClient = provisioningServiceClient.fromConnectionString(process.argv[2]);

var queryForEnrollments = serviceClient.createIndividualEnrollmentQuery({ "query": "*" }, 10);
var queryForEnrollmentGroups = serviceClient.createEnrollmentGroupQuery({ "query": "*" }, 10);

var onEnrollmentResults = function(err, results) {
  if (err) {
    console.error('Failed to fetch the results: ' + err.message);
  } else {
    // Do something with the results
    results.forEach(function(enrollment) {
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

var onEnrollmentGroupResults = function(err, results) {
  if (err) {
    console.error('Failed to fetch the results: ' + err.message);
  } else {
    // Do something with the results
    results.forEach(function(enrollmentGroup) {
      console.log(JSON.stringify(enrollmentGroup, null, 2));
      var alreadyPrintedSomeDeviceRegistrations = false;
      var queryForDeviceRegistrationStatus = serviceClient.createEnrollmentGroupDeviceRegistrationStatusQuery({ "query": "*" }, enrollmentGroup.enrollmentGroupId, 10);
      var onDeviceRegistrationStatusResults = function(err, results) {
        if (err) {
          console.error('Failed to fetch the results: ' + err.message);
        } else {
          // Do something with the results
          results.forEach(function(deviceRegistrationStatus) {
            if (!alreadyPrintedSomeDeviceRegistrations) {
              alreadyPrintedSomeDeviceRegistrations = true;
              console.log('For ' + enrollmentGroup.enrollmentGroupId + ', all of its the Device Registrations Status objects: ')
            }
            console.log(JSON.stringify(deviceRegistrationStatus, null, 2));
          });
          if (queryForDeviceRegistrationStatus.hasMoreResults) {
              queryForDeviceRegistrationStatus.next(onDeviceRegistrationStatus);
          }
        }
      };
      queryForDeviceRegistrationStatus.next(onDeviceRegistrationStatusResults);
    });

    if (queryForEnrollmentGroups.hasMoreResults) {
      queryForEnrollmentGroups.next(onEnrollmentGroupResults);
    }
  }
};


console.log('Querying for the enrollments: ');
queryForEnrollments.next(onEnrollmentResults);