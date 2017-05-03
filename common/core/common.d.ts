// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { EventEmitter } from 'events';
import { Message } from './lib/message';

export import endpoint = require('./lib/endpoint');
export import errors = require('./lib/errors');
export import results = require('./lib/results');
export { anHourFromNow, encodeUriComponentStrict } from './lib/authorization';
export { ConnectionString } from './lib/connection_string';
export { Message }
export { SharedAccessSignature } from './lib/shared_access_signature';

// Typescript only, used by other modules in azure-iot-sdk
export interface X509 {
    // https://nodejs.org/api/tls.html#tls_tls_connect_options_callback
    cert?: string | string[] | Buffer | Buffer[];
    key?: string | Buffer;
    passphrase?: string;
    certFile?: string;
    keyFile?: string;
}

export interface Receiver extends EventEmitter {
    on(type: 'message', func: (msg: Message) => void): this;
    on(type: 'errorReceived', func: (err: Error) => void): this;

    on(type: string, func: Function): this;
}

export interface TransportConfig {
    host: string;
    deviceId: string;
    sharedAccessSignature?: string;
    x509?: X509;
}
