// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var debug = require('debug')('e2etests:c2dd2c');
var uuid = require('uuid');

var serviceSdk = require('azure-iothub');
var Message = require('azure-iot-common').Message;
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
var closeDeviceEventHubClients = require('./testUtils.js').closeDeviceEventHubClients;
var eventHubClient = require('azure-event-hubs').Client;
var DeviceIdentityHelper = require('./device_identity_helper.js');

var deviceAmqp = require('azure-iot-device-amqp');
var deviceMqtt = require('azure-iot-device-mqtt');
var deviceHttp = require('azure-iot-device-http');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

var maximumMessageSize = ((256*1024)-512);

[
  DeviceIdentityHelper.createDeviceWithSas,
  DeviceIdentityHelper.createDeviceWithSymmetricKey,
  DeviceIdentityHelper.createDeviceWithX509SelfSignedCert
].forEach(function (createDeviceMethod) {
  [
    deviceHttp.Http,
    deviceAmqp.Amqp,
    deviceAmqp.AmqpWs,
    deviceMqtt.Mqtt
  ].forEach(function (deviceTransport) {
    device_service_tests(deviceTransport, createDeviceMethod);
  });
});

[
  deviceAmqp.Amqp,
  deviceMqtt.Mqtt
].forEach(function (deviceTransport) {
  device_service_tests(deviceTransport, DeviceIdentityHelper.createDeviceWithX509CASignedCert);
});

function device_service_tests(deviceTransport, createDeviceMethod) {
  describe('Over ' + deviceTransport.name + ' using device/service clients c2d with ' + createDeviceMethod.name + ' authentication', function () {
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

    it('Service sends a C2D message of maximum size and it is received by the device', function (done) {
      var receivingSideDone = false;
      var sendingSideDone = false;
      function tryFinish(done) {
        if (receivingSideDone && sendingSideDone) {
          done();
        }
      }
      this.timeout(180000);
      //
      // The size of non payload is calculated based on the value of the messageId value size,
      // the expiryTimeUtc value size and then on the application property value size plus one
      // for the application property name.
      //
      var uuidData = uuid.v4();
      var sizeOfNonPayload = (2*(uuidData.length)) + 8 + 1;
      var bufferSize = maximumMessageSize - sizeOfNonPayload;
      var buffer = new Buffer(bufferSize);
      var message = new Message(buffer);
      message.messageId = uuidData;
      message.expiryTimeUtc = Date.now() + 60000; // Expire 60s from now, to reduce the chance of us hitting the 50-message limit on the IoT Hub
      message.properties.add('a', uuidData);
      buffer.fill(uuidData);

      var foundTheMessage = false;
      var foundTheProperty = false;
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
              for (var i = 0; i < msg.properties.count(); i++) {
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

  describe('Over ' + deviceTransport.name + ' using device/eventhub clients - messaging with ' + createDeviceMethod.name + ' authentication', function () {
    this.timeout(60000);

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

    it('Device sends a message of maximum size and it is received by the service', function (done) {
      var receivingSideDone = false;
      var sendingSideDone = false;
      function tryFinish(done)
      {
        if (receivingSideDone && sendingSideDone)
        {
          done();
        }
      }
      this.timeout(120000);
      //
      // The size of non payload is calculated based on the value of the messageId value size
      // and then on the application property value size plus one for the application property name.
      //
      var uuidData = uuid.v4();
      var sizeOfNonPayload = (2*uuidData.length) + 1;
      var bufferSize = maximumMessageSize - sizeOfNonPayload;
      var buffer = new Buffer(bufferSize);
      var message = new Message(buffer);
      debug(' message max send: size of non playload ' + sizeOfNonPayload);
      debug(' message max send: buffersize ' + bufferSize);
      debug(' message max send: maximum message size ' + maximumMessageSize);
      message.messageId = uuidData;
      message.properties.add('a', uuidData);
      buffer.fill(uuidData);
      ehClient.open()
              .then(ehClient.getPartitionIds.bind(ehClient))
              .then(function (partitionIds) {
                return partitionIds.map(function (partitionId) {
                  return ehClient.createReceiver('$Default', partitionId,{ 'startAfterTime' : Date.now()}).then(function(receiver) {
                    ehReceivers.push(receiver);
                    receiver.on('errorReceived', function(err) {
                      done(err);
                    });
                    receiver.on('message', function (eventData) {
                        if (eventData.annotations['iothub-connection-device-id'] === provisionedDevice.deviceId) {
                          if ((eventData.body.length === bufferSize) && (eventData.body.indexOf(uuidData) === 0)) {
                            receiver.removeAllListeners();
                            receivingSideDone = true;
                            debug('trying to finish from the receiving side');
                            tryFinish(done);
                          } else {
                            debug('eventData.body: ' + eventData.body + ' doesn\'t match: ' + uuidData);
                          }
                        } else {
                          debug('Incoming device id is: '+eventData.systemProperties['iothub-connection-device-id']);
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
                    //need to add properties test when the event hubs node sdk supports it.
                    deviceClient.sendEvent(message, function (sendErr) {
                      if (sendErr) {
                        done(sendErr);
                      }
                      sendingSideDone = true;
                      debug('trying to finish from the sending side');
                      tryFinish(done);
                    });
                  }
                });
              })
              .catch(done);
          });
  });
}
