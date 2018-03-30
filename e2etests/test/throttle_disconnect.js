// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var debug = require('debug')('e2etests:throttledisconnect');
var uuid = require('uuid');
var assert = require('chai').assert;

var deviceAmqp = require('azure-iot-device-amqp');
var Message = require('azure-iot-common').Message;
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceEventHubClients = require('./testUtils.js').closeDeviceEventHubClients;
var eventHubClient = require('azure-event-hubs').Client;
var errors = require('azure-iot-common').errors;
var NoRetry = require('azure-iot-common').NoRetry;
var DeviceIdentityHelper = require('./device_identity_helper.js');

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
    operationType: 'InvokeThrottling',
    closeReason: ' throttle connection ',
    durationInSeconds: 5,
    delayInSeconds: 0,
    expectedError: errors.ThrottlingError
  },
  {
    testEnabled: true,
    transport: deviceAmqp.Amqp,
    operationType: 'InvokeMaxMessageQuota',
    closeReason: ' exceed quota ',
    durationInSeconds: 5,
    delayInSeconds: 0,
    expectedError: errors.IotHubQuotaExceededError
  },
  {
    testEnabled: true,
    transport: deviceAmqp.Amqp,
    operationType: 'InvokeAuthError',
    closeReason: ' authentication failure ',
    durationInSeconds: 5,
    delayInSeconds: 0,
    expectedError: errors.UnauthorizedError
  },
];


protocolAndTermination.forEach( function (testConfiguration) {
  describe(testConfiguration.transport.name + ' using device/eventhub clients - disconnect d2c', function () {
    this.timeout(60000);
    var deviceClient, ehClient, senderInterval, ehReceivers, provisionedDevice;

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

    afterEach(function (testCallback) {
      closeDeviceEventHubClients(deviceClient, ehClient, ehReceivers, testCallback);
      if (sendMessageTimeout !== null) clearTimeout(sendMessageTimeout);
    });

    doConnectTest(testConfiguration.testEnabled)('device sends ' + numberOfD2CMessages + ' messages, first causes' + testConfiguration.closeReason + 'which causes next '+ (numberOfD2CMessages - 2) + ' to fail, final passes after ' + testConfiguration.durationInSeconds + ' seconds duration.', function (testCallback) {
      this.timeout(80000);
      deviceClient.setRetryPolicy(new NoRetry());

      var onDisconnected = function(err) {
        debug('unexpected disconnection of the device client');
        testCallback(err);
      };

      var onError = function(err) {
        debug('unexpected error of the device client');
        testCallback(err);
      };

      deviceClient.on('disconnect', onDisconnected);
      deviceClient.on('error', onError);

      var injectFault = function(callback) {
        var terminateMessage = new Message('');
        terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
        terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
        terminateMessage.properties.add('AzIoTHub_FaultOperationDurationInSecs', testConfiguration.durationInSeconds);
        terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
        deviceClient.sendEvent(terminateMessage, function (sendErr) {
          if (sendErr) {
            debug('error during fault injection: ' + sendErr);
          } else {
            debug('fault injection successful');
          }
          callback(sendErr);
        });
      };

      var sendAndShouldSucceed = function(when, callback) {
        deviceClient.sendEvent(new Message(''), function (err) {
          if (err) {
            debug('error sending a message that should\'ve succeeded (' + when + '): ' + err.toString());
            testCallback(err);
          } else {
            debug('sendEvent success: ' + when);
            callback();
          }
        });
      };

      var sendAndShouldFail = function(when, callback) {
        deviceClient.sendEvent(new Message(''), function (err) {
          assert.instanceOf(err, testConfiguration.expectedError);
          debug('got the right error: ' + testConfiguration.expectedError.name);
          callback();
        });
      };

      sendAndShouldSucceed('before fault injection', function() {
        injectFault(function() {
          sendAndShouldFail('after fault injection', function() {
            setTimeout(function() {
              sendAndShouldSucceed('fault injection is over', function() {
                testCallback();
              });
            }, testConfiguration.durationInSeconds * 1500);
          });
        });
      });
    });

    doConnectTest(false)('device sends ' + numberOfD2CMessages + ' messages, first causes' + testConfiguration.closeReason + 'which is not seen by the iot hub device client', function (testCallback) {
      this.timeout(80000);
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
                    ehReceivers.push(receiver);
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
                              terminateMessage.properties.add('AzIoTHub_FaultOperationDurationInSecs', testConfiguration.durationInSeconds);
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