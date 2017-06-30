// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Promise = require('bluebird');
var assert = require('chai').assert;
var sinon = require('sinon');
var AmqpMessage = require('../lib/amqp_message.js').AmqpMessage;
var Amqp = require('../lib/amqp.js').Amqp;
var ReceiverLink = require('../lib/receiver_link.js').ReceiverLink;
var results = require('azure-iot-common').results;
var errors = require('azure-iot-common').errors;
var Message = require('azure-iot-common').Message;
var EventEmitter = require('events').EventEmitter;
var uuid = require('uuid');

var cbsReceiveEndpoint = '$cbs';
var cbsSendEndpoint = '$cbs';

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
    /*Tests_SRS_NODE_COMMON_AMQP_06_011: [The `connect` method shall set up a listener for responses to put tokens.]*/
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
      var connectStub = sinon.stub(amqp._amqp, 'connect').resolves();
      amqp.connect('uri', null, function(err, res) {
        if (err) testCallback(err);
        else {
          assert.instanceOf(res, results.Connected);
          assert(connectStub.calledOnce);
          amqp.connect('uri', null, function(err, res) {
            if (err) testCallback(err);
            else {
              assert.instanceOf(res, results.Connected);
              assert(connectStub.calledOnce);
            }
          });
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
      sinon.stub(amqp._amqp, 'connect').callsFake(function() {
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
    /*Tests_SRS_NODE_COMMON_AMQP_16_034: [The `disconnect` method shall detach all open links before disconnecting the underlying AMQP client.]*/
    it('detaches existing links before disconnecting the client', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves();
      sinon.stub(amqp._amqp, 'disconnect').resolves();
      var fakeSender = {
        detach: sinon.stub().resolves()
      };
      var fakeReceiver = {
        detach: sinon.stub().resolves()
      };

      amqp.connect('uri', null, function() {
        amqp._senders.fake_sender_endpoint = fakeSender;
        amqp._receivers.fake_receiver_endpoint = fakeReceiver;

        amqp.disconnect(function(err) {
          if (err) {
            testCallback(err);
          } else {
            assert(fakeSender.detach.calledOnce);
            assert(fakeReceiver.detach.calledOnce);
            testCallback();
          }
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_004: [The disconnect method shall call the `done` callback when the application/service has been successfully disconnected from the service]*/
    it('calls the done callback if disconnected successfully', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves();
      sinon.stub(amqp._amqp, 'disconnect').resolves();
      amqp.connect('uri', null, function() {
        amqp.disconnect(function(err) {
          if (err) testCallback(err);
          else {
            testCallback();
          }
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_005: [The disconnect method shall call the `done` callback and pass the error as a parameter if the disconnection is unsuccessful]*/
    it('calls the done callback with an error if there\'s an error while disconnecting', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves();
      sinon.stub(amqp._amqp, 'disconnect').rejects('disconnection error');
      amqp.connect('uri', null, function() {
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

    it('immediately calls the callback if already disconnected', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').rejects(new Error('connect should not have been called'));
      sinon.stub(amqp._amqp, 'disconnect').rejects(new Error('disconnect should not have been called'));
      amqp.disconnect(function(err) {
        assert.isNull(err);
        testCallback();
      });
    });
  });

  describe('#send', function() {
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

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(sender);

      amqp.connect('uri', null, function() {
        amqp.send(new Message('message'), endpointName, 'deviceId', function(err, result) {
          if (err) {
            testCallback(err);
          } else {
            assert.instanceOf(result, results.MessageEnqueued);
            assert(amqp._amqp.createSender.calledOnce);
            amqp.send(new Message('message'), endpointName, 'deviceId', function(err, result) {
              if (!err) {
                assert.instanceOf(result, results.MessageEnqueued);
                assert(amqp._amqp.createSender.calledOnce);
              }
              testCallback(err);
            });
          }
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
      sinon.stub(amqp._amqp, 'createReceiver').resolves(new EventEmitter());

      amqp.connect('uri', null, function() {
        amqp.getReceiver('endpoint', function(err, receiver) {
          assert.instanceOf(receiver, ReceiverLink);
          testCallback(err);
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_009: [If a receiver for this endpoint has already been created, the getReceiver method should call the `done` method with the existing instance as an argument.]*/
    it('gets the existing receiver for an endpoint if it was previously created', function(testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createReceiver').resolves(new EventEmitter());

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

  describe('#initializeCBS', function() {
    it('tries to connect the client if it is disconnected', function(testCallback) {
      var amqp = new Amqp();
      var fakeSender = new EventEmitter();
      fakeSender.forceDetach = function () {};
      var fakeReceiver = new EventEmitter();
      fakeReceiver.forceDetach = function () {};
      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(fakeSender);
      sinon.stub(amqp._amqp, 'createReceiver').resolves(fakeReceiver);

      amqp.initializeCBS(function() {
        assert(amqp._amqp.connect.calledOnce);
        testCallback();
      });
    });

    it('calls the callback with an error if the client cannot be connected', function (testCallback) {
      var amqp = new Amqp();
      var fakeError = new Error('fake error');
      sinon.stub(amqp._amqp, 'connect').rejects(fakeError);

      amqp.initializeCBS(function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });
  });

  describe('#putToken', function() {
    it('tries to connect the client and initialize the CBS endpoints if necessary', function(testCallback) {
      var fakeUuid = uuid.v4();
      var uuidStub = sinon.stub(uuid,'v4');
      uuidStub.onCall(0).returns(fakeUuid);

      var amqp = new Amqp();
      var fakeReceiver = new EventEmitter();
      fakeReceiver.accept = sinon.stub();
      fakeReceiver.forceDetach = function () {};

      var fakeSender = new EventEmitter();
      fakeSender.send = function() {
        return new Promise(function (resolve, reject) {
          resolve();
          fakeReceiver.emit('message', responseMessage);
        });
      };
      fakeSender.forceDetach = function () {};

      var responseMessage = new AmqpMessage();
      responseMessage.properties = {};
      responseMessage.applicationProperties = {};
      responseMessage.properties.correlationId = fakeUuid;
      responseMessage.applicationProperties['status-code'] = 200;

      sinon.stub(amqp._amqp, 'connect').resolves('connected');
      sinon.stub(amqp._amqp, 'createSender').resolves(fakeSender);
      sinon.stub(amqp._amqp, 'createReceiver').resolves(fakeReceiver);

      amqp.putToken('audience', 'token', function(err) {
        uuid.v4.restore();
        assert.isNull(err);
        assert(amqp._amqp.connect.calledOnce);
        assert(amqp._amqp.createSender.calledWith('$cbs'));
        assert(amqp._amqp.createReceiver.calledWith('$cbs'));
        testCallback();
      });
    });

    it('calls the callback with an error if the client cannot be connected', function (testCallback) {
      var amqp = new Amqp();
      var fakeError = new Error('fake error');
      sinon.stub(amqp._amqp, 'connect').rejects(fakeError);
      amqp.putToken('audience', 'token', function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    it('calls the callback with an error if the AMQP CBS sender link fails to attach', function (testCallback) {
      var amqp = new Amqp();
      var fakeError = new Error('fake error');
      sinon.stub(amqp._amqp, 'connect').resolves();
      var fakeReceiver = new EventEmitter();
      fakeReceiver.forceDetach = function () {};
      sinon.stub(amqp._amqp, 'createSender').rejects(fakeError);
      sinon.stub(amqp._amqp, 'createReceiver').resolves(fakeReceiver);

      amqp.putToken('audience', 'token', function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    it('calls the callback with an error if the AMQP CBS receiver link fails to attach', function (testCallback) {
      var amqp = new Amqp();
      var fakeError = new Error('fake error');
      sinon.stub(amqp._amqp, 'connect').resolves();
      var fakeSender = new EventEmitter();
      fakeSender.forceDetach = function () {};
      sinon.stub(amqp._amqp, 'createSender').resolves(fakeSender);
      sinon.stub(amqp._amqp, 'createReceiver').rejects(fakeError);

      amqp.putToken('audience', 'token', function(err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });
  });

  describe('Links', function() {
    function createFakeLink() {
      var fakeLink = new EventEmitter();
      fakeLink.forceDetach = function() {};
      return fakeLink;
    }

    var fake_generic_endpoint = 'fake_generic_endpoint';
    [
      { amqpFunc: 'attachSenderLink', amqp10Func: 'createSender', privateLinkArray: '_senders', fakeLinkObject: createFakeLink() },
      { amqpFunc: 'attachReceiverLink', amqp10Func: 'createReceiver', privateLinkArray: '_receivers', fakeLinkObject: createFakeLink() }
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

        /*Tests_SRS_NODE_COMMON_AMQP_16_013: [The `attachSenderLink` method shall call `createSender` on the `amqp10` client object.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_018: [The `attachReceiverLink` method shall call `createReceiver` on the `amqp10` client object.]*/
        it('calls ' + testConfig.amqp10Func + ' and passes the endpoint on amqp10.AmqpClient', function(testCallback) {
          var amqp = new Amqp();
          sinon.stub(amqp._amqp, 'connect').resolves('connected');
          sinon.stub(amqp._amqp, testConfig.amqp10Func).resolves(testConfig.fakeLinkObject);
          amqp.connect('uri', null, function() {
            amqp[testConfig.amqpFunc](fake_generic_endpoint, null, function(err) {
              if (err) { return testCallback(err); }
              assert.isNotTrue(amqp._amqp[testConfig.amqp10Func].args[0][1]);
              testCallback();
            });
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_06_003: [The `attachSenderLink` method shall create a policy object that contain link options to be merged if the linkOptions argument is not falsy.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_06_004: [The `attachReceiverLink` method shall create a policy object that contain link options to be merged if the linkOptions argument is not falsy.]*/
        it('sets up the attach properties object with the link properties passed as argument', function(testCallback) {
          var amqp = new Amqp();
          var fakeLinkProps = {
            fakeKey: 'fakeValue'
          };

          sinon.stub(amqp._amqp, 'connect').resolves('connected');
          sinon.stub(amqp._amqp, testConfig.amqp10Func).resolves(testConfig.fakeLinkObject);
          amqp.connect('uri', null, function() {
            /*Tests_SRS_NODE_COMMON_AMQP_16_015: [The `attachSenderLink` method shall call the `done` callback with a `null` error and the link object that was created if the link was attached successfully.]*/
            /*Tests_SRS_NODE_COMMON_AMQP_16_020: [The `attachReceiverLink` method shall call the `done` callback with a `null` error and the link object that was created if the link was attached successfully.]*/
            amqp[testConfig.amqpFunc](fake_generic_endpoint, fakeLinkProps, function() {
              assert.deepEqual(amqp._amqp[testConfig.amqp10Func].args[0][1], { fakeKey: 'fakeValue'});
              testCallback();
            });
          });
        });

        it('calls the callback with an error if the client cannot be connected', function (testCallback) {
          var amqp = new Amqp();
          var fakeError = new Error('fake error');
          sinon.stub(amqp._amqp, 'connect').rejects(fakeError);

          amqp[testConfig.amqpFunc](fake_generic_endpoint, null, function(err) {
            assert.strictEqual(err, fakeError);
            testCallback();
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
            amqp[testConfig.amqpFunc](fake_generic_endpoint, null, function(err) {
              assert.strictEqual(fakeError, err);
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
            amqp[testConfig.amqpFunc](fake_generic_endpoint, null, function(err) {
              assert.strictEqual(fakeError, err);
              testCallback();
            });

            amqp._amqp.emit('client:errorReceived', fakeError);
          });
        });

        it('subscribe to the detached event and removes it from ' + testConfig.privateLinkArray + ' if it is emitted', function(testCallback) {
          var amqp = new Amqp();
          sinon.stub(amqp._amqp, 'connect').resolves('connected');
          sinon.stub(amqp._amqp, testConfig.amqp10Func).resolves(testConfig.fakeLinkObject);
          amqp.connect('uri', null, function() {
            amqp[testConfig.amqpFunc](fake_generic_endpoint, null, function(err) {
              testConfig.fakeLinkObject.emit('detached', { closed: true, error: new Error() });
              assert.isUndefined(amqp[testConfig.privateLinkArray][fake_generic_endpoint]);
              testCallback();
            });
          });
        });
      });
    });

    describe('#detachSenderLink', function() {
      /*Tests_SRS_NODE_COMMON_AMQP_16_022: [The `detachSenderLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
      [null, undefined, ''].forEach(function(badEndpoint) {
        it('throws if the endpoint is \'' + badEndpoint + '\'', function() {
          var amqp = new Amqp();
          assert.throws(function() {
            amqp.detachSenderLink(badEndpoint, null, function() {});
          }, ReferenceError);
        });
      });

      /*Tests_SRS_NODE_COMMON_AMQP_16_023: [The `detachSenderLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
      it('calls the \'detach\' method on the link object', function (testCallback) {
        var fakeLink = new EventEmitter();
        fakeLink.forceDetach = sinon.stub();

        var amqp = new Amqp();
        amqp._amqp.connect = sinon.stub().resolves();
        amqp._amqp.createSender = sinon.stub().resolves(fakeLink);

        amqp.attachSenderLink(fake_generic_endpoint, null, function() {
          /*Tests_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
          amqp.detachSenderLink(fake_generic_endpoint, function(err) {
            assert(fakeLink.forceDetach.calledOnce);
            testCallback(err);
          });
        });
      });

      /*Tests_SRS_NODE_COMMON_AMQP_16_025: [The `detachSenderLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
      it('calls the callback immediately if there\'s no link attached', function (testCallback) {
        var amqp = new Amqp();
        amqp._amqp.connect = sinon.stub().resolves();
        amqp.connect('fakeuri', null, function() {
          amqp.detachSenderLink(fake_generic_endpoint, function(err) {
            testCallback(err);
          });
        });
      });

      it('calls the callback immediately if already disconnected', function (testCallback) {
        var amqp = new Amqp();
        /*Tests_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
        amqp.detachSenderLink(fake_generic_endpoint, function(err) {
          assert.isUndefined(err);
          testCallback();
        });
      });
    });

    describe('#detachReceiverLink', function() {
      /*Tests_SRS_NODE_COMMON_AMQP_16_027: [The `detachReceiverLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
      [null, undefined, ''].forEach(function(badEndpoint) {
        it('throws if the endpoint is \'' + badEndpoint + '\'', function() {
          var amqp = new Amqp();
          assert.throws(function() {
            amqp.detachReceiverLink(badEndpoint, null, function() {});
          }, ReferenceError);
        });
      });

      /*Tests_SRS_NODE_COMMON_AMQP_16_028: [The `detachReceiverLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
      it('calls the \'detach\' method on the link object', function (testCallback) {
        var fakeLink = new EventEmitter();
        fakeLink.forceDetach = sinon.stub();

        var amqp = new Amqp();
        amqp._amqp.connect = sinon.stub().resolves();
        amqp._amqp.createReceiver = sinon.stub().resolves(fakeLink);

        amqp.attachReceiverLink(fake_generic_endpoint, null, function() {
          /*Tests_SRS_NODE_COMMON_AMQP_16_029: [The `detachReceiverLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
          amqp.detachReceiverLink(fake_generic_endpoint, function(err) {
            assert(fakeLink.forceDetach.calledOnce);
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_COMMON_AMQP_16_030: [The `detachReceiverLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
      it('calls the callback immediately if there\'s no link attached', function (testCallback) {
        var amqp = new Amqp();
        amqp._amqp.connect = sinon.stub().resolves();
        amqp.connect('fakeuri', null, function() {
          amqp.detachReceiverLink(fake_generic_endpoint, function(err) {
            testCallback(err);
          });
        });
      });

      it('calls the callback immediately if already disconnected', function (testCallback) {
        var amqp = new Amqp();
        /*Tests_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
        amqp.detachReceiverLink(fake_generic_endpoint, function(err) {
          assert.isUndefined(err);
          testCallback();
        });
      });
    });
  });
});