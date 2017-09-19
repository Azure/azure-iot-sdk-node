// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');

var Message = require('azure-iot-common').Message;
var Amqp = require('../lib/amqp.js').Amqp;
var errors = require('azure-iot-common').errors;


describe('Amqp', function () {
  var transport = null;
  var receiver = null;
  var testMessage = new Message();
  var testCallback = function () { };
  var configWithSSLOptions = { host: 'hub.host.name', hubName: 'hub', deviceId: 'deviceId', x509: 'some SSL options' };
  var simpleSas = 'SharedAccessSignature sr=foo&sig=123&se=123';
  var configWithSAS = { host: 'hub.host.name', hubName: 'hub', deviceId: 'deviceId', sharedAccessSignature: simpleSas};

  beforeEach(function () {
    var DummyReceiver = function () {
      this.complete = sinon.spy();
      this.reject = sinon.spy();
      this.abandon = sinon.spy();
    };

    receiver = new DummyReceiver();

    transport = new Amqp(configWithSAS);
    transport._receiver = receiver;
    transport._deviceMethodClient = {
      sendMethodResponse: sinon.spy()
    };
  });

  afterEach(function () {
    transport = null;
    receiver = null;
  });

  describe('#complete', function () {
    /*Tests_SRS_NODE_DEVICE_AMQP_16_013: [The ‘complete’ method shall call the ‘complete’ method of the receiver object and pass it the message and the callback given as parameters.] */
    it('calls the receiver `complete` method', function () {
      transport.complete(testMessage, testCallback);
      assert(receiver.complete.calledWith(testMessage, testCallback));
    });
  });

  describe('#reject', function () {
    /*Tests_SRS_NODE_DEVICE_AMQP_16_014: [The ‘reject’ method shall call the ‘reject’ method of the receiver object and pass it the message and the callback given as parameters.] */
    it('calls the receiver `reject` method', function () {
      transport.reject(testMessage, testCallback);
      assert(receiver.reject.calledWith(testMessage, testCallback));
    });
  });

  describe('#abandon', function () {
    /*Tests_SRS_NODE_DEVICE_AMQP_16_012: [The ‘abandon’ method shall call the ‘abandon’ method of the receiver object and pass it the message and the callback given as parameters.] */
    it('calls the receiver `abandon` method', function () {
      transport.abandon(testMessage, testCallback);
      assert(receiver.abandon.calledWith(testMessage, testCallback));
    });
  });

  describe('#sendMethodResponse', function() {
    /*Tests_SRS_NODE_DEVICE_AMQP_16_019: [The `sendMethodResponse` shall throw a `ReferenceError` if the `methodResponse` object is falsy.]*/
    [null, undefined].forEach(function(badResponse) {
      it('throws a ReferenceError if the methodResponse object is \'' + badResponse + '\'', function() {
        assert.throws(function() {
          transport.sendMethodResponse(badResponse, function() {});
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_16_020: [The `sendMethodResponse` response shall call the `AmqpDeviceMethodClient.sendMethodResponse` method with the arguments that were given to it.]*/
    it('calls the `sendMethodResponse` method on the AmqpDeviceMethodClient object', function() {
      var fakeMethodResponse = { status: 200, payload: null };
      var fakeCallback = function() {};
      transport.sendMethodResponse(fakeMethodResponse, fakeCallback);
      assert(transport._deviceMethodClient.sendMethodResponse.calledWith(fakeMethodResponse, fakeCallback));
    });
  });

  describe('#connect', function () {
    /*Tests_SRS_NODE_DEVICE_AMQP_16_008: [The `done` callback method passed in argument shall be called if the connection is established]*/
    it('calls done if connection established using SSL', function () {
      var transport = new Amqp(configWithSSLOptions);
      sinon.stub(transport._amqp,'connect').callsArgWith(2,null);
      transport.connect(function(err) {
        assert.isNotOk(err);
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_16_009: [The `done` callback method passed in argument shall be called with an error object if the connection fails]*/
    it('calls done with an error if connection failed', function () {
      var transport = new Amqp(configWithSSLOptions);
      sinon.stub(transport._amqp,'connect').callsArgWith(2,new errors.UnauthorizedError('cryptic'));
      transport.connect(function(err) {
        assert.isOk(err);
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_06_005: [If x509 authentication is NOT being utilized then `initializeCBS` shall be invoked.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_06_008: [If `initializeCBS` is not successful then the client will remain disconnected and the callback will be called with an error per SRS_NODE_DEVICE_AMQP_16_009.]*/
    it('Invokes initializeCBS if NOT using x509 - initialize fails and disconnects', function () {
      var testError = new errors.NotConnectedError('fake error');
      var transport = new Amqp(configWithSAS);
      sinon.stub(transport._amqp,'connect').callsArgWith(2, null);
      sinon.stub(transport._amqp,'initializeCBS').callsArgWith(0, testError);
      sinon.stub(transport._amqp,'disconnect').callsArgWith(0, null);
      transport.connect(function(err) {
        assert.instanceOf(err, Error);
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_06_006: [If `initializeCBS` is successful, `putToken` shall be invoked If `initializeCBS` is successful, `putToken` shall be invoked with the first parameter audience, created from the sr of the sas signature, the next parameter of the actual sas, and a callback.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_06_009: [If `putToken` is not successful then the client will remain disconnected and the callback will be called with an error per SRS_NODE_DEVICE_AMQP_16_009.]*/
    it('Invokes putToken - puttoken fails and disconnects', function () {
      var testError = new errors.NotConnectedError('fake error');
      var transport = new Amqp(configWithSAS);
      sinon.stub(transport._amqp,'connect').callsArgWith(2, null);
      sinon.stub(transport._amqp,'initializeCBS').callsArgWith(0, null);
      sinon.stub(transport._amqp,'putToken').callsArgWith(2, testError);
      sinon.stub(transport._amqp,'disconnect').callsArgWith(0, null);
      transport.connect(function(err) {
        assert.instanceOf(err, Error);
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_16_008: [The `done` callback method passed in argument shall be called if the connection is established]*/
    it('Connect calls done when using sas', function () {
      var testError = new Error('fake error');
      var transport = new Amqp(configWithSAS);
      sinon.stub(transport._amqp,'connect').callsArgWith(2, null, testError);
      sinon.stub(transport._amqp,'initializeCBS').callsArgWith(0, null);
      sinon.stub(transport._amqp,'putToken').callsArgWith(2, null);
      transport.connect(function(err, result) {
        assert.isNotOk(err);
        assert.strictEqual(result, testError);
      });
    });

  });

  describe('#updateSharedAccessSignature', function() {

    /*Tests_SRS_NODE_DEVICE_AMQP_16_015: [The `updateSharedAccessSignature` method shall save the new shared access signature given as a parameter to its configuration.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_06_011: [The `updateSharedAccessSignature` method shall call the `done` callback with a null error object and a SharedAccessSignatureUpdated object as a result, indicating the client does NOT need to reestablish the transport connection.]*/
    /*Tests_SRS_NODE_DEVICE_AMQP_06_010: [The `updateSharedAccessSignature` method shall call the amqp transport `putToken` method with the first parameter audience, created from the sr of the sas signature, the next parameter of the actual sas, and a callback.]*/
    it('saves sharedAccessSignature - invokes puttoken and passes back result indicating NOT needing to reconnect', function () {
      var transport = new Amqp(configWithSAS);
      sinon.stub(transport._amqp,'putToken').callsArgWith(2, null);
      transport.updateSharedAccessSignature(simpleSas, function(err, result) {
        assert.equal(transport._config.sharedAccessSignature, simpleSas);
        assert.isNotOk(err);
        assert.isFalse(result.needToReconnect);
      });
    });

    it('invokes puttoken and an error results', function () {
      var testError = new Error('fake error');
      var transport = new Amqp(configWithSAS);
      sinon.stub(transport._amqp, 'putToken').callsArgWith(2, testError);
      transport.updateSharedAccessSignature(simpleSas, function(err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err.amqpError, testError);
      });
    });

  });

  describe('#setOptions', function () {
    var testOptions = {
      http: {
        receivePolicy: {interval: 1}
      }
    };
    /*Tests_SRS_NODE_DEVICE_AMQP_06_001: [The `setOptions` method shall throw a ReferenceError if the `options` parameter has not been supplied.]*/
    [undefined, null, ''].forEach(function (badOptions){
      it('throws if options is \'' + badOptions +'\'', function () {
        var transport = new Amqp(configWithSAS);
        assert.throws(function () {
          transport.setOptions(badOptions);
        }, ReferenceError, '');
      });
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_06_002: [If `done` has been specified the `setOptions` method shall call the `done` callback with no arguments when successful.]*/
    it('calls the done callback with no arguments', function(done) {
      var transport = new Amqp(configWithSAS);
      transport.setOptions(testOptions, done);
    });

    /*Tests_SRS_NODE_DEVICE_AMQP_06_003: [`setOptions` should not throw if `done` has not been specified.]*/
    it('does not throw if `done` is not specified', function() {
      var transport = new Amqp(configWithSAS);
      assert.doesNotThrow(function() {
        transport.setOptions({});
      });
    });
  });

});