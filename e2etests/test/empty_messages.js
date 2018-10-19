// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var debug = require('debug')('e2etests:emptyd2cc2d');
var uuid = require('uuid');

var serviceSdk = require('azure-iothub');
var Message = require('azure-iot-common').Message;
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
var closeDeviceEventHubClients = require('./testUtils.js').closeDeviceEventHubClients;
var eventHubClient = require('azure-event-hubs').Client;
var DeviceIdentityHelper = require('./device_identity_helper.js');
var Rendezvous = require('./rendezvous_helper.js').Rendezvous;

var deviceAmqp = require('azure-iot-device-amqp');
var deviceMqtt = require('azure-iot-device-mqtt');
var deviceHttp = require('azure-iot-device-http');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

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
    this.timeout(60000);

    var serviceClient, deviceClient;
    var provisionedDevice;

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
      var deviceClientParticipant = 'deviceClient';
      var serviceClientParticipant = 'serviceClient';
      var testRendezvous = new Rendezvous(done);
      testRendezvous.imIn(deviceClientParticipant);
      this.timeout(120000);
      //
      // The size of non payload is calculated based on the value of the messageId value size,
      // the expiryTimeUtc value size and then on the application property value size plus one
      // for the application property name.
      //
      var uuidData = uuid.v4();
      var message = new Message('');
      message.messageId = uuidData;
      message.expiryTimeUtc = Date.now() + 60000; // Expire 60s from now, to reduce the chance of us hitting the 50-message limit on the IoT Hub

      var foundTheMessage = false;
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
    this.timeout(120000);

    var deviceClient, ehClient, ehReceivers, provisionedDevice;

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
      ehClient = eventHubClient.fromConnectionString(hubConnectionString);
      deviceClient = createDeviceClient(deviceTransport, provisionedDevice);
      ehReceivers = [];
    });

    afterEach(function (done) {
      closeDeviceEventHubClients(deviceClient, ehClient, ehReceivers, done);
    });

    it('Device sends a message of zero size and it is received by the service', function (done) {
      var deviceClientParticipant = 'deviceClient';
      var ehClientParticipant = 'ehClient';
      var testRendezvous = new Rendezvous(done);
      this.timeout(120000);
      //
      // The size of non payload is calculated based on the value of the messageId value size
      // and then on the application property value size plus one for the application property name.
      //
      var uuidData = uuid.v4();
      var message = new Message('');
      message.messageId = uuidData;
      ehClient.open()
        .then(function() {testRendezvous.imIn(ehClientParticipant);})
        .then(ehClient.getPartitionIds.bind(ehClient))
        .then(function (partitionIds) {
          return partitionIds.map(function (partitionId) {
            return ehClient.createReceiver('$Default', partitionId, { 'startAfterTime' : Date.now() }).then(function(receiver) {
              ehReceivers.push(receiver);
              receiver.on('errorReceived', function(err) {
                done(err);
              });
              receiver.on('message', function (eventData) {
                  if ((eventData.annotations['iothub-connection-device-id'] === provisionedDevice.deviceId) &&
                      (eventData.systemProperties.messageId === uuidData) &&
                      (!eventData.body || (eventData.body.length === 0))) {
                    receiver.removeAllListeners();
                    testRendezvous.imDone(ehClientParticipant);
                  } else {
                    debug('Incoming device id is: '+ eventData.systemProperties['iothub-connection-device-id']);
                  }
                });
            });
          });
        })
        .then(function () {
          deviceClient.open(function (openErr) {
            if (openErr) {
              done(openErr);
            } else {
              testRendezvous.imIn(deviceClientParticipant);
              deviceClient.sendEvent(message, function (sendErr) {
                if (sendErr) {
                  done(sendErr);
                } else {
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
