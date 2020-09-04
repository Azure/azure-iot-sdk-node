// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Client = require('azure-iothub').Client;

var connectionString = process.env.IOTHUB_CONNECTION_STRING;
var targetDevice = '<Device Id>';
var methodParams = {
  methodName: '<Method Name>', 
  payload: '[Method Payload]',
  responseTimeoutInSeconds: 15 // set response timeout as 15 seconds 
};

var client = Client.fromConnectionString(connectionString);

client.invokeDeviceMethod(targetDevice, methodParams, function (err, result) {
  if (err) {
    console.error('Failed to invoke method \'' + methodParams.methodName + '\': ' + err.message);
  } else {
    console.log(methodParams.methodName + ' on ' + targetDevice + ':');
    console.log(JSON.stringify(result, null, 2));
  }
});