// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { IncomingMessage } from 'http';

export type Callback<T> = (err?: Error, result?: T, response?: IncomingMessage) => void;

export interface DeviceMethodParams {
    methodName: string;
    payload?: any;
    responseTimeoutInSeconds?: number;
    connectTimeoutInSeconds?: number; // default is 0
}
