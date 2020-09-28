/* eslint-disable no-var */
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

var assert = require('chai').assert;
var sinon = require('sinon');
var DigitalTwinClient = require('../dist/cl/digital_twin_client').DigitalTwinClient;

var testCredentials = {
  signRequest: sinon.stub().callsFake(function (webResource) {
    return Promise.resolve(webResource);
  }),
  getHubName: sinon.stub().returns('fake.host.name')
};

describe('DigitalTwinClient', function () {
  /* Tests_SRS_NODE_DIGITAL_TWIN_CLIENT_12_001: [The `DigitalTwinClient` creates an instance of the DigitalTwinClient passing IoTHubTokenCredentials class as an argument.]*/
  it(`Constructor creates an instance of the DigitalTwinClient`, function (testCallback) {
    var digitalTwinClient = new DigitalTwinClient(testCredentials);
    assert.instanceOf(digitalTwinClient, DigitalTwinClient);
    testCallback();
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_CLIENT_12_002: [The `getDigitalTwin` method shall call the `getDigitalTwin` method of the protocol layer with the given argument.]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_CLIENT_12_003: [The `getDigitalTwin` method shall call the callback with an error parameter if a callback is passed..]*/
  it('getDigitalTwin calls the getDigitalTwin method on the PL client', function (testCallback) {
    var testTwinId = 'digitalTwinId';
    var testDigitalTwin = {
      interfaces: {
        testInterfaceInstanceName: {}
      },
      response: undefined
    };
    var testClient = new DigitalTwinClient(testCredentials);
    testClient._pl.digitalTwin.getDigitalTwin = sinon.stub().callsArgWith(1, null, testDigitalTwin);
    testClient.getDigitalTwin(testTwinId, function (err, result, response) {
      assert.isTrue(testClient._pl.digitalTwin.getDigitalTwin.calledWith(testTwinId));
      assert.isNull(err);
      assert.deepEqual(result.interfaces, testDigitalTwin.interfaces);
      assert.deepEqual(result.response, testDigitalTwin.response);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_CLIENT_12_004: [The `getDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
  it('getDigitalTwin calls its callback with an error if the PL client fails', function (testCallback) {
    var testTwinId = 'digitalTwinId';
    var testError = new Error('fake error');
    var testClient = new DigitalTwinClient(testCredentials);
    testClient._pl.digitalTwin.getDigitalTwin = sinon.stub().callsArgWith(1, testError);
    testClient.getDigitalTwin(testTwinId, function (err) {
      assert.isTrue(testClient._pl.digitalTwin.getDigitalTwin.calledWith(testTwinId));
      assert.strictEqual(err, testError);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_CLIENT_12_020: [The `getDigitalTwin` method shall return a promise if there is no callback passed.]*/
  it('getDigitalTwin shall return a promise if there is no callback passed', async () => {
    var testTwinId = 'digitalTwinId';
    var testDigitalTwin = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testClient = new DigitalTwinClient(testCredentials);
    testClient._pl.digitalTwin.getDigitalTwin = sinon.stub().callsArgWith(1, null, testDigitalTwin);
    const returnedPromise = await testClient.getDigitalTwin(testTwinId);
    assert.deepEqual(returnedPromise.interfaces, testDigitalTwin.interfaces);
    assert.deepEqual(returnedPromise.response, testDigitalTwin.response);
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_CLIENT_12_011: [The `updateDigitalTwin` method shall call the `updateDigitalTwin` method of the protocol layer with the given arguments.]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_CLIENT_12_012: [The `updateDigitalTwin` method shall call the callback with an error parameter if a callback is passed..]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_CLIENT_12_028: [** The `patch` argument of the `updateDigitalTwin` method should be a JSON string using the following format:
   const patch = {
    interfaces: {
      [interfaceInstanceName]: {
        properties: {
          [propertyName]: {
            desired: {
              value: propertyValue
            }
          }
        }
      }
    }
  };
  The interfaceInstanceName should be an existing interfaceInstance's name.
  The propertyName could be existing or new.
  The patch should contain difference to a previously reported twin only (e.g. patch).]*/
  it('updateDigitalTwin calls updateDigitalTwin on the PL client', function (testCallback) {
    var testTwinId = 'digitalTwinId';
    var testPropertyValue ='testPropertyValue';

    var testServicePatch = {
      interfaces: {
        interfaceInstanceName: {
          properties: {
            testPropertyName: {
              value: testPropertyValue
            }
          }
        }
      },
      version: 1234
    };
    var testUserPatch = {
      interfaces: {
        interfaceInstanceName: {
          properties: {
            testPropertyName: {
              value: testPropertyValue
            }
          }
        }
      },
      version: 1234
    };

    var testClient = new DigitalTwinClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, null, testServicePatch, null, undefined);
    testClient.updateDigitalTwin(testTwinId, testUserPatch, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.updateDigitalTwin.calledWith(testTwinId, testUserPatch));
      assert.isNull(err);
      assert.deepEqual(result, testUserPatch);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_CLIENT_12_013: [The `updateDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
  it('updateDigitalTwin calls its callback with an error if the PL client fails', function (testCallback) {
    var testTwinId = 'digitalTwinId';
    var testPatch = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testError = new Error('fake error');
    var testClient = new DigitalTwinClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, testError);
    testClient.updateDigitalTwin(testTwinId, testPatch, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.updateDigitalTwin.calledWith(testTwinId));
      assert.strictEqual(err, testError);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_CLIENT_12_023: [The `updateDigitalTwin` method shall return a promise if there is no callback passed.]*/
  it('updateDigitalTwin shall return a promise if there is no callback passed', async () => {
    var testTwinId = 'digitalTwinId';
    var testDigitalTwin = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testPatch = {
      eTag: '001'
    };
    var testClient = new DigitalTwinClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, null, testDigitalTwin, null, undefined);
    const returnedPromise = await testClient.updateDigitalTwin(testTwinId, testPatch);
    assert.deepEqual(returnedPromise, testDigitalTwin);
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_CLIENT_12_026: [The `updateDigitalTwin` method shall call the `updateDigitalTwin` method of the protocol layer with the given arguments including eTag.]*/
  it('updateDigitalTwin calls updateDigitalTwin on the PL client using eTag', function (testCallback) {
    var testTwinId = 'digitalTwinId';
    var eTag = 'testETag';
    var testPropertyValue ='testPropertyValue';

    var testServicePatch = {
      interfaces: {
        testInterfaceInstanceName: {
          properties: {
            testPropertyName: {
              value: testPropertyValue
            }
          }
        }
      },
      version: undefined
    };
    var testResponse = {
      parsedHeaders: {
        eTag: '001'
      }
    };
    var testUserPatch = {
      interfaces: {
        testInterfaceInstanceName: {
          properties: {
            testPropertyName: {
              value: testPropertyValue
            }
          }
        }
      },
      version: undefined
    };
    var testClient = new DigitalTwinClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, null, testServicePatch, null, testResponse);
    testClient.updateDigitalTwin(testTwinId, testUserPatch, eTag, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.updateDigitalTwin.calledWith(testTwinId, testUserPatch));
      assert.isNull(err);
      assert.deepEqual(result, testUserPatch);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_CLIENT_12_030: [The `updateDigitalTwin` method shall return a promise if eTag is passed and there is no callback passed.] */
  it('updateDigitalTwin shall return a promise if eTag is passed and there is no callback passed', async () => {
    var testTwinId = 'digitalTwinId';
    var eTag = 'eTag';
    var testServicePatch = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testResponse = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testUserPatch = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testClient = new DigitalTwinClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, null, testServicePatch, null, testResponse);
    const returnedPromise = await testClient.updateDigitalTwin(testTwinId, testUserPatch, eTag);
    assert.deepEqual(returnedPromise._response, testUserPatch);
  });

  it('invokeComponentCommand called with the right parameters and shall return a promise', async () => {
    var testTwinId = 'digitalTwinId';
    var testCommandResponse = {
      result: {
        testResult: {}
      }
    };
    var testInterfaceInstanceName = 'testInterfaceInstanceName';
    var testCommandName = 'testCommandName';
    var testArgument = 123456;
    var testClient = new DigitalTwinClient(testCredentials);
    sinon.stub(testClient._pl.digitalTwin, "invokeComponentCommand").returns(testCommandResponse);
    const response = await testClient.invokeComponentCommand(testTwinId, testInterfaceInstanceName, testCommandName, testArgument);
    assert.isTrue(testClient._pl.digitalTwin.invokeComponentCommand.calledWith(testTwinId, testInterfaceInstanceName, testCommandName, testArgument));
    assert.isNotNull(response);
    assert.strictEqual(testCommandResponse, response);
  });

  it('invokeComponentCommand called with the right plus optional parameters and shall return a promise', async () => {
    var testTwinId = 'digitalTwinId';
    var testCommandResponse = {
      result: {
        testResult: {}
      }
    };
    var testInterfaceInstanceName = 'testInterfaceInstanceName';
    var testCommandName = 'testCommandName';
    var testArgument = 123456;
    var options = {};
    var testClient = new DigitalTwinClient(testCredentials);
    sinon.stub(testClient._pl.digitalTwin, "invokeComponentCommand").returns(testCommandResponse);
    const response = await testClient.invokeComponentCommand(testTwinId, testInterfaceInstanceName, testCommandName, testArgument, options);
    assert.isTrue(testClient._pl.digitalTwin.invokeComponentCommand.calledWith(testTwinId, testInterfaceInstanceName, testCommandName, testArgument));
    assert.isNotNull(response);
    assert.strictEqual(testCommandResponse, response);
  });

  it('invokeCommand called with the right plus optional parameters and shall return a promise', async () => {
    var testTwinId = 'digitalTwinId';
    var testCommandResponse = {
      result: {
        testResult: {}
      }
    };
    var testCommandName = 'testCommandName';
    var testArgument = 123456;
    var testClient = new DigitalTwinClient(testCredentials);
    sinon.stub(testClient._pl.digitalTwin, "invokeRootLevelCommand").returns(testCommandResponse);
    const response = await testClient.invokeCommand(testTwinId, testCommandName, testArgument);
    assert.isTrue(testClient._pl.digitalTwin.invokeRootLevelCommand.calledWith(testTwinId, testCommandName, testArgument));
    assert.isNotNull(response);
    assert.strictEqual(testCommandResponse, response);
  });

  it('invokeCommand called with the right plus optional parameters and shall return a promise', async () => {
    var testTwinId = 'digitalTwinId';
    var testCommandResponse = {
      result: {
        testResult: {}
      }
    };
    var testCommandName = 'testCommandName';
    var testArgument = 123456;
    var options = {};
    var testClient = new DigitalTwinClient(testCredentials);
    sinon.stub(testClient._pl.digitalTwin, "invokeRootLevelCommand").returns(testCommandResponse);
    const response = await testClient.invokeCommand(testTwinId, testCommandName, testArgument, options);
    assert.isTrue(testClient._pl.digitalTwin.invokeRootLevelCommand.calledWith(testTwinId, testCommandName, testArgument));
    assert.isNotNull(response);
    assert.strictEqual(testCommandResponse, response);
  });
});
