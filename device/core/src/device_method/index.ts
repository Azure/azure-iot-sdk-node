// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

export { DeviceMethodRequest } from './device_method_request';
export { DeviceMethodResponse } from './device_method_response';
export { DeviceMethodExchange } from './device_method_exchange';
export { MethodClient } from './method_client';

export interface MethodParams {
  methodName: string;
  payload: any;
  connectTimeoutInSeconds: number;
  responseTimeoutInSeconds: number;
}

export interface MethodResult {
  status: number;
  payload: any;
}

export type MethodCallback = (err?: Error, result?: MethodResult) => void;
