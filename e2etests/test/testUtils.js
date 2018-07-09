// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var Promise = require('bluebird');
var deviceSdk = require('azure-iot-device');

function createDeviceClient(deviceTransport, provisionedDevice) {
  var deviceClient;
  if (provisionedDevice.hasOwnProperty('primaryKey')) {
    deviceClient = deviceSdk.Client.fromConnectionString(provisionedDevice.connectionString, deviceTransport);
  } else if (provisionedDevice.hasOwnProperty('certificate')) {
    deviceClient = deviceSdk.Client.fromConnectionString(provisionedDevice.connectionString, deviceTransport);
    var options = {
      cert: provisionedDevice.certificate,
      key: provisionedDevice.clientKey,
    };
    deviceClient.setOptions(options);
    // due to some clock skew, it is possible that the certificate is not valid yet using the IoT hub clock
    // since the pem module does not offer the possibility to set the NotBefore field, we have to resort to retrying.
    // https://github.com/Dexus/pem/issues/30
    deviceClient._retryPolicy._errorFilter.UnauthorizedError = true;
    deviceClient._maxOperationTimeout = 30000; // retry for at most 30 seconds, we don't want the test to take too long.
  } else {
    deviceClient = deviceSdk.Client.fromSharedAccessSignature(provisionedDevice.connectionString, deviceTransport);
  }
  return deviceClient;
}

function closeDeviceServiceClients(deviceClient, serviceClient, done) {
  var serviceErr = null;
  var deviceErr = null;
  serviceClient.close(function (err) {
    serviceErr = err || deviceErr;
    serviceClient = null;
    if (serviceErr || !deviceClient) {
      done(serviceErr);
    }
  });
  deviceClient.close(function (err) {
    deviceErr = err || serviceErr;
    deviceClient = null;
    if (deviceErr || !serviceClient) {
      done(deviceErr);
    }
  });
}

function closeDeviceEventHubClients(deviceClient, eventHubClient, ehReceivers, done) {
  var eventHubErr = null;
  var deviceErr = null;
  Promise.map(ehReceivers, function (recvToClose) {
    recvToClose.removeAllListeners();
    return recvToClose.close();
  }).then(function () {
    return eventHubClient.close();
  }).then(function () {
    eventHubErr = deviceErr;
    eventHubClient = null;
    if (!deviceClient) {
      done(eventHubErr);
    }
  }).catch(function (err) {
    eventHubErr = err;
    eventHubClient = null;
    if (!deviceClient) {
      done(eventHubErr);
    }
  });
  if (!deviceClient) {
    if (!eventHubClient) {
      done();
    }
  } else {
    deviceClient.close(function (err) {
      deviceErr = err || eventHubErr;
      deviceClient = null;
      if (deviceErr || !eventHubClient) {
        done(deviceErr);
      }
    });
  }
}

function getErrorDetailString(functionName, err) {
  var detail = functionName + ' returned ' + (err ? err : 'success');
  if (err && err.responseBody) {
    if (err.response && err.response.headers) {
      if (err.response.headers['content-type'].indexOf('json') !== -1) {
        detail += '\n';
        var body = JSON.parse(err.responseBody);
        delete body.StackTrace;
        detail += JSON.stringify(body, null, ' ');
      }
    }
  }
  return detail;
}

module.exports = {
  createDeviceClient: createDeviceClient,
  closeDeviceServiceClients: closeDeviceServiceClients,
  closeDeviceEventHubClients: closeDeviceEventHubClients,
  getErrorDetailString: getErrorDetailString
};
