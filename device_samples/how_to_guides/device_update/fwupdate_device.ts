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

const deviceConnectionString: string = process.env.IOTHUB_DEVICE_CONNECTION_STRING ?? '';
const logRed: string = '\x1b[31m%s\x1b[0m';

// make sure we have a connection string before we can continue
if (deviceConnectionString === null || deviceConnectionString === undefined) {
  console.error(logRed, 'Missing device connection string');
  process.exit(0);
}

const client: Client = Client.fromConnectionString(deviceConnectionString, Protocol);

client.open(function (err: Error | any): void {
  if (!err) {
    client.onDeviceMethod('firmwareUpdate', function (request: DeviceMethodRequest, response: DeviceMethodResponse): void {
        // Get the firmware image Uri from the body of the method request
        const fwPackageUri = request.payload;
        const fwPackageUriObj: url.UrlWithStringQuery = url.parse(fwPackageUri);

        // Ensure that the url is to a secure url
        if (fwPackageUriObj.protocol !== 'https:') {
          response.send(400, 'Invalid URL format.  Must use https:// protocol.',
            function (error: any): void {
              if (error)
                console.error(logRed, 'Error sending method response :\n' + error.toString());
              else
                console.log('Response to method "' + request.methodName + '" sent successfully.');
            }
          );
        } else {
          // Respond the cloud app for the device method
          response.send(
            200,
            'Firmware update started.',
            function (er: Error | any): void {
              if (er)
                console.error(logRed, 'Error sending method response :\n' + er.toString());
              else
                console.log('Response to method "' + request.methodName + '" sent successfully.');
            }
          );

          initiateFirmwareUpdateFlow(fwPackageUri, function (errors: Error): void {
            if (!errors) console.log('Completed firmwareUpdate flow');
          });
        }
      }
    );
    console.log('Client connected to IoT Hub. Waiting for firmwareUpdate device method...');
  }
});

// Implementation of firmwareUpdate flow
function initiateFirmwareUpdateFlow(fwPackageUri: any, callback: any): void {
  async.waterfall(
    [
      function (cb: any): void {
        downloadImage(fwPackageUri, cb);
      },
      applyImage,
    ],
    function (err: Error | any): void {
      if (err) {
        console.error(logRed, 'Error : ' + err.message);
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
      function (cb: any): void {
        reportFWUpdateThroughTwin(
          {
            status: 'downloading',
            startedDownloadingTime: new Date().toISOString(),
          },
          cb
        );
      },

      function (cb: any): void {
        console.log('Downloading image from URI: ' + fwPackageUriVal);

        // Replace this line with the code to download the image.  Delay used to simulate the download.
        setTimeout(function (): void {
          cb(null);
        }, 4000);
      },

      function (cb: any): void {
        reportFWUpdateThroughTwin(
          {
            status: 'Download complete',
            downloadCompleteTime: new Date().toISOString(),
          },
          cb
        );
      },
    ],
    function (err: Error | any): void {
      if (err) {
        reportFWUpdateThroughTwin(
          { status: 'Download image failed' },
          function (error: Error): void {
            callback(error);
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
      function (cb: any): void {
        reportFWUpdateThroughTwin(
          {
            status: 'applying',
            startedApplyingImage: new Date().toISOString(),
          },
          cb
        );
      },
      function (cb: any): void {
        console.log('Applying firmware image');

        // Replace this line with the code to download the image.  Delay used to simulate the download.
        setTimeout(function (): void {
          cb(null);
        }, 4000);
      },
      function (cb: any): void {
        reportFWUpdateThroughTwin(
          {
            status: 'Apply firmware image complete',
            lastFirmwareUpdate: new Date().toISOString(),
          },
          cb
        );
      },
    ],
    function (err: Error | any): void {
      if (err) {
        reportFWUpdateThroughTwin(
          { status: 'Apply image failed' },
          function (error: Error): void {
            callback(error);
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
  client.getTwin(function (err: any, twin: any): void {
    if (!err) {
      twin.properties.reported.update(patch, function (error: Error): void {
        callback(error);
      });
    } else {
      callback(err);
    }
  });
}
