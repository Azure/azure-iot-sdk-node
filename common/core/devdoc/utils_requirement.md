# azure-iot-common.utils Requirements

## Overview
the `utils` module contain various and sundry utilities

## Available functions
```
export function getAgentPlatformString(callback: (platformString?: string) => void): void;
```

## getAgentPlatformString

**SRS_NODE_COMMON_UTILS_18_001: [** `getAgentPlatformString` shall use `process.version` to get the node.js version. **]**

**SRS_NODE_COMMON_UTILS_18_002: [** `getAgentPlatformString` shall use `os.platform` to distinguish between linux and non-linux operating systems. **]**

**SRS_NODE_COMMON_UTILS_18_003: [** if `os.platform` returns "linux", `getAgentPlatformString` shall call `getOs` to the OS version. **]**

**SRS_NODE_COMMON_UTILS_18_004: [** if the `getOs` call fails, the os version shall be 'unknown'. **]**

**SRS_NODE_COMMON_UTILS_18_005: [** if the `getOs` call succeeds, the os version shall be built by concatenating the `dist` and `release` members of the returned object with a space in between. **]**

**SRS_NODE_COMMON_UTILS_18_006: [** if `os.platform` returns anything except 'linux', the os version shall be built by concatenating `os.type` and os.release`` with a space in between. **]**

**SRS_NODE_COMMON_UTILS_18_007: [** `getAgentPlatformString` shall call `os.arch` to get the CPU architecture. **]**

**SRS_NODE_COMMON_UTILS_18_008: [** `getAgentPlatformString` shall call its `callback` with the string '<nodejs version>;<os version>;<CPU architecture>'. **]**


