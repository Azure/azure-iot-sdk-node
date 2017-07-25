// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var provisioningClient = require('azure-iot-provisioning-service-client');

var serviceClient = provisioningClient.DeviceEnrollment.fromConnectionString(process.argv[2]);

var queryForEnrollments = serviceClient.createQuery({"query": "*"},1);
var queryForEnrollmentGroups = serviceClient.createGroupQuery({"query": "*"},1);

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
    });

    if (queryForEnrollmentGroups.hasMoreResults) {
        queryForEnrollmentGroups.next(onEnrollmentGroupResults);
    }
  }
};

queryForEnrollments.next(onEnrollmentResults);