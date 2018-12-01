// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var uuid = require('uuid');
var Promise = require('bluebird');

var serviceSdk = require('azure-iothub');
var eventHubClient = require('azure-event-hubs').Client;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-common').Message;
var SharedAccessSignature = require('azure-iot-device').SharedAccessSignature;
var ConnectionString = require('azure-iot-device').ConnectionString;
var DeviceIdentityHelper = require('./device_identity_helper.js');
var Rendezvous = require('./rendezvous_helper.js').Rendezvous;
var debug = require('debug')('e2etests:sas_token_tests');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
var transports  = [
  require('azure-iot-device-amqp').Amqp,
  require('azure-iot-device-amqp').AmqpWs,
  require('azure-iot-device-mqtt').Mqtt,
  require('azure-iot-device-mqtt').MqttWs,
  require('azure-iot-device-http').Http
];

transports.forEach(function (deviceTransport) {
  describe('Shared Access Signature renewal test over ' + deviceTransport.name, function () {
    this.timeout(60000);
    var provisionedDevice;

    before(function (beforeCallback) {
      DeviceIdentityHelper.createDeviceWithSymmetricKey(function (err, testDeviceInfo) {
        debug('created test device: ' + testDeviceInfo.deviceId);
        provisionedDevice = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      debug('deleting test device: ' + provisionedDevice.deviceId);
      DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, afterCallback);
    });

    function createTestMessage(body) {
      var msg = new Message(body);
      msg.expiryTimeUtc = Date.now() + 60000; // Expire 60s from now, to reduce the chance of us hitting the 50-message limit on the IoT Hub
      return msg;
    }

    function thirtySecondsFromNow() {
      var raw = (Date.now() / 1000) + 30;
      return Math.ceil(raw);
    }

    function createNewSas() {
      var cs = ConnectionString.parse(provisionedDevice.connectionString);
      var sas = SharedAccessSignature.create(cs.HostName, provisionedDevice.deviceId, cs.SharedAccessKey, thirtySecondsFromNow());
      return sas.toString();
    }

    it('Renews SAS after connection and is still able to receive C2D messages', function (testCallback) {
      var beforeUpdateSas = uuid.v4();
      var afterUpdateSas = uuid.v4();

      var deviceClient = Client.fromSharedAccessSignature(createNewSas(), deviceTransport);
      var serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString);
      var finishUp = function() {
        deviceClient.close(function () {
          serviceClient.close(function () {
            testCallback();
          });
        });
      };

      deviceClient.open(function (err) {
        if (err) return testCallback(err);
        var deviceClientParticipant = 'deviceClient';
        var serviceClientParticipant = 'serviceClient';
        var testRendezvous = new Rendezvous(finishUp);
        testRendezvous.imIn(deviceClientParticipant);


        deviceClient.on('message', function (msg) {
          deviceClient.complete(msg, function (err) {
            if (err) return testCallback(err);

            if (msg.data.toString() === beforeUpdateSas) {
              deviceClient.updateSharedAccessSignature(createNewSas(), function (err) {
                if (err) return testCallback(err);

                serviceClient.send(provisionedDevice.deviceId, createTestMessage(afterUpdateSas), function (err) {
                  if (err) return testCallback(err);
                  testRendezvous.imDone(serviceClientParticipant);
                });
              });
            } else if (msg.data.toString() === afterUpdateSas) {
              testRendezvous.imDone(deviceClientParticipant);
            }
          });
        });

        serviceClient.open(function (err) {
          if (err) return testCallback(err);
          testRendezvous.imIn(serviceClientParticipant);
          serviceClient.send(provisionedDevice.deviceId, createTestMessage(beforeUpdateSas), function (err) {
            if (err) return testCallback(err);
          });
        });
      });
    });

    it('Renews SAS after connection and is still able to send D2C messages', function(testCallback) {
      var beforeSas = uuid.v4();
      var afterSas = uuid.v4();

      function createBufferTestMessage(uuidData) {
        var buffer = new Buffer(uuidData);
        return new Message(buffer);
      }

      var deviceClient = Client.fromSharedAccessSignature(createNewSas(), deviceTransport);
      var ehClient = eventHubClient.fromConnectionString(hubConnectionString);

      var finishUp = function(err) {
        deviceClient.close(function () {
          ehClient.close().then(function () {
            testCallback(err);
          });
        });
      };
      var deviceClientParticipant = 'deviceClient';
      var ehClientParticipant = 'ehClient';
      var testRendezvous = new Rendezvous(finishUp);

      var ehReceivers = [];

      debug('opening event hubs client');
      var monitorStartTime = new Date(Date.now() - 30000);
      ehClient.open()
        .then(ehClient.getPartitionIds.bind(ehClient))
        .then(function (partitionIds) {
          debug('partition ids: ' + partitionIds.join(', '));
          return Promise.map(partitionIds, function (partitionId) {
            debug('creating receiver for partition id: ' + partitionId);
            return new Promise(function (resolve) {
              return ehClient.createReceiver('$Default', partitionId,{ 'startAfterTime' : monitorStartTime}).then(function(receiver) {
                debug('receiver created for partition id: ' + partitionId);
                ehReceivers.push(receiver);
                receiver.on('errorReceived', function(err) {
                  debug('error received on event hubs client: ' + err.toString());
                  finishUp(err);
                });
                receiver.on('message', function (eventData) {
                  debug('event hubs client: message received from device: \'' + eventData.annotations['iothub-connection-device-id'] + '\'');
                  debug('event hubs client: message is: ' + ((eventData.body) ? (eventData.body.toString()) : '(no body)'));
                  if (eventData.annotations['iothub-connection-device-id'] === provisionedDevice.deviceId) {
                    if (eventData.body && eventData.body.indexOf(beforeSas) === 0) {
                      debug('event hubs client: first message received: ' + eventData.body.toString());
                      debug('device client: updating shared access signature');
                      deviceClient.updateSharedAccessSignature(createNewSas(), function (err) {
                        if (err) return finishUp(err);

                        debug('device client: SAS renewal successful - sending second message: ' + afterSas);
                        deviceClient.sendEvent(createBufferTestMessage(afterSas), function (err) {
                          if (err) return finishUp(err);
                          debug('second message sent successfully');
                          testRendezvous.imDone(deviceClientParticipant);
                        });
                      });
                    } else if (eventData.body && eventData.body.indexOf(afterSas) === 0) {
                      debug('second message received: ' + eventData.body.toString());
                      Promise.map(ehReceivers, function (recvToClose) {
                        debug('closing receiver');
                        return recvToClose.close();
                      }).then(function () {
                        debug('receivers closed. closing the clients.');
                        testRendezvous.imDone(ehClientParticipant);
                      });
                    }
                  } else {
                    debug('not a message from the test device');
                  }
                });
                debug('receiver event handlers configured for partition: ' + partitionId);
                resolve();
              });
            });
          });
        })
        .then(function () {
          testRendezvous.imIn(ehClientParticipant);
          debug('opening device client');
          return deviceClient.open(function (err) {
            if (err) return finishUp(err);
            testRendezvous.imIn(deviceClientParticipant);
            debug('device client opened - sending first message: ' + beforeSas);
            deviceClient.sendEvent(createBufferTestMessage(beforeSas), function (sendErr) {
              if (sendErr) return finishUp(sendErr);
              debug('device client: first message sent: ' + beforeSas);
            });
          });
        })
        .catch(function (err) {
          finishUp(err);
        });

    });
  });
});