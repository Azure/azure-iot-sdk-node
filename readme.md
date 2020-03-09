<div align="center">
  <img src="./doc/images/Azure IoT Hub.png">
</div>


![Build Status](https://azure-iot-sdks.visualstudio.com/azure-iot-sdks/_apis/build/status/node/node-canary)

# Getting Started

### Why Azure IoT? 

**[Click here][iot-dev-center]** to learn how Azure IoT can empower the digital transformation of your organization. 

### New to Azure IoT Hub?

**[Introduction to Azure IoT Hub:][iot-device-ecosystem]** Follow this guide to learn how to set up an IoT Hub and IoT Hub devices. 

### New to the Azure IoT Node.JS SDK? 

**[Try a Device Sample:](./device/samples/)** Create a basic Node.js application following one of the device client library samples provided. 


# Components

The Azure IoT Node.js SDK enables developers to create IoT solutions written in Node.js for the Azure IoT platform. It is composed of the following client libraries:

* **Device Client Library**: to connect devices to Azure IoT Hub. [API Reference][node-api-device-reference]
* **Service Client Library**: enables developing back-end applications making use of Azure IoT Hub. [API Reference][node-api-service-reference]
* **Provisioning Device Client Library**: to connect devices to the Azure IoT Provisioning Service. [API Reference][node-api-prov-device-reference]
* **Provisioning Service Client Library**: enables developing back-end applications making use of the Azure IoT Provisioning Service. [API Reference][node-api-prov-service-reference]

# Samples

| [Device Library Samples](./device/samples/) | [Service Library Samples](./service/samples/) |
|-----------------------------------------|-------------------------------------------|

# npm Package List 

**Azure IoT Hub Device Client Libraries**

| Name            | npm package                                                                                                |
|-----------------|------------------------------------------------------------------------------------------------------------|
|  Device Client  | [![npm version](https://badge.fury.io/js/azure-iot-device.svg)](https://badge.fury.io/js/azure-iot-device) |
|  MQTT Transport | [![npm version](https://badge.fury.io/js/azure-iot-device-mqtt.svg)](https://badge.fury.io/js/azure-iot-device-mqtt) |
|  AMQP Transport | [![npm version](https://badge.fury.io/js/azure-iot-device-amqp.svg)](https://badge.fury.io/js/azure-iot-device-amqp) |
|  HTTP Transport | [![npm version](https://badge.fury.io/js/azure-iot-device-http.svg)](https://badge.fury.io/js/azure-iot-device-http) |

**Azure IoT Hub Service Client Libraries**

| Name            | npm package                                                                                                |
|-----------------|------------------------------------------------------------------------------------------------------------|
| Service SDK  | [![npm version](https://badge.fury.io/js/azure-iothub.svg)](https://badge.fury.io/js/azure-iothub) |


**Azure IoT Hub Device Provisioning Service: Device Client Libraries**

| Name                  | npm package                                                                                                |
|-----------------------|------------------------------------------------------------------------------------------------------------|
|  Device Client        | [![npm version](https://badge.fury.io/js/azure-iot-provisioning-device.svg)](https://badge.fury.io/js/azure-iot-provisioning-device) |
|  MQTT Transport       | [![npm version](https://badge.fury.io/js/azure-iot-provisioning-device-mqtt.svg)](https://badge.fury.io/js/azure-iot-provisioning-device-mqtt)  |
|  AMQP Transport       | [![npm version](https://badge.fury.io/js/azure-iot-provisioning-device-amqp.svg)](https://badge.fury.io/js/azure-iot-provisioning-device-amqp) |
|  HTTP Transport       | [![npm version](https://badge.fury.io/js/azure-iot-provisioning-device-http.svg)](https://badge.fury.io/js/azure-iot-provisioning-device-http) |
|  TPM Security Client  | [![npm version](https://badge.fury.io/js/azure-iot-security-tpm.svg)](https://badge.fury.io/js/azure-iot-security-tpm) |
|  x509 Security Client |  [![npm version](https://badge.fury.io/js/azure-iot-security-x509.svg)](https://badge.fury.io/js/azure-iot-security-x509) |


**Azure IoT Hub Device Provisioning Service: Service Client Libraries**

| Name            | npm package                                                                                                |
|-----------------|------------------------------------------------------------------------------------------------------------|
| Service SDK     | [![npm version](https://badge.fury.io/js/azure-iot-provisioning-service.svg)](https://badge.fury.io/js/azure-iot-provisioning-service) |

# Working from Source Code

If you want to modify or contribute changes to the SDK, then you can build the libraries following **[these instructions](./doc/node-devbox-setup.md).**


# How to Contribute

If you encounter any bugs, have suggestions for new features or if you would like to become an active contributor to this project please follow the instructions provided in the [contribution guidelines](.github/CONTRIBUTING.md).
- **Have a feature request for SDKs?** Please post it on [User Voice](https://feedback.azure.com/forums/321918-azure-iot) to help us prioritize
- **Have a technical question?** Ask on [Stack Overflow with tag "azure-iot-hub"](https://stackoverflow.com/questions/tagged/azure-iot-hub)
- **Need Support?** Every customer with an active Azure subscription has access to [support](https://docs.microsoft.com/en-us/azure/azure-supportability/how-to-create-azure-support-request) with guaranteed response time.  Consider submitting a ticket and get assistance from Microsoft support team
- **Found a bug?** Please help us fix it by thoroughly documenting it and [filing an issue](https://github.com/Azure/azure-iot-sdk-node/issues/new).

# Platform Compatibility

The Azure IoT SDK for Node.js supports the LTS and Current versions of the [Node.js runtime](https://nodejs.org/en/about/releases/).

To enforce strong security practices the Device Client enforces secure connections using TLS 1.2 and above for AMQP, MQTT, and HTTP connections.

# Long Term Support

The project offers a Long Term Support (LTS) version to allow users that do not need the latest features to be shielded from unwanted changes.

A new LTS version will be created every 6 months. The lifetime of an LTS branch is currently planned for one year. LTS branches receive all bug fixes that fall in one of these categories:

- security bugfixes
- critical bugfixes (crashes, memory leaks, etc.)

No new features or improvements will be picked up in an LTS branch.

LTS branches are named lts_*mm*_*yyyy*, where *mm* and *yyyy* are the month and year when the branch was created. An example of such a branch is *lts_07_2017*.

### Schedule<sup>1</sup>

Below is a table showing the mapping of the LTS branches to the package versions released

| NPM Package | Github Branch | LTS Status | LTS Start Date | Maintenance End Date | Removed Date |
| :-----------: | :-----------: | :--------: | :------------: | :------------------: | :----------: |
| 1.7.x         | [lts_09_2018](https://github.com/Azure/azure-iot-sdk-node/tree/lts_09_2018)   | Deprecated | 2018-09-16     | 2019-09-16           | 2020-03-09   |
| 1.11.x        | [lts_09_2019](https://github.com/Azure/azure-iot-sdk-node/tree/lts_09_2019)   | Active     | 2019-09-09     | 2020-03-09           | 2020-09-19   |

<sup>1</sup> All scheduled dates are subject to change by the Azure IoT SDK team.

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
