// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

import * as os from 'os';
// tslint:disable-next-line:no-var-requires
const getos = require('getos');

export function getAgentPlatformString(callback: (platformString?: string) => void): void {
  let ver = [];

  ver.push('node ' + process.version);

  if (os.platform() === 'linux') {
    getos((err, osVer) => {
      if (err) {
        ver.push('unknown');
      } else {
        // docker: { os: 'linux', dist: 'Debian', release: '8.10' }
        // ubuntu: > { os: 'linux', dist: 'Ubuntu Linux', codename: 'xenial',  release: '16.04' }
        ver.push(osVer.dist + ' ' +  osVer.release);
      }
      ver.push(os.arch());
      callback(ver.join('; '));
    });
  } else {
    ver.push(os.type() + ' ' + os.release());
    ver.push(os.arch());
    callback(ver.join('; '));
  }
};

