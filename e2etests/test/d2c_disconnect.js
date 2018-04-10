// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var debug = require('debug')('e2etests:d2cdisconnect');
var uuid = require('uuid');

var deviceAmqp = require('azure-iot-device-amqp');
var deviceMqtt = require('azure-iot-device-mqtt');
var Message = require('azure-iot-common').Message;
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceEventHubClients = require('./testUtils.js').closeDeviceEventHubClients;
var eventHubClient = require('azure-event-hubs').Client;
var NoRetry = require('azure-iot-common').NoRetry;
var DeviceIdentityHelper = require('./device_identity_helper.js');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

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
    operationType: 'KillAmqpD2CLink',
    closeReason: ' severs AMQP D2C link ',
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
  describe(testConfiguration.transport.name + ' using device/eventhub clients - disconnect d2c', function () {
    this.timeout(60000);
    var deviceClient, ehClient, senderInterval, provisionedDevice, ehReceivers;

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
      ehClient = eventHubClient.fromConnectionString(hubConnectionString);
      deviceClient = createDeviceClient(testConfiguration.transport, provisionedDevice);
      senderInterval = null;
      ehReceivers = [];
    });

    afterEach(function (afterEachCallback) {
      if (sendMessageTimeout !== null) clearTimeout(sendMessageTimeout);
      debug('closing device and event hubs clients...');
      closeDeviceEventHubClients(deviceClient, ehClient, ehReceivers, function (err) {
        if (err) {
          debug('error closing clients: ' + err.toString());
          afterEachCallback(err);
        } else {
          debug('device and event hubs client closed.');
          afterEachCallback();
        }
      });
    });

    doConnectTest(testConfiguration.testEnabled)('device sends a message, event hub client receives it, and' + testConfiguration.closeReason + 'which is noted by the iot hub device client', function (testCallback) {
      var uuidData = uuid.v4();
      var originalMessage = new Message(uuidData);
      var messageReceived = false;
      originalMessage.messageId = uuidData;
      deviceClient.setRetryPolicy(new NoRetry());
      var disconnectHandler = function () {
        debug('We did get a disconnect message');
        deviceClient.removeListener('disconnect', disconnectHandler);
        if (messageReceived) {
          testCallback();
        } else {
          testCallback(new Error('unexpected disconnect'));
        }
      };
      ehClient.open()
              .then(ehClient.getPartitionIds.bind(ehClient))
              .then(function (partitionIds) {
                return partitionIds.map(function (partitionId) {
                  return ehClient.createReceiver('$Default', partitionId, { 'startAfterTime' : Date.now() }).then(function (receiver) {
                    ehReceivers.push(receiver);
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
                    deviceClient.on('disconnect', disconnectHandler);
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

    doConnectTest(testConfiguration.testEnabled)('device sends ' + numberOfD2CMessages + ' messages, when event hub client receives first, it ' + testConfiguration.closeReason + 'which is not seen by the iot hub device client', function (testCallback) {
      var originalMessages = {};
      var faultInjected = false;
      for (var i = 0; i < numberOfD2CMessages; i++) {
        var uuidData = uuid.v4();
        originalMessages[uuidData] = {
          message: new Message(uuidData),
          sent: false,
          received: false
        };
      }

      var allDone = function () {
        for (var messageId in originalMessages) {
          if (originalMessages.hasOwnProperty(messageId)) {
            debug('message ' + messageId + ': sent: ' + originalMessages[messageId].sent + '; received: ' + originalMessages[messageId].received);
            if (!originalMessages[messageId].sent || !originalMessages[messageId].received) {
              return false;
            }
          }
        }
        debug('allDone: true!');
        return true;
      };

      var sendMessage = function (messageId) {
        deviceClient.sendEvent(originalMessages[messageId].message, function (sendErr) {
          if (sendErr) {
            debug('failed to send message with id: ' + messageId + ': ' + sendErr.toString());
            testCallback(sendErr);
          } else {
            debug('message sent: ' + messageId);
            originalMessages[messageId].sent = true;
            if (allDone()) {
              debug('all messages have been sent and received!');
              testCallback();
            } else {
              debug('still not done!');
            }
          }
        });
      };

      var sendNextMessage = function() {
        for (var messageId in originalMessages) {
          if (originalMessages[messageId].sent) {
            continue;
          } else {
            debug('Sending message with id: ' + messageId);
            return sendMessage(messageId);
          }
        }
        debug('all messages have been sent.');
      };

      var startAfterTime = Date.now() - 5000;
      debug('starting to listen to messages received since: ' + new Date(startAfterTime).toISOString());

      ehClient.open()
              .then(ehClient.getPartitionIds.bind(ehClient))
              .then(function (partitionIds) {
                return partitionIds.map(function (partitionId) {
                  return ehClient.createReceiver('$Default', partitionId, { 'startAfterTime' : startAfterTime }).then(function (receiver) {
                    ehReceivers.push(receiver);
                    receiver.on('errorReceived', function(err) {
                      testCallback(err);
                    });
                    receiver.on('message', function (eventData) {
                        if (eventData.annotations['iothub-connection-device-id'] === provisionedDevice.deviceId) {
                          debug('did get a message for this device.');
                          var receivedMessageId = eventData.body.toString();
                          if (originalMessages[receivedMessageId]) {
                            debug('It was one of the messages we sent: ' + receivedMessageId);
                            originalMessages[receivedMessageId].received = true;
                            if (!faultInjected) {
                              debug('Fault has not been injected yet. Failing now...');
                              var terminateMessage = new Message('');
                              terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
                              terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
                              terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
                              faultInjected = true;
                              deviceClient.sendEvent(terminateMessage, function (sendErr) {
                                debug('at the callback for the fault injection send, err is:' + sendErr);
                              });
                            }

                            if (allDone()) {
                              testCallback();
                            } else {
                              sendMessageTimeout = setTimeout(sendNextMessage, 3000);
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
                    sendNextMessage();
                  }
                });
              })
              .catch(testCallback);
          });
  });
});