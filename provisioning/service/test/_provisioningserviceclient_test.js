// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

"use strict";

var assert = require('chai').assert;
var errors = require('azure-iot-common').errors;
var ProvisioningServiceClient = require('../lib/provisioningserviceclient.js').ProvisioningServiceClient;
var encodeURIComponentStrict = require('azure-iot-common').encodeUriComponentStrict;

var fakeRegistrationId = 'fakeId';
var fakeDeviceId = 'sample-device';
var fakeEnrollment = {
  registrationId: fakeRegistrationId,
  deviceId: fakeDeviceId,
  etag: 'etag',
  attestation: {
    type: 'tpm',
    tpm: {
      endorsementKey: 'endorsementkey'
    }
  },
  initialTwinState: null,
  capabilities: {
    iotEdge: false
  }
};

var fakeEnrollmentNoEtag = {
  registrationId: fakeRegistrationId,
  deviceId: fakeDeviceId,
  attestation: {
    type: 'tpm',
    tpm: {
      endorsementKey: 'endorsementkey'
    }
  },
  initialTwinState: null
};

var fakeGroupId = 'fakeGroup';
var fakeEnrollmentGroup = {
  enrollmentGroupId: fakeGroupId,
  etag: 'etag'
};

var fakeEnrollmentGroupNoEtag = {
  enrollmentGroupId: fakeGroupId,
};

var fakeRegistration = {
  registrationId: 'fakeId',
  etag: 'etag'
};

var fakeRegistrationNoEtag = {
  registrationId: 'fakeId'
};

function _versionQueryString() {
  return '?api-version=2018-11-01';
}


function testFalsyArg(methodUnderTest, argName, argValue, ExpectedErrorType) {
  var errorName = ExpectedErrorType ? ExpectedErrorType.name : 'Error';
  it('Throws a ' + errorName + ' if \'' + argName + '\' is \'' + JSON.stringify(argValue) + '\' (type:' + typeof (argValue) + ')', function () {
    var de = new ProvisioningServiceClient({
      host: 'host',
      sharedAccessSignature: 'sas'
    });
    assert.throws(function () {
      de[methodUnderTest](argValue, function () {});
    }, ExpectedErrorType);
  });
}

function testErrorCallback(methodUnderTest, arg1, arg2, arg3) {
  /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_037: [When any registry operation method receives an HTTP response with a status code >= 300, it shall invoke the `done` callback function with an error translated using the requirements detailed in `registry_http_errors_requirements.md`] */
  it('Calls the done callback with a proper error if an HTTP error occurs', function (testCallback) {
    var FakeHttpErrorHelper = {
      executeApiCall: function (method, path, httpHeaders, body, done) {
        done(new errors.DeviceNotFoundError('Not found'));
      }
    };

    var de = new ProvisioningServiceClient({
      host: 'host',
      sharedAccessSignature: 'sas'
    }, FakeHttpErrorHelper);
    var callback = function (err, result, response) {
      assert.instanceOf(err, errors.DeviceNotFoundError);
      assert.isUndefined(result);
      assert.isUndefined(response);
      testCallback();
    };

    if (arg1 && arg2 && arg3) {
      de[methodUnderTest](arg1, arg2, arg3, callback);
    } else if (arg1 && arg2) {
      de[methodUnderTest](arg1, arg2, callback);
    } else if (arg1 && !arg2) {
      de[methodUnderTest](arg1, callback);
    } else {
      de[methodUnderTest](callback);
    }
  });

  /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_036: [If any device enrollment operation method encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript `Error` object with a text description of the error (err.message).] */
  it('Calls the done callback with a standard error if not an HTTP error', function (testCallback) {
    var FakeGenericErrorHelper = {
      executeApiCall: function (method, path, httpHeaders, body, done) {
        done(new Error('Fake Error'));
      }
    };

    var de = new ProvisioningServiceClient({
      host: 'host',
      sharedAccessSignature: 'sas'
    }, FakeGenericErrorHelper);
    var callback = function (err, result, response) {
      assert.instanceOf(err, Error);
      assert.isUndefined(result);
      assert.isUndefined(response);
      testCallback();
    };

    if (arg1 && arg2 && arg3) {
      de[methodUnderTest](arg1, arg2, arg3, callback);
    } else if (arg1 && arg2) {
      de[methodUnderTest](arg1, arg2, callback);
    } else if (arg1 && !arg2) {
      de[methodUnderTest](arg1, callback);
    } else {
      de[methodUnderTest](callback);
    }
  });
}

describe('ProvisioningServiceClient', function () {
  describe('#constructor', function () {
    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_001: [The `ProvisioningServiceClient` construction shall throw a `ReferenceError` if the `config` object is falsy.] */
    [undefined, null].forEach(function (badConfig) {
      it('Throws if \'config\' is \'' + badConfig + '\'', function () {
        assert.throws(function () {
          return new ProvisioningServiceClient(badConfig);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_002: [The `ProvisioningServiceClient` constructor shall throw an `ArgumentError` if the `config` object is missing one or more of the following properties:
                                                          - `host`: the IoT Hub hostname
                                                          - `sharedAccessSignature`: shared access signature with the permissions for the desired operations.] */

    [undefined, null, ''].forEach(function (badConfigProperty) {
      it('Throws if \'config.host\' is \'' + badConfigProperty + '\'', function () {
        assert.throws(function () {
          return new ProvisioningServiceClient({
            host: badConfigProperty,
            sharedAccessSignature: 'sharedAccessSignature'
          });
        }, errors.ArgumentError);
      });

      it('Throws if \'config.sharedAccessSignature\' is \'' + badConfigProperty + '\'', function () {
        assert.throws(function () {
          return new ProvisioningServiceClient({
            host: 'host',
            sharedAccessSignature: badConfigProperty
          });
        }, errors.ArgumentError);
      });
    });

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_003: [The `ProvisioningServiceClient` constructor shall use the `restApiClient` provided as a second argument if it is provided.] */
    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_004: [The `ProvisioningServiceClient` constructor shall use `azure-iot-http-base.RestApiClient` if no `restApiClient` argument is provided.] */
  });

  describe('#fromConnectionString', function () {
    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_005: [** The `fromConnectionString` method shall throw `ReferenceError` if the `value` argument is falsy. **]*/
    [undefined, null, ''].forEach(function (falsyConnectionString) {
      it('Throws if \'value\' is \'' + falsyConnectionString + '\'', function () {
        assert.throws(function () {
          return ProvisioningServiceClient.fromConnectionString(falsyConnectionString);
        }, ReferenceError);
      });
    });

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_006: [`fromConnectionString` method shall derive and transform the needed parts from the connection string in order to create a `config` object for the constructor (see `SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_002`).  **] */
    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_007: [The `fromConnectionString` method shall return a new instance of the `ProvisioningServiceClient` object.] */
    it('Returns a new instance of the ProvisioningServiceClient object', function () {
      var de = ProvisioningServiceClient.fromConnectionString('HostName=a.b.c;SharedAccessKeyName=name;SharedAccessKey=key');
      assert.instanceOf(de, ProvisioningServiceClient);
    });
  });

  describe('#createOrUpdateIndividualEnrollment', function () {

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_009: [The `createOrUpdateIndividualEnrollment` method shall throw `ReferenceError` if the `enrollment` argument is falsy.]*/
    [undefined, null].forEach(function (falsyEnrollment) {
      testFalsyArg('createOrUpdateIndividualEnrollment', 'enrollment', falsyEnrollment, ReferenceError);
    });

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_011: [The `createOrUpdateIndividualEnrollment` method shall throw `ArgumentError` if the `enrollment.registrationId` property is falsy.] */
    [undefined, null].forEach(function (badRegistrationId) {
      var badEnrollment = {};
      badEnrollment.registrationId = badRegistrationId;
      testFalsyArg('createOrUpdateIndividualEnrollment', 'enrollment', badEnrollment, errors.ArgumentError);
    });

    testErrorCallback('createOrUpdateIndividualEnrollment', fakeEnrollmentNoEtag);

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_010: [** The `createOrUpdateIndividualEnrollment` method shall construct an HTTP request using information supplied by the caller, as follows:
    PUT /enrollments/<uri-encoded-enrollment.registrationId>?api-version=<version> HTTP/1.1
    Authorization: <sharedAccessSignature>
    Accept: application/json
    Content-Type: application/json; charset=utf-8

    <stringified json string of the enrollment argument>
    ] */

    it('Constructs a valid HTTP request', function (testCallback) {
      var fakeHttpHelper = {
        executeApiCall: function (method, path, httpHeaders, body, done) {
          assert.equal(method, 'PUT');
          assert.equal(path, '/enrollments/' + encodeURIComponent(fakeRegistrationId) + _versionQueryString());
          assert.equal(httpHeaders['Content-Type'], 'application/json; charset=utf-8');
          assert.equal(httpHeaders['Accept'], 'application/json');
          assert.equal(Object.keys(httpHeaders).length, 2, 'Should be only two headers');
          assert.deepEqual(body, fakeEnrollmentNoEtag);

          done();
        }
      };

      var de = new ProvisioningServiceClient({
        host: 'host',
        sharedAccessSignature: 'sas'
      }, fakeHttpHelper);
      de.createOrUpdateIndividualEnrollment(fakeEnrollmentNoEtag, testCallback);
    });

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_056: [If the `enrollment` object contains an `etag` property it will be added as the value of the `If-Match` header of the http request.] */
    it('Add If-Match if etag property present', function (testCallback) {
      var fakeHttpHelper = {
        executeApiCall: function (method, path, httpHeaders, body, done) {
          assert.equal(method, 'PUT');
          assert.equal(path, '/enrollments/' + encodeURIComponent(fakeRegistrationId) + _versionQueryString());
          assert.equal(httpHeaders['Content-Type'], 'application/json; charset=utf-8');
          assert.equal(httpHeaders['Accept'], 'application/json');
          assert.equal(httpHeaders['If-Match'], 'etag');
          assert.equal(Object.keys(httpHeaders).length, 3, 'Should be only three headers');
          assert.deepEqual(body, fakeEnrollment);

          done();
        }
      };

      var de = new ProvisioningServiceClient({
        host: 'host',
        sharedAccessSignature: 'sas'
      }, fakeHttpHelper);
      de.createOrUpdateIndividualEnrollment(fakeEnrollment, testCallback);
    });


  });

  describe('#createOrUpdateEnrollmentGroup', function () {
    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_012: [The `createOrUpdateEnrollmentGroup` method shall throw `ReferenceError` if the `EnrollmentGroup` argument is falsy.] */
    [undefined, null].forEach(function (falsyEnrollmentGroup) {
      testFalsyArg('createOrUpdateEnrollmentGroup', 'enrollmentGroup', falsyEnrollmentGroup, ReferenceError);
    });

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_013: [`createOrUpdateEnrollmentGroup` method shall throw `ArgumentError` if the `enrollmentGroup.enrollmentGroupsId` property is falsy.] */
    [undefined, null].forEach(function (badGroupId) {
      var badEnrollmentGroup = {};
      badEnrollmentGroup.enrollmentGroupId = badGroupId;
      testFalsyArg('createOrUpdateEnrollmentGroup', 'enrollmentGroup', badEnrollmentGroup, errors.ArgumentError);
    });

    testErrorCallback('createOrUpdateEnrollmentGroup', fakeEnrollmentGroupNoEtag);

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_014: [The `createOrUpdateEnrollmentGroup` method shall construct an HTTP request using information supplied by the caller, as follows:
      PUT /enrollmentGroups/<uri-encoded-enrollmentGroup.enrollmentGroupsId>?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Accept: application/json
      Content-Type: application/json; charset=utf-8

      <stringified json string of the enrollmentGroup argument>
      ] */
    it('Constructs a valid HTTP request', function (testCallback) {
      var fakeHttpHelper = {
        executeApiCall: function (method, path, httpHeaders, body, done) {
          assert.equal(method, 'PUT');
          assert.equal(path, '/enrollmentGroups/' + encodeURIComponent(fakeGroupId) + _versionQueryString());
          assert.equal(httpHeaders['Content-Type'], 'application/json; charset=utf-8');
          assert.equal(httpHeaders['Accept'], 'application/json');
          assert.equal(Object.keys(httpHeaders).length, 2, 'Should be only two headers');
          assert.deepEqual(body, fakeEnrollmentGroupNoEtag);

          done();
        }
      };

      var de = new ProvisioningServiceClient({
        host: 'host',
        sharedAccessSignature: 'sas'
      }, fakeHttpHelper);
      de.createOrUpdateEnrollmentGroup(fakeEnrollmentGroupNoEtag, testCallback);
    });

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_055: [If the `enrollmentGroup` object contains an `etag` property it will be added as the value of the `If-Match` header of the http request.] */
    it('Add If-Match if etag property present', function (testCallback) {
      var fakeHttpHelper = {
        executeApiCall: function (method, path, httpHeaders, body, done) {
          assert.equal(method, 'PUT');
          assert.equal(path, '/enrollmentGroups/' + encodeURIComponent(fakeGroupId) + _versionQueryString());
          assert.equal(httpHeaders['Content-Type'], 'application/json; charset=utf-8');
          assert.equal(httpHeaders['Accept'], 'application/json');
          assert.equal(httpHeaders['If-Match'], 'etag');
          assert.equal(Object.keys(httpHeaders).length, 3, 'Should be only three headers');
          assert.deepEqual(body, fakeEnrollmentGroup);

          done();
        }
      };

      var de = new ProvisioningServiceClient({
        host: 'host',
        sharedAccessSignature: 'sas'
      }, fakeHttpHelper);
      de.createOrUpdateEnrollmentGroup(fakeEnrollmentGroup, testCallback);
    });

  });

  function testDeleteAPI(methodUnderTest, uriPath, falsyArgArgumentName, firstArgumentObject, firstArgumentObjectNoEtag, firstArgumentObjectIdPropertyName) {

    describe('#' + methodUnderTest, function () {
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_015: [The `deleteIndividualEnrollment` method shall throw `ReferenceError` if the `enrollmentOrId` argument is falsy.] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_016: [The `deleteEnrollmentGroup` method shall throw `ReferenceError` if the `enrollmentGroupOrId` argument is falsy.] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_025: [The `deleteDeviceRegistrationState` method shall throw `ReferenceError` if the `idOrRegistrationState` argument is falsy.] */
      [undefined, null, 0, false].forEach(function (invalidFirstArgument) {
        testFalsyArg(methodUnderTest, falsyArgArgumentName, invalidFirstArgument, ReferenceError);
      });

      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_040: [The `deleteIndividualEnrollment` method, if the first argument is a string, the second argument if present, must be a string or a callback, otherwise shall throw `ArgumentError`.] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_045: [The `deleteEnrollmentGroup` method, if the first argument is a string, the second argument if present, must be a string or a callback, otherwise shall throw `ArgumentError`.] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_050: [The `deleteDeviceRegistrationState` method, if the first argument is a string, the second argument if present, must be a string or a callback, otherwise shall throw `ArgumentError`.] */
      it('Throws argument error if second parameter is wrong type when using a string as first argument', function () {
        var de = new ProvisioningServiceClient({
          host: 'host',
          sharedAccessSignature: 'sas'
        });
        assert.throws(function () {
          de[methodUnderTest]('fake-registration', 1, function () {});
        }, errors.ArgumentError);
      });

      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_041: [The `deleteIndividualEnrollment` method, if the first argument is a string and the second argument is a string, the third argument if present, must be a callback, otherwise shall throw `ArgumentError`.] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_046: [The `deleteEnrollmentGroup` method, if the first argument is a string and the second argument is a string, the third argument if present, must be a callback, otherwise shall throw `ArgumentError`.] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_051: [The `deleteDeviceRegistrationState` method, if the first argument is a string and the second argument is a string, the third argument if present, must be a callback, otherwise shall throw `ArgumentError`.] */
      it('Throws argument error if third parameter is wrong type when using a string first argument and etag', function () {
        var de = new ProvisioningServiceClient({
          host: 'host',
          sharedAccessSignature: 'sas'
        });
        assert.throws(function () {
          de[methodUnderTest]('fake-registration', 'etag', 'not the correct type');
        }, errors.ArgumentError);
      });

      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_042: [The `deleteIndividualEnrollment` method, if the first argument is an IndividualEnrollment object, the second argument if present, must be a callback, otherwise shall return a Promise.] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_047: [The `deleteEnrollmentGroup` method, if the first argument is an EnrollmentGroup object, the second argument if present, must be a callback, otherwise shall return a Promise.] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_052: [The `deleteDeviceRegistrationState` method, if the first argument is an `DeviceRegistrationState` object, the second argument if present, must be a callback, otherwise shall return a Promise.] */
      it('Returns a promise if first parameter is an object and second parameter is NOT a callback', function (done) {
        var fakeHttpHelper = {
          executeApiCall: function (method, path, httpHeaders, body, done) {
            done();
          }
        };

        var de = new ProvisioningServiceClient({
          host: 'host',
          sharedAccessSignature: 'sas'
        }, fakeHttpHelper);
        const promise = de[methodUnderTest](firstArgumentObjectNoEtag, 'etag');

        assert.instanceOf(promise, Promise)
        promise.then((result) => {
          done()
        }).catch(err => {
          done(err)
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_017: [The `deleteIndividualEnrollment` method, if the first argument is an `IndividualEnrollment` object, shall throw an `ArgumentError`, if the `registrationId` property is falsy.] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_018: [The `deleteEnrollmentGroup` method, if the first argument is an `EnrollmentGroup` object, shall throw an `ArgumentError`, if the `enrollmentGroupId' property is falsy.] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_026: [The `deleteDeviceRegistrationState` method, if the first argument is a `DeviceRegistrationState` object, shall throw an `ArgumentError`, if the `registrationId' property is falsy.] */
      [undefined, null].forEach(function (badId) {
        var badObject = {};
        badObject[firstArgumentObjectIdPropertyName] = badId;
        testFalsyArg(methodUnderTest, falsyArgArgumentName, badObject, errors.ArgumentError);
      });

      testErrorCallback(methodUnderTest, firstArgumentObject);

      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_043: [** The `deleteIndividualEnrollment` method, if the first argument is a string, and the second argument is NOT a string, shall construct an HTTP request using information supplied by the caller as follows:
        DELETE /enrollments/<uri-encoded-enrollmentOrId>?api-version=<version> HTTP/1.1
        Authorization: <sharedAccessSignature>
        ] */
      it('Constructs a valid HTTP request for a STRING first parameter with NO etag', function (testCallback) {
        var stringIdName = 'fake-enrollment';
        var fakeHttpHelper = {
          executeApiCall: function (method, path, httpHeaders, body, done) {
            assert.equal(method, 'DELETE');
            assert.equal(path, uriPath + encodeURIComponent(stringIdName) + _versionQueryString());
            assert.equal(body, null);
            done();
          }
        };
        var de = new ProvisioningServiceClient({
          host: 'host',
          sharedAccessSignature: 'sas'
        }, fakeHttpHelper);
        de[methodUnderTest](stringIdName, testCallback);
      });

      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_044: [** The `deleteIndividualEnrollment` method, if the first argument is a string, and the second argument is a string, shall construct an HTTP request using information supplied by the caller as follows:
        DELETE /enrollments/<uri-encoded-enrollmentOrId>?api-version=<version> HTTP/1.1
        If-Match: <second argument>
        Authorization: <sharedAccessSignature>
        ] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_048: [** The `deleteEnrollmentGroup` method, if the first argument is a string, and the second argument is NOT a string, shall construct an HTTP request using information supplied by the caller as follows:
        DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId>?api-version=<version> HTTP/1.1
        Authorization: <sharedAccessSignature>
        ] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_053: [** The `deleteDeviceRegistrationState` method, if the first argument is a string, and the second argument is NOT a string, shall construct an HTTP request using information supplied by the caller as follows:
        DELETE /registrations/<uri-encoded-idOrRegistrationState>?api-version=<version> HTTP/1.1
        Authorization: <sharedAccessSignature>
        ] */
      it('Constructs a valid HTTP request for a STRING first parameter and a STRING second parameter', function (testCallback) {
        var stringIdName = 'fake-enrollment';
        var etag = 'etag';
        var fakeHttpHelper = {
          executeApiCall: function (method, path, httpHeaders, body, done) {
            assert.equal(method, 'DELETE');
            assert.equal(path, uriPath + encodeURIComponent(stringIdName) + _versionQueryString());
            assert.deepEqual(httpHeaders, {
              'If-Match': etag
            });
            assert.equal(Object.keys(httpHeaders).length, 1, 'Should be only one header');
            assert.equal(body, null);
            done();
          }
        };
        var de = new ProvisioningServiceClient({
          host: 'host',
          sharedAccessSignature: 'sas'
        }, fakeHttpHelper);
        de[methodUnderTest](stringIdName, etag, testCallback);
      });

      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_021: [The `deleteIndividualEnrollment` method, if the first argument is an `IndividualEnrollment` object, with a non-falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
        DELETE /enrollments/<uri-encoded-enrollmentOrId.registrationId>?api-version=<version> HTTP/1.1
        If-Match: enrollmentOrId.etag
        Authorization: <sharedAccessSignature>
        ] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_022: [The `deleteEnrollmentGroup` method, if the first argument is an `EnrollmentGroup` object, with a non-falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
        DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId.enrollmentGroupId>?api-version=<version> HTTP/1.1
        If-Match: enrollmentParameter.etag
        Authorization: <sharedAccessSignature>
        ] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_028: [** The `deleteDeviceRegistrationState` method, if the first argument is a `DeviceRegistrationState` object, with a non-falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
        DELETE /registrations/<uri-encoded-idOrRegistrationState.registrationId>?api-version=<version> HTTP/1.1
        If-Match: idOrRegistrationState.etag
        Authorization: <sharedAccessSignature>
        ] */
      it('constructs a valid HTTP request for ' + falsyArgArgumentName + ' parameter with etag', function (testCallback) {
        var fakeHttpHelper = {
          executeApiCall: function (method, path, httpHeaders, body, done) {
            assert.equal(method, 'DELETE');
            assert.equal(path, uriPath + encodeURIComponent(firstArgumentObject[firstArgumentObjectIdPropertyName]) + _versionQueryString());
            assert.deepEqual(httpHeaders, {
              'If-Match': firstArgumentObject.etag
            });
            assert.equal(Object.keys(httpHeaders).length, 1, 'Should be only one header');
            assert.equal(body, null);
            done();
          }
        };

        var de = new ProvisioningServiceClient({
          host: 'host',
          sharedAccessSignature: 'sas'
        }, fakeHttpHelper);
        de[methodUnderTest](firstArgumentObject, undefined, () => {
          testCallback();
        });
      });

      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_024: [The `deleteIndividualEnrollment` method, if the first argument is an `IndividualEnrollment` object, with a falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
        DELETE /enrollments/<uri-encoded-enrollmentParameter.registrationId>?api-version=<version> HTTP/1.1
        Authorization: <sharedAccessSignature>
        ] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_023: [The `deleteEnrollmentGroup` method, if the first argument is an `EnrollmentGroup` object, with a falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
        DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId.enrollmentGroupId>?api-version=<version> HTTP/1.1
        Authorization: <sharedAccessSignature>
        ] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_029: [** The `deleteDeviceRegistrationState` method, if the first argument is a `DeviceRegistrationState` object, with a falsy `etag` property, shall construct an HTTP request using information supplied by the caller as follows:
        DELETE /registrations/<uri-encoded-idOrRegistrationState.registrationId>?api-version=<version> HTTP/1.1
        Authorization: <sharedAccessSignature>
        ] */
      it('constructs a valid HTTP request for ' + falsyArgArgumentName + ' parameter without etag', function (testCallback) {
        var fakeHttpHelper = {
          executeApiCall: function (method, path, httpHeaders, body, done) {
            assert.equal(method, 'DELETE');
            assert.equal(path, uriPath + encodeURIComponent(firstArgumentObjectNoEtag[firstArgumentObjectIdPropertyName]) + _versionQueryString());
            assert.equal(Object.keys(httpHeaders).length, 0, 'Should be zero headers');
            assert.equal(body, null);
            done();
          }
        };

        var de = new ProvisioningServiceClient({
          host: 'host',
          sharedAccessSignature: 'sas'
        }, fakeHttpHelper);
        de[methodUnderTest](firstArgumentObjectNoEtag, testCallback);
      });
    });
  }

  testDeleteAPI('deleteIndividualEnrollment', '/enrollments/', 'enrollment', fakeEnrollment, fakeEnrollmentNoEtag, 'registrationId');
  testDeleteAPI('deleteEnrollmentGroup', '/enrollmentGroups/', 'enrollmentGroup', fakeEnrollmentGroup, fakeEnrollmentGroupNoEtag, 'enrollmentGroupId');
  testDeleteAPI('deleteDeviceRegistrationState', '/registrations/', 'registrationState', fakeRegistration, fakeRegistrationNoEtag, 'registrationId');

  function testGetAPI(methodUnderTest, uriPath) {

    describe('#' + methodUnderTest, function () {
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_030: [The `getIndividualEnrollment` method shall throw `ReferenceError` if the `id` argument is falsy.] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_031: [The `getEnrollmentGroup` method shall throw `ReferenceError` if the `id` argument is falsy.] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_032: [The `getDeviceRegistrationState` method shall throw `ReferenceError` if the `id` argument is falsy.] */
      [undefined, null, 0, false].forEach(function (id) {
        testFalsyArg(methodUnderTest, 'id', id, ReferenceError);
      });

      testErrorCallback(methodUnderTest, 'fakeId');

      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_033: [** The `getIndividualEnrollment` method shall construct an HTTP request using information supplied by the caller as follows:
        GET /enrollments/<uri-encoded-id>?api-version=<version> HTTP/1.1
        Accept: application/json
        Authorization: <sharedAccessSignature>
        ] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_034: [** The `getEnrollmentGroup` method shall construct an HTTP request using information supplied by the caller as follows:
        GET /enrollmentGroups/<uri-encoded-id>?api-version=<version> HTTP/1.1
        Authorization: <sharedAccessSignature>
        ] */
      /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_035: [** The `getDeviceRegistrationState` method shall construct an HTTP request using information supplied by the caller as follows:
        GET /registrations/<uri-encoded-id>?api-version=<version> HTTP/1.1
        Authorization: <sharedAccessSignature>
        ] */
      it('Constructs a valid HTTP request for id parameter', function (testCallback) {
        var id = 'fakeRegistration';
        var fakeHttpHelper = {
          executeApiCall: function (method, path, httpHeaders, body, done) {
            assert.equal(method, 'GET');
            assert.equal(path, uriPath + encodeURIComponent(id) + _versionQueryString());
            assert.equal(httpHeaders['Accept'], 'application/json');
            assert.equal(Object.keys(httpHeaders).length, 1, 'Should be one headers');
            assert.equal(body, null);
            done();
          }
        };

        var de = new ProvisioningServiceClient({
          host: 'host',
          sharedAccessSignature: 'sas'
        }, fakeHttpHelper);
        de[methodUnderTest](id, testCallback);
      });
    });
  }

  testGetAPI('getIndividualEnrollment', '/enrollments/');
  testGetAPI('getEnrollmentGroup', '/enrollmentGroups/');
  testGetAPI('getDeviceRegistrationState', '/registrations/');


  describe('#runBulkEnrollmentOperation', function () {
    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_038: [The `runBulkEnrollmentOperation` method shall throw `ReferenceError` if the `bulkEnrollmentOperation` argument is falsy.] */
    [undefined, null].forEach(function (bo) {
      testFalsyArg('runBulkEnrollmentOperation', 'bulkEnrollmentOperation', bo, ReferenceError);
    });

    var fakeBo = {
      mode: 'update',
      enrollments: [fakeEnrollment]
    };
    testErrorCallback('runBulkEnrollmentOperation', fakeBo);

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_039: [** The `runBulkEnrollmentOperation` method shall construct an HTTP request using information supplied by the caller as follows:
      POST /enrollments?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Accept: application/json
      Content-Type: application/json; charset=utf-8

      <stringified json string of the bulkEnrollmentOperation argument>
      ] */
    it('Constructs a valid HTTP request for bulkEnrollmentOperation parameter', function (testCallback) {
      var fakeHttpHelper = {
        executeApiCall: function (method, path, httpHeaders, body, done) {
          assert.equal(method, 'POST');
          assert.equal(path, '/enrollments/' + _versionQueryString());
          assert.equal(httpHeaders['Content-Type'], 'application/json; charset=utf-8');
          assert.equal(httpHeaders['Accept'], 'application/json');
          assert.equal(Object.keys(httpHeaders).length, 2, 'Should be two headers');
          assert.deepEqual(body, fakeBo);
          done();
        }
      };

      var de = new ProvisioningServiceClient({
        host: 'host',
        sharedAccessSignature: 'sas'
      }, fakeHttpHelper);
      de.runBulkEnrollmentOperation(fakeBo, testCallback);
    });
  });


  describe('#getIndividualEnrollmentAttestationMechanism', function () {
    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_001: [The `getIndividualEnrollmentAttestationMechanism` method shall throw a `ReferenceError` if the `enrollmentId` parameter is falsy.]*/
    [undefined, null, ''].forEach(function(badEnrollmentId) {
      testFalsyArg('getIndividualEnrollmentAttestationMechanism', 'enrollmentId', badEnrollmentId, ReferenceError);
    });

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_036: [If any device enrollment operation method encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript `Error` object with a text description of the error (err.message). ]*/
    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_037: [When any registry operation method receives an HTTP response with a status code >= 300, it shall invoke the `done` callback function with an error translated using the requirements detailed in `registry_http_errors_requirements.md` ]*/
    testErrorCallback('getIndividualEnrollmentAttestationMechanism', 'enrollment-id');

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_002: [** The `getIndividualEnrollmentAttestationMechanism` shall construct an HTTP request using information supplied by the caller as follows:
    ```
    POST /enrollments/<encodeUriComponentStrict(enrollmentId)>/attestationmechanism?api-version=<version> HTTP/1.1
    Authorization: <sharedAccessSignature>
    ```]*/
    it('creates a valid HTTP request', function (testCallback) {
      var testEnrollmentId = 'test-#-enrollment';
      var fakeHttpHelper = {
        executeApiCall: function (method, path, httpHeaders, body, done) {
          assert.equal(method, 'POST');
          assert.equal(path, '/enrollments/' + encodeURIComponentStrict(testEnrollmentId) + '/attestationmechanism' + _versionQueryString());

          done();
        }
      };

      var de = new ProvisioningServiceClient({ host: 'host', sharedAccessSignature: 'sas' }, fakeHttpHelper);
      de.getIndividualEnrollmentAttestationMechanism(testEnrollmentId, testCallback);
    });
  });


  describe('#getEnrollmentGroupAttestationMechanism', function () {
    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_003: [The `getEnrollmentGroupAttestationMechanism` method shall throw a `ReferenceError` if the `enrollementGroupId` parameter is falsy.]*/
    [undefined, null, ''].forEach(function(badEnrollmentId) {
      testFalsyArg('getEnrollmentGroupAttestationMechanism', 'enrollmentGroupId', badEnrollmentId, ReferenceError);
    });

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_036: [If any device enrollment operation method encounters an error before it can send the request, it shall invoke the `done` callback function and pass the standard JavaScript `Error` object with a text description of the error (err.message). ]*/
    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_037: [When any registry operation method receives an HTTP response with a status code >= 300, it shall invoke the `done` callback function with an error translated using the requirements detailed in `registry_http_errors_requirements.md` ]*/
    testErrorCallback('getEnrollmentGroupAttestationMechanism', 'enrollment-id');

    /*Tests_SRS_NODE_PROVISIONING_SERVICE_CLIENT_16_004: [** The `getEnrollmentGroupAttestationMechanism` shall construct an HTTP request using information supplied by the caller as follows:
    ```
    POST /enrollmentgroups/<encodeUriComponentStrict(enrollmentGroupId)>/attestationmechanism?api-version=<version> HTTP/1.1
    Authorization: <sharedAccessSignature>
    ```]*/
    it('creates a valid HTTP request', function (testCallback) {
      var testEnrollmentGroupId = 'test-#-enrollment';
      var fakeHttpHelper = {
        executeApiCall: function (method, path, httpHeaders, body, done) {
          assert.equal(method, 'POST');
          assert.equal(path, '/enrollmentgroups/' + encodeURIComponentStrict(testEnrollmentGroupId) + '/attestationmechanism' + _versionQueryString());

          done();
        }
      };

      var de = new ProvisioningServiceClient({ host: 'host', sharedAccessSignature: 'sas' }, fakeHttpHelper);
      de.getEnrollmentGroupAttestationMechanism(testEnrollmentGroupId, testCallback);
    });
  });
});