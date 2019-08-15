// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Protocol = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var fs = require('fs');

var deviceConnectionString = process.env.DEVICE_CONNECTION_STRING;
var filePath = process.env.PATH_TO_FILE;

var client = Client.fromConnectionString(deviceConnectionString, Protocol);
fs.stat(filePath, function (err, fileStats) {
  var fileStream = fs.createReadStream(filePath);

  client.uploadToBlob('testblob.txt', fileStream, fileStats.size, function (err, result) {
    if (err) {
      console.error('error uploading file: ' + err.constructor.name + ': ' + err.message);
    } else {
      console.log('Upload successful - ' + result);
    }
    fileStream.destroy();
  });
});