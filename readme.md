# Microsoft Azure IoT SDK for Node.js

This repository contains the following:
* **Azure IoT Hub Device SDK**: to connect client devices to Azure IoT Hub
* **Azure IoT Hub Service SDK**: enables developing back-end applications for Azure IoT
* **Node-RED node for Azure IoT**: demonstrates how to create a Node-RED node that connect with Azure IoT Hub

The API reference documentation for the device SDK is [here][node-api-device-reference].

The API reference documentation for the service SDK is [here][node-api-service-reference].

To find SDKs in other languages for Azure IoT, please refer to the [azure-iot-sdks][azure-iot-sdks] repository.

## Developing applications for Azure IoT

Visit [Azure IoT Dev Center][iot-dev-center] to learn more about developing applications for Azure IoT.

## How to use the Azure IoT SDKs for Node.js

Devices and data sources in an IoT solution can range from a simple network-connected sensor to a powerful, standalone computing device. Devices may have limited processing capability, memory, communication bandwidth, and communication protocol support. The IoT device SDKs enable you to implement client applications for a wide variety of devices.

* **Using npm packages**: the simplest way to use the Azure IoT SDKs for Node.js to develop device apps is to leverage the [npm](https://npmjs.org) packages:
   * [Device SDK](./device/core/readme.md)
   * [Service SDK](./service/readme.md)
* **Clone the repository**
```
git clone https://github.com/Azure/azure-iot-sdk-node.git
```
* **Working with the SDKs code**: if you are working with the SDK's code to modify it or to contribute changes, then you can clone the repository and build the libraries following [these instructions](./doc/node-devbox-setup.md).

## Key features and roadmap

### Device client SDK
:heavy_check_mark: feature available  :heavy_multiplication_x: feature planned but not supported  :heavy_minus_sign: no support planned

| Features                                                                                                         | mqtt                | mqtt-ws             | amqp                     | amqp-ws                  | https                    | Description                                                                                                                                                                                                                                                                                                   |
|------------------------------------------------------------------------------------------------------------------|---------------------|---------------------|--------------------------|--------------------------|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Authentication](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-security-deployment)                     | :heavy_check_mark:  | :heavy_check_mark:* | :heavy_check_mark:       | :heavy_check_mark:*      | :heavy_check_mark:*      | Connect your device to IoT Hub securely with supported authentication, including private key, SASToken, X-509 Self Signed and Certificate Authority (CA) Signed.  *IoT Hub only supports X-509 CA Signed over AMQP and MQTT  at the moment.                                                                   |
| [Send device-to-cloud message](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-messages-d2c)     | :heavy_check_mark:* | :heavy_check_mark:* | :heavy_check_mark:*      | :heavy_check_mark:*      | :heavy_check_mark:*      | Send device-to-cloud messages (max 256KB) to IoT Hub with the option to add custom properties.  IoT Hub only supports batch send over AMQP and HTTPS  at the moment.  This SDK supports batch send over HTTP.  * Batch send over AMQP and AMQP-WS, and add system properties on D2C messages are in progress. |
| [Receive cloud-to-device messages](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-messages-c2d) | :heavy_check_mark:* | :heavy_check_mark:* | :heavy_check_mark:       | :heavy_check_mark:       | :heavy_check_mark:       | Receive cloud-to-device messages and read associated custom and system properties from IoT Hub, with the option to complete/reject/abandon C2D messages.  *IoT Hub supports the option to complete/reject/abandon C2D messages over HTTPS and AMQP only at the moment.                                        |
| [Device Twins](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-device-twins)                     | :heavy_check_mark:* | :heavy_check_mark:* | :heavy_check_mark:*      | :heavy_check_mark:*      | :heavy_minus_sign:       | IoT Hub persists a device twin for each device that you connect to IoT Hub.  The device can perform operations like get twin tags, subscribe to desired properties.  *Send reported properties version and desired properties version are in progress.                                                        |
| [Direct Methods](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-direct-methods)                 | :heavy_check_mark:* | :heavy_check_mark:* | :heavy_check_mark:*      | :heavy_check_mark:*      | :heavy_minus_sign:       | IoT Hub gives you the ability to invoke direct methods on devices from the cloud.  The SDK supports handler for method specific operation.  *Handler for generic operation is in progress                                                                                                                     |
| [Upload file to Blob](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-file-upload)               | :heavy_minus_sign:  | :heavy_minus_sign:  | :heavy_minus_sign:       | :heavy_minus_sign:       | :heavy_check_mark:       | A device can initiate a file upload and notifies IoT Hub when the upload is complete.   File upload requires HTTPS connection, but can be initiated from client using any protocol for other operations.                                                                                                      |
| [Connection Status and Error reporting](https://docs.microsoft.com/en-us/rest/api/iothub/common-error-codes)     | :heavy_check_mark:  | :heavy_check_mark:  | :heavy_check_mark:       | :heavy_check_mark:       | :heavy_check_mark:       | Error reporting for IoT Hub supported error code.                                                                                                                                                                                                                                                             |
| Retry policies                                                                                                   | :heavy_check_mark:  | :heavy_check_mark:  | :heavy_check_mark:       | :heavy_check_mark:       | :heavy_check_mark:       | Retry policy for unsuccessful device-to-cloud messages have three options: no try, exponential backoff with jitter (default) and custom.                                                                                                                                                                      |
| Devices multiplexing over single connection                                                                      | :heavy_minus_sign:  | :heavy_minus_sign:  | :heavy_multiplication_x: | :heavy_multiplication_x: | :heavy_multiplication_x: |                                                                                                                                                                                                                                                                                                               |
| Connection Pooling - Specifying number of connections                                                            | :heavy_minus_sign:  | :heavy_minus_sign:  | :heavy_multiplication_x: | :heavy_multiplication_x: | :heavy_multiplication_x: |                                                                                                                                                                                                                                                                                                               |

### Service client SDK
:heavy_check_mark: feature available  :heavy_multiplication_x: feature planned but not supported  :heavy_minus_sign: no support planned

| Features                                                                                                      | Node               | Description                                                                                                                        |
|---------------------------------------------------------------------------------------------------------------|--------------------|------------------------------------------------------------------------------------------------------------------------------------|
| [Identity registry (CRUD)](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-identity-registry) | :heavy_check_mark: | Use your backend app to perform CRUD operation for individual device or in bulk.                                                   |
| [Cloud-to-device messaging](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-messages-c2d)     | :heavy_check_mark: | Use your backend app to send cloud-to-device messages in AMQP and AMQP-WS, and set up cloud-to-device message receivers.           |
| [Direct Methods operations](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-direct-methods)   | :heavy_check_mark: | Use your backend app to invoke direct method on device.                                                                            |
| [Device Twins operations](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-device-twins)       | :heavy_check_mark: *| Use your backend app to perform device twin operations.  *Twin reported property update callback and replace twin are in progress. |
| [Query](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-query-language)                       | :heavy_check_mark: | Use your backend app to perform query for information.                                                                             |
| [Jobs](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-jobs)                                  | :heavy_check_mark: | Use your backend app to perform job operation.                                                                                     |
| [File Upload](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-file-upload)                    | :heavy_check_mark: | Set up your backend app to send file upload notification receiver.                                                                 |

### Provisioning client SDK
:heavy_check_mark: feature available  :heavy_multiplication_x: feature planned but not supported  :heavy_minus_sign: no support planned

This repository contains [provisioning device client SDK](./provisioning/device/) for the [Device Provisioning Service](https://docs.microsoft.com/en-us/azure/iot-dps/). 

| Features                    | mqtt               | mqtt-ws            | amqp               | amqp-ws            | https              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
|-----------------------------|--------------------|--------------------|--------------------|--------------------|--------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| TPM Individual Enrollment   |  :heavy_minus_sign: |  :heavy_minus_sign: | :heavy_multiplication_x: | :heavy_multiplication_x: | :heavy_multiplication_x: | This SDK does not support connecting your device to the Device Provisioning Service via [individual enrollment](https://docs.microsoft.com/en-us/azure/iot-dps/concepts-service#enrollment) using [Trusted Platform Module](https://docs.microsoft.com/en-us/azure/iot-dps/concepts-security#trusted-platform-module-tpm) yet.                                                                                                                                                                                                             |
| X.509 Individual Enrollment | :heavy_check_mark: | :heavy_check_mark: | :heavy_check_mark: | :heavy_check_mark: | :heavy_check_mark: | This SDK supports connecting your device to the Device Provisioning Service via [individual enrollment](https://docs.microsoft.com/en-us/azure/iot-dps/concepts-service#enrollment) using [X.509 root certificate](https://docs.microsoft.com/en-us/azure/iot-dps/concepts-security#root-certificate)).   Please visit the [samples folder](./provisioning/provisioning-samples/) to learn more about this feature. |
| X.509 Enrollment Group      | :heavy_check_mark: | :heavy_check_mark: | :heavy_check_mark: | :heavy_check_mark: | :heavy_check_mark: | This SDK supports connecting your device to the Device Provisioning Service via [enrollment group](https://docs.microsoft.com/en-us/azure/iot-dps/concepts-service#enrollment) using [X.509 root certificate](This SDK supports connecting your device to the Device Provisioning Service via [individual enrollment](https://docs.microsoft.com/en-us/azure/iot-dps/concepts-service#enrollment) using [X.509 leaf certificate](https://docs.microsoft.com/en-us/azure/iot-dps/concepts-security#leaf-certificate)).   Please visit the [samples folder](./provisioning/provisioning-samples/) to learn more about this feature.                                                                                                                                                                                            |



### Provisioniong service client SDK
This repository contains [provisioning service client SDK](./provisioning/service/) for the Device Provisioning Service to [programmatically enroll devices](https://docs.microsoft.com/en-us/azure/iot-dps/how-to-manage-enrollments-sdks).

| Feature                                            | Support            | Description                                                                                                                                                                                                                                            |
|----------------------------------------------------|--------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| CRUD Operation with TPM Individual Enrollment      | :heavy_check_mark: | Programmatically manage device enrollment using TPM with the service SDK.  Please visit the [samples folder](./provisioning/service/samples/) and this [quickstart](https://docs.microsoft.com/en-us/azure/iot-dps/quick-enroll-device-tpm-node) to learn more about this feature. |
| Bulk CRUD Operation with TPM Individual Enrollment | :heavy_check_mark: | Programmatically bulk manage device enrollment using TPM with the service SDK.  Please visit the [samples folder](./provisioning/service/samples/) to learn more about this feature. |
| CRUD Operation with X.509 Individual Enrollment    | :heavy_check_mark: | Programmatically manage device enrollment using X.509 individual enrollment with the service SDK.  Please visit the [samples folder](./provisioning/service/samples/) and this [quickstart](https://docs.microsoft.com/en-us/azure/iot-dps/quick-enroll-device-x509-node)to learn more about this feature. |
| CRUD Operation with X.509 Group Enrollment         | :heavy_check_mark: | Programmatically manage device enrollment using X.509 group enrollment with the service SDK.  Please visit the [samples folder](./provisioning/service/samples/) to learn more about this feature. |
| Query enrollments                                  | :heavy_check_mark: | Programmatically query registration states with the service SDK.  Please visit the [samples folder](./provisioning/service/samples/) to learn more about this feature.                                                                            |

## Samples

In the repository, you will find a set of simple samples that will help you get started:
- [Device SDK samples](./device/samples/)
- [Service SDK samples](./service/samples/)

## Platforms compatibility

The Azure IoT SDK for Node.js should work with versions of Node.js as old as v0.10.x. this being said, a lot of dependencies are slowly dropping support for these older versions and we really have no control over that.

It is recommended to update to at least Node.js v4.x.x.

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

