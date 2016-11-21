# Prepare your development environment

This document describes how to prepare your development environment to use the *Microsoft Azure IoT SDKs for Node.js*.

- [Setup your development environment](#devenv)
- [Sample applications](#samplecode)

<a name="devenv"/>
## Setup your development environment

Complete the following steps to set up your development environment:
- Ensure that Node.js version 0.10.x or later is installed. Run `node --version` at the command line to check the version. For information about using a package manager to install Node.js on Linux, see [Installing Node.js via package manager][node-linux].

- When you have installed Node.js, clone the latest version of this repository ([azure-iot-sdk-node](https://github.com/Azure/azure-iot-sdk-node)) to your development machine or device. You should always use the **master** branch for the latest version of the libraries and samples.

- If you are using Windows, open the **Node.js command prompt** and navigate to the local copy of this repository ([azure-iot-sdk-node](https://github.com/Azure/azure-iot-sdk-node)). Run the `build\dev-setup.cmd` script to prepare your development environment. Then run the `build\build.cmd` script to verify your installation.

- If you are using Linux, open a shell and navigate to the local copy of this repository ([azure-iot-sdk-node](https://github.com/Azure/azure-iot-sdk-node)). Run the `build/dev-setup.sh` script to prepare your development environment. Then run the `build/build.sh` script to verify your installation.

<a name="samplecode"/>
## Sample applications

This repository contains various Node.js sample applications that illustrate how to use the Microsoft Azure IoT SDKs for Node.js:
* [Device SDK samples][device-samples]
* [Service SDK samples][service-samples]

[node-linux]: https://github.com/nodejs/node-v0.x-archive/wiki/Installing-Node.js-via-package-manager
[device-samples]: ../device/samples/
[service-samples]: ../service/samples/
