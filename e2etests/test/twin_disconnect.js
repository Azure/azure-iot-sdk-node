// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let Registry = require('azure-iothub').Registry;
let debug = require('debug')('e2etests:twin_disconnect');
let Message = require('azure-iot-common').Message;
let deviceMqtt = require('azure-iot-device-mqtt');
let deviceAmqp = require('azure-iot-device-amqp');
let uuid = require('uuid');
let NoRetry = require('azure-iot-common').NoRetry;
let DeviceIdentityHelper = require('./device_identity_helper.js');
let createDeviceClient = require('./testUtils.js').createDeviceClient;
let Rendezvous = require('./rendezvous_helper.js').Rendezvous;

let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

let doConnectTest = function doConnectTest(doIt) {
  return doIt ? it : it.skip;
};

//
// The disconnect implementation for MQTT is implemented incorrectly.  Disabling the tests.
//
let protocolAndTermination = [
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
    operationType: 'KillAmqpTwinLinkReq',
    closeReason: ' severs AMQP TWIN request link ',
    delayInSeconds: 2
  },
  {
    testEnabled: true,
    transport: deviceAmqp.Amqp,
    operationType: 'KillAmqpTwinLinkResp',
    closeReason: ' severs AMQP TWIN response link ',
    delayInSeconds: 2
  },
  {
    testEnabled: true,
    transport: deviceAmqp.AmqpWs,
    operationType: 'KillAmqpTwinLinkReq',
    closeReason: ' severs AMQP TWIN request link ',
    delayInSeconds: 2
  },
  {
    testEnabled: true,
    transport: deviceAmqp.AmqpWs,
    operationType: 'KillAmqpTwinLinkResp',
    closeReason: ' severs AMQP TWIN response link ',
    delayInSeconds: 2
  },
  {
    testEnabled: false,
    transport: deviceMqtt.Mqtt,
    operationType: 'ShutDownMqtt',
    closeReason: ' cleanly shutdowns MQTT connection ',
    delayInSeconds: 2
  },
  {
    testEnabled: false,
    transport: deviceMqtt.MqttWs,
    operationType: 'ShutDownMqtt',
    closeReason: ' cleanly shutdowns MQTT connection ',
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
    transport: deviceAmqp.AmqpWs,
    operationType: 'ShutDownAmqp',
    closeReason: ' cleanly shutdowns AMQP connection ',
    delayInSeconds: 2
  },
];

protocolAndTermination.forEach( function (testConfiguration) {
  describe(testConfiguration.transport.name + ' using device/service clients - disconnect twin', function () {
    // eslint-disable-next-line no-invalid-this
    this.timeout(60000);
    // test clients
    let deviceClient;
    let deviceTwin;
    let serviceTwin;

    // timeouts that could trigger test callbacks
    let twinUpdateAfterFaultInjectionTimeout;
    let faultInjectionTimeout;

    let deviceDescription;
    let registry = Registry.fromConnectionString(hubConnectionString);

    before(function (beforeCallback) {
      debug('creating test device...');
      DeviceIdentityHelper.createDeviceWithSas(function (err, testDeviceInfo) {
        if (err) {
          debug('failed to create test device: ' + err.toString());
          beforeCallback(err);
        } else {
          debug('test device created: ' + testDeviceInfo.deviceId);
          deviceDescription = testDeviceInfo;
          beforeCallback(err);
        }
      });
    });

    after(function (afterCallback) {
      debug('deleting device: ' + deviceDescription.deviceId);
      DeviceIdentityHelper.deleteDevice(deviceDescription.deviceId, function (err) {
        if (err) {
          debug('failed to delete test device: ' + err.toString());
          afterCallback(err);
        } else {
          debug('test device deleted');
          afterCallback();
        }
      });
    });

    beforeEach(function (done) {
      twinUpdateAfterFaultInjectionTimeout = null;
      faultInjectionTimeout = null;
      deviceClient = createDeviceClient(testConfiguration.transport, deviceDescription);

      debug('connecting device client');
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      deviceClient.open(function (err) {
        if (err) {
          debug('error connecting device: ' + deviceDescription.deviceId + ' : ' + err.toString());
          done(err);
        } else {
          deviceClient.getTwin(function (err, twin) {
            if (err) {
              debug('failed to get the twin for the device: ' + err.toString());
              done(err);
            } else {
              debug('got device twin');
              deviceTwin = twin;
              debug('getting twin on the service side');
              registry.getTwin(deviceDescription.deviceId, function (err, twin) {
                if (err) {
                  debug('failed to get the device twin with the registry API: ' + err.toString());
                  done(err);
                } else {
                  debug('Got device twin on the service side.');
                  serviceTwin = twin;
                  done();
                }
              });
            }
          });
        }
      });
    });

    afterEach(function (done) {
      if (twinUpdateAfterFaultInjectionTimeout) {
        debug('clearing twinUpdateAfterFaultInjectionTimeout');
        clearTimeout(twinUpdateAfterFaultInjectionTimeout);
      }

      if (faultInjectionTimeout) {
        debug('clearing faultInjectionTimeout');
        clearTimeout(faultInjectionTimeout);
      }

      if (deviceClient) {
        deviceTwin = null;
        serviceTwin = null;
        deviceClient.close(function (err) {
          deviceClient = null;
          if (err) {
            debug('failed to close the device client: ' + err.toString());
            done(err);
          } else {
            debug('device client successfully closed.');
            done();
          }
        });
      } else {
        debug('no device client to close.');
        done();
      }
    });

    doConnectTest(testConfiguration.testEnabled)('Simple twin update: device receives it, and' + testConfiguration.closeReason + 'which is noted by the iot hub client', function (testCallback) {
      // eslint-disable-next-line no-invalid-this
      this.timeout(120000);

      let rdv = new Rendezvous(testCallback);
      let deviceClientIdentifier = 'deviceClient';
      let serviceTwinUpdateIdentifier = 'serviceTwin';
      rdv.imIn(deviceClientIdentifier);
      rdv.imIn(serviceTwinUpdateIdentifier);

      let faultInjectionTestPropertyValue = uuid.v4();
      deviceClient.setRetryPolicy(new NoRetry());

      debug('attaching disconnect event handler');
      deviceClient.on('disconnect', function () {
        debug('device client: disconnect event');
        if (deviceTwin.properties.desired.testProp === faultInjectionTestPropertyValue) {
          rdv.imDone(deviceClientIdentifier);
        } else {
          testCallback(new Error('device client: unexpected disconnect for device: ' + deviceDescription.deviceId));
        }
      });
      debug('device client: attaching desired properties change handler');
      debug('device client: will trigger fault injection when test property value is: ' + faultInjectionTestPropertyValue);
      deviceTwin.on('properties.desired', function () {
        if (deviceTwin.properties.desired.testProp === faultInjectionTestPropertyValue) {
          let terminateMessage = new Message(' ');
          terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
          terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
          terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
          debug('device client: sending fault injection message');
          deviceClient.sendEvent(terminateMessage, function (sendErr) {
            if (sendErr) {
              debug('device client: fault injection error: ' + sendErr.toString());
            } else {
              debug('device client: fault injection successful');
            }
          });
        } else {
          debug('device client: received notification for desired property change. testProperty: ' + deviceTwin.properties.desired.testProp);
        }
      });

      // giving a few seconds for the twin subscription to happen before we send the update.
      debug('service client: waiting 3 seconds before triggering a twin update from the service API');
      faultInjectionTimeout = setTimeout(function () {
        debug('service client: Updating twin properties');
        serviceTwin.update( { properties : { desired : { testProp: faultInjectionTestPropertyValue } } }, function (err) {
          if (err) {
            debug('service client: Twin update failed for device: ' + deviceDescription.deviceId + '. Error updating twin for fault injection: ' + err.toString());
            err.message += '; test device: ' + deviceDescription.deviceId;
            testCallback(err);
          } else {
            debug('service client: twin properties updated to trigger fault injection with value: ' + faultInjectionTestPropertyValue);
            rdv.imDone(serviceTwinUpdateIdentifier);
          }
        });
      }, 3000);
    });

    doConnectTest(testConfiguration.testEnabled)('Simple twin update: device receives it, and' + testConfiguration.closeReason + 'which is NOT noted by the iot hub client', function (testCallback) {
      // eslint-disable-next-line no-invalid-this
      this.timeout(120000);

      let rdv = new Rendezvous(testCallback);
      let deviceClientIdentifier = 'deviceClient';
      let serviceTwinUpdateIdentifier = 'serviceTwin';
      rdv.imIn(deviceClientIdentifier);
      rdv.imIn(serviceTwinUpdateIdentifier);

      let faultInjectionTestPropertyValue = uuid.v4();
      let afterFaultInjectionTestPropertyValue = uuid.v4();

      debug('attaching disconnect event handler');
      deviceClient.on('disconnect', function () {
        debug('Unexpected disconnect event');
        testCallback(new Error('unexpected disconnect'));
      });

      let setTwinPropsAfterFaultInjection = function () {
        debug('service client: updating twin after fault injection');
        serviceTwin.update( { properties : { desired : { testProp: afterFaultInjectionTestPropertyValue } } }, function (err) {
          if (err) {
            debug('service client: error updating property after fault injection: ' + err.toString());
            err.message += '; test device: ' + deviceDescription.deviceId;
            testCallback(err);
          } else {
            debug('service client: sent new property update after fault injection');
            rdv.imDone(serviceTwinUpdateIdentifier);
          }
        });
      };

      debug('device client: attaching desired properties update handler');
      deviceTwin.on('properties.desired', function () {
        if (deviceTwin.properties.desired.testProp === faultInjectionTestPropertyValue) {
          let terminateMessage = new Message(' ');
          terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
          terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
          terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
          debug('device client: sending fault injection message');
          deviceClient.sendEvent(terminateMessage, function (sendErr) {
            if (sendErr) {
              debug('device client: error at fault injection for device: ' + deviceDescription.deviceId + ' : ' + sendErr.toString());
            } else {
              debug('device client: fault injection succeeded for device: ' + deviceDescription.deviceId);
            }
          });
          twinUpdateAfterFaultInjectionTimeout = setTimeout(setTwinPropsAfterFaultInjection, (testConfiguration.delayInSeconds + 10) * 1000);
        } else if (deviceTwin.properties.desired.testProp === afterFaultInjectionTestPropertyValue) {
          debug('device client: received notification for desired property after fault injection.');
          rdv.imDone(deviceClientIdentifier);
        } else {
          debug('device client: ignoring test property value: ' + deviceTwin.properties.desired.testProp);
        }
      });

      // giving a few seconds for the twin subscription to happen before we send the update.
      debug('service client: waiting 3 seconds before twin update that will trigger the fault injection.');
      faultInjectionTimeout = setTimeout(function () {
        debug('service client: updating twin property for fault injection');
        serviceTwin.update( { properties : { desired : { testProp: faultInjectionTestPropertyValue } } }, function (err) {
          if (err) {
            debug('service client: failed to update twin for fault injection for device: ' + deviceDescription.deviceId + ' : ' + err.toString());
            err.message += '; deviceId: ' + deviceDescription.deviceId;
            testCallback(err);
          } else {
            debug('service client: successfully sent twin update that will trigger fault injection');
          }
        });
      }, 3000);
    });
  });
});
