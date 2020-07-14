# Azure IoT Digital Twins Samples

This folder contains all the samples for the Azure Digital Twins Public Preview:

**service** contains all the samples for the `azure-iot-digitaltwins-service` package that show how to:

- Get the digital twin for a device from an Azure IoT hub
- Update this digital twin writable properties
- Invoke commands on a device that supports Azure IoT Plug-and-Play

Please note that the digital twins service client library does not duplicate features of the existing Azure IoT Hub client library. The samples in this folder will also show how to use the `azure-iothub` package to:

- create or delete device identities
- run queries to find digital twins matching specific criteria (device implementing properties, etc)
