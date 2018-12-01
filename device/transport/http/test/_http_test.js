// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');

var Message = require('azure-iot-common').Message;
var results = require('azure-iot-common').results;
var ArgumentError = require('azure-iot-common').errors.ArgumentError;
var NotImplementedError = require('azure-iot-common').errors.NotImplementedError;
var AuthenticationType = require('azure-iot-common').AuthenticationType;
var Http = require('../lib/http.js').Http;

var FakeHttp = function () { };

FakeHttp.prototype.buildRequest = function (method, path, httpHeaders, host, sslOptions, done) {
  return {
    end: function () {
      if (this.messageCount > 0) {
        this.messageCount--;
        done(null, "foo", { statusCode: 200 });
      } else {
        done(null, "", { statusCode: 204 });
      }
    }.bind(this)
  };
};

FakeHttp.prototype.toMessage = function () { };

FakeHttp.prototype.setMessageCount = function (messageCount) {
  this.messageCount = messageCount;
};

FakeHttp.prototype.setOptions = function(options, callback) {
  if (callback) callback();
};

describe('Http', function () {
  var fakeAuthenticationProvider = null;
  var transport = null;
  var receiver = null;

  beforeEach(function () {
    fakeAuthenticationProvider = {
      type: AuthenticationType.Token,
      getDeviceCredentials: sinon.stub().callsFake(function (callback) {
        callback(null, { host: 'hub.host.name', deviceId: 'deviceId', sharedAccessSignature: 'sas.key' });
      }),
      updateSharedAccessSignature: sinon.stub(),
      stop: sinon.stub()
    };
    transport = new Http(fakeAuthenticationProvider);
  });

  afterEach(function () {
    fakeAuthenticationProvider = null;
    transport = null;
    receiver = null;
  });

  describe('#connect', function () {
    /*Tests_SRS_NODE_DEVICE_HTTP_16_028: [The `connect` method shall call its callback immediately with a `null` first argument and a `results.Connected` second argument.]*/
    it('calls its callback immediately with a results.Connected object', function (testCallback) {
      var http = new Http(fakeAuthenticationProvider);
      http.connect(function (err, result) {
        assert.isNull(err);
        assert.instanceOf(result, results.Connected);
        testCallback();
      });
    });
  });

  describe('#disconnect', function () {
    /*Tests_SRS_NODE_DEVICE_HTTP_16_031: [The `disconnect` method shall call its callback with a `null` first argument and a `results.Disconnected` second argument after successfully disabling the C2D receiver (if necessary).]*/
    it('calls its callback with no error and a results.Disconnected after successfully stopping the C2D receiver', function (testCallback) {
      var http = new Http(fakeAuthenticationProvider);
      sinon.spy(http, 'disableC2D');
      http.connect(function () {
        http.enableC2D(function () {
          http.disconnect(function (err, result) {
            /*Tests_SRS_NODE_DEVICE_HTTP_16_029: [The `disconnect` method shall disable the C2D message receiver if it is running.]*/
            assert.isTrue(http.disableC2D.calledOnce);
            assert.isNull(err);
            assert.instanceOf(result, results.Disconnected);
            testCallback();
          });
        });
      });
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_16_031: [The `disconnect` method shall call its callback with a `null` first argument and a `results.Disconnected` second argument after successfully disabling the C2D receiver (if necessary).]*/
    it('calls its callback with no error and a results.Disconnected if the C2D receiver is not running', function (testCallback) {
      var http = new Http(fakeAuthenticationProvider);
      sinon.spy(http, 'disableC2D');
      http.disconnect(function (err, result) {
        assert.isNull(err);
        assert.instanceOf(result, results.Disconnected);
        assert.isTrue(http.disableC2D.notCalled);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_16_030: [The `disconnect` method shall call its callback with an `Error` if disabling the C2D message receiver generates an error.]*/
    it('calls its callback with an error if disabling the C2D receiver fails', function (testCallback) {
      var http = new Http(fakeAuthenticationProvider);
      var fakeError = new Error('fake');
      sinon.stub(http, 'disableC2D').callsFake(function (disableC2DCallback) {
        disableC2DCallback(fakeError);
      });
      http.connect(function () {
        http.enableC2D(function () {
          http.disconnect(function (err) {
            /*Tests_SRS_NODE_DEVICE_HTTP_16_029: [The `disconnect` method shall disable the C2D message receiver if it is running.]*/
            assert.isTrue(http.disableC2D.calledOnce);
            assert.strictEqual(err, fakeError);
            http.disableC2D.restore();
            http.disableC2D(function () {
              testCallback();
            });
          });
        });
      });
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_16_039: [The `disconnect` method shall call the `stop` method on the `AuthenticationProvider` object if the type of authentication used is "token".]*/
    it('calls stop on the authentication provider if using token authentication', function (testCallback) {
      var http = new Http(fakeAuthenticationProvider);
      http.connect(function () {});
      http.disconnect(function () {
        assert.isTrue(fakeAuthenticationProvider.stop.calledOnce);
        testCallback();
      });
    });
  });

  describe('#sendEvent', function() {
    /*Tests_SRS_NODE_DEVICE_HTTP_16_032: [All HTTP requests shall obtain the credentials necessary to execute the request by calling `getDeviceCredentials` on the `AuthenticationProvider` object passed to the `Http` constructor.]*/
    it('gets the credentials before sending the request', function (testCallback) {
      var http = new Http(fakeAuthenticationProvider);
      http._http = {
        buildRequest: function (method, path, headers, host, x509, callback) {
          var buildRequestCallback = callback;
          return {
            write: function () { },
            end: function () {
              buildRequestCallback();
            }
          };
        }
      };
      http.sendEvent(new Message('test'), function () {
        assert.isTrue(fakeAuthenticationProvider.getDeviceCredentials.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_16_033: [if the `getDeviceCredentials` fails with an error, the Http request shall call its callback with that error]*/
    it('calls its callback with an error if it fails to get the credentials', function (testCallback) {
      var fakeError = new Error('fake');
      var http = new Http({ getDeviceCredentials: function (callback) { callback(fakeError); } });
      http.sendEvent(new Message('testMessage'), function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_13_002: [ sendEventBatch shall prefix the key name for all message properties with the string iothub-app. ]*/
    it('prefixes message properties with iothub-app-', function(done) {
      // setup test
      var MockHttp = {
        buildRequest: function() {}
      };
      var spy = sinon.stub(MockHttp, 'buildRequest').returns({
        write: function() {},
        end: function() {}
      });
      transport._http = MockHttp;

      var msg = new Message("boo");
      var i;
      var propsCount = 3;
      for(i = 1; i <= propsCount; ++i) {
        msg.properties.add('k' + i.toString(), 'v' + i.toString());
      }

      // act
      transport.sendEvent(msg, function() {});

      // assert
      assert(spy.calledOnce);
      assert.isOk(spy.args[0]);
      assert.isOk(spy.args[0][2]);
      var headers = spy.args[0][2];
      for(i = 1; i <= propsCount; ++i) {
        var key = 'iothub-app-k' + i.toString();
        assert.isOk(headers[key]);
        assert.strictEqual(headers[key], 'v' + i.toString());
      }

      // cleanup
      done();
    });


    /*Tests_SRS_NODE_DEVICE_HTTP_16_014: [If the `message` object has a `messageId` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-MessageId`.]*/
    /*Tests_SRS_NODE_DEVICE_HTTP_16_015: [If the `message` object has a `correlationId` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-CorrelationId`.]*/
    /*Tests_SRS_NODE_DEVICE_HTTP_16_016: [If the `message` object has a `userId` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-UserId`.]*/
    /*Tests_SRS_NODE_DEVICE_HTTP_16_017: [If the `message` object has a `to` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-To`.]*/
    /*Tests_SRS_NODE_DEVICE_HTTP_16_018: [If the `message` object has a `expiryTimeUtc` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-Expiry`.]*/
    /*Tests_SRS_NODE_DEVICE_HTTP_16_019: [If the `message` object has a `ack` property, the value of the property shall be inserted in the headers of the HTTP request with the key `IoTHub-Ack`.]*/
    /*Tests_SRS_NODE_DEVICE_HTTP_16_037: [If the `message` object has a `contentType` property, the value of the property shall be inserted in the headers of the HTTP request with the key `iothub-contenttype`.]*/
    /*Tests_SRS_NODE_DEVICE_HTTP_16_038: [If the `message` object has a `contentEncoding` property, the value of the property shall be inserted in the headers of the HTTP request with the key `iothub-contentencoding`.]*/
    [
      { messagePropertyName: 'messageId', headerName: 'IoTHub-MessageId', fakeValue: 'fakeMessageId' },
      { messagePropertyName: 'correlationId', headerName: 'IoTHub-CorrelationId', fakeValue: 'fakeCorrelationId' },
      { messagePropertyName: 'userId', headerName: 'IoTHub-UserId', fakeValue: 'fakeUserId' },
      { messagePropertyName: 'to', headerName: 'IoTHub-To', fakeValue: 'fakeTo' },
      { messagePropertyName: 'expiryTimeUtc', headerName: 'IoTHub-Expiry', fakeValue: new Date().toISOString() },
      { messagePropertyName: 'ack', headerName: 'IoTHub-Ack', fakeValue: 'full' },
      { messagePropertyName: 'contentType', headerName: 'iothub-contenttype', fakeValue: 'application/json' },
      { messagePropertyName: 'contentEncoding', headerName: 'iothub-contentencoding', fakeValue: 'utf-8' }
    ].forEach(function(testConfig) {
      it('correctly populates the ' + testConfig.headerName + ' header if the message has a ' + testConfig.messagePropertyName + ' property', function() {
        transport._http = {
          buildRequest: sinon.stub().returns({
            write: function() {},
            end: function() {}
          })
        };

        var msg = new Message('fakeBody');
        msg[testConfig.messagePropertyName] = testConfig.fakeValue;

        transport.sendEvent(msg, function() {});

        var headers = transport._http.buildRequest.args[0][2];
        assert.strictEqual(headers[testConfig.headerName], testConfig.fakeValue);
      });
    });
  });

  describe('#sendEventBatch', function() {
    /*Tests_SRS_NODE_DEVICE_HTTP_16_032: [All HTTP requests shall obtain the credentials necessary to execute the request by calling `getDeviceCredentials` on the `AuthenticationProvider` object passed to the `Http` constructor.]*/
    it('gets the credentials before sending the request', function (testCallback) {
      var http = new Http(fakeAuthenticationProvider);
      http._http = {
        buildRequest: function (method, path, headers, host, x509, callback) {
          var buildRequestCallback = callback;
          return {
            write: function () { },
            end: function () {
              buildRequestCallback();
            }
          };
        }
      };
      http.sendEventBatch([new Message('test')], function () {
        assert.isTrue(fakeAuthenticationProvider.getDeviceCredentials.calledOnce);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_16_033: [if the `getDeviceCredentials` fails with an error, the Http request shall call its callback with that error]*/
    it('calls its callback with an error if it fails to get the credentials', function (testCallback) {
      var fakeError = new Error('fake');
      var http = new Http({ getDeviceCredentials: function (callback) { callback(fakeError); } });
      http.sendEventBatch([new Message('testMessage')], function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_13_002: [ sendEventBatch shall prefix the key name for all message properties with the string iothub-app. ]*/
    it('prefixes message properties with iothub-app-', function(done) {
      // setup test
      var MockRequest = {
        write: function() {},
        end: function() {}
      };
      var requestSpy = sinon.spy(MockRequest, 'write');

      var MockHttp = {
        buildRequest: function() {}
      };
      sinon.stub(MockHttp, 'buildRequest').returns(MockRequest);
      transport._http = MockHttp;

      // create 3 messages
      var messageCount = 3, propsCount = 3, msg;
      var i, j;
      var messages = [];
      for(j = 1; j <= messageCount; ++j) {
        msg = new Message("msg" + j.toString());
        for(i = 1; i <= propsCount; ++i) {
          msg.properties.add(
            'k_' + j.toString() + '_' + i.toString(),
            'v_' + j.toString() + '_' + i.toString()
          );
        }
        messages.push(msg);
      }

      // act
      transport.sendEventBatch(messages, function() {});

      // assert
      assert(requestSpy.calledOnce);
      assert.isOk(requestSpy.args[0]);
      assert.isOk(requestSpy.args[0][0]);
      var batchMessages = JSON.parse(requestSpy.args[0][0]);
      assert.isOk(batchMessages);
      assert.isArray(batchMessages);
      assert.strictEqual(batchMessages.length, messageCount);
      for(j = 1; j <= messageCount; ++j) {
        msg = batchMessages[j - 1];
        assert.isOk(msg.properties);
        for(i = 1; i <= propsCount; ++i) {
          var key = 'iothub-app-k_' + j.toString() + '_' + i.toString();
          assert.isOk(msg.properties[key]);
          assert.strictEqual(msg.properties[key], 'v_' + j.toString() + '_' + i.toString());
        }
      }

      // cleanup
      done();
    });
  });

  describe('#setOptions', function () {
    var testOptions = {
      http: {
        receivePolicy: {interval: 1}
      }
    };

    /*Tests_SRS_NODE_DEVICE_HTTP_16_005: [If `done` has been specified the `setOptions` method shall call the `done` callback with no arguments when successful.]*/
    it('calls the done callback with no arguments if successful', function(done) {
      var transport = new Http(fakeAuthenticationProvider);
      transport.setOptions(testOptions, done);
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_16_010: [`setOptions` should not throw if `done` has not been specified.]*/
    it('does not throw if `done` is not specified', function() {
      var transport = new Http(fakeAuthenticationProvider);
      assert.doesNotThrow(function() {
        transport.setOptions({});
      });
    });
  });

  describe('#updateSharedAccessSignature', function() {
    /*Codes_SRS_NODE_DEVICE_HTTP_16_006: [The updateSharedAccessSignature method shall save the new shared access signature given as a parameter to its configuration.] */
    /*Codes_SRS_NODE_DEVICE_HTTP_16_007: [The updateSharedAccessSignature method shall call the `done` callback with a null error object and a SharedAccessSignatureUpdated object as a result, indicating that the client does not need to reestablish the transport connection.] */
    it('updates its configuration object with the new shared access signature', function(done) {
      var transportWithoutReceiver = new Http(fakeAuthenticationProvider);
      var newSas = 'newsas';
      transportWithoutReceiver.updateSharedAccessSignature(newSas, function(err, result) {
        if(err) {
          done(err);
        } else {
          assert.equal(result.constructor.name, 'SharedAccessSignatureUpdated');
          assert.isTrue(fakeAuthenticationProvider.updateSharedAccessSignature.calledWith(newSas));
          done();
        }
      });
    });
  });
});

describe('HttpReceiver', function () {
  var fakeAuthenticationProvider;

  beforeEach(function () {
    fakeAuthenticationProvider = {
      getDeviceCredentials: sinon.stub().callsFake(function (callback) {
        callback(null, { host: 'hub.host.name', deviceId: 'deviceId', sharedAccessSignature: 'sas.key' });
      }),
      updateSharedAccessSignature: sinon.stub(),
      stop: sinon.stub()
    };
  });

  afterEach(function () {
    fakeAuthenticationProvider = null;
  });

  describe('#receiveTimers', function () {
    var fakeHttp, receiver;
    beforeEach(function () {
      fakeHttp = new FakeHttp();
      receiver = new Http(fakeAuthenticationProvider, fakeHttp);
      this.clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      receiver = null;
      fakeHttp = null;
      this.clock.restore();
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_021: [If opts.interval is set, messages should be received repeatedly at that interval]*/
    it('receives messages after the set interval', function (done) {
      var clock = this.clock;
      var messageCount = 2;
      var messageReceivedCount = 0;
      fakeHttp.setMessageCount(messageCount);
      receiver.setOptions({ interval: 5 });
      receiver.on('message', function () {
        messageReceivedCount++;
        if (messageReceivedCount === messageCount) {
          done();
        }
      });
      receiver.enableC2D(function () {
        clock.tick(4999);
        assert.strictEqual(messageReceivedCount, 0);
        clock.tick(5000);
        assert.strictEqual(messageReceivedCount, 1);
        clock.tick(1);
        receiver.disableC2D(function () {});
      });
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_003: [if opts.at is set, messages shall be received at the Date and time specified.]*/
    it('receives messages at the set time', function (done) {
      var clock = this.clock;
      var messageReceived = false;
      fakeHttp.setMessageCount(1);
      var inFiveSeconds = new Date((new Date()).getTime() + 5000);
      receiver.setOptions({ at: inFiveSeconds });
      receiver.on('message', function () {
        messageReceived = true;
        done();
      });
      receiver.enableC2D(function () {
        clock.tick(4999);
        assert.isFalse(messageReceived);
        clock.tick(1);
        receiver.disableC2D(function () {});
      });
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_020: [If opts.cron is set messages shall be received according to the schedule described by the expression.]*/
    it('receives messages as configured with a cron string', function (done) {
      var clock = this.clock;
      var messageReceivedCount = 0;
      var messageCount = 2;
      fakeHttp.setMessageCount(messageCount);
      var everyMinute = "* * * * *";
      receiver.setOptions({ cron: everyMinute });
      receiver.on('message', function () {
        messageReceivedCount++;
        if (messageReceivedCount === messageCount) {
          done();
        }
      });
      receiver.enableC2D(function () {
        clock.tick(59999);
        assert.strictEqual(messageReceivedCount, 0);
        clock.tick(60000);
        assert.strictEqual(messageReceivedCount, 1);
        clock.tick(1);
        receiver.disableC2D(function () {});
      });
    });
  });

  describe('#receive', function () {
    /*Tests_SRS_NODE_DEVICE_HTTP_16_032: [All HTTP requests shall obtain the credentials necessary to execute the request by calling `getDeviceCredentials` on the `AuthenticationProvider` object passed to the `Http` constructor.]*/
    it('gets the credentials before sending the request', function () {
      var http = new Http(fakeAuthenticationProvider);
      http._http = {
        buildRequest: function (method, path, headers, host, x509, callback) {
          var buildRequestCallback = callback;
          return {
            write: function () { },
            end: function () {
              buildRequestCallback(null, '', { statusCode: 204 });
            }
          };
        },
        toMessage: function() {}
      };
      http.receive();
      assert.isTrue(fakeAuthenticationProvider.getDeviceCredentials.calledOnce);
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_16_033: [if the `getDeviceCredentials` fails with an error, the Http request shall call its callback with that error]*/
    it('emits an error if it fails to get the credentials', function (testCallback) {
      var fakeError = new Error('fake');
      var http = new Http({ getDeviceCredentials: function (callback) { callback(fakeError); } });
      http.on('error', function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });
      http.receive();
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_023: [If opts.manualPolling is true, messages shall be received only when receive() is called]*/
    it('receives 1 message when receive() is called and drain is false', function (done) {
      var fakeHttp = new FakeHttp();
      var receiver = new Http(fakeAuthenticationProvider, fakeHttp);
      var msgCount = 5;
      fakeHttp.setMessageCount(msgCount);
      receiver.setOptions({ manualPolling: true, drain: false });
      var received = 0;
      receiver.on('message', function () {
        received++;
        if (received === msgCount) done();
      });

      receiver.receive();
      receiver.receive();
      receiver.receive();
      receiver.receive();
      receiver.receive();
    });

    it('receives all messages when receive() is called and drain is true', function (done) {
      var fakeHttp = new FakeHttp();
      var receiver = new Http(fakeAuthenticationProvider, fakeHttp);
      var msgCount = 5;
      fakeHttp.setMessageCount(msgCount);
      receiver.setOptions({ manualPolling: true, drain: true });
      var received = 0;
      receiver.on('message', function () {
        received++;
        if (received === msgCount) done();
      });
      receiver.receive();
    });

    it('emits messages only when all requests are done', function(done){
      var fakeHttp = new FakeHttp(fakeAuthenticationProvider);
      var requestsCount = 0;
      fakeHttp.buildRequest = function (method, path, httpHeaders, host, sslOptions, done) {
        requestsCount++;
        return {
          end: function () {
            if (this.messageCount > 0) {
              this.messageCount--;
              done(null, "foo", { statusCode: 200 });
            } else {
              done(null, "", { statusCode: 204 });
            }
          }.bind(this)
        };
      };

      var receiver = new Http(fakeAuthenticationProvider, fakeHttp);
      fakeHttp.setMessageCount(1);
      receiver.setOptions({ manualPolling: true, drain: true });
      receiver.on('message', function () {
        assert.equal(requestsCount, 2);
        done();
      });
      receiver.receive();
    });
  });

  describe('#drain', function () {
    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_017: [If opts.drain is true all messages in the queue should be pulled at once.]*/
    it('drains the message queue', function (done) {
      var fakeHttp = new FakeHttp();
      var receiver = new Http(fakeAuthenticationProvider, fakeHttp);
      var msgCount = 5;
      fakeHttp.setMessageCount(msgCount);
      receiver.setOptions({ at: new Date(), drain: true });
      var received = 0;
      receiver.on('message', function () {
        received++;
        if (received >= msgCount) {
          receiver.disableC2D(function () {});
          done();
        }
      });

      receiver.enableC2D(function () {});
    });

    it('emits an error if the HTTP error fails', function (testCallback) {
      var fakeError = new Error();
      fakeError.statusCode = 500;
      var fakeHttp = {
        buildRequest: function (method, path, httpHeaders, host, sslOptions, done) {
          return {
            end: function () {
              done(fakeError, { fake: 'response' }, 'fakeResponseBody');
            }.bind(this)
          };
        },
        setOptions: function(options, done) {
          if (done) done();
        }
      };
      var http = new Http(fakeAuthenticationProvider, fakeHttp);
      http.setOptions({ at: new Date(), drain: true });
      http.on('error', function (err) {
        assert.strictEqual(err, fakeError);
        testCallback();
      });

      http.enableC2D(function () {});
    });
  });

  describe('#setOptions', function () {
    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_002: [opts.interval is not a number, an ArgumentError should be thrown.]*/
    it('throws if opts.interval is not a number', function () {
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: "foo", at: null, cron: null, drain: false });
      }, ArgumentError);
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_005: [If opts.interval is a negative number, an ArgumentError should be thrown.]*/
    it('throws if opts.interval is negative', function () {
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: -10, at: null, cron: null, drain: false });
      }, ArgumentError);
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_022: [If opts.at is not a Date object, an ArgumentError should be thrown] */
    it('throws if opts.at is not a date', function () {
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: null, at: "foo", cron: null, drain: false });
      }, ArgumentError);
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: null, at: 42, cron: null, drain: false });
      }, ArgumentError);
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_008: [Only one of the interval, at, and cron fields should be populated: if more than one is populated, an ArgumentError shall be thrown.]*/
    it('throws if more than one option is specified', function () {
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: 42, at: new Date(), cron: "* * * * *", manualPolling: true, drain: false });
      }, ArgumentError);
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: null, at: new Date(), cron: "* * * * *", manualPolling: true, drain: false });
      }, ArgumentError);
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: 42, at: null, cron: "* * * * *", manualPolling: true, drain: false });
      }, ArgumentError);
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: 42, at: new Date(), cron: null, manualPolling: true, drain: false });
      }, ArgumentError);
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: 42, at: new Date(), cron: "* * * * *", manualPolling: false, drain: false });
      }, ArgumentError);
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: null, at: null, cron: "* * * * *", manualPolling: true, drain: false });
      }, ArgumentError);
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: 42, at: null, cron: null, manualPolling: true, drain: false });
      }, ArgumentError);
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: 42, at: new Date(), cron: null, manualPolling: false, drain: false });
      }, ArgumentError);
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: null, at: new Date(), cron: null, manualPolling: true, drain: false });
      }, ArgumentError);
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: 42, at: null, cron: "* * * * *", manualPolling: false, drain: false });
      }, ArgumentError);
      assert.throws(function () {
        var receiver = new Http(fakeAuthenticationProvider);
        receiver.setOptions({ interval: null, at: new Date(), cron: "* * * * *", manualPolling: false, drain: false });
      }, ArgumentError);
    });

    it('restarts the receiver if it is running', function (testCallback) {
      var transport = new FakeHttp();
      var http = new Http(fakeAuthenticationProvider, transport);
      http.setOptions({ interval: 1, at: null, cron: null, drain: false });
      http.enableC2D(function () {
        sinon.spy(http, 'disableC2D');
        sinon.spy(http, 'enableC2D');
        http.setOptions({ interval: 1, at: null, cron: null, drain: true });
        assert.isTrue(http.disableC2D.calledOnce);
        assert.isTrue(http.enableC2D.calledOnce);
        http.disconnect(testCallback);
      });
    });
  });

  ['abandon', 'reject', 'complete'].forEach(function (methodUnderTest) {
    /*Tests_SRS_NODE_DEVICE_HTTP_16_032: [All HTTP requests shall obtain the credentials necessary to execute the request by calling `getDeviceCredentials` on the `AuthenticationProvider` object passed to the `Http` constructor.]*/
    /*Tests_SRS_NODE_DEVICE_HTTP_16_033: [if the `getDeviceCredentials` fails with an error, the Http request shall call its callback with that error]*/
    describe('#' + methodUnderTest, function () {
      it('gets the credentials before sending the request', function (testCallback) {
        var http = new Http(fakeAuthenticationProvider);
        http._http = {
          buildRequest: function (method, path, headers, host, x509, callback) {
            var buildRequestCallback = callback;
            return {
              write: function () { },
              end: function () {
                buildRequestCallback(null, {}, { statusCode: 200 });
              }
            };
          }
        };
        http[methodUnderTest](new Message('test'), function () {
          assert.isTrue(fakeAuthenticationProvider.getDeviceCredentials.calledOnce);
          testCallback();
        });
      });

      it('calls its callback with an error if it fails to get the credentials', function (testCallback) {
        var fakeError = new Error('fake');
        var http = new Http({ getDeviceCredentials: function (callback) { callback(fakeError); } });
        http[methodUnderTest](new Message('testMessage'), function (err) {
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });
    });
  });


  describe('abandon', function () {
    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_025: [If message is falsy, `abandon` should throw a ReferenceException]*/
    it('throws if message is falsy', function () {
      var receiver = new Http(fakeAuthenticationProvider);
      assert.throws(function () {
        receiver.abandon(null);
      }, ReferenceError, 'Invalid message object.');
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_024: [When successful, `abandon` should call the done callback with a null error object and a result object of type `MessageAbandoned`]*/
    it('calls the done() callback with a null error object and a result of type MessageAbandoned', function (done) {
      var transport = new FakeHttp();
      var receiver = new Http(fakeAuthenticationProvider, transport);
      var msg = new Message();
      msg.lockToken = 'foo';
      receiver.abandon(msg, function (err, result) {
        assert.isNull(err);
        assert.equal(result.constructor.name, 'MessageAbandoned');
        done();
      });
    });
  });

  describe('reject', function () {
    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_026: [If message is falsy, `reject` should throw a ReferenceException] */
    it('throws if message is falsy', function () {
      var receiver = new Http(fakeAuthenticationProvider);
      assert.throws(function () {
        receiver.reject(null);
      }, ReferenceError, 'Invalid message object.');
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_029: [When successful, `reject` should call the done callback with a null error object and a result object of type `MessageRejected`] */
    it('calls the done() callback with a null error object and a result of type MessageRejected', function (done) {
      var transport = new FakeHttp();
      var receiver = new Http(fakeAuthenticationProvider, transport);
      var msg = new Message();
      msg.lockToken = 'foo';
      receiver.reject(msg, function (err, result) {
        assert.isNull(err);
        assert.equal(result.constructor.name, 'MessageRejected');
        done();
      });
    });
  });

  describe('complete', function () {
    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_027: [If message is falsy, ` complete ` should throw a ReferenceException] */
    it('throws if message is falsy', function () {
      var receiver = new Http(fakeAuthenticationProvider);
      assert.throws(function () {
        receiver.complete(null);
      }, ReferenceError, 'Invalid message object.');
    });

    /*Tests_SRS_NODE_DEVICE_HTTP_RECEIVER_16_028: [When successful, `complete` should call the done callback with a null error object and a result object of type `MessageCompleted`] */
    it('calls the done() callback with a null error object and a result of type MessageCompleted', function (done) {
      var transport = new FakeHttp();
      var receiver = new Http(fakeAuthenticationProvider, transport);
      var msg = new Message();
      msg.lockToken = 'foo';
      receiver.complete(msg, function (err, result) {
        assert.isNull(err);
        assert.equal(result.constructor.name, 'MessageCompleted');
        done();
      });
    });
  });

  /*Tests_SRS_NODE_DEVICE_HTTP_16_020: [`getTwin` shall throw a `NotImplementedError`.]*/
  /*Tests_SRS_NODE_DEVICE_HTTP_16_034: [`updateTwinReportedProperties` shall throw a `NotImplementedError`.]*/
  /*Tests_SRS_NODE_DEVICE_HTTP_16_035: [`enableTwinDesiredPropertiesUpdates` shall throw a `NotImplementedError`.]*/
  /*Tests_SRS_NODE_DEVICE_HTTP_16_036: [`disableTwinDesiredPropertiesUpdates` shall throw a `NotImplementedError`.]*/
  /*Tests_SRS_NODE_DEVICE_HTTP_16_024: [`sendMethodResponse` shall throw a `NotImplementedError`.]*/
  /*Tests_SRS_NODE_DEVICE_HTTP_16_025: [`onDeviceMethod` shall throw a `NotImplementedError`.]*/
  /*Tests_SRS_NODE_DEVICE_HTTP_16_026: [`enableMethods` shall throw a `NotImplementedError`.]*/
  /*Tests_SRS_NODE_DEVICE_HTTP_16_027: [`disableMethods` shall throw a `NotImplementedError`.]*/
  /*Tests_SRS_NODE_DEVICE_HTTP_18_001: [`enableInputMessages` shall throw a `NotImplementedError`.]*/
  /*Tests_SRS_NODE_DEVICE_HTTP_18_002: [`disableInputMessages` shall throw a `NotImplementedError`.]*/
  /*Tests_SRS_NODE_DEVICE_HTTP_18_003: [`sendOutputEvent` shall throw a `NotImplementedError`.]*/
  /*Tests_SRS_NODE_DEVICE_HTTP_18_004: [`sendOutputEventBatch` shall throw a `NotImplementedError`.]*/
  [
    'getTwin',
    'updateTwinReportedProperties',
    'enableTwinDesiredPropertiesUpdates',
    'disableTwinDesiredPropertiesUpdates',
    'sendMethodResponse',
    'onDeviceMethod',
    'enableMethods',
    'disableMethods',
    'enableInputMessages',
    'disableInputMessages',
    'sendOutputEvent',
    'sendOutputEventBatch'
  ].forEach(function (methodName) {
    describe('#' + methodName, function () {
      it('throws a NotImplementedError', function () {
        var http = new Http(fakeAuthenticationProvider);
        assert.throws(function () {
          http[methodName]();
        }, NotImplementedError);
      });
    });
  });
});