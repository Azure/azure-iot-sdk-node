This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

# Microsoft Azure IoT SDK for Node

This repository contains the Device SDK, Service SDK, and code common to both of them. The Device SDK enables you to connect client devices to Azure IoT Hub. The Service SDK enables you to manage your IoT Hub service instance.

Visit http://azure.com/iotdev to learn more about developing applications for Azure IoT.

Devices and data sources in an IoT solution can range from a simple network-connected sensor to a powerful, standalone computing device. Devices may have limited processing capability, memory, communication bandwidth, and communication protocol support. The IoT device SDKs enable you to implement client applications for a wide variety of devices.

To find SDKs in other languages for Azure IoT, please refer to the following repository:

- [Azure IoT device SDKs](http://github.com/azure/azure-iot-sdks)

The API reference documentation is [here](http://azure.github.io/azure-iot-sdks).

## Samples

Whithin the repository, you can find various types of simple samples that can help you get started.
- Device SDK:
   - [Simple device sample](device/samples/simple_sample_device.js): Shows how to connect to IoT Hub and send and receive messages using Node.js on a device.
   - [Send batch](device/samples/send_batch_http.js): Shows how to connect to IoT Hub and send a batch of messages using Node.js on a device.
   - [Azure IoT Suite Remote Monitoring device sample](device/samples/remote_monitoring.js): Shows how to connect a device runnig Node.js to an Azure IoT Suite remote Monitoring preconfigured solution.
   - [Device management patterns: Reboot (Device Side)](device/samples/dmpatterns_reboot_device.js): Shows how a device handles a C2D method to reboot and provides progress updates through twin reported properties. See [device management patterns](dmpatterns.md) for instructions on running the device management patterns samples.
   - [Device management patterns: Firmware Update (Device Side)](device/samples/dmpatterns_reboot_device.js): Shows how a device handles a C2D method to initiate a firmware update and provides progress updates through twin reported properties. See [device management patterns](dmpatterns.md) for instructions on running the device management patterns samples.
- Service SDK:
   - [Registry manager simple sample](service/samples/registry_sample.js): Shows how to manage the device ID registry of IoT Hub from a Node.js application.
   - [Bulk Registry sample](service/samples/registry_sample.js): Shows how to create a set of device IDs in the device ID registry of IoT Hub in bulk from a Node.js application.
   - [Simple Cloud to Device messaging sample](service/samples/send_c2d_message.js) : Shows how to send messages to a device from a Node.js application through IoT Hub.
   - [Device management patterns: Reboot (Service Side)](device/samples/dmpatterns_reboot_service.js): Shows how to initiate a C2D method to reboot a device and view progress through the twin reported properties. See [device management patterns](dmpatterns.md) for instructions on running the device management patterns samples.
   - [Device management patterns: Firmware Update (Service Side)](device/samples/dmpatterns_reboot_service.js): Shows how to initiate a C2D method to reboot a device and view progress through the twin reported properties. See [device management patterns](dmpatterns.md) for instructions on running the device management patterns samples.

## Contribution, feedback and issues

If you encounter any bugs, have suggestions for new features or if you would like to become an active contributor to this project please follow the instructions provided in the [contribution guidelines](CONTRIBUTING.md).

## Support

If you are having issues using one of the packages or using the Azure IoT Hub service that go beyond simple bug fixes or help requests that would be dealt within the [issues section](https://github.com/Azure/azure-iot-sdks/issues) of this project, the Microsoft Customer Support team will try and help out on a best effort basis.
To engage Microsoft support, you can create a support ticket directly from the [Azure portal](https://ms.portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade).
Escalated support requests for Azure IoT Hub SDKs development questions will only be available Monday thru Friday during normal coverage hours of 6 a.m. to 6 p.m. PST.
Here is what you can expect Microsoft Support to be able to help with:
* **Client SDKs issues**: If you are trying to compile and run the libraries on a supported platform, the Support team will be able to assist with troubleshooting or questions related to compiler issues and communications to and from the IoT Hub.  They will also try to assist with questions related to porting to an unsupported platform, but will be limited in how much assistance can be provided.  The team will be limited with trouble-shooting the hardware device itself or drivers and or specific properties on that device. 
* **IoT Hub / Connectivity Issues**: Communication from the device client to the Azure IoT Hub service and communication from the Azure IoT Hub service to the client.  Or any other issues specifically related to the Azure IoT Hub.
* **Portal Issues**: Issues related to the portal, that includes access, security, dashboard, devices, Alarms, Usage, Settings and Actions.
* **REST/API Issues**: Using the IoT Hub REST/APIs that are documented in the [documentation]( https://msdn.microsoft.com/library/mt548492.aspx).
