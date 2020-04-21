/* eslint-disable no-var */
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

var assert = require('chai').assert;
var sinon = require('sinon');
var DigitalTwinServiceClient = require('../dist/cl/digital_twin_service_client').DigitalTwinServiceClient;

var testCredentials = {
  signRequest: sinon.stub().callsFake(function (webResource) {
    return Promise.resolve(webResource);
  }),
  getHubName: sinon.stub().returns('fake.host.name')
};

describe('DigitalTwinServiceClient', function () {
  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_001: [The `DigitalTwinServiceClient` creates an instance of the DigitalTwinServiceClient passing IoTHubTokenCredentials class as an argument.]*/
  it(`Constructor creates an instance of the DigitalTwinServiceClient`, function (testCallback) {
    var digitalTwinServiceClient = new DigitalTwinServiceClient(testCredentials);
    assert.instanceOf(digitalTwinServiceClient, DigitalTwinServiceClient);
    testCallback();
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_002: [The `getDigitalTwin` method shall call the `getDigitalTwin` method of the protocol layer with the given argument.]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_003: [The `getDigitalTwin` method shall call the callback with an error parameter if a callback is passed..]*/
  it('getDigitalTwin calls the getDigitalTwin method on the PL client', function (testCallback) {
    var testTwinId = 'testTwinId';
    var testResult = {
      testComponentName: {}
    };
    var testResponse = 'testResponse';
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getDigitalTwin = sinon.stub().callsArgWith(1, null, testResult, null, testResponse);
    testClient.getDigitalTwin(testTwinId, function (err, result, response) {
      assert.isTrue(testClient._pl.digitalTwin.getDigitalTwin.calledWith(testTwinId));
      assert.isNull(err);
      assert.deepEqual(result, testResult);
      assert.deepEqual(response, testResponse);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_004: [The `getDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
  it('getDigitalTwin calls its callback with an error if the PL client fails', function (testCallback) {
    var testTwinId = 'testTwinId';
    var testError = new Error('fake error');
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getDigitalTwin = sinon.stub().callsArgWith(1, testError);
    testClient.getDigitalTwin(testTwinId, function (err) {
      assert.isTrue(testClient._pl.digitalTwin.getDigitalTwin.calledWith(testTwinId));
      assert.strictEqual(err, testError);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_020: [The `getDigitalTwin` method shall return a promise if there is no callback passed.]*/
  it('getDigitalTwin shall return a promise if there is no callback passed', async () => {
    var testTwinId = 'testTwinId';
    var testResult = {
      testComponentName: {}
    };
    var testResponse = 'testResponse';
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getDigitalTwin = sinon.stub().callsArgWith(1, null, testResult, null, testResponse);
    const returnedPromise = await testClient.getDigitalTwin(testTwinId);
    assert.deepEqual(returnedPromise, testResult);
    assert.deepEqual(returnedPromise._response, testResponse);
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_035: [The `updateDigitalTwin` method shall call the `updateDigitalTwin` method of the protocol layer with the given arguments.]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_036: [The `updateDigitalTwin` method shall call the callback with an error parameter if a callback is passed..]*/
  it('updateDigitalTwin calls updateDigitalTwin on the PL client', function (testCallback) {
    var testTwinId = 'testTwinId';
    var testResult = {
      testComponentName: {}
    };
    var testResponse = 'testResponse';
    var testPatch = 'testPatch';
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, null, testResult, null, testResponse);
    testClient.updateDigitalTwin(testTwinId, testPatch, function (err, result, response) {
      assert.isTrue(testClient._pl.digitalTwin.updateDigitalTwin.calledWith(testTwinId, testPatch));
      assert.isNull(err);
      assert.deepEqual(result, testResult);
      assert.deepEqual(response, testResponse);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_037: [The `updateDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
  it('updateDigitalTwin calls its callback with an error if the PL client fails', function (testCallback) {
    var testTwinId = 'testTwinId';
    var testPatch = 'testPatch';
    var testError = new Error('fake error');
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, testError);
    testClient.updateDigitalTwin(testTwinId, testPatch, function (err) {
      assert.isTrue(testClient._pl.digitalTwin.updateDigitalTwin.calledWith(testTwinId));
      assert.strictEqual(err, testError);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_038: [The `updateDigitalTwin` method shall return a promise if there is no callback passed.]*/
  it('updateDigitalTwin shall return a promise if there is no callback passed', async () => {
    var testTwinId = 'testTwinId';
    var testResult = {
      testComponentName: {}
    };
    var testResponse = 'testResponse';
    var testPatch = 'testPatch';
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, null, testResult, null, testResponse);
    const returnedPromise = await testClient.updateDigitalTwin(testTwinId, testPatch);
    assert.deepEqual(returnedPromise, testResult);
    assert.deepEqual(returnedPromise._response, testResponse);
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_039: [The `updateDigitalTwin` method shall call the `updateDigitalTwin` method of the protocol layer with the given arguments including eTag.]*/
  it('updateDigitalTwin calls updateDigitalTwin on the PL client using eTag', function (testCallback) {
    var testTwinId = 'testTwinId';
    var testResult = {
      testComponentName: {}
    };
    var testResponse = 'testResponse';
    var testPatch = 'testPatch';
    var testEtag = 'testEtag';
    var testOptions = {
      ifMatch: 'testEtag'
    };
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, null, testResult, null, testResponse);
    testClient.updateDigitalTwin(testTwinId, testPatch, testEtag, function (err, result, response) {
      assert.isTrue(testClient._pl.digitalTwin.updateDigitalTwin.calledWith(testTwinId, testPatch, testOptions));
      assert.isNull(err);
      assert.deepEqual(result, testResult);
      assert.deepEqual(response, testResponse);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_040: [The `updateDigitalTwin` method shall return a promise if eTag is passed and there is no callback passed.] */
  it('updateDigitalTwin shall return a promise if eTag is passed and there is no callback passed', async () => {
    var testTwinId = 'testTwinId';
    var testResult = {
      testComponentName: {}
    };
    var testResponse = 'testResponse';
    var testPatch = 'testPatch';
    var testEtag = 'testEtag';
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, null, testResult, null, testResponse);
    const returnedPromise = await testClient.updateDigitalTwin(testTwinId, testPatch, testEtag);
    assert.deepEqual(returnedPromise, testResult);
    assert.deepEqual(returnedPromise._response, testResponse);
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_017: [The `invokeComponentCommand` method shall call the `invokeComponentCommand` method of the protocol layer with the given arguments.]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_018: [The `invokeComponentCommand` method shall call the callback with an error parameter if a callback is passed..]*/
  it('invokeComponentCommand calls invokeComponentCommand on the PL client', function (testCallback) {
    var testTwinId = 'testTwinId';
    var testResult = 'testResult';
    var testResponse = 'testResponse';
    var testComponentName = 'testComponentName';
    var testCommandName = 'testCommandName';
    var testArgument = 123456;
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.invokeComponentCommand = sinon.stub().callsArgWith(4, null, testResult, null, testResponse);
    testClient.invokeComponentCommand(testTwinId, testComponentName, testCommandName, testArgument, function (err, result, response) {
      assert.isTrue(testClient._pl.digitalTwin.invokeComponentCommand.calledWith(testTwinId, testComponentName, testCommandName, testArgument));
      assert.isNull(err);
      assert.deepEqual(result, testResult);
      assert.deepEqual(response, testResponse);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_019: [The `invokeComponentCommand` method shall return error if the method of the protocol layer failed.]*/
  it('invokeComponentCommand calls its callback with an error if the PL client fails', function (testCallback) {
    var testTwinId = 'testTwinId';
    var testError = new Error('fake error');
    var testComponentName = 'testComponentName';
    var testCommandName = 'testCommandName';
    var testArgument = 123456;
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.invokeComponentCommand = sinon.stub().callsArgWith(4, testError);
    testClient.invokeComponentCommand(testTwinId, testComponentName, testCommandName, testArgument, function (err) {
      assert.isTrue(testClient._pl.digitalTwin.invokeComponentCommand.calledWith(testTwinId, testComponentName, testCommandName, testArgument));
      assert.strictEqual(err, testError);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_025: [The `invokeComponentCommand` method shall return a promise if there is no callback passed.]*/
  it('invokeComponentCommand shall return a promise if there is no callback passed', async () => {
    var testTwinId = 'testTwinId';
    var testResult = {
      testComponentName: {}
    };
    var testResponse = 'testResponse';
    var testComponentName = 'testComponentName';
    var testCommandName = 'testCommandName';
    var testArgument = 123456;
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.invokeComponentCommand = sinon.stub().callsArgWith(4, null, testResult, null, testResponse);
    const returnedPromise = await testClient.invokeComponentCommand(testTwinId, testComponentName, testCommandName, testArgument);
    assert.deepEqual(returnedPromise, testResult);
  });
});
