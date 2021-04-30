// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var iothub = require('azure-iothub');
var util = require('util');

var iothubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

var outputContainerURI = "<URI to a container where a 'devices.txt' blob will be created.>";
var userAssignedManagedIdentity = "<The resource ID to a user assigned managed identity on the IoT Hub with access to the container.>";

var registry = iothub.Registry.fromConnectionString(iothubConnectionString);

registry.exportDevicesToBlobByIdentity(outputContainerURI, true, userAssignedManagedIdentity, function (error, result) {
    if (error) {
        console.error('Could not create export job: ' + error.message);
    } else {
        console.log('Result:\n' + util.inspect(result));
    }
});