// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var Http = require('../lib/http.js').Http;
var errors = require('azure-iot-common').errors;
var ProvisioningDeviceConstants = require('azure-iot-provisioning-device').ProvisioningDeviceConstants;

describe('Http', function() {
  var http;
  var fakeBase;

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
  var fakeError = new Error(fakeErrorText);

  var fakeHttpRequest = {
    setTimeout: sinon.spy(),
    write:  sinon.spy(),
    end: sinon.spy(),
    abort: sinon.spy()
  };

  var fakeAssignedResponse = {
    status: 'Assigned',
    registrationState: {
      assignedHub: 'fakeHub',
      deviceId: 'fakeDeviceId'
    }
  };

  var registrationRequest = {
    name: 'registrationRequest',
    invoke: function(callback) { http.registrationRequest(fakeRequest, callback); },
    method: 'PUT',
    pathPrefix: '/fakeIdScope/registrations/fakeRegistrationId/register'
  };
  var queryOperationStatus = {
    name: 'queryOperationStatus',
    invoke: function(callback) { http.queryOperationStatus(fakeRequest, fakeOperationId, callback); },
    method: 'GET',
    pathPrefix:'/fakeIdScope/registrations/fakeRegistrationId/operations/fakeOperationId'
  };

  this.timeout(100);

  beforeEach(function() {
    fakeBase = {
      buildRequest: sinon.spy(function() { return fakeHttpRequest; })
    };
    http = new Http(fakeBase);
  });

  var respond_x509 = function(err, body, statusCode) {
    var done = fakeBase.buildRequest.firstCall.args[5]; // index is 4 for non-x509 calls. optional args FTL
    if (err) {
      done(err);
    } else {
      done(null, JSON.stringify(body), { statusCode: statusCode });
    }
  };

  describe('#constructor', function() {
    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_001: [ The `Http` constructor shall accept the following properties:
       - `httpBase` - an optional test implementation of azure-iot-http-base ] */
    it ('accepts the right arguments', function(callback) {
      assert.strictEqual(fakeBase, http._httpBase);
      callback();
    });
  });

  describe('#cancel', function() {
    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_041: [ `cancel` shall immediately call `callback` passing null. ] */
    it ('does nothing', function(callback) {
      http.cancel(callback);
    });
  });

  describe('#disconnect', function() {
    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_040: [ `disconnect` shall immediately call `callback` passing null. ] */
    it ('does nothing', function(callback) {
      http.disconnect(callback);
    });
  });

  describe('#setTransportOptions', function() {
    it ('accepts polling interval', function(callback) {
      http.setTransportOptions({pollingInterval: 10});
      http.setAuthentication(fakeX509);
      http.registrationRequest(fakeRequest, function(err, result, response, pollingInterval) {
        assert.equal(pollingInterval, 10);
        callback();
      });
      respond_x509(null, fakeAssignedResponse, 200);
    });

  });

  describe('#registrationRequest', function() {
    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_008: [ If `forceRegistration` is specified, `registrationRequest` shall include this as a query string value named 'forceRegistration' ] */
    it ('includes forceRegistration value', function(callback) {
      http.setAuthentication(fakeX509);
      fakeRequest.forceRegistration = true;
      http.registrationRequest(fakeRequest, function(err) {
        delete fakeRequest.forceRegistration;
        assert.oneOf(err, [null, undefined]);
        var path = fakeBase.buildRequest.firstCall.args[1];
        assert.notStrictEqual(-1, path.indexOf('forceRegistration=true'));
        callback();
      });
      respond_x509(null, fakeAssignedResponse, 200);
    });
  });

  [
    registrationRequest,
    queryOperationStatus
  ].forEach(function(op) {
    describe('#' + op.name, function() {

      it ('has the right headers', function(callback) {
        http.setAuthentication(fakeX509);
        op.invoke(function(err, result, response) {
          var method = fakeBase.buildRequest.firstCall.args[0];
          var path = fakeBase.buildRequest.firstCall.args[1];
          var headers = fakeBase.buildRequest.firstCall.args[2];
          var host = fakeBase.buildRequest.firstCall.args[3];
          var cert = fakeBase.buildRequest.firstCall.args[4];

          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_045: [ If the Http request succeeds, `registrationRequest` shall call `callback`, passing a `null` error along with the `result` and `response` objects. ] */
          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_039: [ If the Http request succeeds, `queryOperationStatus` shall call `callback`, passing a `null` error along with the `result` and `response` objects. ] */
          assert.oneOf(err, [null, undefined]);
          assert.deepEqual(result, fakeAssignedResponse);
          assert.strictEqual(response.statusCode, 200);

          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_007: [ If an X509 cert if provided, `registrationRequest` shall include it in the Http authorization header. ] */
          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_021: [ If an X509 cert if provided, `queryOperationStatus` shall include it in the Http authorization header. ] */
          assert.strictEqual(cert, fakeX509);

          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_005: [ `registrationRequest` shall include the current `api-version` as a URL query string value named 'api-version'. ] */
          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_037: [ `queryOperationStatus` shall include the current `api-version` as a URL query string value named 'api-version'. ] */
          assert.notStrictEqual(path.indexOf('api-version='+ProvisioningDeviceConstants.apiVersion), -1);

          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_006: [ `registrationRequest` shall specify the following in the Http header:
              Accept: application/json
              Content-Type: application/json; charset=utf-8 ] */
          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_020: [ `queryOperationStatus` shall specify the following in the Http header:
              Accept: application/json
              Content-Type: application/json; charset=utf-8 ] */
          assert.strictEqual(headers.Accept, 'application/json');
          assert.strictEqual(headers['Content-Type'], 'application/json; charset=utf-8');

          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_009: [ `registrationRequest` shall PUT the registration request to 'https://{provisioningHost}/{idScope}/registrations/{registrationId}/register' ] */
          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_022: [ `queryOperationStatus` shall send a GET operation sent to 'https://{provisioningHost}/{idScope}/registrations/{registrationId}/operations/{operationId}'  ] */
          assert.strictEqual(method, op.method);
          assert.strictEqual(host, fakeHost);

          callback();
        });
        respond_x509(null, fakeAssignedResponse, 200);
      });

      /* Codes_SRS_NODE_PROVISIONING_HTTP_18_044: [ If the Http request fails for any reason, `registrationRequest` shall call `callback`, passing the error along with the `result` and `response` objects. ] */
      /* Codes_SRS_NODE_PROVISIONING_HTTP_18_038: [ If the Http request fails for any reason, `queryOperationStatus` shall call `callback`, passing the error along with the `result` and `response` objects. ] */
      it ('returns error', function(callback) {
        http.setAuthentication(fakeX509);
        op.invoke(function(err) {
          assert.strictEqual(err, fakeError);
          callback();
        });
        respond_x509(fakeError);
      });


      /* Tests_SRS_NODE_PROVISIONING_HTTP_18_014: [ If the Http response has a failed status code, `registrationRequest` shall use `translateError` to translate this to a common error object ] */
      /* Tests_SRS_NODE_PROVISIONING_HTTP_18_026: [ If the Http response has a failed status code, `queryOperationStatus` shall use `translateError` to translate this to a common error object ] */
      it ('uses translateError on http response code', function(callback) {
        http.setAuthentication(fakeX509);
        op.invoke(function(err) {
          assert.instanceOf(err, errors.InternalServerError);
          callback();
        });
        respond_x509(null, fakeAssignedResponse, 500);
      });
    });
  });
});


