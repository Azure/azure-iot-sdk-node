// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var sinonTestFactory = require('sinon-test');
var sinonTest = sinonTestFactory(sinon);
var AmqpMessage = require('../lib/amqp_message.js').AmqpMessage;
var Amqp = require('../lib/amqp.js').Amqp;
var MockCBSSecurityAgent = require('../lib/amqp_cbs.js');
var MockReceiverLink = require('../lib/receiver_link.js');
var MockSenderLink = require('../lib/sender_link.js');
var ReceiverLink = require('../lib/receiver_link.js').ReceiverLink;
var SenderLink = require('../lib/sender_link.js').SenderLink;
var results = require('azure-iot-common').results;
var errors = require('azure-iot-common').errors;
var Message = require('azure-iot-common').Message;
var EventEmitter = require('events').EventEmitter;
var uuid = require('uuid');

describe('Amqp', function () {
  sinon.test = sinonTest;
  /*Tests_SRS_NODE_COMMON_AMQP_16_042: [The Amqp constructor shall create a new `amqp10.Client` instance and configure it to:
  - not reconnect on failure
  - not reattach sender and receiver links on failure]*/
  describe('#policies', function () {
    it('sets the connection to not reconnect on failure', function () {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});
      amqp.connect({uri: 'uri'}, function(err) {
        assert.isNotOk(err,'client connected');
        assert(amqp._rheaContainer.connect.args[0][0].hasOwnProperty('reconnect'), 'connection parameter has reconnect property');
        assert.isFalse(amqp._rheaContainer.connect.args[0][0].reconnect, 'connection parameter reconnect is false');
      });
    });

    it('sets the links to not reattach on failure', function () {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});
      amqp.connect({uri: 'uri'}, function(err, res) {
        assert.isNotOk(err,'client connected');
        assert.isFalse(amqp._rheaContainer.options.sender_options.reconnect, 'rhea sender does not reconnect');
        assert.isFalse(amqp._rheaContainer.options.receiver_options.reconnect, 'rhea sender does not reconnect');
      });
    });
  });

  describe('#connect', function () {
    /*Tests_SRS_NODE_COMMON_AMQP_16_002: [The connect method shall establish a connection with the IoT hub instance and if given as argument call the `done` callback with a null error object in the case of success and a `results.Connected` object.]*/
    /*Tests_SRS_NODE_COMMON_AMQP_06_011: [The `connect` method shall set up a listener for responses to put tokens.]*/
    it('Calls the done callback when successfully connected', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {
        process.nextTick(() => {
          amqp._rheaConnection.emit('connection_open', fakeConnectionContext);
        });
        return fakeConnection;
      });
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {
        process.nextTick(() => {
          fakeSession.emit('session_open', fakeSessionContext);
        });
      });
      amqp.connect({uri: 'uri'}, function(err, res) {
        if (err) testCallback(err);
        else {
          assert.instanceOf(res, results.Connected);
          testCallback();
        }
      });
    });

    it('Calls the done callback immediately when already connected', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, function(err, res) {
        if (err) testCallback(err);
        else {
          assert.instanceOf(res, results.Connected);
          assert(amqp._rheaContainer.connect.calledOnce);
          amqp.connect({uri: 'uri'}, function(err, res) {
            if (err) testCallback(err);
            else {
              assert.instanceOf(res, results.Connected);
              assert(amqp._rheaContainer.connect.calledOnce);
            }
          });
          testCallback();
        }
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_003: [If given as an argument, the connect method shall call the `done` callback with a standard `Error` object if the connection fails.]*/
    it('Calls the done callback with an error if connecting fails (disconnected)', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      var fakeConnectionContext = {connection: fakeConnection};
      fakeConnection.name = 'connection';
      fakeConnection.error = new Error();
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('disconnected', fakeConnectionContext)}); return fakeConnection});

      amqp.connect({uri: 'uri'}, function(err) {
        assert.instanceOf(err, Error);
        testCallback();
      });
    });

    it('Calls the done callback with an error if connecting fails (auth error)', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      var fakeConnectionContext = {container: amqp._rheaContainer, connection: fakeConnection};
      fakeConnection.error = new Error();
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_error', fakeConnectionContext);amqp._rheaConnection.emit('connection_close', fakeConnectionContext)}); return fakeConnection});
      amqp.connect({uri: 'uri'}, function(err) {
        assert.strictEqual(err, fakeConnection.error);
        testCallback();
      });
    });

    it('Calls the done callback with an error if an error is emitted to the connection object', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      var fakeConnectionContext = {container: amqp._rheaContainer, connection: fakeConnection};
      fakeConnection.error = new Error();
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('error', fakeConnectionContext);}); return fakeConnection});
      amqp.connect({uri: 'uri'}, function(err) {
        assert.strictEqual(err, fakeConnection.error);
        testCallback();
      });
    });

    describe('#session begin', function() {
      it('invokes the connect callback with an error if the session begin fails', (testCallback) => {
        var amqp = new Amqp();
        var fakeSessionError = new Error('fake session error');
        var fakeConnection = new EventEmitter();
        fakeConnection.close = () => {};
        sinon.stub(fakeConnection, 'close').callsFake(() => {
          process.nextTick(() => {
            amqp._rheaConnection.emit('connection_close', fakeConnectionContext);
          });
        });
        fakeConnection.name = 'connection';
        var fakeConnectionContext = {connection: fakeConnection};
        sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {
          process.nextTick(() => {
            fakeConnection.emit('connection_open', fakeConnectionContext);
          });
          return fakeConnection;
        });
        var fakeSession = new EventEmitter();
        fakeSession.close = sinon.stub();
        var fakeSessionContext = {session: fakeSession};
        fakeConnection.create_session = sinon.stub().returns(fakeSession);
        fakeSession.open = () => {};
        sinon.stub(fakeSession, 'open').callsFake(() => {
          process.nextTick(() => {
            fakeSession.error = fakeSessionError;
            fakeSession.emit('session_error', fakeSessionContext);
            fakeSession.error = undefined;
            fakeSession.emit('session_close', fakeSessionContext);
          });
        });
        amqp.connect({uri: 'uri'}, function(err) {
          assert.strictEqual(err, fakeSessionError);
          testCallback();
        });
      })

      it('invokes the connect callback with an error if a connect error occurs while connecting the session', (testCallback) => {
        var amqp = new Amqp();
        var fakeConnectionError = new Error('fake connection error');
        var fakeConnection = new EventEmitter();
        fakeConnection.close = () => {};
        sinon.stub(fakeConnection, 'close').callsFake(() => {
          process.nextTick(() => {
            amqp._rheaConnection.emit('connection_close', fakeConnectionContext);
          });
        });
        fakeConnection.name = 'connection';
        var fakeConnectionContext = {connection: fakeConnection};
        sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {
          process.nextTick(() => {
            fakeConnection.emit('connection_open', fakeConnectionContext);
          });
          return fakeConnection;
        });
        var fakeSession = new EventEmitter();
        fakeSession.close = sinon.stub();
        fakeConnection.create_session = sinon.stub().returns(fakeSession);
        fakeSession.open = () => {};
        sinon.stub(fakeSession, 'open').callsFake(() => {
          process.nextTick(() => {
            fakeConnection.error = fakeConnectionError;
            fakeConnection.emit('connection_error', fakeConnectionContext);
            fakeConnection.error = undefined;
            fakeConnection.emit('connection_close', fakeConnectionContext);
          });
        });
        amqp.connect({uri: 'uri'}, function(err) {
          assert.strictEqual(err, fakeConnectionError);
          testCallback();
        });
      });

      it('invokes the connect callback with an error if a disconnect error occurs while connecting the session', (testCallback) => {
        var amqp = new Amqp();
        var fakeConnection = new EventEmitter();
        fakeConnection.close = () => {};
        sinon.stub(fakeConnection, 'close').callsFake(() => {
          process.nextTick(() => {
            amqp._rheaConnection.emit('connection_close', fakeConnectionContext);
          });
        });
        fakeConnection.name = 'connection';
        var fakeConnectionContext = {connection: fakeConnection};
        sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {
          process.nextTick(() => {
            fakeConnection.emit('connection_open', fakeConnectionContext);
          });
          return fakeConnection;
        });
        var fakeSession = new EventEmitter();
        fakeSession.close = sinon.stub();
        fakeConnection.create_session = sinon.stub().returns(fakeSession);
        fakeSession.open = () => {};
        sinon.stub(fakeSession, 'open').callsFake(() => {
          process.nextTick(() => {
            fakeConnection.emit('disconnected', fakeConnectionContext)
          });
        });
        amqp.connect({uri: 'uri'}, function(err) {
          assert.instanceOf(err, errors.NotConnectedError);
          testCallback();
        });
      });

      it('invokes the connect callback with an error if an `error` occurs while connecting the session', (testCallback) => {
        var amqp = new Amqp();
        var fakeConnectionError = new Error('fake connection error');
        var fakeConnection = new EventEmitter();
        fakeConnection.close = () => {};
        sinon.stub(fakeConnection, 'close').callsFake(() => {
          process.nextTick(() => {
            amqp._rheaConnection.emit('connection_close', fakeConnectionContext);
          });
        });
        fakeConnection.name = 'connection';
        var fakeConnectionContext = {connection: fakeConnection};
        sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {
          process.nextTick(() => {
            fakeConnection.emit('connection_open', fakeConnectionContext);
          });
          return fakeConnection;
        });
        var fakeSession = new EventEmitter();
        fakeSession.close = sinon.stub();
        fakeConnection.create_session = sinon.stub().returns(fakeSession);
        fakeSession.open = () => {};
        sinon.stub(fakeSession, 'open').callsFake(() => {
          process.nextTick(() => {
            fakeConnection.error = fakeConnectionError;
            fakeConnection.emit('error', fakeConnectionContext)
            fakeConnection.error = undefined;
          });
        });
        amqp.connect({uri: 'uri'}, function(err) {
          assert.strictEqual(err, fakeConnectionError, 'inappropriate error indicated');
          testCallback();
        });
      });
    });
    describe('#connection failures', function() {
      it('invokes the disconnect handler with an error if the connection fails - returns to the disconnected state.', (testCallback) => {
        var amqp = new Amqp();
        var fakeConnection = new EventEmitter();
        var fakeConnectionError = new Error('fake connection error');
        fakeConnection.name = 'connection';
        var fakeConnectionContext = {connection: fakeConnection};
        sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
        fakeConnection.close = () => {};
        sinon.stub(fakeConnection, 'close').callsFake(() => {
          process.nextTick(() => {
            amqp._rheaConnection.emit('connection_close', fakeConnectionContext);
          });
        });
        var fakeSession = new EventEmitter();
        var fakeSessionContext = {session: fakeSession};
        fakeConnection.create_session = sinon.stub().returns(fakeSession);
        fakeSession.open = () => {};
        sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});
        fakeSession.close = () => {};
        sinon.stub(fakeSession, 'close').callsFake(() => {
          process.nextTick(() => {
            amqp._rheaSession.emit('session_close', fakeSessionContext);
          });
        });

        amqp.setDisconnectHandler(function(err) {
          assert.strictEqual(err, fakeConnectionError, 'inappropriate error indicated to disconnect handler');
          assert(amqp._fsm.state, 'disconnected', 'did not return to the disconnected state');
          testCallback();
        });
        amqp.connect({uri: 'uri'}, function(err) {
          assert.isNotOk(err);
          assert(amqp._fsm.state, 'connected', 'did not transition to the `connected` state');
          fakeConnection.error = fakeConnectionError;
          fakeConnection.emit('connection_error', fakeConnectionContext);
          fakeConnection.error = undefined;
          fakeConnection.emit('connection_close', fakeConnectionContext);
        });
      });

      it('invokes the disconnect handler with an error if the session fails - returns to the disconnected state.', (testCallback) => {
        var amqp = new Amqp();
        var fakeConnection = new EventEmitter();
        var fakeSessionError = new Error('fake session error');
        fakeConnection.name = 'connection';
        var fakeConnectionContext = {connection: fakeConnection};
        sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
        fakeConnection.close = () => {};
        sinon.stub(fakeConnection, 'close').callsFake(() => {
          process.nextTick(() => {
            amqp._rheaConnection.emit('connection_close', fakeConnectionContext);
          });
        });
        var fakeSession = new EventEmitter();
        var fakeSessionContext = {session: fakeSession};
        fakeConnection.create_session = sinon.stub().returns(fakeSession);
        fakeSession.open = () => {};
        sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});
        fakeSession.close = () => {};
        sinon.stub(fakeSession, 'close').callsFake(() => {
          process.nextTick(() => {
            amqp._rheaSession.emit('session_close', fakeSessionContext);
          });
        });

        amqp.setDisconnectHandler(function(err) {
          assert.strictEqual(err, fakeSessionError, 'inappropriate error indicated to disconnect handler');
          assert(amqp._fsm.state, 'disconnected', 'did not return to the disconnected state');
          testCallback();
        });
        amqp.connect({uri: 'uri'}, function(err) {
          assert.isNotOk(err);
          assert(amqp._fsm.state, 'connected', 'did not transition to the `connected` state');
          fakeSession.error = fakeSessionError;
          fakeSession.emit('session_error', fakeSessionContext);
          fakeSession.error = undefined;
          fakeSession.emit('session_close', fakeSessionContext);
        });
      });

      it('invokes the disconnect handler with an error if an `error` is emitted - returns to the disconnected state.', (testCallback) => {
        var amqp = new Amqp();
        var fakeConnection = new EventEmitter();
        var fakeConnectionError = new Error('fake connection error');
        fakeConnection.name = 'connection';
        var fakeConnectionContext = {connection: fakeConnection};
        sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
        fakeConnection.close = () => {};
        sinon.stub(fakeConnection, 'close').callsFake(() => {
          process.nextTick(() => {
            amqp._rheaConnection.emit('connection_close', fakeConnectionContext);
          });
        });
        var fakeSession = new EventEmitter();
        var fakeSessionContext = {session: fakeSession};
        fakeConnection.create_session = sinon.stub().returns(fakeSession);
        fakeSession.open = () => {};
        sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});
        fakeSession.close = () => {};
        sinon.stub(fakeSession, 'close').callsFake(() => {
          process.nextTick(() => {
            amqp._rheaSession.emit('session_close', fakeSessionContext);
          });
        });

        amqp.setDisconnectHandler(function(err) {
          assert.strictEqual(err, fakeConnectionError, 'inappropriate error indicated to disconnect handler');
          assert(amqp._fsm.state, 'disconnected', 'did not return to the disconnected state');
          testCallback();
        });
        amqp.connect({uri: 'uri'}, function(err) {
          assert.isNotOk(err);
          assert(amqp._fsm.state, 'connected', 'did not transition to the `connected` state');
          fakeConnection.error = fakeConnectionError;
          fakeConnection.emit('error', fakeConnectionContext);
          fakeConnection.error = undefined;
        });
      });
    });
  });

  describe('#setDisconnectHandler', function() {
    it('disconnect callback is called when the \'disconnected\' event is emitted while connected', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      fakeSession.name = 'session';
      var fakeSessionContext = {connection: fakeConnection, session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.setDisconnectHandler(function() {
        testCallback();
      });
      amqp.connect({uri: 'uri'}, function () {
        var fakeError = new Error('Connected closed');
        fakeConnection.error = fakeError;
        fakeConnection.emit('disconnected', fakeConnectionContext);
      });
    });

    it('ignores the disconnected event if already disconnected', function (testCallback) {
      var amqp = new Amqp();
      amqp.setDisconnectHandler(function() {
        assert.fail();
      });
      amqp._rheaContainer.emit('disconnected');
      testCallback();
    });

    it('ignores the disconnected event if fired while connecting', function (testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      fakeSession.name = 'session';
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeSession.open = () => sinon.stub();

      amqp.setDisconnectHandler(function() {
        assert.fail();
      });
      amqp.connect({uri: 'uri'}, function() {});
      fakeConnection.emit('disconnected', fakeConnectionContext);
      testCallback();
    });

    it('ignores the disconnected event if fired while disconnecting', function (testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      fakeSession.name = 'session';
      var fakeSessionContext = {connection: fakeConnection, session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeConnection.close = sinon.stub();
      fakeSession.close = sinon.stub();
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      fakeConnection.close = sinon.stub();

      amqp.setDisconnectHandler(function() {
        assert.fail();
      });
      amqp.connect({uri: 'uri'}, () => {
        amqp.disconnect(function () { });
        fakeConnection.error = new Error('connection disconnected');
        fakeConnection.emit('disconnected', fakeConnectionContext);
        testCallback();
      });
    });
  });

  describe('#disconnect', function() {
    /*Tests_SRS_NODE_COMMON_AMQP_16_034: [The `disconnect` method shall detach all open links before disconnecting the underlying AMQP client.]*/
    it('detaches the CBS endpoints before disconnecting the client', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      fakeSession.name = 'session';
      var fakeSessionContext = {connection: fakeConnection, session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeConnection.close = () => {};
      sinon.stub(fakeConnection, 'close').callsFake(() => {process.nextTick(() => {fakeConnection.emit('connection_close', fakeConnectionContext)})});
      fakeSession.close = () => {};
      sinon.stub(fakeSession, 'close').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_close', fakeSessionContext)})});
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp._cbs = {
        detach: sinon.stub().callsArg(0)
      };

      amqp.connect({uri: 'uri'}, function() {
        amqp.disconnect(function(err) {
          if (err) {
            testCallback(err);
          } else {
            testCallback();
          }
        });
      });
    });

    /*Tests_SRS_NODE_COMMON_AMQP_16_034: [The `disconnect` method shall detach all open links before disconnecting the underlying AMQP client.]*/
    it('detaches existing links before disconnecting the client', function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      fakeSession.name = 'session';
      var fakeSessionContext = {connection: fakeConnection, session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeConnection.close = () => {};
      sinon.stub(fakeConnection, 'close').callsFake(() => {process.nextTick(() => {fakeConnection.emit('connection_close', fakeConnectionContext)})});
      fakeSession.close = () => {};
      sinon.stub(fakeSession, 'close').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_close', fakeSessionContext)})});
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      var fakeSender = {
        detach: sinon.stub().callsArg(0)
      };
      var fakeReceiver = {
        detach: sinon.stub().callsArg(0)
      };

      amqp.connect({uri: 'uri'}, function() {
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
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      fakeSession.name = 'session';
      var fakeSessionContext = {connection: fakeConnection, session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeConnection.close = () => {};
      sinon.stub(fakeConnection, 'close').callsFake(() => {process.nextTick(() => {fakeConnection.emit('connection_close', fakeConnectionContext)})});
      fakeSession.close = () => {};
      sinon.stub(fakeSession, 'close').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_close', fakeSessionContext)})});
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, function() {
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
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      fakeSession.name = 'session';
      var fakeSessionContext = {connection: fakeConnection, session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeConnection.close = () => {};
      sinon.stub(fakeConnection, 'close').callsFake(() => {process.nextTick(() => {fakeConnection.error = new Error('connection error'); fakeConnection.emit('connection_error', fakeConnectionContext); fakeConnection.error = undefined; fakeConnection.emit('connection_close', fakeConnectionContext)})});
      fakeSession.close = () => {};
      sinon.stub(fakeSession, 'close').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_close', fakeSessionContext)})});
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, function() {
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
      amqp.disconnect(function(err) {
        assert.isNull(err);
        testCallback();
      });
    });

    it('ignores client errors emitted while disconnecting', function (testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      fakeSession.name = 'session';
      var fakeSessionContext = {connection: fakeConnection, session: fakeSession};
      fakeConnection.create_session = sinon.stub().returns(fakeSession);
      fakeConnection.close = sinon.stub();
      fakeSession.close = () => {};
      sinon.stub(fakeSession, 'close').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_close', fakeSessionContext)})});
      fakeSession.open = () => {};
      sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.setDisconnectHandler(function() {
        assert.fail();
      });
      amqp.connect({uri: 'uri'}, function() {
        amqp.disconnect(function() {});
        fakeConnection.error = new Error('should be ignored');
        fakeConnection.emit('error', fakeConnectionContext);
        testCallback();
      });
    });
  });

  describe('#connect using custom SASL', function() {
    it.skip('sets the saslMechanism property in the policyOverride object', function (testCallback) {
      var amqp = new Amqp();
      var connectStub = sinon.stub(amqp._amqp, 'connect').resolves();
      var fakeSaslName = 'FAKE';
      var fakeSaslMechanism = { getInitFrame: function () {}, getResponseFrame: function () {}};

      var config = {
        uri: 'uri',
        saslMechanismName: fakeSaslName,
        saslMechanism: fakeSaslMechanism
      };

      amqp.connect(config, function () {
        assert.strictEqual(connectStub.firstCall.args[1].saslMechanism, fakeSaslName);
        testCallback();
      });
    });

    it.skip('calls registerSaslMechanism on the amqp10 client', function (testCallback) {
      var amqp = new Amqp();
      sinon.stub(amqp._amqp, 'connect').resolves();
      var registerSaslMechanismStub = sinon.stub(amqp._amqp, 'registerSaslMechanism');
      var fakeSaslName = 'FAKE';
      var fakeSaslMechanism = { getInitFrame: function () {}, getResponseFrame: function () {}};
      var config= {
        uri: 'uri',
        saslMechanismName: fakeSaslName,
        saslMechanism: fakeSaslMechanism
      };

      amqp.connect(config, function () {
        assert.strictEqual(registerSaslMechanismStub.firstCall.args[0], fakeSaslName);
        assert.strictEqual(registerSaslMechanismStub.firstCall.args[1], fakeSaslMechanism);
        testCallback();
      });
    });
  });

  describe('#send', function() {
    it('calls the done callback with a MessageEnqueued result if it successful', sinon.test(function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, () => {
        var fakeLink = new SenderLink('endpoint', undefined, fakeSession);
        fakeLink.attach = this.stub().callsArg(0);
        fakeLink.send = this.stub().callsArgWith(1, null, new results.MessageEnqueued());
        this.stub(MockSenderLink, 'SenderLink').returns(fakeLink);
        amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err, result) {
          if(!err) {
            assert.instanceOf(result, results.MessageEnqueued);
          }
          testCallback(err);
        });
      });
    }));

    /*Tests_SRS_NODE_COMMON_AMQP_16_007: [If send encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript Error object with a text description of the error (err.message).]*/
    it('calls the done callback with an Error if creating a sender fails', sinon.test(function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, () => {
        var fakeError = new Error('bad sender attach');
        var fakeLink = new SenderLink('endpoint', undefined, fakeSession);
        fakeLink.attach = this.stub().callsArgWith(0,fakeError);
        this.stub(MockSenderLink, 'SenderLink').returns(fakeLink);
        amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err) {
          assert.strictEqual(err, fakeError, 'incorrect error returned from attach for send');
          testCallback();
        });
      });
    }));

    it('calls the done callback with an Error if the sender fails to send the message', sinon.test(function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, () => {
        var fakeError = new Error('bad sender send');
        var fakeLink = new SenderLink('endpoint', undefined, fakeSession);
        fakeLink.attach = this.stub().callsArg(0);
        fakeLink.send = this.stub().callsArgWith(1, fakeError);
        this.stub(MockSenderLink, 'SenderLink').returns(fakeLink);
        amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err) {
          assert.strictEqual(err, fakeError, 'incorrect error returned from attach for send');
          testCallback();
        });
      });
    }));

    it('Reuses the same sender link if already created', sinon.test(function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, () => {
        var fakeLink = new SenderLink('endpoint', undefined, fakeSession);
        fakeLink.attach = this.stub().callsArg(0);
        fakeLink.send = this.stub().callsArgWith(1, null, new results.MessageEnqueued());
        this.stub(MockSenderLink, 'SenderLink').returns(fakeLink);
        amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err, result) {
          if (err) {
            testCallback(err);
          } else {
            assert.instanceOf(result, results.MessageEnqueued);
            assert(MockSenderLink.SenderLink.calledOnce);
            amqp.send(new Message('message'), 'endpoint', 'deviceId', function(err, result) {
              if (!err) {
                assert.instanceOf(result, results.MessageEnqueued);
                assert(MockSenderLink.SenderLink.calledOnce);
              }
              testCallback(err);
            });
          }
        });
      });
    }));

    it('does not populate the \'to\' property of the amqp message if not passed', sinon.test(function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      assert.doesNotThrow(() => {
        amqp.connect({uri: 'uri'}, () => {
          var fakeLink = new SenderLink('endpoint', undefined, fakeSession);
          fakeLink.attach = this.stub().callsArg(0);
          fakeLink.send = this.stub().callsArgWith(1, null, new results.MessageEnqueued());
          this.stub(MockSenderLink, 'SenderLink').returns(fakeLink);
          amqp.send(new Message('message'), 'endpoint', undefined, function() {
            assert.isUndefined(fakeLink.send.args[0][0].to);
            testCallback();
          });
        });
      });
    }));

    /*Tests_SRS_NODE_COMMON_AMQP_16_011: [All methods should treat the `done` callback argument as optional and not throw if it is not passed as argument.]*/
    it('does not throw on success if no callback is provided', sinon.test(function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      assert.doesNotThrow(() => {
        var fakeLink = new SenderLink('endpoint', undefined, fakeSession);
        fakeLink.attach = this.stub().callsArg(0);
        fakeLink.send = this.stub();
        this.stub(MockSenderLink, 'SenderLink').returns(fakeLink);
        amqp.connect({uri: 'uri'}, () => {
          amqp.send(new Message('message'), 'endpoint', 'deviceId');
          assert(fakeLink.send.calledOnce, 'the link send api not invoked');
          testCallback();
        });
      });
    }));

    it('does not throw on error if no callback is provided', sinon.test(function(testCallback) {
      //
      // Effectively this is the same as the previous test.
      //
      // We are NOT testing whether rhea senders can handle not having a callback.  We're testing that OUR transport
      // can handle not having a transport.
      //
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      assert.doesNotThrow(() => {
        var fakeLink = new SenderLink('endpoint', undefined, fakeSession);
        fakeLink.attach = this.stub().callsArg(0);
        fakeLink.send = this.stub();
        this.stub(MockSenderLink, 'SenderLink').returns(fakeLink);
        amqp.connect({uri: 'uri'}, () => {
          amqp.send(new Message('message'), 'endpoint', 'deviceId');
          assert(fakeLink.send.calledOnce, 'the link send api not invoked');
          testCallback();
        });
      });
    }));
  });

  describe('#getReceiver', function() {
    /*Tests_SRS_NODE_COMMON_AMQP_16_010: [If a receiver for this endpoint doesn't exist, the getReceiver method should create a new AmqpReceiver object and then call the `done` method with the object that was just created as an argument.]*/
    it('calls the done callback with a null Error and a receiver if successful', sinon.test(function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, () => {
        var fakeLink = new ReceiverLink('endpoint', undefined, fakeSession);
        fakeLink.attach = this.stub().callsArg(0);
        this.stub(MockReceiverLink, 'ReceiverLink').returns(fakeLink);
        amqp.getReceiver('endpoint', function(err, receiver) {
          assert.instanceOf(receiver, ReceiverLink);
          testCallback(err);
        });
      });
    }));

    /*Tests_SRS_NODE_COMMON_AMQP_16_009: [If a receiver for this endpoint has already been created, the getReceiver method should call the `done` method with the existing instance as an argument.]*/
    it('gets the existing receiver for an endpoint if it was previously created', sinon.test(function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, () => {
        var fakeLink = new ReceiverLink('endpoint', undefined, fakeSession);
        fakeLink.attach = this.stub().callsArg(0);
        this.stub(MockReceiverLink, 'ReceiverLink').returns(fakeLink);
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

    }));

    it('calls the done callback with an Error if it fails', sinon.test(function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, () => {
        var fakeError = new Error('fake create error');
        var fakeLink = new ReceiverLink('endpoint', undefined, fakeSession);
        fakeLink.attach = this.stub().callsArgWith(0, fakeError);
        this.stub(MockReceiverLink, 'ReceiverLink').returns(fakeLink);
        amqp.getReceiver('endpoint', function(err) {
          assert.instanceOf(err, Error);
          testCallback();
        });
      });
    }));
  });

  describe('#CBS', function() {
    it('initializeCBS invokes callback with no error if successful', sinon.test(function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, (err) => {
        var fakeAgent = new EventEmitter();
        fakeAgent.attach = this.stub().callsArg(0);
        this.stub(MockCBSSecurityAgent, 'ClaimsBasedSecurityAgent').returns(fakeAgent);
        assert.isNotOk(err, 'the connection failed to be established');
        assert(amqp._fsm.state, 'connected', 'Not connected after CBS initialized');
        amqp.initializeCBS((cbsError) => {
          assert(MockCBSSecurityAgent.ClaimsBasedSecurityAgent.calledOnce, 'the CBS constructor was not invoked');
          assert(amqp._fsm.state, 'connected', 'Not connected after CBS initialized');
          testCallback(cbsError);
        });
      })
    }));

    it('putToken will invoke initialize CBS if was not already invoked', sinon.test(function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, (err) => {
        var fakeAgent = new EventEmitter();
        fakeAgent.attach = this.stub().callsArg(0);
        fakeAgent.putToken = this.stub().callsArg(2);
        this.stub(MockCBSSecurityAgent, 'ClaimsBasedSecurityAgent').returns(fakeAgent);
        assert.isNotOk(err, 'the connection failed to be established');
        assert(amqp._fsm.state, 'connected', 'Not connected after CBS initialized');
        amqp.putToken('audience', 'token', (tokenError) => {
          assert(MockCBSSecurityAgent.ClaimsBasedSecurityAgent.calledOnce, 'the CBS constructor was not invoked');
          assert(amqp._fsm.state, 'connected', 'Not connected after CBS initialized');
          testCallback(tokenError);
        });
      });
    }));

    it('putToken will invoke initialize CBS if was not already invoked and invoke callback with error when initialize fails', sinon.test(function(testCallback) {
      var amqp = new Amqp();
      var fakeCBSError = new Error('fake CBS error');
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, (err) => {
        var fakeAgent = new EventEmitter();
        fakeAgent.attach = this.stub().callsArgWith(0, fakeCBSError);
        this.stub(MockCBSSecurityAgent, 'ClaimsBasedSecurityAgent').returns(fakeAgent);
        assert.isNotOk(err, 'the connection failed to be established');
        assert(amqp._fsm.state, 'connected', 'Not connected after CBS initialized');
        amqp.putToken('audience', 'token', (tokenError) => {
          assert.strictEqual(tokenError, fakeCBSError, 'Improper error returned from initializing the CBS');
          testCallback();
        });
      });
    }));

    it('initializeCBS invoked only once', sinon.test(function(testCallback) {
      var amqp = new Amqp();
      var fakeConnection = new EventEmitter();
      fakeConnection.name = 'connection';
      var fakeConnectionContext = {connection: fakeConnection};
      this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
      var fakeSession = new EventEmitter();
      var fakeSessionContext = {session: fakeSession};
      fakeConnection.create_session = this.stub().returns(fakeSession);
      fakeSession.open = () => {};
      this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

      amqp.connect({uri: 'uri'}, (err) => {
        var fakeAgent = new EventEmitter();
        fakeAgent.attach = this.stub().callsArg(0);
        fakeAgent.putToken = this.stub().callsArg(2);
        this.stub(MockCBSSecurityAgent, 'ClaimsBasedSecurityAgent').returns(fakeAgent);
        assert.isNotOk(err, 'the connection failed to be established');
        assert(amqp._fsm.state, 'connected', 'Not connected after CBS initialized');
        amqp.initializeCBS((cbsError) => {
          assert.isNotOk(cbsError, 'CBS did not initialize');
          amqp.putToken('audience', 'token', (tokenError) => {
            assert(MockCBSSecurityAgent.ClaimsBasedSecurityAgent.calledOnce, 'the CBS constructor was not invoked');
            testCallback(tokenError);
          })
        });
      })
    }));
  });

  describe('Links', function() {
    var fakeEndpoint = 'fakeEndpoint';
    [
      { amqpFunc: 'attachSenderLink', privateLinkArray: '_senders', mockLink: MockSenderLink, nameOfConstructor: 'SenderLink'},
      { amqpFunc: 'attachReceiverLink', privateLinkArray: '_receivers', mockLink: MockReceiverLink, nameOfConstructor: 'ReceiverLink'}
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

        /*Tests_SRS_NODE_COMMON_AMQP_06_006: [The `attachReceiverLink` method shall call `attach` on the `ReceiverLink` object.] */
        /*Tests_SRS_NODE_COMMON_AMQP_06_005: [The `attachSenderLink` method shall call `attach` on the `SenderLink` object.] */
        /*Tests_SRS_NODE_COMMON_AMQP_06_003: [The `attachSenderLink` method shall create a policy object that contain link options to be merged if the linkOptions argument is not falsy.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_06_004: [The `attachReceiverLink` method shall create a policy object that contain link options to be merged if the linkOptions argument is not falsy.]*/
        it('calls `attach` with success and passes options to the constructor ', sinon.test(function(testCallback) {
          var amqp = new Amqp();
          var fakeConnection = new EventEmitter();
          fakeConnection.name = 'connection';
          var fakeConnectionContext = {connection: fakeConnection};
          this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
          var fakeSession = new EventEmitter();
          fakeSession.name = 'session';
          var fakeSessionContext = {connection: fakeConnection, session: fakeSession};
          fakeConnection.create_session = this.stub().returns(fakeSession);
          fakeConnection.close = this.stub();
          fakeSession.close = () => {};
          this.stub(fakeSession, 'close').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_close', fakeSessionContext)})});
          fakeSession.open = () => {};
          this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

          var fakeLink = new EventEmitter();
          fakeLink.attach = sinon.stub().callsArg(0);
          var fakeOptions = {color: 'red'};

          amqp.connect({uri: 'uri'}, () => {
            this.stub(testConfig.mockLink, testConfig.nameOfConstructor).returns(fakeLink);
            amqp[testConfig.amqpFunc](fakeEndpoint, fakeOptions, function(err) {
              assert(testConfig.mockLink[testConfig.nameOfConstructor].calledWith(fakeEndpoint,fakeOptions), 'constructor passed address and options');
              if (err) { return testCallback(err); }
              assert(fakeLink.attach.calledOnce, 'attach is invoked');
              testCallback();
            });
          });
        }));

        /*Tests_SRS_NODE_COMMON_AMQP_16_016: [The `attachSenderLink` method shall call the `done` callback with an `Error` object if the link object wasn't created successfully.]*/
        /*Tests_SRS_NODE_COMMON_AMQP_16_021: [The `attachReceiverLink` method shall call the `done` callback with an `Error` object if the link object wasn't created successfully.]*/
        it('calls the done callback with an error if attaching the link failed', sinon.test(function(testCallback) {
          var amqp = new Amqp();
          var fakeConnection = new EventEmitter();
          fakeConnection.name = 'connection';
          var fakeConnectionContext = {connection: fakeConnection};
          this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
          var fakeSession = new EventEmitter();
          fakeSession.name = 'session';
          var fakeSessionContext = {connection: fakeConnection, session: fakeSession};
          fakeConnection.create_session = this.stub().returns(fakeSession);
          fakeConnection.close = this.stub();
          fakeSession.close = () => {};
          this.stub(fakeSession, 'close').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_close', fakeSessionContext)})});
          fakeSession.open = () => {};
          this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

          var fakeLink = new EventEmitter();
          var fakeAttachError = new Error('bad attach');
          fakeLink.attach = sinon.stub().callsArgWith(0, fakeAttachError);

          amqp.connect({uri: 'uri'}, () => {
            this.stub(testConfig.mockLink, testConfig.nameOfConstructor).returns(fakeLink);
            amqp[testConfig.amqpFunc](fakeEndpoint, null, function(err) {
              assert.strictEqual(err, fakeAttachError);
              assert(fakeLink.attach.calledOnce, 'attach is invoked');
              testCallback();
            });
          });
        }));

        it('calls the done callback with an error if the connection fails while trying to attach the link', sinon.test(function(testCallback) {
          var amqp = new Amqp();
          var fakeConnection = new EventEmitter();
          fakeConnection.name = 'connection';
          var fakeConnectionContext = {connection: fakeConnection};
          this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
          var fakeSession = new EventEmitter();
          fakeSession.name = 'session';
          var fakeSessionContext = {connection: fakeConnection, session: fakeSession};
          fakeConnection.create_session = this.stub().returns(fakeSession);
          fakeConnection.close = this.stub();
          fakeSession.close = () => {};
          this.stub(fakeSession, 'close').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_close', fakeSessionContext)})});
          fakeSession.open = () => {};
          this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

          var fakeLink = new EventEmitter();
          var fakeError = new Error('error emitted');
          fakeLink.attach = sinon.stub();

          amqp.connect({uri: 'uri'}, () => {
            this.stub(testConfig.mockLink, testConfig.nameOfConstructor).returns(fakeLink);
            amqp[testConfig.amqpFunc](fakeEndpoint, null, function(err) {
              assert.strictEqual(fakeError, err);
              testCallback();
            });
            fakeLink.emit('error', fakeError);
          });
        }));

        it('subscribe to the `error` event and removes the link from ' + testConfig.privateLinkArray + ' if it is emitted', sinon.test(function(testCallback) {
          var amqp = new Amqp();
          var fakeConnection = new EventEmitter();
          fakeConnection.name = 'connection';
          var fakeConnectionContext = {connection: fakeConnection};
          this.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
          var fakeSession = new EventEmitter();
          fakeSession.name = 'session';
          var fakeSessionContext = {connection: fakeConnection, session: fakeSession};
          fakeConnection.create_session = this.stub().returns(fakeSession);
          fakeConnection.close = this.stub();
          fakeSession.close = () => {};
          this.stub(fakeSession, 'close').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_close', fakeSessionContext)})});
          fakeSession.open = () => {};
          this.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

          var fakeLink = new EventEmitter();
          fakeLink.attach = sinon.stub().callsArgWith(0);

          amqp.connect({uri: 'uri'}, () => {
            this.stub(testConfig.mockLink, testConfig.nameOfConstructor).returns(fakeLink);
            amqp[testConfig.amqpFunc](fakeEndpoint, null, function() {
              assert.isDefined(amqp[testConfig.privateLinkArray][fakeEndpoint]);
              fakeLink.emit('error', new Error('error emitted'));
              assert.isUndefined(amqp[testConfig.privateLinkArray][fakeEndpoint]);
              testCallback();
            });
          });
        }));
      });
    });

    [
      { amqpFunc: 'detachSenderLink', privateLinkArray: '_senders', mockLink: MockSenderLink, nameOfConstructor: 'SenderLink'},
      { amqpFunc: 'detachReceiverLink', privateLinkArray: '_receivers', mockLink: MockReceiverLink, nameOfConstructor: 'ReceiverLink'}
    ].forEach(function(testConfig) {
      describe('#' + testConfig.amqpFunc, function() {
        /*Tests_SRS_NODE_COMMON_AMQP_16_022: [The `detachSenderLink` method shall throw a ReferenceError if the `endpoint` argument is falsy.]*/
        [null, undefined, ''].forEach(function(badEndpoint) {
          it('throws if the endpoint is \'' + badEndpoint + '\'', function() {
            var amqp = new Amqp();
            assert.throws(function() {
              amqp[testConfig.amqpFunc](badEndpoint, null, function() {});
            }, ReferenceError);
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_023: [The `detachSenderLink` method shall call detach on the link object corresponding to the endpoint passed as argument.]*/
        it('calls the \'detach\' method on the link object', function(testCallback) {
          var amqp = new Amqp();
          var fakeConnection = new EventEmitter();
          fakeConnection.name = 'connection';
          var fakeConnectionContext = {connection: fakeConnection};
          sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
          var fakeSession = new EventEmitter();
          fakeSession.name = 'session';
          var fakeSessionContext = {connection: fakeConnection, session: fakeSession};
          fakeConnection.create_session = sinon.stub().returns(fakeSession);
          fakeConnection.close = sinon.stub();
          fakeSession.close = () => {};
          sinon.stub(fakeSession, 'close').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_close', fakeSessionContext)})});
          fakeSession.open = () => {};
          sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

          var fakeLink = new EventEmitter();
          fakeLink.detach = sinon.stub().callsArgWith(0);

          amqp.connect({uri: 'uri'}, () => {
            /*Tests_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
            amqp[testConfig.privateLinkArray][fakeEndpoint] = fakeLink;
            amqp[testConfig.amqpFunc](fakeEndpoint, function(err) {
              if (err) { return testCallback(err); }
              assert(fakeLink.detach.calledOnce, 'attach is invoked');
              testCallback();
            });
          });
        });

        /*Tests_SRS_NODE_COMMON_AMQP_16_025: [The `detachSenderLink` method shall call the `done` callback with no arguments if the link for this endpoint doesn't exist.]*/
        it('calls the callback immediately if there\'s no link attached', function (testCallback) {
          var amqp = new Amqp();
          var fakeConnection = new EventEmitter();
          fakeConnection.name = 'connection';
          var fakeConnectionContext = {connection: fakeConnection};
          sinon.stub(amqp._rheaContainer, 'connect').callsFake(() => {process.nextTick(() => {amqp._rheaConnection.emit('connection_open', fakeConnectionContext)}); return fakeConnection});
          var fakeSession = new EventEmitter();
          fakeSession.name = 'session';
          var fakeSessionContext = {connection: fakeConnection, session: fakeSession};
          fakeConnection.create_session = sinon.stub().returns(fakeSession);
          fakeConnection.close = sinon.stub();
          fakeSession.close = () => {};
          sinon.stub(fakeSession, 'close').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_close', fakeSessionContext)})});
          fakeSession.open = () => {};
          sinon.stub(fakeSession, 'open').callsFake(() => {process.nextTick(() => {fakeSession.emit('session_open', fakeSessionContext)})});

          var fakeLink = new EventEmitter();
          fakeLink.detach = sinon.stub().callsArgWith(0);

          amqp.connect({uri: 'uri'}, () => {
            /*Tests_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
            amqp[testConfig.amqpFunc](fakeEndpoint, function(err) {
              testCallback(err);
            });
          });
        });

        it('calls the callback immediately if already disconnected', function (testCallback) {
          var amqp = new Amqp();
          /*Tests_SRS_NODE_COMMON_AMQP_16_024: [The `detachSenderLink` method shall call the `done` callback with no arguments if detaching the link succeeded.]*/
          amqp[testConfig.amqpFunc](fakeEndpoint, function(err) {
            assert.isUndefined(err);
            testCallback();
          });
        });
      });
    });
  });

  [
    { functionName: 'attachSenderLink',   invoke: (amqp, callback) => amqp.attachSenderLink('endpoint', null, callback) },
    { functionName: 'attachReceiverLink', invoke: (amqp, callback) => amqp.attachReceiverLink('endpoint', null, callback) },
    { functionName: 'initializeCBS',      invoke: (amqp, callback) => amqp.initializeCBS(callback) },
    { functionName: 'putToken',           invoke: (amqp, callback) => amqp.putToken('audience', 'token', callback) }
  ].forEach(function(testConfig) {
    it (testConfig.functionName + ' fails with NotConnectedError if not connected', function(callback) {
      var amqp = new Amqp();
      testConfig.invoke(amqp, function(err) {
        assert.instanceOf(err, errors.NotConnectedError);
        callback();
      });
    });
  });
});
