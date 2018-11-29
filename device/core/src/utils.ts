// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { getAgentPlatformString } from 'azure-iot-common';
import { NoErrorCallback, noErrorCallbackToPromise } from 'azure-iot-common';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

export function getUserAgentString(done: NoErrorCallback<string>): void;
export function getUserAgentString(): Promise<string>;
export function getUserAgentString(done?: NoErrorCallback<string>): Promise<string> | void {
  return noErrorCallbackToPromise((_callback) => {
    /*Codes_SRS_NODE_DEVICE_UTILS_18_001: [`getUserAgentString` shall call `getAgentPlatformString` to get the platform string.]*/
    getAgentPlatformString((platformString) => {
      /*Codes_SRS_NODE_DEVICE_UTILS_18_002: [`getUserAgentString` shall call its `callback` with a string in the form 'azure-iot-device/<packageJson.version>(<platformString>)'.]*/
      _callback(packageJson.name + '/' + packageJson.version + ' (' + platformString + ')');
    });
  }, done);
}
