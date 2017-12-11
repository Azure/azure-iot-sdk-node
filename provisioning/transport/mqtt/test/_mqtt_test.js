// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var ProvisioningDeviceConstants = require('azure-iot-provisioning-device').ProvisioningDeviceConstants;
var errors = require('azure-iot-common').errors;
var Mqtt = require('../lib/mqtt').Mqtt;
var MqttWs = require('../lib/mqtt_ws').MqttWs;

describe('Mqtt', function () {
  var fakeBase;
  var mqtt;

  var fakeHost = 'fakeHost';
  var fakeRequestId = 'fakeRequestId';
  var fakeIdScope = 'fakeIdScope';
  var fakeOperationId = 'fakeOperationId';

  var fakeRequest = {
    provisioningHost: fakeHost,
    requestId: fakeRequestId,
    idScope: fakeIdScope
  };
  var fakeX509 = {
    cert: 'fakeCert',
    key: 'fakeKey'

  };
  var fakeErrorText = 'fake error text';

  this.timeout(100);

  beforeEach(function() {
    fakeBase = new EventEmitter();
    fakeBase.connect = sinon.stub().callsArg(1); // (config: MqttBase.TransportConfig, done: (err?: Error, result?: any) => void): void
    fakeBase.disconnect = sinon.stub().callsArg(0); // (done: (err?: Error, result?: any) => void): void
    fakeBase.subscribe = sinon.stub().callsArg(2); // (topic: string, options: IClientSubscribeOptions, callback: (err?: Error, result?: any) => void): void
    fakeBase.unsubscribe = sinon.stub().callsArg(1); // (topic: string, callback: (err?: Error, result?: any) => void): void
    fakeBase.publish = sinon.stub().callsArg(3); // (topic: string, payload: any, options: IClientPublishOptions, done: (err?: Error, result?: any) => void): void

    mqtt = new Mqtt(fakeBase);
    mqtt.setTransportOptions({timeoutInterval: 5});
  });

  var fakeResponse = {
    fake: 'oh yeah'
  };

  var respond = function(publish, status) {
    var topic = publish.args[0].toString();
    var match = topic.match(/\$rid=(.*)\&/) || topic.match(/\$rid=(.*)$/);
    var rid = match[1];
    status = status || 200;

    fakeBase.emit('message', '$dps/registrations/res/' + status + '/?$rid=' + rid, JSON.stringify(fakeResponse));
  };

  var assertWrappedError = function(err) {
    assert.isOk(err);
    assert.instanceOf(err, errors.TransportSpecificError);
    assert.isOk(err.transportError);
    assert.instanceOf(err.transportError, Error);
    assert.strictEqual(err.transportError.message, fakeErrorText);
  };

  var twoCallsRequired = function(callback) {
    var count = 0;
    var newCallback = function() {
      count++;
      if (count === 2) {
        callback();
      }
    };
    return newCallback;
  };


  describe('connecting', function() {

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_002: [ If the transport is not connected, `registrationRequest` shall connect it and subscribe to the response topic.] */
    it ('calls the base transport correctly', function(callback) {
      mqtt.setAuthentication(fakeX509);
      mqtt.registrationRequest(fakeRequest, function(err) {
        assert.isNotOk(err);

        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_040: [ When connecting, `Mqtt` shall call `_mqttBase.connect`.] */
        assert(fakeBase.connect.calledOnce);
        var config = fakeBase.connect.firstCall.args[0];
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_037: [ When connecting, `Mqtt` shall pass in the `X509` certificate that was passed into `setAuthentication` in the base `TransportConfig` object.] */
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_001: [ The certificate and key passed as properties of the `auth` function shall be used to connect to the Device Provisioning Service.] */
        assert.strictEqual(config.x509, fakeX509);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_050: [ When connecting, `Mqtt` shall set `host` in the base `TransportConfig` object to the `provisioningDeviceHost`.] */
        assert.strictEqual(config.host, fakeHost);
        assert.isNotOk(config.uri);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_035: [ When connecting, `Mqtt` shall set `clientId` in the base `registrationRequest` object to the registrationId.] */
        assert.strictEqual(config.deviceId, fakeRequest.registrationId);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_036: [ When connecting, `Mqtt` shall set the `clean` flag in the base `TransportConfig` object to true.] */
        assert.strictEqual(config.clean, true);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_038: [ When connecting, `Mqtt` shall set the `username` in the base `TransportConfig` object to '<idScope>/registrations/<registrationId>/api-version=<apiVersion>&clientVersion=<UrlEncode<userAgent>>'.] */
        assert.strictEqual(config.username,fakeRequest.idScope + '/registrations/' + fakeRequest.registrationId + '/api-version=' + ProvisioningDeviceConstants.apiVersion + '&ClientVersion=' + encodeURIComponent(ProvisioningDeviceConstants.userAgent));

        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_042: [ After connecting the transport, `Mqtt` will subscribe to '$dps/registrations/res/#'  by calling `_mqttBase.subscribe`.] */
        assert(fakeBase.subscribe.calledOnce);
        var topic = fakeBase.subscribe.firstCall.args[0];
        assert.strictEqual(topic, '$dps/registrations/res/#');

        callback();
      });

      assert(fakeBase.publish.calledOnce);
      /* Tests_SRS_NODE_PROVISIONING_MQTT_18_003: [ `registrationRequest` shall publish to '$dps/registrations/PUT/iotdps-register/?$rid<rid>'.] */
      assert.isOk(fakeBase.publish.firstCall.args[0].match(/^\$dps\/registrations\/PUT\/iotdps-register\/\?\$rid=/));
      /* Tests_SRS_NODE_PROVISIONING_MQTT_18_010: [ When waiting for responses, `registrationRequest` shall watch for messages with a topic named $dps/registrations/res/<status>/?$rid=<rid>.] */
      /* Tests_SRS_NODE_PROVISIONING_MQTT_18_006: [ `registrationRequest` shall wait for a response with a matching rid.] */
      respond(fakeBase.publish.firstCall);
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_041: [ If an error is returned from `_mqttBase.connect`, `Mqtt` shell wrap it in a `TransportSpecificError` object and pass it to the caller using `callback`.] */
    it ('returns _mqttBase.connect failure', function(callback) {
      fakeBase.connect = sinon.stub().callsArgWith(1, new Error(fakeErrorText));
      mqtt.registrationRequest(fakeRequest, function(err) {
        assertWrappedError(err);
        callback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_043: [ If an error is returned from _mqttBase.subscribe, `Mqtt` shell wrap it in a `TransportSpecificError` object and pass it to the caller using `callback`.] */
    it ('returns _mqttBase.subscribe failure', function(callback) {
      fakeBase.subscribe = sinon.stub().callsArgWith(2, new Error(fakeErrorText));
      mqtt.registrationRequest(fakeRequest, function(err) {
        assertWrappedError(err);
        callback();
      });
    });
  });

  describe('#registrationRequest', function() {

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_004: [ If the publish fails, `registrationRequest` shall wrap the error in a `TransportSpecificError` and call `callback` passing the wrapped error back.] */
    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_005: [ If the publish fails, `registrationRequest` shall disconnect the transport.] */
    it ('returns mqttBase.publish failure', function(callback) {
      fakeBase.publish = sinon.stub().callsArgWith(3, new Error(fakeErrorText));
      mqtt.registrationRequest(fakeRequest, function(err) {
        assertWrappedError(err);
        assert(fakeBase.disconnect.calledOnce);
        assert(fakeBase.unsubscribe.calledOnce);
        callback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_007: [ `registrationRequest` shall wait for a response for `timeoutInterval` milliseconds.  After that shall be considered a timeout.] */
    it ('times out when server doesn\'t send response', function(callback) {
      mqtt.registrationRequest(fakeRequest, function(err) {
        assert.isOk(err);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_009: [ When `registrationRequest` times out, it shall call callback passing in a ServiceUnavailableError.] */
        assert.instanceOf(err, errors.ServiceUnavailableError);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_008: [ When `registrationRequest` times out, it shall disconnect the transport.] */
        assert(fakeBase.disconnect.calledOnce);
        assert(fakeBase.unsubscribe.calledOnce);
        callback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_011: [ When waiting for responses, `registrationRequest` shall ignore any messages that don't match the required topic format.] */
    it ('ignores messages from invalid topics', function(callback) {
      mqtt.registrationRequest(fakeRequest, function(err) {
        assert.isOk(err);
        // this should time out.
        assert.instanceOf(err, errors.ServiceUnavailableError);
        callback();
      });
      fakeBase.emit('message', 'bogus topic', ' ');
    });

    it ('translates errors based on status code', function(callback) {
      mqtt.registrationRequest(fakeRequest, function(err) {
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_015: [ When `registrationRequest` receives an error from the service, it shall call `callback` passing in the error.] */
        assert.isOk(err);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_012: [ If `registrationRequest` receives a response with status >= 300, it shall consider the request failed and create an error using `translateError`.] */
        assert.instanceOf(err, errors.IotHubQuotaExceededError);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_014: [ When `registrationRequest` receives an error from the service, it shall disconnect the transport.] */
        assert(fakeBase.disconnect.calledOnce);
        assert(fakeBase.unsubscribe.calledOnce);
        callback();
      });

      respond(fakeBase.publish.firstCall, 429);
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_013: [ When `registrationRequest` receives a successful response from the service, it shall call `callback` passing in null and the response.] */
    it ('returns the service response', function(callback) {
      mqtt.registrationRequest(fakeRequest, function(err, result) {
        assert.isNotOk(err);
        assert.deepEqual(result, fakeResponse);
        callback();
      });
      respond(fakeBase.publish.firstCall);
    });
  });

  describe('#queryOperationStatyus', function() {
    it ('connects and returns a successful response', function(callback) {
      /* Tests_SRS_NODE_PROVISIONING_MQTT_18_024: [ When waiting for responses, `queryOperationStatus` shall watch for messages with a topic named $dps/registrations/res/<status>/?$rid=<rid>.] */
      mqtt.queryOperationStatus(fakeRequest, fakeOperationId, function(err, result) {
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_016: [ If the transport is not connected, `queryOperationStatus` shall connect it and subscribe to the response topic.] */
        assert(fakeBase.connect.calledOnce);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_027: [ When `queryOperationStatus` receives a successful response from the service, it shall call callback passing in null and the response.] */
        assert.isNotOk(err);
        assert.deepEqual(result, fakeResponse);
      });
      /* Tests_SRS_NODE_PROVISIONING_MQTT_18_017: [ `queryOperationStatus` shall publish to $dps/registrations/GET/iotdps-get-operationstatus/?$rid=<rid>&operationId=<operationId>.] */
      assert.isOk(fakeBase.publish.firstCall.args[0].match(/^\$dps\/registrations\/GET\/iotdps-get-operationstatus\/\?\$rid=(.*)\&operationId=/));
      /* Tests_SRS_NODE_PROVISIONING_MQTT_18_020: [ `queryOperationStatus` shall wait for a response with a matching rid.] */
      respond(fakeBase.publish.firstCall);
      callback();

    });

    it ('returns a wrapped error', function(callback) {
      mqtt.queryOperationStatus(fakeRequest, fakeOperationId, function(err) {
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_029: [ When `queryOperationStatus` receives an error from the service, it shall call `callback` passing in the error.] */
        assert.isOk(err);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_026: [ If `queryOperationStatus` receives a response with status >= 300, it shall consider the query failed and create an error using `translateError`.] */
        assert.instanceOf(err, errors.InternalServerError);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_028: [ When `queryOperationStatus` receives an error from the service, it shall disconnect the transport.] */
        assert(fakeBase.disconnect.calledOnce);
        assert(fakeBase.unsubscribe.calledOnce);
        callback();
      });
      respond(fakeBase.publish.firstCall, 500);
    });

    it ('returns failure if publish faile', function(callback) {
      fakeBase.publish = sinon.stub().callsArgWith(3, new Error(fakeErrorText));
      mqtt.queryOperationStatus(fakeRequest, fakeOperationId, function(err) {
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_018: [ If the publish fails, `queryOperationStatus` shall wrap the error in a `TransportSpecificError` and call callback passing the wrapped error back.] */
        assertWrappedError(err);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_019: [ If the publish fails, `queryOperationStatus` shall disconnect the transport.] */
        assert(fakeBase.disconnect.calledOnce);
        assert(fakeBase.unsubscribe.calledOnce);
        callback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_021: [ `queryOperationStatus` shall wait for a response for `timeoutInterval` milliseconds.  After that shall be considered a timeout.] */
    it ('times out if nothing is received back from the service', function(callback) {
      mqtt.queryOperationStatus(fakeRequest, fakeOperationId, function(err) {
        assert.isOk(err);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_023: [ When `queryOperationStatus` times out, it shall call callback passing in a ServiceUnavailableError.] */
        assert.instanceOf(err, errors.ServiceUnavailableError);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_022: [ When `queryOperationStatus` times out, it shall disconnect the transport.] */
        assert(fakeBase.disconnect.calledOnce);
        callback();
      });
      /* Tests_SRS_NODE_PROVISIONING_MQTT_18_025: [ When waiting for responses, `queryOperationStatus` shall ignore any messages that don't match the required topic format.] */
      fakeBase.emit('message', 'bogus topic', ' ');
    });
  });

  describe('#cancel', function() {
    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_030: [ If `cancel` is called while the transport is disconnected, nothing will be done.] */
    it ('does nothing if called while disconnected', function(callback) {
      mqtt.cancel(function(err) {
        assert.isNotOk(err);
        assert.isFalse(fakeBase.connect.called);
        assert.isFalse(fakeBase.subscribe.called);
        assert.isFalse(fakeBase.publish.called);
        assert.isFalse(fakeBase.unsubscribe.called);
        assert.isFalse(fakeBase.disconnect.called);
        callback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_031: [ If `cancel` is called while the transport is in the process of connecting, it shall wait until the connection is complete and then disconnect the transport.] */
    it ('waits for connection to complete before cancelling', function(callback) {
      var newCallback = twoCallsRequired(callback);
      fakeBase.connect = sinon.stub();
      mqtt.registrationRequest(fakeRequest, function(err) {
        assert.isOk(err);
        assert.instanceOf(err, errors.OperationCancelledError);
        newCallback();
      });
      assert(fakeBase.connect.calledOnce);
      assert.isFalse(fakeBase.subscribe.called);
      mqtt.cancel(function(err) {
        assert.isNotOk(err);
        assert(fakeBase.connect.calledOnce);
        assert(fakeBase.subscribe.calledOnce);
        assert(fakeBase.unsubscribe.calledOnce);
        assert(fakeBase.disconnect.calledOnce);
        newCallback();
      });
      fakeBase.connect.callArg(1);
    });


    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_032: [ If `cancel` is called while the transport is connected and idle, it will disconnect the transport.] */
    it ('disconnects if transport is idle', function(callback) {
      mqtt.registrationRequest(fakeRequest, function(err) {
        assert.isNotOk(err);
        assert(fakeBase.connect.calledOnce);
        assert.isFalse(fakeBase.disconnect.called);
        mqtt.cancel(function(err) {
          assert.isNotOk(err);
          /* Tests_SRS_NODE_PROVISIONING_MQTT_18_045: [ When Disconnecting, `Mqtt` shall call `_mqttBase.disconnect`.] */
          assert(fakeBase.disconnect.calledOnce);
          /* Tests_SRS_NODE_PROVISIONING_MQTT_18_044: [ When Disconnecting, `Mqtt` shall call _`mqttBase.unsubscribe`.] */
          assert(fakeBase.unsubscribe.calledOnce);
          callback();
        });
      });
      respond(fakeBase.publish.firstCall);
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_033: [ If `cancel` is called while the transport is in the middle of a `registrationRequest` operation, it will disconnect the transport and indirectly cause `registrationRequest` call it's `callback` passing an error.] */
    it ('cancels a registrationRequest and disconnects', function(callback) {
      var newCallback = twoCallsRequired(callback);
      mqtt.registrationRequest(fakeRequest, function(err) {
        assert.isOk(err);
        assert.instanceOf(err, errors.OperationCancelledError);
        newCallback();
      });
      mqtt.cancel(function(err) {
        assert.isNotOk(err);
        assert(fakeBase.connect.calledOnce);
        assert(fakeBase.subscribe.calledOnce);
        assert(fakeBase.unsubscribe.calledOnce);
        assert(fakeBase.disconnect.calledOnce);
        newCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_034: [ If `cancel` is called while the transport is in the middle of a `queryOperationStatus` operation, it will disconnect the transport and indirectly cause `registrationRequest` call it's `callback` passing an error.] */
    it ('cancels a queryOperationStatus and disconnects', function(callback) {
      var newCallback = twoCallsRequired(callback);
      mqtt.queryOperationStatus(fakeRequest, fakeOperationId, function(err) {
        assert.isOk(err);
        assert.instanceOf(err, errors.OperationCancelledError);
        newCallback();
      });
      mqtt.cancel(function(err) {
        assert.isNotOk(err);
        assert(fakeBase.connect.calledOnce);
        assert(fakeBase.subscribe.calledOnce);
        assert(fakeBase.unsubscribe.calledOnce);
        assert(fakeBase.disconnect.calledOnce);
        newCallback();
      });
    });
  });

  /* Tests_SRS_NODE_PROVISIONING_MQTT_18_046: [ If `_mqttBase.unscribe` fails, `Mqtt` shall wrap the error in a `TransportSpecificError` object.] */
  it ('wraps unsubscribe error', function(callback) {
    fakeBase.unsubscribe = sinon.stub().callsArgWith(1, new Error(fakeErrorText));
    mqtt.registrationRequest(fakeRequest, function(err) {
      assert.isNotOk(err);
      mqtt.cancel(function(err) {
        assert.isOk(err);
        assert.instanceOf(err, errors.TransportSpecificError);
        assert.instanceOf(err.transportError, Error);
        assert.strictEqual(err.transportError.message, fakeErrorText);
        callback();
      });
    });
    respond(fakeBase.publish.firstCall);
  });

  /* Tests_SRS_NODE_PROVISIONING_MQTT_18_047: [ If `_mqttBase.disconnect` fails, `Mqtt` shall wrap the error in a `TransportSpecificError` object.] */
  it ('wraps disconnect error', function(callback) {
    fakeBase.disconnect = sinon.stub().callsArgWith(0, new Error(fakeErrorText));
    mqtt.registrationRequest(fakeRequest, function(err) {
      assert.isNotOk(err);
      mqtt.cancel(function(err) {
        assert.isOk(err);
        assert.instanceOf(err, errors.TransportSpecificError);
        assert.instanceOf(err.transportError, Error);
        assert.strictEqual(err.transportError.message, fakeErrorText);
        callback();
      });
    });
    respond(fakeBase.publish.firstCall);
  });

  /* Tests_SRS_NODE_PROVISIONING_MQTT_18_048: [ If either `_mqttBase.unsubscribe` or `_mqttBase.disconnect` fails, `Mqtt` shall call the disconnect `callback` with the failing error, giving preference to the disconnect error.] */
  it ('returns error with disconnect error preference', function(callback) {
    fakeBase.disconnect = sinon.stub().callsArgWith(0, new Error('disconnect'));
    fakeBase.unsubscribe = sinon.stub().callsArgWith(1, new Error('unsubscribe'));
    mqtt.registrationRequest(fakeRequest, function(err) {
      assert.isNotOk(err);
      mqtt.cancel(function(err) {
        assert.isOk(err);
        assert.instanceOf(err, errors.TransportSpecificError);
        assert.instanceOf(err.transportError, Error);
        assert.strictEqual(err.transportError.message, 'disconnect');
        callback();
      });
    });
    respond(fakeBase.publish.firstCall);
  });

  describe('MqttWs', function() {
  /* Tests_SRS_NODE_PROVISIONING_MQTT_18_039: [ If a uri is specified in the request object, `Mqtt` shall set it in the base `TransportConfig` object.] */
  /* Tests_SRS_NODE_PROVISIONING_MQTT_18_049: [ When connecting using websockets, `Mqtt`Ws shall set the uri passed into the transport to 'wss://<host>:443/$iothub/websocket'.] */
    it ('passes the uri to the transport', function(callback) {
      fakeBase.removeAllListeners('message');  // disconnect the mqtt object that every other test uses.
      var mqttWs = new MqttWs(fakeBase);
      mqttWs.registrationRequest(fakeRequest, function() {});
      respond(fakeBase.publish.firstCall);
      assert(fakeBase.connect.calledOnce);
      assert.strictEqual(fakeBase.connect.firstCall.args[0].uri, 'wss://' + fakeHost + ':443/$iothub/websocket');
      callback();
    });
  });

});

