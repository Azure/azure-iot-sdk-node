# Microsoft Azure IoT service SDK for Node.js

The Azure IoT Provisioning Service SDK for Node.js helps you build applications that perform CRUD operations with the provisioning service for your enrollments.

[![npm version](https://badge.fury.io/js/azure-iothub.svg)](https://badge.fury.io/js/azure-iothub)

## Prerequisites
You need to install the [Node.js][nodejs_lnk] JavaScript runtime environment to run the Azure IoT JavaScript client SDK on your platform. To check if Node.js supports your platform (OS), verify that an install package is available on the [Node.js download page][nodejs_dwld_lnk].

[npm][npm_lnk] is a command-line package manager that is installed with Node.js is installed, and will be used to install Azure IoT node.js client side SDK.

## Installation

`npm install -g azure-iot-provisioning-service@latest` to get the latest (pre-release) version.

`npm install -g azure-iot-provisioning-service` to get the latest (release) version.

## Features

* Create/remove/update/list enrollments and enrollment groups in your provisioning service

## How to use the Azure IoT service SDK for Node.js

Once you have installed the package as indicated above, you can start using the features of the Service SDK in your code. Below is a code snippet showing how to add a new enrollment in the provisioning registry:

Note that for this sample to work, you will need to [setup your IoT hub][lnk-setup-iot-hub] and retreive credentials for the service app. In the code, replace '[Provisioning Connection String]' with an access policy's credentials for your provisioning hub.

```js
TBD
```

Check out the [samples][samples] for details on the various features of the Service SDK

## Read more

* [Node.js API reference documentation][node-api-reference]


## Directory structure

Service SDK subfolders:

### /devdoc

Development requirements documentation

### /lib

Code for the library

### /Samples

Set of simple samples showing how to use the features of the Service SDK

### /test

Test files

[nodejs_lnk]: https://nodejs.org/
[nodejs_dwld_lnk]: https://nodejs.org/en/download/
[npm_lnk]:https://docs.npmjs.com/getting-started/what-is-npm
[samples]: ./samples/
[lnk-setup-iot-hub]: https://aka.ms/howtocreateazureiothub
[node-api-reference]: http://azure.github.io/azure-iot-sdk-node/
[iot-dev-center]: http://azure.com/iotdev
[iot-hub-documentation]: https://docs.microsoft.com/en-us/azure/iot-hub/
