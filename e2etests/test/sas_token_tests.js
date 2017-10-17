// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var uuid = require('uuid');
var assert = require('chai').assert;
var Promise = require('bluebird');

var serviceSdk = require('azure-iothub');
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
var eventHubClient = require('azure-event-hubs').Client;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-common').Message;
var SharedAccessSignature = require('azure-iot-device').SharedAccessSignature;
var ConnectionString = require('azure-iot-device').ConnectionString;

var runTests = function (hubConnectionString, deviceTransport, provisionedDevice) {
  describe('Device utilizing ' + provisionedDevice.authenticationDescription + ' authentication and ' + deviceTransport.name, function () {

    function createTestMessage(body) {
      var msg = new Message(body);
      msg.expiryTimeUtc = Date.now() + 60000; // Expire 60s from now, to reduce the chance of us hitting the 50-message limit on the IoT Hub
      return msg;
    }

    function thirtySecondsFromNow() {
      const raw = (Date.now() / 1000) + 30;
      return Math.ceil(raw);
    }

    function createNewSas() {
      var cs = ConnectionString.parse(provisionedDevice.connectionString)
      var sas = SharedAccessSignature.create(cs.HostName, provisionedDevice.deviceId, cs.SharedAccessKey, thirtySecondsFromNow())
      return sas.toString();
    };

    it('Renews SAS after connection and is still able to receive C2D messages', function (testCallback) {
      this.timeout(60000);
      var beforeUpdateSas = uuid.v4();
      var afterUpdateSas = uuid.v4();

      var deviceClient = Client.fromSharedAccessSignature(createNewSas(), deviceTransport);
      var serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString);

      deviceClient.open(function (err) {
        if (err) return testCallback(err);

        deviceClient.on('message', function (msg) {
          deviceClient.complete(msg, function (err, result) {
            if (err) return testCallback(err);

            if (msg.data.toString() === beforeUpdateSas) {
              deviceClient.updateSharedAccessSignature(createNewSas(), function (err) {
                if (err) return testCallback(err);

                serviceClient.send(provisionedDevice.deviceId, createTestMessage(afterUpdateSas), function (err) {
                  if (err) return testCallback(err);
                });
              })
            } else if (msg.data.toString() === afterUpdateSas) {
              deviceClient.close(function () {
                serviceClient.close(function () {
                  testCallback();
                });
              });
            }
          });
        });

        serviceClient.open(function (err) {
          if (err) return testCallback(err);
          serviceClient.send(provisionedDevice.deviceId, createTestMessage(beforeUpdateSas), function (err) {
            if (err) return testCallback(err);
          });
        });
      });
    });

    it('Renews SAS after connection and is still able to send D2C messages', function(testCallback) {
      this.timeout(60000);
      var beforeSas = uuid.v4();
      var afterSas = uuid.v4();

      function createBufferTestMessage(uuidData) {
        var bufferSize = 1024;
        var buffer = new Buffer(bufferSize);
        buffer.fill(uuidData);
        return new Message(buffer);
      }

      var deviceClient = Client.fromSharedAccessSignature(createNewSas(), deviceTransport);
      var ehClient = eventHubClient.fromConnectionString(hubConnectionString);

      function closeClients (err) {
        deviceClient.close(function () {
          ehClient.close().then(function () {
            testCallback(err);
          });
        });
      }

      var monitorStartTime = Date.now() - 5000;
      ehClient.open()
        .then(ehClient.getPartitionIds.bind(ehClient))
        .then(function (partitionIds) {
          return Promise.map(partitionIds, function (partitionId) {
            return new Promise(function (resolve) {
              return ehClient.createReceiver('$Default', partitionId,{ 'startAfterTime' : monitorStartTime}).then(function(receiver) {
                receiver.on('errorReceived', function(err) {
                  closeClients(err);
                });
                receiver.on('message', function (eventData) {
                  if (eventData.annotations['iothub-connection-device-id'] === provisionedDevice.deviceId) {
                    if (eventData.body.indexOf(beforeSas) === 0) {
                      deviceClient.updateSharedAccessSignature(createNewSas(), function (err) {
                        if (err) return closeClients(err);

                        deviceClient.sendEvent(createBufferTestMessage(afterSas), function (err) {
                          if (err) return closeClients(err);
                        });
                      });
                    } else if (eventData.body.indexOf(afterSas) === 0) {
                      closeClients();
                    }
                  }
                });
                resolve();
              });
            });
          });
        })
        .then(function () {
          return deviceClient.open(function (err) {
            if (err) return closeClients(err);
            deviceClient.sendEvent(createBufferTestMessage(beforeSas), function (sendErr) {
              if (sendErr) return closeClients(sendErr);
            });
          });
        })
        .catch(function (err) {
          closeClients(err);
        });

    });
  });
};

module.exports = runTests;


