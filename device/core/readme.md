#azure-iot-device
The core components of the Azure IoT device SDK.

[![npm version](https://badge.fury.io/js/azure-iot-device.svg)](https://badge.fury.io/js/azure-iot-device)

## Features

Use the Azure IoT device SDK to:
* Send event data to Azure IoT Hub.
* Receive messages from IoT Hub.
* Communicate with the service via MQTT (optionally over WebSockets), AMQP (optionally over WebSockets),  or HTTP.
* Synchronize an Azure IoT Hub device Twin with Azure IoT Hub from a device
* Implement Azure IoT Hub Direct Device Methods on devices
* Implement Azure IoT Device Mangement features on devices

## Prerequisites
You need to install the [Node.js][nodejs_lnk] JavaScript runtime environment to run the Azure IoT JavaScript client SDK on your platform. To check if Node.js supports your platform (OS), verify that an install package is available on the [Node.js download page][nodejs_dwld_lnk].

[npm][npm_lnk] is a command-line package manager that is installed with Node.js is installed, and will be used to install Azure IoT node.js client side SDK.

## Installation

`npm install -g azure-iot-device` to get the latest version.

## Getting Started

This package contains the core components of the Azure IoT device SDK, but doesn't include a transport over which to communicate with Azure IoT Hub. Your application **must** require a transport package in addition to the core package to do something useful.

For example, if you want to send an event from your device to an IoT Hub _using the AMQP protocol_ you must first install the **azure-iot-device-amqp** package:

```
npm install -g azure-iot-device-amqp
```

Then you can use the code below to send a message to IoT Hub.

Note that for this sample to work, you will need to [setup your IoT hub][lnk-setup-iot-hub] and [provision your device and get its credentials][lnk-manage-iot-hub]. In the code, replace '[IoT Hub device connection string]' with the device credentials created in the IoT Hub.

```js
var connectionString = '[IoT Hub device connection string]';

// use factory function from AMQP-specific package
var clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;

// AMQP-specific factory function returns Client object from core package
var client = clientFromConnectionString(connectionString);

// use Message object from core package
var Message = require('azure-iot-device').Message;

var connectCallback = function (err) {
  if (err) {
    console.error('Could not connect: ' + err);
  } else {
    console.log('Client connected');
    var msg = new Message('some data from my device');
    client.sendEvent(msg, function (err) {
      if (err) {
        console.log(err.toString());
      } else {
        console.log('Message sent');
      };
    });
  };
};


client.open(connectCallback);
```

See the `azure-iot-device-*` transport-specific packages for more information.

## More samples

You will find more samples showing how to use the Azure IoT device SDK for node [here][device-samples].

## Work with the code of the module

If you want to modify the module's code and/or contribute changes, you will need to setup your development environement following [these instructions][devbox-setup].

## Read More

* [Azure IoT Hub dev center][iot-dev-center]
* [Azure IoT Hub documentation][iot-hub-documentation]
* [API reference][node-api-reference]

[nodejs_lnk]: https://nodejs.org/
[nodejs_dwld_lnk]: https://nodejs.org/en/download/
[npm_lnk]:https://docs.npmjs.com/getting-started/what-is-npm
[lnk-setup-iot-hub]: https://aka.ms/howtocreateazureiothub
[lnk-manage-iot-hub]: https://aka.ms/manageiothub
[devbox-setup]: ../../doc/node-devbox-setup.md
[device-samples]: ../samples/
[node-api-reference]: http://azure.github.io/azure-iot-sdks/
[iot-dev-center]: http://azure.com/iotdev
[iot-hub-documentation]: https://docs.microsoft.com/en-us/azure/iot-hub/

