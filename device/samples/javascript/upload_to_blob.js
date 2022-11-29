/* eslint-disable security/detect-non-literal-fs-filename */
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// THIS EXAMPLE IS DEPRECATED
// We recommend you follow the 'upload_to_blob_advanced.js' sample.

'use strict';

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const fs = require('fs');

const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING;
const filePath = process.env.PATH_TO_FILE;

const client = Client.fromConnectionString(deviceConnectionString, Protocol);
fs.stat(filePath, function (err, fileStats) {
  const fileStream = fs.createReadStream(filePath);

  client.uploadToBlob('testblob.txt', fileStream, fileStats.size, function (err) {
    if (err) {
      console.error('error uploading file: ' + err.constructor.name + ': ' + err.message);
    } else {
      console.log('Upload successful');
    }
    fileStream.destroy();
    process.exit();
  });
});
