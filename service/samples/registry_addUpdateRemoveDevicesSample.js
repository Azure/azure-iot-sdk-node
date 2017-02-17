// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var iothub = require('azure-iothub');
var uuid = require('uuid');

var connectionString = '[IoT Connection String]';

var registry = iothub.Registry.fromConnectionString(connectionString);

// Specify the new devices.
var deviceAddArray = [
  {
    deviceId: 'Device1',
    status: 'disabled',
    authentication: {
      symmetricKey: {
        primaryKey: new Buffer(uuid.v4()).toString('base64'),
        secondaryKey: new Buffer(uuid.v4()).toString('base64')
      }
    }
  },
  {
    deviceId: 'Device2',
    status: 'disabled',
    authentication: {
      symmetricKey: {
        primaryKey: new Buffer(uuid.v4()).toString('base64'),
        secondaryKey: new Buffer(uuid.v4()).toString('base64')
      }
    }
  },
  {
    deviceId: 'Device3',
    status: 'disabled',
    authentication: {
      symmetricKey: {
        primaryKey: new Buffer(uuid.v4()).toString('base64'),
        secondaryKey: new Buffer(uuid.v4()).toString('base64')
      }
    }
  }
];

var deviceUpdateArray = [
  {
    deviceId: deviceAddArray[0].deviceId,
    status: 'enabled'
  },
  {
    deviceId: deviceAddArray[1].deviceId,
    status: 'enabled'
  },
  {
    deviceId: deviceAddArray[2].deviceId,
    status: 'enabled'
  }
];

var deviceRemoveArray = [
  {
    deviceId: deviceAddArray[0].deviceId
  },
  {
    deviceId: deviceAddArray[1].deviceId
  },
  {
    deviceId: deviceAddArray[2].deviceId
  }
];

console.log('Adding devices: ' + JSON.stringify(deviceAddArray));
registry.addDevices(deviceAddArray, printAndContinue( 'adding', function next() {
  registry.updateDevices(deviceUpdateArray, true, printAndContinue('updating', function next() {
    registry.removeDevices(deviceRemoveArray, true, printAndContinue('removing'));
  }));
}));



function printAndContinue(op, next) {
  return function printResult(err, resultData) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (resultData) {
      var arrayString = resultData.errors.length === 0 ? 'no errors' : JSON.stringify(resultData.errors);
      console.log(op + ' isSuccessful: ' + resultData.isSuccessful + ', errors returned: ' + arrayString);
    }
    if (next) next();
  };
}