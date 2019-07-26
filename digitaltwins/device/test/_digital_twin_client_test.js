// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const assert = require('chai').assert;
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
      const registrationDeviceClient = {
        sendEvent: sinon.stub().callsArgWith(1, null, new results.MessageEnqueued()),
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
        const fakeComponent = new FakeInterface('abc');
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

    describe('Will indicate error if sending registration message fails', function () {
      let dtClient;
      const sendError = new Error('failed registration');
      const registrationDeviceClient = {
        sendEvent: sinon.stub().callsArgWith(1, sendError)
      };

      class FakeInterface extends BaseInterface {
        constructor(name, propertyCallback, commandCallback) {
          super(name, 'urn:contoso:com:something:1', propertyCallback, commandCallback);
          this.temp = new Telemetry();
        }
      };

      beforeEach(function () {
        const fakeComponent = new FakeInterface('abc');
        dtClient = new DigitalTwinClient('urn:abc:1', registrationDeviceClient);
        dtClient.addComponent(fakeComponent);
      });

      it(' - invokes callback with error object', function (done) {
        dtClient.register((error) => {
          assert.strictEqual(error, sendError);
          return done();
        });
      });

      it.skip(' - rejects the promise', function (done) {
        dtClient.register()
          .then(assert.fail('In Promise path, should not succeed registration'))
          .catch((err) => {
            assert(err, sendError);
            return done();
          });
      });
    });

    /* Tests_SRS_NODE_DIGITAL_TWIN_DEVICE_06_012: [For each property in a component with type `Command`, a device method will be enabled with a name of the form '$iotin:' followed by the component name followed by '*' followed by the property name.] */
    it('Will enable methods for all commands in all components', function(done) {
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
  });
});
