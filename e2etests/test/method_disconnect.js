// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var debug = require('debug')('e2etests:methoddisconnect');
var uuid = require('uuid');
var assert = require('chai').assert;

var deviceAmqp = require('azure-iot-device-amqp');
var deviceMqtt = require('azure-iot-device-mqtt');
var Message = require('azure-iot-common').Message;
var NoRetry = require('azure-iot-common').NoRetry;

var serviceSdk = require('azure-iothub');
var Message = require('azure-iot-common').Message;
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
var DeviceIdentityHelper = require('./device_identity_helper.js');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

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
    operationType: 'KillAmqpMethodReqLink',
    closeReason: ' severs AMQP method request link ',
    delayInSeconds: 2
  },
  {
    testEnabled: true,
    transport: deviceAmqp.Amqp,
    operationType: 'KillAmqpMethodRespLink',
    closeReason: ' severs AMQP method response link ',
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
  describe(testConfiguration.transport.name + ' using device/eventhub clients - disconnect methods', function () {
    this.timeout(60000);

    var deviceClient, serviceClient;
    var secondMethodTimeout;
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
      secondMethodTimeout = null;
    });

    afterEach(function (testCallback) {
      closeDeviceServiceClients(deviceClient, serviceClient, testCallback);
      if (secondMethodTimeout) clearTimeout(secondMethodTimeout);
    });

    var methodName1 = 'method1';
    var methodName2 = 'method2';
    var methodResult = 200;

    var setMethodHandler = function(methodName, testPayload) {
      debug('Setting up new method handler for: ' + methodName);
      // setup device to handle the method call
      deviceClient.onDeviceMethod(methodName, function(request, response) {
        // validate request
        assert.isNotNull(request);
        assert.strictEqual(request.methodName, methodName);
        assert.deepEqual(request.payload, testPayload);
        debug('device: received method request: ' + request.methodName);
        debug(JSON.stringify(request, null, 2));
        // validate response
        assert.isNotNull(response);

        // send the response
        response.send(methodResult, testPayload, function(err) {
          debug('send method response with statusCode: ' + methodResult);
          if(!!err) {
            console.error('An error ocurred when sending a method response:\n' +
                err.toString());
          }
        });
      });
    };

    var sendMethodCall = function(serviceClient, methodName, testPayload, sendMethodCallback) {
        var methodParams = {
          methodName: methodName,
          payload: testPayload,
          connectTimeoutInSeconds: 10,
          responseTimeoutInSeconds: 10
        };
        debug('service invoking method: ' + methodName + ' with payload:');
        debug(JSON.stringify(methodParams, null, 2));
        serviceClient.invokeDeviceMethod(
          provisionedDevice.deviceId,
          methodParams,
          function(err, result) {
            if(!err) {
              debug('got method results');
              debug(JSON.stringify(result, null, 2));
              assert.strictEqual(result.status, methodResult);
              assert.deepEqual(result.payload, testPayload);
            }
            debug('---------- end method test ------------');
            sendMethodCallback(err);
          });
    };

    doConnectTest(testConfiguration.testEnabled)('Service sends a method, iothub client receives it, and' + testConfiguration.closeReason + 'which is noted by the device', function (testCallback) {
      var firstMethodSent = false;
      deviceClient.setRetryPolicy(new NoRetry());
      var disconnectHandler = function () {
        debug('We did get a disconnect message');
        deviceClient.removeListener('disconnect', disconnectHandler);
        if (firstMethodSent) {
          testCallback();
        } else {
          testCallback(new Error('unexpected disconnect'));
        }
      };
      deviceClient.on('disconnect', disconnectHandler);
      var firstPayload = { k1: uuid.v4() };
      deviceClient.open(function (err) {
        if (err) {
          debug('error connecting the device client: ' + err.toString());
          testCallback(err);
        } else {
          debug('setting up method handler for ' + methodName1);
          setMethodHandler(methodName1, firstPayload);
          debug('waiting 2 seconds before invoking ' + methodName1);
          setTimeout(function () {
            sendMethodCall(serviceClient, methodName1, firstPayload, function(err) {
              if (!err) {
                debug('got result from first method invocation.  Having the client inject the fault');
                firstMethodSent = true;
                var terminateMessage = new Message('');
                terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
                terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
                terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
                deviceClient.sendEvent(terminateMessage, function (sendErr) {
                  debug('at the callback for the fault injection');
                  if (sendErr) {
                    debug('Fault injection error is: ' + sendErr.toString());
                  }
                });
              } else {
                debug('invocation of ' + methodName1 + ' failed with error: ' + err.toString());
                testCallback(err);
              }
            });
          }, 2000);
        }
      });
    });

    doConnectTest(testConfiguration.testEnabled)('Service client sends 2 methods, when iot hub client receives first, it ' + testConfiguration.closeReason + 'which is not seen by the device', function (testCallback) {
      deviceClient.on('disconnect', function () {
        testCallback(new Error('unexpected disconnect'));
      });
      var secondMethodSend = function() {
        debug('invoking ' + methodName2);
        sendMethodCall(serviceClient, methodName2, payload2, function(err) {
          debug('got result from second method invocation.');
          testCallback(err);
        });
      };
      var payload1 = { k1: uuid.v4() };
      var payload2 = { k1: uuid.v4() };
      debug('connecting device client');
      deviceClient.open(function (err) {
        if (err) {
          debug('error when opening the device client: ' + err.toString());
          testCallback(err);
        } else {
          debug('setting method handlers');
          setMethodHandler(methodName1, payload1);
          setMethodHandler(methodName2, payload2);
          debug('waiting 5 seconds for subscription before calling first method');
          setTimeout(function () {
            debug('calling method1');
            sendMethodCall(serviceClient, methodName1, payload1, function(err) {
              if (!err) {
                debug('got result from first method invocation.  Having the client send the kill');
                var terminateMessage = new Message('');
                terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
                terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
                terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
                deviceClient.sendEvent(terminateMessage, function (sendErr) {
                  debug('at the callback for the fault injection send');
                  if (sendErr) {
                    debug('received an error while injecting the fault: ' + sendErr.toString());
                  }
                  var delayBeforeSecondMethod = (testConfiguration.delayInSeconds + 5) * 1000;
                  debug('waiting ' + delayBeforeSecondMethod + ' milliseconds before invoking: ' + methodName2);
                  secondMethodTimeout = setTimeout(secondMethodSend.bind(this), delayBeforeSecondMethod);
                });
              } else {
                debug('failed to invoke: ' + methodName1 + ' with error: ' + err.toString());
                testCallback(err);
              }
            });
          }, 5000);
        }
      });
    });
  });
});