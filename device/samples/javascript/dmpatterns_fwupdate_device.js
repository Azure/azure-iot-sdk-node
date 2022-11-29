// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

// Choose a protocol by uncommenting one of these transports.
const Protocol = require('azure-iot-device-mqtt').Mqtt;
// const Protocol = require('azure-iot-device-amqp').Amqp;
// const Protocol = require('azure-iot-device-http').Http;
// const Protocol = require('azure-iot-device-mqtt').MqttWs;
// const Protocol = require('azure-iot-device-amqp').AmqpWs;

const Client = require('azure-iot-device').Client;
const url = require('url');
const async = require('async');

const deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING;
const client = Client.fromConnectionString(deviceConnectionString, Protocol);

// eslint-disable-next-line security/detect-non-literal-fs-filename
client.open(function (err) {
  if (!err) {
    client.onDeviceMethod('firmwareUpdate', function (request, response) {
      // Get the firmware image Uri from the body of the method request
      const fwPackageUri = request.payload.fwPackageUri;
      const fwPackageUriObj = url.parse(fwPackageUri);

      // Ensure that the url is to a secure url
      if (fwPackageUriObj.protocol !== 'https:') {
        response.send(400, 'Invalid URL format.  Must use https:// protocol.', function (err) {
          if (err) console.error('Error sending method response :\n' + err.toString());
          else console.log('Response to method \'' + request.methodName + '\' sent successfully.');
        });
      } else {
        // Respond the cloud app for the device method
        response.send(200, 'Firmware update started.', function (err) {
          if (err) console.error('Error sending method response :\n' + err.toString());
          else console.log('Response to method \'' + request.methodName + '\' sent successfully.');
        });

        initiateFirmwareUpdateFlow(fwPackageUri, function (err){
          if (!err) console.log("Completed firmwareUpdate flow");
        });
      }
    });
    console.log('Client connected to IoT Hub.  Waiting for firmwareUpdate device method.');
  }
});

// Implementation of firmwareUpdate flow
function initiateFirmwareUpdateFlow(fwPackageUri, callback) {
  async.waterfall([
    function (callback) {
      downloadImage(fwPackageUri, callback);
    },
    applyImage
  ], function (err) {
    if (err) {
      console.error('Error : ' + err.message);
    }
    callback(err);
  });
}

// Function that implements the 'downloadImage' phase of the
// firmware update process.
function downloadImage(fwPackageUriVal, callback) {
  const imageResult = '[Fake firmware image data]';

  async.waterfall([
    function (callback) {
      reportFWUpdateThroughTwin ({
        status: 'downloading',
        startedDownloadingTime: new Date().toISOString()
      },
      callback);
    },
    function (callback) {
      console.log("Downloading image from URI: " + fwPackageUriVal);

      // Replace this line with the code to download the image.  Delay used to simulate the download.
      setTimeout(function () { //DevSkim: reviewed DS172411 on 2022-11-29
        callback(null);
      }, 4000);
    },
    function (callback) {
      reportFWUpdateThroughTwin ({
        status: 'download complete',
        downloadCompleteTime : new Date().toISOString()
      },
      callback);
    },
  ],
  function (err) {
    if (err) {
      reportFWUpdateThroughTwin( { status : 'Download image failed' }, function (err) {
        callback(err);
      });
    } else {
      callback(null, imageResult);
    }
  });
}

// Implementation for the apply phase, which reports status after
// completing the image apply.
function applyImage(imageData, callback) {
  async.waterfall([
    function (callback) {
      reportFWUpdateThroughTwin ({
        status: 'applying',
        startedApplyingImage: new Date().toISOString()
      },
      callback);
    },
    function (callback) {
      console.log("Applying firmware image");

      // Replace this line with the code to download the image.  Delay used to simulate the download.
      setTimeout(function () { //DevSkim: reviewed DS172411 on 2022-11-29
        callback(null);
      }, 4000);
    },
    function (callback) {
      reportFWUpdateThroughTwin ({
        status: 'apply firmware image complete',
        lastFirmwareUpdate: new Date().toISOString()
      },
      callback);
    },
  ],
  function (err) {
    if (err) {
      reportFWUpdateThroughTwin({ status : 'Apply image failed' }, function (err) {
        callback(err);
      });
    }
    callback(null);
  });
}

// Helper function to update the twin reported properties.
// Used by every phase of the firmware update.
function reportFWUpdateThroughTwin(firmwareUpdateValue, callback) {
  const patch = {
      iothubDM : {
        firmwareUpdate : firmwareUpdateValue
      }
  };
  console.log(JSON.stringify(patch, null, 2));
  client.getTwin(function (err, twin) {
    if (!err) {
      twin.properties.reported.update(patch, function (err) {
        callback(err);
      });
    } else {
      callback(err);
    }
  });
}
