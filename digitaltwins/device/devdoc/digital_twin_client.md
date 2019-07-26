# azure-iot-digitaltwins-device.DigitalTwinClient Requirements

## Overview
`DigitalTwinClient` provides api to add components (named interfaces), and then register those components with the IoT Hub.  The Digital Twin Client instantiates methods on the various Digital Twin Types to perform telemetry and property value reports.  In addition, it provides the ability to receive command invocations from service side requests as well as notification of updates to write enabled properties in the components.

## Example usage

```javascript
const DigitalTwinClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;
const DeviceClient = require('azure-iot-device').Client;
const Mqtt = require('azure-iot-device-mqtt').Mqtt;

const EnvironmentalSensor = require('./environmentalinterface').EnvironmentalSensor;

const propertyUpdateHandler = (component, propertyName, reportedValue, desiredValue, version) => {
  console.log('Received an update for ' + propertyName + ': ' + JSON.stringify(desiredValue));
  component[propertyName].report(desiredValue, {
    code: 200,
    description: 'helpful descriptive text',
    version: version
  })
    .then(() => console.log('updated the property'))
    .catch(() => console.log('failed to update the property'));
};

const commandHandler = (request, response) => {
  console.log('received command: ' + request.commandName + ' for component: ' + request.componentName);
  response.acknowledge(200, 'helpful response text')
    .then(() => console.log('acknowledgement succeeded.'))
    .catch(() => console.log('acknowledgement failed'));
};

const environmentalSensor = new EnvironmentalSensor('environmentalSensor', propertyUpdateHandler, commandHandler);

const deviceClient = DeviceClient.fromConnectionString(process.argv[2], Mqtt);

const capabilityModel = 'urn:azureiot:samplemodel:1';

async function main() {
  const digitalTwinClient = new DigitalTwinClient(capabilityModel, deviceClient);
  digitalTwinClient.addComponent(environmentalSensor);
  await digitalTwinClient.register();
  await environmentalSensor.temp.send(65.5);
  await environmentalSensor.humid.send(12.2);
  console.log('Done sending telemetry.');
};

main();
```

## Public API

### constructor
Creates a new instance of a Digital Twin Device Client.  An IoT Hub Device Client must be provided as well as the urn format string specifying a Capability Model.

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_001: [** Will throw `ReferenceError` if `capabilityModel` argument is falsy. **]**
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_002: [** Will throw `ReferenceError` if the constructor `client` argument is falsy. **]**

### addComponent
Adds the component to the Digital Twin client.

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_003: [** Will throw `ReferenceError` if the `newComponent` argument is falsy. **]**
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_004: [** Will throw `ReferenceError` if the `newComponent` argument `interfaceId` property is falsy. **]**
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_005: [** Will throw `ReferenceError` if the `newComponent` argument `componentName` property is falsy. **]**
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_006: [** Will throw `Error` if the `newComponent` argument property `componentName` property value is used by a previously added component. **]**
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_007: [** Will throw `Error` if the `newComponent` has a property of type `Command` but no defined `CommandCallback`. **]**
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_008: [** Will throw `Error` if the `newComponent` has a writable property but no defined `PropertyChangedCallback`. **]**
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_009: [** Will throw `TypeError` if the `newComponent` has a property `azureDigitalTwinType` with an unrecognized type. **]**

### register
Sends a registration message to the service.  Sets up handlers for all writable property changes. Sets up handlers for commands.  Sends property reports for SDK Information.  Can be invoked as to return a promise or returning void but invoking a callback upon completion.

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_010: [** Will send a telemetry message with the following
properties and payload to perform the registration:
```
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
```
 **]**

<<<<<<< HEAD
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_011: [** Will indicate an error via a callback or by promise rejection if the registration message fails. **]**
=======
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_011: [** Will indicate an error via a callback or by promise rejection if the registration message fails. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_012: [** For each property in a component with type `Command`, a device method will be enabled with a name of the form '$iotin:' followed by the component name followed by '*' followed by the property name. **]**
>>>>>>> b7639f5c17a68992667d8bbf31dd554daedc773d
