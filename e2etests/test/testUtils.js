// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
let deviceSdk = require('azure-iot-device');

function createDeviceClient(deviceTransport, provisionedDevice) {
  let deviceClient;
  if (Object.prototype.hasOwnProperty.call(provisionedDevice, 'primaryKey')) {
    deviceClient = deviceSdk.Client.fromConnectionString(provisionedDevice.connectionString, deviceTransport);
  } else if (Object.prototype.hasOwnProperty.call(provisionedDevice, 'certificate')) {
    deviceClient = deviceSdk.Client.fromConnectionString(provisionedDevice.connectionString, deviceTransport);
    let options = {
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
  let serviceErr = null;
  let deviceErr = null;
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

function closeDeviceEventHubClients(deviceClient, eventHubClient, done) {
  let eventHubErr = null;
  let deviceErr = null;

  if (!deviceClient && !eventHubClient) {
    done();
  }

  if (eventHubClient) {
    eventHubClient.close().then(function () {
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
  }

  if (deviceClient) {
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
  let detail = functionName + ' returned ' + (err ? err : 'success');
  if (err && err.responseBody) {
    if (err.response && err.response.headers) {
      if (err.response.headers['content-type'].indexOf('json') !== -1) {
        detail += '\n';
        let body = JSON.parse(err.responseBody);
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
