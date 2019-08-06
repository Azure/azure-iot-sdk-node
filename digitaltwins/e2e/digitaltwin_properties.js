// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const debug = require('debug')('e2etests:digitaltwin_property');
const uuid = require('uuid');
const assert = require('chai').assert;

const Registry = require('azure-iothub').Registry;
const DigitalTwinDeviceClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;
const DeviceClient = require('azure-iot-device').Client;
const Mqtt = require('azure-iot-device-mqtt').Mqtt;
const ServiceConnectionString = require('azure-iothub').ConnectionString;
const DeviceSas = require('azure-iot-device').SharedAccessSignature;
const TestInterfaceInstance = require('./test_interfaceInstance').TestInterfaceInstance;
const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const createModel = require('./model_repository_helper').createModel;

const interfaceDocument = require('./dtdl/test_interface');
const capabilityModelDocument = require('./dtdl/test_capability_model');

const hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
const hubHostName = ServiceConnectionString.parse(hubConnectionString).HostName;

// Create service client
const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

const valueForReadOnlyProperty = uuid.v4().toString();

describe('Digital Twin Properties', function () {
  const deviceDescription = {
    deviceId: 'node-e2e-digitaltwin-property-' + uuid.v4()
  };
  let createdDevice;

  before('creating device identity: ' + deviceDescription.deviceId, async function () {
    this.timeout(60000);
    debug('creating test device: ' + deviceDescription.deviceId);
    return Registry.fromConnectionString(hubConnectionString).create(deviceDescription)
      .then((device) => {
        createdDevice = device.responseBody;
        debug('create or update test interface model: ' + interfaceDocument['@id']);
        return createModel(interfaceDocument);
      }).then(() => {
        debug('interface model creation succeeded');
        debug('create or update test capability model: ' + capabilityModelDocument['@id']);
        return createModel(capabilityModelDocument);
      }).then(() => {
        debug('beforeAll hook done');
        return Promise.resolve();
      }).catch((err) => {
        debug('error creating test resources: ' + err.toString());
        throw err;
      });
  });

  after('deleting device identity: ' + deviceDescription.deviceId, function () {
    this.timeout(60000);
    debug('deleting test device: ' + deviceDescription.deviceId);
    return Registry.fromConnectionString(hubConnectionString).delete(deviceDescription.deviceId)
      .then(() => {
        debug('test device deleted: ' + deviceDescription.deviceId);
        return Promise.resolve();
      }).catch((err) => {
        debug('error deleting test device: ' + deviceDescription.deviceId);
        throw err;
      });
  });

  it('device can report a property and service client read it.', function (done) {
    this.timeout(60000);

    // test device client
    const deviceSasExpiry = Math.floor(new Date() / 1000) + 3600;
    const deviceSas = DeviceSas.create(hubHostName, createdDevice.deviceId, createdDevice.authentication.symmetricKey.primaryKey, deviceSasExpiry);
    const deviceClient = DeviceClient.fromSharedAccessSignature(deviceSas, Mqtt);
    const digitalTwinClient = new DigitalTwinDeviceClient(capabilityModelDocument['@id'], deviceClient);

    const closeClients = function (deviceClient, err) {
      debug('closing device and event hubs clients');
      deviceClient.close()
        .then(() => {
          debug('device client closed');
          done(err);
        }).catch((closeErr)=> {
          debug('error closing clients: ' + closeErr.toString());
          done(err || closeErr);
        });
    };

    debug('creating test interfaceInstance');
    const interfaceInstanceName = 'testInterfaceInstance';
    testInterfaceInstance = new TestInterfaceInstance(interfaceInstanceName, () => {}, () => {});
    digitalTwinClient.addInterfaceInstance(testInterfaceInstance);
    debug('registering digital twin client with test interfaceInstance');
    digitalTwinClient.register()
      .then(() => {
        debug('reporting the property value of: ' + valueForReadOnlyProperty);
        return testInterfaceInstance.readOnlyProperty.report(valueForReadOnlyProperty);
      })
      .then(() => {
        debug('Getting the digital twin.');
        return digitalTwinServiceClient.getDigitalTwin(createdDevice.deviceId);
      })
      .then((serviceTwin) => {
        let currentValueOfProperty = null;
        if (serviceTwin.components[interfaceInstanceName].properties.readOnlyProperty &&
            serviceTwin.components[interfaceInstanceName].properties.readOnlyProperty.reported &&
            serviceTwin.components[interfaceInstanceName].properties.readOnlyProperty.reported.value) {
          currentValueOfProperty = serviceTwin.components[interfaceInstanceName].properties.readOnlyProperty.reported.value;
        }
        if (currentValueOfProperty !== valueForReadOnlyProperty) {
          debug('Did not match the expected guid.');
          closeClients(deviceClient, new Error('Twin Did NOT receive the update value'));
        } else {
          debug('We got the expected guid.');
          closeClients(deviceClient);
        }
      })
      .catch((err) => {
        debug('error while testing read only property: ' + err.toString());
        return closeClients(deviceClient, err);
      });
  });

  it('service client gets the digital twin, updates a property using a full patch, the device accepts the property update and the service is updated again.', function (done) {
    this.timeout(60000);

    // test device client
    const deviceSasExpiry = Math.floor(new Date() / 1000) + 3600;
    const deviceSas = DeviceSas.create(hubHostName, createdDevice.deviceId, createdDevice.authentication.symmetricKey.primaryKey, deviceSasExpiry);
    const deviceClient = DeviceClient.fromSharedAccessSignature(deviceSas, Mqtt);
    const digitalTwinClient = new DigitalTwinDeviceClient(capabilityModelDocument['@id'], deviceClient);
    const desiredPropertyValue = uuid.v4();

    const closeClients = function (deviceClient, err) {
      debug('closing device and event hubs clients');
      deviceClient.close()
        .then(() => {
          debug('device client closed');
          done(err);
        }).catch((closeErr)=> {
          debug('error closing clients: ' + closeErr.toString());
          done(err || closeErr);
        });
    };

    const propertyUpdateCallback = (interfaceInstance, propertyName, reportedValue, desiredValue, version) => {
      debug('got new desired value: ' + desiredValue);
      assert.strictEqual(desiredValue, desiredPropertyValue);
      debug('reporting successful update');
      interfaceInstance.writableProperty.report(desiredValue, {
        code: 200,
        description: 'test',
        version: version
      }, (err) => {
        if (err) {
          debug('error reporting update: ' + err.toString());
          closeClients(deviceClient, err);
        } else {
          debug('service client: getting digital twin');
          digitalTwinServiceClient.getDigitalTwin(createdDevice.deviceId, (err, updatedDigitalTwin) => {
            if (err) {
              debug('service client: error getting digital twin: ' + err.toString());
              closeClients(deviceClient, err);
            } else {
              debug('service client: got digital twin');
              assert.strictEqual(updatedDigitalTwin.components.testInterfaceInstance.properties.writableProperty.reported.value, desiredPropertyValue);
              assert.strictEqual(updatedDigitalTwin.components.testInterfaceInstance.properties.writableProperty.reported.desiredState.code, 200);
              assert.strictEqual(updatedDigitalTwin.components.testInterfaceInstance.properties.writableProperty.reported.desiredState.description, 'test');
              assert.strictEqual(updatedDigitalTwin.components.testInterfaceInstance.properties.writableProperty.reported.desiredState.version, version);
              debug('all digital twin properties match - test successful');
              closeClients(deviceClient);
            }
          });
        }
      });
    };

    debug('creating test interfaceInstance');
    const interfaceInstanceName = 'testInterfaceInstance';
    testInterfaceInstance = new TestInterfaceInstance(interfaceInstanceName, propertyUpdateCallback, () => {});
    digitalTwinClient.addInterfaceInstance(testInterfaceInstance);
    debug('registering digital twin client with test interfaceInstance');
    digitalTwinClient.register()
      .then(() => {
        debug('reporting the property value of: ' + valueForReadOnlyProperty);
        return digitalTwinServiceClient.getDigitalTwin(createdDevice.deviceId);
      }).then(() => {
        debug('crafting patch and sending it');
        const patch = {
          components: {
            testInterfaceInstance: {
              properties: {
                writableProperty: {
                  desired: {
                    value: desiredPropertyValue
                  }
                }
              }
            }
          }
        };
        return digitalTwinServiceClient.updateDigitalTwin(createdDevice.deviceId, patch);
      }).then((updatedDigitalTwin) => {
        assert.strictEqual(updatedDigitalTwin.components.testInterfaceInstance.properties.writableProperty.desired.value, desiredPropertyValue);
        debug('service client: twin successfully updated with desired property value: ' + desiredPropertyValue);
      })
      .catch((err) => {
        debug('error while testing read only property: ' + err.toString());
        return closeClients(deviceClient, err);
      });
  });


  it('service client gets the digital twin, updates a property using a partial patch, the device accepts the property update and the service is updated again.', function (done) {
    this.timeout(60000);

    // test device client
    const deviceSasExpiry = Math.floor(new Date() / 1000) + 3600;
    const deviceSas = DeviceSas.create(hubHostName, createdDevice.deviceId, createdDevice.authentication.symmetricKey.primaryKey, deviceSasExpiry);
    const deviceClient = DeviceClient.fromSharedAccessSignature(deviceSas, Mqtt);
    const digitalTwinClient = new DigitalTwinDeviceClient(capabilityModelDocument['@id'], deviceClient);
    const desiredPropertyValue = uuid.v4();

    const closeClients = function (deviceClient, err) {
      debug('closing device and event hubs clients');
      deviceClient.close()
        .then(() => {
          debug('device client closed');
          done(err);
        }).catch((closeErr)=> {
          debug('error closing clients: ' + closeErr.toString());
          done(err || closeErr);
        });
    };

    const propertyUpdateCallback = (interfaceInstance, propertyName, reportedValue, desiredValue, version) => {
      debug('got desired property update: ' + desiredValue);
      if (desiredValue === desiredPropertyValue) {
        debug('responding to desired property update');
        interfaceInstance.writableProperty.report(desiredValue, {
          code: 200,
          description: 'test',
          version: version
        }, (err) => {
          if (err) {
            debug('error responding to desired property update: ' + err.toString());
            closeClients(deviceClient, err);
          } else {
            debug('service client: getting the digital twin');
            digitalTwinServiceClient.getDigitalTwin(createdDevice.deviceId, (err, updatedDigitalTwin) => {
              if (err) {
                debug('service client: error getting the digital twin: ' + err.toString());
                closeClients(deviceClient, err);
              } else {
                debug('got digital twin');
                assert.strictEqual(updatedDigitalTwin.components.testInterfaceInstance.properties.writableProperty.reported.value, desiredPropertyValue);
                assert.strictEqual(updatedDigitalTwin.components.testInterfaceInstance.properties.writableProperty.reported.desiredState.code, 200);
                assert.strictEqual(updatedDigitalTwin.components.testInterfaceInstance.properties.writableProperty.reported.desiredState.description, 'test');
                assert.strictEqual(updatedDigitalTwin.components.testInterfaceInstance.properties.writableProperty.reported.desiredState.version, version);
                debug('all digital twin properties match: test successful');
                closeClients(deviceClient);
              }
            });
          }
        });
      } else {
        debug('ignoring invalid property value: ' + desiredValue);
      }
    };

    debug('creating test interfaceInstance');
    const interfaceInstanceName = 'testInterfaceInstance';
    testInterfaceInstance = new TestInterfaceInstance(interfaceInstanceName, propertyUpdateCallback, () => {});
    digitalTwinClient.addInterfaceInstance(testInterfaceInstance);
    debug('registering digital twin client with test interfaceInstance');
    digitalTwinClient.register()
      .then(() => {
        debug('reporting the property value of: ' + valueForReadOnlyProperty);
        return digitalTwinServiceClient.getDigitalTwin(createdDevice.deviceId);
      }).then(() => {
        debug('updating property directly');
        return digitalTwinServiceClient.updateDigitalTwinProperty(createdDevice.deviceId, 'testInterfaceInstance', 'writableProperty', desiredPropertyValue);
      }).then((updatedDigitalTwin) => {
        assert.strictEqual(updatedDigitalTwin.components.testInterfaceInstance.properties.writableProperty.desired.value, desiredPropertyValue);
        debug('service client: twin successfully updated with desired property value: ' + desiredPropertyValue);
      })
      .catch((err) => {
        debug('error while testing read only property: ' + err.toString());
        return closeClients(deviceClient, err);
      });
  });
});
