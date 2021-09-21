// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var debug = require('debug')('e2etests:d2cdisconnect');
var uuid = require('uuid');
var uuidBuffer = require('uuid-buffer');
var deviceAmqp = require('azure-iot-device-amqp');
var deviceMqtt = require('azure-iot-device-mqtt');
var Message = require('azure-iot-common').Message;
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceEventHubClients = require('./testUtils.js').closeDeviceEventHubClients;
var eventHubClient = require('@azure/event-hubs').EventHubClient;
var EventPosition = require('@azure/event-hubs').EventPosition;
var NoRetry = require('azure-iot-common').NoRetry;
var DeviceIdentityHelper = require('./device_identity_helper.js');
var Rendezvous = require('./rendezvous_helper.js').Rendezvous;

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

var doConnectTest = function doConnectTest(doIt) {
  return doIt ? it : it.skip;
};

var numberOfD2CMessages = 3;
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
    var deviceClient, ehClient, deviceInfo;

    before(function (beforeCallback) {
      DeviceIdentityHelper.createDeviceWithSas(function (err, testDeviceInfo) {
        deviceInfo = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      DeviceIdentityHelper.deleteDevice(deviceInfo.deviceId, afterCallback);
    });

    afterEach(function (afterEachCallback) {
      if (sendMessageTimeout !== null) clearTimeout(sendMessageTimeout);
      debug('closing device and event hubs clients...');
      closeDeviceEventHubClients(deviceClient, ehClient, function (err) {
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
      var rdv = new Rendezvous(testCallback);
      var testStart = Date.now() - 5000;
      var uuidData = uuid.v4();
      var originalMessage = new Message(uuidData);
      var messageReceived = false;
      originalMessage.messageId = uuidData;

      var disconnectHandler = function () {
        debug('device client: disconnected');
        deviceClient.removeListener('disconnect', disconnectHandler);
        if (messageReceived) {
          rdv.imDone('deviceClient');
        } else {
          testCallback(new Error('device client: disconnected but the original message was not received.'));
        }
      };
      var onEventHubError = function(err) {
        debug('eventhubs client: error: ' + err.toString());
        testCallback(err);
      };
      var onEventHubMessage = function (eventData) {
        if (eventData.annotations['iothub-connection-device-id'] === deviceInfo.deviceId) {
          debug('eventhubs client: received a message from the test device: ' + deviceInfo.deviceId);
          var received_message_uuid = eventData.properties && eventData.properties.message_id && uuidBuffer.toString(eventData.properties.message_id);
          if (received_message_uuid && received_message_uuid === originalMessage.messageId) {
            rdv.imDone('ehClient');
            debug('eventhubs client: received the sent message');
            debug('device client: send the fault packet');
            messageReceived = true;
            var terminateMessage = new Message('');
            terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
            terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
            terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
            deviceClient.sendEvent(terminateMessage, function (sendErr) {
              debug('device client: at the callback for the fault injection send, err is:' + sendErr);
            });
          } else {
            debug('eventhubs client: eventData doesn\'t match: ' + originalMessage.messageId);
          }
        } else {
          debug('eventhubs client: ignoring message from: ' + eventData.annotations['iothub-connection-device-id']);
        }
      };

      eventHubClient.createFromIotHubConnectionString(hubConnectionString)
      .then(function (client) {
        ehClient = client;
        rdv.imIn('ehClient');
        deviceClient = createDeviceClient(testConfiguration.transport, deviceInfo);
        deviceClient.setRetryPolicy(new NoRetry());
      }).then(function () {
        debug('eventhubs client: connected. getting partition ids');
        return ehClient.getPartitionIds();
      }).then(function (partitionIds) {
        debug('eventhubs client: got partition ids. setting up receivers');
        partitionIds.forEach(function (partitionId) {
          ehClient.receive(partitionId, onEventHubMessage, onEventHubError, { eventPosition: EventPosition.fromEnqueuedTime(testStart) });
        });
        debug('eventhubs client: receivers started: waiting 3 seconds before starting device client');
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve();
          }, 3000);
        });
      }).then(function () {
        debug('device client: connecting...');
        deviceClient.open(function (openErr) {
          if (openErr) {
            debug('device client: error connecting: ' + openErr.toString());
            testCallback(openErr);
          } else {
            rdv.imIn('deviceClient');
            debug('device client: connected');
            deviceClient.on('disconnect', disconnectHandler);
            debug('device client: sending: ' + originalMessage.messageId);
            deviceClient.sendEvent(originalMessage, function (sendErr) {
              if (sendErr) {
                debug('device client: error sending the initial message: ' + sendErr.toString());
                testCallback(sendErr);
              } else {
                debug('device client: initial message sent');
              }
            });
          }
        });
      })
      .catch(testCallback);
    });

    doConnectTest(testConfiguration.testEnabled)('device sends ' + numberOfD2CMessages + ' messages, when event hub client receives first, it ' + testConfiguration.closeReason + 'which is not seen by the iot hub device client', function (testCallback) {
      var rdv = new Rendezvous(testCallback);
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

      var allMessagesSent = function () {
        for (var messageId in originalMessages) {
          if (originalMessages.hasOwnProperty(messageId)) {
            debug('message ' + messageId + ': sent: ' + originalMessages[messageId].sent + '; received: ' + originalMessages[messageId].received);
            if (!originalMessages[messageId].sent) {
              return false;
            }
          }
        }
        debug('allMessagesSent: true!');
        return true;
      };

      var allMessagesReceived = function () {
        for (var messageId in originalMessages) {
          if (originalMessages.hasOwnProperty(messageId)) {
            debug('message ' + messageId + ': sent: ' + originalMessages[messageId].sent + '; received: ' + originalMessages[messageId].received);
            if (!originalMessages[messageId].received) {
              return false;
            }
          }
        }
        debug('allMessagesReceived: true!');
        return true;
      };

      var sendMessage = function (messageId) {
        debug('device client: sending ' + messageId);
        deviceClient.sendEvent(originalMessages[messageId].message, function (sendErr) {
          if (sendErr) {
            debug('device client: failed to send message with id: ' + messageId + ': ' + sendErr.toString());
            testCallback(sendErr);
          } else {
            debug('device client: message sent: ' + messageId);
            originalMessages[messageId].sent = true;
            if (allMessagesSent()) {
              debug('device client: all messages have been sent!');
              rdv.imDone('deviceClient');
            } else {
              debug('device client: still has messages to send!');
            }
          }
        });
      };

      var sendNextMessage = function() {
        for (var messageId in originalMessages) {
          if (originalMessages[messageId].sent) {
            continue;
          } else {
            debug('device client: found an unsent message: ' + messageId);
            return sendMessage(messageId);
          }
        }
        debug('device client: all messages seem to have been sent');
      };

      var startAfterTime = Date.now() - 5000;
      debug('starting to listen to messages received since: ' + new Date(startAfterTime).toISOString());

      var onEventHubError = function(err) {
        debug('eventhubs client: error: ' + err.toString());
        testCallback(err);
      };

      var onEventHubMessage = function (eventData) {
        if (eventData.annotations['iothub-connection-device-id'] === deviceInfo.deviceId) {
          debug('eventhubs client: received a message from the test device: ' + deviceInfo.deviceId);
          var receivedMessageId = eventData.body.toString();
          if (originalMessages[receivedMessageId]) {
            debug('eventhubs client: It was one of the messages we sent: ' + receivedMessageId);
            originalMessages[receivedMessageId].received = true;
            if (!faultInjected) {
              debug('eventhubs client: Fault has not been injected yet.');
              debug('device client: injecting fault now...');
              var terminateMessage = new Message('');
              terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
              terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
              terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
              faultInjected = true;
              deviceClient.sendEvent(terminateMessage, function (sendErr) {
                debug('device client: fault injection message sent');
                if (sendErr) {
                  debug('device client: error at fault injection:' + sendErr);
                }
              });
            }

            if (allMessagesReceived()) {
              rdv.imDone('ehClient');
            } else {
              sendMessageTimeout = setTimeout(sendNextMessage, 6000);
            }
          } else {
            debug('eventhubs client: eventData doesn\'t match: ' + eventData.body.toString());
          }
        } else {
          debug('eventhubs client: ignoring message from: ' + eventData.annotations['iothub-connection-device-id']);
        }
      };

      eventHubClient.createFromIotHubConnectionString(hubConnectionString)
      .then(function (client) {
        ehClient = client;
        rdv.imIn('ehClient');
        deviceClient = createDeviceClient(testConfiguration.transport, deviceInfo);
      }).then(function () {
        debug('eventhubs client: connected. getting partition ids');
        return ehClient.getPartitionIds();
      }).then(function (partitionIds) {
        debug('eventhubs client: got partition ids. setting up receivers');
        partitionIds.forEach(function (partitionId) {
          ehClient.receive(partitionId, onEventHubMessage, onEventHubError, { eventPosition: EventPosition.fromEnqueuedTime(startAfterTime) });
        });
        debug('eventhubs client: receivers started: waiting 3 seconds before starting device client');
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve();
          }, 3000);
        });
      }).then(function () {
        debug('device client: connecting...');
        deviceClient.open(function (openErr) {
          if (openErr) {
            debug('device client: error: ' + openErr.toString());
            testCallback(openErr);
          } else {
            rdv.imIn('deviceClient');
            deviceClient.on('disconnect', function () {
              debug('device client: disconnect event fired. that\'s a test failure.');
              testCallback(new Error('unexpected disconnect'));
            });
            sendNextMessage();
          }
        });
      })
      .catch(function (err) {
        debug('eventhubs client: error: ' + err.toString());
        testCallback(err);
      });
    });
  });
});
