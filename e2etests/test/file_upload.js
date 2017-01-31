// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var fs = require('fs');
var assert = require('chai').assert;
var uuid = require('uuid');

var serviceSdk = require('azure-iothub');
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;

var runTests = function (hubConnectionString, deviceTransport, provisionedDevice) {
  describe('Device utilizing ' + provisionedDevice.authenticationDescription + ' authentication, connected over ' + deviceTransport.name + ':', function () {
    this.timeout(120000);
    var serviceClient, deviceClient;
    var testFilesConfig = [{
      fileName: 'smallFile',
      fileSizeInKb: '10',
    },{
      fileName: 'bigFile',
      fileSizeInKb: '5120',
    }];

    before(function() {
      testFilesConfig.forEach(function(fileConfig) {
        var fileContent = new Buffer(fileConfig.fileSizeInKb * 1024);
        fileContent.fill(uuid.v4());
        fs.writeFileSync(fileConfig.fileName, fileContent);
      });
    });

    after(function() {
      testFilesConfig.forEach(function(fileConfig) {
        fs.unlinkSync(fileConfig.fileName);
      });
    });

    beforeEach(function () {
      this.timeout(20000);
      serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString);
      deviceClient = createDeviceClient(deviceTransport, provisionedDevice);
    });

    afterEach(function (done) {
      this.timeout(20000);
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
                        fileNotificationReceiver.complete(msg, function(err) {
                          done(err);
                        });
                      }
                    });

                    deviceClient.open(function(err) {
                      if (err) {
                        done(err);
                      } else {
                        deviceClient.uploadToBlob(testBlobName, fileStream, fileStats.size, function(err) {
                          if(err) {
                            done(err);
                          }
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
};

module.exports = runTests;