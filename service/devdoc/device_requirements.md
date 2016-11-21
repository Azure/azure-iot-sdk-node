#azure-iothub.Device Requirements

## Overview
`Device` is a deprecated class that is present only for backward compatibility purposes and shall be deprecated with the next major version of the SDK.

##Example usage
```js
'use strict';

var Device = require('azure-iothub').Device;

var device1 = new Device(null);
device.deviceId = 'foo';

var device2 = new Device({ deviceId: 'foo' });
var device3 = new Device("{ \"deviceId\": \"foo\" }");
```

##Public Interface

### Device(deviceDescription) [constructor]

**SRS_NODE_SERVICE_DEVICE_16_001: [** The constructor shall accept a `null` or `undefined` value as argument and create an empty `Device` object. **]**

**SRS_NODE_SERVICE_DEVICE_16_002: [** If the `deviceDescription` argument is provided as a string, it shall be parsed as JSON and the properties of the new `Device` object shall be populated with the values provided in the `deviceDescription` JSON string. **]**

**SRS_NODE_SERVICE_DEVICE_16_003: [** If the `deviceDescription` argument if provided as an object, the properties of the new `Device` object shall be populated with the values provided in the `deviceDescription` JSON string. **]**

**SRS_NODE_SERVICE_DEVICE_16_004: [** The constructor shall throw a `ReferenceError` if the `deviceDescription` argument doesn't contain a `deviceId` property. **]**

### authentication.SymmetricKey
The `authentication.SymmetricKey` property is here only for backward compatibility purposes and its usage is deprecated.

**SRS_NODE_SERVICE_DEVICE_16_005: [** The `authentication.SymmetricKey` property shall return the content of the `authentication.symmetricKey` property (the latter being the valid property returned by the IoT hub in the device description). **]** 