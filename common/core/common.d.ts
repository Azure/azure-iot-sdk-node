// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { EventEmitter } from 'events';
import { Message } from './lib/message';

export import endpoint = require('./lib/endpoint');
export import errors = require('./lib/errors');
export import results = require('./lib/results');
export { ResultWithHttpResponse } from './lib/results';
export { anHourFromNow, encodeUriComponentStrict } from './lib/authorization';
export { ConnectionString } from './lib/connection_string';
export { Message }
export { SharedAccessSignature } from './lib/shared_access_signature';
export { RetryOperation } from './lib/retry_operation';
export { RetryPolicy, NoRetry, ExponentialBackOffWithJitter } from './lib/retry_policy';
export { AuthenticationProvider, AuthenticationType } from './lib/authentication_provider';
export { getAgentPlatformString } from './lib/utils';
export { Callback, ErrorCallback, NoErrorCallback, DoubleValueCallback, TripleValueCallback, HttpResponseCallback, callbackToPromise, doubleValueCallbackToPromise, errorCallbackToPromise, noErrorCallbackToPromise, tripleValueCallbackToPromise, httpCallbackToPromise } from './lib/promise_utils'

export interface Receiver extends EventEmitter {
    on(type: 'message', func: (msg: Message) => void): this;
    on(type: 'errorReceived', func: (err: Error) => void): this;

    on(type: string, func: Function): this;
}

export { TransportConfig, X509 } from './lib/authorization';
