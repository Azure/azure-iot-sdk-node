// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Registry = require('azure-iothub').Registry;
var ConnectionString = require('azure-iothub').ConnectionString;
var debug = require('debug')('e2etests:twin_disconnect');
var Message = require('azure-iot-common').Message;
var deviceSdk = require('azure-iot-device');
var deviceMqtt = require('azure-iot-device-mqtt');
var deviceAmqp = require('azure-iot-device-amqp');
var uuid = require('uuid');
var assert = require('chai').assert;
var NoRetry = require('azure-iot-common').NoRetry;

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

var setTwinMoreNewPropsTimeout;

var doConnectTest = function doConnectTest(doIt) {
  return doIt ? it : it.skip;
};

var protocolAndTermination = [
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
    testEnabled: true,
    transport: deviceMqtt.Mqtt,
    operationType: 'ShutDownMqtt',
    closeReason: ' cleanly shutdowns MQTT connection ',
    delayInSeconds: 2
  },
  {
    testEnabled: true,
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


var newProps = {
  foo : 1,
  bar : {
    baz : 2,
    tweedle : {
      dee : 3
    }
  }
};

var moreNewProps = {
  bar : {
    baz : 3
  }
};

var nullMergeResult = JSON.parse(JSON.stringify(newProps));
delete nullMergeResult.tweedle;

protocolAndTermination.forEach( function (testConfiguration) {
  describe(testConfiguration.transport.name + ' using device/service clients - disconnect twin', function () {

    this.timeout(60000);
    var deviceClient, deviceTwin;
    var serviceTwin;

    var deviceDescription;

    beforeEach(function (done) {
      setTwinMoreNewPropsTimeout = null;
      var host = ConnectionString.parse(hubConnectionString).HostName;
      var pkey = new Buffer(uuid.v4()).toString('base64');
      var deviceId = '0000e2etest-delete-me-twin-e2e-disconnect-' + uuid.v4();

      deviceDescription = {
        deviceId:  deviceId,
        status: 'enabled',
          authentication: {
          symmetricKey: {
            primaryKey: pkey,
            secondaryKey: new Buffer(uuid.v4()).toString('base64')
          }
        },
        connectionString: 'HostName=' + host + ';DeviceId=' + deviceId + ';SharedAccessKey=' + pkey
      };

      var registry = Registry.fromConnectionString(hubConnectionString);

      registry.create(deviceDescription, function (err) {
        if (err) return done(err);

        deviceClient = deviceSdk.Client.fromConnectionString(deviceDescription.connectionString, testConfiguration.transport);

        deviceClient.open(function(err) {
          if (err) return done(err);
          deviceClient.getTwin(function(err, twin) {
            if (err) return done(err);
            deviceTwin = twin;

            registry.getTwin(deviceDescription.deviceId, function(err, twin) {
              if (err) return done(err);
              serviceTwin = twin;
              done();
            });
          });
        });
      });
    });

    afterEach(function (done) {
      if (setTwinMoreNewPropsTimeout) clearTimeout(setTwinMoreNewPropsTimeout);
      if (deviceClient) {
        deviceClient.close(function(err) {
          if (err) return done(err);

          var registry = Registry.fromConnectionString(hubConnectionString);
          registry.delete(deviceDescription.deviceId, function(err) {
            if (err) return done(err);
            done();
          });
        });
      } else {
        done();
      }
    });

    doConnectTest(testConfiguration.testEnabled)('Simple twin update: device receives it, and' + testConfiguration.closeReason + 'which is noted by the iot hub client', function(testCallback) {
      this.timeout(120000);
      deviceClient.setRetryPolicy(new NoRetry());
      debug('about to connect a disconnect listener.');
      deviceClient.on('disconnect', function () {
        debug('We did get a disconnect message');
        if (deviceTwin.properties.desired.$version === 2) {
          testCallback();
        } else {
          testCallback(new Error('unexpected disconnect'));
        }
      });
      assert.equal(deviceTwin.properties.desired.$version, 1);
      deviceTwin.on('properties.desired', function() {
        if (deviceTwin.properties.desired.$version === 1) {
          debug('received notification for desired property v1. nothing to do');
        } else if (deviceTwin.properties.desired.$version === 2) {
          var terminateMessage = new Message(' ');
          terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
          terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
          terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
          debug('sending fault injection message');
          deviceClient.sendEvent(terminateMessage, function (sendErr) {
            debug('at the callback for the fault injection send, err is:' + sendErr);
          });
        } else if (deviceTwin.properties.desired.$version >= 2) {
          testCallback(new Error('incorrect property version received - ' + deviceTwin.properties.desired.$version));
        }
      });

      // giving a few seconds for the twin subscription to happen before we send the update.
      setTimeout(function () {
        debug('Updating twin properties');
        serviceTwin.update( { properties : { desired : newProps } }, function(err) {
          debug('twin properties updated. version should now be 2');
          if (err) return testCallback(err);
        });
      }, 3000);
    });

    doConnectTest(testConfiguration.testEnabled)('Simple twin update: device receives it, and' + testConfiguration.closeReason + 'which is NOT noted by the iot hub client', function(testCallback) {
      this.timeout(120000);
      debug('about to connect a disconnect listener.');
      deviceClient.on('disconnect', function () {
        debug('We did get a disconnect message');
        testCallback(new Error('unexpected disconnect'));
      });
      var setTwinMoreNewProps = function() {
        serviceTwin.update( { properties : { desired : moreNewProps } }, function(err) {
          debug('At the timeout delayed update');
          if (err) return testCallback(err);
        });
      };
      assert.equal(deviceTwin.properties.desired.$version,1);
      deviceTwin.on('properties.desired', function() {
        if (deviceTwin.properties.desired.$version === 1) {
          debug('received notification for desired property v1. nothing to do');
        } else if (deviceTwin.properties.desired.$version === 2) {
          var terminateMessage = new Message(' ');
          terminateMessage.properties.add('AzIoTHub_FaultOperationType', testConfiguration.operationType);
          terminateMessage.properties.add('AzIoTHub_FaultOperationCloseReason', testConfiguration.closeReason);
          terminateMessage.properties.add('AzIoTHub_FaultOperationDelayInSecs', testConfiguration.delayInSeconds);
          debug('sending fault injection message');
          deviceClient.sendEvent(terminateMessage, function (sendErr) {
            debug('at the callback for the fault injection send, err is:' + sendErr);
          });
          setTwinMoreNewPropsTimeout = setTimeout(setTwinMoreNewProps, (testConfiguration.delayInSeconds + 5) * 1000);
        } else if (deviceTwin.properties.desired.$version === 3) {
          debug('received notification for desired property v3. test is successful.');
          testCallback();
        } else {
          debug('incorrect property version received. exiting test with an error.');
          testCallback(new Error('incorrect property version received - ' + deviceTwin.properties.desired.$version));
        }
      });

      // giving a few seconds for the twin subscription to happen before we send the update.
      setTimeout(function () {
        debug('Updating twin properties');
        serviceTwin.update( { properties : { desired : newProps } }, function(err) {
          debug('twin properties updated. version should now be 2');
          if (err) return testCallback(err);
        });
      }, 3000);
    });
  });
});
