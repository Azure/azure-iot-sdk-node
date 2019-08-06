# azure-iot-digitaltwins-device.DigitalTwinClient Requirements

## Overview
`DigitalTwinClient` provides api to add interfaceInstances (named interfaces), and then register those interfaceInstances with the IoT Hub.  The Digital Twin Client instantiates methods on the various Digital Twin Types to perform telemetry and property value reports.  In addition, it provides the ability to receive command invocations from service side requests as well as notification of updates to write enabled properties in the interfaceInstances.

## Example usage

```javascript
const DigitalTwinClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;
const DeviceClient = require('azure-iot-device').Client;
const Mqtt = require('azure-iot-device-mqtt').Mqtt;

const EnvironmentalSensor = require('./environmentalinterface').EnvironmentalSensor;

const propertyUpdateHandler = (interfaceInstance, propertyName, reportedValue, desiredValue, version) => {
  console.log('Received an update for ' + propertyName + ': ' + JSON.stringify(desiredValue));
  interfaceInstance[propertyName].report(desiredValue, {
    code: 200,
    description: 'helpful descriptive text',
    version: version
  })
    .then(() => console.log('updated the property'))
    .catch(() => console.log('failed to update the property'));
};

const commandHandler = (request, response) => {
  console.log('received command: ' + request.commandName + ' for interfaceInstance: ' + request.interfaceInstanceName);
  response.acknowledge(200, 'helpful response text')
    .then(() => console.log('acknowledgement succeeded.'))
    .catch(() => console.log('acknowledgement failed'));
};

const environmentalSensor = new EnvironmentalSensor('environmentalSensor', propertyUpdateHandler, commandHandler);

const deviceClient = DeviceClient.fromConnectionString(process.argv[2], Mqtt);

const capabilityModel = 'urn:azureiot:samplemodel:1';

async function main() {
  const digitalTwinClient = new DigitalTwinClient(capabilityModel, deviceClient);
  digitalTwinClient.addInterfaceInstance(environmentalSensor);
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

### addInterfaceInstance
Adds the interfaceInstance to the Digital Twin client.

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_003: [** Will throw `ReferenceError` if the `newInterfaceInstance` argument is falsy. **]**
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_004: [** Will throw `ReferenceError` if the `newInterfaceInstance` argument `interfaceId` property is falsy. **]**
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_005: [** Will throw `ReferenceError` if the `newInterfaceInstance` argument `interfaceInstanceName` property is falsy. **]**
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_006: [** Will throw `Error` if the `newInterfaceInstance` argument property `interfaceInstanceName` property value is used by a previously added interfaceInstance. **]**
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_007: [** Will throw `Error` if the `newInterfaceInstance` has a property of type `Command` but no defined `CommandCallback`. **]**
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_008: [** Will throw `Error` if the `newInterfaceInstance` has a writable property but no defined `PropertyChangedCallback`. **]**
**SRS_NODE_DIGITAL_TWIN_DEVICE_06_009: [** Will throw `TypeError` if the `newInterfaceInstance` has a property `azureDigitalTwinType` with an unrecognized type. **]**

### register
Sends a registration message to the service.  Sets up handlers for all writable property changes. Sets up handlers for commands.  Sends property reports for SDK Information.  Can be invoked as to return a promise or returning void but invoking a callback upon completion.

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_010: [** Will send a telemetry message with the following
properties and payload to perform the registration:
```
payload:
{modelInformation:
  capabilityModelId: <capabilityModelURN>,
  interfaces: {
    <interfaceInstanceName>: <interfaceId>
  }
}
message application properties:
$.ifid : 'urn:azureiot:ModelDiscovery:ModelInformation:1'
$.ifname: 'urn_azureiot_ModelDiscovery_ModelInformation'
$.schema: 'modelInformation'
contentType: 'application/json'
```
 **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_011: [** Will indicate an error via a callback or by promise rejection if the registration message fails. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_012: [** For each property in an interfaceInstance with type `Command`, a device method will be enabled with a name of the form '$iotin:' followed by the interfaceInstance name followed by '*' followed by the property name. **]**

### Commands

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_013: [** For commands, the `commandCallback` will be invoked with `request` and `response` arguments with the following properties.
```
request:
  {
    interfaceInstance: interfaceInstance,
    interfaceInstanceName: interfaceInstance.interfaceInstanceName
    commandName: command property name
    payload: payload of request
  }

response:
  {
    acknowledge: method that invokes device method send api with arguments
         status,
         payload,
         callback or if undefined returns a promise
    update: method that will invoke the device client send api with arguments
        device message,
        callback, or if undefined returns a promise
  }
```
 **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_014: [**The command callback should be able to invoke the `acknowledge` method and receive (if supplied) a callback upon completion. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_023: [** The command callback should be able to invoke the `acknowledge` method, with no `payload` argument, and receive (if supplied) a callback upon completion. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_015: [**The command callback should be able to invoke the `acknowledge` method with no callback and utilize the returned promise that resolves. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_024: [** The command callback should be able to invoke the `acknowledge` method, with no `payload` or callback arguments, and utilize the returned promise that resolves. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_016: [**The command callback should be able to invoke the `acknowledge` method and receive (if supplied) a callback with an error if the `acknowledge` failed. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_025: [** The command callback should be able to invoke the `acknowledge` method, with no `payload` argument, and receive (if supplied) a callback with an error if the `acknowledge` failed. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_017: [**The command callback should be able to invoke the `acknowledge` method with no callback and utilize the returned promise that rejects. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_026: [** The command callback should be able to invoke the `acknowledge` method, with no `payload` or callback arguments, and utilize the returned promise that rejects. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_018: [** The command callback should be able to invoke the `update` method and receive (if supplied) a callback upon completion. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_027: [** The command callback should be able to invoke the `update` method, with no `payload` argument, and receive (if supplied) a callback upon completion. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_019: [** The command callback should be able to invoke the `update` method with no callback and utilize the returned promise that resolves. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_028: [** The command callback should be able to invoke the `update` method, with no `payload` or callback arguments, and utilize the returned promise that resolves. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_020: [** The command callback should be able to invoke the `update` method and receive (if supplied) a callback with an error if the `update` failed. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_029: [** The command callback should be able to invoke the `update` method, with no `payload` argument, and receive (if supplied) a callback with an error if the `update` failed. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_021: [** The command callback should be able to invoke the `update` method with no callback and utilize the returned promise that rejects. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_030: [** The command callback should be able to invoke the `update` method, with no `payload` or callback arguments, and utilize the returned promise that rejects. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_022: [** Within the command callback, the application can invoke the `update` method which in turn will invoke the device client `sendEvent` method with the following message:
```
payload:
This JSON stringified value of the payload parameter.

message application properties:
'iothub-message-schema' : 'asyncResult'
'iothub-command-name': <command name>
'iothub-command-request-id': request.payload.commandRequest.requestId of the method request
'iothub-command-statuscode': statusCode argument of the update method
'$.ifname': interfaceInstances name
contentType: 'application/json'
```
 **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_031: [** Within the command callback, the application can invoke the `update` method, with no `payload` argument or payload argument set to undefined or null, which in turn will invoke the device client `sendEvent` method with a message payload of ' '. **]**

### Telemetry

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_034: [** Subsequent to addInterfaceInstance a Telemetry will have a report method. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_032: [** A telemetry will send a device message with the following format:
```
payload: {<telemetry property name>: value}
message application properties:
contentType: 'application/json'
$.ifname: <interfaceInstance name>
$.schema: <telemetry property name>
```
**]**

### Property (writable)

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_033: [** Subsequent to addInterfaceInstance a writable property will have a report method. **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_035: [** Subsequent to the register, a writable property will have an event listener on the `properties.desired.$iotin:<interfaceInstanceName>.<propertyName>` **]**

**SRS_NODE_DIGITAL_TWIN_DEVICE_06_036: [** Following the initial get of the twin, the writable properties will have their desired values retrieved, provided they exist, provided to the property changed callback along with the current desired version value.
 **]**

 **SRS_NODE_DIGITAL_TWIN_DEVICE_06_037: [** Initially, if it exists, provide the reported property also to the property change callback. **]**

 **SRS_NODE_DIGITAL_TWIN_DEVICE_06_038: [** Properties may invoke the method `report` with a value to produce a patch to the reported properties. **]**

 **SRS_NODE_DIGITAL_TWIN_DEVICE_06_039: [** Properties may invoke the method `report` with a value and a response object to produce a patch to the reported properties. **]**

 **SRS_NODE_DIGITAL_TWIN_DEVICE_06_040: [** A change to the desired property will invoke the property change callback with the change value and version. **]**