// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let assert = require('chai').assert;
let debug = require('debug')('e2etests:emptyd2cc2d');
let uuid = require('uuid');

let serviceSdk = require('azure-iothub');
let Message = require('azure-iot-common').Message;
let createDeviceClient = require('./testUtils.js').createDeviceClient;
let closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
let closeDeviceEventHubClients = require('./testUtils.js').closeDeviceEventHubClients;
let EventHubClient = require('@azure/event-hubs').EventHubClient;
let EventPosition = require('@azure/event-hubs').EventPosition;
let DeviceIdentityHelper = require('./device_identity_helper.js');
let Rendezvous = require('./rendezvous_helper.js').Rendezvous;

let deviceAmqp = require('azure-iot-device-amqp');
let deviceMqtt = require('azure-iot-device-mqtt');
let deviceHttp = require('azure-iot-device-http');

let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

[
  deviceHttp.Http,
  deviceAmqp.Amqp,
  deviceAmqp.AmqpWs,
  deviceMqtt.MqttWs,
  deviceMqtt.Mqtt
].forEach(function (deviceTransport) {
  empty_message_tests(deviceTransport, DeviceIdentityHelper.createDeviceWithSymmetricKey);
});

function empty_message_tests(deviceTransport, createDeviceMethod) {
  describe('Over ' + deviceTransport.name + ' using device/service clients c2d', function () {
    // eslint-disable-next-line no-invalid-this
    this.timeout(60000);

    let serviceClient;
    let deviceClient;
    let provisionedDevice;

    before(function (beforeCallback) {
      createDeviceMethod(function (err, testDeviceInfo) {
        provisionedDevice = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, afterCallback);
    });

    beforeEach(function () {
      serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString);
      deviceClient = createDeviceClient(deviceTransport, provisionedDevice);
    });

    afterEach(function (done) {
      closeDeviceServiceClients(deviceClient, serviceClient, done);
    });

    it('Service sends a C2D message with an empty payload and it is received by the device', function (done) {
      // eslint-disable-next-line no-invalid-this
      this.timeout(120000);
      let deviceClientParticipant = 'deviceClient';
      let serviceClientParticipant = 'serviceClient';
      let testRendezvous = new Rendezvous(done);
      testRendezvous.imIn(deviceClientParticipant);
      //
      // The size of non payload is calculated based on the value of the messageId value size,
      // the expiryTimeUtc value size and then on the application property value size plus one
      // for the application property name.
      //
      let uuidData = uuid.v4();
      let message = new Message('');
      message.messageId = uuidData;
      message.expiryTimeUtc = Date.now() + 60000; // Expire 60s from now, to reduce the chance of us hitting the 50-message limit on the IoT Hub

      let foundTheMessage = false;
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      deviceClient.open(function (openErr) {
        debug('device has opened.');
        if (openErr) {
          done(openErr);
        } else {
          debug('about to connect a listener.');
          deviceClient.on('message', function (msg) {
            debug('received a message');
            //
            // Make sure that the message we are looking at is one of the messages that we just sent.
            //
            foundTheMessage = (msg.messageId === uuidData);
            //
            // It doesn't matter whether this was a message we want, complete it so that the message queue stays clean.
            //
            deviceClient.complete(msg, function (err, result) {
              if (err) {
                done(err);
              } else {
                assert.equal(result.constructor.name, 'MessageCompleted');
                if (foundTheMessage) {
                  deviceClient.removeAllListeners('message');
                  testRendezvous.imDone(deviceClientParticipant);
                }
              }
            });
          });
          debug('about to open the service client');
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          serviceClient.open(function (serviceErr) {
            debug('At service client open callback - error is:' + serviceErr);
            if (serviceErr) {
              done(serviceErr);
            } else {
              testRendezvous.imIn(serviceClientParticipant);
              serviceClient.send(provisionedDevice.deviceId, message, function (sendErr) {
                debug('At service client send callback - error is: ' + sendErr);
                if (sendErr) {
                  done(sendErr);
                } else {
                  testRendezvous.imDone(serviceClientParticipant);
                }
              });
            }
          });
        }
      });
    });
  });

  describe('Over ' + deviceTransport.name + ' using device/eventhub clients - messaging', function () {
    // eslint-disable-next-line no-invalid-this
    this.timeout(120000);

    let deviceClient;
    let ehClient;
    let provisionedDevice;

    before(function (beforeCallback) {
      createDeviceMethod(function (err, testDeviceInfo) {
        provisionedDevice = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, afterCallback);
    });

    beforeEach(function () {
      deviceClient = createDeviceClient(deviceTransport, provisionedDevice);
    });

    afterEach(function (done) {
      closeDeviceEventHubClients(deviceClient, ehClient, done);
    });

    it('Device sends a message of zero size and it is received by the service', function (done) {
      // eslint-disable-next-line no-invalid-this
      this.timeout(120000);
      let startAfterTime = Date.now() - 10000;
      let deviceClientParticipant = 'deviceClient';
      let ehClientParticipant = 'ehClient';
      let testRendezvous = new Rendezvous(done);
      //
      // The size of non payload is calculated based on the value of the messageId value size
      // and then on the application property value size plus one for the application property name.
      //
      let uuidData = uuid.v4();
      let message = new Message('');
      message.messageId = uuidData;

      let onEventHubMessage = function (eventData) {
        if ((eventData.annotations['iothub-connection-device-id'] === provisionedDevice.deviceId)) {
          let receivedMsgId = eventData.properties && eventData.properties.message_id;
          if (Buffer.isBuffer(receivedMsgId)) {
            const str = receivedMsgId.toString('hex');
            receivedMsgId = `${str.slice(0, 8)}-${str.slice(8, 12)}-${str.slice(12, 16)}-${str.slice(16, 20)}-${str.slice(20)}`;
          }
          if (receivedMsgId === uuidData) {
            if(!eventData.body || (eventData.body.length === 0)) {
              debug('received correct empty message');
              testRendezvous.imDone(ehClientParticipant);
            } else {
              debug('received test message but it is not empty');
              done(new Error('Received message is not empty'));
            }
          } else {
            debug('received message from test device but messageId does not match. actual: ' + receivedMsgId + '; expected: ' + uuidData);
          }
        } else {
          debug('Received message from device: ' + eventData.annotations['iothub-connection-device-id'] + ' when expecting it from: ' + provisionedDevice.deviceId);
        }
      };

      let onEventHubError = function (err) {
        debug('Error from Event Hub Client Receiver: ' + err.toString());
        done(err);
      };

      EventHubClient.createFromIotHubConnectionString(hubConnectionString)
      .then(function (client) {
        ehClient = client;
        testRendezvous.imIn(ehClientParticipant);
      }).then(function () {
        return ehClient.getPartitionIds();
      }).then(function (partitionIds) {
        partitionIds.forEach(function (partitionId) {
          ehClient.receive(partitionId, onEventHubMessage, onEventHubError, { eventPosition: EventPosition.fromEnqueuedTime(startAfterTime) });
        });
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve();
          }, 3000);
        });
      }).then(function () {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        deviceClient.open(function (openErr) {
          if (openErr) {
            debug('error opening the device client: ' + openErr.toString());
            done(openErr);
          } else {
            testRendezvous.imIn(deviceClientParticipant);
            deviceClient.sendEvent(message, function (sendErr) {
              if (sendErr) {
                debug('error sending empty message: ' + sendErr.toString());
                done(sendErr);
              } else {
                debug('empty message sent with messageId: ' + message.messageId);
                testRendezvous.imDone(deviceClientParticipant);
              }
            });
          }
        });
      })
      .catch(done);
    });
  });
}
