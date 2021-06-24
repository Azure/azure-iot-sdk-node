// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var iothub = require('azure-iothub');
var util = require('util');

var iothubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

var inputContainerURI = "<URI to a container with a blob named 'devices.txt' containing a list of devices to import.>";
var outputContainerURI = "<URI to a container where a blob will be created with logs of the import process.>";
var userAssignedManagedIdentity = "<The resource ID to a user assigned managed identity on the IoT Hub with access to the containers.>";

var registry = iothub.Registry.fromConnectionString(iothubConnectionString);

registry.importDevicesFromBlobByIdentity(inputContainerURI, outputContainerURI, userAssignedManagedIdentity, function (error, result) {
    if (error) {
        console.error('Could not create import job: ' + error.message);
    } else {
        console.log('Result:\n' + util.inspect(result));
    }
});