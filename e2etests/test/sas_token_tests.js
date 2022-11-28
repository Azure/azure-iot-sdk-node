// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let uuid = require('uuid');

let serviceSdk = require('azure-iothub');
let EventHubClient = require('@azure/event-hubs').EventHubClient;
let EventPosition = require('@azure/event-hubs').EventPosition;
let Client = require('azure-iot-device').Client;
let Message = require('azure-iot-common').Message;
let SharedAccessSignature = require('azure-iot-device').SharedAccessSignature;
let ConnectionString = require('azure-iot-device').ConnectionString;
let DeviceIdentityHelper = require('./device_identity_helper.js');
let Rendezvous = require('./rendezvous_helper.js').Rendezvous;
let debug = require('debug')('e2etests:sas_token_tests');

let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
let transports  = [
  require('azure-iot-device-amqp').Amqp,
  require('azure-iot-device-amqp').AmqpWs,
  require('azure-iot-device-mqtt').Mqtt,
  require('azure-iot-device-mqtt').MqttWs,
  require('azure-iot-device-http').Http
];

transports.forEach(function (deviceTransport) {
  describe('Shared Access Signature renewal test over ' + deviceTransport.name, function () {
    // eslint-disable-next-line no-invalid-this
    this.timeout(60000);
    let provisionedDevice;

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
      let msg = new Message(body);
      msg.expiryTimeUtc = Date.now() + 60000; // Expire 60s from now, to reduce the chance of us hitting the 50-message limit on the IoT Hub
      return msg;
    }

    function thirtySecondsFromNow() {
      let raw = (Date.now() / 1000) + 30;
      return Math.ceil(raw);
    }

    function createNewSas() {
      let cs = ConnectionString.parse(provisionedDevice.connectionString);
      let sas = SharedAccessSignature.create(cs.HostName, provisionedDevice.deviceId, cs.SharedAccessKey, thirtySecondsFromNow());
      return sas.toString();
    }

    it('Renews SAS after connection and is still able to receive C2D messages', function (testCallback) {
      let beforeUpdateSas = uuid.v4();
      let afterUpdateSas = uuid.v4();

      let deviceClient = Client.fromSharedAccessSignature(createNewSas(), deviceTransport);
      let serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString);
      let finishUp = function () {
        deviceClient.close(function () {
          serviceClient.close(function () {
            testCallback();
          });
        });
      };

      // eslint-disable-next-line security/detect-non-literal-fs-filename
      deviceClient.open(function (err) {
        if (err) return testCallback(err);
        let deviceClientParticipant = 'deviceClient';
        let serviceClientParticipant = 'serviceClient';
        let testRendezvous = new Rendezvous(finishUp);
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

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        serviceClient.open(function (err) {
          if (err) return testCallback(err);
          testRendezvous.imIn(serviceClientParticipant);
          serviceClient.send(provisionedDevice.deviceId, createTestMessage(beforeUpdateSas), function (err) {
            if (err) return testCallback(err);
          });
        });
      });
    });

    it('Renews SAS after connection and is still able to send D2C messages', function (testCallback) {
      let beforeSas = uuid.v4();
      let afterSas = uuid.v4();

      function createBufferTestMessage(uuidData) {
        let buffer = Buffer.from(uuidData);
        return new Message(buffer);
      }

      let deviceClient = Client.fromSharedAccessSignature(createNewSas(), deviceTransport);
      let ehClient;

      let finishUp = function (err) {
        deviceClient.close(function () {
          ehClient.close().then(function () {
            testCallback(err);
          });
        });
      };
      let deviceClientParticipant = 'deviceClient';
      let ehClientParticipant = 'ehClient';
      let testRendezvous = new Rendezvous(finishUp);

      let onEventHubError = function (err) {
        debug('error received on event hubs client: ' + err.toString());
        finishUp(err);
      };

      let onEventHubMessage = function (eventData) {
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
            testRendezvous.imDone(ehClientParticipant);
          }
        } else {
          debug('not a message from the test device');
        }
      };

      debug('opening event hubs client');
      let monitorStartTime = new Date(Date.now() - 30000);
      EventHubClient.createFromIotHubConnectionString(hubConnectionString)
      .then(function (client) {
        ehClient = client;
        testRendezvous.imIn(ehClientParticipant);
      }).then(function () {
        return ehClient.getPartitionIds();
      }).then(function (partitionIds) {
        partitionIds.forEach(function (partitionId) {
          ehClient.receive(partitionId, onEventHubMessage, onEventHubError, { eventPosition: EventPosition.fromEnqueuedTime(monitorStartTime) });
        });
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve();
          }, 3000);
        });
      }).then(function () {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        deviceClient.open(function (err) {
          if (err) return finishUp(err);
          testRendezvous.imIn(deviceClientParticipant);
          debug('device client opened - sending first message: ' + beforeSas);
          deviceClient.sendEvent(createBufferTestMessage(beforeSas), function (sendErr) {
            if (sendErr) return finishUp(sendErr);
            debug('device client: first message sent: ' + beforeSas);
          });
        });
        return null;
      })
      .catch(function (err) {
        finishUp(err);
      });
    });
  });
});
