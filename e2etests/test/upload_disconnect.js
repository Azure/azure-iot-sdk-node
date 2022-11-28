// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
let fs = require('fs');
let assert = require('chai').assert;
let uuid = require('uuid');
let debug = require('debug')('e2etests:uploaddisconnect');

let deviceAmqp = require('azure-iot-device-amqp');
let deviceMqtt = require('azure-iot-device-mqtt');
let serviceSdk = require('azure-iothub');
let createDeviceClient = require('./testUtils.js').createDeviceClient;
let closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
let Message = require('azure-iot-common').Message;
let DeviceIdentityHelper = require('./device_identity_helper.js');

let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

[
  deviceMqtt.Mqtt,
  deviceMqtt.MqttWs,
  deviceAmqp.Amqp,
  deviceAmqp.AmqpWs
].forEach(function (deviceTransport) {
  // eslint-disable-next-line mocha/no-skipped-tests
  describe.skip('Over ' + deviceTransport.name + ':', function () {
    // eslint-disable-next-line no-invalid-this
    this.timeout(120000);
    let serviceClient;
    let deviceClient;
    let testFilesConfig = [{
      fileName: 'bigFile',
      fileSizeInKb: '512000',
    }];

    let provisionedDevice;

    before(function (beforeCallback) {
      testFilesConfig.forEach(function (fileConfig) {
        let fileContent = Buffer.alloc(fileConfig.fileSizeInKb * 1024);
        fileContent.fill(uuid.v4());
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.writeFileSync(fileConfig.fileName, fileContent);
      });
      DeviceIdentityHelper.createDeviceWithSas(function (err, testDeviceInfo) {
        provisionedDevice = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      testFilesConfig.forEach(function (fileConfig) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.unlinkSync(fileConfig.fileName);
      });
      DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, afterCallback);
    });

    beforeEach(function () {
      serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString);
      deviceClient = createDeviceClient(deviceTransport, provisionedDevice);
    });

    afterEach(function (done) {
      closeDeviceServiceClients(deviceClient, serviceClient, done);
    });

    testFilesConfig.forEach(function (fileConfig) {
      it('device successfully uploads a file of ' + fileConfig.fileSizeInKb + 'Kb and the notification is received by the service', function (done) {
        let testBlobName = 'e2eblob';
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.stat(fileConfig.fileName, function (err, fileStats) {
          if(err) {
            done(err);
          } else {
            let testFileSize = fileStats.size;
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            let fileStream = fs.createReadStream(fileConfig.fileName);

            // eslint-disable-next-line security/detect-non-literal-fs-filename
            serviceClient.open(function (err) {
              let startedDoingUpload = false;
              let sawADisconnect = false;
              if (err) {
                done(err);
              } else {
                serviceClient.getFileNotificationReceiver(function (err, fileNotificationReceiver) {
                  if (err) {
                    done(err);
                  } else {
                    fileNotificationReceiver.on('message', function (msg) {
                      let notification = JSON.parse(msg.data.toString());
                      if (notification.deviceId === provisionedDevice.deviceId && notification.blobName === provisionedDevice.deviceId + '/' + testBlobName) {
                        assert.isString(notification.blobUri);
                        assert.equal(notification.blobSizeInBytes, testFileSize);
                        debug('did reach the service clients on message');
                        fileNotificationReceiver.complete(msg, function (err) {
                          err = (err) ? err : ((sawADisconnect) ? undefined : new Error('Never saw the disconnecct'));
                          done(err);
                        });
                      }
                    });

                    // eslint-disable-next-line security/detect-non-literal-fs-filename
                    deviceClient.open(function (err) {
                      deviceClient.on('disconnect', function () {
                        debug('We did get a disconnect message');
                        if (!startedDoingUpload) {
                          done(new Error('unexpected disconnect'));
                        } else {
                          sawADisconnect = true;
                        }
                      });
                      if (err) {
                        done(err);
                      } else {
                        debug('started the file upload of ' + testBlobName);
                        deviceClient.uploadToBlob(testBlobName, fileStream, fileStats.size, function (err) {
                          debug('Reached the callback of the file upload of ' + testBlobName + ' err is: ' + err);
                          if(err) {
                            done(err);
                          }
                        });
                        startedDoingUpload = true;
                        let terminateMessage = new Message('');
                        terminateMessage.properties.add('AzIoTHub_FaultOperationType', 'KillTcp');
                        terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', ' severs the TCP connection ');
                        terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', 1);
                        deviceClient.sendEvent(terminateMessage, function (sendErr) {
                          debug('at the callback for the fault injection send, err is:' + sendErr);
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      });
    });
  });
});
