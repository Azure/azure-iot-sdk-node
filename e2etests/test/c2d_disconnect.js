// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const assert = require('chai').assert;
const debug = require('debug')('e2etests:c2ddisconnect');
const uuid = require('uuid');
const deviceAmqp = require('azure-iot-device-amqp');
const deviceMqtt = require('azure-iot-device-mqtt');


const serviceSdk = require('azure-iothub');
const Message = require('azure-iot-common').Message;
const createDeviceClient = require('./testUtils.js').createDeviceClient;
const closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
const NoRetry = require('azure-iot-common').NoRetry;
const DeviceIdentityHelper = require('./device_identity_helper.js');

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

const numberOfC2DMessages = 3;
let sendMessageTimeout = null;

const doConnectTest = function doConnectTest(doIt) {
  return doIt ? it : it.skip;
};

const protocolAndTermination = [
  {
    testEnabled: true,
    transport: deviceAmqp.Amqp,
    operationType: 'KillTcp',
    closeReason: ' severs the TCP connection ',
    delayInSeconds: 2,
    durationInSeconds: 20
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
    // eslint-disable-next-line no-invalid-this
    this.timeout(60000);

    let serviceClient;
    let deviceClient;

    let provisionedDevice;

    before(function (beforeCallback) {
      debug('creating test device...');
      DeviceIdentityHelper.createDeviceWithSas(function (err, testDeviceInfo) {
        if (err) {
          debug('failed to create test device: ' + err.toString());
          beforeCallback(err);
        } else {
          debug('test device created: ' + testDeviceInfo.deviceId);
          provisionedDevice = testDeviceInfo;
          beforeCallback(err);
        }
      });
    });

    after(function (afterCallback) {
      debug('deleting device: ' + provisionedDevice.deviceId);
      DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, function (err) {
        if (err) {
          debug('failed to delete test device: ' + err.toString());
          afterCallback(err);
        } else {
          debug('test device deleted');
          afterCallback();
        }
      });
    });

    beforeEach(function () {
      serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString);
      deviceClient = createDeviceClient(testConfiguration.transport, provisionedDevice);
      sendMessageTimeout = null;
    });

    afterEach(function (testCallback) {
      if (sendMessageTimeout !== null) clearTimeout(sendMessageTimeout);
      debug('closing device and service clients...');
      closeDeviceServiceClients(deviceClient, serviceClient, function (err) {
        if (err) {
          debug('failed to close clients: ' + err.toString());
          testCallback(err);
        } else {
          debug('device and service clients closed');
          testCallback();
        }
      });
    });

    doConnectTest(testConfiguration.testEnabled)('Service sends a C2D message, device receives it, and' + testConfiguration.closeReason + 'which is noted by the iot hub client', function (testCallback) {
      let receivingSideDone = false;
      const uuidData = uuid.v4();
      const originalMessage = new Message(uuidData);
      deviceClient.setRetryPolicy(new NoRetry());
      const disconnectHandler = function () {
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

      // eslint-disable-next-line security/detect-non-literal-fs-filename
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
                  const terminateMessage = new Message('');
                  terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
                  terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
                  terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
                  terminateMessage.properties.add('AzIoTHub_FaultOperationDurationInSecs', testConfiguration.durationInSeconds);
                  deviceClient.sendEvent(terminateMessage, function (sendErr) {
                    debug('at the callback for the fault injection send, err is:' + sendErr);
                  });
                }
              }
            });

          });
          debug('about to open the service client');
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          serviceClient.open(function (serviceErr) {
            debug('At service client open callback - error is:' + serviceErr);
            if (serviceErr) {
              testCallback(serviceErr);
            } else {
              serviceClient.send(provisionedDevice.deviceId, originalMessage, function (sendErr) {
                debug('At service client send callback - error is: ' + sendErr);
                if (sendErr) {
                  testCallback(sendErr);
                }
              });
            }
          });
        }
      });
    });

    doConnectTest(testConfiguration.testEnabled)('Service sends ' + numberOfC2DMessages + ' C2D messages, device receives first and' + testConfiguration.closeReason + 'which is never seen by the iot hub client', function (testCallback) {
      let originalMessages = {};
      let faultInjected = false;
      for (let i = 0; i < numberOfC2DMessages; i++) {
        const uuidData = uuid.v4();
        originalMessages[uuidData] = {
          message: new Message(uuidData),
          sent: false,
          received: false
        };
        originalMessages[uuidData].message.messageId = uuidData;
        originalMessages[uuidData].message.expiryTimeUtc = Date.now() + 60000;
      }

      const allDone = function () {
        for (const messageId in originalMessages) {
          if (Object.prototype.hasOwnProperty.call(originalMessages, messageId)) {
            debug('message ' + messageId + ': sent: ' + originalMessages[messageId].sent + '; received: ' + originalMessages[messageId].received);
            if (!originalMessages[messageId].sent || !originalMessages[messageId].received) {
              return false;
            }
          }
        }
        debug('allDone: true!');
        return true;
      };

      const sendMessage = function (messageId) {
        serviceClient.send(provisionedDevice.deviceId, originalMessages[messageId].message, function (sendErr) {
          if (sendErr) {
            debug('service client: failed to send message with id: ' + messageId + ': ' + sendErr.toString());
            testCallback(sendErr);
          } else {
            debug('service client: message sent: ' + messageId);
            originalMessages[messageId].sent = true;
            if (allDone()) {
              debug('service client: all messages have been sent and received!');
              testCallback();
            } else {
              debug('service client: still not done!');
            }
          }
        });
      };

      const sendNextMessage = function () {
        for (const messageId in originalMessages) {
          if (originalMessages[messageId].sent) {
            continue;
          } else {
            debug('Sending message with id: ' + messageId);
            return sendMessage(messageId);
          }
        }
        debug('all messages have been sent.');
      };

      debug('connecting device client...');
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      deviceClient.open(function (openErr) {
        if (openErr) {
          debug('error connecting device client: ' + openErr.toString());
          testCallback(openErr);
        } else {
          debug('device client connected');
          deviceClient.on('disconnect', function () {
            debug('got an unexpected disconnect - this test should never see one!');
            testCallback(new Error('unexpected disconnect'));
          });
          deviceClient.on('message', function (receivedMessage) {
            //
            // It doesn't matter whether this was a message we want, complete it so that the message queue stays clean.
            //
            debug('device client: c2d message received with id: ' + receivedMessage.messageId);
            deviceClient.complete(receivedMessage, function (err, result) {
              if (err) {
                debug('error while settling (accept) the message: ' + err.toString());
                testCallback(err);
              } else {
                assert.equal(result.constructor.name, 'MessageCompleted');
                debug('message completed');
                //
                // Make sure that the message we are looking at is one of the messages that we just sent.
                //
                if (originalMessages[receivedMessage.messageId]) {
                  originalMessages[receivedMessage.messageId].received = true;

                  if (!faultInjected) {
                    const terminateMessage = new Message('');
                    terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
                    terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
                    terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
                    debug('device client: Injecting fault: ' + testConfiguration.operationType);
                    faultInjected = true;
                    deviceClient.sendEvent(terminateMessage, function (sendErr) {
                      debug('device client: at the callback for the fault injection send, err is:' + sendErr);
                    });
                  }

                  if (allDone()) {
                    debug('device client: all messages have been received. test successful');
                    testCallback();
                  } else {
                    debug('device client: scheduling next message in 6 seconds');
                    sendMessageTimeout = setTimeout(sendNextMessage, 6000);
                  }
                } else {
                  debug('device client: received an unanticipated message, id: ' + receivedMessage.messageId + ' data: ' + receivedMessage.data.toString());
                }
              }
            });
          });
          debug('service client: connecting...');
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          serviceClient.open(function (serviceErr) {
            if (serviceErr) {
              debug('service client: Failed to connect:' + serviceErr.toString());
              testCallback(serviceErr);
            } else {
              debug('service client: connected');
              debug('service client: sending first message');
              sendNextMessage();
            }
          });
        }
      });
    });
  });
});
