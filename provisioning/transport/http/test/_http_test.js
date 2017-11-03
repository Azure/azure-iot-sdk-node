// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var Transport = require('../lib/http.js').Http;
var errors = require('azure-iot-common').errors;
var Provisioning = require('azure-iot-provisioning-device');

var Http = function(config, base) {
  return new Provisioning.ClientStateMachine(new Transport(config, base));
}

describe('Http', function () {
  var fakeHost = "__fake_host__";
  var fakeApiVersion = "__fake_api_version__";
  var fakeAgent = "__fake_agent__";
  var fakeErrorString = "__fake_error__";
  var fakeScope = '__scope__';
  var fakeRegistrationId = '__registrationId__';
  var fakeAuthorization = '__authorization__';
  var fakeOperationId = "__operation_id__";
  var fakeBody = JSON.stringify({
    'fake' : 'yep'
  });
  var fakeConfig = {
    idScope: fakeScope,
    userAgent: fakeAgent,
    pollingInterval: 2000,
    provisioningHost: fakeHost,
    apiVersion: fakeApiVersion,
    timeoutInterval: 4000
  };

  var fakeRequest = {
    setTimeout: sinon.spy(),
    write:  sinon.spy(),
    end: sinon.spy(),
    abort: sinon.spy()
  };

  this.timeout(100);
  var http;

  beforeEach(function() {
    fakeConfig.pollingInterval = 1;

  });

  describe('register', function() {
    it ('builds the http request correctly', function(testCallback) {
      var fakeBase = {};
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        /* Tests_SRS_NODE_PROVISIONING_HTTP_18_006: [ The registration request shall specify the following in the Http header:
          Accept: application/json
          Content-Type: application/json; charset=utf-8 ] */
        assert.equal(httpHeaders['Accept'], 'application/json');
        assert.equal(httpHeaders['Content-Type'], 'application/json; charset=utf-8')

        /* Tests_SRS_NODE_PROVISIONING_HTTP_18_007: [ If an `authorization` string is specifed, it shall be URL encoded and included in the Http Authorization header. ] */
        assert.equal(httpHeaders['Authorization'], fakeAuthorization);

        /* Tests_SRS_NODE_PROVISIONING_HTTP_18_009: [ `register` shall PUT the registration request to 'https://global.azure-devices-provisioning.net/{idScope}/registrations/{registrationId}/register' ] */
        /* Tests_SRS_NODE_PROVISIONING_HTTP_18_005: [ The registration request shall include the current `api-version` as a URL query string value named 'api-version'. ] */
        /* Tests_SRS_NODE_PROVISIONING_HTTP_18_008: [ If `forceRegistration` is specified, the registration request shall include this as a query string value named 'forceRegistration' ] */
        assert.equal(method, 'PUT');
        assert.equal(host, fakeHost);
        assert.equal(path, '/' + fakeScope + '/registrations/' + fakeRegistrationId + '/register?api-version=' + fakeApiVersion + '&forceRegistration=true');

        done(null, '{"status" : "Assigned" }');

        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        assert.equal(null, err);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_036: [ `register` shall call the `callback` with an `InvalidOperationError` if it is called while a previous registration is in progress. ] */
    it ('fails if a registration is in progress', function(testCallback) {
      var fakeBase = {};
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        // do not call done.  do not pass go.  do not collect $200.
        return fakeRequest;
      };
      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        // should never complete because the above request function never calls done
        assert.fail();
      });

      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true,  function(err, result) {
        assert.instanceOf(err, errors.InvalidOperationError);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_011: [ If the registration request times out, `register` shall call the `callback` with the lower level error ] */
    it ('fails on timeout', function(testCallback) {
      var fakeBase = {};
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        done(new Error(fakeErrorString));
        return fakeRequest;
      };
      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        assert.equal(fakeErrorString, err.message);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_031: [ If `disconnect` is called while the registration request is in progress, `register` shall call the `callback` with an `OperationCancelledError` error. ] */
    it ('fails if disconnected while registration request is in progress', function(testCallback) {
      var fakeBase = {};
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        assert.instanceOf(err, errors.OperationCancelledError);
        testCallback();
      });

      http.endSession(function() {});
    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_013: [ If registration response body fails to deserialize, `register` will throw an `SyntaxError` error. ] */
    it ('throws if PUT response body fails to parse', function(testCallback) {
      var fakeBase = {};
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        assert.throws( function() {
          done(null, '}body that fails to parse{');
        }, SyntaxError);
        testCallback();
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        // register should not complete because of assertion above
        assert.fail();
      });

    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_014: [ If the registration response has a failed status code, `register` shall use `translateError` to translate this to a common error object and pass this into the `callback` function along with the deserialized body of the response. ] */
    it ('fails correctly if the PUT response fails', function(testCallback) {
      var fakeBase = {};
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        done(new Error(), '{}');
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        assert.instanceOf(err, Error);
        testCallback();
      });

    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_012: [ If the registration response contains a body, `register` shall deserialize this into an object. ] */
    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_015: [ If the registration response has a success code with a 'status' of 'Assigned', `register` call the `callback` with `err` == `null` and result `containing` the deserialized body ] */
    it ('completes if the PUT response is Assigned', function(testCallback) {
      var fakeBase = {};
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        done(null, '{"status" : "Assigned" }');
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, responseBody) {
        assert.isNull(err);
        assert.equal('Assigned', responseBody.status);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_029: [ If the registration response has a success code with a 'status' that is any other value', `register` shall call the callback with a `SyntaxError` error. ] */
    it ('fails on unknown status response', function(testCallback) {
      var fakeBase = {};
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        done(null, '{"status" : "Cheetoes" }');
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        assert.instanceOf(err, SyntaxError);
        testCallback();
      });
    });


    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_016: [ If the registration response has a success code with a 'status' of 'Assigning', `register` shall fire an `operationStatus` event with the deserialized body ] */
    it ('fires an operationStatus event if the PUT response is Assigning', function(testCallback) {
      var fakeBase = {};
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        done(null, '{"status" : "Assigning" }');
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.on('operationStatus', function(responseBody) {
        assert.equal('Assigning', responseBody.status);
        process.nextTick(function() {
          http.endSession(function() {
            testCallback();
          });
        });
      });
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_017: [ If the registration response has a success code wit.skiph a 'status' of 'Assigning', `register` shall start polling for operation updates ] */
    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_018: [ `register` shall poll for operation status every `operationStatusPollingInterval` milliseconds ] */
    it ('uses the right headers for operation status request', function(testCallback) {
      var fakeBase = {};
      var callbackCount = 0;
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        callbackCount++;
        if (callbackCount === 1) {
          done(null, '{"status" : "Assigning", "operationId" : "' + fakeOperationId + '"}');
        } else {
          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_020: [ The operation status request shall have the following in the Http header:
            Accept: application/json
            Content-Type: application/json; charset=utf-8 ] */
          assert.equal(httpHeaders['Accept'], 'application/json');
          assert.equal(httpHeaders['Content-Type'], 'application/json; charset=utf-8')

          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_021: [ If an `authorization` string is specifed, it shall be URL encoded and included in the Http Authorization header of the operation status request. ] */
          assert.equal(httpHeaders['Authorization'], fakeAuthorization);

          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_037: [ The operation status request shall include the current `api-version` as a URL query string value named 'api-version'. ] */
          /* Tests_SRS_NODE_PROVISIONING_HTTP_18_022: [ operation status request polling shall be a GET operation sent to 'https://global.azure-devices-provisioning.net/{idScope}/registrations/{registrationId}/operations/{operationId}' ] */
          assert.equal(method, 'GET');
          assert.equal(host, fakeHost)
          assert.equal(path, '/' + fakeScope + '/registrations/' + fakeRegistrationId + '/operations/' + fakeOperationId + '?api-version=' + fakeApiVersion);

          process.nextTick(function() {
            http.endSession(function() {
              testCallback();
            });
          });

        }
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
      });

    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_032: [ If `disconnect` is called while the operation status request is in progress, `register` shall call the `callback` with an `OperationCancelledError` error. ] */
    it ('fails with cancel during operation status request', function(testCallback) {
      var fakeBase = {};
      var callbackCount = 0;

      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        callbackCount++;
        if (callbackCount === 1) {
          done(null, '{"status" : "Assigning", "operationId" : "' + fakeOperationId + '"}');
        } else {
          // Do not call done.  This makes it look like the HTTP request is outstanding.
          process.nextTick(function() {
            http.endSession(function() {});
          });
        }
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        assert.instanceOf(err, errors.OperationCancelledError);
        testCallback();
      });

    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_033: [ If `disconnect` is called while the register is waiting between polls, `register` shall call the `callback` with an `OperationCancelledError` error. ] */
    it ('fails with cancel between polls', function(testCallback) {
      var fakeBase = {};
      var callbackCount = 0;
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        callbackCount++;
        if (callbackCount === 1) {
          fakeConfig.pollingInterval = 2000;
          setTimeout(function() {
            http.endSession(function() {});
          }, 10);
          done(null, '{"status" : "Assigning", "operationId" : "' + fakeOperationId + '"}');
        } else {
          assert.fail('operation status should not be sent because of cancellation');
        }
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        assert.instanceOf(err, errors.OperationCancelledError);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_036: [ `register` shall call the `callback` with an `InvalidOperationError` if it is called while a previous registration is in progress. ] */
    it ('fails if called while previous registration is waiting to poll', function(testCallback) {
      var fakeBase = {};
      var callbackCount = 0;
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        callbackCount++;
        if (callbackCount === 1) {
          fakeConfig.pollingInterval = 2000;
          setTimeout(function() {
            http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
              assert.instanceOf(err, errors.InvalidOperationError);
              testCallback();
            });
          }, 10);
          done(null, '{"status" : "Assigning", "operationId" : "' + fakeOperationId + '"}');
        }
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
      });
    });

      /* Tests_SRS_NODE_PROVISIONING_HTTP_18_036: [ `register` shall call the `callback` with an `InvalidOperationError` if it is called while a previous registration is in progress. ] */
      it ('fails if called while previous registration is querying status', function(testCallback) {
        var fakeBase = {};
        var callbackCount = 0;
        fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
          callbackCount++;
          if (callbackCount === 1) {
            done(null, '{"status" : "Assigning", "operationId" : "' + fakeOperationId + '"}');
          } else {
            setTimeout(function() {
              http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
                assert.instanceOf(err, errors.InvalidOperationError);
                testCallback();
              });
            }, 10);
            // Do not call done.
          }
          return fakeRequest;
        };

        var http = new Http(fakeConfig, fakeBase);
        http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        });
      });



    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_023: [ If the operation status request times out, `register` shall stop polling and call the `callback` with with the lower level error. ] */
    it ('failes on operation status timeout', function(testCallback) {
      var fakeBase = {};
      var callbackCount = 0;
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        callbackCount++;
        if (callbackCount === 1) {
          done(null, '{"status" : "Assigning", "operationId" : "' + fakeOperationId + '"}');
        } else {
          done(new SyntaxError('__FAKE_ERROR__'));
        }
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        assert.instanceOf(err, SyntaxError);
        assert.equal('__FAKE_ERROR__', err.message)
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_025: [ If the body of the operation status response fails to deserialize, `register` will throw a `SyntaxError` error. ] */
    it ('returns error for bad operation status JSON', function(testCallback) {
      var fakeBase = {};
      var callbackCount = 0;
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        callbackCount++;
        if (callbackCount === 1) {
          done(null, '{"status" : "Assigning", "operationId" : "' + fakeOperationId + '"}');
        } else {
          assert.throws( function() {
            done(null, '}body that fails to parse{');
          }, SyntaxError);
          testCallback();
        }
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        });
    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_026: [ If the operation status response contains a failure status code, `register` shall stop polling and call the `callback` with an error created using `translateError`. ] */
    it ('returns error on operation status HTTP error',function(testCallback) {
      var fakeBase = {};
      var callbackCount = 0;
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        callbackCount++;
        if (callbackCount === 1) {
          done(null, '{"status" : "Assigning", "operationId" : "' + fakeOperationId + '"}');
        } else {
          done(new Error(), '', {'statusCode' : 400});
        }
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        assert.instanceOf(err, errors.ArgumentError);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_024: [ `register` shall deserialize the body of the operation status response into an object. ] */
    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_027: [ If the operation status response contains a success status code with a 'status' of 'Assigned', `register` shall stop polling and call the `callback` with `err` == null and the body containing the deserialized body. ] */
    it ('stops polling when status is assinged', function(testCallback) {
      var fakeBase = {};
      var callbackCount = 0;
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        callbackCount++;
        if (callbackCount === 1) {
          done(null, '{"status" : "Assigning", "operationId" : "' + fakeOperationId + '"}');
        } else {
          done(null, '{"status" : "Assigned", "value" : 10}');
        }
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        assert.isNull(err);
        assert.equal("Assigned", result.status);
        assert.equal(10, result.value);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_028: [ If the operation status response contains a success status code with a 'status' that is 'Assigning', `register` shall fire an `operationStatus` event with the deserialized body and continue polling. ] */
    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_035: [ disconnect will cause polling to cease ] */
    it ('fires an operationStatus on operation status response', function(testCallback) {
      var fakeBase = {};
      var callbackCount = 0;
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        callbackCount++;
        if (callbackCount === 1) {
          done(null, '{"status" : "Assigning", "operationId" : "' + fakeOperationId + '"}');
        } else {
          done(null, '{"status" : "Assigning", "operationId" : "' + fakeOperationId + '", "iteration" : ' + callbackCount + '}');
        }
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      var eventReceived = false;
      http.on('operationStatus', function(eventBody) {
        assert.equal("Assigning",eventBody.status);
        if (eventBody.iteration === 2) {
          eventReceived = true;
          process.nextTick(function() {
            http.endSession(function() {});
          });
        };
      });

      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        assert.isTrue(eventReceived);
        assert.instanceOf(err, errors.OperationCancelledError);
        testCallback();
      });
    });

    /* Tests_SRS_NODE_PROVISIONING_HTTP_18_030: [ If the operation status response has a success code with a 'status' that is any other value, `register` shall call the callback with a `SyntaxError` error and stop polling. ] */
    it ('returns an error on invalid status value', function(testCallback) {
      var fakeBase = {};
      var callbackCount = 0;
      fakeBase.buildRequest = function(method, path, httpHeaders, host, done) {
        callbackCount++;
        if (callbackCount === 1) {
          done(null, '{"status" : "Assigning", "operationId" : "' + fakeOperationId + '"}');
        } else {
          done(null, '{"status" : "crabalocker fishwife" }');
        }
        return fakeRequest;
      };

      var http = new Http(fakeConfig, fakeBase);
      http.register(fakeRegistrationId, fakeAuthorization, fakeBody, true, function(err, result) {
        assert.instanceOf(err, SyntaxError);
        testCallback();
      });
    });
  });

  describe('disconnect', function() {
    it ('does nothing if disconnect is called while disconnected', function(testCallback) {
      var http = new Http(null);
      http.endSession(function(err) {
        assert.isTrue(!err);
        testCallback();
      });
    });
  });

});
