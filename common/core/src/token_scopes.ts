// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

export enum IoTHubTokenScopes {
    /**
     * Token scope used for any cloud other than Azure US Government cloud. Used by default.
     */
    IOT_HUB_PUBLIC_SCOPE = 'https://iothubs.azure.net/.default',

    /**
     * Token scope for Azure US Government cloud.
     */
    IOT_HUB_US_GOVERNMENT_SCOPE = 'https://iothubs.azure.us/.default'
}
