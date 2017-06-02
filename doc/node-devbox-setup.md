# Prepare your development environment

This document describes how to prepare your development environment to work with the *Microsoft Azure IoT SDKs for Node.js* code.

**Important**: If you don't need to modify the code for the node SDKs, it is recommended to use the npm packages as the below instructions are meant to test the code and not to be used for app development.
Instructions for using the npm packages can be found here:
   * [npm package for the Device SDK](../device/core/readme.md)
   * [npm package for the Service SDK](../service/readme.md)

## Prerequisites

In order to work on the Azure IoT SDK for Node.js you must have Node.js installed. You can get Node.js from [here][node-download]. If you're running linux and want to install Node.js using a package manager, please refer to [these instructions][node-linux]. The Azure IoT SDK for Node.js support Node.js version 4 and up. It may still work with older versions (Node 0.10 and 0.12) but our dependencies are dropping support for those versions, so we cannot guarantee full support for these anymore.

If you'd like to be able to switch from one Node.js version to another you can also use [Node Version Switcher][nvs].

In order to be able to create and test x509 certificates using our build scripts, you will also need to have [OpenSSL][openssl] installed.

<a name="devenv"/>

## Setup your development environment

The SDK is entirely open-source (as you probably figured out already if you're reading this on Github). Downloading the whole SDK source code is as simple as cloning the repository:

```
$ git clone https://github.com/azure/azure-iot-sdk-node
```

The SDK ships in a few separate NPM packages that depend on each other. Once the repository has been cloned, some features span accross multiple packages so in order to build and test these features, we need to "link" those package together in a single environment. The following steps explain how to do that.

* If you are using _Windows_:
  * Open the **Node.js command prompt** (or a regular command prompt if you made sure the node location was added to the PATH)
  * Navigate to the local copy of this repository ([azure-iot-sdk-node](https://github.com/Azure/azure-iot-sdk-node)).
  * Run the `build\dev-setup.cmd` script to prepare your development environment.
  * Then run the `build\build.cmd` script to verify your installation.
* If you are using _Linux_:
  * Open a shell.
  * Navigate to the local copy of this repository ([azure-iot-sdk-node](https://github.com/Azure/azure-iot-sdk-node)).
  * Run the `build/dev-setup.sh` script to prepare your development environment.
  * Then run the `build/build.sh` script to verify your installation.

## Running the samples

The device and service SDKs samples are located in their respective folders. The samples are **not** linked to other packages at the same time as the rest of the SDK, in order to leave the choice for the customers to run them of the published packages or the local versions. The simplest way to run the samples is to use published packages. 

```
$ cd device/samples
$ npm install
```

Then, depending on which sample you want to run, you'll have to edit this particular file and replace the connection string placeholder with the connection string of the device (or IoT hub) that you want to test. 

Once this is done, just run it like any other node script:

```
$ node simple_sample_device.js
```

## Going further

### Standard NPM scripts

Each package in the SDK comes with the same set of NPM scripts that run various operations on the package:
* `npm run build` will run the TypeScript compiler and generate javascript code
* `npm run lint` will run `tslint` and lint the TypeScript code
* `npm run alltest` will lint, build, run all tests, and create code coverage data
* `npm run ci` will lint, build, run all tests and verify code coverage against existing numbers. (this is what the CI build does).

### Environment variables required to run the tests

If you intend on running the SDK test suite, there are a few environment variables that need to be configured:
- **OPENSSL_CONF**: The SDK build script relies on OpenSSL to create certificates and keys so OpenSSL must be in the path and `OPENSSL_CONF` must be set to the path of your `openssl.cnf` configuration file
- **IOTHUB_CONNECTION_STRING** must be set to a configuration string of your IoT Hub that has rights to create/delete devices and send messages to devices (typically, the one associated with the `iothubowner` policy or equivalent). Connection strings can be found in the settings section of the Azure portal.
- **STORAGE_CONNECTION_STRING** must be set to an Azure Storage connection string if you want to test bulk import/export of device identities

### Tests

The Azure IoT SDKs team keeps a close watch on tests and code coverage when committing new code, whether it's for bugfixes or new features.
To learn how to run the unit, integration and E2E tests, [read this](./node-tests.md).

[node-download]: https://nodejs.org/en/download/
[node-linux]: https://nodejs.org/en/download/package-manager/
[nvs]: https://github.com/jasongin/nvs
[openssl]: https://www.openssl.org/
