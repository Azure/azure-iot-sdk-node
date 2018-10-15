# Prepare your development environment

This document describes how to prepare your development environment to work with the *Microsoft Azure IoT SDKs for Node.js* code.

**Important**: If you don't need to modify the code for the node SDKs, it is recommended to use the npm packages as the below instructions are meant to test the code and not to be used for app development.
Instructions for using the npm packages can be found here:
   * [npm package for the Device SDK](../device/core/readme.md)
   * [npm package for the Service SDK](../service/readme.md)

## Prerequisites

In order to work on the Azure IoT SDK for Node.js you must have Node.js installed. You can get Node.js from [here][node-download]. If you're running linux and want to install Node.js using a package manager, please refer to [these instructions][node-linux]. The Azure IoT SDK for Node.js supports Node.js version 6 and up. It may still work with older versions (Node 0.10, 0.12 and 4) but our dependencies are dropping support for those versions since they have been end-of-lifed, so we cannot guarantee full support for these anymore.

If you'd like to be able to switch from one Node.js version to another you can also use [Node Version Switcher][nvs].

In order to be able to create and test x509 certificates using our build scripts, you will also need to have [OpenSSL][openssl] installed.

<a name="devenv"/>

## Setup your development environment

The SDK is entirely open-source (as you probably figured out already if you're reading this on Github). Downloading the whole SDK source code is as simple as cloning the repository:

```
$ git clone https://github.com/azure/azure-iot-sdk-node
```

If you are going to be developing on Windows you will need to install some additional build tools.  In an administrator command prompt:

```
npm install -g windows-build-tools
```

This will probably take serveral minutes to run.

The SDK ships in a few separate NPM packages that depend on each other. Once the repository has been cloned, some features span across multiple packages so in order to build and test these features, we need to "link" those package together in a single environment. We use the awesome [lerna.js](https://lernajs.io) to do that, so you have to install this first.  At a prompt with administrative privileges:

```
npm install -g lerna
```

Once lerna is installed, you can set up your development environment by running the `bootstrap command` at the root of the repository: This will install all dependencies and link packages together.

```
lerna bootstrap
```

If you want to build/run the code, you'll need to compile the packages:

```
lerna run build
```

If you want to run the tests:

```
lerna run ci
```

and the end-to-end tests:

```
lerna run e2e
```

Please note that running tests and end-to-end tests require having an Azure IoT hub and an Azure IoT Hub Provisioning service setup and the proper environment variables configured. Here is the list of all the environment variables as well as how we use them:

- **OPENSSL_CONF**: The SDK build script relies on OpenSSL to create certificates and keys so OpenSSL must be in the path and `OPENSSL_CONF` must be set to the path of your `openssl.cnf` configuration file
- **IOTHUB_CONNECTION_STRING** must be set to a configuration string of your IoT Hub that has rights to create/delete devices and send messages to devices (typically, the one associated with the `iothubowner` policy or equivalent). Connection strings can be found in the settings section of the Azure portal.
- **STORAGE_CONNECTION_STRING** must be set to an Azure Storage connection string if you want to test bulk import/export of device identities
- **IOTHUB_CA_ROOT_CERT** must be set to the *base64-encoded content* of the certificate set a custom CA cert provisioned on IoT Hub.
- **IOTHUB_CA_ROOT_CERT_KEY** must be set to the *base64-encoded content* of the key if the custom CA cert provisioned on IoT Hub.
- **IOT_PROVISIONING_DEVICE_IDSCOPE** must be set to the idScope of your provisioning service.
- **IOT_PROVISIONING_DEVICE_ENDPOINT** must be set to the public endpoint of your provisioning service or the global endpoint.
- **IOT_PROVISIONING_SERVICE_CONNECTION_STRING** must be set to the connection string of your provisioning service.
- **IOT_PROVISIONING_ROOT_CERT** must be set to the *base64-encoded content* of a root certificate used to test the group enrollments feature of the device provisioning service
- **IOT_PROVISIONING_ROOT_CERT_KEY** must be set to the *base64-encoded content* of the key associated with the group enrollment root certificate.
- **DPS_CONN_STRING_INVALID_CERT** must be set to a connection string for a DPS instance, such that DNS resolution for the server specified in the connection string will direct to a server which does **not** present a matching certificate during TLS connection establishment.
- **DPS_GLOBAL_DEVICE_ENDPOINT_INVALID_CERT** must be set to a DPS global endpoint, such that DNS resolution for the server specified in the string will direct to a server which does **not** present a matching certificate during TLS connection establishment.
- **IOTHUB_CONN_STRING_INVALID_CERT** must be set to a connection string for an IoT Hub instance, such that DNS resolution for the server specified in the connection string will direct to a server which does **not** present a matching certificate during TLS connection establishment.
- **IOTHUB_DEVICE_CONN_STRING_INVALID_CERT** must be set to a connection string for an IoT Device, such that DNS resolution for the server specified in the connection string will direct to a server which does **not** present a matching certificate during TLS connection establishment.


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

### Tests

The Azure IoT SDKs team keeps a close watch on tests and code coverage when committing new code, whether it's for bugfixes or new features.
To learn how to run the unit, integration and E2E tests, [read this](./node-tests.md).

[node-download]: https://nodejs.org/en/download/
[node-linux]: https://nodejs.org/en/download/package-manager/
[nvs]: https://github.com/jasongin/nvs
[openssl]: https://www.openssl.org/
