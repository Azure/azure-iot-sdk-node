// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

/**
 * The `azure-iot-http-base` module contains HTTP support code common to the Azure IoT Hub Device and Service SDKs.
 *
 * @private
 * @module azure-iot-http-base
 */

module.exports = {
  Http: require('./dist/http.js').Http,
  HttpTransportError: require('./dist/rest_api_client.js').HttpTransportError,
  RestApiClient: require('./dist/rest_api_client.js').RestApiClient
};
