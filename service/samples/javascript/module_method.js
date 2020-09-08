// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Client = require('azure-iothub').Client;

var connectionString = process.env.IOTHUB_CONNECTION_STRING;
var deviceId = process.env.IOTHUB_DEVICE_ID;
var moduleId = process.env.IOTHUB_MODULE_ID;

var methodParams = {
  methodName: process.env.IOTHUB_METHOD_NAME,
  payload: process.env.IOTHUB_METHOD_PAYLOAD,
  responseTimeoutInSeconds: 15 // set response timeout as 15 seconds
};

var client = Client.fromConnectionString(connectionString);

client.invokeDeviceMethod(deviceId, moduleId, methodParams, function (err, result) {
  if (err) {
    console.error('Failed to invoke method \'' + methodParams.methodName + '\': ' + err.message);
  } else {
    console.log(methodParams.methodName + ' on ' + deviceId + ':');
    console.log(JSON.stringify(result, null, 2));
  }
});