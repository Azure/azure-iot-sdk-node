// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

"use strict";

var assert = require('chai').assert;
var sinon = require('sinon');
var uuid = require('uuid');

var endpoint = require('azure-iot-common').endpoint;
var JobClient = require('../dist/job_client.js').JobClient;
var ConnectionString = require('../iothub').ConnectionString;
var SharedAccessSignature = require('../iothub').SharedAccessSignature;
var DeviceMethod = require('../dist/device_method.js').DeviceMethod;
var RestApiClient = require('azure-iot-http-base').RestApiClient;
var Query = require('../dist/query.js').Query;

const defaultMaxExecutionTimeInSeconds = 3600;

describe('JobClient', function() {
  function testFalsyArg (fn, badArgName, badArgValue, args) {
    it('throws a ReferenceError when ' + badArgName + ' is \'' + badArgValue + '\'', function() {
      assert.throws(function() {
        return fn.apply(null, args);
      }, ReferenceError);
    });
  }

  function testBadTypeArg (fn, badArgName, badArgValue, args) {
    it('throws a TypeError when ' + badArgName + ' is of type \'' + typeof(badArgValue) + '\'', function() {
      assert.throws(function() {
        return fn.apply(null, args);
      }, TypeError);
    });
  }

  function testCallback(fnName, args) {
    /*Tests_SRS_NODE_JOB_CLIENT_16_027: [The method shall call the `done` callback with a single argument that is a standard Javascript `Error` object if the request failed.]*/
    it('calls the done callback with a single Error parameter if the request fails (' + (args.length + 1) + ' arguments)', function(cb) {
      var fakeError = new Error('fake');
      var fakeRestApiClient = { executeApiCall: sinon.stub().callsArgWith(4, fakeError) };
      var failArgs = args.slice();

      failArgs.push(function(err) {
        assert.strictEqual(err, fakeError);
        cb();
      });

      var client = new JobClient(fakeRestApiClient);
      client[fnName].apply(client, failArgs);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_028: [The method shall call the `done` callback with a `null` error argument, a result and a transport-specific response object if the request was successful.]*/
    it('calls the done callback with a null error, a result and a response if the request succeeds (' + (args.length + 1) + ' arguments)', function(cb) {
      var fakeResponse = { statusCode: 200 };
      var fakeResult = { success: true };
      var fakeRestApiClient = { executeApiCall: sinon.stub().callsArgWith(4, null, fakeResult, fakeResponse) };
      var successArgs = args.slice();

      successArgs.push(function(err, result, response) {
        assert.isNull(err);
        assert.strictEqual(result, fakeResult);
        assert.strictEqual(response, fakeResponse);
        cb();
      });

      var client = new JobClient(fakeRestApiClient);
      client[fnName].apply(client, successArgs);
    });
  }

  describe('#constructor', function() {
    /*Tests_SRS_NODE_JOB_CLIENT_16_001: [The `JobClient` constructor shall throw a `ReferenceError` if `restApiClient` is falsy.]*/
    [undefined, null].forEach(function(badClient) {
      it('throws a ReferenceError if restApiClient is \'' + badClient + '\'', function() {
        assert.throws(function() {
          return new JobClient(badClient);
        }, ReferenceError);
      });
    });

    it('Will update the authentication expiration for each new request', function(done) {
      this.clock = sinon.useFakeTimers();
      this.clock.tick(1); // Expiration in the SAS we are about to create shouldn't be zero.

      //
      // Building up arguments for the invoke method job client call upcoming.
      // Using this api because that is where the problem was reported for the Job Client
      //
      var fakeJobId = 'id';
      var fakeQuery = 'SELECT * FROM devices';
      var fakeMethodParams = {
        methodName: 'name',
        payload: { foo: 'bar' },
        responseTimeoutInSeconds: 15
      };

      var fakeStartTime = new Date(Date.now() + 3600);
      var fakeMaxExecutionTime = 7200;

      //
      // Build up the arguments for the RestApi constructor.
      // Using the uuid as the key since putting a hard constant that looks
      // like a key would get flagged by checks looking for keys committed to
      // the repo.
      //
      const connectionString = 'HostName=fake.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=' + uuid.v4();
      const cn = ConnectionString.parse(connectionString);
      const config = {
        host: cn.HostName,
        sharedAccessSignature: SharedAccessSignature.create(cn.HostName, cn.SharedAccessKeyName, cn.SharedAccessKey, Date.now())
      };
      assert(Number(config.sharedAccessSignature.se) > 0, 'Initial sas expiration needs to be greater than 0');

      //
      // We create our own http base client since we want to capture
      // the authorization header after it's been instantiated.
      // The other functions are used during the course of serialization
      // of the http request.
      //
      var fakeHttpBase = {
        buildRequest: sinon.stub().returns({
          write: sinon.stub(),
          end: sinon.stub()
        }),
        setOptions: sinon.stub()
      };
      let client = new JobClient(new RestApiClient(config, 'a/1.0.0', fakeHttpBase));

      client.scheduleDeviceMethod(fakeJobId, fakeQuery, fakeMethodParams, fakeStartTime, fakeMaxExecutionTime, function fakeCallback() {});

      //
      // The expiration should be at least 5 minutes from the epoch above.  (It's very likely 1 hour).
      //
      // The first index of the args is the particular invocation of the buildRequest.  In this case 0 is the first call.
      // The second index of the args is the particular argument of the call.  In this case 2 is the
      // third argument to buildRequest, which are the headers of the http request.
      //

      const firstExpiration = Number(SharedAccessSignature.parse(fakeHttpBase.buildRequest.args[0][2].Authorization).se);
      assert(firstExpiration >= ((60*5) + 1), 'Expiration of sas for first method invocation call needed to be at least 5 minutes');

      //
      // Move time forward by 10 seconds.
      // The expiration of the second call should be at least 10 seconds later than the first call.
      //

      this.clock.tick(10*1000);
      client.scheduleDeviceMethod(fakeJobId, fakeQuery, fakeMethodParams, fakeStartTime, fakeMaxExecutionTime, function fakeCallback() {});
      const secondExpiration = Number(SharedAccessSignature.parse(fakeHttpBase.buildRequest.args[1][2].Authorization).se);
      this.clock.restore();
      assert(secondExpiration >= (firstExpiration + 10), 'Expiration of sas for second method invocation needed to be at least 10 seconds after first');
      done();
    });
  });

  describe('#fromConnectionString', function() {
    /*Tests_SRS_NODE_JOB_CLIENT_16_002: [The `fromConnectionString` method shall throw a `ReferenceError` if `connectionString` is falsy.]*/
    [undefined, null, ''].forEach(function(badValue) {
      testFalsyArg(JobClient.fromConnectionString, 'connectionString', badValue, [badValue]);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_003: [The `fromConnectionString` method shall return a new `JobClient` instance.]*/
    it('returns a JobClient instance', function() {
      var fakeConnectionString = 'HostName=bad;SharedAccessKeyName=keyName;SharedAccessKey=key';
      assert.instanceOf(JobClient.fromConnectionString(fakeConnectionString), JobClient);
    });
  });

  describe('#fromSharedAccessSignature', function() {
    /*Tests_SRS_NODE_JOB_CLIENT_16_004: [The `fromSharedAccessSignature` method shall throw a `ReferenceError` if `sharedAccessSignature` is falsy.]*/
    [undefined, null, ''].forEach(function(badValue) {
      testFalsyArg(JobClient.fromSharedAccessSignature, 'sharedAccessSignature', badValue, [badValue]);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_005: [The `fromSharedAccessSignature` method shall return a new `JobClient` instance.]*/
    it('returns a JobClient instance', function() {
      var fakeSas = 'SharedAccessSignature sr=bad&sig=XLU2ibNOYBbld3FpFIOHbPZv3Thp4wfK%2BcqZpJz66hE%3D&skn=keyName&se=1474440492';
      assert.instanceOf(JobClient.fromSharedAccessSignature(fakeSas), JobClient);
    });
  });

  describe('#getJob', function() {
    /*Tests_SRS_NODE_JOB_CLIENT_16_006: [The `getJob` method shall throw a `ReferenceError` if `jobId` is `null`, `undefined` or an empty string.]*/
    [undefined, null, ''].forEach(function(badValue) {
     testFalsyArg(new JobClient({}).getJob, 'jobId', badValue, [badValue, () => {}]);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_007: [The `getJob` method shall construct the HTTP request as follows:
    ```
    GET /jobs/v2/<jobId>?api-version=<version>
    Authorization: <config.sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    Request-Id: <guid>
    User-Agent: <sdk-name>/<sdk-version>
    ```]*/
    it('creates a valid HTTP request', function() {
      var fakeJobId = 'foo';
      var fakeRestApiClient = { executeApiCall: sinon.stub() };

      var client = new JobClient(fakeRestApiClient);
      client.getJob(fakeJobId, function() {});

      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][0], 'GET');
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][1], '/jobs/v2/' + fakeJobId + endpoint.versionQueryString());
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][2], null);
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3], null);
    });

    testCallback('getJob', ['jobId']);
  });

  describe('#createQuery', function() {
    it('returns a Query object', function() {
      var client = new JobClient({});
      assert.instanceOf(client.createQuery(), Query);
    });
  });

  describe('#_getJobsFunc', function() {
    /*Tests_SRS_NODE_JOB_CLIENT_16_012: [The `createQuery` method shall construct the HTTP request as follows:
    ```
    GET /jobs/v2/query?api-version=<version>&jobType=<jobType>&jobStatus=<jobStatus>
    Authorization: <config.sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    Request-Id: <guid>
    User-Agent: <sdk-name>/<sdk-version>
    ```]*/
    it('creates a valid HTTP request when no arguments are given', function() {
      var fakeRestApiClient = { executeApiCall: sinon.stub() };

      var client = new JobClient(fakeRestApiClient);
      var query = client.createQuery();
      query.next(function() {});
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][0], 'GET');
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][1], '/jobs/v2/query' + endpoint.versionQueryString());
      assert.deepEqual(fakeRestApiClient.executeApiCall.args[0][2], {});
      assert.isNull(fakeRestApiClient.executeApiCall.args[0][3]);
    });

    it('creates a valid HTTP request with jobType only', function() {
      var fakeJobType = 'type';
      var fakeRestApiClient = { executeApiCall: sinon.stub() };

      var client = new JobClient(fakeRestApiClient);
      var query = client.createQuery(fakeJobType);
      query.next(function() {});
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][0], 'GET');
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][1], '/jobs/v2/query' + endpoint.versionQueryString() + '&jobType=' + fakeJobType);
      assert.deepEqual(fakeRestApiClient.executeApiCall.args[0][2], {});
      assert.isNull(fakeRestApiClient.executeApiCall.args[0][3]);
    });

    it('creates a valid HTTP request with jobStatus only', function() {
      var fakeJobStatus = 'status';
      var fakeRestApiClient = { executeApiCall: sinon.stub()};

      var client = new JobClient(fakeRestApiClient);
      var query = client.createQuery(null, fakeJobStatus);
      query.next(function() {});
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][0], 'GET');
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][1], '/jobs/v2/query' + endpoint.versionQueryString() + '&jobStatus=' + fakeJobStatus);
      assert.deepEqual(fakeRestApiClient.executeApiCall.args[0][2], {});
      assert.isNull(fakeRestApiClient.executeApiCall.args[0][3]);
    });

    it('creates a valid HTTP request with pageSize only', function() {
      var fakePageSize = 42;
      var fakeRestApiClient = { executeApiCall: sinon.stub()};

      var client = new JobClient(fakeRestApiClient);
      var query = client.createQuery(null, null, fakePageSize);
      query.next(function() {});
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][0], 'GET');
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][1], '/jobs/v2/query' + endpoint.versionQueryString());
      assert.deepEqual(fakeRestApiClient.executeApiCall.args[0][2], { 'x-ms-max-item-count': fakePageSize });
      assert.isNull(fakeRestApiClient.executeApiCall.args[0][3]);
    });

    it('creates a valid HTTP request with all parameters', function() {
      var fakeJobType = 'type';
      var fakeJobStatus = 'status';
      var fakePageSize = 42;
      var fakeRestApiClient = { executeApiCall: sinon.stub()};

      var client = new JobClient(fakeRestApiClient);
      var query = client.createQuery(fakeJobType, fakeJobStatus, fakePageSize);
      query.next(function() {});
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][0], 'GET');
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][1], '/jobs/v2/query' + endpoint.versionQueryString() + '&jobStatus=' + fakeJobStatus + '&jobType=' + fakeJobType);
      assert.deepEqual(fakeRestApiClient.executeApiCall.args[0][2], { 'x-ms-max-item-count': fakePageSize });
      assert.isNull(fakeRestApiClient.executeApiCall.args[0][3]);
    });

    it('creates a valid HTTP request with a continuationToken', function(testCallback) {
      var fakeToken = 'testToken';
      var fakeRestApiClient = { executeApiCall: sinon.stub().callsArgWith(4, null, [], { statusCode: 200, headers: { 'x-ms-continuation': fakeToken }})};

      var client = new JobClient(fakeRestApiClient);
      var query = client.createQuery();
      query.next(function() {
        assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][0], 'GET');
        assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][1], '/jobs/v2/query' + endpoint.versionQueryString());
        assert.deepEqual(fakeRestApiClient.executeApiCall.args[0][2], {});
        assert.isNull(fakeRestApiClient.executeApiCall.args[0][3]);
        query.next(function() {
          assert.strictEqual(fakeRestApiClient.executeApiCall.args[1][0], 'GET');
          assert.strictEqual(fakeRestApiClient.executeApiCall.args[1][1], '/jobs/v2/query' + endpoint.versionQueryString());
          assert.deepEqual(fakeRestApiClient.executeApiCall.args[1][2], { 'x-ms-continuation': fakeToken });
          assert.isNull(fakeRestApiClient.executeApiCall.args[1][3]);
          testCallback();
        });
      });
    });
  });

  describe('#cancelJob', function() {
    /*Tests_SRS_NODE_JOB_CLIENT_16_008: [The `cancelJob` method shall throw a `ReferenceError` if `jobId` is `null`, `undefined` or an empty string.]*/
    [undefined, null, ''].forEach(function(badValue) {
      testFalsyArg(new JobClient({}).cancelJob, 'jobId', badValue, [badValue, () => {}]);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_009: [The `cancelJob` method shall construct the HTTP request as follows:
    ```
    POST /jobs/v2/<jobId>/cancel?api-version=<version>
    Authorization: <config.sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    Request-Id: <guid>
    User-Agent: <sdk-name>/<sdk-version>
    ```]*/
    it('creates a valid HTTP request', function() {
      var fakeJobId = 'foo';
      var fakeRestApiClient = { executeApiCall: sinon.stub() };

      var client = new JobClient(fakeRestApiClient);
      client.cancelJob(fakeJobId, function() {});
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][0], 'POST');
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][1], '/jobs/v2/' + fakeJobId + '/cancel' + endpoint.versionQueryString());
      assert.isNull(fakeRestApiClient.executeApiCall.args[0][2]);
      assert.isNull(fakeRestApiClient.executeApiCall.args[0][3]);
    });

    testCallback('cancelJob', ['jobId']);
  });

  describe('#scheduleDeviceMethod', function() {
    var goodParams = {
      methodName: 'name',
      responseTimeoutInSeconds: 15,
      payload: null
    };

    /*Tests_SRS_NODE_JOB_CLIENT_16_013: [The `scheduleDeviceMethod` method shall throw a `ReferenceError` if `jobId` is `null`, `undefined` or an empty string.]*/
    [undefined, null, ''].forEach(function(badJobId) {
      testFalsyArg(new JobClient({}).scheduleDeviceMethod, 'jobId', badJobId, [badJobId, 'SELECT * FROM devices', goodParams, () => {}]);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_014: [The `scheduleDeviceMethod` method shall throw a `ReferenceError` if `queryCondition` is falsy.]*/
    [undefined, null, ''].forEach(function(badQuery) {
      testFalsyArg(new JobClient({}).scheduleDeviceMethod, 'queryCondition', badQuery, ['id', badQuery, goodParams, () => {}]);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_029: [The `scheduleDeviceMethod` method shall throw a `ReferenceError` if `methodParams` is falsy.]*/
    [undefined, null].forEach(function(badParams) {
      testFalsyArg(new JobClient({}).scheduleDeviceMethod, 'methodParams', badParams, ['id', 'SELECT * FROM devices', badParams, () => {}]);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_015: [The `scheduleDeviceMethod` method shall throw a `ReferenceError` if `methodParams.methodName` is `null`, `undefined` or an empty string.]*/
    [undefined, null, ''].forEach(function(badMethodName) {
      testFalsyArg(new JobClient({}).scheduleDeviceMethod, 'methodParams.methodName', badMethodName, ['id', 'SELECT * FROM devices', { methodName: badMethodName }, () => {}]);
    });

    [42, {}, function() {}].forEach(function(badQueryType) {
      testBadTypeArg(new JobClient({}).scheduleDeviceMethod, 'queryCondition', badQueryType, ['id', badQueryType, { methodName: 'name' }, new Date(), 3600, () => {}]);
    });

    it('throws a TypeError if the callback is not the last parameter', function() {
      var client = new JobClient({});
      assert.throws(function() {
        client.scheduleDeviceMethod('id', 'query', { methodName: 'name' }, function() {}, 3600);
      }, TypeError);

      assert.throws(function() {
        client.scheduleDeviceMethod('id', 'query', { methodName: 'name' }, new Date(), function() {}, 3600);
      }, TypeError);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_030: [The `scheduleDeviceMethod` method shall use the `DeviceMethod.defaultPayload` value if `methodParams.payload` is `undefined`.]*/
     /*Tests_SRS_NODE_JOB_CLIENT_16_031: [The `scheduleDeviceMethod` method shall use the `DeviceMethod.defaultResponseTimeout` value if `methodParams.responseTimeoutInSeconds` is falsy.]*/
    it('uses the default payload and responseTimeoutInSeconds if either of those methodParams properties are undefined', function () {
      var fakeRestApiClient = { executeApiCall: sinon.stub() };

      var client = new JobClient(fakeRestApiClient);
      client.scheduleDeviceMethod('id', 'SELECT * FROM devices', { methodName: 'name' }, new Date(), 86400, function() {});
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].cloudToDeviceMethod.payload, DeviceMethod.defaultPayload);
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].cloudToDeviceMethod.responseTimeoutInSeconds, DeviceMethod.defaultResponseTimeout);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_020: [The `scheduleDeviceMethod` method shall construct the HTTP request as follows:
    ```
    PUT /jobs/v2/<jobId>?api-version=<version>
    Authorization: <config.sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    Request-Id: <guid>
    User-Agent: <sdk-name>/<sdk-version>

    {
      jobId: '<jobId>',
      type: 'scheduleDirectRequest',
      cloudToDeviceMethod: <methodParams>,
      queryCondition: '<queryCondition>',   // if the query parameter is a string
      startTime: <jobStartTime>,            // as an ISO-8601 date string
      maxExecutionTimeInSeconds: <maxExecutionTimeInSeconds>  // Number of seconds
    }
    ```]*/
    it('creates a valid HTTP request, given a proper SQL string', function() {
      var fakeJobId = 'id';
      var fakeQuery = 'SELECT * FROM devices';
      var fakeMethodParams = {
        methodName: 'name',
        payload: { foo: 'bar' },
        responseTimeoutInSeconds: 15
      };

      var fakeStartTime = new Date(Date.now() + 3600);
      var fakeMaxExecutionTime = 7200;

      var fakeRestApiClient = { executeApiCall: sinon.stub() };

      var client = new JobClient(fakeRestApiClient);
      client.scheduleDeviceMethod(fakeJobId, fakeQuery, fakeMethodParams, fakeStartTime, fakeMaxExecutionTime, function() {});
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][0], 'PUT');
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][1], '/jobs/v2/' + fakeJobId + endpoint.versionQueryString());
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][2]['Content-Type'], 'application/json; charset=utf-8');
      assert.deepEqual(fakeRestApiClient.executeApiCall.args[0][3].cloudToDeviceMethod, fakeMethodParams);
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].type, 'scheduleDeviceMethod');
      assert.isUndefined(fakeRestApiClient.executeApiCall.args[0][3].deviceIds);
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].queryCondition, fakeQuery);
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].startTime, fakeStartTime.toISOString());
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].maxExecutionTimeInSeconds, fakeMaxExecutionTime);
    });

    it('sends default start time and execution time if parameters not specified', function() {
      this.clock = sinon.useFakeTimers();
      var fakeTimeNowString = (new Date()).toISOString();
      var fakeJobId = 'id';
      var fakeQuery = 'SELECT * FROM devices';
      var fakeMethodParams = {
        methodName: 'name',
        payload: { foo: 'bar' },
        responseTimeoutInSeconds: 15
      };

      var fakeRestApiClient = { executeApiCall: sinon.stub() };

      var client = new JobClient(fakeRestApiClient);
      client.scheduleDeviceMethod(fakeJobId, fakeQuery, fakeMethodParams, function() {});
      this.clock.restore();
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].startTime, fakeTimeNowString);
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].maxExecutionTimeInSeconds, defaultMaxExecutionTimeInSeconds);
    });

    it('sends default max execution time if parameter not specified', function() {
      var fakeJobId = 'id';
      var fakeQuery = 'SELECT * FROM devices';
      var fakeMethodParams = {
        methodName: 'name',
        payload: { foo: 'bar' },
        responseTimeoutInSeconds: 15
      };

      var fakeStartTime = new Date(Date.now() + 3600);
      var fakeRestApiClient = { executeApiCall: sinon.stub() };

      var client = new JobClient(fakeRestApiClient);
      client.scheduleDeviceMethod(fakeJobId, fakeQuery, fakeMethodParams, fakeStartTime, function() {});
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].maxExecutionTimeInSeconds, defaultMaxExecutionTimeInSeconds);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_018: [If `jobStartTime` is a function, `jobStartTime` shall be considered the callback and a `TypeError` shall be thrown if `maxExecutionTimeInSeconds` and/or `done` are not `undefined`.]*/
    testCallback('scheduleDeviceMethod', ['jobId', 'query', {methodName: 'name'}]);
    /*Tests_SRS_NODE_JOB_CLIENT_16_019: [If `maxExecutionTimeInSeconds` is a function, `maxExecutionTimeInSeconds` shall be considered the callback and a `TypeError` shall be thrown if `done` is not `undefined`.]*/
    testCallback('scheduleDeviceMethod', ['jobId', 'query', {methodName: 'name'}, new Date()]);
    testCallback('scheduleDeviceMethod', ['jobId', 'query', {methodName: 'name'}, new Date(), 3600]);
  });

  describe('scheduleTwinUpdate', function() {
    var goodPatch = {
      tags: {
        key: 'value'
      }
    };

    /*Tests_SRS_NODE_JOB_CLIENT_16_021: [The `scheduleTwinUpdate` method shall throw a `ReferenceError` if `jobId` is `null`, `undefined` or an empty string.]*/
    [undefined, null, ''].forEach(function(badValue) {
      testFalsyArg(new JobClient({}).scheduleTwinUpdate, 'jobId', badValue, [badValue, 'SELECT * FROM devices', goodPatch, () => {}]);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_022: [The `scheduleTwinUpdate` method shall throw a `ReferenceError` if `queryCondition` is falsy.]*/
    [undefined, null, ''].forEach(function(badValue) {
      testFalsyArg(new JobClient({}).scheduleTwinUpdate, 'queryCondition', badValue, ['id', badValue, goodPatch, () => {}]);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_023: [The `scheduleTwinUpdate` method shall throw a `ReferenceError` if `patch` is falsy.]*/
    [undefined, null, ''].forEach(function(badValue) {
      testFalsyArg(new JobClient({}).scheduleTwinUpdate, 'patch', badValue, ['id', 'SELECT * FROM devices', badValue, () => {}]);
    });

    [42, {}, function() {}].forEach(function(badQueryType) {
      testBadTypeArg(new JobClient({}).scheduleTwinUpdate, 'queryCondition', badQueryType, ['id', badQueryType, { tags: null }, new Date(), 3600, () => {}]);
    });

    it('throws a TypeError if the callback is not the last parameter', function() {
      var client = new JobClient({});
      assert.throws(function() {
        client.scheduleTwinUpdate('id', 'query', { tags: null }, function() {}, 3600);
      }, TypeError);

      assert.throws(function() {
        client.scheduleTwinUpdate('id', 'query', { tags: null }, new Date(), function() {}, 3600);
      }, TypeError);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_026: [The `scheduleTwinUpdate` method shall construct the HTTP request as follows:
    ```
    PUT /jobs/v2/<jobId>?api-version=<version>
    Authorization: <config.sharedAccessSignature>
    Content-Type: application/json; charset=utf-8
    Request-Id: <guid>
    User-Agent: <sdk-name>/<sdk-version>

    {
      jobId: '<jobId>',
      type: 'scheduleTwinUpdate',
      updateTwin: <patch>                   // Valid JSON object
      queryCondition: '<queryCondition>',   // if the queryCondition parameter is a string
      startTime: <jobStartTime>,            // as an ISO-8601 date string
      maxExecutionTimeInSeconds: <maxExecutionTimeInSeconds>  // Number of seconds
    }
    ```]*/
    it('creates a valid HTTP request, given a proper SQL string', function() {
      var fakeJobId = 'id';
      var fakeQuery = 'SELECT * FROM devices';
      var fakePatch = {
        tags: {
          key: 'value'
        }
      };

      var fakeStartTime = new Date(Date.now() + 3600);
      var fakeMaxExecutionTime = 7200;

      var fakeRestApiClient = { executeApiCall: sinon.stub() };

      var client = new JobClient(fakeRestApiClient);
      client.scheduleTwinUpdate(fakeJobId, fakeQuery, fakePatch, fakeStartTime, fakeMaxExecutionTime, function() {});
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][0], 'PUT');
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][1], '/jobs/v2/' + fakeJobId + endpoint.versionQueryString());
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][2]['Content-Type'], 'application/json; charset=utf-8');
      assert.deepEqual(fakeRestApiClient.executeApiCall.args[0][3].updateTwin, fakePatch);
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].type, 'scheduleUpdateTwin');
      assert.isUndefined(fakeRestApiClient.executeApiCall.args[0][3].deviceIds);
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].queryCondition, fakeQuery);
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].startTime, new Date(fakeStartTime).toISOString());
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].maxExecutionTimeInSeconds, fakeMaxExecutionTime);
    });

    it('sends default start time and execution time if parameters not specified', function() {
      this.clock = sinon.useFakeTimers();
      var fakeTimeNowString = (new Date()).toISOString();
      var fakeJobId = 'id';
      var fakeQuery = 'SELECT * FROM devices';
      var fakePatch = {
        tags: {
          key: 'value'
        }
      };

      var fakeRestApiClient = { executeApiCall: sinon.stub() };

      var client = new JobClient(fakeRestApiClient);
      client.scheduleTwinUpdate(fakeJobId, fakeQuery, fakePatch, function() {});
      this.clock.restore();
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].startTime, fakeTimeNowString);
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].maxExecutionTimeInSeconds, defaultMaxExecutionTimeInSeconds);
    });

    it('sends default max execution time if parameter not specified', function() {
      var fakeJobId = 'id';
      var fakeQuery = 'SELECT * FROM devices';
      var fakePatch = {
        tags: {
          key: 'value'
        }
      };

      var fakeStartTime = new Date(Date.now() + 3600);
      var fakeRestApiClient = { executeApiCall: sinon.stub() };

      var client = new JobClient(fakeRestApiClient);
      client.scheduleTwinUpdate(fakeJobId, fakeQuery, fakePatch, fakeStartTime, function() {});
      assert.strictEqual(fakeRestApiClient.executeApiCall.args[0][3].maxExecutionTimeInSeconds, defaultMaxExecutionTimeInSeconds);
    });

    /*Tests_SRS_NODE_JOB_CLIENT_16_024: [If `jobStartTime` is a function, `jobStartTime` shall be considered the callback and a `TypeError` shall be thrown if `maxExecutionTimeInSeconds` and/or `done` are not `undefined`.]*/
    testCallback('scheduleTwinUpdate', ['jobId', 'query', {tags: null}]);
    /*Tests_SRS_NODE_JOB_CLIENT_16_025: [If `maxExecutionTimeInSeconds` is a function, `maxExecutionTimeInSeconds` shall be considered the callback and a `TypeError` shall be thrown if `done` is not `undefined`.]*/
    testCallback('scheduleTwinUpdate', ['jobId', 'query', {tags: null}, new Date()]);
    testCallback('scheduleTwinUpdate', ['jobId', 'query', {tags: null}, new Date(), 3600]);
  });
});