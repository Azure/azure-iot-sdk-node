// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let serviceSdk = require('azure-iothub');
let createDeviceClient = require('./testUtils.js').createDeviceClient;
let closeDeviceServiceClients = require('./testUtils.js').closeDeviceServiceClients;
let DeviceIdentityHelper = require('./device_identity_helper.js');
let Rendezvous = require('./rendezvous_helper.js').Rendezvous;

let assert = require('chai').assert;
let debug = require('debug')('e2etests');
let uuid = require('uuid');

let deviceHttp = require('azure-iot-device-http');
let deviceAmqp = require('azure-iot-device-amqp');

let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

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

function device_acknowledgment_tests(deviceTransport, createDeviceMethod) {
  describe('Over ' + deviceTransport.name + ' using ' + createDeviceMethod.name, function () {
    // eslint-disable-next-line no-invalid-this
    this.timeout(70000);
    let serviceClient;
    let deviceClient;
    let provisionedDevice;

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
      // eslint-disable-next-line no-invalid-this
      this.timeout(70000);
      let guid = uuid.v4();
      let deviceClientParticipant = 'deviceClient';
      let serviceClientParticipant = 'serviceClient';
      let testRendezvous = new Rendezvous(done);

      let abandonedOnce = false;
      // eslint-disable-next-line security/detect-non-literal-fs-filename
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
                    debug('+++error abandoning the message: ' + err.toString());
                    done(err);
                  } else {
                    debug('+++Message abandoned');
                    assert.equal(result.constructor.name, 'MessageAbandoned');
                  }
                });
              } else {
                debug('+++completing the message');
                deviceClient.complete(msg, function (err, res) {
                  if (err) {
                    debug('+++error completing the message: ' + err.toString());
                    done(err);
                  } else if (res) {
                    debug('+++message completing. closing device client');
                    assert.equal(res.constructor.name, 'MessageCompleted');
                    deviceClient.close(function (closeError) {
                      if (closeError) {
                        debug('+++failed to close device client: ' + closeError.toString());
                        done(closeError);
                      } else {
                        debug('+++device client closed');
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
                  debug('+++unexpected message abandoned with an error');
                  done(err);
                } else {
                  if (result) {
                    debug('+++unexpected message abandoned successfully');
                    assert.equal(result.constructor.name, 'MessageAbandoned');
                  }
                }
              });
            }
          });
          debug('+++opening service client');
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          serviceClient.open(function (serviceErr) {
            if (serviceErr) {
              debug('+++error opening service client: ' + serviceErr.toString());
              done(serviceErr);
            } else {
              testRendezvous.imIn(serviceClientParticipant);
              debug('+++sending c2d message ' + guid + ' to ' + provisionedDevice.deviceId);
              serviceClient.send(provisionedDevice.deviceId, guid, function (sendErr, result) {
                if (sendErr) {
                  debug('+++error sending c2d message: ' + sendErr.toString());
                  done(sendErr);
                } else if (result) {
                  assert.equal(result.constructor.name, 'MessageEnqueued');
                  testRendezvous.imDone(serviceClientParticipant);
                } else {
                  debug('+++c2d message sent');
                  done(new Error('message service send completed without a result'));
                }
              });
            }
          });
        }
      });

    });

    it('Service sends 1 C2D message and it is re-sent until rejected', function (done) {
      // eslint-disable-next-line no-invalid-this
      this.timeout(70000);
      let guid = uuid.v4();
      let deviceClientParticipant = 'deviceClient';
      let serviceClientParticipant = 'serviceClient';
      let testRendezvous = new Rendezvous(done);

      let abandonedOnce = false;
      // eslint-disable-next-line security/detect-non-literal-fs-filename
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
                  deviceClient.close(function (closeError) {
                    if (closeError) {
                      debug('+++error closing the device client');
                      done(closeError);
                    } else {
                      debug('+++device client closed');
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
                debug('message abandoned');
                assert.isNull(err);
                assert.equal(result.constructor.name, 'MessageAbandoned');
              });
            }
          });
          debug('+++opening service client');
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          serviceClient.open(function (serviceErr) {
            if (serviceErr) {
              debug('+++error opening service client: ' + serviceErr.toString());
              done(serviceErr);
            } else {
              debug('+++service client opened.');
              testRendezvous.imIn(serviceClientParticipant);
              debug('+++sending c2d message ' + guid + ' to ' + provisionedDevice.deviceId);
              serviceClient.send(provisionedDevice.deviceId, guid, function (sendErr) {
                if (sendErr) {
                  debug('+++error sending c2d message: ' + sendErr.toString());
                  done(sendErr);
                } else {
                  debug('+++c2d message sent');
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
