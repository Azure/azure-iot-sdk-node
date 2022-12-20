<div align="center">
  <img src="./doc/images/Azure IoT Hub.png">
</div>


![Build Status](https://azure-iot-sdks.visualstudio.com/azure-iot-sdks/_apis/build/status/node/node-canary)

## Critical Upcoming Change Notice

All Azure IoT SDK users are advised to be aware of upcoming TLS certificate changes for Azure IoT Hub and Device Provisioning Service
that will impact the SDK's ability to connect to these services. In October 2022, both services will migrate from the current
[Baltimore CyberTrust CA Root](https://baltimore-cybertrust-root.chain-demos.digicert.com/info/index.html) to the
[DigiCert Global G2 CA root](https://global-root-g2.chain-demos.digicert.com/info/index.html). There will be a
transition period beforehand where your IoT devices must have both the Baltimore and Digicert public certificates
installed in their certificate store in order to prevent connectivity issues.

**Devices with only the Baltimore public certificate installed will lose the ability to connect to Azure IoT hub and Device Provisioning Service in October 2022.**

To prepare for this change, make sure your device's certificate store has both of these public certificates installed.

For a more in depth explanation as to why the IoT services are doing this, please see
[this article](https://techcommunity.microsoft.com/t5/internet-of-things/azure-iot-tls-critical-changes-are-almost-here-and-why-you/ba-p/2393169).

# Getting Started

### Why Azure IoT?

**[Click here][iot-dev-center]** to learn how Azure IoT can empower the digital transformation of your organization.

### New to Azure IoT Hub?

**[Introduction to Azure IoT Hub:][iot-device-ecosystem]** Follow this guide to learn how to set up an IoT Hub and IoT Hub devices.

### New to the Azure IoT Node.JS SDK?

**[Try a Device Sample:](./device/samples/)** Create a basic Node.js application following one of the device client library samples provided.


# Components

The Azure IoT Node.js SDK enables developers to create IoT solutions written in Node.js for the Azure IoT platform. It is composed of the following client libraries:

* **Device Client Library**: to connect devices and IoT Edge modules to Azure IoT Hub. [API Reference][node-api-device-reference] | [README](https://github.com/Azure/azure-iot-sdk-node/tree/main/device) | [Configuration Options](https://github.com/Azure/azure-iot-sdk-node/blob/main/doc/device-client.md)
  * **Note:** IoT Edge for Node.js is scoped to Linux containers & devices only. [Learn more](https://techcommunity.microsoft.com/t5/internet-of-things/linux-modules-with-azure-iot-edge-on-windows-10-iot-enterprise/ba-p/1407066) about using Linux containers for IoT edge on Windows devices.
* **Service Client Library**: enables developing back-end applications making use of Azure IoT Hub. [API Reference][node-api-service-reference]
* **Provisioning Device Client Library**: to connect devices to the Azure IoT Provisioning Service. [API Reference][node-api-prov-device-reference]
* **Provisioning Service Client Library**: enables developing back-end applications making use of the Azure IoT Provisioning Service. [API Reference][node-api-prov-service-reference]

# Samples

[Device Library Samples](./device/samples/)

# npm Package List

**Azure IoT Hub [Device Client Libraries](https://github.com/Azure/azure-iot-sdk-node/tree/main/device)**

| Name            | npm package                                                                                                |
|-----------------|------------------------------------------------------------------------------------------------------------|
|  Device Client  | [![npm version](https://badge.fury.io/js/azure-iot-device.svg)](https://badge.fury.io/js/azure-iot-device) |
|  MQTT Transport | [![npm version](https://badge.fury.io/js/azure-iot-device-mqtt.svg)](https://badge.fury.io/js/azure-iot-device-mqtt) |
|  AMQP Transport | [![npm version](https://badge.fury.io/js/azure-iot-device-amqp.svg)](https://badge.fury.io/js/azure-iot-device-amqp) |
|  HTTP Transport | [![npm version](https://badge.fury.io/js/azure-iot-device-http.svg)](https://badge.fury.io/js/azure-iot-device-http) |

**Azure IoT Hub Device Provisioning Service: Device Client Libraries**

| Name                  | npm package                                                                                                |
|-----------------------|------------------------------------------------------------------------------------------------------------|
|  Device Client        | [![npm version](https://badge.fury.io/js/azure-iot-provisioning-device.svg)](https://badge.fury.io/js/azure-iot-provisioning-device) |
|  MQTT Transport       | [![npm version](https://badge.fury.io/js/azure-iot-provisioning-device-mqtt.svg)](https://badge.fury.io/js/azure-iot-provisioning-device-mqtt)  |
|  AMQP Transport       | [![npm version](https://badge.fury.io/js/azure-iot-provisioning-device-amqp.svg)](https://badge.fury.io/js/azure-iot-provisioning-device-amqp) |
|  HTTP Transport       | [![npm version](https://badge.fury.io/js/azure-iot-provisioning-device-http.svg)](https://badge.fury.io/js/azure-iot-provisioning-device-http) |
|  TPM Security Client  | [![npm version](https://badge.fury.io/js/azure-iot-security-tpm.svg)](https://badge.fury.io/js/azure-iot-security-tpm) |
|  x509 Security Client |  [![npm version](https://badge.fury.io/js/azure-iot-security-x509.svg)](https://badge.fury.io/js/azure-iot-security-x509) |


# Working from Source Code

If you want to modify or contribute changes to the SDK, then you can build the libraries following **[these instructions](./doc/node-devbox-setup.md).**


# How to Contribute

If you encounter any bugs, have suggestions for new features or if you would like to become an active contributor to this project please follow the instructions provided in the [contribution guidelines](.github/CONTRIBUTING.md).
- **Have a feature request for SDKs?** Please post it on [User Voice](https://feedback.azure.com/forums/321918-azure-iot) to help us prioritize
- **Have a technical question?** Ask on [Stack Overflow with tag "azure-iot-hub"](https://stackoverflow.com/questions/tagged/azure-iot-hub)
- **Need Support?** Every customer with an active Azure subscription has access to [support](https://docs.microsoft.com/en-us/azure/azure-supportability/how-to-create-azure-support-request) with guaranteed response time.  Consider submitting a ticket and get assistance from Microsoft support team
- **Found a bug?** Please help us fix it by thoroughly documenting it and [filing an issue](https://github.com/Azure/azure-iot-sdk-node/issues/new).

# Platform Compatibility

The Azure IoT SDK for Node.js supports [active LTS, maintainence LTS, and current releases of the Node.js runtime](https://nodejs.dev/en/about/releases/)

# Releases

The Node SDK offers releases for new features, critical bug fixes, and Long Term Support (LTS). NPM package versioning follows [semantic versioning](https://semver.org/), `x.y.z.` or `major.minor.patch`. Any time the version is updated, it will be tagged `x.y.z`.

## New Features and Critical Bug Fixes

New features and critical bug fixes (including security updates) will be released on the main branch. These releases will be tagged using the date formatted `yyyy-mm-dd`. A feature release will bump the `minor` version and reset the `patch` version to 0. A critical bug fix will bump the `patch` version only.

# Read More

* [Azure IoT Hub documentation][iot-hub-documentation]
* [Prepare your development environment to use the Azure IoT device SDK for Node.js][devbox-setup]
* [Setup IoT Hub][setup-iothub]
* [Node.js API reference: Service SDK][node-api-service-reference]
* [Node.js API reference: Device SDK][node-api-device-reference]

---

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

Microsoft collects performance and usage information which may be used to provide and improve Microsoft products and services and enhance your experience.  To learn more, review the [privacy statement](https://go.microsoft.com/fwlink/?LinkId=521839&clcid=0x409).


[iot-device-ecosystem]: https://github.com/Azure/azure-iot-device-ecosystem/blob/master/setup_iothub.md
[iot-dev-center]: http://azure.com/iotdev
[iot-hub-documentation]: https://docs.microsoft.com/en-us/azure/iot-hub/
[azure-iot-sdks]: http://github.com/azure/azure-iot-sdks
[node-api-service-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iothub/
[node-api-device-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iot-device/
[node-api-prov-service-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iot-provisioning-service
[node-api-prov-device-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iot-provisioning-device/
[devbox-setup]: doc/node-devbox-setup.md
[setup-iothub]: https://aka.ms/howtocreateazureiothub
