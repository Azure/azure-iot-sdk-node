# Microsoft Azure IoT SDK for Node.js

This repository contains the following:
* **Azure IoT Hub Device SDK**: to connect client devices to Azure IoT Hub
* **Azure IoT Hub Service SDK**: enables developing back-end applications for Azure IoT
* **Node-RED node for Azure IoT**: enables creating Node-RED flows that connect with Azure IoT Hub

The API reference documentation for the device SDK is [here][node-api-device-reference].

The API reference documentation for the service SDK is [here][node-api-service-reference].

To find SDKs in other languages for Azure IoT, please refer to the [azure-iot-sdks][azure-iot-sdks] repository.

## Developing applications for Azure IoT

Visit [Azure IoT Dev Center][iot-dev-center] to learn more about developing applications for Azure IoT.

## How to use the Azure IoT SDKs for Node.js
[ATTN:CONTENT REQUIRED - doc/node-devbox-setup.md does not use the recursive switch in its clone instructions. Please update that doc or remove it from the instructinos here.]

Devices and data sources in an IoT solution can range from a simple network-connected sensor to a powerful, standalone computing device. Devices may have limited processing capability, memory, communication bandwidth, and communication protocol support. The IoT device SDKs enable you to implement client applications for a wide variety of devices.

* **Using npm packages**: the simplest way to use the Azure IoT SDKs for Node.js to develop device apps is to leverage the [npm](https://npmjs.org) packages:
   * [Device SDK](./device/core/readme.md)
   * [Service SDK](./service/readme.md)
* **Clone the repository**: The repository is using [GitHub Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules) for its dependencies. In order to automatically clone these submodules, you need to use the --recursive option as described here:
```
git clone --recursive https://github.com/Azure/azure-iot-sdk-node.git 
```
* **Working with the SDKs code**: if you are working with the SDK's code to modify it or to contribute changes, then you can clone the repository and build the libraries following [these instructions](./doc/node-devbox-setup.md).

## Key features and roadmap

### Device client SDK
:heavy_check_mark: feature available  :x: feature planned but not supported  :heavy_minus_sign: no support planned


| Features                                                                                                     | mqtt                 | mqtt-ws              | amqp                 | amqp-ws              | https                | Description                                                                                                                                                                                                                                                                                                       |
|--------------------------------------------------------------------------------------------------------------|----------------------|----------------------|----------------------|----------------------|----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Authentication](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-security-deployment)                 | :heavy_check_mark:   | :heavy_check_mark: * | :heavy_check_mark:   | :heavy_check_mark: * | :heavy_check_mark: * | Connect your device to IoT Hub securely with supported authentication, including private key, SASToken, X-509 Self Signed and Certificate Authority (CA) Signed.  *IoT Hub supports X-509 CA Signed over AMQP and MQTT only at the moment.                                                                        |
| Retry policies                                                                                               | :x:                  | :x:                  | :x:                  | :x:                  | :x:                  | Retry policy for unsuccessful device-to-cloud messages have three options: no try, exponential backoff with jitter (default) and custom.                                                                                                                                                                          |
| Devices multiplexing over single connection                                                                  | :heavy_minus_sign:   | :heavy_minus_sign:   | :x:                  | :x:                  | :x:                  |                                                                                                                                                                                                                                                                                                                   |
| Connection Pooling - Specifying number of connections                                                        | :heavy_minus_sign:   | :heavy_minus_sign:   | :x:                  | :x:                  | :x:                  |                                                                                                                                                                                                                                                                                                                   |
| [Send D2C message](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-messages-d2c)             | :heavy_check_mark: * | :heavy_check_mark: * | :heavy_check_mark: * | :heavy_check_mark: * | :heavy_check_mark: * | Send device-to-cloud messages (max 256KB) to IoT Hub with the option to add custom properties.  IoT Hub also supports batch send over AMQP and HTTPS only at the moment.  This SDK supports batch send over HTTP.  * Batch send over AMQP and AMQP-WS, and add system properties on D2C messages are in progress. |
| [Receive C2D messages](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-messages-c2d)         | :heavy_check_mark: * | :heavy_check_mark: * | :heavy_check_mark:   | :heavy_check_mark:   | :heavy_check_mark:   | Receive cloud-to-device messages and read associated custom and system properties from IoT Hub, with the option to complete/reject/abandon C2D messages.  *IoT Hub supports the option to complete/reject/abandon C2D messages over HTTPS and AMQP only at the moment.                                            |
| [Upload file to Blob](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-file-upload)           |                      |                      |                      |                      | :heavy_check_mark:   | A device can initiate a file upload and notifies IoT Hub when the upload is complete.   File upload requires HTTPS connection, but can be initiated from client using any protocol for other operations.                                                                                                          |
| [Device Twins](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-device-twins)                 | :heavy_check_mark: * | :heavy_check_mark: * | :heavy_check_mark: * | :heavy_check_mark: * | :heavy_minus_sign:   | IoT Hub persists a device twin for each device that you connect to IoT Hub.  The device can perform operations like get twin tags, subscribe to desired properties.  *Send reported properties version and desired properties version are in progress.                                                            |
| [Direct Methods](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-direct-methods)             | :heavy_check_mark: * | :heavy_check_mark: * | :heavy_check_mark: * | :heavy_check_mark: * | :heavy_minus_sign:   | IoT Hub gives you the ability to invoke direct methods on devices from the cloud.  The SDK supports handler for method specific operation.  *Handler for generic operation is in progress                                                                                                                         |
| [Connection Status and Error reporting](https://docs.microsoft.com/en-us/rest/api/iothub/common-error-codes) | :heavy_check_mark:   | :heavy_check_mark:   | :heavy_check_mark:   | :heavy_check_mark:   | :heavy_check_mark:   | Error reporting for IoT Hub supported error code.                                                                                                                                                                                                                                                                 |

### Service client SDK
:white_check_mark: feature available  :large_blue_diamond: feature in-progress  :large_orange_diamond: feature planned  :x: no support planned

| Feature                   | Status                 | Description                                                                                                                                                                                                                                                            |
|---------------------------|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Identity registry (CRUD)  | :large_orange_diamond: | Use your backend app to perform CRUD operation for individual device or in bulk.  Click [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-identity-registry) for detailed information on the IoT Hub features.                                    |
| Messaging                 | :large_orange_diamond: | Use your backend app to send cloud-to-device messages in AMQP and AMQP-WS, and set up cloud-to-device message receivers.  Click [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-messages-c2d) for detailed information on the IoT Hub features. |
| Direct Methods operations | :white_check_mark:     | Use your backend app to invoke direct method on device.  Click [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-direct-methods) for detailed information on the IoT Hub features.                                                                |
| Device Twins operations   | :white_check_mark:     | Use your backend app to perform device twin operations.  Click [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-device-twins) for detailed information on the IoT Hub features.                                                                  |
| Query raw                 | :white_check_mark:     | Use your backend app to perform query for information.  Click [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-query-language) for detailed information on the IoT Hub features.                                                                 |
| Jobs                      | :white_check_mark:     | Use your backend app to perform job operation.  Click [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-jobs) for detailed information on the IoT Hub features.                                                                                   |
| File Upload               | :white_check_mark:     | Set up your backend app to send file upload notification receiver.  Click [here](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-file-upload) for detailed information on the IoT Hub features.                                                        |
| SDK Versioning            | :large_orange_diamond: | Use your backend app to get Service Client SDK Version.                                                                                                                                                                                                                |


## Samples

In the repository, you will find a set of simple samples that will help you get started:
- [Device SDK samples](./device/samples/)
- [Service SDK samples](./service/samples/)

## OS platforms and hardware compatibility
[ATTN:CONTENT REQUIRED - this whole section is copied from the C SDK, please check requirements.]

The IoT Hub device SDK for Java can be used with a broad range of OS platforms and devices:
[INCLUDE A LIST OF PLATFORMS SUPPORTED BY Node OUT OF BOX]

The minimum requirements are for the device platform to support the following:

- **Being capable of establishing an IP connection**: only IP-capable devices can communicate directly with Azure IoT Hub.
- **Support TLS**: required to establish a secure communication channel with Azure IoT Hub.
- **Support SHA-256** (optional): necessary to generate the secure token for authenticating the device with the service. Different authentication methods are available and not all require SHA-256.
- **Have a Real Time Clock or implement code to connect to an NTP server**: necessary for both establishing the TLS connection and generating the secure token for authentication.
- **Having at least 64KB of RAM**: the memory footprint of the SDK depends on the SDK and protocol used as well as the platform targeted. The smallest footprint is achieved targeting microcontrollers.

You can find an exhaustive list of the OS platforms the various SDKs have been tested against in the [Azure Certified for IoT device catalog](https://catalog.azureiotsuite.com/). Note that you might still be able to use the SDKs on OS and hardware platforms that are not listed on this page: all the SDKs are open sourced and designed to be portable. If you have suggestions, feedback or issues to report, refer to the Contribution and Support sections below.

## Contribution, feedback and issues

If you encounter any bugs, have suggestions for new features or if you would like to become an active contributor to this project please follow the instructions provided in the [contribution guidelines](.github/CONTRIBUTING.md).

## Support

If you are having issues using one of the packages or using the Azure IoT Hub service that go beyond simple bug fixes or help requests that would be dealt within the [issues section](./issues) of this project, the Microsoft Customer Support team will try and help out on a best effort basis.
To engage Microsoft support, you can create a support ticket directly from the [Azure portal](https://ms.portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade).
Escalated support requests for Azure IoT Hub SDK's development questions will only be available Monday thru Friday during normal coverage hours of 6 a.m. to 6 p.m. PST.
Here is what you can expect Microsoft Support to be able to help with:
* **Client SDKs issues**: If you are trying to compile and run the libraries on a supported platform, the Support team will be able to assist with troubleshooting or questions related to compiler issues and communications to and from the IoT Hub.  They will also try to assist with questions related to porting to an unsupported platform, but will be limited in how much assistance can be provided.  The team will be limited with trouble-shooting the hardware device itself or drivers and or specific properties on that device.
* **IoT Hub / Connectivity Issues**: Communication from the device client to the Azure IoT Hub service and communication from the Azure IoT Hub service to the client.  Or any other issues specifically related to the Azure IoT Hub.
* **Portal Issues**: Issues related to the portal, that includes access, security, dashboard, devices, Alarms, Usage, Settings and Actions.
* **REST/API Issues**: Using the IoT Hub REST/APIs that are documented in the [documentation]( https://msdn.microsoft.com/library/mt548492.aspx).

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

Below is a table showing the mapping of the LTS branches to the packages released

| NPM Package | Github Branch | LTS Status | LTS Start Date | Maintenance End Date | Removed Date |
| :-----------: | :-----------: | :--------: | :------------: | :------------------: | :----------: |
| 1.x.x         | lts_07_2017   | Active     | 2017-07-01     | 2017-12-31           | 2018-06-30   |

* <sup>1</sup> All scheduled dates are subject to change by the Azure IoT SDK team.

### Planned Release Schedule
![](./lts_branches.png)

---
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

[iot-dev-center]: http://azure.com/iotdev
[iot-hub-documentation]: https://docs.microsoft.com/en-us/azure/iot-hub/
[azure-iot-sdks]: http://github.com/azure/azure-iot-sdks
[node-api-service-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iothub/
[node-api-device-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iot-device/
[devbox-setup]: doc/node-devbox-setup.md
[setup-iothub]: https://aka.ms/howtocreateazureiothub

