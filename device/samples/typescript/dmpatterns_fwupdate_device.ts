/* eslint-disable security/detect-non-literal-fs-filename */
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// Choose a protocol by uncommenting one of these transports.
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { Http as Protocol } from 'azure-iot-device-Http';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';

import { Client, DeviceMethodRequest, DeviceMethodResponse, Twin } from 'azure-iot-device';
import * as url from 'url';
import * as async from 'async';

const deviceConnectionString: string = process.env.IOTHUB_DEVICE_CONNECTION_STRING || '';

if (deviceConnectionString === '') {
  console.log('device connection string has not been set');
  process.exit(-1);
}

const client: Client = Client.fromConnectionString(
  deviceConnectionString,
  Protocol
);

client.open(function (err?: Error, _result1?: any): void {
  if (!err) {
    client.onDeviceMethod(
      'firmwareUpdate',
      function (
        request: DeviceMethodRequest,
        response: DeviceMethodResponse
      ): void {
        // Get the firmware image Uri from the body of the method request
        const fwPackageUri: any = request.payload.fwPackageUri;
        const fwPackageUriObj: url.UrlWithStringQuery = url.parse(fwPackageUri);

        // Ensure that the url is to a secure url
        if (fwPackageUriObj.protocol !== 'https:') {
          response.send(
            400,
            'Invalid URL format.  Must use https:// protocol.',
            function (err: Error | undefined): void {
              if (err)
                console.error(
                  'Error sending method response :\n' + err.toString()
                );
              else
                console.log(
                  'Response to method "' + request.methodName + '" sent successfully.'
                );
            }
          );
        } else {
          // Respond the cloud app for the device method
          response.send(
            200,
            'Firmware update started.',
            function (err?: Error, _result1?: any): void {
              if (err)
                console.error(
                  'Error sending method response :\n' + err.toString()
                );
              else
                console.log(
                  'Response to method "' + request.methodName + '" sent successfully.'
                );
            }
          );

          initiateFirmwareUpdateFlow(fwPackageUri, function (err: Error): void {
            if (!err) console.log('Completed firmwareUpdate flow');
          });
        }
      }
    );
    console.log(
      'Client connected to IoT Hub. Waiting for firmwareUpdate device method.'
    );
  }
});

// Implementation of firmwareUpdate flow
function initiateFirmwareUpdateFlow(fwPackageUri: any, callback: any): void {
  async.waterfall(
    [
      function (callback: any): void {
        downloadImage(fwPackageUri, callback);
      },
      applyImage,
    ],
    function (err: Error | null | undefined, _result1: any | undefined): void {
      if (err) {
        console.error('Error : ' + err.message);
      }
      callback(err);
    }
  );
}

// Function that implements the 'downloadImage' phase of the
// firmware update process.
function downloadImage(fwPackageUriVal: string, callback: any): void {
  const imageResult: string = '[Fake firmware image data]';

  async.waterfall(
    [
      function (callback: any): void {
        reportFWUpdateThroughTwin(
          {
            status: 'downloading',
            startedDownloadingTime: new Date().toISOString(),
          },
          callback
        );
      },
      function (callback: any): void {
        console.log('Downloading image from URI: ' + fwPackageUriVal);

        // Replace this line with the code to download the image.  Delay used to simulate the download.
        setTimeout(function (): void { //DevSkim: reviewed DS172411 on 2022-11-29
          callback(null);
        }, 4000);
      },
      function (callback: any): void {
        reportFWUpdateThroughTwin(
          {
            status: 'download complete',
            downloadCompleteTime: new Date().toISOString(),
          },
          callback
        );
      },
    ],
    function (err: Error | null | undefined, _result1: any | undefined ): void {
      if (err) {
        reportFWUpdateThroughTwin(
          { status: 'Download image failed' },
          function (err: Error): void {
            callback(err);
          }
        );
      } else {
        callback(null, imageResult);
      }
    }
  );
}

// Implementation for the apply phase, which reports status after
// completing the image apply.
function applyImage(_imageData: any, callback: any): void {
  async.waterfall(
    [
      function (callback: any): void {
        reportFWUpdateThroughTwin(
          {
            status: 'applying',
            startedApplyingImage: new Date().toISOString(),
          },
          callback
        );
      },
      function (callback: any): void {
        console.log('Applying firmware image');

        // Replace this line with the code to download the image.  Delay used to simulate the download.
        setTimeout(function (): void { //DevSkim: reviewed DS172411 on 2022-11-29
          callback(null);
        }, 4000);
      },
      function (callback: any): void {
        reportFWUpdateThroughTwin(
          {
            status: 'apply firmware image complete',
            lastFirmwareUpdate: new Date().toISOString(),
          },
          callback
        );
      },
    ],
    function (_result: any, err?: Error): void {
      if (err) {
        reportFWUpdateThroughTwin(
          { status: 'Apply image failed' },
          function (err: Error): void {
            callback(err);
          }
        );
      }
      callback(null);
    }
  );
}

// Helper function to update the twin reported properties.
// Used by every phase of the firmware update.
function reportFWUpdateThroughTwin(
  firmwareUpdateValue: any,
  callback: any
): void {
  const patch = {
    iothubDM: {
      firmwareUpdate: firmwareUpdateValue,
    },
  };
  console.log(JSON.stringify(patch, null, 2));
  client.getTwin(function (err: Error | undefined, twin: Twin | undefined): void {
    if (!err && twin) {
      twin.properties.reported.update(patch, function (err: Error): void {
        callback(err);
      });
    } else {
      callback(err);
    }
  });
}
