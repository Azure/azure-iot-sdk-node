// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var debug = require('debug')('e2etests:d2ctcpdisconnect');
var uuid = require('uuid');

var deviceAmqp = require('azure-iot-device-amqp');
var deviceMqtt = require('azure-iot-device-mqtt');
var Message = require('azure-iot-common').Message;
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceEventHubClients = require('./testUtils.js').closeDeviceEventHubClients;
var eventHubClient = require('azure-event-hubs').Client;

var doConnectTest = function doConnectTest(doIt) {
  return doIt ? it : it.skip;
};

var numberOfD2CMessages = 5;
var sendMessageTimeout = null;

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
    testEnabled: true,
    transport: deviceMqtt.Mqtt,
    operationType: 'KillTcp',
    closeReason: ' severs the TCP connection ',
    delayInSeconds: 2
  },
  {
    testEnabled: true,
    transport: deviceMqtt.MqttWs,
    operationType: 'KillTcp',
    closeReason: ' severs the TCP connection ',
    delayInSeconds: 2
  },
  { //
    testEnabled: true,
    transport: deviceAmqp.Amqp,
    operationType: 'KillAmqpConnection',
    closeReason: ' severs the AMQP connection ',
    delayInSeconds: 2
  },
  { // !!!!!!!!!!!!!!!!!!!  FAILS - SDK Client simply hangs on the response.
    testEnabled: false,
    transport: deviceAmqp.Amqp,
    operationType: 'KillAmqpSession',
    closeReason: ' severs the AMQP session ',
    delayInSeconds: 1
  },
  { // !!!!!!!!!!!!!!!!! FAILS - SDK Client simply hangs on the response.
    testEnabled: false,
    transport: deviceAmqp.Amqp,
    operationType: 'KillAmqpCBSLinkReq',
    closeReason: ' severs AMQP CBS request link ',
    delayInSeconds: 2
  },
  { // !!!!!!!!!!!!!!!!! FAILS - SDK Client simply hangs on the response.
    testEnabled: false,
    transport: deviceAmqp.Amqp,
    operationType: 'KillAmqpCBSLinkResp',
    closeReason: ' severs AMQP CBS response link ',
    delayInSeconds: 2
  },
  { //----------------- FAILS - ERRORS ARE EMITTED THAT HAVE NO HANDLER.
    testEnabled: false,
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
    testEnabled: true,
    transport: deviceMqtt.Mqtt,
    operationType: 'ShutDownMqtt',
    closeReason: ' cleanly shutdowns MQTT connection ',
    delayInSeconds: 2
  },
];


var runTests = function (hubConnectionString, provisionedDevice) {
  protocolAndTermination.forEach( function (testConfiguration) {
    describe('Device utilizing ' + provisionedDevice.authenticationDescription + ' authentication, connected over ' + testConfiguration.transport.name + ' using device/eventhub clients - disconnect d2c', function () {

      var deviceClient, ehClient, senderInterval;

      beforeEach(function () {
        this.timeout(20000);
        ehClient = eventHubClient.fromConnectionString(hubConnectionString);
        deviceClient = createDeviceClient(testConfiguration.transport, provisionedDevice);
        senderInterval = null;
      });

      afterEach(function (testCallback) {
        this.timeout(20000);
        closeDeviceEventHubClients(deviceClient, ehClient, testCallback);
        if (sendMessageTimeout !== null) clearTimeout(sendMessageTimeout);
      });

      doConnectTest(testConfiguration.testEnabled)('Device sends a message, event hub client receives it, and' + testConfiguration.closeReason + 'which is noted by the iot hub device client', function (testCallback) {
        this.timeout(20000);
        var uuidData = uuid.v4();
        var originalMessage = new Message(uuidData);
        var messageReceived = false;
        originalMessage.messageId = uuidData;
        ehClient.open()
                .then(ehClient.getPartitionIds.bind(ehClient))
                .then(function (partitionIds) {
                  return partitionIds.map(function (partitionId) {
                    return ehClient.createReceiver('$Default', partitionId, { 'startAfterTime' : Date.now() }).then(function (receiver) {
                      receiver.on('errorReceived', function(err) {
                        testCallback(err);
                      });
                      receiver.on('message', function (eventData) {
                          if (eventData.annotations['iothub-connection-device-id'] === provisionedDevice.deviceId) {
                            if ((eventData.properties) && (eventData.properties.messageId) && (eventData.properties.messageId === originalMessage.messageId)) {
                              debug('received the sent message - send the fault packet');
                              messageReceived = true;
                              var terminateMessage = new Message('');
                              terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
                              terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
                              terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
                              deviceClient.sendEvent(terminateMessage, function (sendErr) {
                                debug('at the callback for the fault injection send, err is:' + sendErr);
                              });
                            } else {
                              debug('eventData doesn\'t match: ' + originalMessage.messageId);
                            }
                          } else {
                            debug('Incoming device id is: ' + eventData.annotations['iothub-connection-device-id']);
                          }
                        });
                    });
                  });
                })
                .then(function () {
                  deviceClient.open(function (openErr) {
                    if (openErr) {
                      testCallback(openErr);
                    } else {
                      deviceClient.on('disconnect', function () {
                        if (messageReceived) {
                          debug('received the disconnect after sending the termination');
                          testCallback();
                        } else {
                          testCallback(new Error('unexpected disconnect'));
                        }
                      });
                      deviceClient.sendEvent(originalMessage, function (sendErr) {
                        if (sendErr) {
                          testCallback(sendErr);
                        }
                      });
                    }
                  });
                })
                .catch(testCallback);
            });

      doConnectTest(false)('Device client sends ' + numberOfD2CMessages + ' messages, when event hub client receives first, it ' + testConfiguration.closeReason + 'which is not seen by the iot hub device client', function (testCallback) {
        this.timeout(20000);
        var originalMessages = [];
        var messagesReceived = 0;
        var messagesSent = 0;
        var d2cMessageSender = function() {
          debug('Sending message number: ' + (messagesSent + 1));
          if (messagesSent >= numberOfD2CMessages) {
            testCallback(new Error('tried to send to many messages'));
          } else {
            deviceClient.sendEvent(originalMessages[messagesSent++], function (sendErr) {
              debug('At device client send callback - error is: ' + sendErr);
              if (sendErr) {
                testCallback(sendErr);
              }
            });
          }
        };
        var findMessage = function(incomingMessage, storedMessages) {
          if (incomingMessage.properties && incomingMessage.properties.messageId) {
            for (var j = 0; j < storedMessages.length; j++) {
              if (incomingMessage.properties.messageId === storedMessages[j].messageId) {
                if (!storedMessages[j].alreadyReceived) {
                  storedMessages.alreadyReceived =  true;
                  return true;
                } else {
                  testCallback(new Error('received a message more than once'));
                }
              }
            }
          }
          return false;
        };
        for (var i = 0; i < numberOfD2CMessages; i++) {
          var uuidData = uuid.v4();
          originalMessages[i] = new Message(uuidData);
          originalMessages[i].messageId = uuidData;
          originalMessages[i].alreadyReceived = false;
        }
        ehClient.open()
                .then(ehClient.getPartitionIds.bind(ehClient))
                .then(function (partitionIds) {
                  return partitionIds.map(function (partitionId) {
                    return ehClient.createReceiver('$Default', partitionId, { 'startAfterTime' : Date.now() }).then(function (receiver) {
                      receiver.on('errorReceived', function(err) {
                        testCallback(err);
                      });
                      receiver.on('message', function (eventData) {
                          if (eventData.annotations['iothub-connection-device-id'] === provisionedDevice.deviceId) {
                            debug('did get a message for this device.');
                            if (findMessage(eventData, originalMessages)) {
                              debug('It was one of the messages we sent.');
                              if (messagesReceived++ === 0) {
                                debug('It was the first message.');
                                var terminateMessage = new Message('');
                                terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
                                terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
                                terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
                                deviceClient.sendEvent(terminateMessage, function (sendErr) {
                                  debug('at the callback for the fault injection send, err is:' + sendErr);
                                });
                              }
                              if (messagesReceived === numberOfD2CMessages) {
                                testCallback();
                              } else {
                                sendMessageTimeout = setTimeout(d2cMessageSender.bind(this), 1000);
                              }
                            } else {
                              debug('eventData message id doesn\'t match any stored message id');
                            }
                          } else {
                            debug('Incoming device id is: ' + eventData.annotations['iothub-connection-device-id']);
                          }
                        });
                    });
                  });
                })
                .then(function () {
                  deviceClient.open(function (openErr) {
                    if (openErr) {
                      testCallback(openErr);
                    } else {
                      deviceClient.on('disconnect', function () {
                        testCallback(new Error('unexpected disconnect'));
                      });
                      d2cMessageSender();
                    }
                  });
                })
                .catch(testCallback);
            });
    });
  });
};

module.exports = runTests;