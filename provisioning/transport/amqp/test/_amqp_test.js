// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
/*jshint esversion: 6 */

var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var sinon = require('sinon');
var AmqpMessage = require('azure-iot-amqp-base').AmqpMessage;
var errors = require('azure-iot-common').errors;
var ProvisioningDeviceConstants = require('azure-iot-provisioning-device').ProvisioningDeviceConstants;
var Amqp = require('../dist/amqp.js').Amqp;
var Builder = require('buffer-builder');
var rheaMessage = require('rhea').message;

var retryAfterProperty = 'retry-after';
var internalServerError = {
  condition: 'amqp:internal-error',
  info: {
    'retry-after': '42'
  }
};

var throttlingError = {
  condition: 'com.microsoft:device-container-throttled',
  info: {
    'retry-after': '42'
  }
};

var internalServerErrorNoRetryAfter = {
  condition: 'amqp:internal-error'
};

var throttlingErrorNoRetryAfter = {
  condition: 'com.microsoft:device-container-throttled'
};

var simpleBody = {registrationId: 'fakeRegistrationId'};
var fakeEk = '__FAKE_KEY__';
var fakeSrk = '__FAKE_STORAGE_KEY__';
var payload = {a: '__DAta__'};
var bodyWithTpm = {
  registrationId: 'fakeRegistrationId',
  tpm: {
    endorsementKey: (Buffer.from(fakeEk)).toString('base64'),
    storageRootKey: (Buffer.from(fakeSrk)).toString('base64')
  }
};
var bodyWithPayload = {
  registrationId: 'fakeRegistrationId',
  payload: payload
};

describe('Amqp', function () {
  var fakeSenderLink, fakeReceiverLink, fakeAmqpBase, amqp;

  var fakeRequest = {
    idScope: 'fakeScope',
    registrationId: 'fakeRegistrationId',
    forceRegistration: false
  };
  var fakeError = new Error('fake error');
  var fakeOperationId = 'fakeOpId';

  var registrationRequest = {
    name: 'registrationRequest',
    invoke: function(callback) { amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, callback); }
  };
  var queryOperationStatus = {
    name: 'queryOperationStatus',
    invoke: function(callback) { amqp.queryOperationStatus({ registrationId: 'fakeRegistrationId' }, 'fakeOpId', callback); }
  };

  beforeEach(function () {
    fakeReceiverLink = new EventEmitter();
    fakeReceiverLink.forceDetach = sinon.stub();
    fakeReceiverLink.detach = sinon.stub().callsArg(0);

    fakeSenderLink = new EventEmitter();
    fakeSenderLink.forceDetach = sinon.stub();
    fakeSenderLink.detach = sinon.stub().callsArg(0);
    fakeSenderLink.send = sinon.stub().callsFake((message, callback) => {
      var fakeResponse;
      if (message.application_properties['iotdps-operation-type'] === 'iotdps-register') {
        fakeResponse = new AmqpMessage();
        fakeResponse.body = {
          content: JSON.stringify({
            operationId: 'fakeOpId',
            status: 'assigning'
          })
        };
        if (fakeSenderLink.giveBadCorrelationId) {
          fakeResponse.correlation_id = 'Will not match anything';
        } else {
          fakeResponse.correlation_id = message.correlation_id;
        }
        if (fakeSenderLink.insertARetryAfter) {
          fakeResponse.application_properties = {};
          fakeResponse.application_properties[retryAfterProperty] = '42';
        }
      } else {
        fakeResponse = new AmqpMessage();
        fakeResponse.body = {
          content: JSON.stringify({
            operationId: message.application_properties['iotdps-operation-id'],
            status: 'assigned',
            registrationState: {}
          })
        };
        fakeResponse.correlation_id = message.correlation_id;
      }

      fakeReceiverLink.emit ('message', fakeResponse);
      callback();
    });

    fakeAmqpBase = {
      connect: sinon.stub().callsArg(1),
      disconnect: sinon.stub().callsArg(0),
      attachSenderLink: sinon.stub().callsArgWith(2, null, fakeSenderLink),
      attachReceiverLink: sinon.stub().callsArgWith(2, null, fakeReceiverLink),
    };

    amqp = new Amqp(fakeAmqpBase);
  });

  afterEach(function() {
    fakeSenderLink = null;
    fakeReceiverLink = null;
    fakeAmqpBase = null;
    amqp = null;
  });

  describe('Symmetric Key', function() {
    it('Shall set username and password on connect', function(callback) {
      /*Tests_SRS_NODE_PROVISIONING_AMQP_06_001: [ The sas token passed shall be saved into the current transport object. ] */
      /*Codes_SRS_NODE_PROVISIONING_AMQP_06_002: [** The `registrationRequest` method shall connect the amqp client, if utilizing the passed in sas from setSharedAccessSignature, shall in the connect options set the username to:
        ```
        <scopeId>/registrations/<registrationId>
        ```
        and shall set the password to the passed in sas token.
        ] */
        var fakeSas = 'fake sas';
      amqp.setSharedAccessSignature(fakeSas);
      amqp.registrationRequest(fakeRequest, function() {
        assert.isTrue(fakeAmqpBase.connect.calledOnce);
        assert.equal(fakeAmqpBase.connect.firstCall.args[0].policyOverride.username, fakeRequest.idScope + '/registrations/' + fakeRequest.registrationId);
        assert.equal(fakeAmqpBase.connect.firstCall.args[0].policyOverride.password, fakeSas);
        callback();
      })
    });
  });

  describe('X509', function () {
    beforeEach(function() {
      amqp.setAuthentication({
        cert: 'fakeCert',
        key: 'fakeKey'
      });
    });

    describe('registrationRequest', function () {
      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_002: [The `registrationRequest` method shall connect the AMQP client with the certificate and key given in the `auth` parameter of the previously called `setAuthentication` method.]*/
      it('connects the AMQP connection using the X509 certificate', function (testCallback) {

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function () {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_99_001: [The `registrationRequest` method shall connect the AMQP client with the agent given in the `webSocketAgent` parameter of the previously called `setTransportOptions` method.]*/
      it('connects the AMQ connection on using the agent set in transport options', function (testCallback) {
        var expectedAgent = '__FAKE_AGENT__';
        amqp.setTransportOptions({webSocketAgent: expectedAgent});
        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function () {
          var actualAgent = fakeAmqpBase.connect.getCall(0).args[0].sslOptions.agent;
          assert.equal(actualAgent, expectedAgent);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_008: [The `registrationRequest` method shall call its callback with an error if the transport fails to connect.]*/
      it ('calls its callback with an error if it fails to connect', function (testCallback) {
        fakeAmqpBase.connect = sinon.stub().callsArgWith(1, fakeError);

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function (err) {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_003: [The `registrationRequest` method shall attach a sender link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
      ```
      com.microsoft:api-version: <API_VERSION>
      com.microsoft:client-version: <CLIENT_VERSION>
      ```]*/
      it ('attaches the sender link', function (testCallback) {

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function () {
          assert.isTrue(fakeAmqpBase.attachSenderLink.calledOnce);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_009: [The `registrationRequest` method shall call its callback with an error if the transport fails to attach the sender link.]*/
      it ('calls its callback with an error if it fails to attach the sender link', function (testCallback) {
        fakeAmqpBase.attachSenderLink = sinon.stub().callsArgWith(2, fakeError);

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function (err) {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_004: [The `registrationRequest` method shall attach a receiver link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
      ```
      com.microsoft:api-version: <API_VERSION>
      com.microsoft:client-version: <CLIENT_VERSION>
      ```]*/
      it ('attaches the receiver link', function (testCallback) {

        amqp.registrationRequest(fakeRequest, function () {
          assert.isTrue(fakeAmqpBase.attachReceiverLink.calledOnce);
          var attachedLinkEndpoint = fakeAmqpBase.attachReceiverLink.firstCall.args[0];
          var attachedLinkOptions = fakeAmqpBase.attachReceiverLink.firstCall.args[1];
          assert.strictEqual(attachedLinkEndpoint, fakeRequest.idScope +  '/registrations/' + fakeRequest.registrationId);
          assert.strictEqual(attachedLinkOptions.properties['com.microsoft:api-version'], ProvisioningDeviceConstants.apiVersion);

          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_010: [The `registrationRequest` method shall call its callback with an error if the transport fails to attach the receiver link.]*/
      it ('calls its callback with an error if it fails to attach the receiver link', function (testCallback) {
        fakeAmqpBase.attachReceiverLink = sinon.stub().callsArgWith(2, fakeError);

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function (err) {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_005: [The `registrationRequest` method shall send a message on the previously attached sender link with a `correlation_id` set to a newly generated UUID and the following application properties:
      ```
      iotdps-operation-type: iotdps-register;
      iotdps-forceRegistration: <true or false>;
      ```
      ]*/
      it ('sends a properly formatted message', function (testCallback) {

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function () {
          assert.isTrue(fakeSenderLink.send.calledOnce);
          var sentMessage = fakeSenderLink.send.firstCall.args[0];
          assert.strictEqual(sentMessage.application_properties['iotdps-operation-type'], 'iotdps-register');
          assert.strictEqual(sentMessage.application_properties['iotdps-forceRegistration'], fakeRequest.forceRegistration);
          assert.isOk(sentMessage.correlation_id);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_06_003: [ The `registrationRequest` will send a body in the message which contains a stringified JSON object with a `registrationId` property.] */
      it ('Sends a body', function (testCallback) {

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function () {
          assert.isTrue(fakeSenderLink.send.calledOnce);
          var sentMessage = fakeSenderLink.send.firstCall.args[0];
          var encodedBody = rheaMessage.data_section(Buffer.from(JSON.stringify(simpleBody)));
          assert.deepEqual(sentMessage.body, encodedBody);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_06_004: [The `registrationRequest` will, if utilizing TPM attestation, send a `tpm` property with the endorsement and storage key in the JSON body.] */
      it ('Sends a body with a tpm property', function (testCallback) {

        amqp.setTpmInformation(Buffer.from(fakeEk), Buffer.from(fakeSrk));
        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function () {
          assert.isTrue(fakeSenderLink.send.calledOnce);
          var sentMessage = fakeSenderLink.send.firstCall.args[0];
          var encodedBody = rheaMessage.data_section(Buffer.from(JSON.stringify(bodyWithTpm)));
          assert.deepEqual(sentMessage.body, encodedBody);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_06_005: [The `registrationRequest` will, if utilizing custom allocation data, send a `payload` property in the JSON body.] */
      it ('Sends a body with a payload property', function (testCallback) {

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId', payload: payload }, function () {
          assert.isTrue(fakeSenderLink.send.calledOnce);
          var sentMessage = fakeSenderLink.send.firstCall.args[0];
          var encodedBody = rheaMessage.data_section(Buffer.from(JSON.stringify(bodyWithPayload)));
          assert.deepEqual(sentMessage.body, encodedBody);
          testCallback();
        });
      });

      [
        internalServerError,
        throttlingError
      ].forEach(function(retryableError) {
        /*Tests_SRS_NODE_PROVISIONING_AMQP_06_007: [If the `registrationRequest` send request is rejected with an `InternalError` or `ThrottlingError`, the result.status value will be set with `registering` and the callback will be invoked with *no* error object.] */
        it ('registerRequest calls its callback with an NO error and status of \'registering\' if sending message rejected with ' + retryableError.condition, function (testCallback) {
          fakeSenderLink.send = sinon.stub().callsArgWith(1, retryableError);

          amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function (err, result, response, pollingInterval) {
            assert.isTrue(fakeSenderLink.send.calledOnce);
            assert.isNotOk(err);
            assert.equal(result.status, 'registering');
            assert.isOk(pollingInterval);
            testCallback();
          });
        });
      });

      [
        internalServerError,
        throttlingError,
        internalServerErrorNoRetryAfter,
        throttlingErrorNoRetryAfter
      ].forEach(function(retryableError) {
        let dpsProvidedInterval = 5;
        let defaultPollingInterval  = 4000;
        /*Tests_SRS_NODE_PROVISIONING_AMQP_06_009: [If the `registrationRequest` rejection error contains the info property`retry-after`, it will be interpreted as the number of seconds that should elapse before the next attempted operation.  Otherwise default.] */
        it ('Retryable registerRequest polling interval ' + ((retryableError.info) ? ('given by the dps service.') : ('defaults when dps does not provide it.')) , function (testCallback) {
          if (retryableError.info) {
            retryableError.info[retryAfterProperty] = dpsProvidedInterval.toString();
          }
          fakeSenderLink.send = sinon.stub().callsArgWith(1, retryableError);
          amqp.setTransportOptions({pollingInterval: defaultPollingInterval})
          amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function (err, result, response, pollingInterval) {
            assert.isTrue(fakeSenderLink.send.calledOnce);
            assert.isNotOk(err);
            assert.equal(result.status, 'registering');
            assert.equal(((retryableError.info) ? (dpsProvidedInterval * 1000) : (defaultPollingInterval)), pollingInterval);
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_011: [The `registrationRequest` method shall call its callback with an error if the transport fails to send the request message.]*/
      it ('calls its callback with an error if sending the message fails', function (testCallback) {
        fakeSenderLink.send = sinon.stub().callsArgWith(1, fakeError);

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function (err) {
          assert.isTrue(fakeSenderLink.send.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });
    });

    describe('queryOperationStatus', function () {

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_012: [The `queryOperationStatus` method shall connect the AMQP client with the certificate and key given in the `auth` parameter of the previously called `setAuthentication` method.]*/
      it ('connects the AMQP connection using the X509 certificate', function (testCallback) {

        amqp.queryOperationStatus({ registrationId: 'fakeRegistrationId' }, 'fakeOpId', function () {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_018: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to connect.]*/
      it ('calls its callback with an error if it fails to connect', function (testCallback) {
        fakeAmqpBase.connect = sinon.stub().callsArgWith(1, fakeError);

        amqp.queryOperationStatus({ registrationId: 'fakeRegistrationId' }, 'fakeOpId', function (err) {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_013: [The `queryOperationStatus` method shall attach a sender link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
      ```
      com.microsoft:api-version: <API_VERSION>
      com.microsoft:client-version: <CLIENT_VERSION>
      ```]*/
      it ('attaches the sender link', function (testCallback) {

        amqp.queryOperationStatus({ registrationId: 'fakeRegistrationId' }, 'fakeOpId', function () {
          assert.isTrue(fakeAmqpBase.attachSenderLink.calledOnce);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_019: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to attach the sender link.]*/
      it ('calls its callback with an error if it fails to attach the sender link', function (testCallback) {
        fakeAmqpBase.attachSenderLink = sinon.stub().callsArgWith(2, fakeError);

        amqp.queryOperationStatus({ registrationId: 'fakeRegistrationId' }, 'fakeOpId', function (err) {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_014: [The `queryOperationStatus` method shall attach a receiver link on the `<idScope>/registrations/<registrationId>` endpoint with the following properties:
      ```
      com.microsoft:api-version: <API_VERSION>
      com.microsoft:client-version: <CLIENT_VERSION>
      ```]*/
      it ('attaches the receiver link', function (testCallback) {

        amqp.queryOperationStatus({ registrationId: 'fakeRegistrationId' }, 'fakeOpId', function () {
          assert.isTrue(fakeAmqpBase.attachReceiverLink.calledOnce);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_020: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to attach the receiver link.]*/
      it ('calls its callback with an error if it fails to attach the receiver link', function (testCallback) {
        fakeAmqpBase.attachReceiverLink = sinon.stub().callsArgWith(2, fakeError);

        amqp.queryOperationStatus({ registrationId: 'fakeRegistrationId' }, 'fakeOpId', function (err) {
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_015: [The `queryOperationStatus` method shall send a message on the pre-attached sender link with a `correlation_id` set to a newly generated UUID and the following application properties:
      ```
      iotdps-operation-type: iotdps-get-operationstatus;
      iotdps-operation-id: <operationId>;
      ```]*/
      it ('sends a properly formatted message', function (testCallback) {

        amqp.queryOperationStatus(fakeRequest, fakeOperationId, function () {
          assert.isTrue(fakeSenderLink.send.calledOnce);
          var sentMessage = fakeSenderLink.send.firstCall.args[0];
          assert.strictEqual(sentMessage.application_properties['iotdps-operation-type'], 'iotdps-get-operationstatus');
          assert.strictEqual(sentMessage.application_properties['iotdps-operation-id'], fakeOperationId);
          assert.isOk(sentMessage.correlation_id);
          testCallback();
        });
      });

      [
        internalServerError,
        throttlingError
      ].forEach(function(retryableError) {
        /*Tests_SRS_NODE_PROVISIONING_AMQP_06_006: [If the `queryOperationStatus` send request is rejected with an `InternalError` or `ThrottlingError`, the result.status value will be set with `assigning` and the callback will be invoked with *no* error object.] */
        it ('queryOperationstatus calls its callback with an NO error and status of \'assigning\' if sending message rejected with ' + retryableError.condition, function (testCallback) {
          fakeSenderLink.send = sinon.stub().callsArgWith(1, retryableError);

          amqp.queryOperationStatus(fakeRequest, fakeOperationId,function (err, result, response, pollingInterval) {
            assert.isTrue(fakeSenderLink.send.calledOnce);
            assert.isNotOk(err);
            assert.equal(result.status, 'assigning');
            assert.isOk(pollingInterval);
            testCallback();
          });
        });
      });

      [
        internalServerError,
        throttlingError,
        internalServerErrorNoRetryAfter,
        throttlingErrorNoRetryAfter
      ].forEach(function(retryableError) {
        let dpsProvidedInterval = 5;
        let defaultPollingInterval  = 4000;
        /*Tests_SRS_NODE_PROVISIONING_AMQP_06_008: [If the `queryOperationsStatus` rejection error contains the info property`retry-after`, it will be interpreted as the number of seconds that should elapse before the next attempted operation.  Otherwise default.] */
        it ('Retryable queryOperationStatus polling interval ' + ((retryableError.info) ? ('given by the dps service.') : ('defaults when dps does not provide it.')) , function (testCallback) {
          if (retryableError.info) {
            retryableError.info[retryAfterProperty] = dpsProvidedInterval.toString();
          }
          fakeSenderLink.send = sinon.stub().callsArgWith(1, retryableError);
          amqp.setTransportOptions({pollingInterval: defaultPollingInterval})
          amqp.queryOperationStatus(fakeRequest, fakeOperationId, function (err, result, response, pollingInterval) {
            assert.isTrue(fakeSenderLink.send.calledOnce);
            assert.isNotOk(err);
            assert.equal(result.status, 'assigning');
            assert.equal(((retryableError.info) ? (dpsProvidedInterval * 1000) : (defaultPollingInterval)), pollingInterval);
            testCallback();
          });
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_021: [The `queryOperationStatus` method shall call its callback with an error if the transport fails to send the request message.]*/
      it ('calls its callback with an error if sending the message fails', function (testCallback) {
        fakeSenderLink.send = sinon.stub().callsArgWith(1, fakeError);

        amqp.queryOperationStatus(fakeRequest, fakeOperationId, function (err) {
          assert.isTrue(fakeSenderLink.send.calledOnce);
          assert.strictEqual(err, fakeError);
          testCallback();
        });
      });
    });

    describe('general response handling', function() {
      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_007: [The `registrationRequest` method shall call its callback with a `RegistrationResult` object parsed from the body of the response message which `correlation_id` matches the `correlation_id` of the request message sent on the sender link.]*/
      /*Tests_SRS_NODE_PROVISIONING_AMQP_06_010: [If the amqp response to a request contains the application property`retry-after`, it will be interpreted as the number of seconds that should elapse before the next attempted operation.  Otherwise default.] */
      it ('registerRequest will return an \'assigning\' status', function (testCallback) {
        amqp.setTransportOptions({pollingInterval: 4321});
        amqp.registrationRequest(fakeRequest, function(err, result, response, pollingInterval) {
          assert.isNotOk(err);
          assert.strictEqual(result.status, 'assigning');
          assert.strictEqual(pollingInterval, 4321);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_017: [The `queryOperationStatus` method shall call its callback with a `RegistrationResult` object parsed from the body of the response message which `correlation_id` matches the `correlation_id` of the request message sent on the sender link.]*/
      it ('operationStatusRequest will return an \'assigned\' status', function (testCallback) {
        amqp.queryOperationStatus(fakeRequest, fakeOperationId, function(err, result, response) {
          assert.isNotOk(err);
          assert.strictEqual(result.status, 'assigned');
          testCallback();
        });
      });

      it ('message with unrecognized correlation id will not be processed as a response.', function(testCallback) {
        fakeSenderLink.giveBadCorrelationId = true;
        var stubCallback = sinon.spy();
        amqp.registrationRequest(fakeRequest, stubCallback);
        assert(stubCallback.notCalled);
        testCallback();
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_06_010: [If the amqp response to a request contains the application property`retry-after`, it will be interpreted as the number of seconds that should elapse before the next attempted operation.  Otherwise default.] */
      it ('registerRequest will use retry-after if supplied by the service', function (testCallback) {
        amqp.setTransportOptions({pollingInterval: 4321});
        fakeSenderLink.insertARetryAfter = true;
        amqp.registrationRequest(fakeRequest, function(err, result, response, pollingInterval) {
          assert.strictEqual(pollingInterval, 42000);
          testCallback();
        });
      });
    });

    describe('amqpError', function () {
      it ('forces link detach and disconnects the connection', function (testCallback) {
        fakeSenderLink.send = sinon.stub().callsFake(function () {
          fakeSenderLink.emit ('error', fakeError);
        });
        amqp.on('error', function (err) {
          assert.strictEqual(err, fakeError);
          assert.isTrue(fakeAmqpBase.disconnect.calledOnce);
          assert.isTrue(fakeReceiverLink.forceDetach.calledOnce);
          assert.isTrue(fakeSenderLink.forceDetach.calledOnce);
          testCallback();
        });

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function () {});
      });
    });

    describe('disconnect', function () {

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_022: [`disconnect` shall call its callback immediately if the AMQP connection is disconnected.]*/
      it ('calls its callback immediately if disconnected', function (testCallback) {

        amqp.disconnect(function () {
          assert.isTrue(fakeAmqpBase.connect.notCalled);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_023: [`disconnect` shall detach the sender and receiver links and disconnect the AMQP connection.]*/
      it ('detaches the links if they are attached and disconnects the connection', function (testCallback) {
        fakeSenderLink.send = sinon.stub(); // will block while sending the request

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function () {});
        amqp.disconnect(function () {
          assert.isTrue(fakeAmqpBase.disconnect.calledOnce);
          assert.isTrue(fakeReceiverLink.detach.calledOnce);
          assert.isTrue(fakeSenderLink.detach.calledOnce);
          /*Tests_SRS_NODE_PROVISIONING_AMQP_16_024: [`cancel` shall call its callback with no arguments if all detach/disconnect operations were successful.]*/
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_023: [`disconnect` shall detach the sender and receiver links and disconnect the AMQP connection.]*/
      it ('disconnects the connection if called while attaching the receiver link', function (testCallback) {
        fakeAmqpBase.attachReceiverLink = sinon.stub(); // will block while in the 'connecting' state since the callback won't be called.
        amqp.setAuthentication({
          cert: 'fakeCert',
          key: 'fakeKey'
        });

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function () {});
        amqp.disconnect(function () {
          assert.isTrue(fakeAmqpBase.disconnect.calledOnce);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_16_023: [`disconnect` shall detach the sender and receiver links and disconnect the AMQP connection.]*/
      it ('detaches the receiver and disconnects the connection if called while attaching the sender link', function (testCallback) {
        fakeAmqpBase.attachSenderLink = sinon.stub(); // will block while in the 'connecting' state since the callback won't be called.

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function () {});
        amqp.disconnect(function () {
          assert.isTrue(fakeAmqpBase.disconnect.calledOnce);
          assert.isTrue(fakeReceiverLink.detach.calledOnce);
          testCallback();
        });
      });

      [
        registrationRequest,
        queryOperationStatus
      ].forEach(function(op) {
        /*Tests_SRS_NODE_PROVISIONING_AMQP_18_002: [ `disconnect` shall cause a `queryOperationStatus` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
        /*Tests_SRS_NODE_PROVISIONING_AMQP_18_001: [ `disconnect` shall cause a `registrationRequest` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
        it ('cancels ' + op.name + ' when called while connecting', function(testCallback) {
          fakeAmqpBase.connect = sinon.stub();

          op.invoke(function (err) {
            assert.instanceOf(err, errors.OperationCancelledError);
            assert.isTrue(fakeAmqpBase.disconnect.called);
            testCallback();
          });
          amqp.disconnect(function() {});
        });

        /*Tests_SRS_NODE_PROVISIONING_AMQP_18_002: [ `disconnect` shall cause a `queryOperationStatus` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
        /*Tests_SRS_NODE_PROVISIONING_AMQP_18_001: [ `disconnect` shall cause a `registrationRequest` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
        it ('cancels ' + op.name + ' when called while attaching links', function(testCallback) {
          fakeSenderLink.send = sinon.stub();

          op.invoke(function (err) {
            assert.instanceOf(err, errors.OperationCancelledError);
            assert.isTrue(fakeAmqpBase.disconnect.called);
            testCallback();
          });
          amqp.disconnect(function() {});
        });

        /*Tests_SRS_NODE_PROVISIONING_AMQP_18_009: [ `disconnect` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
        it ( 'disconnects and cancels ' + op.name + ' operation if called while connecting', function(testCallback) {
          fakeAmqpBase.attachSenderLink = sinon.stub();

          op.invoke(function (err) {
            assert.instanceOf(err, errors.OperationCancelledError);
            testCallback();
          });
          amqp.disconnect(function() {});
        });
      });


    });

    describe('cancel', function () {
      /*Tests_SRS_NODE_PROVISIONING_AMQP_18_003: [ `cancel` shall call its callback immediately if the AMQP connection is disconnected. ] */
      it ('calls its callback immediately if disconnected', function (testCallback) {

        amqp.cancel(function () {
          assert.isTrue(fakeAmqpBase.connect.notCalled);
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_18_004: [ `cancel` shall call its callback immediately if the AMQP connection is connected but idle. ] */
      it ( 'calls its callback immediately if idle', function(testCallback) {

        amqp.registrationRequest({ registrationId: 'fakeRegistrationId' }, function (err) {
          assert.isNotOk(err);
          assert.isTrue(fakeAmqpBase.connect.calledOnce);
          assert.isFalse(fakeAmqpBase.disconnect.called);

          amqp.cancel(function(err) {
            assert.isNotOk(err);
            testCallback();
          });
        });
      });

      [
        registrationRequest,
        queryOperationStatus
      ].forEach(function(op) {
        /*Tests_SRS_NODE_PROVISIONING_AMQP_18_005: [ `cancel` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
        it ( 'disconnects and cancels ' + op.name + ' operation if called while connecting', function(testCallback) {
          fakeAmqpBase.connect = sinon.stub();

          op.invoke(function (err) {
            assert.instanceOf(err, errors.OperationCancelledError);
            testCallback();
          });
          amqp.cancel(function() {});
        });

        /*Tests_SRS_NODE_PROVISIONING_AMQP_18_005: [ `cancel` shall disconnect the AMQP connection and cancel the operation that initiated a connection if called while the connection is in process. ] */
        it ( 'disconnects and cancels ' + op.name + ' operation if called while attaching links', function(testCallback) {
          fakeAmqpBase.attachSenderLink = sinon.stub();

          op.invoke(function (err) {
            assert.instanceOf(err, errors.OperationCancelledError);
            testCallback();
          });
          amqp.cancel(function() {});
        });

        /*Tests_SRS_NODE_PROVISIONING_AMQP_18_007: [ `cancel` shall cause a `queryOperationStatus` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
        /*Tests_SRS_NODE_PROVISIONING_AMQP_18_006: [ `cancel` shall cause a `registrationRequest` operation that is in progress to call its callback passing an `OperationCancelledError` object. ] */
        it ('cancels ' + op.name + ' when called', function(testCallback) {
          fakeSenderLink.send = sinon.stub();

          op.invoke(function (err) {
            assert.instanceOf(err, errors.OperationCancelledError);
            /*Tests_SRS_NODE_PROVISIONING_AMQP_18_008: [ `cancel` shall not disconnect the AMQP transport. ] */
            assert.isFalse(fakeAmqpBase.disconnect.called);
            testCallback();
          });
          amqp.cancel(function() {});
        });
      });
    });

  });

  describe('TPM', function() {
    var fakeEndorsementKey = Buffer.from('__FAKE_EK__');
    var fakeStorageRootKey = Buffer.from('__FAKE_SRK__');
    var fakeAuthenticationKey = Buffer.from('__FAKE_AUTH_KEY__');
    var fakeSasToken = '__FAKE_SAS_TOKEN__';
    var SaslTpm;

    before(function() {
      SaslTpm = sinon.spy(require('../dist/sasl_tpm'), 'SaslTpm');
      sinon.stub(SaslTpm.prototype, 'start');
      sinon.stub(SaslTpm.prototype, 'step');
    });

    after(function() {
      SaslTpm.prototype.start.restore();
      SaslTpm.prototype.step.restore();
      SaslTpm.restore();
      SaslTpm = null;
    });

    beforeEach(function() {
      SaslTpm.resetHistory();
      amqp.setTpmInformation(fakeEndorsementKey, fakeStorageRootKey);
      fakeAmqpBase.connectWithCustomSasl = sinon.stub().callsArgWith(3, null);
    });

    describe('getAuthenticationChallenge', function() {
      it ('sends the right authentication challenge', function(callback) {

        amqp.getAuthenticationChallenge(fakeRequest, function() {});

        /*Tests_SRS_NODE_PROVISIONING_AMQP_18_011: [ `getAuthenticationChallenge` shall initiate connection with the AMQP client using the TPM SASL mechanism. ]*/
        assert(SaslTpm.calledOnce);

        /*Tests_SRS_NODE_PROVISIONING_AMQP_18_012: [ `getAuthenticationChallenge` shall send the challenge to the AMQP service using a hostname of "<idScope>/registrations/<registrationId>". ]*/
        assert.strictEqual(SaslTpm.firstCall.args[0], 'fakeScope');
        assert.strictEqual(SaslTpm.firstCall.args[1], 'fakeRegistrationId');
        assert.deepEqual(SaslTpm.firstCall.args[2], fakeEndorsementKey);
        assert.deepEqual(SaslTpm.firstCall.args[3], fakeStorageRootKey);

        callback();
      });

      it ('returns success correctly', function(callback) {
        amqp.getAuthenticationChallenge(fakeRequest, function(err, challenge) {
          /*Tests_SRS_NODE_PROVISIONING_AMQP_18_015: [ `getAuthenticationChallenge` shall call `callback` passing `null` and the challenge buffer after the challenge has been received from the service. ]*/
          assert.isNull(err);
          assert.strictEqual(challenge, fakeAuthenticationKey);
          callback();
        });

        var challengeCallback = SaslTpm.firstCall.args[4];
        challengeCallback(fakeAuthenticationKey);
      });

    });

    describe('respondToAuthenticationChallenge', function() {

      /*Tests_SRS_NODE_PROVISIONING_AMQP_18_017: [ `respondToAuthenticationChallenge` shall call `callback` with an `InvalidOperationError` if called before calling `getAuthenticationChallenge`. ]*/
      it ('fails if called too early', function(callback) {
        amqp.respondToAuthenticationChallenge(fakeRequest, fakeSasToken, function(err) {
          assert.instanceOf(err, errors.InvalidOperationError);
          callback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_18_018: [ `respondToAuthenticationChallenge` shall respond to the auth challenge to the service in the form "<0><sasToken>" where <0> is a zero byte. ]*/
      it ('responds to the challenge correctly', function(callback) {
        amqp.getAuthenticationChallenge(fakeRequest, function(err) {
          assert.isNull(err);
          amqp.respondToAuthenticationChallenge(fakeRequest, fakeSasToken, function() {});
        });

        var challengeCallback = SaslTpm.firstCall.args[4];
        // return the auth key to the transport, verify that it responds with the sas token above.
        challengeCallback(fakeAuthenticationKey, function(err, challengeResponse) {
          assert.strictEqual(challengeResponse, fakeSasToken);
          callback();
        });
      });

      var respondToAuthChallengeCorrectly = function() {
        var challengeCallback = SaslTpm.firstCall.args[4];
        // return the auth key to the transport.  When it sends us the SAS token, complete the connection.
        challengeCallback(fakeAuthenticationKey, function() {
          var connectionComplete = fakeAmqpBase.connect.firstCall.args[1];
          connectionComplete(null);
        });
      };

      it ('succeeds correctly', function(callback) {
        amqp.getAuthenticationChallenge(fakeRequest, function(err) {
          assert.isNull(err);
          amqp.respondToAuthenticationChallenge(fakeRequest, fakeSasToken, function(err) {
            /*Tests_SRS_NODE_PROVISIONING_AMQP_18_023: [ `respondToAuthenticationChallenge` shall call its callback passing `null` if the AMQP connection is established and links are attached. ]*/
            assert.isNotOk(err);
            /*Tests_SRS_NODE_PROVISIONING_AMQP_18_020: [ `respondToAuthenticationChallenge` shall attach sender and receiver links if the connection completes successfully. ]*/
            assert(fakeAmqpBase.attachSenderLink.calledOnce);
            assert(fakeAmqpBase.attachReceiverLink.calledOnce);
            callback();
          });
        });

        respondToAuthChallengeCorrectly();
      });

      /*Tests_SRS_NODE_PROVISIONING_AMQP_18_021: [ `respondToAuthenticationChallenge` shall call its callback passing an `Error` object if the transport fails to attach the sender link. ]*/
      /*Tests_SRS_NODE_PROVISIONING_AMQP_18_022: [ `respondToAuthenticationChallenge` shall call its callback passing an `Error` object if the transport fails to attach the receiver link. ]*/
      ['attachSenderLink', 'attachReceiverLink'].forEach(function(failingFunction) {
        it ('returns error if failure calling ' + failingFunction, function(callback) {

          fakeAmqpBase[failingFunction] = sinon.stub().callsArgWith(2, fakeError);
          amqp.getAuthenticationChallenge(fakeRequest, function(err) {
            assert.isNull(err);
            amqp.respondToAuthenticationChallenge(fakeRequest, fakeSasToken, function(err) {
              assert.strictEqual(err, fakeError);
              callback();
            });
          });

          respondToAuthChallengeCorrectly();
        });

      });
    });
  });


});

