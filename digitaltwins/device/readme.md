# Azure IoT Digital Twins Device SDK

**PREVIEW - WILL LIKELY HAVE BREAKING CHANGES**

[![npm version](https://badge.fury.io/js/azure-iot-digitaltwins-device.svg)](https://badge.fury.io/js/azure-iot-digitaltwins-device)

## Features

Use the Azure IoT Digital Twins Device SDK to:
* Register multiple interfaces that a device implements.
* Send Telemetry data to Azure IoT Hub.
* Report property changes to Azure IoT Hub.
* Receive changes to writable properties.
* Handle synchronous and asynchronous commands from IoTHub.

## Prerequisites
You need to install the [Node.js][nodejs_lnk] JavaScript runtime environment to run the Azure IoT JavaScript client SDK on your platform. To check if Node.js supports your platform (OS), verify that an install package is available on the [Node.js download page][nodejs_dwld_lnk].

[npm][npm_lnk] is a command-line package manager that is installed with Node.js is installed, and will be used to install Azure IoT node.js client side SDK.

## Latest updates

The telemetry interface has been adjusted.  We are de-emphasizing the ability to send individual properties.
We have introduced a new method on the interface instance called sendTelemetry. Its argument is an object that can
send multiple properties with a single message.

We are likely to remove the ability to do a .send in the near future.

We are very likely to in a near future update to be changing the names of some Digital Twin client methods.  Stay tuned.

## Installation

To get the latest version you need to install this package as well as the device client and the MQTT transport that support the digital twin client:

```shell
npm install azure-iot-digitaltwins-device@pnp-preview
npm install azure-iot-device@pnp-preview
npm install azure-iot-device-mqtt@pnp-preview
```

## Getting started

You can use the code below to send telemetry to IoT Hub.

Note that for this sample to work, you will need to [setup your IoT hub][lnk-setup-iot-hub] and [provision your device and get its credentials][lnk-manage-iot-hub]. In the code, replace '[IoT Hub device connection string]' with the device credentials created in the IoT Hub.

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

const modelId = 'dtmi:contoso_device_corp:samplemodel;1';

async function main() {
  const digitalTwinClient = new DigitalTwinClient(modelId, deviceClient);
  digitalTwinClient.addComponents(environmentalSensor);
  await digitalTwinClient.register();
  await environmentalSensor.sendTelemetry({temp: 65.5, humid: 12.2});
  console.log('Done sending telemetry.');
};

main();
```

## Read More

* [Azure IoT Hub dev center][iot-dev-center]
* [Azure IoT Hub documentation][iot-hub-documentation]
* [API reference][node-api-reference]

[nodejs_lnk]: https://nodejs.org/
[nodejs_dwld_lnk]: https://nodejs.org/en/download/
[npm_lnk]:https://docs.npmjs.com/getting-started/what-is-npm
[lnk-setup-iot-hub]: https://aka.ms/howtocreateazureiothub
[lnk-manage-iot-hub]: https://aka.ms/manageiothub
[devbox-setup]: https://github.com/Azure/azure-iot-sdk-node/blob/master/doc/node-devbox-setup.md
[device-samples]: https://github.com/Azure/azure-iot-sdk-node-digitaltwins/tree/master/digitaltwins/samples/device
[node-api-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iot-digitaltwins-device/
[iot-dev-center]: http://azure.com/iotdev
[iot-hub-documentation]: https://docs.microsoft.com/en-us/azure/iot-hub/
