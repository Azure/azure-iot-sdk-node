// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let assert = require('chai').assert;
let debug = require('debug')('e2etests:c2dd2c');
let uuid = require('uuid');

let serviceSdk = require('azure-iothub');
let Message = require('azure-iot-common').Message;
let createDeviceClient = require('./testUtils.js').createDeviceClient;
let closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
let closeDeviceEventHubClients = require('./testUtils.js').closeDeviceEventHubClients;
let EventHubClient = require('@azure/event-hubs').EventHubClient;
let EventPosition = require('@azure/event-hubs').EventPosition;
let DeviceIdentityHelper = require('./device_identity_helper.js');
let RendezVous = require('./rendezvous_helper').Rendezvous;

let deviceAmqp = require('azure-iot-device-amqp');
let deviceMqtt = require('azure-iot-device-mqtt');
let deviceHttp = require('azure-iot-device-http');

let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

let maximumMessageSize = ((64*1024)-512);

[
  DeviceIdentityHelper.createDeviceWithSas,
  DeviceIdentityHelper.createDeviceWithSymmetricKey,
  DeviceIdentityHelper.createDeviceWithX509SelfSignedCert,
  DeviceIdentityHelper.createDeviceWithX509CASignedCert
].forEach(function (createDeviceMethod) {
  [
    deviceHttp.Http,
    deviceAmqp.Amqp,
    deviceAmqp.AmqpWs,
    deviceMqtt.Mqtt,
    deviceMqtt.MqttWs
  ].forEach(function (deviceTransport) {
    device_service_tests(deviceTransport, createDeviceMethod);
  });
});

function device_service_tests(deviceTransport, createDeviceMethod) {
  describe('Over ' + deviceTransport.name + ' using device/service clients c2d with ' + createDeviceMethod.name + ' authentication', function () {
    // eslint-disable-next-line no-invalid-this
    this.timeout(60000);

    let serviceClient;
    let deviceClient;
    let provisionedDevice;

    before(function (beforeCallback) {
      createDeviceMethod(function (err, testDeviceInfo) {
        provisionedDevice = testDeviceInfo;
        // Wait a second for the registry to finish creating the device before we try to use it.
        // We may get occasional E2E failures if we don't do this.
        setTimeout(function () {
          beforeCallback(err);
        }, 1000);
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

    /*
    NOTE: By default, IoT Hubs support a maximum C2D message size of 64KB, which will cause this test to fail.
    */
    it('Service sends a C2D message of maximum size and it is received by the device', function (done) {
      // eslint-disable-next-line no-invalid-this
      this.timeout(180000);
      let receivingSideDone = false;
      let sendingSideDone = false;
      function tryFinish(done) {
        if (receivingSideDone && sendingSideDone) {
          done();
        }
      }
      //
      // The size of non payload is calculated based on the value of the messageId value size,
      // the expiryTimeUtc value size and then on the application property value size plus one
      // for the application property name.
      //
      let uuidData = uuid.v4();
      let sizeOfNonPayload = (2*(uuidData.length)) + 8 + 1;
      let bufferSize = maximumMessageSize - sizeOfNonPayload;
      let buffer = Buffer.alloc(bufferSize);
      let message = new Message(buffer);
      message.messageId = uuidData;
      message.expiryTimeUtc = Date.now() + 60000; // Expire 60s from now, to reduce the chance of us hitting the 50-message limit on the IoT Hub
      message.properties.add('a', uuidData);
      buffer.fill(uuidData);

      let foundTheMessage = false;
      let foundTheProperty = false;
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      deviceClient.open(function (openErr) {
        debug('device has opened.');
        if (openErr) {
          done(openErr);
        } else {
          debug('about to connect a listener.');
          deviceClient.on('message', function (msg) {
            //
            // Make sure that the message we are looking at is one of the messages that we just sent.
            //
            if (msg.data.toString() === message.data.toString()) {
              foundTheMessage = true;
              for (let i = 0; i < msg.properties.count(); i++) {
                if (msg.properties.getItem(i).key.indexOf('a') >= 0) {
                  assert.equal(msg.properties.getItem(i).value, uuidData);
                  foundTheProperty = true;
                }
              }
              assert(foundTheProperty, 'Message was found but custom property was missing');
            }
            //
            // It doesn't matter whether this was a message we want, complete it so that the message queue stays clean.
            //
            deviceClient.complete(msg, function (err, result) {
              if (err) {
                done(err);
              } else {
                assert.equal(result.constructor.name, 'MessageCompleted');
                if (foundTheMessage) {
                  receivingSideDone = true;
                  deviceClient.removeAllListeners('message');
                  debug('trying to finish from the receiving side');
                  tryFinish(done);
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
              serviceClient.send(provisionedDevice.deviceId, message, function (sendErr) {
                debug('At service client send callback - error is: ' + sendErr);
                if (sendErr) {
                  done(sendErr);
                } else {
                  sendingSideDone = true;
                  debug('trying to finish from the sending side');
                  tryFinish(done);
                }
              });
            }
          });
        }
      });
    });
  });

  describe('Over ' + deviceTransport.name + ' using device/eventhub clients - d2c with ' + createDeviceMethod.name + ' authentication', function () {
    // eslint-disable-next-line no-invalid-this
    this.timeout(60000);

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

    it('Device sends a message of maximum size and it is received by the service', function (done) {
      // eslint-disable-next-line no-invalid-this
      this.timeout(120000);
      let rdv = new RendezVous(done);
      //
      // The size of non payload is calculated based on the value of the messageId value size
      // and then on the application property value size plus one for the application property name.
      //
      let startAfterTime = Date.now() - 5000;
      let uuidData = uuid.v4();
      let sizeOfNonPayload = (2*uuidData.length) + 1;
      let bufferSize = maximumMessageSize - sizeOfNonPayload;
      let buffer = Buffer.alloc(bufferSize);
      let message = new Message(buffer);
      debug(' message max send: size of non payload ' + sizeOfNonPayload);
      debug(' message max send: buffersize ' + bufferSize);
      debug(' message max send: maximum message size ' + maximumMessageSize);
      message.messageId = uuidData;
      message.properties.add('a', uuidData);
      message.properties.add('dt-subject', uuidData);
      buffer.fill(uuidData);

      let onEventHubMessage = function (eventData) {
        if (eventData.annotations['iothub-connection-device-id'] === provisionedDevice.deviceId) {
          if ((eventData.body.length === bufferSize) && (eventData.body.indexOf(uuidData) === 0)) {
            assert.strictEqual(eventData.annotations['dt-subject'], uuidData);
            debug('trying to finish from the receiving side');
            rdv.imDone('ehClient');
          } else {
            debug('eventData.body: ' + eventData.body + ' doesn\'t match: ' + uuidData);
          }
        } else {
          debug('Incoming device id is: ' + eventData.annotations['iothub-connection-device-id']);
        }
      };

      let onEventHubError = function (err) {
        debug('Error from Event Hub Client Receiver: ' + err.toString());
        done(err);
      };

      EventHubClient.createFromIotHubConnectionString(hubConnectionString)
      .then(function (client) {
        ehClient = client;
        rdv.imIn('ehClient');
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
          rdv.imIn('deviceClient');
          if (openErr) {
            done(openErr);
          } else {
            //need to add properties test when the event hubs node sdk supports it.
            deviceClient.sendEvent(message, function (sendErr) {
              if (sendErr) {
                done(sendErr);
              }
              debug('trying to finish from the sending side');
              rdv.imDone('deviceClient');
            });
          }
        });
      })
      .catch(function (err) {
        debug('Error thrown by Event Hubs client: ' + err.toString());
        done(err);
      });
    });
  });
}
