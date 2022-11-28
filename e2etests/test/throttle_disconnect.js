// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let debug = require('debug')('e2etests:throttledisconnect');
let uuid = require('uuid');
let assert = require('chai').assert;

let deviceAmqp = require('azure-iot-device-amqp');
let Message = require('azure-iot-common').Message;
let createDeviceClient = require('./testUtils.js').createDeviceClient;
let closeDeviceEventHubClients = require('./testUtils.js').closeDeviceEventHubClients;
let EventHubClient = require('@azure/event-hubs').EventHubClient;
let EventPosition = require('@azure/event-hubs').EventPosition;
let errors = require('azure-iot-common').errors;
let NoRetry = require('azure-iot-common').NoRetry;
let DeviceIdentityHelper = require('./device_identity_helper.js');

let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

let doConnectTest = function doConnectTest(doIt) {
  return doIt ? it : it.skip;
};

let numberOfD2CMessages = 3;
let sendMessageTimeout = null;

let protocolAndTermination = [
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
  describe(testConfiguration.transport.name + ' using device/eventhub clients - throttling', function () {
    // eslint-disable-next-line no-invalid-this
    this.timeout(60000);
    let deviceClient;
    let ehClient;
    let provisionedDevice;

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
      deviceClient = createDeviceClient(testConfiguration.transport, provisionedDevice);
    });

    afterEach(function (testCallback) {
      closeDeviceEventHubClients(deviceClient, ehClient, testCallback);
      if (sendMessageTimeout !== null) clearTimeout(sendMessageTimeout);
    });

    doConnectTest(testConfiguration.testEnabled)('device sends ' + numberOfD2CMessages + ' messages, first causes' + testConfiguration.closeReason + 'which causes next '+ (numberOfD2CMessages - 2) + ' to fail, final passes after ' + testConfiguration.durationInSeconds + ' seconds duration.', function (testCallback) {
      // eslint-disable-next-line no-invalid-this
      this.timeout(80000);
      deviceClient.setRetryPolicy(new NoRetry());

      let onDisconnected = function (err) {
        debug('unexpected disconnection of the device client');
        testCallback(err);
      };

      let onError = function (err) {
        debug('unexpected error of the device client');
        testCallback(err);
      };

      deviceClient.on('disconnect', onDisconnected);
      deviceClient.on('error', onError);

      let injectFault = function (callback) {
        let terminateMessage = new Message('');
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

      let sendAndShouldSucceed = function (when, callback) {
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

      let sendAndShouldFail = function (when, callback) {
        deviceClient.sendEvent(new Message(''), function (err) {
          assert.instanceOf(err, testConfiguration.expectedError);
          debug('got the right error: ' + testConfiguration.expectedError.name);
          callback();
        });
      };

      sendAndShouldSucceed('before fault injection', function () {
        injectFault(function () {
          sendAndShouldFail('after fault injection', function () {
            setTimeout(function () {
              sendAndShouldSucceed('fault injection is over', function () {
                testCallback();
              });
            }, testConfiguration.durationInSeconds * 1500);
          });
        });
      });
    });

    doConnectTest(false)('device sends ' + numberOfD2CMessages + ' messages, first causes' + testConfiguration.closeReason + 'which is not seen by the iot hub device client', function (testCallback) {
      // eslint-disable-next-line no-invalid-this
      this.timeout(80000);
      let originalMessages = [];
      let messagesReceived = 0;
      let messagesSent = 0;

      let d2cMessageSender = function () {
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
      let findMessage = function (incomingMessage, storedMessages) {
        if (incomingMessage.properties && incomingMessage.properties.messageId) {
          for (let j = 0; j < storedMessages.length; j++) {
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
      for (let i = 0; i < numberOfD2CMessages; i++) {
        let uuidData = uuid.v4();
        originalMessages[i] = new Message(uuidData);
        originalMessages[i].messageId = uuidData;
        originalMessages[i].alreadyReceived = false;
      }

      let onEventHubMessage = function (eventData) {
        if (eventData.annotations['iothub-connection-device-id'] === provisionedDevice.deviceId) {
          debug('did get a message for this device.');
          if (findMessage(eventData, originalMessages)) {
            debug('It was one of the messages we sent.');
            if (messagesReceived++ === 0) {
              debug('It was the first message.');
              let terminateMessage = new Message('');
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
              // eslint-disable-next-line no-invalid-this
              sendMessageTimeout = setTimeout(d2cMessageSender.bind(this), 1000);
            }
          } else {
            debug('eventData message id doesn\'t match any stored message id');
          }
        } else {
          debug('Incoming device id is: ' + eventData.annotations['iothub-connection-device-id']);
        }
      };

      let onEventHubError = function (err) {
        testCallback(err);
      };

      debug('opening event hubs client');
      let startAfterTime = new Date(Date.now() - 30000);
      EventHubClient.createFromIotHubConnectionString(hubConnectionString)
      .then(function (client) {
        ehClient = client;
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
            testCallback(openErr);
          } else {
            deviceClient.on('disconnect', function () {
              testCallback(new Error('unexpected disconnect'));
            });
            d2cMessageSender();
          }
        });
      }).catch(function (err) {
        debug('Event Hub client error: ' + err.toString());
        testCallback(err);
      });
    });
  });
});
