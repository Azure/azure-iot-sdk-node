// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Promise = require('bluebird');
var assert = require('chai').assert;
var sinon = require('sinon');
require('sinon-as-promised');
var Amqp = require('../lib/amqp.js');
var AmqpReceiver = require('../lib/amqp_receiver.js');
var results = require('azure-iot-common').results;
var errors = require('azure-iot-common').errors;
var Message = require('azure-iot-common').Message;
var EventEmitter = require('events').EventEmitter;


describe('Amqp', function () {
  describe('#connect', function () {
    /* Tests_SRS_NODE_COMMON_AMQP_06_002: [The connect method shall throw a ReferenceError if the uri parameter has not been supplied.] */
    [undefined, null, ''].forEach(function (badUri){
      it('throws if uri is \'' + badUri +'\'', function () {
        var newClient = new Amqp();
        assert.throws(function () {
          newClient.connect(badUri);
        }, ReferenceError, '');
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_002: [The connect method shall establish a connection with the IoT hub instance and if given as argument call the `done` callback with a null error object in the case of success and a `results.Connected` object.]*/
    it('Calls the done callback when successfully connected', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      amqp.connect('uri', null, function(err, res) {
        if (err) testCallback(err);
        else {
          assert.instanceOf(res, results.Connected);
          testCallback();
        }
      });
    });

    it('Calls the done callback immediately when already connected', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').rejects('amqp10.client.connect should not be called');
      amqp._connected = true;
      amqp.connect('uri', null, function(err, res) {
        if (err) testCallback(err);
        else {
          assert.instanceOf(res, results.Connected);
          testCallback();
        }
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_003: [If given as an argument, the connect method shall call the `done` callback with a standard `Error` object if the connection fails.]*/
    it('Calls the done callback with an error if connecting fails (disconnected)', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').rejects('connection failed');
      amqp.connect('uri', null, function(err) {
        assert.instanceOf(err, Error);
        testCallback();
      });
    });

    it('Calls the done callback with an error if connecting fails (auth error)', function(testCallback) {
      var amqp = new Amqp();
      var testError = new Error();
      sinon.stub(amqp._amqp, 'connect', function() {
        return new Promise(function (resolve, reject) {
          amqp._amqp.emit('client:errorReceived', testError);
          reject(new Error('cannot connect'));
        });
      });
      amqp.connect('uri', null, function(err) {
        assert.strictEqual(err, testError);
        testCallback();
      });
    });
  });

  describe('#setDisconnectHandler', function() {
    it('disconnect callback is called when the \'connection:closed\' event is emitted', function(testCallback) {
      var amqp = new Amqp();
      amqp.setDisconnectHandler(function() {
        testCallback();
      });

      amqp._amqp.emit('connection:closed');
    });
  });

  describe('#disconnect', function() {
    /*Tests_SRS_NODE_COMMON_AMQP_16_004: [The disconnect method shall call the `done` callback when the application/service has been successfully disconnected from the service]*/
    it('calls the done callback if disconnected successfully', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'disconnect').resolves();
      amqp.disconnect(function(err) {
        if (err) testCallback(err);
        else {
          testCallback();
        }
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_005: [The disconnect method shall call the `done` callback and pass the error as a parameter if the disconnection is unsuccessful]*/
    it('calls the done callback with an error if there\'s an error while disconnecting', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'disconnect').rejects('disconnection error');
      amqp.disconnect(function(err) {
        if (err) {
          assert.instanceOf(err, Error);
          testCallback();
        } else {
          testCallback(new Error('disconnect callback was called without an error'));
        }
      });
    });
  });

  describe('#send', function() {
    it('calls the done callback with an error if not connected', function(testCallback) {
      var amqp = new Amqp();
      amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err) {
        assert.instanceOf(err, Error);
        testCallback();
      });
    });

    it('calls the done callback with a MessageEnqueued result if it successful', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().resolves('message enqueued');
      
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      amqp.connect('uri', null, function() {
        amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err, result) {
          if(!err) {
            assert.instanceOf(result, results.MessageEnqueued);
          }
          testCallback(err);
        
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_007: [If send encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
    it('calls the done callback with an Error if creating a sender fails', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().resolves('message enqueued');
      
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').rejects('failed to create sender');

      amqp.connect('uri', null, function() {
        amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err) {
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });

    it('calls the done callback with an Error if the sender fails to send the message', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().rejects('could not send');
      
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      amqp.connect('uri', null, function() {
        amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err) {
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });

    it('Reuses the same sender link if already created', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      var endpointName = 'endpoint';
      sender.send = sinon.stub().resolves('message enqueued');
      amqp._senders[endpointName] = sender;

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').rejects('createSender should not be called');

      amqp.connect('uri', null, function() {
        amqp.send(new Message('message'), endpointName, 'deviceId', function(err, result) {
          if (!err) {
            assert.instanceOf(result, results.MessageEnqueued);
          }
          testCallback(err);
        });
      });
    });

    it('does not populate a the \'to\' property of the amqp message if not passed', function(testCallback) {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().resolves('message enqueued');
      
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      assert.doesNotThrow(function() {
        amqp.connect('uri', null, function() {
          amqp.send(new Message('message'), 'endpoint', undefined, function() {
            assert.isUndefined(sender.send.args[0][0].properties.to);
            testCallback();
          });
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_011: [All methods should treat the `done` callback argument as optional and not throw if it is not passed as argument.]*/
    it('does not throw on success if no callback is provided', function() {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().resolves('message enqueued');
      
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      assert.doesNotThrow(function() {
        amqp.connect('uri', null, function() {
          amqp.send(new Message('message'), 'endpoint', 'deviceId');
        });
      });
    });

    it('does not throw on error if no callback is provided', function() {
      var amqp = new Amqp();
      var sender = new EventEmitter();
      sender.send = sinon.stub().rejects('failed to enqueue message');
      
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      assert.doesNotThrow(function() {
        amqp.connect('uri', null, function() {
          amqp.send(new Message('message'), 'endpoint', 'deviceId');
        });
      });
    });
  });

  describe('#getReceiver', function() {
    /*Tests_SRS_NODE_COMMON_AMQP_16_010: [If a receiver for this endpoint doesn't exist, the getReceiver method should create a new AmqpReceiver object and then call the `done` method with the object that was just created as an argument.]*/
    it('calls the done callback with a null Error and a receiver if successful', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createReceiver').resolves('receiver');

      amqp.connect('uri', null, function() {
        amqp.getReceiver('endpoint', function(err, receiver) {
          assert.instanceOf(receiver, AmqpReceiver);
          testCallback(err);
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_009: [If a receiver for this endpoint has already been created, the getReceiver method should call the `done` method with the existing instance as an argument.]*/
    it('gets the existing receiver for an endpoint if it was previously created', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createReceiver').resolves(new AmqpReceiver('fake'));

      amqp.connect('uri', null, function() {
        amqp.getReceiver('endpoint', function(err, recv1) {
          if (err) {
            testCallback(err);
          } else {
            amqp.getReceiver('endpoint', function(err, recv2) {
              if (err) {
                testCallback(err);
              } else {
                assert.equal(recv1, recv2);
                testCallback();
              }
            });
          }
        });
      });

    });

    it('calls the done callback with an Error if it fails', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createReceiver').rejects(new Error('cannt create receiver'));

      amqp.connect('uri', null, function() {
        amqp.getReceiver('endpoint', function(err) {
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });
  });

  describe('Links', function() {
    var endpoint = 'endpoint';
    [
      {amqpFunc: 'attachSenderLink', amqp10Func: 'createSender', privateLinkArray: '_senders', fakeLinkObject: { send: function() {} }},
      {amqpFunc: 'attachReceiverLink', amqp10Func: 'createReceiver', privateLinkArray: '_receivers', fakeLinkObject: { endpoint: endpoint }},
    ].forEach(function(testConfig) {
      describe('#' + testConfig.amqpFunc, function() {
        /*Tests_SRS_NODE_COMMON_AMQP_16_012: [The `attachSenderLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_017: [The `attachReceiverLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
        [null, undefined, ''].forEach(function(badEndpoint) {
          it('throws if the endpoint is \'' + badEndpoint + '\'', function() {
            var amqp = new Amqp();
            assert.throws(function() {
              amqp[testConfig.amqpFunc](badEndpoint, null, function() {});
            }, ReferenceError);
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_032: [The `attachSenderLink` method shall call the `done` callback with a `NotConnectedError` object if the amqp client is not connected when the method is called.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_033: [The `attachReceiverLink` method shall call the `done` callback with a `NotConnectedError` object if the amqp client is not connected when the method is called.]*/
        it('calls the done callback with a NotConnectedError if the client is not connected', function(testCallback) {
          var amqp = new Amqp();
          amqp[testConfig.amqpFunc](endpoint, null, function(err) {
            assert.instanceOf(err, errors.NotConnectedError);
            testCallback();
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_013: [The `attachSenderLink` method shall call `createSender` on the `amqp10` client object.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_018: [The `attachReceiverLink` method shall call `createReceiver` on the `amqp10` client object.]*/
        it('calls ' + testConfig.amqp10Func + ' and passes the endpoint on amqp10.AmqpClient', function(testCallback) {
          var amqp = new Amqp();
          sinon.stub(amqp._amqp, 'connect').resolves('connected');
          sinon.stub(amqp._amqp, testConfig.amqp10Func).resolves(testConfig.fakeLinkObject);
          amqp.connect('uri', null, function() {
            amqp[testConfig.amqpFunc](endpoint, null, function(err, result) {
              assert.isNull(err);
              assert.isUndefined(amqp._amqp[testConfig.amqp10Func].args[0][1]);
              assert.isOk(result);
              assert.strictEqual(result, amqp[testConfig.privateLinkArray][endpoint]);
              testCallback();
            });
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_014: [The `attachSenderLink` method shall create a policy object that contain link properties to be merged is the properties argument is not falsy.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_019: [The `attachReceiverLink` method shall create a policy object that contain link properties to be merged is the properties argument is not falsy.]*/
        it('sets up the attach properties object with the link properties passed as argument', function(testCallback) {
          var amqp = new Amqp();
          var endpoint = 'endpoint';
          var fakeLinkProps = {
            fakeKey: 'fakeValue'
          };

          sinon.stub(amqp._amqp, 'connect').resolves('connected');
          sinon.stub(amqp._amqp, testConfig.amqp10Func).resolves(testConfig.fakeLinkObject);
          amqp.connect('uri', null, function() {
            /*Tests_SRS_NODE_COMMON_AMQP_16_015: [The `attachSenderLink` method shall call the `done` callback with a `null` error and the link object that was created if the link was attached successfully.]*/
            /*Tests_SRS_NODE_COMMON_AMQP_16_020: [The `attachReceiverLink` method shall call the `done` callback with a `null` error and the link object that was created if the link was attached successfully.]*/
            amqp[testConfig.amqpFunc](endpoint, fakeLinkProps, function() {
              assert.deepEqual(amqp._amqp[testConfig.amqp10Func].args[0][1], { attach: { properties: fakeLinkProps }});
              testCallback();
            });
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_016: [The `attachSenderLink` method shall call the `done` callback with an `Error` object if the link object wasn't created successfully.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_021: [The `attachReceiverLink` method shall call the `done` callback with an `Error` object if the link object wasn't created successfully.]*/
        it('calls the done callback with an error if attaching the link failed', function(testCallback) {
          var amqp = new Amqp();
          var fakeError = new Error('failed to create link');
          sinon.stub(amqp._amqp, 'connect').resolves('connected');
          sinon.stub(amqp._amqp, testConfig.amqp10Func).rejects(fakeError);
          amqp.connect('uri', null, function() {
            amqp[testConfig.amqpFunc]('endpoint', null, function(err) {
              assert.strictEqual(fakeError, err.amqpError);
              testCallback();
            });
          });
        });

        it('calls the done callback with an error if the connection fails while trying to attach the link', function(testCallback) {
          var amqp = new Amqp();
          var fakeError = new Error('failed to create sender');
          sinon.stub(amqp._amqp, 'connect').resolves('connected');
          sinon.stub(amqp._amqp, testConfig.amqp10Func).resolves(testConfig.fakeLinkObject);
          amqp.connect('uri', null, function() {
            amqp[testConfig.amqpFunc]('endpoint', null, function(err) {
              assert.strictEqual(fakeError, err);
              testCallback();
            });

            amqp._amqp.emit('client:errorReceived', fakeError);
          });
        });
      });
    });

    [
      {amqpFunc: 'detachSenderLink', privateLinkArray: '_senders' },
      {amqpFunc: 'detachReceiverLink', privateLinkArray: '_receivers' },
    ].forEach(function(testConfig) {
      describe('#' + testConfig.amqpFunc, function() {
        /*Tests_SRS_NODE_COMMON_AMQP_16_022: [The `detachSenderLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_027: [The `detachReceiverLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
        [null, undefined, ''].forEach(function(badEndpoint) {
          it('throws if the endpoint is \'' + badEndpoint + '\'', function() {
            var amqp = new Amqp();
            assert.throws(function() {
              amqp[testConfig.amqpFunc](badEndpoint, null, function() {});
            }, ReferenceError);
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_023: [The `detachSenderLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_028: [The `detachReceiverLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
        it('calls the \'detach\' method on the link object', function (testCallback) {
          var fakeLink = {
            detach: function () { return new Promise(function() {}); }
          };
          sinon.stub(fakeLink, 'detach').resolves();

          var amqp = new Amqp();
          amqp[testConfig.privateLinkArray][endpoint] = fakeLink;
          /*Tests_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
          /*Tests_SRS_NODE_COMMON_AMQP_16_029: [The `detachReceiverLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
          amqp[testConfig.amqpFunc](endpoint, function(err) {
            assert.isUndefined(err);
            assert.isUndefined(amqp[testConfig.privateLinkArray][endpoint]);
            testCallback();
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_025: [The `detachSenderLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_030: [The `detachReceiverLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
        it('calls the callback  immediately if there\'s no link attached', function (testCallback) {
          var fakeLink = {
            detach: function () { return new Promise(function() {}); }
          };
          sinon.stub(fakeLink, 'detach').resolves();

          var amqp = new Amqp();
          assert.isUndefined(amqp[testConfig.privateLinkArray][endpoint]);
          amqp[testConfig.amqpFunc](endpoint, function(err) {
            assert.isUndefined(err);
            assert.isUndefined(amqp[testConfig.privateLinkArray][endpoint]);
            testCallback();
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_026: [The `detachSenderLink` method shall call the `done` callback with an `Error` object if there was an error while detaching the link.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_031: [The `detachReceiverLink` method shall call the `done` callback with an `Error` object if there was an error while detaching the link.]*/
        it('calls the callback with an error if detaching the link causes an error', function (testCallback) {
          var fakeError = new Error('failed to detach');
          var fakeLink = {
            detach: function () { return new Promise(function() {}); }
          };
          sinon.stub(fakeLink, 'detach').rejects(fakeError);

          var amqp = new Amqp();
          amqp[testConfig.privateLinkArray][endpoint] = fakeLink;
          amqp[testConfig.amqpFunc](endpoint, function(err) {
            assert.strictEqual(fakeError, err);
            assert.isUndefined(amqp[testConfig.privateLinkArray][endpoint]);
            testCallback();
          });
        });
      });
    });
  });
});