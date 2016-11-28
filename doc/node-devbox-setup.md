# Prepare your development environment

This document describes how to prepare your development environment to work with the *Microsoft Azure IoT SDKs for Node.js* code.

**Important**: If you don't need to modify the code for the node SDKs, it is recommended to use the npm packages as the below instructions are meant to test the code and not to be used for app development.
Instructions for using the npm packages can be found here:
   * [npm package for the Device SDK](../device/core/readme.md)
   * [npm package for the Service SDK](../service/readme.md)

<a name="devenv"/>
## Setup your development environment

Complete the following steps to set up your development environment:
* Ensure that Node.js version 0.10.x or later is installed. Run `node --version` at the command line to check the version. For information about using a package manager to install Node.js on Linux, see [Installing Node.js via package manager][node-linux].
* When you have installed Node.js, clone the latest version of this repository ([azure-iot-sdk-node](https://github.com/Azure/azure-iot-sdk-node)) to your development machine or device. You should always use the **master** branch for the latest version of the libraries and samples.
* If you are using _Windows_:
  * Open the **Node.js command prompt**.
  * Navigate to the local copy of this repository ([azure-iot-sdk-node](https://github.com/Azure/azure-iot-sdk-node)).
  * Run the `build\dev-setup.cmd` script to prepare your development environment.
  * Then run the `build\build.cmd` script to verify your installation.
* If you are using _Linux_:
  * Open a shell.
  * Navigate to the local copy of this repository ([azure-iot-sdk-node](https://github.com/Azure/azure-iot-sdk-node)).
  * Run the `build/dev-setup.sh` script to prepare your development environment.
  * Then run the `build/build.sh` script to verify your installation.

## Tests

The Azure IoT SDKs team keeps a close watch on tests and code coverage when committing new code, whether it's for bugfixes or new features.
To learn how to run the unit, integration and E2E tests, [read this](./node-tests.md).

[node-linux]: https://github.com/nodejs/node-v0.x-archive/wiki/Installing-Node.js-via-package-manager
