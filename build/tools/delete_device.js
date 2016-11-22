// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Registry = require('azure-iothub').Registry;
var chalk = require('chalk');
var argv = require('yargs')
           .usage('Usage: $0 --connectionString <IOTHUB CONNECTION STRING> --deviceId <DEVICE ID>')
           .demand(['connectionString', 'deviceId'])
           .describe('connectionString', 'Azure IoT Hub service connection string that shall have device delete permissions')
           .describe('deviceId', 'Unique identifier for the device that shall be deleted')
           .argv;

var registry = Registry.fromConnectionString(argv.connectionString);
registry.delete(argv.deviceId, function(err) {
  if (err) {
    console.log(chalk.red('Failed to delete device ' + argv.deviceId));
    console.log(chalk.red(err.responseBody));
    process.exit(1);
  } else {
    console.log(chalk.green('Device \'' + argv.deviceId + '\' successfully deleted.'));
    process.exit(0);
  }
});

