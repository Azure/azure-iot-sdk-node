// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Amqp = require('../lib/amqp.js').Amqp;
var assert = require('chai').assert;
var SharedAccessSignature = require('azure-iot-common').SharedAccessSignature;
var errors = require('azure-iot-common').errors;


var fakeConfig = {
  host: 'hub.host.name',
  hubName: 'hub',
  keyName: 'keyName',
  sharedAccessSignature: 'SharedAccessSignature sr=a.hub.net&sig=1234&skn=keyName&se=1234'
};

var sasConfig = {
  host: 'hub.host.name',
  hubName: 'hub',
  keyName: 'keyName',
  sharedAccessSignature: SharedAccessSignature.create('uri', 'name', 'key', 123)
};

describe('Amqp', function() {
  var FakeAmqpBase = function() {
    EventEmitter.call(this);

    this.connect = function (uri, sslOptions, callback) {
      this.initializeCBS(callback);
    };

    this.initializeCBS = function(callback) {
      callback(null);
    };

    this.putToken = function(audience, sas, callback) {
      callback(null);
    };

    this.disconnect = function (callback) {
      callback();
    };

    this.setDisconnectHandler = function(eventHandler) {
      this.on('disconnect', eventHandler);
    };
  };

  util.inherits(FakeAmqpBase, EventEmitter);

  it('automatically renews the SAS token before it expires', function (done) {
    this.clock = sinon.useFakeTimers();
    var clock = this.clock;
    var renewingSasConfig = {
      host: 'hub.host.name',
      hubName: 'hub',
      keyName: 'keyName',
      sharedAccessSignature: SharedAccessSignature.create('uri', 'name', 'key', 1)
    };
    var fakeAmqpBase = new FakeAmqpBase();
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
    it('sets up \'disconnect\' event forwarding', function(done){
      var fakeAmqpBase = new FakeAmqpBase();
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.on('disconnect', function() {
        done();
      });
      fakeAmqpBase.emit('disconnect');
    });
  });

  describe('#connect', function() {
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_019: [The `connect` method shall call the `connect` method of the base AMQP transport and translate its result to the caller into a transport-agnostic object.]*/
    it('calls the base transport connect method', function(done) {
      var amqp = new Amqp(fakeConfig, new FakeAmqpBase());
      sinon.stub(amqp._amqp,'connect').callsArgWith(2, null);
      amqp.connect(done);
    });

    it('calls the base transport connect method which fails', function(done) {
      var testError = new errors.NotConnectedError('fake error');
      var amqp = new Amqp(fakeConfig, new FakeAmqpBase());
      sinon.stub(amqp._amqp,'connect').callsArgWith(2, testError);
      amqp.connect(function (err) {
        assert.instanceOf(err, Error);
        done();
      });
    });

    it('calls the base transport connect method with renewable sas config', function(done) {
      var amqp = new Amqp(sasConfig, new FakeAmqpBase());
      amqp.connect(done);
    });


    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_021: [** All asynchronous instance methods shall not throw if `done` is not specified or falsy]*/
    it('does not fail if `done` is not specified or falsy', function() {
      var amqp = new Amqp(fakeConfig, new FakeAmqpBase());
      assert.doesNotThrow(function() {
        amqp.connect();
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_06_001: [`initializeCBS` shall be invoked.]*/
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_06_002: [If `initializeCBS` is not successful then the client will remain disconnected and the callback, if provided, will be invoked with an error object.]*/
    it('Invokes initializeCBS - initialize fails and disconnects', function () {
      var testError = new errors.InternalServerError('fake error');
      var transport = new Amqp(sasConfig);
      sinon.stub(transport._amqp,'connect').callsArgWith(2, null);
      var initStub = sinon.stub(transport._amqp,'initializeCBS').callsArgWith(0, testError);
      var disconnectStub = sinon.stub(transport._amqp,'disconnect').callsArgWith(0, null);
      transport.connect(function(err) {
        assert(initStub.calledOnce);
        assert(disconnectStub.calledOnce);
        assert.instanceOf(err, Error);
      });
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_06_003: [If `initializeCBS` is successful, `putToken` shall be invoked with the first parameter audience, created from the sr of the sas signature, the next parameter of the actual sas, and a callback.]*/
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_06_004: [If `putToken` is not successful then the client will remain disconnected and the callback, if provided, will be invoked with an error object.]*/
    it('Invokes putToken - puttoken fails and disconnects', function () {
      var testError = new errors.NotConnectedError('fake error');
      var transport = new Amqp(sasConfig);
      sinon.stub(transport._amqp,'connect').callsArgWith(2, null);
      sinon.stub(transport._amqp,'initializeCBS').callsArgWith(0, null);
      var putTokenStub = sinon.stub(transport._amqp,'putToken').callsArgWith(2, testError);
      var disconnectStub = sinon.stub(transport._amqp,'disconnect').callsArgWith(0, null);
      transport.connect(function(err) {
        assert(putTokenStub.calledOnce);
        assert(putTokenStub.calledWith('uri',sasConfig.sharedAccessSignature.toString()));
        assert(disconnectStub.calledOnce);
        assert.instanceOf(err, Error);
      });
    });

  });

  describe('#disconnect', function() {
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_020: [** The `disconnect` method shall call the `disconnect` method of the base AMQP transport and translate its result to the caller into a transport-agnostic object.]*/
    it('calls the base transport disconnect method', function(done) {
      var amqp = new Amqp(fakeConfig, new FakeAmqpBase());
      amqp.disconnect(done);
    });

    it('calls the base transport disconnect method with renewable sas config', function(done) {
      var amqp = new Amqp(sasConfig, new FakeAmqpBase());
      amqp.disconnect(done);
    });

    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_021: [** All asynchronous instance methods shall not throw if `done` is not specified or falsy]*/
    it('does not fail if `done` is not specified or falsy', function() {
      var amqp = new Amqp(fakeConfig, new FakeAmqpBase());
      assert.doesNotThrow(function() {
        amqp.connect();
      });
    });
  });

  describe('#getFeedbackReceiver', function() {
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_013: [The `getFeedbackReceiver` method shall request an `AmqpReceiver` object from the base AMQP transport for the `/messages/serviceBound/feedback` endpoint.]*/
    it('requests an AmqpReceiver from the feedback endpoint', function(done) {
      var fakeAmqpBase = {
        getReceiver: function(endpoint, callback) {
          assert.equal(endpoint, '/messages/serviceBound/feedback');
          callback();
        },
        setDisconnectHandler: function () {}
      };
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.getFeedbackReceiver(done);
    });
  });

  describe('#getFileNotificationReceiver', function() {
    /*Tests_SRS_NODE_IOTHUB_SERVICE_AMQP_16_016: [The `getFileNotificationReceiver` method shall request an `AmqpReceiver` object from the base AMQP transport for the `/messages/serviceBound/filenotifications` endpoint.]*/
    it('requests an AmqpReceiver from the file notification endpoint', function(done) {
      var fakeAmqpBase = {
        getReceiver: function(endpoint, callback) {
          assert.equal(endpoint, '/messages/serviceBound/filenotifications');
          callback();
        },
        setDisconnectHandler: function () {}
      };
      var amqp = new Amqp(fakeConfig, fakeAmqpBase);
      amqp.getFileNotificationReceiver(done);
    });
  });
});