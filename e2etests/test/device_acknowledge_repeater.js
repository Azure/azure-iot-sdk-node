// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var serviceSdk = require('azure-iothub');
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
var DeviceIdentityHelper = require('./device_identity_helper.js');

var assert = require('chai').assert;
var debug = require('debug')('e2etests');
var uuid = require('uuid');

var deviceAmqp = require('azure-iot-device-amqp');
var deviceHttp = require('azure-iot-device-http');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

[
  DeviceIdentityHelper.createDeviceWithSas,
].forEach(function (createDeviceMethod) {
  [
    deviceHttp.Http,
    deviceAmqp.Amqp,
    deviceAmqp.AmqpWs
  ].forEach(function (deviceTransport) {
    var i = 0;
    for (i = 0; i < 1000; i++) {
    device_acknowledgment_tests(deviceTransport, createDeviceMethod);
    }
  });
});


function device_acknowledgment_tests (deviceTransport, createDeviceMethod) {
  describe('Over ' + deviceTransport.name + ' using ' + createDeviceMethod.name, function () {
    this.timeout(60000);

    var serviceClient, deviceClient;
    var provisionedDevice;

    before(function (beforeCallback) {
      createDeviceMethod(function (err, testDeviceInfo) {
        provisionedDevice = testDeviceInfo;
        beforeCallback(err);
      });
    });

    after(function (afterCallback) {
      DeviceIdentityHelper.deleteDevice(provisionedDevice.deviceId, afterCallback);
    });

    beforeEach(function () {
      serviceClient = serviceSdk.Client.fromConnectionString(hubConnectionString);
      deviceClient = createDeviceClient(deviceTransport, provisionedDevice);
    });

    afterEach(function (done) {
      closeDeviceServiceClients(deviceClient, serviceClient, done);
    });

    it('Service sends 1 C2D message and it is re-sent until completed', function (done) {
      this.timeout(15000);
      var guid = uuid.v4();

      var doneYet = {
        deviceClientDone: false,
        serviceClientDone: false
      };
      var allDone = function(imDone) {
        doneYet[imDone] = true;
        if (doneYet.deviceClientDone && doneYet.serviceClientDone) {
          return done();
        }
      };
      var abandonedOnce = false;
      deviceClient.open(function (openErr) {
        if (openErr) {
          done(openErr);
        } else {
          deviceClient.on('message', function (msg) {
            debug('Received a message with guid: ' + msg.data);
            if (msg.data.toString() === guid) {
              if (!abandonedOnce) {
                debug('Abandon the message with guid ' + msg.data);
                abandonedOnce = true;
                deviceClient.abandon(msg, function (err, result) {
                  if(err) {
                    done(err);
                  } else {
                    assert.equal(result.constructor.name, 'MessageAbandoned');
                  }
                });
              } else {
                debug('Complete the message with guid ' + msg.data);
                deviceClient.complete(msg, function (err, res) {
                  if(res) {
                    assert.equal(res.constructor.name, 'MessageCompleted');
                  }
                  if (err) {
                    debug('complete c2d with an error');
                  }
                  allDone('deviceClientDone');
                });
              }
            } else {
              debug('not the message I\'m looking for, completing it to clean the queue (' + msg.data + ')');
              deviceClient.complete(msg, function (err, result) {
                if (err) {
                  done(err);
                } else {
                  if(result) {
                    assert.equal(result.constructor.name, 'MessageCompleted');
                  }
                }
              });
            }
          });
          serviceClient.open(function (serviceErr) {
            if (serviceErr) {
              done(serviceErr);
            } else {
              serviceClient.send(provisionedDevice.deviceId, guid, function (sendErr, result) {
                debug('Sent one message with guid: ' + guid);
                if (sendErr) {
                  done(sendErr);
                } else {
                  assert.equal(result.constructor.name, 'MessageEnqueued');
                  allDone('serviceClientDone');
                }
              });
            }
          });
        }
      });

    });

    it('Service sends 1 C2D message and it is re-sent until rejected', function (done) {
      this.timeout(15000);
      var guid = uuid.v4();
      var doneYet = {
        deviceClientDone: false,
        serviceClientDone: false
      };
      var allDone = function(imDone) {
        doneYet[imDone] = true;
        if (doneYet.deviceClientDone && doneYet.serviceClientDone) {
          return done();
        }
      };

      var abandonedOnce = false;
      deviceClient.open(function (openErr) {
        if (openErr) {
          done(openErr);
        } else {
          deviceClient.on('message', function (msg) {
            debug('Received a message with guid: ' + msg.data);
            if (msg.data.toString() === guid) {
              if (!abandonedOnce) {
                debug('Abandon the message with guid ' + msg.data);
                abandonedOnce = true;
                deviceClient.abandon(msg, function (err, result) {
                  assert.isNull(err);
                  assert.equal(result.constructor.name, 'MessageAbandoned');
                });
              } else {
                debug('Rejects the message with guid ' + msg.data);
                deviceClient.reject(msg, function (err, res) {
                  assert.isNull(err);
                  assert.equal(res.constructor.name, 'MessageRejected');
                  allDone('deviceClientDone');
                });
              }
            } else {
              debug('not the message I\'m looking for, completing it to clean the queue (' + msg.data + ')');
              deviceClient.complete(msg, function (err, result) {
                assert.isNull(err);
                assert.equal(result.constructor.name, 'MessageCompleted');
              });
            }
          });
          serviceClient.open(function (serviceErr) {
            if (serviceErr) {
              done(serviceErr);
            } else {
              serviceClient.send(provisionedDevice.deviceId, guid, function (sendErr) {
                debug('Sent one message with guid: ' + guid);
                if (sendErr) {
                  done(sendErr);
                }
                allDone('serviceClientDone');
              });
            }
          });
        }
      });
    });
  });
}