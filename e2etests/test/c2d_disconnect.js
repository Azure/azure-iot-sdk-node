// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var debug = require('debug')('e2etests:c2ddisconnect');
var uuid = require('uuid');
var deviceAmqp = require('azure-iot-device-amqp');
var deviceMqtt = require('azure-iot-device-mqtt');


var serviceSdk = require('azure-iothub');
var Message = require('azure-iot-common').Message;
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
var NoRetry = require('azure-iot-common').NoRetry;
var DeviceIdentityHelper = require('./device_identity_helper.js');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

var numberOfC2DMessages = 5;
var sendMessageTimeout = null;

var doConnectTest = function doConnectTest(doIt) {
  return doIt ? it : it.skip;
};

var protocolAndTermination = [
  {
    testEnabled: true,
    transport: deviceAmqp.Amqp,
    operationType: 'KillTcp',
    closeReason: ' severs the TCP connection ',
    delayInSeconds: 2
  },
  {
    testEnabled: true,
    transport: deviceAmqp.AmqpWs,
    operationType: 'KillTcp',
    closeReason: ' severs the TCP connection ',
    delayInSeconds: 2
  },
  {
    testEnabled: false,
    transport: deviceMqtt.Mqtt,
    operationType: 'KillTcp',
    closeReason: ' severs the TCP connection ',
    delayInSeconds: 2
  },
  {
    testEnabled: false,
    transport: deviceMqtt.MqttWs,
    operationType: 'KillTcp',
    closeReason: ' severs the TCP connection ',
    delayInSeconds: 2
  },
  {
    testEnabled: true,
    transport: deviceAmqp.Amqp,
    operationType: 'KillAmqpConnection',
    closeReason: ' severs the AMQP connection ',
    delayInSeconds: 2
  },
  {
    testEnabled: true,
    transport: deviceAmqp.Amqp,
    operationType: 'KillAmqpSession',
    closeReason: ' severs the AMQP session ',
    delayInSeconds: 1
  },
  {
    testEnabled: true,
    transport: deviceAmqp.Amqp,
    operationType: 'KillAmqpCBSLinkReq',
    closeReason: ' severs AMQP CBS request link ',
    delayInSeconds: 2
  },
  {
    testEnabled: true,
    transport: deviceAmqp.Amqp,
    operationType: 'KillAmqpCBSLinkResp',
    closeReason: ' severs AMQP CBS response link ',
    delayInSeconds: 2
  },
  {
    testEnabled: true,
    transport: deviceAmqp.Amqp,
    operationType: 'KillAmqpC2DLink',
    closeReason: ' severs AMQP C2D link ',
    delayInSeconds: 2
  },
  {
    testEnabled: true,
    transport: deviceAmqp.Amqp,
    operationType: 'ShutDownAmqp',
    closeReason: ' cleanly shutdowns AMQP connection ',
    delayInSeconds: 2
  },
  {
    testEnabled: false,
    transport: deviceMqtt.Mqtt,
    operationType: 'ShutDownMqtt',
    closeReason: ' cleanly shutdowns MQTT connection ',
    delayInSeconds: 2
  },
];


protocolAndTermination.forEach( function (testConfiguration) {
  describe(testConfiguration.transport.name + ' using device/service clients - disconnect c2d', function () {
    this.timeout(60000);

    var serviceClient, deviceClient;

    var provisionedDevice;

    before(function (beforeCallback) {
      DeviceIdentityHelper.createDeviceWithSas(function (err, testDeviceInfo) {
        provisionedDevice = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, afterCallback);
    });

    beforeEach(function () {
      serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString);
      deviceClient = createDeviceClient(testConfiguration.transport, provisionedDevice);
      sendMessageTimeout = null;
    });

    afterEach(function (testCallback) {
      closeDeviceServiceClients(deviceClient, serviceClient, testCallback);
      if (sendMessageTimeout !== null) clearTimeout(sendMessageTimeout);
    });

    doConnectTest(testConfiguration.testEnabled)('Service sends a C2D message, device receives it, and' + testConfiguration.closeReason + 'which is noted by the iot hub client', function (testCallback) {
      var receivingSideDone = false;
      var sendingSideDone = false;
      var uuidData = uuid.v4();
      var originalMessage = new Message(uuidData);
      deviceClient.setRetryPolicy(new NoRetry());
      var disconnectHandler = function () {
        debug('We did get a disconnect message');
        deviceClient.removeListener('disconnect', disconnectHandler);
        if (receivingSideDone) {
          testCallback();
        } else {
          testCallback(new Error('unexpected disconnect'));
        }
      };

      originalMessage.messageId = uuidData;
      originalMessage.expiryTimeUtc = Date.now() + 60000; // Expire 60s from now, to reduce the chance of us hitting the 50-message limit on the IoT Hub

      deviceClient.open(function (openErr) {
        debug('device has opened.');
        if (openErr) {
          testCallback(openErr);
        } else {
          debug('about to connect a listener.');
          deviceClient.on('disconnect', disconnectHandler);
          deviceClient.on('message', function (receivedMessage) {
            deviceClient.complete(receivedMessage, function (err, result) { // It doesn't matter whether this was a message we want, complete it so that the message queue stays clean.
              if (err) {
                testCallback(err);
              } else {
                assert.equal(result.constructor.name, 'MessageCompleted');
                debug('received msg data: ' + receivedMessage.messageId + ' sent data: ' + originalMessage.messageId);
                if (receivedMessage.messageId === originalMessage.messageId) {
                  debug('we found the sent message');
                  receivingSideDone = true;
                  var terminateMessage = new Message('');
                  terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
                  terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
                  terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
                  deviceClient.sendEvent(terminateMessage, function (sendErr) {
                    debug('at the callback for the fault injection send, err is:' + sendErr);
                  });
                }
              }
            });

          });
          debug('about to open the service client');
          serviceClient.open(function (serviceErr) {
            debug('At service client open callback - error is:' + serviceErr);
            if (serviceErr) {
              testCallback(serviceErr);
            } else {
              serviceClient.send(provisionedDevice.deviceId, originalMessage, function (sendErr) {
                debug('At service client send callback - error is: ' + sendErr);
                if (sendErr) {
                  testCallback(sendErr);
                } else {
                  sendingSideDone = true;
                }
              });
            }
          });
        }
      });
    });

    doConnectTest(testConfiguration.testEnabled)('Service sends ' + numberOfC2DMessages + ' C2D messages, device receives first and' + testConfiguration.closeReason + 'which is never seen by the iot hub client', function (testCallback) {
      var originalMessages = [];
      var messagesReceived = 0;
      var messagesSent = 0;
      var c2dMessageSender = function() {
        if (messagesSent >= numberOfC2DMessages) {
          testCallback(new Error('tried to send to many messages'));
        } else {
          serviceClient.send(provisionedDevice.deviceId, originalMessages[messagesSent++], function (sendErr) {
            debug('At service client send callback - error is: ' + sendErr);
            if (sendErr) {
              testCallback(sendErr);
            }
          });
        }
      };
      var findMessage = function(incomingMessage, storedMessages) {
        for (var j = 0; j < storedMessages.length; j++) {
          if (incomingMessage.messageId === storedMessages[j].messageId) {
            if (!storedMessages[j].alreadyReceived) {
              storedMessages.alreadyReceived =  true;
              return true;
            } else {
              testCallback(new Error('received a message more than once'));
            }
          }
        }
        return false;
      };
      for (var i = 0; i < numberOfC2DMessages; i++) {
        var uuidData = uuid.v4();
        originalMessages[i] = new Message(uuidData);
        originalMessages[i].messageId = uuidData;
        originalMessages[i].expiryTimeUtc = Date.now() + 60000; // Expire 60s from now, to reduce the chance of us hitting the 50-message limit on the IoT Hub
        originalMessages[i].alreadyReceived = false;  // Yes a bit tacky, but it really shouldn't even make it to the hub, and even if it did it wouldn't matter.
      }
      deviceClient.open(function (openErr) {
        debug('device has opened.');
        if (openErr) {
          testCallback(openErr);
        } else {
          deviceClient.on('disconnect', function () {
            debug('got an unexpected disconnect - this test should never see one!');
            testCallback(new Error('unexpected disconnect'));
          });
          deviceClient.on('message', function (receivedMessage) {
            //
            // It doesn't matter whether this was a message we want, complete it so that the message queue stays clean.
            //
            debug('c2d message received with id: ' + receivedMessage.messageId);
            deviceClient.complete(receivedMessage, function (err, result) {
              if (err) {
                testCallback(err);
              } else {
                assert.equal(result.constructor.name, 'MessageCompleted');
                //
                // Make sure that the message we are looking at is one of the messages that we just sent.
                //
                if (findMessage(receivedMessage, originalMessages)) {
                  if (messagesReceived++ === 0) {
                    var terminateMessage = new Message('');
                    terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
                    terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
                    terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
                    deviceClient.sendEvent(terminateMessage, function (sendErr) {
                      debug('at the callback for the fault injection send, err is:' + sendErr);
                    });
                    sendMessageTimeout = setTimeout(c2dMessageSender.bind(this), 5000);
                  } else {
                    if (messagesReceived === numberOfC2DMessages) {
                      testCallback();
                    } else {
                      sendMessageTimeout = setTimeout(c2dMessageSender.bind(this), 3000);
                    }
                  }
                } else {
                  debug('received an unanticipated message, id: ' + receivedMessage.messageId + ' data: ' + receivedMessage.data.toString());
                }
              }
            });
          });
          debug('about to open the service client');
          serviceClient.open(function (serviceErr) {
            debug('At service client open callback - error is:' + serviceErr);
            if (serviceErr) {
              testCallback(serviceErr);
            } else {
              c2dMessageSender();
            }
          });
        }
      });
    });
  });
});