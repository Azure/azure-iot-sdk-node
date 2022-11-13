// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

import * as os from 'os';
import * as getos from 'getos';

/**
 * @private
 */
export function getAgentPlatformString(callback: (platformString?: string) => void): void {
  const ver = [];

  /*Codes_SRS_NODE_COMMON_UTILS_18_001: [`getAgentPlatformString` shall use `process.version` to get the node.js version.]*/
  ver.push('node ' + process.version);

  /*Codes_SRS_NODE_COMMON_UTILS_18_002: [`getAgentPlatformString` shall use `os.platform` to distinguish between linux and non-linux operating systems.]*/
  if (os.platform() === 'linux') {
    /*Codes_SRS_NODE_COMMON_UTILS_18_003: [if `os.platform` returns "linux", `getAgentPlatformString` shall call `getOs` to the OS version.]*/
    getos((err, osVer) => {
      if (err) {
        /*Codes_SRS_NODE_COMMON_UTILS_18_004: [if the `getOs` call fails, the os version shall be 'unknown'.]*/
        ver.push('unknown');
      } else {
        const linuxOsVer = osVer as getos.LinuxOs;
        /*Codes_SRS_NODE_COMMON_UTILS_18_005: [if the `getOs` call succeeds, the os version shall be built by concatenating the `dist` and `release` members of the returned object with a space in between.]*/
        ver.push(linuxOsVer.dist + ' ' +  linuxOsVer.release);
      }
      /*Codes_SRS_NODE_COMMON_UTILS_18_007: [`getAgentPlatformString` shall call `os.arch` to get the CPU architecture.]*/
      ver.push(os.arch());
      // getAgentPlatformString shall call it's callback with the string '<nodejs version>;<os version>;<CPU architecture>'
      callback(ver.join('; '));
    });
  } else {
    /*Codes_SRS_NODE_COMMON_UTILS_18_006: [if `os.platform` returns anything except 'linux', the os version shall be built by concatenating `os.type` and os.release`` with a space in between.]*/
    ver.push(os.type() + ' ' + os.release());
    /*Codes_SRS_NODE_COMMON_UTILS_18_007: [`getAgentPlatformString` shall call `os.arch` to get the CPU architecture.]*/
    ver.push(os.arch());
    /*Codes_SRS_NODE_COMMON_UTILS_18_008: [`getAgentPlatformString` shall call its `callback` with the string '<nodejs version>;<os version>;<CPU architecture>'.]*/
    callback(ver.join('; '));
  }
}
