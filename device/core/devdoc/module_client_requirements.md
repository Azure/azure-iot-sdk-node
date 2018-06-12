# azure-iot-device.InternalClient Requirements

## Overview
azure-iot-device.ModuleClient is a type that captures the functionality needed to connect and communicate with an IoT Hub or an IoT Edge Hub service instance using a module identity.

## Public Interface

#### fromEnvironment

**SRS_NODE_MODULE_CLIENT_13_033: [** The `fromEnvironment` method shall throw a `ReferenceError` if the `callback` argument is falsy or is not a function. **]**

**SRS_NODE_MODULE_CLIENT_13_026: [** The `fromEnvironment` method shall invoke callback with a `ReferenceError` if the `transportCtor` argument is falsy. **]**

**SRS_NODE_MODULE_CLIENT_13_028: [** The `fromEnvironment` method shall delegate to `ModuleClient.fromConnectionString` if an environment variable called `EdgeHubConnectionString` or `IotHubConnectionString` exists. **]**

**SRS_NODE_MODULE_CLIENT_13_034: [** If the client is running in a non-edge mode and an environment variable named `EdgeModuleCACertificateFile` exists then its value shall be set as the CA cert for the transport via the transport's `setOptions` method passing in the CA as the value for the `ca` property in the options object. **]**

**SRS_NODE_MODULE_CLIENT_13_035: [** If the client is running in edge mode then the `IotEdgeAuthenticationProvider.getTrustBundle` method shall be invoked to retrieve the CA cert and the returned value shall be set as the CA cert for the transport via the transport's `setOptions` method passing in the CA value for the `ca` property in the options object. **]**

**SRS_NODE_MODULE_CLIENT_13_029: [** If environment variables `EdgeHubConnectionString` and `IotHubConnectionString` do not exist then the following environment variables must be defined: `IOTEDGE_WORKLOADURI`, `IOTEDGE_DEVICEID`, `IOTEDGE_MODULEID`, `IOTEDGE_IOTHUBHOSTNAME`, `IOTEDGE_AUTHSCHEME` and `IOTEDGE_MODULEGENERATIONID`. **]**

**SRS_NODE_MODULE_CLIENT_13_030: [** The value for the environment variable `IOTEDGE_AUTHSCHEME` must be `SasToken`. **]**

**SRS_NODE_MODULE_CLIENT_13_031: [** The `fromEnvironment` method shall invoke the callback with a new instance of the `ModuleClient` object. **]**

**SRS_NODE_MODULE_CLIENT_13_032: [** The `fromEnvironment` method shall create a new `IotEdgeAuthenticationProvider` object and pass this to the transport constructor. **]**
