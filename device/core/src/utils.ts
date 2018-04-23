// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { getAgentPlatformString } from 'azure-iot-common';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

export function getUserAgentString(done: (agent: string) => void): void {
  getAgentPlatformString((platformString) => {
    done('azure-iot-device/' + packageJson.version + '(' + platformString + ')');
  });
}
