# Microsoft Azure IoT service SDK for Node.js

The Azure IoT Service SDK for Node.js helps you build applications that interact with your devices and manage their identities in your IoT hub.

[![npm version](https://badge.fury.io/js/azure-iothub.svg)](https://badge.fury.io/js/azure-iothub)

## Prerequisites
You need to install the [Node.js][nodejs_lnk] JavaScript runtime environment to run the Azure IoT JavaScript client SDK on your platform. To check if Node.js supports your platform (OS), verify that an install package is available on the [Node.js download page][nodejs_dwld_lnk].

[npm][npm_lnk] is a command-line package manager that is installed with Node.js is installed, and will be used to install Azure IoT node.js client side SDK.

## Installation

`npm install azure-iothub` to get the latest version.

## Features

* Create/remove/update/list device identities in your IoT hub
* Send messages to your devices and get feedback when they're delivered
* Work with the Azure IoT Hub Device Twins
* Invoke Cloud to Device Direct Methods on a device

## How to use the Azure IoT service SDK for Node.js

Once you have installed the package as indicated above, you can start using the features of the Service SDK in your code. Below is a code snippet showing how to add a new device in the Azure IoT Hub device registry:

Note that for this sample to work, you will need to [setup your IoT hub][lnk-setup-iot-hub] and retrieve credentials for the service app. Utilize the '[IoT Connection String]', in quotes, on the command line invoking the sample.

```js
var iothub = require('azure-iothub');

var connectionString = '[IoT Connection String]';

var registry = iothub.Registry.fromConnectionString(connectionString);

// Create a new device
var device = {
deviceId: 'sample-device-' + Date.now()
};

registry.create(device, function(err, deviceInfo, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.statusCode + ' ' + res.statusMessage);
    if (deviceInfo) console.log(op + ' device info: ' + JSON.stringify(deviceInfo));
});

```

Check out the [samples][samples] for details on the various features of the Service SDK

## Read more

* [Azure IoT Hub dev center][iot-dev-center]
* [Azure IoT Hub documentation][iot-hub-documentation]
* [Node.js API reference documentation][node-api-reference]


## Directory structure

Service SDK subfolders:

### /devdoc

Development requirements documentation

### /src

Code for the library

### /samples

Set of simple samples showing how to use the features of the Service SDK

### /test

Test files

[nodejs_lnk]: https://nodejs.org/
[nodejs_dwld_lnk]: https://nodejs.org/en/download/
[npm_lnk]:https://docs.npmjs.com/getting-started/what-is-npm
[samples]: ./samples/
[lnk-setup-iot-hub]: https://aka.ms/howtocreateazureiothub
[node-api-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iothub/
[iot-dev-center]: http://azure.com/iotdev
[iot-hub-documentation]: https://docs.microsoft.com/en-us/azure/iot-hub/
