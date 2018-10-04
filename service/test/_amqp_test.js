// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;
var Amqp = require('../lib/amqp.js').Amqp;
var assert = require('chai').assert;
var SharedAccessSignature = require('azure-iot-common').SharedAccessSignature;
var errors = require('azure-iot-common').errors;
var results = require('azure-iot-common').results;
var Message = require('azure-iot-common').Message;
var AmqpMessage = require('azure-iot-amqp-base').AmqpMessage;


var fakeConfig = {
  host: 'hub.host.name',
  keyName: 'keyName',
  sharedAccessSignature: 'SharedAccessSignature sr=a.hub.net&sig=1234&skn=keyName&se=1234'
};

var sasConfig = {
  host: 'hub.host.name',
  keyName: 'keyName',
  sharedAccessSignature: SharedAccessSignature.create('uri', 'name', 'key', 123)
};

describe('Amqp', function() {
  var fakeAmqpBase;

  beforeEach(function () {
    fakeAmqpBase = new EventEmitter();
    fakeAmqpBase.connect = sinon.stub().callsArgWith(1, null, new results.Connected());
    fakeAmqpBase.initializeCBS = sinon.stub().callsArg(0);
    fakeAmqpBase.putToken = sinon.stub().callsArg(2);
    fakeAmqpBase.disconnect = sinon.stub().callsArg(0);

    fakeAmqpBase.setDisconnectHandler = function(eventHandler) {
      this.on('disconnect', eventHandler);
    };
  });

  afterEach(function () {
    fakeAmqpBase = null;
  });

  it('automatically renews the SAS token before it expires', function (done) {
    this.clock = sinon.useFakeTimers();
    var clock = this.clock;
    var renewingSasConfig = {
      host: 'hub.host.name',
      keyName: 'keyName',
      sharedAccessSignature: SharedAccessSignature.create('uri', 'name', 'key', 1)
    };
    var amqp = new Amqp(renewingSasConfig, fakeAmqpBase);
    amqp.connect(function() {});
    this.clock.tick(1800000); // 30 minutes. shouldn't have updated yet.
    assert.equal(renewingSasConfig.sharedAccessSignature.se,3600);
    this.clock.tick(1200000); // +20 => 50 minutes. Updater should have been invoked.
    clock.restore();
    assert.equal(renewingSasConfig.sharedAccessSignature.se,6300); // Should be 1 hour and 50 minutes from zero.
    done();
  });

  describe('#constructor', function() {
    it('sets up \'disconnect\' event forwarding', function (done){
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.on('disconnect', function() {
        done();
      });
      amqp.connect(function () {
        fakeAmqpBase.emit('disconnect', new Error('fake'));
      });
    });

    it('ignores AMQP errors received while disconnected', function () {
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.on('disconnect', function() {
        assert.fail();
      });

      fakeAmqpBase.emit('disconnect', new Error('fake'));
    });

    it('disconnects the transport if an AMQP error is emitted while connecting', function (testCallback) {
      fakeAmqpBase.connect = sinon.stub();
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.on('disconnect', function(err) {
        assert.instanceOf(err, Error);
        assert.isTrue(fakeAmqpBase.disconnect.calledOnce);
        testCallback();
      });

      amqp.connect(function () {});
      // blocked in connecting because the connect callback won't be called.
      fakeAmqpBase.emit('disconnect', new Error('fake'));
    });

    it('disconnects the transport if an AMQP error is emitted while authenticating', function (testCallback) {
      fakeAmqpBase.putToken = sinon.stub();
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.on('disconnect', function(err) {
        assert.instanceOf(err, Error);
        assert.isTrue(fakeAmqpBase.disconnect.calledOnce);
        testCallback();
      });

      amqp.connect(function () {});
      // blocked in connecting because the putToken callback won't be called.
      fakeAmqpBase.emit('disconnect', new Error('fake'));
    });
  });

  describe('#connect', function() {
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_019: [The `connect` method shall call the `connect` method of the base AMQP transport and translate its result to the caller into a transport-agnostic object.]*/
    it('calls the base transport connect method', function(done) {
      var amqp = new Amqp(sasConfig, fakeAmqpBase);
      amqp.connect(function () {
        assert.isTrue(fakeAmqpBase.connect.calledOnce);
        amqp.disconnect(function () {
          done();
        });
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_017: [All asynchronous instance methods shall call the `done` callback with a single parameter that is derived from the standard Javascript `Error` object if the operation failed.]*/
    it('calls its callback with an error if the base transport connect method fails', function(done) {
      var testError = new errors.NotConnectedError('fake error');
      fakeAmqpBase.connect = sinon.stub().callsArgWith(1, testError);
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.connect(function (err) {
        assert.instanceOf(err, Error);
        amqp.disconnect(function () {
          done();
        });
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_06_001: [`initializeCBS` shall be invoked.]*/
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_06_002: [If `initializeCBS` is not successful then the client will remain disconnected and the callback, if provided, will be invoked with an error object.]*/
    it('Invokes initializeCBS - initialize fails and disconnects', function (testCallback) {
      var testError = new errors.InternalServerError('fake error');
      fakeAmqpBase.initializeCBS = sinon.stub().callsArgWith(0, testError);
      var transport = new Amqp(sasConfig, fakeAmqpBase);
      transport.connect(function(err) {
        assert(fakeAmqpBase.initializeCBS.calledOnce);
        assert(fakeAmqpBase.disconnect.calledOnce);
        assert.instanceOf(err, Error);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_06_003: [If `initializeCBS` is successful, `putToken` shall be invoked with the first parameter audience, created from the sr of the sas signature, the next parameter of the actual sas, and a callback.]*/
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_06_004: [If `putToken` is not successful then the client will remain disconnected and the callback, if provided, will be invoked with an error object.]*/
    it('Invokes putToken - puttoken fails and disconnects', function (testCallback) {
      var testError = new errors.NotConnectedError('fake error');
      fakeAmqpBase.putToken = sinon.stub().callsArgWith(2, testError);
      var transport = new Amqp(sasConfig, fakeAmqpBase);
      transport.connect(function(err) {
        assert(fakeAmqpBase.putToken.calledOnce);
        assert(fakeAmqpBase.putToken.calledWith('uri',sasConfig.sharedAccessSignature.toString()));
        assert(fakeAmqpBase.disconnect.calledOnce);
        assert.instanceOf(err, Error);
        testCallback();
      });
    });

    it('calls its callback immediately if it is already connected', function (testCallback) {
      var transport = new Amqp(sasConfig, fakeAmqpBase);
      transport.connect(function () {
        assert.isTrue(fakeAmqpBase.connect.calledOnce);
        assert.isTrue(fakeAmqpBase.initializeCBS.calledOnce);
        assert.isTrue(fakeAmqpBase.putToken.calledOnce);
        transport.connect(function () {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          assert.isTrue(fakeAmqpBase.initializeCBS.calledOnce);
          assert.isTrue(fakeAmqpBase.putToken.calledOnce);
          transport.disconnect(function () {
            testCallback();
          });
        });
      });
    });
  });

  describe('#disconnect', function() {
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_020: [** The `disconnect` method shall call the `disconnect` method of the base AMQP transport and translate its result to the caller into a transport-agnostic object.]*/
    it('calls the base transport disconnect method if the transport is connected', function(testCallback) {
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.connect(function () {
        amqp.disconnect(function () {
          assert.isTrue(fakeAmqpBase.disconnect.calledOnce);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_020: [** The `disconnect` method shall call the `disconnect` method of the base AMQP transport and translate its result to the caller into a transport-agnostic object.]*/
    it('calls the base transport disconnect method if the transport is connecting', function(testCallback) {
      fakeAmqpBase.connect = sinon.stub();
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.connect(function () {});
      // blocked in connecting because the connect callback won't be called.
      amqp.disconnect(function () {
        assert.isTrue(fakeAmqpBase.disconnect.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_018: [All asynchronous instance methods shall call the `done` callback with either no arguments or a first null argument and a second argument that is the result of the operation if the operation succeeded.]*/
    it('calls the base transport disconnect method if the transport is authenticating', function(testCallback) {
      fakeAmqpBase.putToken = sinon.stub();
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.connect(function () {});
      // blocked in authenticating because the putToken callback won't be called.
      amqp.disconnect(function () {
        assert.isTrue(fakeAmqpBase.disconnect.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_018: [All asynchronous instance methods shall call the `done` callback with either no arguments or a first null argument and a second argument that is the result of the operation if the operation succeeded.]*/
    it('calls the base transport disconnect method with renewable sas config', function(testCallback) {
      var amqp = new Amqp(sasConfig, fakeAmqpBase);
      amqp.connect(function () {
        amqp.disconnect(function () {
          assert.isTrue(fakeAmqpBase.disconnect.calledOnce);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_017: [All asynchronous instance methods shall call the `done` callback with a single parameter that is derived from the standard Javascript `Error` object if the operation failed.]*/
    it('calls its callback with an error if the base transport disconnect method fails', function(testCallback) {
      fakeAmqpBase.disconnect = sinon.stub().callsArgWith(0, new Error('fake'));
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.connect(function () {
        amqp.disconnect(function (err) {
          assert.isTrue(fakeAmqpBase.disconnect.calledOnce);
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });

    it('calls its callback directly if already disconnected', function (testCallback) {
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.disconnect(function () {
        assert.isTrue(fakeAmqpBase.disconnect.notCalled);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_021: [The `disconnect` method shall detach the C2D messaging link if it is attached.]*/
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_022: [The `disconnect` method shall detach the C2D feedback receiver link if it is attached.]*/
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_023: [The `disconnect` method shall detach the file notification receiver link if it is attached.]*/
    it('detaches links', function (testCallback) {
      var fakeSender = new EventEmitter();
      fakeSender.send = sinon.stub().callsArgWith(1, null, new results.MessageEnqueued());
      fakeSender.detach = sinon.stub().callsArg(0);
      var fakeFileNotificationReceiver = new EventEmitter();
      fakeFileNotificationReceiver.detach = sinon.stub().callsArg(0);
      var fakeFeedbackReceiver = new EventEmitter();
      fakeFeedbackReceiver.detach = sinon.stub().callsArg(0);

      fakeAmqpBase.attachSenderLink = sinon.stub().callsArgWith(2, null, fakeSender);
      fakeAmqpBase.attachReceiverLink = sinon.stub().onFirstCall().callsArgWith(2, null, fakeFileNotificationReceiver)
                                                    .onSecondCall().callsArgWith(2, null, fakeFeedbackReceiver);

      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.connect(function () {
        amqp.send('fakeDeviceId', new Message('fake'), function () {
          amqp.getFileNotificationReceiver(function () {
            amqp.getFeedbackReceiver(function () {
              amqp.disconnect(function () {
                assert.isTrue(fakeSender.detach.calledOnce);
                assert.isTrue(fakeFeedbackReceiver.detach.calledOnce);
                assert.isTrue(fakeFileNotificationReceiver.detach.calledOnce);
                assert.isTrue(fakeAmqpBase.disconnect.calledOnce);
                testCallback();
              });
            });
          });
        });
      });
    });

    it('forcefully detaches the links if it receives an error from the lower AMQP layer', function (testCallback) {
      var fakeError = new Error('fake');
      var fakeSender = new EventEmitter();
      fakeSender.send = sinon.stub().callsArgWith(1, null, new results.MessageEnqueued());
      fakeSender.forceDetach = sinon.stub();
      var fakeFileNotificationReceiver = new EventEmitter();
      fakeFileNotificationReceiver.forceDetach = sinon.stub();
      var fakeFeedbackReceiver = new EventEmitter();
      fakeFeedbackReceiver.forceDetach = sinon.stub();

      fakeAmqpBase.attachSenderLink = sinon.stub().callsArgWith(2, null, fakeSender);
      fakeAmqpBase.attachReceiverLink = sinon.stub().onFirstCall().callsArgWith(2, null, fakeFileNotificationReceiver)
                                                    .onSecondCall().callsArgWith(2, null, fakeFeedbackReceiver);

      var amqp = new Amqp(fakeConfig, fakeAmqpBase);

      amqp.on('disconnect', function (err) {
        assert.strictEqual(err, fakeError);
        assert.isTrue(fakeSender.forceDetach.calledOnce);
        assert.isTrue(fakeSender.forceDetach.calledWith(fakeError));
        assert.isTrue(fakeFeedbackReceiver.forceDetach.calledOnce);
        assert.isTrue(fakeFeedbackReceiver.forceDetach.calledWith(fakeError));
        assert.isTrue(fakeFileNotificationReceiver.forceDetach.calledOnce);
        assert.isTrue(fakeFileNotificationReceiver.forceDetach.calledWith(fakeError));
        assert.isTrue(fakeAmqpBase.disconnect.calledOnce);
        testCallback();
      });

      amqp.connect(function () {
        amqp.send('fakeDeviceId', new Message('fake'), function () {
          amqp.getFileNotificationReceiver(function () {
            amqp.getFeedbackReceiver(function () {
              fakeAmqpBase.emit('disconnect', fakeError);
            });
          });
        });
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_024: [Any error generated by detaching a link should be passed as the single argument of the callback of the `disconnect` method.]*/
    it('calls its callback with an error if detaching the sender link fails', function (testCallback) {
      var fakeError = new Error('fake');
      var fakeSender = new EventEmitter();
      fakeSender.send = sinon.stub().callsArgWith(1, null, new results.MessageEnqueued());
      fakeSender.detach = sinon.stub().callsArgWith(0, fakeError);

      fakeAmqpBase.attachSenderLink = sinon.stub().callsArgWith(2, null, fakeSender);
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);

      amqp.connect(function () {
        amqp.send('fakeDeviceId', new Message('fake'), function () {
          amqp.disconnect(function (err) {
            assert.instanceOf(err, Error);
            testCallback();
          });
        });
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_024: [Any error generated by detaching a link should be passed as the single argument of the callback of the `disconnect` method.]*/
    it('calls its callback with an error if detaching the feedback receiver fails', function (testCallback) {
      var fakeError = new Error('fake');
      var fakeReceiver = new EventEmitter();
      fakeReceiver.detach = sinon.stub().callsArgWith(0, fakeError);

      fakeAmqpBase.attachReceiverLink = sinon.stub().callsArgWith(2, null, fakeReceiver);
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);

      amqp.connect(function () {
        amqp.getFeedbackReceiver(function () {
          amqp.disconnect(function (err) {
            assert.instanceOf(err, Error);
            testCallback();
          });
        });
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_024: [Any error generated by detaching a link should be passed as the single argument of the callback of the `disconnect` method.]*/
    it('calls its callback with an error if detaching the file notification receiver fails', function (testCallback) {
      var fakeError = new Error('fake');
      var fakeReceiver = new EventEmitter();
      fakeReceiver.detach = sinon.stub().callsArgWith(0, fakeError);

      fakeAmqpBase.attachReceiverLink = sinon.stub().callsArgWith(2, null, fakeReceiver);
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);

      amqp.connect(function () {
        amqp.getFileNotificationReceiver(function () {
          amqp.disconnect(function (err) {
            assert.instanceOf(err, Error);
            testCallback();
          });
        });
      });
    });
  });

  describe('#getFeedbackReceiver', function() {
    it('connects the transport if necessary', function (testCallback) {
      fakeAmqpBase.attachReceiverLink = function (endpoint, linkOptions, callback) {
        assert.equal(endpoint, '/messages/serviceBound/feedback');
        callback(null, new EventEmitter());
      };

      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.getFeedbackReceiver(function () {
        assert.isTrue(fakeAmqpBase.connect.calledOnce);
        assert.isTrue(fakeAmqpBase.initializeCBS.calledOnce);
        assert.isTrue(fakeAmqpBase.putToken.calledOnce);
        testCallback();
      });
    });

    it('calls its callback with an error if connecting the transport fails', function (testCallback) {
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      fakeAmqpBase.connect = sinon.stub().callsArgWith(1, new Error('fakeError'));

      amqp.getFeedbackReceiver(function (err) {
        assert.isTrue(fakeAmqpBase.connect.calledOnce);
        assert.instanceOf(err, Error);
        testCallback();
      });
    });

    it('Reuses the existing receiver if it is already attached', function (testCallback) {
      fakeAmqpBase.attachReceiverLink = function (endpoint, linkOptions, callback) {
        assert.equal(endpoint, '/messages/serviceBound/feedback');
        callback(null, new EventEmitter());
      };

      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.connect(function () {
        amqp.getFeedbackReceiver(function (err, receiver) {
          var recv1 = receiver;
          amqp.getFeedbackReceiver(function (err, recv2) {
            assert.strictEqual(recv1, recv2);
            testCallback();
          });
        });
      });
    });

    it('calls its callback with an error if the link fails to attach', function (testCallback) {
      var fakeSender = new EventEmitter();
      fakeSender.send = sinon.stub().callsArgWith(1, null, new results.MessageEnqueued());
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      fakeAmqpBase.attachReceiverLink = sinon.stub().callsArgWith(2, new Error('fake error'));

      amqp.connect(function () {
        amqp.getFeedbackReceiver(function (err) {
          assert.isTrue(fakeAmqpBase.attachReceiverLink.calledOnce);
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_013: [The `getFeedbackReceiver` method shall request an `AmqpReceiver` object from the base AMQP transport for the `/messages/serviceBound/feedback` endpoint.]*/
    it('requests an AmqpReceiver from the feedback endpoint', function (testCallback) {
      fakeAmqpBase.attachReceiverLink = function (endpoint, linkOptions, callback) {
        assert.equal(endpoint, '/messages/serviceBound/feedback');
        callback(null, new EventEmitter());
      };

      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.connect(function () {
        amqp.getFeedbackReceiver(testCallback);
      });
    });
  });

  describe('#getFileNotificationReceiver', function () {
    it('connects the transport if necessary', function (testCallback) {
      fakeAmqpBase.attachReceiverLink = function (endpoint, linkOptions, callback) {
        assert.equal(endpoint, '/messages/serviceBound/filenotifications');
        callback(null, new EventEmitter());
      };

      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.getFileNotificationReceiver(function () {
        assert.isTrue(fakeAmqpBase.connect.calledOnce);
        assert.isTrue(fakeAmqpBase.initializeCBS.calledOnce);
        assert.isTrue(fakeAmqpBase.putToken.calledOnce);
        testCallback();
      });
    });

    it('calls its callback with an error if connecting the transport fails', function (testCallback) {
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      fakeAmqpBase.connect = sinon.stub().callsArgWith(1, new Error('fakeError'));

      amqp.getFileNotificationReceiver(function (err) {
        assert.isTrue(fakeAmqpBase.connect.calledOnce);
        assert.instanceOf(err, Error);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_016: [The `getFileNotificationReceiver` method shall request an `AmqpReceiver` object from the base AMQP transport for the `/messages/serviceBound/filenotifications` endpoint.]*/
    it('requests an AmqpReceiver from the file notification endpoint', function (testCallback) {
      fakeAmqpBase.attachReceiverLink = function (endpoint, linkOptions, callback) {
        assert.equal(endpoint, '/messages/serviceBound/filenotifications');
        callback(null, new EventEmitter());
      };

      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.connect(function () {
        amqp.getFileNotificationReceiver(testCallback);
      });
    });

    it('Reuses the existing receiver if it is already attached', function (testCallback) {
      fakeAmqpBase.attachReceiverLink = function (endpoint, linkOptions, callback) {
        assert.equal(endpoint, '/messages/serviceBound/filenotifications');
        callback(null, new EventEmitter());
      };

      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.connect(function () {
        amqp.getFileNotificationReceiver(function (err, receiver) {
          var recv1 = receiver;
          amqp.getFileNotificationReceiver(function (err, recv2) {
            assert.strictEqual(recv1, recv2);
            testCallback();
          });
        });
      });
    });

    it('calls its callback with an error if the link fails to attach', function (testCallback) {
      var fakeSender = new EventEmitter();
      fakeSender.send = sinon.stub().callsArgWith(1, null, new results.MessageEnqueued());
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      fakeAmqpBase.attachReceiverLink = sinon.stub().callsArgWith(2, new Error('fake error'));

      amqp.connect(function () {
        amqp.getFileNotificationReceiver(function (err) {
          assert.isTrue(fakeAmqpBase.attachReceiverLink.calledOnce);
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });
  });

  [
    {
      functionUnderTest: 'send',
      invokeFunctionUnderTest: function(amqp, msg, callback) { amqp.send('fakeDeviceId', msg, callback); },
      expectedDestination: '/devices/fakeDeviceId/messages/devicebound'
    }

  ].forEach(function(testConfig) {
    describe('#' + testConfig.functionUnderTest, function () {
      /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_025: [The `send` method shall connect and authenticate the transport if it is disconnected.]*/
      it('connects the transport if necessary', function (testCallback) {
        var fakeSender = new EventEmitter();
        fakeSender.send = sinon.stub().callsArgWith(1, null, new results.MessageEnqueued());
        var amqp = new Amqp(fakeConfig, fakeAmqpBase);
        fakeAmqpBase.attachSenderLink = sinon.stub().callsArgWith(2, null, fakeSender);

        testConfig.invokeFunctionUnderTest(amqp, new Message('foo'), function () {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          assert.isTrue(fakeAmqpBase.initializeCBS.calledOnce);
          assert.isTrue(fakeAmqpBase.putToken.calledOnce);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_026: [The `send` method shall call its callback with an error if connecting and/or authenticating the transport fails.]*/
      it('calls its callback with an error if connecting the transport fails', function (testCallback) {
        var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      fakeAmqpBase.connect = sinon.stub().callsArgWith(1, new Error('fakeError'));

        testConfig.invokeFunctionUnderTest(amqp, new Message('foo'), function (err) {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          assert.instanceOf(err, Error);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_027: [The `send` method shall attach the C2D link if necessary.]*/
      it('attaches the link if necessary', function (testCallback) {
        var fakeSender = new EventEmitter();
        fakeSender.send = sinon.stub().callsArgWith(1, null, new results.MessageEnqueued());
        var amqp = new Amqp(fakeConfig, fakeAmqpBase);
        fakeAmqpBase.attachSenderLink = sinon.stub().callsArgWith(2, fakeSender);

        amqp.connect(function () {
          testConfig.invokeFunctionUnderTest(amqp, new Message('foo'), function () {
            assert.isTrue(fakeAmqpBase.attachSenderLink.calledOnce);
            assert.isTrue(fakeAmqpBase.attachSenderLink.calledWith('/messages/devicebound'));
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_029: [The `send` method shall call its callback with an error if it fails to attach the C2D link.]*/
      it('calls its callback with an error if the link fails to attach', function (testCallback) {
        var fakeSender = new EventEmitter();
        fakeSender.send = sinon.stub().callsArgWith(1, null, new results.MessageEnqueued());
        var amqp = new Amqp(fakeConfig, fakeAmqpBase);
        fakeAmqpBase.attachSenderLink = sinon.stub().callsArgWith(2, new Error('fake error'));

        amqp.connect(function () {
          testConfig.invokeFunctionUnderTest(amqp, new Message('foo'), function (err) {
            assert.isTrue(fakeAmqpBase.attachSenderLink.calledOnce);
            assert.instanceOf(err, Error);
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_030: [The `send` method shall call the `send` method of the C2D link and pass it the Amqp request that it created.]*/
      it('calls send on the c2d link object', function (testCallback) {
        var fakeSender = new EventEmitter();
        fakeSender.send = sinon.stub().callsArgWith(1, null, new results.MessageEnqueued());
        var amqp = new Amqp(fakeConfig, fakeAmqpBase);
        fakeAmqpBase.attachSenderLink = sinon.stub().callsArgWith(2, null, fakeSender);

        amqp.connect(function () {
          testConfig.invokeFunctionUnderTest(amqp, new Message('foo'), function () {
            assert.isTrue(fakeSender.send.calledOnce);
            assert.instanceOf(fakeSender.send.firstCall.args[0], AmqpMessage);
            /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_003: [The message generated by the `send` method should have its “to” field set to "/devices/(uriEncode<deviceId>)/messages/devicebound".]*/
            assert.strictEqual(fakeSender.send.firstCall.args[0].to, testConfig.expectedDestination);
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_017: [All asynchronous instance methods shall call the `done` callback with a single parameter that is derived from the standard Javascript `Error` object if the operation failed.]*/
      it('calls its callback with an error if the link fails to send the message', function (testCallback) {
        var fakeSender = new EventEmitter();
        fakeSender.send = sinon.stub().callsArgWith(1, new Error('fake'));
        var amqp = new Amqp(fakeConfig, fakeAmqpBase);
        fakeAmqpBase.attachSenderLink = sinon.stub().callsArgWith(2, null, fakeSender);

        amqp.connect(function () {
          testConfig.invokeFunctionUnderTest(amqp, new Message('foo'), function (err) {
            assert.isTrue(fakeSender.send.calledOnce);
            assert.instanceOf(err, Error);
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_028: [The `send` method shall reuse the C2D link if it is already attached.]*/
      it('Reuses the c2d link object', function (testCallback) {
        var fakeSender = new EventEmitter();
        fakeSender.send = sinon.stub().callsArgWith(1, null, new results.MessageEnqueued());
        var amqp = new Amqp(fakeConfig, fakeAmqpBase);
        fakeAmqpBase.attachSenderLink = sinon.stub().callsArgWith(2, null, fakeSender);

        amqp.connect(function () {
          testConfig.invokeFunctionUnderTest(amqp, new Message('test1'), function () {
            assert.isTrue(fakeAmqpBase.attachSenderLink.calledOnce);
            assert.isTrue(fakeSender.send.calledOnce);
            testConfig.invokeFunctionUnderTest(amqp,  new Message('test2'), function () {
              assert.isTrue(fakeAmqpBase.attachSenderLink.calledOnce);
              assert.isTrue(fakeSender.send.calledTwice);
              testCallback();
            });
          });
        });
      });
    });
  });

  describe('updateSharedAccessSignature', function () {
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_039: [The `updateSharedAccessSignature` shall throw a `ReferenceError` if the `sharedAccessSignature` argument is falsy.]*/
    [undefined, null, ''].forEach(function (badSas) {
      it('throws if sharedAccessSignature is \'' + badSas + '\'', function () {
        var amqp = new Amqp(fakeConfig, fakeAmqpBase);
        assert.throws(function () {
          amqp.updateSharedAccessSignature(badSas, function () {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_031: [The `updateSharedAccessSignature` shall trigger a `putToken` call on the base transport if it is connected.]*/
    it('calls putToken on the lower layer amqp object', function (testCallback) {
      var fakeSas = 'SharedAccessSignature sr=a.hub.net&sig=1234&skn=keyName&se=4567';
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.connect(function () {
        amqp.updateSharedAccessSignature(fakeSas, function () {
          assert.isTrue(fakeAmqpBase.putToken.calledTwice);
          assert.strictEqual(fakeAmqpBase.putToken.secondCall.args[1], fakeSas);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_017: [All asynchronous instance methods shall call the `done` callback with a single parameter that is derived from the standard Javascript `Error` object if the operation failed.]*/
    it('calls its callback with an error if the putToken operation fails', function (testCallback) {
      var fakeSas = 'SharedAccessSignature sr=a.hub.net&sig=1234&skn=keyName&se=4567';
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.connect(function () {
        fakeAmqpBase.putToken = sinon.stub().callsArgWith(2, new Error('fake'));
        amqp.updateSharedAccessSignature(fakeSas, function (err) {
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_032: [The `updateSharedAccessSignature` shall not establish a connection if the transport is disconnected, but should use the new shared access signature on the next manually initiated connection attempt. **]*/
    it('does not connect the transport if it is disconnected', function (testCallback) {
      var fakeSas = 'SharedAccessSignature sr=a.hub.net&sig=1234&skn=keyName&se=4567';
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.updateSharedAccessSignature(fakeSas, function () {
        assert.isTrue(fakeAmqpBase.connect.notCalled);
        testCallback();
      });
    });
  });
});