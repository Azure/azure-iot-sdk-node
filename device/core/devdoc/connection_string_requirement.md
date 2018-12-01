#azure-iot-device.ConnectionString Requirements

##Overview
`ConnectionString` is a type representing an IoT Hub device connection string.  It exposes a static factory method for creating a connection string object from a string, and exposes properties for each of the parsed fields in the string.  It also validates the required properties of the connection string.

## Example usage
```js
'use strict';

/*  "HostName=<host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"                */
/*  "HostName=<host_name>;DeviceId=<device_id>;SharedAccessSignature=<device_sas_token>"    */

var ConnectionString = require('azure-iot-device').ConnectionString;

var cn = ConnectionString.parse('[Connection string]');
console.log('HostName=' + cn.HostName);
console.log('DeviceId=' + cn.DeviceId);
console.log('SharedAccessKey=' + cn.SharedAccessKey);
```

## Public Interface
### ConnectionString constructor
Creates a new instance of the object.

### parse(source) [static]
The `parse` static method returns a new instance of the `ConnectionString` object with properties corresponding to each 'name=value' field found in source.

**SRS_NODE_DEVICE_CONNSTR_05_001: [** The `parse` method shall return the result of calling `azure-iot-common.ConnectionString.parse`.**]**

**SRS_NODE_DEVICE_CONNSTR_05_002: [** It shall throw `ArgumentError` if any of `HostName` or `DeviceId` fields are not found in the source argument.**]**

**SRS_NODE_DEVICE_CONNSTR_16_001: [** It shall throw `ArgumentError` if `SharedAccessKey` and `x509` are present at the same time. **]**

**SRS_NODE_DEVICE_CONNSTR_16_006: [** It shall throw `ArgumentError` if `SharedAccessSignature` and `x509` are present at the same time. **]**

**SRS_NODE_DEVICE_CONNSTR_16_007: [** It shall throw `ArgumentError` if `SharedAccessKey` and `SharedAccessSignature` are present at the same time. **]**

**SRS_NODE_DEVICE_CONNSTR_16_008: [** It shall throw `ArgumentError` if none of `SharedAccessKey`, `SharedAccessSignature` and `x509` are present. **]**

### createWithSharedAccessKey(hostName, deviceId, sharedAccessKey) [static]

**SRS_NODE_DEVICE_CONNSTR_16_002: [** The `createWithSharedAccessKey` static method shall returns a valid connection string with the values passed as arguments. **]**

**SRS_NODE_DEVICE_CONNSTR_16_003: [** The `createWithSharedAccessKey` static method shall throw a `ReferenceError` if one or more of the `hostName`, `deviceId` or `sharedAccessKey` are falsy. **]**

### createWithX509Certificate(hostName, deviceId) [static]

**SRS_NODE_DEVICE_CONNSTR_16_004: [** The `createWithX509Certificate` static method shall returns a valid x509 connection string with the values passed as arguments. **]**

**SRS_NODE_DEVICE_CONNSTR_16_005: [** The `createWithX509Certificate` static method shall throw a `ReferenceError` if one or more of the `hostName` or `deviceId` are falsy. **]**
