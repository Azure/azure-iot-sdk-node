// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var fs = require('fs');

var ConnectionString = require('azure-iot-common').ConnectionString;
var NoRetry = require('azure-iot-common').NoRetry;

var Message = require('azure-iot-common').Message;

var host = ConnectionString.parse(process.env.IOTHUB_CONNECTION_STRING).HostName;
var deviceId = 'node-client-integration-' + Math.random();

function makeConnectionString(host, device, key) {
  return 'HostName=' + host + ';DeviceId=' + device + ';SharedAccessKey=' + key;
}

var x509Certificate = 'cert';
var x509Key = 'key';
var x509Passphrase = 'pass';
var x509ConnectionString = 'HostName=' + host + ';DeviceId=x509Device;x509=true';

function badConfigTests(opName, Client, Transport, requestFn) {
  var badConnectionStrings = [
    makeConnectionString('bad' + Math.random(), deviceId, 'key=='),
    makeConnectionString(host, 'bad' + Math.random(), 'key=='),
    makeConnectionString(host, deviceId, 'bad')
  ];

  function makeRequestWith(connectionString, test, done) {
    var client = Client.fromConnectionString(connectionString, Transport);
    client.setRetryPolicy(new NoRetry());
    client.open(function(err) {
      if (err) {
        test(err);
        client.close(done);
      } else {
        requestFn(client, function (err, res) {
          test(err, res);
          client.close(done);
        });
      }
    });
  }

  var tests = [
    { name: 'hostname is malformed', expect: assert.isNotNull },
    { name: 'device is not registered', expect: assert.isNotNull },
    { name: 'password is wrong', expect: assert.isNotNull }
  ];

  /*Tests_SRS_NODE_INTERNAL_CLIENT_05_016: [When a Client method encounters an error in the transport, the callback function (indicated by the done argument) shall be invoked with the following arguments:
  err - the standard JavaScript Error object, with a response property that points to a transport-specific response object, and a responseBody property that contains the body of the transport response.]*/
  badConnectionStrings.forEach(function (test, index) {
    it('fails to ' + opName + ' when the ' + tests[index].name, function (done) {
      makeRequestWith(test, tests[index].expect, done);
    });
  });
}

function singleMessageTests(Client, Transport, registry, testName, requestFn) {
  describe(testName, function () {
    badConfigTests('send an event', Client, Transport, function (client, done) {
      requestFn(client, done);
    });

    describe('#' + testName + ' with a SharedAccessKey', function () {
      var sakConnectionString;
      before(function(done) {
        registry.create({ deviceId: deviceId, status: "enabled" }, function(err, device) {
          sakConnectionString = makeConnectionString(host, deviceId, device.authentication.symmetricKey.primaryKey);
          done();
        });
      });

      after(function(done) {
        registry.delete(deviceId, done);
      });
      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_007: [The sendEvent method shall send the event indicated by the message argument via the transport associated with the Client instance.]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_017: [With the exception of receive, when a Client method completes successfully, the callback function (indicated by the done argument) shall be invoked with the following arguments:
      err - null
      response - a transport-specific response object]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_18_010: [The `sendOutputEvent` method shall send the event indicated by the `message` argument via the transport associated with the Client instance. ]*/
      it('sends the event when the client is opened', function (done) {
        var client = Client.fromConnectionString(sakConnectionString, Transport);

        client.open(function (err, res) {
          if (err) {
            done(err);
          } else {
            assert.equal(res.constructor.name, 'Connected', 'Type of the result object of the client.open method is wrong');
            requestFn(client, function (err, res) {
              if (err) {
                done(err);
              } else {
                assert.equal(res.constructor.name, 'MessageEnqueued', 'Type of the result object of the client.sendEvent method is wrong');
                client.close(function (err) {
                  done(err);
                });
              }
            });
          }
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_048: [The `sendEvent` method shall automatically connect the transport if necessary.]*/
      it('sends the event and automatically opens the client if necessary', function(done) {
        var client = Client.fromConnectionString(sakConnectionString, Transport);
        requestFn(client, function (err, res) {
          if (err) {
            done(err);
          } else {
            assert.equal(res.constructor.name, 'MessageEnqueued', 'Type of the result object of the client.sendEvent method is wrong');
            client.close(function (err) {
              done(err);
            });
          }
        });
      });
    });

    describe('#' + testName + ' with an x509 certificate', function () {
      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_007: [The sendEvent method shall send the event indicated by the message argument via the transport associated with the Client instance.]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_017: [With the exception of receive, when a Client method completes successfully, the callback function (indicated by the done argument) shall be invoked with the following arguments:
      err - null
      response - a transport-specific response object]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_18_010: [The `sendOutputEvent` method shall send the event indicated by the `message` argument via the transport associated with the Client instance. ]*/
      it('sends the event', function (done) {
        var client = Client.fromConnectionString(x509ConnectionString, Transport);
        client.setOptions({
          cert: x509Certificate,
          key: x509Key,
          passphrase: x509Passphrase
        });

        client.open(function (err, res) {
          if (err) {
            done(err);
          } else {
            assert.equal(res.constructor.name, 'Connected', 'Type of the result object of the client.open method is wrong');
            requestFn(client, function (err, res) {
              if (err) {
                done(err);
              } else {
                assert.equal(res.constructor.name, 'MessageEnqueued', 'Type of the result object of the client.sendEvent method is wrong');
                client.close(function (err) {
                  done(err);
                });
              }
            });
          }
        });
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_16_048: [The `sendEvent` method shall automatically connect the transport if necessary.]*/
      it('sends the event and automatically opens the client if necessary', function(done) {
        var client = Client.fromConnectionString(x509ConnectionString, Transport);
        client.setOptions({
          cert: x509Certificate,
          key: x509Key,
          passphrase: x509Passphrase
        });
        requestFn(client, function (err, res) {
          if (err) {
            done(err);
          } else {
            assert.equal(res.constructor.name, 'MessageEnqueued', 'Type of the result object of the client.sendEvent method is wrong');
            client.close(function (err) {
              done(err);
            });
          }
        });
      });
    });
  });
}

function batchMessageTests(Client, Transport, registry, testName, requestFn) {
  describe(testName, function () {
    badConfigTests('send an event batch', Client, Transport, function (client, done) {
      requestFn(client, done);
    });

    describe('#' + testName + ' with a Shared Access Key', function() {
      var sakConnectionString;
      before(function(done) {
        registry.create({ deviceId: deviceId, status: "enabled" }, function(err, device) {
          sakConnectionString = makeConnectionString(host, deviceId, device.authentication.symmetricKey.primaryKey);
          done();
        });
      });

      after(function(done) {
        registry.delete(deviceId, done);
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_008: [The sendEventBatch method shall send the list of events (indicated by the messages argument) via the transport associated with the Client instance.]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_017: [With the exception of receive, when a Client method completes successfully, the callback function (indicated by the done argument) shall be invoked with the following arguments:
      err - null
      response - a transport-specific response object]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_18_011: [The `sendOutputEventBatch` method shall send the list of events (indicated by the `messages` argument) via the transport associated with the Client instance. ]*/
      it('sends the event batch message', function (done) {
        var client = Client.fromConnectionString(sakConnectionString, Transport);

        requestFn(client, function (err, res) {
          if (err) {
            client.close(function () {
              done(err);
            });
          } else {
            assert.equal(res.constructor.name, 'MessageEnqueued');
            client.close(done);
          }
        });
      });
    });

    describe('#sendEventBatch with an x509 certificate', function() {
      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_008: [The sendEventBatch method shall send the list of events (indicated by the messages argument) via the transport associated with the Client instance.]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_017: [With the exception of receive, when a Client method completes successfully, the callback function (indicated by the done argument) shall be invoked with the following arguments:
      err - null
      response - a transport-specific response object]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_18_011: [The `sendOutputEventBatch` method shall send the list of events (indicated by the `messages` argument) via the transport associated with the Client instance. ]*/
      it('sends the event batch message', function (done) {
        var client = Client.fromConnectionString(x509ConnectionString, Transport);
        client.setOptions({
          cert: x509Certificate,
          key: x509Key,
          passphrase: x509Passphrase
        });

        requestFn(client, function (err, res) {
          if (err) {
            done(err);
          } else {
            assert.equal(res.constructor.name, 'MessageEnqueued');
            done();
          }
        });
      });
    });
  });
}

var sendEventTests = function(Client, Transport, registry) {
  var message = new Message('hello');
  singleMessageTests(Client, Transport, registry, 'Client.sendEvent', function (client, done) {
    client.sendEvent(message, done);
  });
}

var sendOutputEventTests = function(Client, Transport, registry) {
  var message = new Message('hello');
  singleMessageTests(Client, Transport, registry, 'Client.sendOutputEvent', function (client, done) {
    client.sendOutputEvent('outputName', message, done);
  });
}

var sendEventBatchTests = function(Client, Transport, registry) {
  var messages = [];
  for (var i = 0; i < 5; i++) {
    messages[i] = new Message('Event Msg ' + i);
  }
  batchMessageTests(Client, Transport, registry, 'client.sendEventBatch', function (client, done) {
    client.sendEventBatch(messages, done);
  });
}

var sendOutputEventBatchTests = function(Client, Transport, registry) {
  var messages = [];
  for (var i = 0; i < 5; i++) {
    messages[i] = new Message('Event Msg ' + i);
  }
  batchMessageTests(Client, Transport, registry, 'client.sendOutputEventBatch', function (client, done) {
    client.sendOutputEventBatch('outputName', messages, done);
  });
}


module.exports = {
  sendEventTests: sendEventTests,
  sendEventBatchTests: sendEventBatchTests,
  sendOutputEventTests: sendOutputEventTests,
  sendOutputEventBatchTests: sendOutputEventBatchTests
};

