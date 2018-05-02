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

**SRS_NODE_DEVICE_UTILS_18_002: [** `getUserAgentString` shall call its `callback` with a string in the form 'azure-iot-device/<packageJson.version>(<platformString>)'. **]**
