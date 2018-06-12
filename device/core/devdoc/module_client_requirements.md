# azure-iot-device.InternalClient Requirements

## Overview
azure-iot-device.ModuleClient is a type that captures the functionality needed to connect and communicate with an IoT Hub or an IoT Edge Hub service instance using a module identity.

## Public Interface

#### fromEnvironment

**SRS_NODE_MODULE_CLIENT_13_026: [** The `fromEnvironment` method shall throw a `ReferenceError` if the `transportCtor` argument is falsy. **]**

**SRS_NODE_MODULE_CLIENT_13_028: [** The `fromEnvironment` method shall delegate to `ModuleClient.fromConnectionString` if an environment variable called `EdgeHubConnectionString` or `IotHubConnectionString` exists. **]**

**SRS_NODE_MODULE_CLIENT_13_029: [** If environment variables `EdgeHubConnectionString` and `IotHubConnectionString` do not exist then the following environment variables must be defined: `IOTEDGE_WORKLOADURI`, `IOTEDGE_DEVICEID`, `IOTEDGE_MODULEID`, `IOTEDGE_IOTHUBHOSTNAME`, `IOTEDGE_AUTHSCHEME` and `IOTEDGE_MODULEGENERATIONID`. **]**

**SRS_NODE_MODULE_CLIENT_13_030: [** The value for the environment variable `IOTEDGE_AUTHSCHEME` must be `SasToken`. **]**

**SRS_NODE_MODULE_CLIENT_13_031: [** The `fromEnvironment` method shall return a new instance of the `ModuleClient` object. **]**

**SRS_NODE_MODULE_CLIENT_13_032: [** The `fromEnvironment` method shall create a new `IotEdgeAuthenticationProvider` object and pass this to the transport constructor. **]**
