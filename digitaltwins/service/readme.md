# Azure IoT Digital Twins Client Library

**PREVIEW - WILL LIKELY HAVE BREAKING CHANGES**
This client library lets you connect to your Azure IoT Hub and manage your Digital Twins.
It complements the `azure-iothub` package that covers the initial set of Azure IoT Hub APIs (identity registry, service client, etc)

The Azure IoT Digital Twins Service SDK for Node.js helps you build applications that interact with your twin enabled devices and manage their twin document.

[API Reference](https://docs.microsoft.com/en-us/javascript/api/azure-iot-digitaltwins-service/?view=azure-node-latest)

[![npm version](https://badge.fury.io/js/azure-iot-digitaltwins-service.svg)](https://badge.fury.io/js/azure-iot-digitaltwins-service)

## Prerequisites

You need to install the [Node.js][nodejs_lnk] JavaScript runtime environment to run the Azure IoT JavaScript Service Client SDK on your platform. To check if Node.js supports your platform (OS), verify that an install package is available on the [Node.js download page][nodejs_dwld_lnk].

[npm][npm_lnk] is a command-line package manager that is installed with Node.js is installed, and will be used to install Azure IoT node.js client side SDK.

## Installation

`npm install azure-iot-digitaltwins-service` to get the latest version.

 Features

* Get the twin of an existing device
* Get a single interface instance of an existing device digital twin
* Get a model from the Model Repository
* Update digital twin of an existing device
* Update a single property of an existing digital twin
* Invoke a command on a device

## How to use the Azure IoT service SDK for Node.js

Once you have installed the package as indicated above, you can start using the features of the Digital Twins Service SDK in your code. Below is a code snippet showing how to create a Service Client and get the twin document of a device:

Note that for this sample to work, you will need to [setup your IoT hub][lnk-setup-iot-hub] and retrieve credentials for the service app.

```js
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const deviceId = '<DEVICE_ID_GOES_HERE>';
const iotHubConnectionString = '<IOTHUB_CONNECTION_STRING_GOES_HERE>';

// Create digital twin service client
const credentials = new IoTHubTokenCredentials(iotHubConnectionString);
const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

// Get digital twin
const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceId);

// Print device capabilities
console.log(JSON.stringify(digitalTwin, null, 2));

// List interfaces by name
for (const componentName in digitalTwin.interfaces) {
  if (digitalTwin.interfaces.hasOwnProperty(componentName)) {
    console.log(JSON.stringify(digitalTwin.interfaces[componentName]));
  }
}
```

Check out the [samples][samples] for details on the various features of the Service SDK

## Read more

* [Azure IoT Hub dev center][iot-dev-center]
* [Azure IoT Hub documentation][iot-hub-documentation]
* [Node.js API reference documentation][https://docs.microsoft.com/en-us/javascript/api/azure-iot-digitaltwins-service/?view=azure-node-latest]

## Directory structure

Digital Twins Service SDK folders:

### /digitaltwins/service/devdoc

Development requirements documentation

### /digitaltwins/service/src

Code for the library

### digitaltwins/samples/service

Set of simple samples showing how to use the features of the Digital Twin Service SDK

### /digitaltwins/service/test

Test files

[nodejs_lnk]: https://nodejs.org/
[nodejs_dwld_lnk]: https://nodejs.org/en/download/
[npm_lnk]:https://docs.npmjs.com/getting-started/what-is-npm
[samples]: ../samples/service
[lnk-setup-iot-hub]: https://aka.ms/howtocreateazureiothub
[node-api-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iothub/
[iot-dev-center]: http://azure.com/iotdev
[iot-hub-documentation]: https://docs.microsoft.com/en-us/azure/iot-hub/
