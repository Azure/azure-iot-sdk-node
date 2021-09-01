// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var uuid = require('uuid');
var ProvisioningDeviceConstants = require('azure-iot-provisioning-device').ProvisioningDeviceConstants;
var errors = require('azure-iot-common').errors;
var Mqtt = require('../dist/mqtt').Mqtt;
var MqttWs = require('../dist/mqtt_ws').MqttWs;

var simpleBody = {registrationId: 'fakeRegistrationId'};
var payload = {a: '__DAta__'};
var bodyWithPayload = {
  registrationId: 'fakeRegistrationId',
  payload: payload
};


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

  var extendedResponse = function(queryString) {
    fakeBase.emit('message', '$dps/registrations/res/200/?' + queryString, JSON.stringify(fakeResponse));
  }

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

  var registrationRequest = {
    name: 'registrationRequest',
    invoke: function(callback) { mqtt.registrationRequest(fakeRequest, callback); }
  };
  var queryOperationStatus = {
    name: 'queryOperationStatus',
    invoke: function(callback) { mqtt.queryOperationStatus(fakeRequest, fakeOperationId, callback); }
  };

  describe('use symmetric key setSharedAccessSignature', function() {
    it('setSharedAccessSignature', function(callback) {
      var fakeSas = 'fake sas';
      mqtt.setSharedAccessSignature(fakeSas);
      assert(mqtt._sas, fakeSas);
      callback();
    });
  });

  describe('connecting', function() {

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_002: [ If the transport is not connected, `registrationRequest` shall connect it and subscribe to the response topic.] */
    [
      registrationRequest,
      queryOperationStatus
    ].forEach(function(op) {
      it ('calls the base transport correctly - ' + op.name, function(callback) {
        mqtt.setAuthentication(fakeX509);
        op.invoke(function(err) {
          assert.oneOf(err, [null, undefined]);

          /* Tests_SRS_NODE_PROVISIONING_MQTT_18_040: [ When connecting, `Mqtt` shall call `_mqttBase.connect`.] */
          assert(fakeBase.connect.calledOnce);
          var config = fakeBase.connect.firstCall.args[0];
          /* Tests_SRS_NODE_PROVISIONING_MQTT_18_037: [ When connecting, `Mqtt` shall pass in the `X509` certificate that was passed into `setAuthentication` in the base `TransportConfig` object.] */
          /* Tests_SRS_NODE_PROVISIONING_MQTT_18_001: [ The certificate and key passed as properties of the `auth` function shall be used to connect to the Device Provisioning Service.] */
          assert.strictEqual(config.x509, fakeX509);
          /* Tests_SRS_NODE_PROVISIONING_MQTT_18_050: [ When connecting, `Mqtt` shall set `uri` in the base `TransportConfig` object to the 'mqtts://' + `provisioningDeviceHost`.] */
          assert.strictEqual(config.uri, 'mqtts://' + fakeHost);
          /* Tests_SRS_NODE_PROVISIONING_MQTT_18_035: [ When connecting, `Mqtt` shall set `clientId` in the base `registrationRequest` object to the registrationId.] */
          assert.strictEqual(config.clientId, fakeRequest.registrationId);
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
        respond(fakeBase.publish.firstCall);
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_041: [ If an error is returned from `_mqttBase.connect`, `Mqtt` shall call `callback` passing in the error..] */
    [
      registrationRequest,
      queryOperationStatus
    ].forEach(function(op) {
      it ('returns _mqttBase.connect failure - ' + op.name, function(callback) {
        fakeBase.connect = sinon.stub().callsArgWith(1, new Error(fakeErrorText));
        op.invoke(function(err) {
          assert.instanceOf(err, Error);
          assert.strictEqual(err.message, fakeErrorText);
          /* Tests_SRS_NODE_PROVISIONING_MQTT_18_051: [ If either `_mqttBase.connect` or `_mqttBase.subscribe` fails, `mqtt` will disconnect the transport. ] */
          assert(fakeBase.disconnect.calledOnce);
          assert.isFalse(fakeBase.unsubscribe.called);
          callback();
        });
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_043: [ If an error is returned from _mqttBase.subscribe, `Mqtt` shall call `callback` passing in the error..] */
    [
      registrationRequest,
      queryOperationStatus
    ].forEach(function(op) {
      it ('returns _mqttBase.subscribe failure -' + op.name, function(callback) {
        fakeBase.subscribe = sinon.stub().callsArgWith(2, new Error(fakeErrorText));
        op.invoke(function(err) {
          assert.instanceOf(err, Error);
          assert.strictEqual(err.message, fakeErrorText);
          /* Tests_SRS_NODE_PROVISIONING_MQTT_18_051: [ If either `_mqttBase.connect` or `_mqttBase.subscribe` fails, `mqtt` will disconnect the transport. ] */
          assert(fakeBase.disconnect.calledOnce);
          assert.isFalse(fakeBase.unsubscribe.called);
          callback();
        });
      });
    });
  });

  describe('#registrationRequest', function() {

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_004: [ If the publish fails, `registrationRequest` shall call `callback` passing in the error..] */
    it ('returns mqttBase.publish failure', function(callback) {
      fakeBase.publish = sinon.stub().callsArgWith(3, new Error(fakeErrorText));
      mqtt.registrationRequest(fakeRequest, function(err) {
        assert.instanceOf(err, Error);
        assert.strictEqual(err.message, fakeErrorText);
        callback();
      });
    });

    it ('translates errors based on status code', function(callback) {
      mqtt.registrationRequest(fakeRequest, function(err) {
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_015: [ When `registrationRequest` receives an error from the service, it shall call `callback` passing in the error.] */
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_012: [ If `registrationRequest` receives a response with status >= 300 and <429, it shall consider the request failed and create an error using `translateError`.] */
        assert.instanceOf(err, errors.ArgumentError);
        callback();
      });

      respond(fakeBase.publish.firstCall, 400);
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_013: [ When `registrationRequest` receives a successful response from the service, it shall call `callback` passing in null and the response.] */
    it ('returns the service response', function(callback) {
      mqtt.registrationRequest(fakeRequest, function(err, result) {
        assert.oneOf(err, [null, undefined]);
        assert.deepEqual(result, fakeResponse);
        callback();
      });
      /* Tests_SRS_NODE_PROVISIONING_MQTT_18_003: [ `registrationRequest` shall publish to '$dps/registrations/PUT/iotdps-register/?$rid<rid>'.] */
      assert.isOk(fakeBase.publish.firstCall.args[0].match(/^\$dps\/registrations\/PUT\/iotdps-register\/\?\$rid=/));
      /* Tests_SRS_NODE_PROVISIONING_MQTT_18_010: [ When waiting for responses, `registrationRequest` shall watch for messages with a topic named $dps/registrations/res/<status>/?$rid=<rid>.] */
      respond(fakeBase.publish.firstCall);
    });

    /*Tests_SRS_NODE_PROVISIONING_MQTT_06_003: [ When `registrationRequest` receives a response with status >429, it shall invoke `callback` with a result object containing property `status` with a value `registering` and no `operationId` property.] */
    it ('Service returns a >= 429 error so transport returns registering', function(callback) {
      mqtt.registrationRequest(fakeRequest, function(err, result) {
        assert.oneOf(err, [null, undefined]);
        assert.strictEqual(result.status, 'registering');
        assert.isNotOk(result.operationId);
        callback();
      });
      /* Tests_SRS_NODE_PROVISIONING_MQTT_18_003: [ `registrationRequest` shall publish to '$dps/registrations/PUT/iotdps-register/?$rid<rid>'.] */
      assert.isOk(fakeBase.publish.firstCall.args[0].match(/^\$dps\/registrations\/PUT\/iotdps-register\/\?\$rid=/));
      /* Tests_SRS_NODE_PROVISIONING_MQTT_18_010: [ When waiting for responses, `registrationRequest` shall watch for messages with a topic named $dps/registrations/res/<status>/?$rid=<rid>.] */
      respond(fakeBase.publish.firstCall, 429);
    });

    /*Tests_SRS_NODE_PROVISIONING_MQTT_06_001: [The `registrationRequest` will send a body in the message which contains a stringified JSON object with a `registrationId` property.] */
    it ('includes a body', function(callback) {
      mqtt.registrationRequest(fakeRequest, function(err, result) {
        assert.oneOf(err, [null, undefined]);
        assert.deepEqual(result, fakeResponse);
        callback();
      });
      assert.isOk(fakeBase.publish.firstCall.args[1], JSON.stringify(simpleBody));
      respond(fakeBase.publish.firstCall);
    });

    /*Tests_SRS_NODE_PROVISIONING_MQTT_06_002: [The `registrationRequest` will, if utilizing custom allocation data, send a `payload` property in the JSON body.] */
    it ('sends a body with a payload property', function(callback) {
      fakeRequest.payload = payload;
      mqtt.registrationRequest(fakeRequest, function(err, result) {
        delete fakeRequest.payload;
        assert.oneOf(err, [null, undefined]);
        assert.deepEqual(result, fakeResponse);
        callback();
      });
      assert.isOk(fakeBase.publish.firstCall.args[1], JSON.stringify(simpleBody));
      respond(fakeBase.publish.firstCall);
    });

  });

  describe('#queryOperationStatus', function() {
    it ('connects and returns a successful response', function(callback) {
      /* Tests_SRS_NODE_PROVISIONING_MQTT_18_024: [ When waiting for responses, `queryOperationStatus` shall watch for messages with a topic named $dps/registrations/res/<status>/?$rid=<rid>.] */
      mqtt.queryOperationStatus(fakeRequest, fakeOperationId, function(err, result) {
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_016: [ If the transport is not connected, `queryOperationStatus` shall connect it and subscribe to the response topic.] */
        assert(fakeBase.connect.calledOnce);
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_027: [ When `queryOperationStatus` receives a successful response from the service, it shall call `callback` passing in null and the response.] */
        assert.oneOf(err, [null, undefined]);
        assert.deepEqual(result, fakeResponse);
      });
      /* Tests_SRS_NODE_PROVISIONING_MQTT_18_017: [ `queryOperationStatus` shall publish to $dps/registrations/GET/iotdps-get-operationstatus/?$rid=<rid>&operationId=<operationId>.] */
      assert.isOk(fakeBase.publish.firstCall.args[0].match(/^\$dps\/registrations\/GET\/iotdps-get-operationstatus\/\?\$rid=(.*)\&operationId=/));
      respond(fakeBase.publish.firstCall);
      callback();

    });

    [
      '$rid=123&retry-after=456&something=89',
      'retry-after=456&$rid=123&something=89',
      'retry-after=456&something=89&$rid=123'
    ].forEach(function(theQueryString) {
      //
      // Skip this because we can no longer mock the uuid.v4 function.
      //
      it.skip('can parse topic with multiple query parameters', function(callback) {
        var fakeUuids = [uuid.v4()];
        var uuidStub = sinon.stub(uuid,'v4');
        uuidStub.returns(fakeUuids[0]);

        mqtt.queryOperationStatus(fakeRequest, fakeOperationId, function(err, result) {
          uuid.v4.restore();
          assert.oneOf(err, [null, undefined]);
          assert.deepEqual(result, fakeResponse);
          callback();
        });
        extendedResponse(theQueryString.replace('$rid=123', '$rid='+fakeUuids[0]));
      });
    });

    [
      '$rid=123',   // Unknown request id. Previous 'can parse topic with multiple' test injected a particular uuid into the transport
      'random=123', // Only parameter is unrecognized.
      ''            // No request id at all
    ].forEach(function(theQueryString) {
      it ('Will not respond given topics that are unacceptable', function(callback) {
        var stubCallback = sinon.spy();
        mqtt.queryOperationStatus(fakeRequest, fakeOperationId, stubCallback);
        extendedResponse(theQueryString);
        assert(stubCallback.notCalled);
        callback();
      });
    });

    it ('returns a wrapped error', function(callback) {
      mqtt.queryOperationStatus(fakeRequest, fakeOperationId, function(err) {
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_029: [ When `queryOperationStatus` receives an error from the service, it shall call `callback` passing in the error.] */
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_026: [ If `queryOperationStatus` receives a response with status >= 300 and <429, it shall consider the query failed and create an error using `translateError`.] */
        assert.instanceOf(err, errors.UnauthorizedError);
        callback();
      });
      respond(fakeBase.publish.firstCall, 401);
    });

    /*Tests_SRS_NODE_PROVISIONING_MQTT_06_004: [ When `queryOperationStatus` receives a response with status >429, it shall invoke `callback` with a result object containing property `status` with a value `assigning` and `operationId` property with value of the passed to the request.] */
    it ('Service returns a >= 429 error so transport returns assigning', function(callback) {
      mqtt.queryOperationStatus(fakeRequest, fakeOperationId, function(err, result) {
        assert.oneOf(err, [null, undefined]);
        assert.strictEqual(result.status, 'assigning');
        assert.equal(result.operationId, fakeOperationId);
      });
      assert.isOk(fakeBase.publish.firstCall.args[0].match(/^\$dps\/registrations\/GET\/iotdps-get-operationstatus\/\?\$rid=(.*)\&operationId=/));
      respond(fakeBase.publish.firstCall, 429);
      callback();
    });


    it ('returns failure if publish fails', function(callback) {
      fakeBase.publish = sinon.stub().callsArgWith(3, new Error(fakeErrorText));
      mqtt.queryOperationStatus(fakeRequest, fakeOperationId, function(err) {
        /* Tests_SRS_NODE_PROVISIONING_MQTT_18_018: [ If the publish fails, `queryOperationStatus` shall call `callback` passing in the error.] */
        assert.instanceOf(err, Error);
        assert.strictEqual(err.message, fakeErrorText);
        callback();
      });
    });
  });

  describe('#polling interval', function() {
    /* Tests_SRS_NODE_PROVISIONING_MQTT_06_005: [ If the response to the `queryOperationStatus` contains a query parameter of `retry-after` that value * 1000 shall be the value of `callback` `pollingInterval` argument, otherwise default.] */
    /* Tests_SRS_NODE_PROVISIONING_MQTT_06_006: [ If the response to the `registrationRequest` contains a query parameter of `retry-after` that value * 1000 shall be the value of `callback` `pollingInterval` argument, otherwise default.] */
    [
      registrationRequest,
      queryOperationStatus
    ].forEach(function(op) {
      var configPollingInterval = 4000;
      var dpsPollingInterval = 5;
      [
        '$rid=123&retry-after=' + dpsPollingInterval.toString() + '&something=89',
        'something=89&$rid=123'
      ].forEach(function(theQueryString) {
        //
        // Skip this because we can no longer mock the uuid.v4 function.
        //
        it.skip ('On poll-able result for ' + op.name + ', ' + ((theQueryString.indexOf('retry-after') === -1) ? ('uses default for polling interval when dps does not provide one.') : ('uses polling interval provided by dps.')), function(callback) {
          var fakeUuids = [uuid.v4()];
          var uuidStub = sinon.stub(uuid,'v4');
          uuidStub.returns(fakeUuids[0]);
          mqtt.setTransportOptions({pollingInterval: configPollingInterval});
          op.invoke(function(err, result, response, pollingInterval) {
            uuid.v4.restore();
            assert.oneOf(err, [null, undefined]);
            assert.equal((theQueryString.indexOf('retry-after') === -1) ? (configPollingInterval) : (dpsPollingInterval*1000), pollingInterval);
            callback();
          });
          extendedResponse(theQueryString.replace('$rid=123', '$rid='+fakeUuids[0]));
        });
      });
    });
  });

  describe('#cancel', function() {

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_062: [ If `cancel` is called while the transport is in the process of connecting, it shell disconnect transport and cancel the operation that initiated the connection. ] */
    [
      registrationRequest,
      queryOperationStatus
    ].forEach(function(op) {
      it ('disconnects in-progress connection attempt and cancels operation - ' + op.name, function(callback) {
        var newCallback = twoCallsRequired(callback);
        fakeBase.connect = sinon.stub();
        op.invoke(function(err) {
          assert.instanceOf(err, errors.OperationCancelledError);
          newCallback();
        });
        assert(fakeBase.connect.calledOnce);
        assert.isFalse(fakeBase.subscribe.called);
        mqtt.cancel(function(err) {
          assert.oneOf(err, [null, undefined]);
          assert.isFalse(fakeBase.publish.called);
          newCallback();
        });
      });
    });


    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_032: [ If `cancel` is called while the transport is connected and idle, it will call `callback` immediately.] */
    [
      registrationRequest,
      queryOperationStatus
    ].forEach(function(op) {
      it ('does nothing if called while idle - ' + op.name, function(callback) {
        op.invoke(function(err) {
          assert.oneOf(err, [null, undefined]);
          assert(fakeBase.connect.calledOnce);
          assert.isFalse(fakeBase.disconnect.called);
          mqtt.cancel(function(err) {
            assert.oneOf(err, [null, undefined]);
            assert.isFalse(fakeBase.disconnect.called);
            callback();
          });
        });
        respond(fakeBase.publish.firstCall);
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_033: [ If `cancel` is called while the transport is in the middle of a `registrationRequest` operation, it will stop listening for a response and cause `registrationRequest` call it's `callback` passing an `OperationCancelledError` error.] */
    it ('cancels a registrationRequest but doesn\'t disconnect', function(callback) {
      var newCallback = twoCallsRequired(callback);
      mqtt.registrationRequest(fakeRequest, function(err) {
        assert.instanceOf(err, errors.OperationCancelledError);
        newCallback();
      });
      mqtt.cancel(function(err) {
        assert.oneOf(err, [null, undefined]);
        assert(fakeBase.connect.calledOnce);
        assert(fakeBase.subscribe.calledOnce);
        assert.isFalse(fakeBase.disconnect.called);
        newCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_034: [ If `cancel` is called while the transport is in the middle of a `queryOperationStatus` operation, it will stop listening for a response and cause `registrationRequest` call it's `callback` passing an `OperationCancelledError` error.] */
    it ('cancels a queryOperationStatus but doesn\'t disconnect', function(callback) {
      var newCallback = twoCallsRequired(callback);
      mqtt.queryOperationStatus(fakeRequest, fakeOperationId, function(err) {
        assert.instanceOf(err, errors.OperationCancelledError);
        newCallback();
      });
      mqtt.cancel(function(err) {
        assert.oneOf(err, [null, undefined]);
        assert(fakeBase.connect.calledOnce);
        assert(fakeBase.subscribe.calledOnce);
        assert.isFalse(fakeBase.disconnect.called);
        newCallback();
      });
    });
  });

  describe('#disconnect', function() {

    [
      registrationRequest,
      queryOperationStatus
    ].forEach(function(op) {
      it ('calls disconnect and unsubscribe - ' + op.name, function(callback) {
        op.invoke(function(err) {
          assert.oneOf(err, [null, undefined]);
          mqtt.disconnect(function(err) {
            assert.oneOf(err, [null, undefined]);
            /* Tests_SRS_NODE_PROVISIONING_MQTT_18_045: [ When Disconnecting, `Mqtt` shall call `_mqttBase.disconnect`. */
            assert(fakeBase.disconnect.calledOnce);
            /* Tests_SRS_NODE_PROVISIONING_MQTT_18_044: [ When Disconnecting, `Mqtt` shall call _`mqttBase.unsubscribe` */
            assert(fakeBase.unsubscribe.calledOnce);
            callback();
          });
        });
        respond(fakeBase.publish.firstCall);
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_048: [ If either `_mqttBase.unsubscribe` or `_mqttBase.disconnect` fails, `Mqtt` shall call the disconnect `callback` with the failing error, giving preference to the disconnect error.] */
    [
      registrationRequest,
      queryOperationStatus
    ].forEach(function(op) {
      it ('returns unsubscribe error - ' + op.name, function(callback) {
        fakeBase.unsubscribe = sinon.stub().callsArgWith(1, new Error(fakeErrorText));
        op.invoke(function(err) {
          assert.oneOf(err, [null, undefined]);
          mqtt.disconnect(function(err) {
            assert.instanceOf(err, Error);
            assert.strictEqual(err.message, fakeErrorText);
            assert(fakeBase.disconnect.calledOnce);
            assert(fakeBase.unsubscribe.calledOnce);
            callback();
          });
        });
        respond(fakeBase.publish.firstCall);
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_048: [ If either `_mqttBase.unsubscribe` or `_mqttBase.disconnect` fails, `Mqtt` shall call the disconnect `callback` with the failing error, giving preference to the disconnect error.] */
    [
      registrationRequest,
      queryOperationStatus
    ].forEach(function(op) {
      it ('returns disconnect error - ' + op.name, function(callback) {
        fakeBase.disconnect = sinon.stub().callsArgWith(0, new Error(fakeErrorText));
        op.invoke(function(err) {
          assert.oneOf(err, [null, undefined]);
          mqtt.disconnect(function(err) {
            assert(fakeBase.disconnect.calledOnce);
            assert(fakeBase.unsubscribe.calledOnce);
            assert.instanceOf(err, Error);
            assert.strictEqual(err.message, fakeErrorText);
            assert(fakeBase.disconnect.calledOnce);
            assert(fakeBase.unsubscribe.calledOnce);
            callback();
          });
        });
        respond(fakeBase.publish.firstCall);
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_048: [ If either `_mqttBase.unsubscribe` or `_mqttBase.disconnect` fails, `Mqtt` shall call the disconnect `callback` with the failing error, giving preference to the disconnect error.] */
    [
      registrationRequest,
      queryOperationStatus
    ].forEach(function(op) {
      it ('returns error with disconnect error preference - ' + op.name, function(callback) {
        fakeBase.disconnect = sinon.stub().callsArgWith(0, new Error('disconnect'));
        fakeBase.unsubscribe = sinon.stub().callsArgWith(1, new Error('unsubscribe'));
        op.invoke(function(err) {
          assert.oneOf(err, [null, undefined]);
          mqtt.disconnect(function(err) {
            assert.instanceOf(err, Error);
            assert.strictEqual(err.message, 'disconnect');
            assert(fakeBase.disconnect.calledOnce);
            assert(fakeBase.unsubscribe.calledOnce);
            callback();
          });
        });
        respond(fakeBase.publish.firstCall);
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_061: [ If `disconnect` is called while the transport is in the process of connecting, it shell disconnect connection and cancel the operation that initiated the connection. ] */
    [
      registrationRequest,
      queryOperationStatus
    ].forEach(function(op) {
      it ('disconnects in-progress connection attempt and cancels operation - ' + op.name, function(callback) {
        var newCallback = twoCallsRequired(callback);
        fakeBase.connect = sinon.stub();
        op.invoke(function(err) {
          assert.instanceOf(err, errors.OperationCancelledError);
          newCallback();
        });
        assert(fakeBase.connect.calledOnce);
        assert.isFalse(fakeBase.subscribe.called);
        mqtt.disconnect(function(err) {
          assert.oneOf(err, [null, undefined]);
          assert.isFalse(fakeBase.publish.called);
          assert(fakeBase.disconnect.calledOnce);
          newCallback();
        });
        fakeBase.connect.callArg(1);
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_MQTT_18_054: [ If `disconnect` is called while the transport is connected and idle, it shall disconnect. ] */
    [
      registrationRequest,
      queryOperationStatus
    ].forEach(function(op) {
      it ('disconnects if transport is idle - ' + op.name, function(callback) {
        op.invoke(function(err) {
          assert.oneOf(err, [null, undefined]);
          assert(fakeBase.connect.calledOnce);
          assert.isFalse(fakeBase.disconnect.called);
          mqtt.disconnect(function(err) {
            assert.oneOf(err, [null, undefined]);
            assert(fakeBase.disconnect.calledOnce);
            assert(fakeBase.unsubscribe.calledOnce);
            callback();
          });
        });
        respond(fakeBase.publish.firstCall);
      });
    });
  });

  /* Tests_SRS_NODE_PROVISIONING_MQTT_18_030: [ If `cancel` is called while the transport is disconnected, it will call `callback` immediately.] */
  /* Tests_SRS_NODE_PROVISIONING_MQTT_18_052: [ If `disconnect` is called while the transport is disconnected, it will call `callback` immediately. ] */
  [
    'cancel',
    'disconnect'
  ].forEach(function(op) {
    it (op + ' does nothing if called while disconnected', function(callback) {
      mqtt[op](function(err) {
        assert.oneOf(err, [null, undefined]);
        assert.isFalse(fakeBase.connect.called);
        assert.isFalse(fakeBase.subscribe.called);
        assert.isFalse(fakeBase.publish.called);
        assert.isFalse(fakeBase.unsubscribe.called);
        assert.isFalse(fakeBase.disconnect.called);
        callback();
      });
    });
  });

  /* Tests_SRS_NODE_PROVISIONING_MQTT_18_055: [ If `disconnect` is called while the transport is in the middle of a `registrationRequest` operation, it shall cancel the `registrationRequest` operation and disconnect the transport. ] */
  /* Tests_SRS_NODE_PROVISIONING_MQTT_18_056: [ If `disconnect` is called while the transport is in the middle of a `queryOperationStatus` operation, it shall cancel the `queryOperationStatus` operation and disconnect the transport. ] */
  [
    registrationRequest,
    queryOperationStatus
  ].forEach(function(op) {
    it ('disconnect will cancel ' + op.name + ' operation', function(callback) {
      var newCallback = twoCallsRequired(callback);

      op.invoke(function(err) {
        assert.instanceOf(err, errors.OperationCancelledError);
        newCallback();
      });

      assert(fakeBase.publish.calledOnce);
      mqtt.disconnect(function(err) {
        assert.oneOf(err, [null, undefined]);
        assert(fakeBase.disconnect.calledOnce);
        newCallback();
      });
    });
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
