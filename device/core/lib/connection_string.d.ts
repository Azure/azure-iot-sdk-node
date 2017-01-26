// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { ConnectionString } from 'azure-iot-common';

export declare function parse(source: string): ConnectionString;
export declare function createWithSharedAccessKey(hostName: string, deviceId: string, sharedAccessKey: string): string;
export declare function createWithX509Certificate(hostName: string, deviceId: string): string;
