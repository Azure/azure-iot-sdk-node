// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
const assert = require('chai').assert;
const EventEmitter = require('events');
const sinon = require('sinon');
const sandbox = require('sinon').createSandbox();
const results = require('azure-iot-common').results;
const DigitalTwinClient = require('../dist/digital_twin_client').DigitalTwinClient;
const Client = require('azure-iot-device').Client;
const Mqtt = require('azure-iot-device-mqtt');
const BaseInterface = require('../dist/base_interface').BaseInterface;
const Telemetry = require('../dist/interface_types').Telemetry;
const Property = require('../dist/interface_types').Property;
const Command = require('../dist/interface_types').Command;


const fakeDeviceClient = {
  sendEvent: sinon.stub().callsArgWith(1, null, new results.MessageEnqueued())
};

describe('Digital Twin Client', function () {
  describe('#constructor', () => {
    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_002: [Will throw `ReferenceError` if the constructor `client` argument is falsy.] */
    [undefined, null, ''].forEach(function (client) {
      it('throws a ReferenceError if \'client\' is \'' + client + '\'', function () {
        assert.throws(() => {
          const dtClient = new DigitalTwinClient(client);
          (dtClient);
        });
      });
    });
  });

  describe('#fromConnectionString', function () {
    const fakeCapabilityModel = 'urn:fake:1';
    const fakeConnStr = 'HostName=host;DeviceId=id;SharedAccessKey=key';

    afterEach(() => {
      sandbox.restore();
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [Will throw `ReferenceError` if `capabilityModel` argument is falsy.] */
    [undefined, null, ''].forEach(function (falsyCapabilityModel) {
      it('throws a ReferenceError if \'capabilityModel\' is \'' + falsyCapabilityModel + '\'', function () {
        assert.throws(() => {
          const client = DigitalTwinClient.fromConnectionString(falsyCapabilityModel, fakeConnStr);
          (client);
        });
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [Will throw `ReferenceError` if the constructor `client` argument is falsy.] */
    [undefined, null, ''].forEach(function (falsyConnStr) {
      it('throws a ReferenceError if \'client\' is \'' + falsyConnStr + '\'', function () {
        assert.throws(() => {
          const dtClient = DigitalTwinClient.fromConnectionString(fakeCapabilityModel, falsyConnStr);
          (dtClient);
        });
      });
    });

    /* Tests_SRS_NODE_DEVICE_CLIENT_41_XXX: [The fromConnectionString method shall return a new instance of the Client object] */
    it('returns an instance of DigitalTwinClient', function () {
      const dtClient = DigitalTwinClient.fromConnectionString(fakeCapabilityModel, fakeConnStr);
      assert.instanceOf(dtClient, DigitalTwinClient);
    });

    /* Tests_SRS_NODE_DEVICE_CLIENT_41_XXX: [The fromConnectionString method shall use the internal MQTT transport by default] */
    it('uses the MQTT transport by default', function (testCallback) {
      const mqttStub = sandbox.stub(Mqtt, 'Mqtt');
      sandbox.stub(Client, 'fromConnectionString').callsFake((connStr, transport) => {
        assert.strictEqual(transport, mqttStub);
        testCallback();
      });
      DigitalTwinClient.fromConnectionString(fakeCapabilityModel, fakeConnStr);
    });

    /* Tests_SRS_NODE_DEVICE_CLIENT_41_XXX: [The fromConnectionString method shall use the internal MQTT Websockets transport if specified with a boolean parameter] */
    it('uses the MQTTWS transport if specified', function (testCallback) {
      const mqttWsStub = sandbox.stub(Mqtt, 'MqttWs');
      sandbox.stub(Client, 'fromConnectionString').callsFake((connStr, transport) => {
        assert.strictEqual(transport, mqttWsStub);
        testCallback();
      });
      DigitalTwinClient.fromConnectionString(fakeCapabilityModel, fakeConnStr, true);
    });
  });

  describe('#addInterfaceInstances', function () {
    class FakeInterface extends BaseInterface {
      constructor(name, propertyCallback, commandCallback) {
        super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
        this.temp = new Telemetry();
      }
    };

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_003: [Will throw `ReferenceError` if the `newInterfaceInstance` argument is falsy.] */
    [undefined, null, ''].forEach(function (newInterfaceInstance) {
      const dtClient = new DigitalTwinClient(fakeDeviceClient);
      it('throws a ReferenceError if \'newInterfaceInstance\' is \'' + newInterfaceInstance + '\'', () => {
        assert.throws(() => {
          dtClient.addInterfaceInstances(newInterfaceInstance);
        });
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_004: [Will throw `ReferenceError` if the `newInterfaceInstance` argument `interfaceId` property is falsy.] */
    [undefined, null, ''].forEach(function (interfaceId) {
      class BadFakeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, interfaceId, propertyCallback, commandCallback);
          this.temp = new Telemetry();
        }
      };
      const badFakeInterfaceInstance = new BadFakeInterface('badFakeInterfaceInstance');
      it('throws a ReferenceError if \'newInterfaceInstance\' \'interfaceId\` property is \'' + interfaceId + '\'', () => {
        const dtClient = new DigitalTwinClient(fakeDeviceClient);
        assert.throws(() => {
          dtClient.addInterfaceInstances(badFakeInterfaceInstance);
        });
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_005: [Will throw `ReferenceError` if the `newInterfaceInstance` argument `interfaceInstanceName` property is falsy.] */
    [undefined, null, ''].forEach(function (interfaceInstanceName) {
      const badFakeInterfaceInstance = new FakeInterface(interfaceInstanceName);
      it('throws a ReferenceError if \'newInterfaceInstance\' \'interfaceInstanceName\` property is \'' + interfaceInstanceName + '\'', () => {
        const dtClient = new DigitalTwinClient(fakeDeviceClient);
        assert.throws(() => {
          dtClient.addInterfaceInstances(badFakeInterfaceInstance);
        });
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_006: [Will throw `Error` if the `newInterfaceInstance` argument property `interfaceInstanceName` property value is used by a previously added interfaceInstance.] */
    it('throws an Error if interfaceInstance name is used in a previously added interfaceInstance', function () {
      const firstFakeInterfaceInstance = new FakeInterface('abc');
      const secondFakeInterfaceInstance = new FakeInterface('abc');
      const dtClient = new DigitalTwinClient(fakeDeviceClient);
      dtClient.addInterfaceInstances(firstFakeInterfaceInstance);
      assert.throws(() => {
        dtClient.addInterfaceInstances(secondFakeInterfaceInstance);
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_007: [Will throw `Error` if the `newInterfaceInstance` has a property of type `Command` but no defined `CommandCallback`.] */
    it('throws an Error if interface contains a command but no defined command callback', function () {
      class NoCommandCallbackInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.aCommand = new Command();
        }
      };
      const noCallbackCommand = new NoCommandCallbackInterface('abc');
      const dtClient = new DigitalTwinClient(fakeDeviceClient);
      assert.throws(() => {
        dtClient.addInterfaceInstances(noCallbackCommand);
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_008: [Will throw `Error` if the `newInterfaceInstance` has a writable property but no defined `PropertyChangedCallback`.] */
    it('throws an Error if interface contains a writable property but no defined property changed callback', function () {
      class NoChangedCallbackInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.writableProperty = new Property(true);
        }
      };
      const noChangedCallback = new NoChangedCallbackInterface('abc');
      const dtClient = new DigitalTwinClient(fakeDeviceClient);
      assert.throws(() => {
        dtClient.addInterfaceInstances(noChangedCallback);
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_009: [Will throw `TypeError` if the `newInterfaceInstance` has a property `azureDigitalTwinType` with an unrecognized type.] */
    it('throws an Error if interface contains an unknown Digital Twin property type', function () {
      class BadDigitalTwinPropertyTypeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.writableProperty = new Property(true);
          this.writableProperty.azureDigitalTwinType = 'abc';
        }
      };
      const badDigitalTwinPropertyTypeInterface = new BadDigitalTwinPropertyTypeInterface('abc');
      const dtClient = new DigitalTwinClient(fakeDeviceClient);
      assert.throws(() => {
        dtClient.addInterfaceInstances(badDigitalTwinPropertyTypeInterface);
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [Can accept a variable number of interfaces to add via the addInterfaceInstances method] */
    it('can add a variable number of interfaces', function () {
      class FakeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.writableProperty = new Property(true);
        }
      };

      const fakeInterfaceInstanceA = new FakeInterface('abc', () => {});
      const fakeInterfaceInstanceB = new FakeInterface('def', () => {});
      const fakeInterfaceInstanceC = new FakeInterface('hij', () => {});
      const dtClient = new DigitalTwinClient(fakeDeviceClient);
      dtClient.addInterfaceInstances(fakeInterfaceInstanceA, fakeInterfaceInstanceB, fakeInterfaceInstanceC);
      assert(dtClient._interfaceInstances.urn_azureiot_Client_SDKInformation.interfaceInstance.interfaceInstanceName, 'urn_azureiot_Client_SDKInformation');
      assert(dtClient._interfaceInstances.abc.interfaceInstance.interfaceInstanceName, 'abc');
      assert(dtClient._interfaceInstances.def.interfaceInstance.interfaceInstanceName, 'def');
      assert(dtClient._interfaceInstances.hij.interfaceInstance.interfaceInstanceName, 'hij');
    });
  });

  describe('#enablePropertyUpdates', () => {
    describe('gets the twin', function () {
      let dtClient;
      let registrationDeviceClient;
      let fakeInterfaceInstance;
      let fakeTwin;
      class FakeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.temp = new Telemetry();
        }
      };

      beforeEach(function () {
        fakeTwin = sinon.stub();
        registrationDeviceClient = {
          getTwin: sinon.stub().callsArgWith(0, null, fakeTwin)
        };
        fakeInterfaceInstance = new FakeInterface('abc');
        dtClient = new DigitalTwinClient(registrationDeviceClient);
        dtClient.addInterfaceInstances(fakeInterfaceInstance);
      });

      /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [`enablePropertyUpdates` will invoke the callback on success if provided] */
      it(' - invoking callback on success', function (done) {
        dtClient.enablePropertyUpdates((error) => {
          assert.isNotOk(error);
          assert(registrationDeviceClient.getTwin.calledOnce);
          assert(dtClient._twin === fakeTwin);
          done();
        });
      });

      /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [`enablePropertyUpdates` will resolve the promise if no callback is provided] */
      it(' - resolving with a promise', function (done) {
        dtClient.enablePropertyUpdates()
          .then(() => {
            assert(registrationDeviceClient.getTwin.calledOnce);
            assert(dtClient._twin === fakeTwin);
            done();
          })
          .catch(() => {
            assert.fail('Should not fail');
          });
      });
    });

    describe('Will indicate error if getting twin fails', function () {
      const twinError = new Error('Getting twin failure');
      let registrationDeviceClient;
      let dtClient;
      let fakeInterfaceInstance;
      class FakeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.temp = new Property();
        }
      };

      beforeEach(function () {
        registrationDeviceClient = {
          getTwin: sinon.stub().callsArgWith(0, twinError)
        };
        dtClient = new DigitalTwinClient(registrationDeviceClient);
        fakeInterfaceInstance = new FakeInterface('abc');
        dtClient.addInterfaceInstances(fakeInterfaceInstance);
      });

      /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [`enablePropertyUpdates` will pass an error to the callback if provided] */
      it(' - invokes callback with error object', function (done) {
        dtClient.enablePropertyUpdates((error) => {
          assert.strictEqual(error, twinError);
          return done();
        });
      });

      /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [`enablePropertyUpdates` will reject the promise if no callback is provided on error] */
      it(' - rejects the promise', function (done) {
        dtClient.enablePropertyUpdates()
          .then(() => {
            assert.fail('In Promise path, should not succeed registration');
          })
          .catch((err) => {
            assert.strictEqual(err, twinError);
            return done();
          });
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [] */
    it('will enable methods for all commands in all interfaceInstances', function (done) {
      const registrationDeviceClient = {
        getTwin: sinon.stub().callsArgWith(0, null, {
          properties: {
            reported: {
              update: sinon.stub().callsArgWith(1, null)
            },
            desired: sinon.stub()
          },
          on: sinon.stub().callsArgWith(1, '__fake_delta__')
        })
      };
      class FakeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.temp = new Command();
          this.writableProperty = new Property(true);
        }
      };
      const fakeInterfaceInstanceA = new FakeInterface('A', sinon.stub(), () => {});
      const dtClient = new DigitalTwinClient(registrationDeviceClient);
      dtClient.addInterfaceInstances(fakeInterfaceInstanceA);
      dtClient.enablePropertyUpdates().then(() => {
        assert(registrationDeviceClient.getTwin.calledOnce);
        assert(fakeInterfaceInstanceA.propertyChangedCallback.calledOnce);
        assert(fakeInterfaceInstanceA.propertyChangedCallback.calledWith(fakeInterfaceInstanceA, 'writableProperty', null, undefined, undefined));
        done();
      }).catch((err) => done(err));
    });
  });

  describe('#enableCommands', () => {
    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_012: [For each property in an interfaceInstance with type `Command`, a device method will be enabled with a name of the form '$iotin:' followed by the interfaceInstance name followed by '*' followed by the property name.] */
    it('Will enable methods for all commands in all interfaceInstances', function () {
      const registrationDeviceClient = {
        sendEvent: sinon.stub().callsArgWith(1, null),
        onDeviceMethod: sinon.stub(),
        getTwin: sinon.stub().callsArgWith(0, null, {
          properties: {
            reported: {
              update: sinon.stub().callsArgWith(1, null)
            }
          }
        })
      };
      class FakeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.temp = new Command();
        }
      };
      const fakeInterfaceInstanceA = new FakeInterface('A', () => {}, () => {});
      const fakeInterfaceInstanceB = new FakeInterface('B', () => {}, () => {});
      const dtClient = new DigitalTwinClient(registrationDeviceClient);
      dtClient.addInterfaceInstances(fakeInterfaceInstanceA);
      dtClient.addInterfaceInstances(fakeInterfaceInstanceB);
      assert.strictEqual(registrationDeviceClient.onDeviceMethod.callCount, 0);
      dtClient.enableCommands();
      assert.strictEqual(registrationDeviceClient.onDeviceMethod.callCount, 2);
      assert.strictEqual(registrationDeviceClient.onDeviceMethod.args[0][0], '$iotin:A*temp');
      assert.strictEqual(registrationDeviceClient.onDeviceMethod.args[1][0], '$iotin:B*temp');
    });
  });

  describe('#sendTelemetry', function () {
    let dtClient;
    let telemetryDeviceClient;
    let fakeInterfaceInstance;
    class FakeInterface extends BaseInterface {
      constructor(name, propertyCallback, commandCallback) {
        super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
        this.temp = new Telemetry();
        this.firstTelemetryProperty = new Telemetry();
        this.secondTelemetryProperty = new Telemetry();
        this.thirdTelemetryProperty = new Telemetry();
      }
    };

    beforeEach(function () {
      telemetryDeviceClient = {
        sendEvent: sinon.stub().callsArgWith(1, null),
        getTwin: sinon.stub().callsArgWith(0, null, {
          properties: {
            reported: {
              update: sinon.stub().callsArgWith(1, null)
            }
          }
        })
      };
      dtClient = new DigitalTwinClient(telemetryDeviceClient);
      fakeInterfaceInstance = new FakeInterface('abc');
    });

    it('sending "imploded" message with correct format - invoking callback on success', function (done) {
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.sendTelemetry(fakeInterfaceInstance, { firstTelemetryProperty: 1, thirdTelemetryProperty: 'end' }, (telemetryError) => {
        assert.isNotOk(telemetryError);
        const telemetryMessage = telemetryDeviceClient.sendEvent.lastCall.args[0];
        const telemetryPayload = JSON.parse(telemetryMessage.data);
        assert.strictEqual(telemetryPayload.firstTelemetryProperty, 1);
        assert.strictEqual(telemetryPayload.thirdTelemetryProperty, 'end');
        assert.strictEqual(Object.keys(telemetryPayload).length, 2);
        assert.strictEqual(telemetryMessage.contentType, 'application/json');
        assert.strictEqual(telemetryMessage.contentEncoding, 'utf-8');
        assert.strictEqual(telemetryMessage.properties.getValue('$.sub'), 'abc');
        done();
      });
    });

    it('sending "imploded" message with correct format - resolving with a promise', function (done) {
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.sendTelemetry(fakeInterfaceInstance, { firstTelemetryProperty: 1, thirdTelemetryProperty: 'end' })
        .then( () => {
          try {
            const telemetryMessage = telemetryDeviceClient.sendEvent.lastCall.args[0];
            const telemetryPayload = JSON.parse(telemetryMessage.data);
            assert.strictEqual(telemetryPayload.firstTelemetryProperty, 1);
            assert.strictEqual(telemetryPayload.thirdTelemetryProperty, 'end');
            assert.strictEqual(Object.keys(telemetryPayload).length, 2);
            assert.strictEqual(telemetryMessage.contentType, 'application/json');
            assert.strictEqual(telemetryMessage.contentEncoding, 'utf-8');
            assert.strictEqual(telemetryMessage.properties.getValue('$.sub'), 'abc');
            done();
          } catch (e) {
            done(e);
          }
        });
    });
  });

  describe('#commands', function () {
    let methodCallbackFunction;
    let dtClient;
    let commandDeviceClient;
    let methodResponse;
    const methodRequest = {
      payload: {
        commandRequest: {
          value: '42',
          requestId: '43'
        }
      }
    };
    class FakeInterface extends BaseInterface {
      constructor(name, propertyCallback, commandCallback) {
        super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
        this.temp = new Command();
      }
    };

    beforeEach(function () {
      methodResponse = {
        send: sandbox.stub()
      };
      commandDeviceClient = {
        sendEvent: sandbox.stub().callsArgWith(1, null, new results.MessageEnqueued()),
        onDeviceMethod: sandbox.stub().callsFake((methodName, methodCallback) => {
          (methodName);
          methodCallbackFunction = methodCallback;
        }),
        getTwin: sandbox.stub().callsArgWith(0, null, {
          properties: {
            reported: {
              update: sandbox.stub().callsArgWith(1, null)
            }
          }
        })
      };
      dtClient = new DigitalTwinClient(commandDeviceClient);
    });

    afterEach(() => {
      sandbox.restore();
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [** For commands, the `commandCallback` will be invoked with `request` and `response` arguments with the following properties.
      request:
        {
          interfaceInstance: interfaceInstance,
          interfaceInstanceName: interfaceInstance.interfaceInstanceName
          commandName: command property name
          payload: payload of request
        }

      response:
        {
          acknowledge: function that invokes device method send api with arguments
                status,
                payload,
                callback or if undefined returns a promise
          update: function that will invoke the device client send api with arguments
              device message,
              callback, or if undefined returns a promise
        }
      **]
    */
    it('invokes the supplied command handler with the appropriate request, response arguments', (done) => {
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        assert.strictEqual(commandRequest.interfaceInstance, fakeInterfaceInstance);
        assert.strictEqual(commandRequest.interfaceInstanceName, 'fakeInterfaceInstanceName');
        assert.strictEqual(commandRequest.commandName, 'temp');
        assert.strictEqual(commandRequest.payload, methodRequest.payload.commandRequest.value);
        assert(typeof commandResponse.acknowledge, 'function');
        assert(typeof commandResponse.update, 'function');
        done();
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      assert(commandDeviceClient.onDeviceMethod.calledOnce);
      methodCallbackFunction(methodRequest, methodResponse);
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `acknowledge` method and receive (if supplied) a callback upon completion.] */
    it('Can invoke the `acknowledge` method with a callback and receive a callback on success', (done) => {
      const methodResponse = {
        send: sandbox.stub().callsArgWith(2, null)
      };
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, { fake: 100 }, (err) => {
          done(err);
        });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      methodCallbackFunction(methodRequest, methodResponse);
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `acknowledge` method, with no `payload` argument, and receive (if supplied) a callback upon completion.] */
    it('Can invoke the `acknowledge` method with a callback, with no `payload` argument, and receive a callback on success', (done) => {
      const methodResponse = {
        send: sandbox.stub().callsArgWith(1, null)
      };
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, (err) => {
          done(err);
        });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_023 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `acknowledge` method with no callback and utilize the returned promise that resolves.] */
    it('Can invoke the `acknowledge` method with no callback and utilize the returned promise that resolves', (done) => {
      const methodResponse = {
        send: sandbox.stub().resolves(null)
      };
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, { fake: 100 })
          .then(done())
          .catch((err) => assert.fail('in the acknowledge catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_015 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_015 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `acknowledge` method, with no `payload` or callback arguments, and utilize the returned promise that resolves.] */
    it('Can invoke the `acknowledge` method, with no `payload` or callback arguments, and utilize the returned promise that resolves', (done) => {
      const methodResponse = {
        send: sandbox.stub().resolves(null)
      };
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200)
          .then(done())
          .catch((err) => assert.fail('in the acknowledge catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_024 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_024 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `acknowledge` method and receive (if supplied) a callback with an error if the `acknowledge` failed.] */
    it('Can invoke the `acknowledge` method with a callback and receive an error in the callback on failure', (done) => {
      const ackError = new Error('fake Error');
      const methodResponse = {
        send: sandbox.stub().callsArgWith(2, ackError)
      };
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, { fake: 100 }, (err) => {
          assert.strictEqual(err, ackError);
          done();
        });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_016 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `acknowledge` method, with no `payload` argument, and receive (if supplied) a callback with an error if the `acknowledge` failed.] */
    it('Can invoke the `acknowledge` method with a callback, with no payload argument, and receive an error in the callback on failure', (done) => {
      const ackError = new Error('fake Error');
      const methodResponse = {
        send: sandbox.stub().callsArgWith(1, ackError)
      };
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, (err) => {
          assert.strictEqual(err, ackError);
          done();
        });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_025 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `acknowledge` method with no callback and utilize the returned promise that rejects.] */
    it('Can invoke the `acknowledge` method with no callback and utilize the returned promise that rejects', (done) => {
      const ackError = new Error('fake error');
      const methodResponse = {
        send: sandbox.stub().rejects(ackError)
      };
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, { fake: 100 })
          .then(() => assert.fail('Should NOT be in the acknowledge .then of SRS_NODE_DIGITAL_TWIN_DEVICE_06_017'))
          .catch((err) => {
            assert.strictEqual(err, ackError);
            done();
          });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_017 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `acknowledge` method, with no `payload` argument, and utilize the returned promise with a rejection.] */
    it('Can invoke the `acknowledge` method, with no `payload` or callback arguments, utilize the returned promise that rejects', (done) => {
      const ackError = new Error('fake error');
      const methodResponse = {
        send: sandbox.stub().rejects(ackError)
      };
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200)
          .then(() => assert.fail('Should NOT be in the acknowledge .then of SRS_NODE_DIGITAL_TWIN_DEVICE_06_026'))
          .catch((err) => {
            assert.strictEqual(err, ackError);
            done();
          });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `update` method and receive (if supplied) a callback upon completion.] */
    it('Can invoke the `update` method with a callback and receive a callback on success', (done) => {
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, { fake: 100 }, (err) => {
          done(err);
        });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `update` method, with no `payload` argument, and receive (if supplied) a callback upon completion.] */
    it.skip('Can invoke the `update` method with a callback, with no `payload` argument, and receive a callback on success', (done) => {
      // Skip for now since the update has payload as required.
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, (err) => {
          done(err);
        });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_027 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `update` method with no callback and utilize the returned promise that resolves.] */
    it('Can invoke the `update` method with no callback and utilize the returned promise that resolves', (done) => {
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, { fake: 100 })
          .then(done())
          .catch((err) => assert.fail('in the update catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_019 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        commandDeviceClient.sendEvent.onCall(0).resolves(null);
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_019 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_028: [The command callback should be able to invoke the `update` method, with no `payload` or callback arguments, and utilize the returned promise that resolves.] */
    it.skip('Can invoke the `update` method, with no `payload` or callback arguments, and utilize the returned promise that resolves', (done) => {
      // Skip for now since the update has payload as required.
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200)
          .then(done())
          .catch((err) => assert.fail('in the update catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_028 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        commandDeviceClient.sendEvent.onCall(0).resolves(null);
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_028 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `update` method and receive (if supplied) a callback with an error if the `update` failed.] */
    it('Can invoke the `update` method with a callback and receive an error in the callback on failure', (done) => {
      const updateError = new Error('fake Error');
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, { fake: 100 }, (err) => {
          assert.strictEqual(err, updateError);
          done();
        });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        commandDeviceClient.sendEvent.onCall(0).callsArgWith(1, updateError);
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_020 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `update` method, with no `payload` argument, and receive (if supplied) a callback with an error if the `update` failed.] */
    it.skip('Can invoke the `update` method with a callback, with no payload argument, and receive an error in the callback on failure', (done) => {
      // Skip for now since the update has payload as required.
      const updateError = new Error('fake Error');
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, (err) => {
          assert.strictEqual(err, updateError);
          done();
        });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        commandDeviceClient.sendEvent.onCall(0).callsArgWith(1, updateError);
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_029 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `update` method with no callback and utilize the returned promise that rejects.] */
    it('Can invoke the `update` method with no callback and utilize the returned promise that rejects', (done) => {
      const updateError = new Error('fake error');
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, { fake: 100 })
          .then(
            () => assert.fail('Should NOT be in the update .then of SRS_NODE_DIGITAL_TWIN_DEVICE_06_021'))
          .catch((err) => {
            let error;
            try {
              assert.strictEqual(err, updateError);
            } catch (e) {
              error = e;
            }
            done(error);
          });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        commandDeviceClient.sendEvent.onCall(0).callsArgWith(1, updateError);
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_021 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [The command callback should be able to invoke the `update` method, with no `payload` or callback arguments, and utilize the returned promise that rejects.] */
    it.skip('Can invoke the `update` method, with no `payload` or callback arguments, and utilize the returned promise that rejects', (done) => {
      // Skip for now since the update has payload as required.
      const updateError = new Error('fake error');
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200)
          .then(() => assert.fail('Should NOT be in the update .then of SRS_NODE_DIGITAL_TWIN_DEVICE_06_030'))
          .catch((err) => {
            assert.strictEqual(err, updateError);
            done();
          });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        commandDeviceClient.sendEvent.onCall(0).callsArgWith(1, updateError);
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_030 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /*
      Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [Within the command callback, the application can invoke the `update` method which in turn will invoke the device client `sendEvent` method with the following message:
      payload:
      This JSON stringified value of the payload parameter.

      message application properties:
      'iothub-message-schema' : 'asyncResult'
      'iothub-command-name': <command name>
      'iothub-command-request-id': request.payload.commandRequest.requestId of the method request
      'iothub-command-statuscode': statusCode argument of the update method
      '$.sub': interfaceInstances name
      contentType: 'application/json'
      contentEncoding: 'utf-8'
      ]
     */
    it('Invoking the `update` method will produce the appropriately formated telemetry message', (done) => {
      let flag = false;
      const payload = { fake: 100 };
      const commandCallback = sandbox.stub().callsFake((commandRequest, commandResponse) => {
        commandResponse.update(200, payload, (err) => {
          assert(commandCallback.calledOnce, 'commandCallback called multiple times. Another test further down may potentially be calling this test.');
          if (err || !flag) {
            done('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_022 with err: ' + ((err) ? (err.toString()) : ('message not checked.')));
          } else {
            done();
          }
        });
      });
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, commandCallback);
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      try {
        commandDeviceClient.sendEvent.onCall(0).callsFake((message, fakeDone) => {
          flag = true;
          assert.strictEqual(message.data.toString(), JSON.stringify(payload));
          assert.strictEqual(message.contentType, 'application/json');
          assert.strictEqual(message.contentEncoding, 'utf-8');
          assert.strictEqual(message.properties.getValue('iothub-message-schema'), 'asyncResult');
          assert.strictEqual(message.properties.getValue('iothub-command-request-id'), '43');
          assert.strictEqual(message.properties.getValue('iothub-command-statuscode'), '200');
          assert.strictEqual(message.properties.getValue('$.sub'), 'fakeInterfaceInstanceName');
          fakeDone();
        });
        methodCallbackFunction(methodRequest, methodResponse);
      } catch (err) {
        assert.fail('in the enableCommands catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_022 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
      }
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [Within the command callback, the application can invoke the `update` method, with no `payload` argument or payload argument set to undefined or null, which in turn will invoke the device client `sendEvent` method with a message payload of 'null'. ] */
    it('Invoking update with payload that is undefined or null will produce a null payload.', function (done) {
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, undefined, (err) => {
          done(err);
        });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enableCommands();
      commandDeviceClient.sendEvent = () => {};
      sandbox.stub(commandDeviceClient, 'sendEvent').callsFake((message, fakeDone) => {
        assert.strictEqual(message.data.toString(), JSON.stringify(null));
        fakeDone();
      });
      methodCallbackFunction(methodRequest, methodResponse);
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_031: [Within the command callback, the application can invoke the `update` method, with no `payload` argument or payload argument set to undefined or null, which in turn will invoke the device client `sendEvent` method with a message payload of 'null'. ] */
    it.skip('Invoking update with no payload will produce a null payload.', function (done) {
      const fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstanceName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, (err) => {
          done(err);
        });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.register()
        .then(() => {
          commandDeviceClient.sendEvent = () => {};
          sandbox.stub(commandDeviceClient, 'sendEvent').callsFake((message, fakeDone) => {
            assert.strictEqual(message.data.toString(), JSON.stringify(null));
            fakeDone();
          });
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_031 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });
  });

  describe('#properties (writable)', function () {
    let dtClient;
    let propertyDeviceClient;
    let fakeInterfaceInstance;
    let aTwin;
    const initialTestPropertyValue = 43;
    const initialDesiredVersion = 44;
    const testStatusCode = 200;
    const testDescription = 'A fake Description';
    const interfaceInstanceProperty = '$iotin:fakeInterfaceInstance';
    const testPropertyName = 'testProperty';
    const versionPropertyName = '$version';
    class FakeInterface extends BaseInterface {
      constructor(name, propertyCallback, commandCallback) {
        super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
        this.testProperty = new Property(true);
      }
    };

    beforeEach(function () {
      aTwin = new EventEmitter();
      aTwin.properties = {
        reported: {
          [interfaceInstanceProperty]: {
          },
          update: sinon.stub().callsArgWith(1, null),
        },
        desired: {
          [interfaceInstanceProperty]: {
            [testPropertyName]: {
              value: initialTestPropertyValue
            }
          },
          [versionPropertyName]: initialDesiredVersion
        }
      };
      propertyDeviceClient = {
        sendEvent: sinon.stub().callsArgWith(1, null, new results.MessageEnqueued()),
        onDeviceMethod: () => {},
        getTwin: sinon.stub().callsArgWith(0, null, aTwin)
      };
      dtClient = new DigitalTwinClient(propertyDeviceClient);
      fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstance', (interfaceObject, propertyName, reportedValue, desiredValue, version) => {
        return;
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [Subsequent to the enablePropertyUpdates, a writable property will have an event listener on the `properties.desired.$iotin:<interfaceInstanceName>.<propertyName>`] */
    it('Subsequent to enablePropertyUpdates, there will be an event listener for the writable property on the twin', (done) => {
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enablePropertyUpdates()
        .then(() => {
          assert.strictEqual(dtClient._twin.listeners('properties.desired.' + interfaceInstanceProperty + '.' + testPropertyName).length, 1);
          done();
        })
        .catch((err) => assert.fail('in the enablePropertyUpdates catch of SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [Following the initial get of the twin, the writable properties will have their desired values retrieved, provided they exist, provided to the property changed callback along with the current desired version value.] */
    it('Initially, if it exists, get the desired writable property and provide it and the version, to the property change callback', (done) => {
      fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstance', (interfaceObject, propertyName, reportedValue, desiredValue, version) => {
        assert.strictEqual(version, initialDesiredVersion);
        assert.strictEqual(desiredValue, initialTestPropertyValue);
        assert.isNotOk(reportedValue);
        done();
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enablePropertyUpdates()
        .catch((err) => assert.fail('in the enablePropertyUpdates catch of SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [Initially, if it exists, provide the reported property also to the property change callback.] */
    it('Initially, if it exists, provide the reported property also to the property change callback', (done) => {
      const reportedPropertyTestValue = 47;
      //
      // The default twin created for each test doesn't have a pre-populated
      // reported value.
      //
      // For this particular test, we stick one into the twin before registration.
      // This way it will be picked up on the initial pass.  The twin is recreated
      // for each test so this won't pollute further tests.
      //
      aTwin.properties.reported[interfaceInstanceProperty][testPropertyName] = { value: reportedPropertyTestValue };
      fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstance', (interfaceObject, propertyName, reportedValue, desiredValue, version) => {
        //
        // This callback is invoked on the initial invocation.
        //
        assert.strictEqual(reportedValue, reportedPropertyTestValue);
        done();
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      dtClient.enablePropertyUpdates()
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_037 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [Properties may invoke the method `report` with a value to produce a patch to the reported properties.] */
    it('Properties may invoke a `report` method to patch the value of the property in the `reported` branch of the device twin', (done) => {
      fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstance', (interfaceObject, propertyName, reportedValue, desiredValue, version) => {
        const obj = {};
        obj[propertyName] = desiredValue;
        dtClient.report(interfaceObject, obj)
          .then(() => done())
          .catch((err) => {
            const doneErr = new Error('in the report catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_038 with err: ' + ((err) ? (err.toString()) : ('null err provided')));
            done(doneErr);
          });
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      aTwin.properties.reported.update = sinon.stub().callsArgWith(1, null).onCall(0).callsFake((patch, callback) => {
        assert.deepEqual(patch, { [interfaceInstanceProperty]: { [testPropertyName]: { 'value': initialTestPropertyValue } } });
        callback();
      });
      dtClient.enablePropertyUpdates()
        .catch((err) => done('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_038 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [Properties may invoke the method `report` with a value and a response object to produce a patch to the reported properties.] */
    it('Properties also may invoke the `report` method with a response object ', (done) => {
      fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstance', (interfaceObject, propertyName, reportedValue, desiredValue, version) => {
        const obj = {};
        obj[propertyName] = desiredValue;
        dtClient.report(interfaceObject, obj, { code: testStatusCode, description: testDescription, version: version })
          .then(() => done())
          .catch((err) => done('in the report catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_039 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      aTwin.properties.reported.update = sinon.stub().callsArgWith(1, null).onCall(0).callsFake((patch, callback) => {
        assert.deepEqual(patch, { [interfaceInstanceProperty]: { [testPropertyName]: { 'value': initialTestPropertyValue, 'ac': testStatusCode, 'ad': testDescription, 'av': initialDesiredVersion } } });
        callback();
      });
      dtClient.enablePropertyUpdates()
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_039 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_41_XXX: [A change to the desired property will invoke the property change callback with the change value and version.] */
    it('Property change callback invoked on change to property. No reported value given.', (done) => {
      const callCountStub = sinon.stub();
      const doneOnSecondInvocation = sinon.stub().onSecondCall().callsFake(() => {
        assert.strictEqual(callCountStub.callCount, 2, 'Not all assert paths have been called. Make sure the test is working properly.');
        done();
      });
      fakeInterfaceInstance = new FakeInterface('fakeInterfaceInstance', (interfaceObject, propertyName, reportedValue, desiredValue, version) => {
        //
        // We should never see a reported value.  This is because initially there isn't a reported value because
        // the twin we use is created "fresh" for each test.
        //
        // The only other call to this property change handler should happen from simulating a delta change.
        // Delta changes should never provide the value of reported properties.
        //
        assert.isNotOk(reportedValue);
        const obj = {};
        obj[propertyName] = desiredValue;
        dtClient.report(interfaceObject, obj, { code: testStatusCode, description: testDescription, version: version })
          .then(doneOnSecondInvocation)
          .catch((err) => done(err));
      });
      dtClient.addInterfaceInstances(fakeInterfaceInstance);
      //
      // The below stub is there to handle calls to the *device* clients twin update function.
      //
      // The .onCall(0) is referring to the original invocation for properties that happens right after we
      // get the twin originally.
      //
      // The next .onCall happens as the result of simulating the delta patch.
      //
      aTwin.properties.reported.update = sinon.stub().callsArgWith(1, null)
        .onCall(0).callsFake((patch, callback) => {
          //
          // We are doing the below to simulate an actual patch.  We are doing this
          // so that there is an actual reported value for this property.  Having a value
          // here to sniff out if reported values are sneaking into the change callback.
          //
          aTwin.properties.reported[interfaceInstanceProperty] = patch[interfaceInstanceProperty];
          callback();
        })
        .onCall(1).callsFake((patch, callback) => {
          callCountStub();
          assert.deepEqual(patch, { [interfaceInstanceProperty]: { [testPropertyName]: { 'value': initialTestPropertyValue, 'ac': testStatusCode, 'ad': testDescription, 'av': 2*initialDesiredVersion } } });
          callback();
        });
      dtClient.enablePropertyUpdates()
        .then(() => {
          callCountStub();
          assert(aTwin.properties.reported[interfaceInstanceProperty][testPropertyName].value, initialTestPropertyValue);
          aTwin.properties.desired[versionPropertyName] = 2*initialDesiredVersion;
          //
          // This is simulating a delta change.
          //
          aTwin.emit('properties.desired.' + interfaceInstanceProperty + '.' + testPropertyName, aTwin.properties.desired[interfaceInstanceProperty][testPropertyName]);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_040 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });
  });
});
