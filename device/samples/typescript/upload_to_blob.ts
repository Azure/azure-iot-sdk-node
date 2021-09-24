// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { Client } from 'azure-iot-device';
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
import * as fs from 'fs';

const deviceConnectionString: string =  process.env.DEVICE_CONNECTION_STRING || '';
const filePath: string = process.env.PATH_TO_FILE || '';

const client: Client = Client.fromConnectionString(
  deviceConnectionString,
  Protocol
);

fs.stat(filePath, function (err: Error, fileStats: fs.Stats): void {
  let fileStream = fs.createReadStream(filePath);

  if (err) {
    console.error('error with fs.stat: ' + err.message);
  }

  client.uploadToBlob('testblob.txt', fileStream, fileStats.size).catch((err: Error) => {
      console.log(err);
    }).finally(() => {
      fileStream.destroy();
      process.exit();
    });
});
