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
    var deviceClient, ehClient, provisionedDevice;

    before(function (beforeCallback) {
      DeviceIdentityHelper.createDeviceWithSas(function (err, testDeviceInfo) {
        provisionedDevice = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, afterCallback);
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
        debug('Device client disconnected');
        deviceClient.removeListener('disconnect', disconnectHandler);
        if (messageReceived) {
          rdv.imDone('deviceClient');
        } else {
          testCallback(new Error('device client disconnected but the original message was not received.'));
        }
      };
      var onEventHubError = function(err) {
        debug('Event Hubs client error: ' + err.toString());
        testCallback(err);
      };
      var onEventHubMessage = function (eventData) {
        if (eventData.annotations['iothub-connection-device-id'] === provisionedDevice.deviceId) {
          debug('received a message from the test device');
          var received_message_uuid = eventData.properties && eventData.properties.message_id && uuidBuffer.toString(eventData.properties.message_id);
          if (received_message_uuid && received_message_uuid === originalMessage.messageId) {
            rdv.imDone('ehClient');
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
      };

      eventHubClient.createFromIotHubConnectionString(hubConnectionString)
      .then(function (client) {
        ehClient = client;
        rdv.imIn('ehClient');
        deviceClient = createDeviceClient(testConfiguration.transport, provisionedDevice);
        deviceClient.setRetryPolicy(new NoRetry());
      }).then(function () {
        return ehClient.getPartitionIds();
      }).then(function (partitionIds) {
        partitionIds.forEach(function (partitionId) {
          ehClient.receive(partitionId, onEventHubMessage, onEventHubError, { eventPosition: EventPosition.fromEnqueuedTime(testStart) });
        });
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve();
          }, 3000);
        });
      }).then(function () {
        deviceClient.open(function (openErr) {
          if (openErr) {
            testCallback(openErr);
          } else {
            rdv.imIn('deviceClient');
            deviceClient.on('disconnect', disconnectHandler);
            deviceClient.sendEvent(originalMessage, function (sendErr) {
              if (sendErr) {
                debug('error sending the initial message: ' + err.toString());
                testCallback(sendErr);
              } else {
                debug('initial message sent');
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
        deviceClient.sendEvent(originalMessages[messageId].message, function (sendErr) {
          if (sendErr) {
            debug('failed to send message with id: ' + messageId + ': ' + sendErr.toString());
            testCallback(sendErr);
          } else {
            debug('message sent: ' + messageId);
            originalMessages[messageId].sent = true;
            if (allMessagesSent()) {
              debug('all messages have been sent!');
              rdv.imDone('deviceClient');
            } else {
              debug('device client still has messages to send!');
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

      var onEventHubError = function(err) {
        debug('EventHubClient error: ' + err.toString());
        testCallback(err);
      };

      var onEventHubMessage = function (eventData) {
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
                debug('fault injection message sent');
                if (sendErr) {
                  debug('error at fault injection:' + sendErr);
                }
              });
            }

            if (allMessagesReceived()) {
              rdv.imDone('ehClient');
            } else {
              sendMessageTimeout = setTimeout(sendNextMessage, 3000);
            }
          } else {
            debug('eventData message id doesn\'t match any stored message id');
          }
        } else {
          debug('Incoming device id is: ' + eventData.annotations['iothub-connection-device-id']);
        }
      };

      eventHubClient.createFromIotHubConnectionString(hubConnectionString)
      .then(function (client) {
        ehClient = client;
        rdv.imIn('ehClient');
        deviceClient = createDeviceClient(testConfiguration.transport, provisionedDevice);
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
        deviceClient.open(function (openErr) {
          if (openErr) {
            debug('error connecting the device client');
            testCallback(openErr);
          } else {
            rdv.imIn('deviceClient');
            deviceClient.on('disconnect', function () {
              debug('Device client disconnect event should not fire during this test');
              testCallback(new Error('unexpected disconnect'));
            });
            sendNextMessage();
          }
        });
      })
      .catch(function (err) {
        debug('caught event hub error: ' + err.toString());
        testCallback(err);
      });
    });
  });
});