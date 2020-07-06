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
    var testTwinId = 'digitalTwinId';
    var testDigitalTwin = {
      interfaces: {
        testInterfaceInstanceName: {}
      },
      response: undefined
    };
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getDigitalTwin = sinon.stub().callsArgWith(1, null, testDigitalTwin);
    testClient.getDigitalTwin(testTwinId, function (err, result, response) {
      assert.isTrue(testClient._pl.digitalTwin.getDigitalTwin.calledWith(testTwinId));
      assert.isNull(err);
      assert.deepEqual(result.interfaces, testDigitalTwin.interfaces);
      assert.deepEqual(result.response, testDigitalTwin.response);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_004: [The `getDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
  it('getDigitalTwin calls its callback with an error if the PL client fails', function (testCallback) {
    var testTwinId = 'digitalTwinId';
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
    var testTwinId = 'digitalTwinId';
    var testDigitalTwin = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getDigitalTwin = sinon.stub().callsArgWith(1, null, testDigitalTwin);
    const returnedPromise = await testClient.getDigitalTwin(testTwinId);
    assert.deepEqual(returnedPromise.interfaces, testDigitalTwin.interfaces);
    assert.deepEqual(returnedPromise.response, testDigitalTwin.response);
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_011: [The `updateDigitalTwin` method shall call the `updateDigitalTwin` method of the protocol layer with the given arguments.]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_012: [The `updateDigitalTwin` method shall call the callback with an error parameter if a callback is passed..]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_028: [** The `patch` argument of the `updateDigitalTwin` method should be a JSON string using the following format:
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

    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, null, testServicePatch, null, undefined);
    testClient.updateDigitalTwin(testTwinId, testUserPatch, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.updateDigitalTwin.calledWith(testTwinId, testUserPatch));
      assert.isNull(err);
      assert.deepEqual(result, testUserPatch);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_013: [The `updateDigitalTwin` method shall return error if the method of the protocol layer failed.]*/
  it('updateDigitalTwin calls its callback with an error if the PL client fails', function (testCallback) {
    var testTwinId = 'digitalTwinId';
    var testPatch = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testError = new Error('fake error');
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, testError);
    testClient.updateDigitalTwin(testTwinId, testPatch, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.updateDigitalTwin.calledWith(testTwinId));
      assert.strictEqual(err, testError);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_023: [The `updateDigitalTwin` method shall return a promise if there is no callback passed.]*/
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
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, null, testDigitalTwin, null, undefined);
    const returnedPromise = await testClient.updateDigitalTwin(testTwinId, testPatch);
    assert.deepEqual(returnedPromise, testDigitalTwin);
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_026: [The `updateDigitalTwin` method shall call the `updateDigitalTwin` method of the protocol layer with the given arguments including eTag.]*/
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
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, null, testServicePatch, null, testResponse);
    testClient.updateDigitalTwin(testTwinId, testUserPatch, eTag, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.updateDigitalTwin.calledWith(testTwinId, testUserPatch));
      assert.isNull(err);
      assert.deepEqual(result, testUserPatch);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_030: [The `updateDigitalTwin` method shall return a promise if eTag is passed and there is no callback passed.] */
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
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateDigitalTwin = sinon.stub().callsArgWith(3, null, testServicePatch, null, testResponse);
    const returnedPromise = await testClient.updateDigitalTwin(testTwinId, testUserPatch, eTag);
    assert.deepEqual(returnedPromise._response, testUserPatch);
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_005: [The `getComponents` method shall call the `getComponents` method of the protocol layer with the given arguments.]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_006: [The `getComponents` method shall call the callback with an error parameter if a callback is passed..]*/
  it('getComponents calls getComponents on the PL client', function (testCallback) {
    var testTwinId = 'digitalTwinId';
    var testDigitalTwin = {
      body: 42,
    };
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getComponents = sinon.stub().callsArgWith(1, null, testDigitalTwin);
    testClient.getComponents(testTwinId, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.getComponents.calledWith(testTwinId));
      assert.isNull(err);
      assert.deepEqual(result, testDigitalTwin);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_007: [The `getComponents` method shall return error if the method of the protocol layer failed.]*/
  it('getComponents calls its callback with an error if the PL client fails', function (testCallback) {
    var testTwinId = 'digitalTwinId';
    var testError = new Error('fake error');
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getComponents = sinon.stub().callsArgWith(1, testError);
    testClient.getComponents(testTwinId, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.getComponents.calledWith(testTwinId));
      assert.strictEqual(err, testError);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_021: [The `getComponents` method shall return a promise if there is no callback passed.]*/
  it('getComponents shall return a promise if there is no callback passed', async () => {
    var testTwinId = 'digitalTwinId';
    var testDigitalTwin = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getComponents = sinon.stub().callsArgWith(1, null, testDigitalTwin.interfaces);
    const returnedPromise = await testClient.getComponents(testTwinId);
    assert.isNotNull(returnedPromise);
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_008: [The `getModel` method shall call the `getDigitalTwinModel` method of the protocol layer with the given argument.]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_009: [The `getModel` method shall call the callback with an error parameter if a callback is passed..]*/
  it('getModel calls getDigitalTwinModel on the PL client', function (testCallback) {
    var testModelId = 'modelId';
    var testDigitalTwinModel = {
      body: 42,
    };
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getDigitalTwinModel = sinon.stub().callsArgWith(1, null, testDigitalTwinModel);
    testClient.getModel(testModelId, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.getDigitalTwinModel.calledWith(testModelId));
      assert.isNull(err);
      assert.deepEqual(result, testDigitalTwinModel);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_010: [The `getModel` method shall return error if the method of the protocol layer failed.]*/
  it('getModel calls its callback with an error if the PL client fails', function (testCallback) {
    var testModelId = 'modelId';
    var testError = new Error('fake error');
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getDigitalTwinModel = sinon.stub().callsArgWith(1, testError);
    testClient.getModel(testModelId, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.getDigitalTwinModel.calledWith(testModelId));
      assert.strictEqual(err, testError);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_022: [The `getModel` method shall return a promise if there is no callback passed.]*/
  it('getModel shall return a promise if there is no callback passed', async () => {
    var testModelId = 'modelId';
    var testDigitalTwinModel = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getDigitalTwinModel = sinon.stub().callsArgWith(1, null, testDigitalTwinModel);
    const returnedPromise = await testClient.getModel(testModelId);
    assert.isNotNull(returnedPromise);
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_011: [The `updateComponent` method shall call the `updateComponent` method of the protocol layer with the given arguments.]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_012: [The `updateComponent` method shall call the callback with an error parameter if a callback is passed..]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_028: [** The `patch` argument of the `updateComponent` method should be a JSON string using the following format:
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
  it('updateComponent calls updateComponent on the PL client', function (testCallback) {
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

    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateComponent = sinon.stub().callsArgWith(3, null, testServicePatch, null, undefined);
    testClient.updateComponent(testTwinId, testUserPatch, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.updateComponent.calledWith(testTwinId, testUserPatch));
      assert.isNull(err);
      assert.deepEqual(result, testUserPatch);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_013: [The `updateComponent` method shall return error if the method of the protocol layer failed.]*/
  it('updateComponent calls its callback with an error if the PL client fails', function (testCallback) {
    var testTwinId = 'digitalTwinId';
    var testPatch = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testError = new Error('fake error');
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateComponent = sinon.stub().callsArgWith(3, testError);
    testClient.updateComponent(testTwinId, testPatch, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.updateComponent.calledWith(testTwinId));
      assert.strictEqual(err, testError);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_023: [The `updateComponent` method shall return a promise if there is no callback passed.]*/
  it('updateComponent shall return a promise if there is no callback passed', async () => {
    var testTwinId = 'digitalTwinId';
    var testDigitalTwin = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testPatch = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateComponent = sinon.stub().callsArgWith(3, null, testDigitalTwin, null, undefined);
    const returnedPromise = await testClient.updateComponent(testTwinId, testPatch);
    assert.deepEqual(returnedPromise.eTag, testPatch.eTag);
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_026: [The `updateComponent` method shall call the `updateComponent` method of the protocol layer with the given arguments including eTag.]*/
  it('updateComponent calls updateComponent on the PL client using eTag', function (testCallback) {
    var testTwinId = 'digitalTwinId';
    var eTag = 'testETag';
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
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateComponent = sinon.stub().callsArgWith(3, null, testServicePatch, null, undefined);
    testClient.updateComponent(testTwinId, testUserPatch, eTag, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.updateComponent.calledWith(testTwinId, testUserPatch));
      assert.isNull(err);
      assert.deepEqual(result, testUserPatch);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_030: [The `updateComponent` method shall return a promise if eTag is passed and there is no callback passed.] */
  it('updateComponent shall return a promise if eTag is passed and there is no callback passed', async () => {
    var testTwinId = 'digitalTwinId';
    var eTag = 'eTag';
    var testServicePatch = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testUserPatch = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.updateComponent = sinon.stub().callsArgWith(3, null, testServicePatch, null, undefined);
    const returnedPromise = await testClient.updateComponent(testTwinId, testUserPatch, eTag);
    assert.deepEqual(returnedPromise.eTag, testUserPatch.eTag);
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_005: [The `getComponent` method shall call the `getComponent` method of the protocol layer with the given arguments.]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_006: [The `getComponent` method shall call the callback with an error parameter if a callback is passed..]*/
  it('getComponent calls getComponent on the PL client', function (testCallback) {
    var testTwinId = 'digitalTwinId';
    var testInterfaceInstanceName = 'testInterfaceInstanceName';   
    var testDigitalTwin = {
      interfaces: {
        interfaceInstanceName: {}
      },
      version: 1234
    };
    var expectedTestDigitalTwin = {
      interfaces: {
        interfaceInstanceName: {}
      },
      version: 1234
    };
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getComponent = sinon.stub().callsArgWith(2, null, testDigitalTwin, null, undefined);
    testClient.getComponent(testTwinId, testInterfaceInstanceName, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.getComponent.calledWith(testTwinId, testInterfaceInstanceName));
      assert.isNull(err);
      assert.deepEqual(result, expectedTestDigitalTwin);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_007: [The `getComponent` method shall return error if the method of the protocol layer failed.]*/
  it('getComponent calls its callback with an error if the PL client fails', function (testCallback) {
    var testTwinId = 'digitalTwinId';
    var testError = new Error('fake error');
    var testInterfaceInstanceName = 'testInterfaceInstanceName';
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getComponent = sinon.stub().callsArgWith(2, testError);
    testClient.getComponent(testTwinId, testInterfaceInstanceName, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.getComponent.calledWith(testTwinId, testInterfaceInstanceName));
      assert.strictEqual(err, testError);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_021: [The `getComponent` method shall return a promise if there is no callback passed.]*/
  it('getComponent shall return a promise if there is no callback passed', async () => {
    var testTwinId = 'digitalTwinId';
    var testDigitalTwin = {
      interfaces: {
        testInterfaceInstanceName: {}
      }
    };
    var testInterfaceInstanceName = 'testInterfaceInstanceName';
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.getComponent = sinon.stub().callsArgWith(2, null, testDigitalTwin.interfaces);
    const returnedPromise = await testClient.getComponent(testTwinId, testInterfaceInstanceName);
    assert.isNotNull(returnedPromise);
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_017: [The `invokeComponentCommand` method shall call the `invokeComponentCommand` method of the protocol layer with the given arguments.]*/
  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_018: [The `invokeComponentCommand` method shall call the callback with an error parameter if a callback is passed..]*/
  it('invokeComponentCommand calls invokeComponentCommand on the PL client', function (testCallback) {
    var testTwinId = 'digitalTwinId';

    var testRequest = 'testRequest';
    var statusCode = 200;
    var requestId = '1234';
    var testResult =  {
      statusCode: number = statusCode,
      requestId: string = requestId,
      result: any = "testResult"
    };
    var expectedTestCommandResponse = {
      statusCode: number = statusCode,
      requestId: string = requestId,
      result: any = "testResult"
    };

    var testInterfaceInstanceName = 'testInterfaceInstanceName';
    var testCommandName = 'testCommandName';
    var testArgument = 123456;
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.invokeComponentCommand1 = sinon.stub().callsArgWith(4, null, testResult, testRequest, undefined);
    testClient.invokeComponentCommand(testTwinId, testInterfaceInstanceName, testCommandName, testArgument, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.invokeComponentCommand1.calledWith(testTwinId, testInterfaceInstanceName, testCommandName, testArgument));
      assert.isNull(err);
      assert.deepEqual(result, expectedTestCommandResponse);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_019: [The `invokeComponentCommand` method shall return error if the method of the protocol layer failed.]*/
  it('invokeComponentCommand calls its callback with an error if the PL client fails', function (testCallback) {
    var testTwinId = 'digitalTwinId';
    var testError = new Error('fake error');
    var testInterfaceInstanceName = 'testInterfaceInstanceName';
    var testCommandName = 'testCommandName';
    var testArgument = 'abcdefg';
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.invokeComponentCommand1 = sinon.stub().callsArgWith(4, testError);
    testClient.invokeComponentCommand(testTwinId, testInterfaceInstanceName, testCommandName, testArgument, function (err, result) {
      assert.isTrue(testClient._pl.digitalTwin.invokeComponentCommand1.calledWith(testTwinId, testInterfaceInstanceName, testCommandName, testArgument));
      assert.strictEqual(err, testError);
      testCallback();
    });
  });

  /* Tests_SRS_NODE_DIGITAL_TWIN_SERVICE_CLIENT_12_025: [The `invokeComponentCommand` method shall return a promise if there is no callback passed.]*/
  it('invokeComponentCommand shall return a promise if there is no callback passed', async () => {
    var testTwinId = 'digitalTwinId';
    var testCommandResponse = {
      result: {
        testResult: {}
      }
    };
    var testInterfaceInstanceName = 'testInterfaceInstanceName';
    var testCommandName = 'testCommandName';
    var testArgument = 123456;
    var testClient = new DigitalTwinServiceClient(testCredentials);
    testClient._pl.digitalTwin.invokeComponentCommand1 = sinon.stub().callsArgWith(4, null, testCommandResponse);
    const returnedPromise = await testClient.invokeComponentCommand(testTwinId, testInterfaceInstanceName, testCommandName, testArgument);
    assert.isNotNull(returnedPromise);
  });
});
