# Microsoft Azure IoT SDK for Node.js

![Build Status](https://azure-iot-sdks.visualstudio.com/azure-iot-sdks/_apis/build/status/node/node-canary)

This repository contains the following SDKs:
* **Azure IoT Hub Device SDK**: to connect devices to Azure IoT Hub. [API Reference][node-api-device-reference]
* **Azure IoT Hub Service SDK**: enables developing back-end applications making use of Azure IoT Hub. [API Reference][node-api-service-reference]
* **Azure IoT Hub Provisioning Device SDK**: to connect devices to the Azure IoT Hub Provisioning Service. [API Reference][node-api-prov-device-reference]
* **Azure IoT Hub Provisioning Service SDK**: enables developing back-end applications making use of the Azure IoT Provisioning Service. [API Reference][node-api-prov-service-reference]

## Developing applications for Azure IoT

Visit [Azure IoT Dev Center][iot-dev-center] to learn more about developing applications for Azure IoT.

## How to use the Azure IoT SDKs for Node.js

Devices and data sources in an IoT solution can range from a simple network-connected sensor to a powerful, standalone computing device. Devices may have limited processing capability, memory, communication bandwidth, and communication protocol support. The IoT device SDKs enable you to implement client applications for a wide variety of devices.

The SDK team publishes the SDKs as [npm](https://npmjs.org) packages:
- **Azure IoT Hub Device SDK**
  - [Device Client](https://www.npmjs.com/package/azure-iot-device) [![npm version](https://badge.fury.io/js/azure-iot-device.svg)](https://badge.fury.io/js/azure-iot-device)
  - [MQTT Transport](https://www.npmjs.com/package/azure-iot-device-mqtt) [![npm version](https://badge.fury.io/js/azure-iot-device-mqtt.svg)](https://badge.fury.io/js/azure-iot-device-mqtt)
  - [AMQP Transport](https://www.npmjs.com/package/azure-iot-device-amqp) [![npm version](https://badge.fury.io/js/azure-iot-device-amqp.svg)](https://badge.fury.io/js/azure-iot-device-amqp)
  - [HTTP Transport](https://www.npmjs.com/package/azure-iot-device-http) [![npm version](https://badge.fury.io/js/azure-iot-device-http.svg)](https://badge.fury.io/js/azure-iot-device-http)
- **Azure IoT Hub Service SDK**
  - [Service SDK](https://www.npmjs.com/package/azure-iothub) [![npm version](https://badge.fury.io/js/azure-iothub.svg)](https://badge.fury.io/js/azure-iothub)
- **Azure IoT Hub Device Provisioning Service: Device SDK**
  - [Device Client](https://www.npmjs.com/package/azure-iot-provisioning-device) [![npm version](https://badge.fury.io/js/azure-iot-provisioning-device.svg)](https://badge.fury.io/js/azure-iot-provisioning-device)
  - [MQTT Transport](https://www.npmjs.com/package/azure-iot-provisioning-device-mqtt) [![npm version](https://badge.fury.io/js/azure-iot-provisioning-device-mqtt.svg)](https://badge.fury.io/js/azure-iot-provisioning-device-mqtt)
  - [AMQP Transport](https://www.npmjs.com/package/azure-iot-provisioning-device-amqp) [![npm version](https://badge.fury.io/js/azure-iot-provisioning-device-amqp.svg)](https://badge.fury.io/js/azure-iot-provisioning-device-amqp)
  - [HTTP Transport](https://www.npmjs.com/package/azure-iot-provisioning-device-http) [![npm version](https://badge.fury.io/js/azure-iot-provisioning-device-http.svg)](https://badge.fury.io/js/azure-iot-provisioning-device-http)
  - [TPM Security Client](https://www.npmjs.com/package/azure-iot-security-tpm) [![npm version](https://badge.fury.io/js/azure-iot-security-tpm.svg)](https://badge.fury.io/js/azure-iot-security-tpm)
  - [x509 Security Client](https://www.npmjs.com/package/azure-iot-security-x509) [![npm version](https://badge.fury.io/js/azure-iot-security-x509.svg)](https://badge.fury.io/js/azure-iot-security-x509)
- **Azure IoT Hub Device Provisioning Service: Service SDK**
  - [Service SDK](https://www.npmjs.com/package/azure-iot-provisioning-service) [![npm version](https://badge.fury.io/js/azure-iot-provisioning-service.svg)](https://badge.fury.io/js/azure-iot-provisioning-service)

* **Working with the SDKs code**: if you are working with the SDK's code to modify it or to contribute changes, then you can clone the repository and build the libraries following [these instructions](./doc/node-devbox-setup.md).

## Need Support?
- **Have a feature request for SDKs?** Please post it on [User Voice](https://feedback.azure.com/forums/321918-azure-iot) to help us prioritize
- **Have a technical question?** Ask on [Stack Overflow with tag "azure-iot-hub"](https://stackoverflow.com/questions/tagged/azure-iot-hub)
- **Need Support?** Every customer with an active Azure subscription has access to [support](https://docs.microsoft.com/en-us/azure/azure-supportability/how-to-create-azure-support-request) with guaranteed response time.  Consider submitting a ticket and get assistance from Microsoft support team
- **Found a bug?** Please help us fix it by thoroughly documenting it and [filing an issue](https://github.com/Azure/azure-iot-sdk-node/issues/new).

## Key features and roadmap

Here's a [feature matrix](./feature_matrix.md) that will help you understand what feature is supported with which protocol.

## Samples

In the repository, you will find a set of simple samples that will help you get started:
- [Device SDK samples](./device/samples/)
- [Service SDK samples](./service/samples/)

## Platforms compatibility

The Azure IoT SDK for Node.js *should work* with versions of Node.js as old as v0.10.x. this being said, a lot of dependencies are slowly dropping support for these older versions and we really have no control over that.

It is recommended to update to at least Node.js v4.x.x.

## Contribution, feedback and issues

If you encounter any bugs, have suggestions for new features or if you would like to become an active contributor to this project please follow the instructions provided in the [contribution guidelines](.github/CONTRIBUTING.md).

## Looking for SDKs for other languages/platforms?
- [C](https://github.com/azure/azure-iot-sdk-c)
- [Python](https://github.com/azure/azure-iot-sdk-python)
- [Java](https://github.com/azure/azure-iot-sdk-java)
- [.NET](https://github.com/azure/azure-iot-sdk-csharp)

## Read more

* [Azure IoT Hub documentation][iot-hub-documentation]
* [Prepare your development environment to use the Azure IoT device SDK for Node.js][devbox-setup]
* [Setup IoT Hub][setup-iothub]
* [Node.js API reference: Service SDK][node-api-service-reference]
* [Node.js API reference: Device SDK][node-api-device-reference]

# Long Term Support

The project offers a Long Term Support (LTS) version to allow users that do not need the latest features to be shielded from unwanted changes.

A new LTS version will be created every 6 months. The lifetime of an LTS branch is currently planned for one year. LTS branches receive all bug fixes that fall in one of these categories:

- security bugfixes
- critical bugfixes (crashes, memory leaks, etc.)

No new features or improvements will be picked up in an LTS branch.

LTS branches are named lts_*mm*_*yyyy*, where *mm* and *yyyy* are the month and year when the branch was created. An example of such a branch is *lts_07_2017*.

## Schedule<sup>1</sup>

Below is a table showing the mapping of the LTS branches to the package versions released

| NPM Package | Github Branch | LTS Status | LTS Start Date | Maintenance End Date | Removed Date |
| :-----------: | :-----------: | :--------: | :------------: | :------------------: | :----------: |
| 1.3.x         | [lts_02_2018](https://github.com/azure/azure-iot-sdk-node/tree/lts_02_2018)   | Active     | 2018-02-16     | 2018-08-16           | 2019-02-16   |

* <sup>1</sup> All scheduled dates are subject to change by the Azure IoT SDK team.

---
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

[iot-dev-center]: http://azure.com/iotdev
[iot-hub-documentation]: https://docs.microsoft.com/en-us/azure/iot-hub/
[azure-iot-sdks]: http://github.com/azure/azure-iot-sdks
[node-api-service-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iothub/
[node-api-device-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iot-device/
[node-api-prov-service-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iot-provisioning-service
[node-api-prov-device-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iot-provisioning-device/
[devbox-setup]: doc/node-devbox-setup.md
[setup-iothub]: https://aka.ms/howtocreateazureiothub
