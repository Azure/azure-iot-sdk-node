// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var serviceSdk = require('azure-iothub');
var createDeviceClient = require('./testUtils.js').createDeviceClient;
var closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
var DeviceIdentityHelper = require('./device_identity_helper.js');
var Rendezvous = require('./rendezvous_helper.js').Rendezvous;

var assert = require('chai').assert;
var debug = require('debug')('e2etests');
var uuid = require('uuid');

var deviceHttp = require('azure-iot-device-http');
var deviceAmqp = require('azure-iot-device-amqp');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

[
  DeviceIdentityHelper.createDeviceWithSas,
  DeviceIdentityHelper.createDeviceWithSymmetricKey,
  DeviceIdentityHelper.createDeviceWithX509SelfSignedCert
].forEach(function (createDeviceMethod) {
  [
    deviceHttp.Http,
    deviceAmqp.Amqp,
    deviceAmqp.AmqpWs
  ].forEach(function (deviceTransport) {
    device_acknowledgment_tests(deviceTransport, createDeviceMethod);
  });
});

device_acknowledgment_tests(deviceAmqp.Amqp, DeviceIdentityHelper.createDeviceWithX509CASignedCert);

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
      var deviceClientParticipant = 'deviceClient';
      var serviceClientParticipant = 'serviceClient';
      var testRendezvous = new Rendezvous(done);

      var abandonedOnce = false;
      deviceClient.open(function (openErr) {
        if (openErr) {
          done(openErr);
        } else {
          testRendezvous.imIn(deviceClientParticipant);
          deviceClient.on('message', function (msg) {
            debug('+++Received a message with guid: ' + msg.data);
            if (msg.data.toString() === guid) {
              if (!abandonedOnce) {
                debug('+++Abandon the message with guid ' + msg.data);
                abandonedOnce = true;
                deviceClient.abandon(msg, function (err, result) {
                  if(err) {
                    done(err);
                  } else {
                    assert.equal(result.constructor.name, 'MessageAbandoned');
                  }
                });
              } else {
                deviceClient.complete(msg, function (err, res) {
                  if (err) {
                    done(err);
                  } else if (res) {
                    assert.equal(res.constructor.name, 'MessageCompleted');
                    deviceClient.close(function(closeError) {
                      if (closeError) {
                        done(closeError);
                      } else {
                        testRendezvous.imDone(deviceClientParticipant);
                      }
                    });
                  } else {
                    done( new Error('send completed without result'));
                  }
                });
              }
            } else {
              //
              // If we are getting a c2d message IN THIS TEST SUITE, the most likely scenario is that
              // we are getting it on a listener that was pending for an HTTP client.  It is likely to
              // be the c2d message for another test.  We should abandon it so that the other test
              // has a chance to deal with it.
              //
              debug('+++not the message I\'m looking for, abandon it for the other test (' + msg.data + ')');
              deviceClient.abandon(msg, function (err, result) {
                if (err) {
                  debug('unexpected message completed with an error');
                  done(err);
                } else {
                  if (result) {
                    assert.equal(result.constructor.name, 'MessageAbandoned');
                  }
                }
              });
            }
          });
          serviceClient.open(function (serviceErr) {
            if (serviceErr) {
              done(serviceErr);
            } else {
              testRendezvous.imIn(serviceClientParticipant);
              serviceClient.send(provisionedDevice.deviceId, guid, function (sendErr, result) {
                if (sendErr) {
                  done(sendErr);
                } else if (result) {
                  assert.equal(result.constructor.name, 'MessageEnqueued');
                  testRendezvous.imDone(serviceClientParticipant);
                } else {
                  done(new Error('message service send completed without a result'));
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
      var deviceClientParticipant = 'deviceClient';
      var serviceClientParticipant = 'serviceClient';
      var testRendezvous = new Rendezvous(done);

      var abandonedOnce = false;
      deviceClient.open(function (openErr) {
        if (openErr) {
          done(openErr);
        } else {
          testRendezvous.imIn(deviceClientParticipant);
          deviceClient.on('message', function (msg) {
            debug('---Received a message with guid: ' + msg.data);
            if (msg.data.toString() === guid) {
              if (!abandonedOnce) {
                debug('---Abandon the message with guid ' + msg.data);
                abandonedOnce = true;
                deviceClient.abandon(msg, function (err, result) {
                  assert.isNull(err);
                  assert.equal(result.constructor.name, 'MessageAbandoned');
                });
              } else {
                debug('---Rejects the message with guid ' + msg.data);
                deviceClient.reject(msg, function (err, res) {
                  assert.isNull(err);
                  assert.equal(res.constructor.name, 'MessageRejected');
                  deviceClient.close(function(closeError) {
                    if (closeError) {
                      done(closeError);
                    } else {
                      testRendezvous.imDone(deviceClientParticipant);
                    }
                  });
                });
              }
            } else {
              //
              // If we are getting a c2d message IN THIS TEST SUITE, the most likely scenario is that
              // we are getting it on a listener that was pending for an HTTP client.  It is likely to
              // be the c2d message for another test.  We should abandon it so that the other test
              // has a chance to deal with it.
              //
              debug('---not the message I\'m looking for, abandon it for the other test (' + msg.data + ')');
              deviceClient.abandon(msg, function (err, result) {
                assert.isNull(err);
                assert.equal(result.constructor.name, 'MessageAbandoned');
              });
            }
          });
          serviceClient.open(function (serviceErr) {
            if (serviceErr) {
              done(serviceErr);
            } else {
              testRendezvous.imIn(serviceClientParticipant);
              serviceClient.send(provisionedDevice.deviceId, guid, function (sendErr) {
                if (sendErr) {
                  debug('---It had an error.');
                  done(sendErr);
                } else {
                  testRendezvous.imDone(serviceClientParticipant);
                }
              });
            }
          });
        }
      });
    });
  });
}