// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let assert = require('chai').assert;

let ConnectionString = require('azure-iot-common').ConnectionString;
let NoRetry = require('azure-iot-common').NoRetry;

let Message = require('azure-iot-common').Message;

let host = ConnectionString.parse(process.env.IOTHUB_CONNECTION_STRING).HostName;
let deviceId = 'node-client-integration-' + Math.random();

function makeConnectionString(host, device, key) {
  return 'HostName=' + host + ';DeviceId=' + device + ';SharedAccessKey=' + key;
}

let x509Certificate = 'cert';
let x509Key = 'key';
let x509Passphrase = 'pass';
let x509ConnectionString = 'HostName=' + host + ';DeviceId=x509Device;x509=true';

function badConfigTests(opName, Client, Transport, requestFn) {
  let badConnectionStrings = [
    makeConnectionString('bad' + Math.random(), deviceId, 'key=='),
    makeConnectionString(host, 'bad' + Math.random(), 'key=='),
    makeConnectionString(host, deviceId, 'bad')
  ];

  function makeRequestWith(connectionString, test, done) {
    let client = Client.fromConnectionString(connectionString, Transport);
    client.setRetryPolicy(new NoRetry());
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    client.open(function (err) {
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

  let tests = [
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
      let sakConnectionString;
      before(function (done) {
        registry.create({ deviceId: deviceId, status: "enabled" }, function (err, device) {
          sakConnectionString = makeConnectionString(host, deviceId, device.authentication.symmetricKey.primaryKey);
          done();
        });
      });

      after(function (done) {
        registry.delete(deviceId, done);
      });
      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_007: [The sendEvent method shall send the event indicated by the message argument via the transport associated with the Client instance.]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_017: [With the exception of receive, when a Client method completes successfully, the callback function (indicated by the done argument) shall be invoked with the following arguments:
      err - null
      response - a transport-specific response object]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_18_010: [The `sendOutputEvent` method shall send the event indicated by the `message` argument via the transport associated with the Client instance. ]*/
      it('sends the event when the client is opened', function (done) {
        let client = Client.fromConnectionString(sakConnectionString, Transport);

        // eslint-disable-next-line security/detect-non-literal-fs-filename
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
      it('sends the event and automatically opens the client if necessary', function (done) {
        let client = Client.fromConnectionString(sakConnectionString, Transport);
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
        let client = Client.fromConnectionString(x509ConnectionString, Transport);
        client.setOptions({
          cert: x509Certificate,
          key: x509Key,
          passphrase: x509Passphrase
        });

        // eslint-disable-next-line security/detect-non-literal-fs-filename
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
      it('sends the event and automatically opens the client if necessary', function (done) {
        let client = Client.fromConnectionString(x509ConnectionString, Transport);
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

    describe('#' + testName + ' with a Shared Access Key', function () {
      let sakConnectionString;
      before(function (done) {
        registry.create({ deviceId: deviceId, status: "enabled" }, function (err, device) {
          sakConnectionString = makeConnectionString(host, deviceId, device.authentication.symmetricKey.primaryKey);
          done();
        });
      });

      after(function (done) {
        registry.delete(deviceId, done);
      });

      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_008: [The sendEventBatch method shall send the list of events (indicated by the messages argument) via the transport associated with the Client instance.]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_017: [With the exception of receive, when a Client method completes successfully, the callback function (indicated by the done argument) shall be invoked with the following arguments:
      err - null
      response - a transport-specific response object]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_18_011: [The `sendOutputEventBatch` method shall send the list of events (indicated by the `messages` argument) via the transport associated with the Client instance. ]*/
      it('sends the event batch message', function (done) {
        let client = Client.fromConnectionString(sakConnectionString, Transport);

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

    describe('#sendEventBatch with an x509 certificate', function () {
      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_008: [The sendEventBatch method shall send the list of events (indicated by the messages argument) via the transport associated with the Client instance.]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_05_017: [With the exception of receive, when a Client method completes successfully, the callback function (indicated by the done argument) shall be invoked with the following arguments:
      err - null
      response - a transport-specific response object]*/
      /*Tests_SRS_NODE_INTERNAL_CLIENT_18_011: [The `sendOutputEventBatch` method shall send the list of events (indicated by the `messages` argument) via the transport associated with the Client instance. ]*/
      it('sends the event batch message', function (done) {
        let client = Client.fromConnectionString(x509ConnectionString, Transport);
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

let sendEventTests = function (Client, Transport, registry) {
  let message = new Message('hello');
  singleMessageTests(Client, Transport, registry, 'Client.sendEvent', function (client, done) {
    client.sendEvent(message, done);
  });
}

let sendOutputEventTests = function (Client, Transport, registry) {
  let message = new Message('hello');
  singleMessageTests(Client, Transport, registry, 'Client.sendOutputEvent', function (client, done) {
    client.sendOutputEvent('outputName', message, done);
  });
}

let sendEventBatchTests = function (Client, Transport, registry) {
  let messages = [];
  for (let i = 0; i < 5; i++) {
    messages[i] = new Message('Event Msg ' + i);
  }
  batchMessageTests(Client, Transport, registry, 'client.sendEventBatch', function (client, done) {
    client.sendEventBatch(messages, done);
  });
}

let sendOutputEventBatchTests = function (Client, Transport, registry) {
  let messages = [];
  for (let i = 0; i < 5; i++) {
    messages[i] = new Message('Event Msg ' + i);
  }
  batchMessageTests(Client, Transport, registry, 'client.sendOutputEventBatch', function (client, done) {
    client.sendOutputEventBatch('outputName', messages, done);
  });
}


// eslint-disable-next-line mocha/no-exports
module.exports = {
  sendEventTests: sendEventTests,
  sendEventBatchTests: sendEventBatchTests,
  sendOutputEventTests: sendOutputEventTests,
  sendOutputEventBatchTests: sendOutputEventBatchTests
};

