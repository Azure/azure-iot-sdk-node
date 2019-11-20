// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
const assert = require('chai').assert;
const EventEmitter = require('events');
const sinon = require('sinon');
const results = require('azure-iot-common').results;
const DigitalTwinClient = require('../dist/digital_twin_client').DigitalTwinClient;
const BaseInterface = require('../dist/base_interface').BaseInterface;
const Telemetry = require('../dist/interface_types').Telemetry;
const Property = require('../dist/interface_types').Property;
const Command = require('../dist/interface_types').Command;


const fakeDeviceClient = {
  sendEvent: sinon.stub().callsArgWith(1, null, new results.MessageEnqueued())
};

describe('Digital Twin Client', function () {
  describe('#constructor', () => {
    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_001: [Will throw `ReferenceError` if `capabilityModel` argument is falsy.] */
    [undefined, null, ''].forEach(function (capabilityModel) {
      it('throws a ReferenceError if \'capabilityModel\' is ' + capabilityModel + '\'', function () {
        assert.throws(() => {
          const client = new DigitalTwinClient(capabilityModel, fakeDeviceClient);
          (client);
        });
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_002: [Will throw `ReferenceError` if the constructor `client` argument is falsy.] */
    [undefined, null, ''].forEach(function (client) {
      it('throws a ReferenceError if \'client\' is ' + client + '\'', function () {
        assert.throws(() => {
          const dtClient = new DigitalTwinClient('urn:abc:1', client);
          (dtClient);
        });
      });
    });
  });

  describe('#addComponent', function () {
    class FakeInterface extends BaseInterface {
      constructor(name, propertyCallback, commandCallback) {
        super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
        this.temp = new Telemetry();
      }
    };

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_003: [Will throw `ReferenceError` if the `newComponent` argument is falsy.] */
    [undefined, null, ''].forEach(function (newComponent) {
      const dtClient = new DigitalTwinClient('urn:abc:1', fakeDeviceClient);
      it('throws a ReferenceError if \'newComponent\' is ' + newComponent + '\'', () => {
        assert.throws(() => {
          dtClient.addComponent(newComponent);
        });
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_004: [Will throw `ReferenceError` if the `newComponent` argument `interfaceId` property is falsy.] */
    [undefined, null, ''].forEach(function (interfaceId) {
      class BadFakeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, interfaceId, propertyCallback, commandCallback);
          this.temp = new Telemetry();
        }
      };
      const badFakeComponent = new BadFakeInterface('badFakeComponent');
      it('throws a ReferenceError if \'newComponent\' \'interfaceId\` property is ' + interfaceId + '\'', () => {
        const dtClient = new DigitalTwinClient('urn:abc:1', fakeDeviceClient);
        assert.throws(() => {
          dtClient.addComponent(badFakeComponent);
        });
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_005: [Will throw `ReferenceError` if the `newComponent` argument `componentName` property is falsy.] */
    [undefined, null, ''].forEach(function (componentName) {
      const badFakeComponent = new FakeInterface(componentName);
      it('throws a ReferenceError if \'newComponent\' \'componentName\` property is ' + componentName + '\'', () => {
        const dtClient = new DigitalTwinClient('urn:abc:1', fakeDeviceClient);
        assert.throws(() => {
          dtClient.addComponent(badFakeComponent);
        });
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_006: [Will throw `Error` if the `newComponent` argument property `componentName` property value is used by a previously added component.] */
    it('throws an Error if component name is used in a previously added component', function () {
      const firstFakeComponent = new FakeInterface('abc');
      const secondFakeComponent = new FakeInterface('abc');
      const dtClient = new DigitalTwinClient('urn:abc:1', fakeDeviceClient);
      dtClient.addComponent(firstFakeComponent);
      assert.throws(() => {
        dtClient.addComponent(secondFakeComponent);
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_007: [Will throw `Error` if the `newComponent` has a property of type `Command` but no defined `CommandCallback`.] */
    it('throws an Error if interface contains a command but no defined command callback', function () {
      class NoCommandCallbackInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.aCommand = new Command();
        }
      };
      const noCallbackCommand = new NoCommandCallbackInterface('abc');
      const dtClient = new DigitalTwinClient('urn:abc:1', fakeDeviceClient);
      assert.throws(() => {
        dtClient.addComponent(noCallbackCommand);
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_008: [Will throw `Error` if the `newComponent` has a writable property but no defined `PropertyChangedCallback`.] */
    it('throws an Error if interface contains a writable property but no defined property changed callback', function () {
      class NoChangedCallbackInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.writableProperty = new Property(true);
        }
      };
      const noChangedCallback = new NoChangedCallbackInterface('abc');
      const dtClient = new DigitalTwinClient('urn:abc:1', fakeDeviceClient);
      assert.throws(() => {
        dtClient.addComponent(noChangedCallback);
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_009: [Will throw `TypeError` if the `newComponent` has a property `azureDigitalTwinType` with an unrecognized type.] */
    it('throws an Error if interface contains an unknown Digital Twin property type', function () {
      class BadDigitalTwinPropertyTypeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.writableProperty = new Property(true);
          this.writableProperty.azureDigitalTwinType = 'abc';
        }
      };
      const badDigitalTwinPropertyTypeInterface = new BadDigitalTwinPropertyTypeInterface('abc');
      const dtClient = new DigitalTwinClient('urn:abc:1', fakeDeviceClient);
      assert.throws(() => {
        dtClient.addComponent(badDigitalTwinPropertyTypeInterface);
      });
    });
  });

  describe('#register', () => {
    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_010: [** Will send a telemetry message with the following properties and payload to perform the registration:
      payload:
      {modelInformation:
        capabilityModelId: <capabilityModelURN>,
        interfaces: {
          <componentName>: <interfaceId>
        }
      }
      message application properties:
      $.ifid : 'urn:azureiot:ModelDiscovery:ModelInformation:1'
      $.ifname: 'urn_azureiot_ModelDiscovery_ModelInformation'
      $.schema: 'modelInformation'
      contentType: 'application/json'
      **]
    */
    describe('sends a correctly formatted registration event', function () {
      let dtClient;
      let registrationDeviceClient;
      let fakeComponent;
      class FakeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.temp = new Telemetry();
        }
      };

      const validateMessage = (done) => {
        const registrationMessage = registrationDeviceClient.sendEvent.args[0][0];
        const registrationPayload = JSON.parse(registrationMessage.data);
        assert.isOk(registrationPayload.modelInformation);
        assert.strictEqual(registrationPayload.modelInformation.capabilityModelId, 'urn:abc:1');
        assert.isOk(registrationPayload.modelInformation.interfaces);
        assert.isOk(registrationPayload.modelInformation.interfaces['abc']);
        assert.strictEqual(registrationPayload.modelInformation.interfaces['abc'], 'urn:contoso:com:something:1');
        assert.strictEqual(registrationMessage.contentType, 'application/json');
        assert.strictEqual(registrationMessage.properties.getValue('$.ifid'), 'urn:azureiot:ModelDiscovery:ModelInformation:1');
        assert.strictEqual(registrationMessage.properties.getValue('$.ifname'), 'urn_azureiot_ModelDiscovery_ModelInformation');
        assert.strictEqual(registrationMessage.properties.getValue('$.schema'), 'modelInformation');
        done();
      };

      beforeEach(function () {
        registrationDeviceClient = {
          sendEvent: sinon.stub().callsArgWith(1, null, new results.MessageEnqueued()),
          getTwin: sinon.stub().callsArgWith(0, null, {
            properties: {
              reported: {
                update: sinon.stub().callsArgWith(1, null)
              }
            }
          })
        };
        fakeComponent = new FakeInterface('abc');
        dtClient = new DigitalTwinClient('urn:abc:1', registrationDeviceClient);
        dtClient.addComponent(fakeComponent);
      });

      it(' - invoking callback on success', function (done) {
        dtClient.register((error) => {
          assert.isNotOk(error);
          validateMessage(done);
        });
      });

      it(' - resolving with a promise', function (done) {
        dtClient.register()
          .then(validateMessage(done))
          .catch(assert.fail('Should not fail registration'));
      });
    });

    describe('Will succeed despite failure reporting SDK Information', function () {
      const reportError = new Error('Error reported property');
      let dtClient;
      let twin;
      let registrationDeviceClient;
      let fakeComponent;
      class FakeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.temp = new Property();
        }
      };

      beforeEach(function () {
        twin = {
          properties: {
            reported: {
              update: sinon.stub().callsArgWith(1, reportError)
            }
          }
        };
        registrationDeviceClient = {
          sendEvent: sinon.stub().callsArgWith(1, null, new results.MessageEnqueued()),
          getTwin: sinon.stub().callsArgWith(0, null, twin)
        };
        fakeComponent = new FakeInterface('abc');
        dtClient = new DigitalTwinClient('urn:abc:1', registrationDeviceClient);
        dtClient.addComponent(fakeComponent);
      });

      it(' - invoking callback on success', function (done) {
        dtClient.register((error) => {
          assert.isNotOk(error);
          assert.strictEqual(twin.properties.reported.update.callCount, 3);
          done();
        });
      });
    });

    describe('Will indicate error if sending registration message fails', function () {
      let dtClient;
      let registrationDeviceClient;
      let fakeComponent;
      const sendError = new Error('failed registration');

      class FakeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.temp = new Telemetry();
        }
      };

      beforeEach(function () {
        registrationDeviceClient = {
          sendEvent: sinon.stub().callsArgWith(1, sendError)
        };
        dtClient = new DigitalTwinClient('urn:abc:1', registrationDeviceClient);
        fakeComponent = new FakeInterface('abc');
        dtClient.addComponent(fakeComponent);
      });

      it(' - invokes callback with error object', function (done) {
        dtClient.register((error) => {
          assert.strictEqual(error, sendError);
          return done();
        });
      });

      it(' - rejects the promise', function (done) {
        dtClient.register()
          .then(() => {
            assert.fail('In Promise path, should not succeed registration');
          })
          .catch((err) => {
            assert.strictEqual(err, sendError);
            return done();
          });
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_012: [For each property in a component with type `Command`, a device method will be enabled with a name of the form '$iotin:' followed by the component name followed by '*' followed by the property name.] */
    it('Will enable methods for all commands in all components', function (done) {
      const registrationDeviceClient = {
        sendEvent: sinon.stub().callsArgWith(1, null, new results.MessageEnqueued()),
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
      const fakeComponentA = new FakeInterface('A', () => {}, () => {});
      const fakeComponentB = new FakeInterface('B', () => {}, () => {});
      const dtClient = new DigitalTwinClient('urn:abc:1', registrationDeviceClient);
      dtClient.addComponent(fakeComponentA);
      dtClient.addComponent(fakeComponentB);
      assert.strictEqual(registrationDeviceClient.onDeviceMethod.callCount, 0);
      dtClient.register().then(() => {
        assert.strictEqual(registrationDeviceClient.onDeviceMethod.callCount, 2);
        assert.strictEqual(registrationDeviceClient.onDeviceMethod.args[0][0], '$iotin:A*temp');
        assert.strictEqual(registrationDeviceClient.onDeviceMethod.args[1][0], '$iotin:B*temp');
        done();
      });
    });

    describe('Will indicate error if getting twin fails', function () {
      const twinError = new Error('Getting twin failure');
      let registrationDeviceClient;
      let dtClient;
      let fakeComponent;
      class FakeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.temp = new Property();
        }
      };

      beforeEach(function () {
        registrationDeviceClient = {
          sendEvent: sinon.stub().callsArgWith(1, null, new results.MessageEnqueued()),
          onDeviceMethod: sinon.stub(),
          getTwin: sinon.stub().callsArgWith(0, twinError)
        };
        dtClient = new DigitalTwinClient('urn:abc:1', registrationDeviceClient);
        fakeComponent = new FakeInterface('abc');
        dtClient.addComponent(fakeComponent);
      });

      it(' - invokes callback with error object', function (done) {
        dtClient.register((error) => {
          assert.strictEqual(error, twinError);
          return done();
        });
      });

      it(' - rejects the promise', function (done) {
        dtClient.register()
          .then(() => {
            assert.fail('In Promise path, should not succeed registration');
          })
          .catch((err) => {
            assert.strictEqual(err, twinError);
            return done();
          });
      });
    });
  });

  describe('#telemetry', function () {
    let dtClient;
    let telemetryDeviceClient;
    let fakeComponent;
    class FakeInterface extends BaseInterface {
      constructor(name, propertyCallback, commandCallback) {
        super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
        this.temp = new Telemetry();
      }
    };

    beforeEach(function () {
      telemetryDeviceClient = {
        sendEvent: sinon.stub().callsArgWith(1, null, new results.MessageEnqueued()),
        getTwin: sinon.stub().callsArgWith(0, null, {
          properties: {
            reported: {
              update: sinon.stub().callsArgWith(1, null)
            }
          }
        })
      };
      dtClient = new DigitalTwinClient('urn:abc:1', telemetryDeviceClient);
      fakeComponent = new FakeInterface('abc');
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_032: [** A telemetry will send a device message with the following format:
      payload: {<telemetry property name>: value}
      message application properties:
      contentType: 'application/json'
      $.ifid: <interface id>
      $.ifname: <component name>
      $.schema: <telemetry property name>
      **]
    */
    it('sending message with correct format - invoking callback on success', function (done) {
      dtClient.addComponent(fakeComponent);
      dtClient.register((error) => {
        assert.isNotOk(error);
        fakeComponent.temp.send(42, (telemetryError) => {
          const telemetryName = 'temp';
          assert.isNotOk(telemetryError);
          const telemetryMessage = telemetryDeviceClient.sendEvent.args[1][0];
          const telemetryPayload = JSON.parse(telemetryMessage.data);
          assert.isOk(telemetryPayload[telemetryName]);
          assert.strictEqual(telemetryPayload[telemetryName], 42);
          assert.strictEqual(telemetryMessage.contentType, 'application/json');
          assert.strictEqual(telemetryMessage.properties.getValue('$.ifid'), 'urn:contoso:com:something:1');
          assert.strictEqual(telemetryMessage.properties.getValue('$.ifname'), 'abc');
          assert.strictEqual(telemetryMessage.properties.getValue('$.schema'), telemetryName);
          done();
        });
      });
    });

    it(' - resolving with a promise', function (done) {
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          fakeComponent.temp.send(44)
            .then( () => {
              const telemetryName = 'temp';
              const telemetryMessage = telemetryDeviceClient.sendEvent.args[1][0];
              const telemetryPayload = JSON.parse(telemetryMessage.data);
              assert.isOk(telemetryPayload[telemetryName]);
              assert.strictEqual(telemetryPayload[telemetryName], 44);
              return done();
            });
        });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_034: [** Subsequent to addComponent a Telemetry will have a report method. **] */
    it('Subsequent to adding the component, a Telemetry will have a send method', (done) => {
      assert(!fakeComponent.temp.send);
      dtClient.addComponent(fakeComponent);
      assert(fakeComponent.temp.send);
      assert(typeof fakeComponent.temp.send === 'function');
      done();
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
        send: sinon.stub()
      };
      commandDeviceClient = {
        sendEvent: sinon.stub().callsArgWith(1, null, new results.MessageEnqueued()),
        onDeviceMethod: sinon.stub().callsFake((methodName, methodCallback) => {
          (methodName);
          methodCallbackFunction = methodCallback;
        }),
        getTwin: sinon.stub().callsArgWith(0, null, {
          properties: {
            reported: {
              update: sinon.stub().callsArgWith(1, null)
            }
          }
        })
      };
      dtClient = new DigitalTwinClient('urn:abc:1', commandDeviceClient);
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_013: [** For commands, the `commandCallback` will be invoked with `request` and `response` arguments with the following properties.
      request:
        {
          component: component,
          componentName: component.componentName
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
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        assert.strictEqual(commandRequest.component, fakeComponent);
        assert.strictEqual(commandRequest.componentName, 'fakeComponentName');
        assert.strictEqual(commandRequest.commandName, 'temp');
        assert.strictEqual(commandRequest.payload, methodRequest.payload.commandRequest.value);
        assert(typeof commandResponse.acknowledge, 'function');
        assert(typeof commandResponse.update, 'function');
        done();
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register().then(() => {
        assert(commandDeviceClient.onDeviceMethod.calledOnce);
        methodCallbackFunction(methodRequest, methodResponse);
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_014: [The command callback should be able to invoke the `acknowledge` method and receive (if supplied) a callback upon completion.] */
    it('Can invoke the `acknowledge` method with a callback and receive a callback on success', (done) => {
      const methodResponse = {
        send: sinon.stub().callsArgWith(2, null)
      };
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, { fake: 100 }, (err) => {
          done(err);
        });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register().then(() => {
        methodCallbackFunction(methodRequest, methodResponse);
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_023: [The command callback should be able to invoke the `acknowledge` method, with no `payload` argument, and receive (if supplied) a callback upon completion.] */
    it('Can invoke the `acknowledge` method with a callback, with no `payload` argument, and receive a callback on success', (done) => {
      const methodResponse = {
        send: sinon.stub().callsArgWith(1, null)
      };
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, (err) => {
          done(err);
        });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register().then(() => {
        methodCallbackFunction(methodRequest, methodResponse);
      }).catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_023 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_015: [The command callback should be able to invoke the `acknowledge` method with no callback and utilize the returned promise that resolves.] */
    it('Can invoke the `acknowledge` method with no callback and utilize the returned promise that resolves', (done) => {
      const methodResponse = {
        send: sinon.stub().resolves(null)
      };
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, { fake: 100 })
          .then(done())
          .catch((err) => assert.fail('in the acknowledge catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_015 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_015 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_024: [The command callback should be able to invoke the `acknowledge` method, with no `payload` or callback arguments, and utilize the returned promise that resolves.] */
    it('Can invoke the `acknowledge` method, with no `payload` or callback arguments, and utilize the returned promise that resolves', (done) => {
      const methodResponse = {
        send: sinon.stub().resolves(null)
      };
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200)
          .then(done())
          .catch((err) => assert.fail('in the acknowledge catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_024 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_024 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_016: [The command callback should be able to invoke the `acknowledge` method and receive (if supplied) a callback with an error if the `acknowledge` failed.] */
    it('Can invoke the `acknowledge` method with a callback and receive an error in the callback on failure', (done) => {
      const ackError = new Error('fake Error');
      const methodResponse = {
        send: sinon.stub().callsArgWith(2, ackError)
      };
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, { fake: 100 }, (err) => {
          assert.strictEqual(err, ackError);
          done();
        });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_016 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_025: [The command callback should be able to invoke the `acknowledge` method, with no `payload` argument, and receive (if supplied) a callback with an error if the `acknowledge` failed.] */
    it('Can invoke the `acknowledge` method with a callback, with no payload argument, and receive an error in the callback on failure', (done) => {
      const ackError = new Error('fake Error');
      const methodResponse = {
        send: sinon.stub().callsArgWith(1, ackError)
      };
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, (err) => {
          assert.strictEqual(err, ackError);
          done();
        });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_025 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_017: [The command callback should be able to invoke the `acknowledge` method with no callback and utilize the returned promise that rejects.] */
    it('Can invoke the `acknowledge` method with no callback and utilize the returned promise that rejects', (done) => {
      const ackError = new Error('fake error');
      const methodResponse = {
        send: sinon.stub().rejects(ackError)
      };
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, { fake: 100 })
          .then(() => assert.fail('Should NOT be in the acknowledge .then of SRS_NODE_DIGITAL_TWIN_DEVICE_06_017'))
          .catch((err) => {
            assert.strictEqual(err, ackError);
            done();
          });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_017 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_026: [The command callback should be able to invoke the `acknowledge` method, with no `payload` argument, and utilize the returned promise with a rejection.] */
    it('Can invoke the `acknowledge` method, with no `payload` or callback arguments, utilize the returned promise that rejects', (done) => {
      const ackError = new Error('fake error');
      const methodResponse = {
        send: sinon.stub().rejects(ackError)
      };
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200)
          .then(() => assert.fail('Should NOT be in the acknowledge .then of SRS_NODE_DIGITAL_TWIN_DEVICE_06_026'))
          .catch((err) => {
            assert.strictEqual(err, ackError);
            done();
          });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_026 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_018: [The command callback should be able to invoke the `update` method and receive (if supplied) a callback upon completion.] */
    it('Can invoke the `update` method with a callback and receive a callback on success', (done) => {
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, { fake: 100 }, (err) => {
          done(err);
        });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_018 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_027: [The command callback should be able to invoke the `update` method, with no `payload` argument, and receive (if supplied) a callback upon completion.] */
    it.skip('Can invoke the `update` method with a callback, with no `payload` argument, and receive a callback on success', (done) => {
      // Skip for now since the update has payload as required.
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.acknowledge(200, (err) => {
          done(err);
        });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_027 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_019: [The command callback should be able to invoke the `update` method with no callback and utilize the returned promise that resolves.] */
    it('Can invoke the `update` method with no callback and utilize the returned promise that resolves', (done) => {
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, { fake: 100 })
          .then(done())
          .catch((err) => assert.fail('in the update catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_019 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          commandDeviceClient.sendEvent.onCall(1).resolves(null);
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_019 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_028: [The command callback should be able to invoke the `update` method, with no `payload` or callback arguments, and utilize the returned promise that resolves.] */
    it.skip('Can invoke the `update` method, with no `payload` or callback arguments, and utilize the returned promise that resolves', (done) => {
      // Skip for now since the update has payload as required.
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200)
          .then(done())
          .catch((err) => assert.fail('in the update catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_028 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          commandDeviceClient.sendEvent.onCall(1).resolves(null);
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_028 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_020: [The command callback should be able to invoke the `update` method and receive (if supplied) a callback with an error if the `update` failed.] */
    it('Can invoke the `update` method with a callback and receive an error in the callback on failure', (done) => {
      const updateError = new Error('fake Error');
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, { fake: 100 }, (err) => {
          assert.strictEqual(err, updateError);
          done();
        });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          commandDeviceClient.sendEvent.onCall(1).callsArgWith(1, updateError);
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_020 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_029: [The command callback should be able to invoke the `update` method, with no `payload` argument, and receive (if supplied) a callback with an error if the `update` failed.] */
    it.skip('Can invoke the `update` method with a callback, with no payload argument, and receive an error in the callback on failure', (done) => {
      // Skip for now since the update has payload as required.
      const updateError = new Error('fake Error');
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, (err) => {
          assert.strictEqual(err, updateError);
          done();
        });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          commandDeviceClient.sendEvent.onCall(1).callsArgWith(1, updateError);
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_029 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_021: [The command callback should be able to invoke the `update` method with no callback and utilize the returned promise that rejects.] */
    it('Can invoke the `update` method with no callback and utilize the returned promise that rejects', (done) => {
      const updateError = new Error('fake error');
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, { fake: 100 })
          .then(() => assert.fail('Should NOT be in the update .then of SRS_NODE_DIGITAL_TWIN_DEVICE_06_021'))
          .catch((err) => {
            assert.strictEqual(err, updateError);
            done();
          });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          commandDeviceClient.sendEvent.onCall(1).callsArgWith(1, updateError);
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_021 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_030: [The command callback should be able to invoke the `update` method, with no `payload` or callback arguments, and utilize the returned promise that rejects.] */
    it.skip('Can invoke the `update` method, with no `payload` or callback arguments, and utilize the returned promise that rejects', (done) => {
      // Skip for now since the update has payload as required.
      const updateError = new Error('fake error');
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200)
          .then(() => assert.fail('Should NOT be in the update .then of SRS_NODE_DIGITAL_TWIN_DEVICE_06_030'))
          .catch((err) => {
            assert.strictEqual(err, updateError);
            done();
          });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          commandDeviceClient.sendEvent.onCall(1).callsArgWith(1, updateError);
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_030 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /*
      Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_022: [Within the command callback, the application can invoke the `update` method which in turn will invoke the device client `sendEvent` method with the following message:
      payload:
      This JSON stringified value of the payload parameter.

      message application properties:
      'iothub-message-schema' : 'asyncResult'
      'iothub-command-name': <command name>
      'iothub-command-request-id': request.payload.commandRequest.requestId of the method request
      'iothub-command-statuscode': statusCode argument of the update method
      '$.ifid': components interface id
      '$.ifname': components name
      contentType: 'application/json'
      ]
     */
    it('Invoking the `update` method will produce the appropriately formated telemetry message', (done) => {
      const payload = { fake: 100 };
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, payload, (err) => {
          done(err);
        });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          commandDeviceClient.sendEvent.onCall(1).callsFake((message, fakeDone) => {
            assert.strictEqual(message.data.toString(), JSON.stringify(payload));
            assert.strictEqual(message.contentType, 'application/json');
            assert.strictEqual(message.properties.getValue('iothub-message-schema'), 'asyncResult');
            assert.strictEqual(message.properties.getValue('iothub-command-request-id'), '43');
            assert.strictEqual(message.properties.getValue('iothub-command-statuscode'), '200');
            assert.strictEqual(message.properties.getValue('$.ifid'), 'urn:contoso:com:something:1');
            assert.strictEqual(message.properties.getValue('$.ifname'), 'fakeComponentName');
            fakeDone();
          });
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_022 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_031: [Within the command callback, the application can invoke the `update` method, with no `payload` argument or payload argument set to undefined or null, which in turn will invoke the device client `sendEvent` method with a message payload of 'null'. ] */
    it('Invoking update with payload that is undefined or null will produce a null payload.', function (done) {
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, undefined, (err) => {
          done(err);
        });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          commandDeviceClient.sendEvent = () => {};
          sinon.stub(commandDeviceClient, 'sendEvent').callsFake((message, fakeDone) => {
            assert.strictEqual(message.data.toString(), JSON.stringify(null));
            fakeDone();
          });
          methodCallbackFunction(methodRequest, methodResponse);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_031 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_031: [Within the command callback, the application can invoke the `update` method, with no `payload` argument or payload argument set to undefined or null, which in turn will invoke the device client `sendEvent` method with a message payload of 'null'. ] */
    it.skip('Invoking update with no payload will produce a null payload.', function (done) {
      const fakeComponent = new FakeInterface('fakeComponentName', () => {}, (commandRequest, commandResponse) => {
        commandResponse.update(200, (err) => {
          done(err);
        });
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          commandDeviceClient.sendEvent = () => {};
          sinon.stub(commandDeviceClient, 'sendEvent').callsFake((message, fakeDone) => {
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
    let fakeComponent;
    let aTwin;
    const initialTestPropertyValue = 43;
    const initialDesiredVersion = 44;
    const testStatusCode = 200;
    const testDescription = 'A fake Description';
    const componentProperty = '$iotin:fakeComponent';
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
          [componentProperty]: {
          },
          update: sinon.stub().callsArgWith(1, null),
        },
        desired: {
          [componentProperty]: {
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
      dtClient = new DigitalTwinClient('urn:abc:1', propertyDeviceClient);
      fakeComponent = new FakeInterface('fakeComponent', (interfaceObject, propertyName, reportedValue, desiredValue, version) => {
        return;
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_033: [** Subsequent to addComponent a writable property will have a report method.] */
    it('Subsequent to addComponent, a writable property will have a report method', (done) => {
      assert(!fakeComponent[testPropertyName].report);
      dtClient.addComponent(fakeComponent);
      assert(fakeComponent[testPropertyName].report);
      assert(typeof fakeComponent[testPropertyName].report === 'function');
      done();
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_035: [Subsequent to the register, a writable property will have an event listener on the `properties.desired.$iotin:<componentName>.<propertyName>`] */
    it('Subsequent to register, there will be an event listener for the writable property on the twin', (done) => {
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .then(() => {
          assert.strictEqual(dtClient._twin.listeners('properties.desired.' + componentProperty + '.' + testPropertyName).length, 1);
          done();
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_035 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_036: [Following the initial get of the twin, the writable properties will have their desired values retrieved, provided they exist, provided to the property changed callback along with the current desired version value.] */
    it('Initially, if it exists, get the desired writable property and provide it and the version, to the property change callback', (done) => {
      fakeComponent = new FakeInterface('fakeComponent', (interfaceObject, propertyName, reportedValue, desiredValue, version) => {
        assert.strictEqual(version, initialDesiredVersion);
        assert.strictEqual(desiredValue, initialTestPropertyValue);
        assert.isNotOk(reportedValue);
        done();
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_036 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_037: [Initially, if it exists, provide the reported property also to the property change callback.] */
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
      aTwin.properties.reported[componentProperty][testPropertyName] = { value: reportedPropertyTestValue };
      fakeComponent = new FakeInterface('fakeComponent', (interfaceObject, propertyName, reportedValue, desiredValue, version) => {
        //
        // This callback is invoked on the initial invocation.
        //
        assert.strictEqual(reportedValue, reportedPropertyTestValue);
        done();
      });
      dtClient.addComponent(fakeComponent);
      dtClient.register()
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_037 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_038: [Properties may invoke the method `report` with a value to produce a patch to the reported properties.] */
    it('Properties may invoke a `report` method to patch the value of the property in the `reported` branch of the device twin', (done) => {
      fakeComponent = new FakeInterface('fakeComponent', (interfaceObject, propertyName, reportedValue, desiredValue, version) => {
        interfaceObject[propertyName].report(desiredValue)
          .then(() => done())
          .catch((err) => assert.fail('in the report catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_038 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
      });
      dtClient.addComponent(fakeComponent);
      aTwin.properties.reported.update = sinon.stub().callsArgWith(1, null).onCall(0).callsFake((patch, callback) => {
        assert.deepEqual(patch, { [componentProperty]: { [testPropertyName]: { 'value': initialTestPropertyValue } } });
        callback();
      });
      dtClient.register()
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_038 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_039: [Properties may invoke the method `report` with a value and a response object to produce a patch to the reported properties.] */
    it('Properties also may invoke the `report` method with a response object ', (done) => {
      fakeComponent = new FakeInterface('fakeComponent', (interfaceObject, propertyName, reportedValue, desiredValue, version) => {
        interfaceObject[propertyName].report(desiredValue, { code: testStatusCode, description: testDescription, version: version })
          .then(() => done())
          .catch((err) => assert.fail('in the report catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_039 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
      });
      dtClient.addComponent(fakeComponent);
      aTwin.properties.reported.update = sinon.stub().callsArgWith(1, null).onCall(0).callsFake((patch, callback) => {
        assert.deepEqual(patch, { [componentProperty]: { [testPropertyName]: { 'value': initialTestPropertyValue, 'sc': testStatusCode, 'sd': testDescription, 'sv': initialDesiredVersion } } });
        callback();
      });
      dtClient.register()
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_039 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_040: [A change to the desired property will invoke the property change callback with the change value and version.] */
    it('Property change callback invoked on change to property.  No reported value given.', (done) => {
      const doneOnSecondInvocation = sinon.stub().onSecondCall().callsFake(() => done());
      fakeComponent = new FakeInterface('fakeComponent', (interfaceObject, propertyName, reportedValue, desiredValue, version) => {
        //
        // We should never see a reported value.  This is because initially there isn't a reported value because
        // the twin we use is created "fresh" for each test.
        //
        // The only other call to this property change handler should happen from simulating a delta change.
        // Delta changes should never provide the value of reported properties.
        //
        assert.isNotOk(reportedValue);
        interfaceObject[propertyName].report(desiredValue, { code: testStatusCode, description: testDescription, version: version })
          .then(doneOnSecondInvocation)
          .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_040 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
      });
      dtClient.addComponent(fakeComponent);
      //
      // The below stub is there to handle calls to the *device* clients twin update function.
      //
      // The .onCall(0) is referring to the original invocation for properties that happens right after we
      // get the twin originally.
      //
      // The next 3 calls to update occur because of the default reporting of the SDK properties.
      //
      // After the dtClient.register, the final .onCall(4) happens as the result of simulating the delta patch.
      //
      aTwin.properties.reported.update = sinon.stub().callsArgWith(1, null)
        .onCall(0).callsFake((patch, callback) => {
          //
          // We are doing the below to simulate an actual patch.  We are doing this
          // so that there is an actual reported value for this property.  Having a value
          // here to sniff out if reported values are sneaking into the change callback.
          //
          aTwin.properties.reported[componentProperty] = patch[componentProperty];
          callback();
        })
        .onCall(4).callsFake((patch, callback) => {
          assert.deepEqual(patch, { [componentProperty]: { [testPropertyName]: { 'value': initialTestPropertyValue, 'sc': testStatusCode, 'sd': testDescription, 'sv': 2*initialDesiredVersion } } });
          callback();
        });
      dtClient.register()
        .then(() => {
          assert(aTwin.properties.reported[componentProperty][testPropertyName].value, initialTestPropertyValue);
          aTwin.properties.desired[versionPropertyName] = 2*initialDesiredVersion;
          //
          // This is simulating a delta change.
          //
          aTwin.emit('properties.desired.' + componentProperty + '.' + testPropertyName, aTwin.properties.desired[componentProperty][testPropertyName]);
        })
        .catch((err) => assert.fail('in the register catch of SRS_NODE_DIGITAL_TWIN_DEVICE_06_040 with err: ' + ((err) ? (err.toString()) : ('null err provided'))));
    });
  });
});
