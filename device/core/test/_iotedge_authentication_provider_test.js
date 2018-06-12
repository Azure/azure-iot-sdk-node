// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var http = require('http');
var assert = require('chai').assert;
var sinon = require('sinon');
var errors = require('azure-iot-common').errors;
var SharedAccessSignature = require('azure-iot-common').SharedAccessSignature;
var IotEdgeAuthenticationProvider = require('../lib/iotedge_authentication_provider').IotEdgeAuthenticationProvider;
var WORKLOAD_API_VERSION = require('../lib/iotedge_authentication_provider').WORKLOAD_API_VERSION;

describe('IotEdgeAuthenticationProvider', function() {
  describe('#constructor', function() {
    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_016: [ The constructor shall create the initial token value using the credentials parameter. ]
    it('creates initial token value using credentials param', function(testCallback) {
      let provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'unix:///var/run/iotedged.w.sock',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );
      assert.strictEqual(provider._credentials.host, 'h1');
      assert.strictEqual(provider._credentials.deviceId, 'd1');
      testCallback();
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_017: [ The constructor shall throw an ArgumentError if the tokenRenewalMarginInSeconds is less than or equal tokenValidTimeInSeconds. ]
    it('throws if tokenRenewalMarginInSeconds is equal to tokenValidTimeInSeconds', function(testCallback) {
      assert.throws(function() {
        new IotEdgeAuthenticationProvider(
          {
            workloadUri: 'unix:///var/run/iotedged.w.sock',
            moduleId: 'm1',
            generationId: 'g1',
            iothubHostName: 'h1',
            deviceId: 'd1'
          },
          10,
          10
        );
      }, errors.ArgumentError);
      testCallback();
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_017: [ The constructor shall throw an ArgumentError if the tokenRenewalMarginInSeconds is less than or equal tokenValidTimeInSeconds. ]
    it('throws if tokenRenewalMarginInSeconds is less than tokenValidTimeInSeconds', function(testCallback) {
      assert.throws(function() {
        new IotEdgeAuthenticationProvider(
          {
            workloadUri: 'unix:///var/run/iotedged.w.sock',
            moduleId: 'm1',
            generationId: 'g1',
            iothubHostName: 'h1',
            deviceId: 'd1'
          },
          8,
          10
        );
      }, errors.ArgumentError);
      testCallback();
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_001: [ The constructor shall throw a ReferenceError if the _authConfig parameter is falsy. ]
    [null, undefined, ''].forEach(function(authConfig) {
      it("throws if the key is '" + authConfig + "'", function(testCallback) {
        assert.throws(function() {
          new IotEdgeAuthenticationProvider(authConfig);
        }, ReferenceError);
        testCallback();
      });
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_002: [ The constructor shall throw a ReferenceError if the _authConfig.workloadUri field is falsy. ]
    [null, undefined, ''].forEach(function(workloadUri) {
      it("throws if authConfig.workloadUri is '" + workloadUri + "'", function(testCallback) {
        assert.throws(function() {
          new IotEdgeAuthenticationProvider({ workloadUri: workloadUri });
        }, ReferenceError);
        testCallback();
      });
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_003: [ The constructor shall throw a ReferenceError if the _authConfig.moduleId field is falsy. ]
    [null, undefined, ''].forEach(function(moduleId) {
      it("throws if authConfig.moduleId is '" + moduleId + "'", function(testCallback) {
        assert.throws(function() {
          new IotEdgeAuthenticationProvider({
            workloadUri: 'unix:///var/run/iotedged.w.sock',
            moduleId: moduleId
          });
        }, ReferenceError);
        testCallback();
      });
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_004: [ The constructor shall throw a ReferenceError if the _authConfig.generationId field is falsy. ]
    [null, undefined, ''].forEach(function(generationId) {
      it("throws if authConfig.generationId is '" + generationId + "'", function(testCallback) {
        assert.throws(function() {
          new IotEdgeAuthenticationProvider({
            workloadUri: 'unix:///var/run/iotedged.w.sock',
            moduleId: 'm1',
            generationId: generationId
          });
        }, ReferenceError);
        testCallback();
      });
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_005: [ The constructor shall throw a TypeError if the _authConfig.workloadUri field is not a valid URI. ]
    it('throws if authConfig.workloadUri is not a valid URI', function(testCallback) {
      assert.throws(function() {
        new IotEdgeAuthenticationProvider({
          workloadUri: 10,
          moduleId: 'm1',
          generationId: 'g1'
        });
      }, TypeError);
      testCallback();
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_006: [ The constructor shall build a unix domain socket path host if the workload URI protocol is unix. ]
    it('builds a unix domain socket url', function(testCallback) {
      var provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'unix:///var/run/iotedged.w.sock',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );

      assert.strictEqual(provider._restApiClient._config.host.socketPath, '/var/run/iotedged.w.sock');

      testCallback();
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_007: [ The constructor shall build a string host if the workload URI protocol is not unix. ]
    it('builds a http url', function(testCallback) {
      var provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'http://localhost:8081',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );

      assert.strictEqual(provider._restApiClient._config.host, 'localhost');

      testCallback();
    });
  });

  describe('#getTrustBundle', function() {
    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_020: [ The getTrustBundle method shall throw a ReferenceError if the callback parameter is falsy or is not a function. ]
    [null, undefined, '', 'not a function', 20].forEach(function(badCallback) {
      it("throws if the callback is '" + badCallback + "'", function(testCallback) {
        var provider = new IotEdgeAuthenticationProvider(
          {
            workloadUri: 'unix:///var/run/iotedged.w.sock',
            moduleId: 'm1',
            generationId: 'g1',
            iothubHostName: 'h1',
            deviceId: 'd1'
          }
        );
        assert.throws(function() {
          provider.getTrustBundle(badCallback);
        }, ReferenceError);
        testCallback();
      });
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_022: [ The getTrustBundle method shall build the HTTP request path in the format /trust-bundle?api-version=2018-06-28. ]
    it('builds request path in expected format', function(testCallback) {
      var provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'unix:///var/run/iotedged.w.sock',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );
      sinon.stub(provider._restApiClient, 'executeApiCall').callsFake(function(method, path, headers, body, requestOptions, callback) {
        assert.strictEqual(path, '/trust-bundle?api-version=' + WORKLOAD_API_VERSION);
        callback(null, { certificate: 'ca cert' });
      });

      provider.getTrustBundle(function(err, ca) {
        assert.isNotOk(err);
        assert.strictEqual(ca, 'ca cert');
        testCallback();
      });
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_021: [ The getTrustBundle method shall invoke this._restApiClient.executeApiCall to make the REST call on iotedged using the GET method. ]
    it('gets ca cert', function(testCallback) {
      var provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'unix:///var/run/iotedged.w.sock',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );
      sinon.stub(provider._restApiClient, 'executeApiCall').callsFake(function(method, path, headers, body, requestOptions, callback) {
        assert.strictEqual(method, 'GET');
        callback(null, { certificate: 'ca cert' });
      });

      provider.getTrustBundle(function(err, ca) {
        assert.isNotOk(err);
        assert.strictEqual(ca, 'ca cert');
        testCallback();
      });
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_023: [** The `getTrustBundle` method shall set the HTTP request option's `request` property to use the `http.request` object.
    it('uses http.request object', function(testCallback) {
      var provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'unix:///var/run/iotedged.w.sock',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );
      sinon.stub(provider._restApiClient, 'executeApiCall').callsFake(function(method, path, headers, body, requestOptions, callback) {
        assert.strictEqual(method, 'GET');
        assert.strictEqual(requestOptions.request, http.request);
        callback(null, { certificate: 'ca cert' });
      });

      provider.getTrustBundle(function(err, ca) {
        assert.isNotOk(err);
        testCallback();
      });
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_024: [** The `getTrustBundle` method shall set the HTTP request option's `port` property to use the workload URI's port if available.
    it('uses port when specified', function(testCallback) {
      var provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'http://localhost:8081',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );
      sinon.stub(provider._restApiClient, 'executeApiCall').callsFake(function(method, path, headers, body, requestOptions, callback) {
        assert.strictEqual(method, 'GET');
        assert.strictEqual(requestOptions.port, 8081);
        callback(null, { certificate: 'ca cert' });
      });

      provider.getTrustBundle(function(err, ca) {
        assert.isNotOk(err);
        testCallback();
      });
    });

    it('forwards error', function(testCallback) {
      var provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'unix:///var/run/iotedged.w.sock',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );
      sinon.stub(provider._restApiClient, 'executeApiCall').callsFake(function(method, path, headers, body, requestOptions, callback) {
        assert.strictEqual(method, 'GET');
        callback('whoops');
      });

      provider.getTrustBundle(function(err) {
        assert.strictEqual(err, 'whoops');
        testCallback();
      });
    });
  });

  describe('#sign', function() {
    before(function() {
      this.clock = sinon.useFakeTimers();
    });

    after(function() {
      this.clock.restore();
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_009: [ The _sign method shall throw a ReferenceError if the callback parameter is falsy or is not a function. ]
    [null, undefined, '', 'not a function', 20].forEach(function(badCallback) {
      it("throws if the callback is '" + badCallback + "'", function(testCallback) {
        var provider = new IotEdgeAuthenticationProvider(
          {
            workloadUri: 'unix:///var/run/iotedged.w.sock',
            moduleId: 'm1',
            generationId: 'g1',
            iothubHostName: 'h1',
            deviceId: 'd1'
          }
        );
        assert.throws(function() {
          provider._sign(
            'data',
            100000,
            {
              host: 'h1',
              deviceId: 'd1'
            },
            badCallback
          );
        }, ReferenceError);
        testCallback();
      });
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_010: [ The _sign method invoke callback with a ReferenceError if the data parameter is falsy. ]
    [null, undefined, ''].forEach(function(badData) {
      it("invokes callback with ReferenceError if data is '" + badData + "'", function(testCallback) {
        var provider = new IotEdgeAuthenticationProvider(
          {
            workloadUri: 'unix:///var/run/iotedged.w.sock',
            moduleId: 'm1',
            generationId: 'g1',
            iothubHostName: 'h1',
            deviceId: 'd1'
          }
        );
        provider._sign(badData, 100000, function(err) {
          assert.instanceOf(err, ReferenceError);
          testCallback();
        });
      });
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_011: [ The _sign method shall build the HTTP request path in the format /modules/<module id>/genid/<generation id>/sign?api-version=2018-06-28. ]
    it('builds request path in expected format', function(testCallback) {
      var provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'unix:///var/run/iotedged.w.sock',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );
      sinon.stub(provider._restApiClient, 'executeApiCall').callsFake(function(method, path, headers, body, requestOptions, callback) {
        assert.strictEqual(path, '/modules/m1/genid/g1/sign?api-version=' + WORKLOAD_API_VERSION);
        callback(null, { digest: 'digest1' });
      });

      provider._sign('data', 100000, function(err) {
        testCallback();
      });
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_014: [ The _sign method shall build an object with the following schema as the HTTP request body as the sign request:
    //   interface SignRequest {
    //     keyId: string;
    //     algo: string;
    //     data: string;
    //   }
    //   ]
    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_013: [ The _sign method shall build the sign request using the following values:
    //   const signRequest = {
    //     keyId: "primary"
    //     algo: "HMACSHA256"
    //     data: `${data}\n${expiry}`
    //   };
    //   ]
    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_019: [ The _sign method shall invoke this._restApiClient.executeApiCall to make the REST call on iotedged using the POST method. ]
    it('signs request is as expected', function(testCallback) {
      var provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'unix:///var/run/iotedged.w.sock',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );
      sinon.stub(provider._restApiClient, 'executeApiCall').callsFake(function(method, path, headers, body, requestOptions, callback) {
        assert.strictEqual(method, 'POST');
        assert.strictEqual(body.keyId, 'primary');
        assert.strictEqual(body.algo, 'HMACSHA256');
        assert.strictEqual(body.data, 'aDElMkZkZXZpY2VzJTJGZDElMkZtb2R1bGVzJTJGbTEKMjAwMA==');
        callback(null, { digest: 'digest1' });
      });

      provider._sign('data', 2000, function(err) {
        testCallback();
      });
    });

    it('uses http.request object', function(testCallback) {
      var provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'unix:///var/run/iotedged.w.sock',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );
      sinon.stub(provider._restApiClient, 'executeApiCall').callsFake(function(method, path, headers, body, requestOptions, callback) {
        assert.strictEqual(method, 'POST');
        assert.strictEqual(body.keyId, 'primary');
        assert.strictEqual(body.algo, 'HMACSHA256');
        assert.strictEqual(body.data, 'aDElMkZkZXZpY2VzJTJGZDElMkZtb2R1bGVzJTJGbTEKMjAwMA==');
        assert.strictEqual(requestOptions.request, http.request);
        callback(null, { digest: 'digest1' });
      });

      provider._sign('data', 2000, function(err) {
        testCallback();
      });
    });

    it('uses port when specified', function(testCallback) {
      var provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'http://localhost:8081',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );
      sinon.stub(provider._restApiClient, 'executeApiCall').callsFake(function(method, path, headers, body, requestOptions, callback) {
        assert.strictEqual(method, 'POST');
        assert.strictEqual(body.keyId, 'primary');
        assert.strictEqual(body.algo, 'HMACSHA256');
        assert.strictEqual(body.data, 'aDElMkZkZXZpY2VzJTJGZDElMkZtb2R1bGVzJTJGbTEKMjAwMA==');
        assert.strictEqual(requestOptions.port, 8081);
        callback(null, { digest: 'digest1' });
      });

      provider._sign('data', 2000, function(err) {
        testCallback();
      });
    });

    describe('#SharedAccessSignature.createWithSigningFunction works', function() {
      var createWithSigningFunctionStub;
      beforeEach(function() {
        createWithSigningFunctionStub = sinon
          .stub(SharedAccessSignature, 'createWithSigningFunction')
          .callsArgWith(3, null, 'sas token');
      });

      afterEach(function() {
        createWithSigningFunctionStub.restore();
      });

      // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_027: [** The `_sign` method shall use the `SharedAccessSignature.createWithSigningFunction` function to build the data buffer which is to be signed by iotedged.
      it('uses SharedAccessSignature.createWithSigningFunction', function(testCallback) {
        var provider = new IotEdgeAuthenticationProvider(
          {
            workloadUri: 'unix:///var/run/iotedged.w.sock',
            moduleId: 'm1',
            generationId: 'g1',
            iothubHostName: 'h1',
            deviceId: 'd1'
          }
        );
        sinon.stub(provider._restApiClient, 'executeApiCall').callsFake(function(method, path, headers, body, requestOptions, callback) {
          assert.strictEqual(method, 'POST');
          assert.strictEqual(body.keyId, 'primary');
          assert.strictEqual(body.algo, 'HMACSHA256');
          assert.strictEqual(body.data, 'aDElMkZkZXZpY2VzJTJGZDElMkZtb2R1bGVzJTJGbTEKMjAwMA==');
          callback(null, { digest: 'digest1' });
        });

        provider._sign('data', 2000, function(err, sas) {
          assert.isNotOk(err);
          assert.strictEqual(sas, 'sas token');
          assert.isTrue(createWithSigningFunctionStub.called);
          testCallback();
        });
      });
    });

    describe('#SharedAccessSignature.createWithSigningFunction fails', function() {
      var createWithSigningFunctionStub;
      beforeEach(function() {
        createWithSigningFunctionStub = sinon
          .stub(SharedAccessSignature, 'createWithSigningFunction')
          .callsArgWith(3, 'whoops');
      });

      afterEach(function() {
        createWithSigningFunctionStub.restore();
      });

      // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_027: [** The `_sign` method shall use the `SharedAccessSignature.createWithSigningFunction` function to build the data buffer which is to be signed by iotedged.
      it('forwards error', function(testCallback) {
        var provider = new IotEdgeAuthenticationProvider(
          {
            workloadUri: 'unix:///var/run/iotedged.w.sock',
            moduleId: 'm1',
            generationId: 'g1',
            iothubHostName: 'h1',
            deviceId: 'd1'
          }
        );

        provider._sign('data', 2000, function(err) {
          assert.strictEqual(err, 'whoops');
          assert.isTrue(createWithSigningFunctionStub.called);
          testCallback();
        });
      });
    });

    it('request error is handled', function(testCallback) {
      var provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'unix:///var/run/iotedged.w.sock',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );
      sinon.stub(provider._restApiClient, 'executeApiCall').callsFake(function(method, path, headers, body, requestOptions, callback) {
        callback('whoops');
      });

      provider._sign('data', 2000, function(err) {
        assert.strictEqual(err, 'whoops');
        testCallback();
      });
    });

    // Tests_SRS_NODE_IOTEDGED_AUTHENTICATION_PROVIDER_13_015: [ The _sign method shall invoke callback when the signature is available. ]
    it('creates sas', function(testCallback) {
      var provider = new IotEdgeAuthenticationProvider(
        {
          workloadUri: 'unix:///var/run/iotedged.w.sock',
          moduleId: 'm1',
          generationId: 'g1',
          iothubHostName: 'h1',
          deviceId: 'd1'
        }
      );
      sinon.stub(provider._restApiClient, 'executeApiCall').callsFake(function(method, path, headers, body, requestOptions, callback) {
        callback(null, { digest: 'digest1' });
      });

      provider._sign('data', 2000, function(err, sig) {
        assert.strictEqual(sig, 'SharedAccessSignature sr=h1%2Fdevices%2Fd1%2Fmodules%2Fm1&sig=digest0%3D&se=2000');
        testCallback();
      });
    });
  });
});
