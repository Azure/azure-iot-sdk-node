# Azure IoT Digital Twins Samples

This folder contains all the samples for the Azure Digital Twins Public Preview. They are organized in 3 subfolders:

**device** contains all the samples for the `azure-iot-digitaltwins-device` package to create an Azure IoT Plug-and-Play device client:

- Implement interfaces and instantiate them as instances for this device
- register this device, with its capability model and instances using the `DigitalTwinClient` class.
- send telemetry, act on commands, receive writable property updates and report property changes.

Please refer to the [device samples readme](./device/readme.md) for more details.

**service** contains all the samples for the `azure-iot-digitaltwins-service` package that show how to:

- Get the digital twin for a device from an Azure IoT hub
- Update this digital twin writable properties
- Invoke commands on a device that supports Azure IoT Plug-and-Play

Please note that the digital twins service client library does not duplicate features of the existing Azure IoT Hub client library. The samples in this folder will also show how to use the `azure-iothub` package to:
- create or delete device identities
- run queries to find digital twins matching specific criteria (device implementing properties, etc)

**model_repository** contains all the samples for the digital twins model repository client that show how to:

- get, create, update and delete models in a private model repository.
- publish models to the global repository *(please note that once published to the global repository, a model cannot be deleted!)*
