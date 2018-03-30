// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var fs = require('fs');
var assert = require('chai').assert;
var uuid = require('uuid');
var debug = require('debug')('e2etests:uploaddisconnect');

var deviceAmqp = require('azure-iot-device-amqp');
var deviceMqtt = require('azure-iot-device-mqtt');
var serviceSdk = require('azure-iothub');
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
var Message = require('azure-iot-common').Message;
var DeviceIdentityHelper = require('./device_identity_helper.js');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

[
  deviceMqtt.Mqtt,
  deviceMqtt.MqttWs,
  deviceAmqp.Amqp,
  deviceAmqp.AmqpWs
].forEach(function (deviceTransport) {
  describe.skip('Over ' + deviceTransport.name + ':', function () {
    this.timeout(120000);
    var serviceClient, deviceClient;
    var testFilesConfig = [{
      fileName: 'bigFile',
      fileSizeInKb: '512000',
    }];

    var provisionedDevice;

    before(function (beforeCallback) {
      testFilesConfig.forEach(function(fileConfig) {
        var fileContent = new Buffer(fileConfig.fileSizeInKb * 1024);
        fileContent.fill(uuid.v4());
        fs.writeFileSync(fileConfig.fileName, fileContent);
      });
      DeviceIdentityHelper.createDeviceWithSas(function (err, testDeviceInfo) {
        provisionedDevice = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      testFilesConfig.forEach(function(fileConfig) {
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

    testFilesConfig.forEach(function(fileConfig) {
      it('device successfully uploads a file of ' + fileConfig.fileSizeInKb + 'Kb and the notification is received by the service', function(done) {
        var testBlobName = 'e2eblob';
        fs.stat(fileConfig.fileName, function (err, fileStats) {
          if(err) {
            done(err);
          } else {
            var testFileSize = fileStats.size;
            var fileStream = fs.createReadStream(fileConfig.fileName);

            serviceClient.open(function(err) {
              var startedDoingUpload = false;
              var sawADisconnect = false;
              if (err) {
                done(err);
              } else {
                serviceClient.getFileNotificationReceiver(function(err, fileNotificationReceiver) {
                  if (err) {
                    done(err);
                  } else {
                    fileNotificationReceiver.on('message', function(msg) {
                      var notification = JSON.parse(msg.data.toString());
                      if (notification.deviceId === provisionedDevice.deviceId && notification.blobName === provisionedDevice.deviceId + '/' + testBlobName) {
                        assert.isString(notification.blobUri);
                        assert.equal(notification.blobSizeInBytes, testFileSize);
                        debug('did reach the service clients on message');
                        fileNotificationReceiver.complete(msg, function(err) {
                          err = (err) ? err : ((sawADisconnect) ? undefined : new Error('Never saw the disconnecct'));
                          done(err);
                        });
                      }
                    });

                    deviceClient.open(function(err) {
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
                        deviceClient.uploadToBlob(testBlobName, fileStream, fileStats.size, function(err) {
                          debug('Reached the callback of the file upload of ' + testBlobName + ' err is: ' + err);
                          if(err) {
                            done(err);
                          }
                        });
                        startedDoingUpload = true;
                        var terminateMessage = new Message('');
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