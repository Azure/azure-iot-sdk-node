#azure-iot-device.utils Requirements

## Overview
the `utils` module contain various and sundry utilities

## Available functions
```
export function getUserAgentString(done: (agent: string) => void): void;
```

## getsUerAgentString
getUserAgentString returns a user agent string that can be sent to the service.

**SRS_NODE_DEVICE_UTILS_18_001: [** `getUserAgentString` shall call `getAgentPlatformString` to get the platform string. **]**

**SRS_NODE_DEVICE_UTILS_18_002: [** `getUserAgentString` shall call its `callback` with a string in the form 'azure-iot-device/<packageJson.version>(<platformString>)<productInfo>'. **]**

**SRS_NODE_DEVICE_UTILS_41_001: [** `getUserAgentString` shall not add any custom product Info if a `falsy` value is passed in as the first arg. **]**

**SRS_NODE_DEVICE_UTILS_41_002: [** `getUserAgentString` shall accept productInfo as a `string` so that the callback is called with a string in the form 'azure-iot-device/<packageJson.version>(<platformString>)<productInfo>'. **]**

**SRS_NODE_DEVICE_UTILS_41_003: [** `getUserAgentString` shall throw if the first arg is not `falsy`, or of type `string` or `function`. **]**
