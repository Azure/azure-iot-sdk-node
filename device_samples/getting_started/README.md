# Getting started samples (level 100)

These getting started samples are perfect for someone just getting into the [Azure IoT Device SDK for Node.js](https://github.com/Azure/azure-iot-sdk-node). The samples are targeted, simple, and you should be able to get them up and running in just a couple minutes. For more complicated samples and scenarios, see the [How to guides](../how_to_guides) section.

🔔 If you are just starting with Azure IoT device SDK's, we recommend you start with the basic [send messages to IoT Hub](send_messages) example.

## [Connection types](connections)

These samples will show you the different connection types you can use to create a client. To keep things simple, all our samples showcase the **connection string** method. However, you can use other connection methods like Shared Access Signature (SAS), X509 Certificates, and web socket proxies. These samples will show you how to create those clients and send a single telemetry message to Azure IoT Hub. 

## [Send message](send_messages)

Send telemetry messages to IoT Hub and IoT Central.

## [Recieve message](receive_messages)

Recieve messages from cloud using Azure Portal and Azure IoT Explorer.

## [Recieve method invocation](receive_method_invocation)

Direct methods follow a request-response pattern and are meant for communications that require immediate confirmation of their result. For example, interactive control of the device, such as turning a fan on and off.

## [Device twins](device_twins)

Device twins are JSON documents that store device state information, including metadata, configurations, and conditions. IoT Hub persists a device twin for each device that connects to it. They are designed for synchronization and for querying device configurations and conditions.

## [Upload file](upload_files)

In some scenarios you can't easily map the data your devices send into the relatively small device-to-cloud messages that IoT Hub accepts. For example: Large files that contain images or videos. This sample will show you how to upload file to a linked Azure storage account.

# Next Steps

- [Send messages to IoT Hub](./send_messages)
- [How to guides](../../how_to_guides)

# Feedback

If you have any feedback or questions about our device samples, please [post it here](https://github.com/Azure/azure-iot-sdk-node/discussions/1042).