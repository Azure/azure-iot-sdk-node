// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Registry = require('azure-iothub').Registry;
var ConnectionString = require('azure-iothub').ConnectionString;
var deviceSdk = require('azure-iot-device');
var deviceSas = require('azure-iot-device').SharedAccessSignature;
var anHourFromNow = require('azure-iot-common').anHourFromNow;
var uuid = require('uuid');
var _ = require('lodash');
var assert = require('chai').assert;
var async = require('async');
var debug = require('debug')('e2etests:twin_e2e');

var deviceAmqp = require('azure-iot-device-amqp');
var deviceMqtt = require('azure-iot-device-mqtt');

var hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;

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

var mergeResult =  _.merge(JSON.parse(JSON.stringify(newProps)), moreNewProps);

var nullIndividualProps = {
  bar : {
    tweedle: null
  }
};

var nullMergeResult = JSON.parse(JSON.stringify(newProps));
delete nullMergeResult.tweedle;

[
  deviceAmqp.Amqp,
  deviceMqtt.Mqtt
].forEach(function(protocolCtor) {
  describe('Twin over ' + protocolCtor.name, function() {
    this.timeout(60000);
    var deviceDescription, deviceClient, deviceTwin, serviceTwin;
    var host = ConnectionString.parse(hubConnectionString).HostName;
    var registry = Registry.fromConnectionString(hubConnectionString);

    before(function (done) {
      var pkey = new Buffer(uuid.v4()).toString('base64');
      var deviceId = '0000e2etest-delete-me-twin-e2e-' + protocolCtor.name + '-'  + uuid.v4();

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

      debug('creating test device: ' + deviceId + ' on hub: ' + host);
      registry.create(deviceDescription, function (err) {
        if (err) {
          debug('error creating test device: ' + err.toString());
          return done(err);
        } else {
          debug('test device successfully created: ' + deviceId);
          return done();
        }
      });
    });

    after(function (done) {
      debug('deleting test device: ' + deviceDescription.deviceId);
      registry.delete(deviceDescription.deviceId, function(err) {
        if (err) {
          debug('Error deleting test device: ' + err.toString());
          return done(err);
        } else {
          debug('test device deleted: ' + deviceDescription.deviceId);
          return done();
        }
      });
    });

    beforeEach(function (done) {
      var sas = deviceSas.create(host, deviceDescription.deviceId, deviceDescription.authentication.symmetricKey.primaryKey, anHourFromNow()).toString();
      deviceClient = deviceSdk.Client.fromSharedAccessSignature(sas, protocolCtor);

      debug('device client connecting...');
      deviceClient.open(function(err) {
        if (err) {
          debug('error connecting the device client: ' + err.toString());
          return done(err);
        } else {
          debug('device client connected - getting twin');
          deviceClient.getTwin(function(err, twin) {
            if (err) {
              debug('error getting device twin: ' + err.toString());
              return done(err);
            } else {
              debug('device got its twin');
              deviceTwin = twin;

              debug('service getting device twin...');
              registry.getTwin(deviceDescription.deviceId, function(err, twin) {
                if (err) {
                  debug('error getting the device twin on the service side: ' + err.toString());
                  return done(err);
                } else {
                  debug('got device twin on the service side');
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
      if (deviceClient) {
        debug('closing device client');
        deviceClient.close(function(err) {
          if (err) {
            debug('error closing the device client: ' + err.toString());
            return done(err);
          } else {
            debug('device client closed');
            done();
          }
        });
      } else {
        debug('no device client. continuing...');
        done();
      }
    });

    var assertObjectIsEmpty = function(props) {
      _.every(_.keys(props), function(key) {
        if (typeof props[key] !== 'function') {
          assert(key.startsWith('$'), 'key ' + key + ' should not be in empty twin');
        }
      });
    };

    var assertObjectsAreEqual = function(left, right) {
      var compare = function(left, right) {
        _.every(_.keys(right), function(key) {
          if (typeof right[key] !== 'function' && !key.startsWith('$')) {
            assert.equal(left[key], right[key], 'key ' + key + ' not matched between service and device');
          }
        });
      };
      compare(left, right);
      compare(right, left);
    };

    it.skip('relies on $version starting at 1 and incrementing by 1 each time', function(done) {
      // This test file relies on the behavior or $version.  The production code does not rely on this.
      assert.equal(deviceTwin.properties.desired.$version, 1);
      var firstUpdateReceived = false;

      deviceTwin.on('properties.desired', function() {
        debug('desired property update with version: ' + deviceTwin.properties.desired.$version);
        if (deviceTwin.properties.desired.$version === 1) {
          debug('initial property update received');
          firstUpdateReceived = true;
        } else if (deviceTwin.properties.desired.$version === 2) {
          assert(firstUpdateReceived);
          debug('desired property update received, version is 2. test successful');
          done();
        } else  {
          debug('incorrect property version received: ' + deviceTwin.properties.desired.$version);
          done(new Error('incorrect property version received - ' + deviceTwin.properties.desired.$version));
        }
      });

      debug('updating desired properties using the service API');
      serviceTwin.update( { properties : { desired : newProps } }, function(err) {
        if (err) {
          debug('error sending the desired properties update:' + err.toString());
          return done(err);
        } else {
          debug('desired properties update sent');
        }
      });
    });

    var sendsAndReceiveReportedProperties  = function(done) {
      debug('updating reported properties');
      deviceTwin.properties.reported.update(newProps, function(err) {
        if (err) {
          debug('error updating reported properties: ' + err.toString());
          return done(err);
        } else {
          debug('reported properties updated');
          setTimeout(function () {
            debug('getting twin from the service side');
            serviceTwin.get(function(err) {
              if (err) {
                debug('error getting twin on the service side');
                return done(err);
              } else {
                debug('got twin from the service side');
                assertObjectsAreEqual(newProps, serviceTwin.properties.reported);
                done();
              }
            });
          }, 3000);
        }
      });
    };

    var mergeReportedProperties =  function(first, second, result, done) {
      debug('sending first reported properties update');
      deviceTwin.properties.reported.update(first, function(err) {
        if (err) {
          debug('error updating reported properties: ' + err.toString());
          return done(err);
        } else {
          debug('first reported property update sent.');
          debug('sending second reported property update');
          deviceTwin.properties.reported.update(second, function(err) {
            if (err) {
              debug('error sending second reported property update: ' + err.toString());
              return done(err);
            } else {
              setTimeout(function () {
                serviceTwin.get(function(err) {
                  if (err) return done(err);
                  assertObjectsAreEqual(serviceTwin.properties.reported, result);
                  done();
                });
              }, 3000);
            }
          });
        }
      });
    };

    it('device sends reported properties and the service gets them', sendsAndReceiveReportedProperties);

    it('device sends more reported properties, they are merged, and the service gets them', function(done) {
      mergeReportedProperties(newProps, moreNewProps, mergeResult, done);
    });

    var sendsAndReceivesDesiredProperties = function(done) {
      var initialPropertyVersion = deviceTwin.properties.desired.$version;
      var updatedPropertyVersion = initialPropertyVersion + 1;
      deviceTwin.on('properties.desired', function(props) {
        debug('desired properties update received with version: ' + props.$version);
        if (props.$version === initialPropertyVersion) {
          debug('initial property update: ignoring');
          // wait a little before triggering the properties update to account for subscription time.
          setTimeout(function () {
            debug('sending desired properties update');
            serviceTwin.update( { properties : { desired : newProps } }, function(err) {
              if (err) {
                debug('error sending desired properties update: ' + err.toString());
                return done(err);
              } else {
                debug('desired properties update sent');
              }
            });
          }, 3000);
        } else if (props.$version === updatedPropertyVersion) {
          debug('updated properties received');
          assertObjectsAreEqual(newProps, deviceTwin.properties.desired);
          done();
        } else {
          debug('unexpected property version! test failure.');
          done(new Error('incorrect property version received - ' + props.$version));
        }
      });
    };

    var mergeDesiredProperties = function(first, second, newEtag, result, done) {
      var initialPropertyVersion = deviceTwin.properties.desired.$version;
      var firstUpdateVersion = initialPropertyVersion + 1;
      var secondUpdateVersion = firstUpdateVersion + 1;
      debug('initial property version: ' + initialPropertyVersion);
      debug('first update version: ' + firstUpdateVersion);
      debug('second update version: ' + secondUpdateVersion);
      deviceTwin.on('properties.desired', function(props) {
        debug('property update with $version: ' + props.$version);
        if (props.$version === initialPropertyVersion) {
          debug('received initial properties');
          setTimeout(function () {
            debug('sending first desired properties update');
            serviceTwin.update( { properties : { desired : first } }, function(err) {
              if (err) {
                debug('failed to send the first desired properties update');
                return done(err);
              } else {
                debug('first desired properties update successful');
              }
            });
          }, 3000);
        } else if (props.$version === firstUpdateVersion) {
          setTimeout(function () {
            if (newEtag) {
              debug('setting serviceTwin etag: ' + newEtag);
              assert.isDefined(serviceTwin.etag);
              assert.notEqual(serviceTwin.etag, "*");
              serviceTwin.etag = newEtag;
           }
           debug('sending second desired properties update');
           serviceTwin.update( { properties : { desired : second } }, function(err) {
             if (err) {
               debug('failed to send the second desired properties update.');
               return done(err);
             } else {
               debug('service successfully updated the desired properties');
             }
           });
          }, 3000);
        } else if (props.$version >= secondUpdateVersion) {
          debug('second update received. asserting equality');
          assertObjectsAreEqual(deviceTwin.properties.desired, result);
          debug('desired properties received. test successful');
          done();
        } else {
          debug('unexpected property version received: ' + props.$version + ' ; test failure!');
          done(new Error('incorrect property version received - ' + props.$version));
        }
      });
    };

    it('service sends desired properties and device receives them', sendsAndReceivesDesiredProperties);

    it('service sends new desired properties, they are merged and the device receives them', function(done) {
      mergeDesiredProperties(newProps, moreNewProps, null, mergeResult, done);
    });

    it('service sends desired properties using etag *, they are merged and the device receives them', function(done) {
      mergeDesiredProperties(newProps, moreNewProps, "*", mergeResult, done);
    });

    var mergeTags =  function(first, second, newEtag, result, done) {
      debug('sending first tag update..');
      serviceTwin.update( { tags : first }, function(err) {
        if (err) {
          debug('error updating tags: ' + err.toString());
          return done(err);
        } else {
          debug('first twin update sent');
          if (newEtag) {
            assert.isDefined(serviceTwin.etag);
            assert.notEqual(serviceTwin.etag, "*");
            debug('setting twin etag to: ' + newEtag);
            serviceTwin.etag = newEtag;
          }

          debug('sending second tag update...');
          serviceTwin.update( { tags: second }, function(err) {
            if (err) {
              debug('error sending second tag update: ' + err.toString());
              return done(err);
            } else {
              debug('second tag update sent');
              assertObjectsAreEqual(serviceTwin.tags, result);
              done();
            }
          });
        }
      });
    };

    it('service can get and set tags', function(done) {
      assertObjectIsEmpty(serviceTwin.tags);

      serviceTwin.update( { tags : newProps }, function(err) {
        if (err) return done(err);

        assertObjectsAreEqual(newProps, serviceTwin.tags);
        done();
      });
    });

    it('service can merge new tags', function(done) {
      mergeTags(newProps, moreNewProps, null, mergeResult, done);
    });

    it('service can merge new tags using etag *', function(done) {
      mergeTags(newProps, moreNewProps, "*", mergeResult, done);
    });

    it('can send reported properties to the service after renewing the sas token', function(done) {
      var newSas = deviceSas.create(ConnectionString.parse(hubConnectionString).HostName, deviceDescription.deviceId, deviceDescription.authentication.symmetricKey.primaryKey, anHourFromNow()).toString();
      debug('updating the shared access signature for device: ' + deviceDescription.deviceId);
      deviceClient.updateSharedAccessSignature(newSas, function (err) {
        if (err) {
          debug('error renewing the shared access signature: ' + err.toString());
          done(err);
        } else {
          debug('updating reported properties');
          sendsAndReceiveReportedProperties(done);
        }
      });
    });

    it('can receive desired properties from the service after renewing the sas token', function(done) {
      var newSas = deviceSas.create(ConnectionString.parse(hubConnectionString).HostName, deviceDescription.deviceId, deviceDescription.authentication.symmetricKey.primaryKey, anHourFromNow()).toString();
      debug('updating the shared access signature for device: ' + deviceDescription.deviceId);
      deviceClient.updateSharedAccessSignature(newSas, function (err) {
        if (err) {
          debug('error renewing the shared access signature: ' + err.toString());
          done(err);
        } else {
          debug('updating desired properties');
          sendsAndReceivesDesiredProperties(done);
        }
      });
    });

    it.skip('call null out all reported properties', function(done) {
      mergeReportedProperties(newProps, null, {}, done);
    });

    it('can null out individual reported properties', function(done) {
      mergeReportedProperties(newProps, nullIndividualProps, nullMergeResult, done);
    });

    it('can null out all desired properties', function(done) {
      mergeDesiredProperties(newProps, null, null, {}, done);
    });

    it('can null out individual desired properties', function(done) {
      mergeDesiredProperties(newProps, nullIndividualProps, null, nullMergeResult, done);
    });

    it('can null out all desired properties with etag *', function(done) {
      mergeDesiredProperties(newProps, null, "*", {}, done);
    });

    it('can null out individual desired properties with etag *', function(done) {
      mergeDesiredProperties(newProps, nullIndividualProps, "*", nullMergeResult, done);
    });

    it('can null out all tags', function(done) {
      mergeTags(newProps, null, null, {}, done);
    });

    it('can null out individual tags', function(done) {
      mergeTags(newProps, nullIndividualProps, null, nullMergeResult, done);
    });

    it('can null out all tags with etag *', function(done) {
      mergeTags(newProps, null, "*", {}, done);
    });

    it('can null out individual tags with etag *', function(done) {
      mergeTags(newProps, nullIndividualProps, "*", nullMergeResult, done);
    });

    it('can set desired properties while the client is disconnected', function(done) {
      async.series([
        function setDesiredProperties(callback) {
          serviceTwin.update( { properties : { desired : newProps } }, callback);
        },
        function closeDeviceClient(callback) {
          deviceClient.close(callback);
        },
        function setDesiredPropertiesAgain(callback) {
          serviceTwin.update( { properties : { desired : moreNewProps } }, callback);
        },
        function openDeviceClientAgain(callback) {
          deviceClient = deviceSdk.Client.fromConnectionString(deviceDescription.connectionString, protocolCtor);
          deviceClient.open(callback);
        },
        function getDeviceTwin(callback) {
          deviceClient.getTwin(function(err, twin) {
              if (err) return callback(err);
              deviceTwin = twin;
              callback();
          });
        },
        function validateProperties(callback) {
            assertObjectsAreEqual(deviceTwin.properties.desired, mergeResult);
            callback();
        }
      ], done);
    });

    it.skip('can disconnect and reconnect without recreating the transport', function(testCallback) {
      deviceClient.close(function(err) {
        if (err) return testCallback(err);
        deviceClient.open(function(err) {
          if (err) return testCallback(err);
          deviceClient.getTwin(function(err, newTwin) {
            if (err) return testCallback(err);
            assert.strictEqual(newTwin, deviceTwin);
            testCallback();
          });
        });
      });
    });
  });
});
