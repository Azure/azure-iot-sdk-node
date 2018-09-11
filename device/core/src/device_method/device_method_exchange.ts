// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { DeviceMethodRequest, DeviceMethodResponse } from '.';

export interface DeviceMethodExchange {
    request: DeviceMethodRequest;
    response: DeviceMethodResponse;
}

export function createDeviceMethodExchange(request: DeviceMethodRequest, response: DeviceMethodResponse): DeviceMethodExchange {
    return {
        request: request,
        response: response
    };
}
